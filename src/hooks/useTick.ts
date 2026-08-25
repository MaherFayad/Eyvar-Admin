/**
 * **One clock.** Foundation spec §4.4 / §8.1.2, design spec §18, **AC-28**.
 *
 * > the app runs exactly one `setInterval(tickEngine, 1000)` (`:11968`) and every
 * > periodic surface subscribes to a modulo bucket off it. Per-page intervals are
 * > forbidden. Renderers gate on visibility.
 *
 * Two things that are both called "the clock" and are **not** the same thing:
 *
 * | | Where | What it is |
 * |---|---|---|
 * | The **time source** | `src/data/mock/clock.ts` (`systemClock` / `fixedClock`) | what "now" *is* |
 * | The **heartbeat** | this file | *when* anything re-reads it |
 *
 * There is exactly one of each, and this module owns neither "now" nor a second
 * copy of it: it holds a `Clock` from the data layer and calls it. `Date.now()`
 * and `new Date()` do not appear here, which is what makes a test able to freeze
 * the whole app by passing `fixedClock`.
 *
 * The legacy tick engine's bucket set is ported verbatim from `:12512`-`:12611`:
 * `%5` ETA and sub-requests, `%15` SLA sweep, `%20` inbox, `%30` presence,
 * `%60` countdown decrement.
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { type Clock, systemClock } from '@/data/clients'
import type { IsoDateTime } from '@/data/types/common'

/**
 * The buckets the product actually uses. A closed union, so a screen cannot ask
 * for `everySeconds: 7` and quietly create a cadence nobody reviewed.
 * Legacy: `%5` (`:12602`), `%15` (`:12512`), `%20` (`:12513`), `%30` (`:11957`),
 * `%60` (`:12611`).
 */
export type TickBucket = 1 | 5 | 15 | 20 | 30 | 60

const TICK_INTERVAL_MS = 1_000

let intervalId: ReturnType<typeof setInterval> | null = null
let tickCount = 0
let clockSource: Clock = systemClock
const listeners = new Set<() => void>()

function tick(): void {
  tickCount += 1
  for (const listener of listeners) listener()
}

/**
 * Starts on the first subscriber and stops on the last. AC-28 counts
 * `setInterval` registrations: with no subscriber there is no interval at all,
 * and with a hundred there is still one.
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (intervalId === null) intervalId = setInterval(tick, TICK_INTERVAL_MS)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
}

const noopSubscribe = (): (() => void) => () => undefined

/**
 * The bucketed tick count: it changes once every `everySeconds` seconds and is
 * otherwise identical, so `useSyncExternalStore` bails out of the render.
 *
 * This is the "renderers gate on visibility" half of AC-28 in its cheap form —
 * a `%60` surface re-renders once a minute, not sixty times. The other half is
 * `enabled`, below.
 */
export function useTick(everySeconds: TickBucket = 1, enabled = true): number {
  const getSnapshot = useCallback(
    () => (enabled ? Math.floor(tickCount / everySeconds) : 0),
    [everySeconds, enabled],
  )
  return useSyncExternalStore(enabled ? subscribe : noopSubscribe, getSnapshot, getSnapshot)
}

/**
 * "Now", re-read on the given bucket. Pass `enabled: false` for a surface that is
 * not on the current route or is scrolled out of view — **AC-28**: *"A surface
 * that is not on the current route performs no render work when the clock ticks."*
 *
 * Every SLA countdown, every relative timestamp and every stale-feed indicator
 * reads its `now` from here and passes it to a pure helper (`slaClock`,
 * `formatDate`). That is what stops `Date.now()` reappearing in 34 screens.
 */
export function useNow(everySeconds: TickBucket = 60, enabled = true): IsoDateTime {
  const bucket = useTick(everySeconds, enabled)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `bucket` is the dependency; it is the whole point.
  return useMemo(() => clockSource(), [bucket, enabled])
}

/* ─────────────────────────── test seams ─────────────────────────── */

/** Point the heartbeat at a different time source — `fixedClock` in tests. */
export function setClockSource(clock: Clock): void {
  clockSource = clock
}

/** The number of seconds elapsed since the interval started. For assertions. */
export function getTickCount(): number {
  return tickCount
}

/** How many subscribers the one interval currently has. For AC-28's test. */
export function getClockSubscriberCount(): number {
  return listeners.size
}

/** Stop the interval, forget every subscriber, restore `systemClock`. */
export function resetClock(): void {
  if (intervalId !== null) clearInterval(intervalId)
  intervalId = null
  tickCount = 0
  listeners.clear()
  clockSource = systemClock
}
