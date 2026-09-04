/**
 * The SLA clock. Design spec 00-shell §9.3 and §18; DESIGN.md §8.4.
 *
 * Five rules live here so no work queue can express them wrongly:
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
 * 5. **The window decides the countdown's precision, not the number.** Q-13 /
 *    AC-215 (`specs/02-work-queues.md` §4.3): under a 10-minute window the pill
 *    counts in seconds — `45s left`, `overdue 20s` — because `2m left` …
 *    `1m left` … `0m left` is not a countdown a person can act on. Above it the
 *    minute tier stands: a 4-hour ticket reading `47s` in its last minute is
 *    precision nobody can use. Deciding it here rather than per screen is what
 *    stops five queues from answering it five ways.
 *
 * This module is pure. It never reads the host clock — `now` is passed in, from
 * the one clock (`@/hooks/useTick`, which reads `src/data/mock/clock.ts`).
 */

import type { IsoDateTime } from '@/data/types/common'
import { toDate } from './format/date'
import { type DurationPrecision, formatDuration } from './format/duration'
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
      /**
       * The item's own target window in milliseconds, or `null` when it is
       * genuinely unknown. Exposed because the window — not the number on the
       * clock — decides how precisely the countdown reads (rule 5).
       */
      readonly windowMs: number | null
    }
  | {
      readonly kind: 'breached'
      readonly band: 'breached'
      readonly dueAt: IsoDateTime
      readonly overdueMs: number
      readonly consumedRatio: number | null
      readonly windowMs: number | null
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
 * Q-13 / AC-215: a window **under 10 minutes** counts in seconds. The two rows
 * in the product today are the 3-minute instant request and the 5-minute
 * critical acknowledgement; D22's 45-second chat first-response target is the
 * third and the reason this shipped. An item whose window is unknown keeps the
 * minute tier — guessing precision from the remaining time is exactly the
 * `47s`-on-a-4-hour-ticket regression the tier exists to avoid.
 */
const SECONDS_TIER_WINDOW_MS = 10 * 60_000

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

  /* A non-positive window is not a window — a start at or after the deadline
     tells us nothing about half of it, and nothing about precision either. */
  const resolved = resolveWindowMs(input, dueMs)
  const windowMs = resolved !== null && resolved > 0 ? resolved : null
  const consumedRatio = windowMs === null ? null : clamp01((windowMs - remainingMs) / windowMs)

  if (remainingMs <= 0) {
    return {
      kind: 'breached',
      band: 'breached',
      dueAt: input.dueAt,
      overdueMs: -remainingMs,
      consumedRatio,
      windowMs,
    }
  }

  const band: 'neutral' | 'warning' =
    consumedRatio !== null && consumedRatio > 1 - WARNING_THRESHOLD ? 'warning' : 'neutral'

  return { kind: 'running', band, dueAt: input.dueAt, remainingMs, consumedRatio, windowMs }
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

/**
 * Rule 5, in one place: the item's own window picks the tier, and a screen
 * never passes a precision itself. `null` — an unknown window — keeps minutes.
 */
export function slaPrecision(clock: SlaClock): DurationPrecision {
  if (clock.kind === 'no-clock') return 'minute'
  if (clock.windowMs === null) return 'minute'
  return clock.windowMs < SECONDS_TIER_WINDOW_MS ? 'second' : 'minute'
}

/** The key and its parameters, for a caller that owns its own translator call. */
export function slaLabelDescriptor(clock: SlaClock): SlaLabelDescriptor {
  const precision = slaPrecision(clock)
  switch (clock.kind) {
    case 'no-clock':
      return { key: 'sla.noClock', params: {} }
    case 'running':
      return { key: 'sla.left', params: { duration: formatDuration(clock.remainingMs, { precision }) } }
    case 'breached':
      return { key: 'sla.overdue', params: { duration: formatDuration(clock.overdueMs, { precision }) } }
  }
}

/**
 * The finished pill text: `12m left` · `3h 20m left` · `2d 4h left` ·
 * `overdue 14m` · `45s left` (a window under 10 minutes) · `No clock`.
 */
export function formatSlaLabel(clock: SlaClock, t: Translate): string {
  const { key, params } = slaLabelDescriptor(clock)
  return t(key, params)
}

/* ─────── §4.4 · breached, late, and old — the one rule, for every queue ───────
   Lifted here from `screens/queues/queue.tsx`, unchanged. It is a pure function
   over `slaClock` with no React and no knowledge of a screen, and it now has
   two kinds of consumer: the five work queues, and the request sheet in
   `components/profile/request`, which may not import from a screen. The
   alternative was a second implementation of *breach is a stamp, never
   `dueAt < now`* — the one rule in this area that must have exactly one answer,
   because a queue row and the sheet it opens disagreeing about whether a
   promise was broken is worse than either being wrong alone. */

/** The three SLA fields any wave-2 row carries, in whichever pair is running. */
export interface QueueClockInput {
  startedAt: IsoDateTime | null
  dueAt: IsoDateTime | null
  targetMinutes: number | null
  /** **The stamp.** `types/workQueue.ts`: breach is a stamp, never `dueAt < now`. */
  breachedAt: IsoDateTime | null
}

export interface QueueClockResult {
  /** What the countdown pill renders. `NO_CLOCK` where nothing is running. */
  clock: SlaClock
  /** **Q-17** — R5a's three parts hang off this and nothing else. */
  breached: boolean
  /**
   * The deadline is behind us and **the promise was not broken**. See below;
   * this is why the function exists.
   */
  deadlinePassedUnbroken: boolean
}

/**
 * **§4.4, Q-17 – Q-20, resolved once for all five queues.**
 *
 * `types/workQueue.ts` is unambiguous: *"breach is a stamp, never
 * `slaDueAt < now`"*, because a naive comparison calls every closed row in the
 * archive overdue. So `breached` reads `slaBreachedAt` and adds Q-17's second
 * clause — **still awaiting a decision**. A decided row is `late-decided`
 * (Q-18), its badge says so, and it carries **no marker**: the R5a leading edge
 * is reserved for work still owed. That is wave 1's finding **G9**, answered.
 *
 * **The case this function exists for, and it is a live one.** Four Trip
 * Assurance rows — `UST-1`, `UST-2`, `UST-5`, `UST-7` — are past their
 * `slaDueAt` (21:00 the evening before) and carry `slaBreachedAt: null`. That
 * is not a fixture error: `UST-5` was auto-handed-off to its backup, so the
 * system kept the promise, and `UST-3` vs `UST-5` are documented as *"same
 * cut-off, same null acknowledgement, opposite breach states"*. Driving the
 * pill from the live clock would print `overdue 12h` on a row the data says was
 * never breached — and then either the marker contradicts the pill (R5a
 * requires all three parts together, **AC-220**) or the pill contradicts the
 * banner (**AC-219**).
 *
 * So a passed-but-unbroken deadline renders as **a date, not a countdown**:
 * `Due 24 Jun 21:00`, neutral, no track, no marker. It is one clock readout per
 * row (**AC-211**), it is true, and it agrees with everything else on screen.
 *
 * It is also exactly what the data layer asked for on this queue: `slaSource`
 * is `unset` and `slaTargetMinutes` is `null` on every `AssuranceTrip`, and
 * §6's own note says *"the screen can show 'due 21:00' and **cannot** draw a
 * progress track. Inventing a start is the `/90` bug at `:11652`."* (**Q8-b**,
 * open, product-owner.)
 */
export function queueClock(
  input: QueueClockInput,
  now: IsoDateTime,
  { terminal }: { terminal: boolean },
): QueueClockResult {
  const base = slaClock(
    { dueAt: input.dueAt, startedAt: input.startedAt, targetMinutes: input.targetMinutes },
    now,
  )

  /* Q-18 — a decided row's clock has stopped. The decision badge carries the
     record of when, and how late it was. Nothing is owed, so nothing counts. */
  if (terminal) return { clock: NO_CLOCK, breached: false, deadlinePassedUnbroken: false }

  const breached = input.breachedAt !== null
  if (base.kind === 'breached' && !breached) {
    return { clock: NO_CLOCK, breached: false, deadlinePassedUnbroken: true }
  }
  return { clock: base, breached, deadlinePassedUnbroken: false }
}
