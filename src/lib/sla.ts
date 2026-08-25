/**
 * The SLA clock. Design spec 00-shell §9.3 and §18; DESIGN.md §8.4.
 *
 * Four rules live here so no work queue can express them wrongly:
 *
 * 1. **`No clock` is a value, not a gap.** An item with no deadline renders
 *    `No clock` in a neutral tone. Never `—` (that means *absent*), never a
 *    synthetic deadline, never an empty cell.
 * 2. **`No clock` sorts last.** Legacy already did this with a `9e12` sentinel
 *    (`eyvar_ops_panel_v40_fixed.html:19229`-`:19232`) and says so in its own UI
 *    copy at `:19267` — *"work with no clock sits at the bottom"*. Ordering is
 *    breached first (most overdue first), then remaining time ascending, then
 *    `No clock`.
 * 3. **The track's denominator is the item's own SLA target.** The legacy
 *    progress bar divides by a hardcoded `90` (`:11652`), which means a 30-minute
 *    SLA and a 4-hour SLA draw the same bar. That constant must not ship. If the
 *    window is unknown, `slaTrackPercent` returns `null` and **no track renders** —
 *    §9.3: the track is "shown only when the total window is known".
 * 4. **Bands come from the item's own window too.** Half the window or more
 *    remaining is `neutral`, less than half is `warning`, past due is `breached`.
 *    With no known window there is no honest way to compute half, so the band
 *    stays `neutral` and the pill still tells the truth in words.
 *
 * This module is pure. It never reads the host clock — `now` is passed in, from
 * the one clock (`@/hooks/useTick`, which reads `src/data/mock/clock.ts`).
 */

import type { IsoDateTime } from '@/data/types/common'
import { toDate } from './format/date'
import { formatDuration } from './format/duration'
import type { Translate } from './i18n/translate'

/** §9.3's three bands. `breached` is the row-critical signal, R5a (b) and (c). */
export type SlaBand = 'neutral' | 'warning' | 'breached'

export type SlaClock =
  | {
      readonly kind: 'no-clock'
      readonly band: 'neutral'
    }
  | {
      readonly kind: 'running'
      readonly band: 'neutral' | 'warning'
      readonly dueAt: IsoDateTime
      readonly remainingMs: number
      /** 0-1 of the window consumed, or `null` when the window is unknown. */
      readonly consumedRatio: number | null
    }
  | {
      readonly kind: 'breached'
      readonly band: 'breached'
      readonly dueAt: IsoDateTime
      readonly overdueMs: number
      readonly consumedRatio: number | null
    }

export interface SlaInput {
  /** The item's own deadline. `null` means it has no clock — that is a value (rule 1). */
  dueAt: IsoDateTime | null
  /**
   * When this item's clock started — an applicant's `appliedAt`, a ticket's
   * `openedAt`. With `dueAt`, this **is** the denominator (rule 3).
   */
  startedAt?: IsoDateTime | null
  /**
   * The item's own target window in minutes, when the start instant is not
   * available. Used only if `startedAt` is absent. Never a shared constant.
   */
  targetMinutes?: number | null
}

/** The single `No clock` value. Referentially stable so a memo can compare it. */
export const NO_CLOCK: SlaClock = Object.freeze({ kind: 'no-clock', band: 'neutral' } as const)

/** §9.3: below half the window remaining, the pill turns `warning`. */
const WARNING_THRESHOLD = 0.5

/**
 * Sentinel for `No clock` in the sort key. Legacy used `9e12` (`:19230`); this is
 * larger than any real remaining-time in milliseconds by many orders of
 * magnitude, and unlike `Infinity` it subtracts cleanly in a comparator.
 */
const NO_CLOCK_SORT_KEY = Number.MAX_SAFE_INTEGER

export function slaClock(input: SlaInput, now: IsoDateTime): SlaClock {
  if (input.dueAt === null || input.dueAt === undefined) return NO_CLOCK

  const dueMs = toDate(input.dueAt).getTime()
  const nowMs = toDate(now).getTime()
  const remainingMs = dueMs - nowMs

  const windowMs = resolveWindowMs(input, dueMs)
  const consumedRatio =
    windowMs === null || windowMs <= 0 ? null : clamp01((windowMs - remainingMs) / windowMs)

  if (remainingMs <= 0) {
    return {
      kind: 'breached',
      band: 'breached',
      dueAt: input.dueAt,
      overdueMs: -remainingMs,
      consumedRatio,
    }
  }

  const band: 'neutral' | 'warning' =
    consumedRatio !== null && consumedRatio > 1 - WARNING_THRESHOLD ? 'warning' : 'neutral'

  return { kind: 'running', band, dueAt: input.dueAt, remainingMs, consumedRatio }
}

/** The item's own window, in milliseconds, or `null` when it is genuinely unknown. */
function resolveWindowMs(input: SlaInput, dueMs: number): number | null {
  if (input.startedAt) return dueMs - toDate(input.startedAt).getTime()
  if (typeof input.targetMinutes === 'number' && input.targetMinutes > 0) {
    return input.targetMinutes * 60_000
  }
  return null
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function slaBand(clock: SlaClock): SlaBand {
  return clock.band
}

/**
 * The 3px track's fill percentage, 0-100, or `null` when **no track may render**.
 * `null` is not zero: a zero-width track and an absent track look different and
 * mean different things.
 */
export function slaTrackPercent(clock: SlaClock): number | null {
  if (clock.kind === 'no-clock') return null
  if (clock.consumedRatio === null) return null
  return Math.round(clock.consumedRatio * 100)
}

/**
 * §9.3's order: breached first (most overdue first), then remaining time
 * ascending, then `No clock` last.
 */
export function slaSortKey(clock: SlaClock): number {
  switch (clock.kind) {
    case 'breached':
      return -clock.overdueMs - 1
    case 'running':
      return clock.remainingMs
    case 'no-clock':
      return NO_CLOCK_SORT_KEY
  }
}

/** Comparator for `Array.prototype.sort`. Equal keys keep the caller's array order. */
export function compareBySla(a: SlaClock, b: SlaClock): number {
  const left = slaSortKey(a)
  const right = slaSortKey(b)
  return left < right ? -1 : left > right ? 1 : 0
}

/* ───────────────────────────── copy ───────────────────────────── */

/**
 * The three SLA keys and their **English** templates, exactly as design spec
 * §9.3 words them. Merge into the English dictionary; the Arabic dictionary
 * overrides them. They live here so the format string and the code that fills it
 * cannot drift apart, and because AC-75 requires interpolation to be a named
 * placeholder **inside a single key** — never `t('sla.left') + duration`.
 */
export const SLA_MESSAGES_EN = Object.freeze({
  'sla.left': '{duration} left',
  'sla.overdue': 'overdue {duration}',
  'sla.noClock': 'No clock',
})

export type SlaMessageKey = keyof typeof SLA_MESSAGES_EN

export interface SlaLabelDescriptor {
  key: SlaMessageKey
  params: Readonly<Record<string, string>>
}

/** The key and its parameters, for a caller that owns its own translator call. */
export function slaLabelDescriptor(clock: SlaClock): SlaLabelDescriptor {
  switch (clock.kind) {
    case 'no-clock':
      return { key: 'sla.noClock', params: {} }
    case 'running':
      return { key: 'sla.left', params: { duration: formatDuration(clock.remainingMs) } }
    case 'breached':
      return { key: 'sla.overdue', params: { duration: formatDuration(clock.overdueMs) } }
  }
}

/** The finished pill text: `12m left` · `3h 20m left` · `2d 4h left` · `overdue 14m` · `No clock`. */
export function formatSlaLabel(clock: SlaClock, t: Translate): string {
  const { key, params } = slaLabelDescriptor(clock)
  return t(key, params)
}
