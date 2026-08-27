/**
 * The three screen-local hooks every wave-2 queue needs.
 *
 * **All three are screen-local on purpose.** `src/hooks/` has a single owner
 * (`PHASE-PLAN.md`) and none of these is shared logic yet in the sense that
 * matters — `useNowIso` and `useRowOverrides` are wave-1 patterns copied
 * forward, and `useRowActions` is the §4 disposition runner, which is
 * work-queue vocabulary rather than app vocabulary. If a sixth queue or a
 * non-queue screen needs one, it moves to `src/hooks/` **with**
 * utilities-engineer, not around them.
 */

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { DATA_SOURCE, EYVAR_NOW } from '@/data/clients'
import type { IsoDateTime } from '@/data/types'
import { useNow } from '@/hooks'
import type { Translate } from '@/lib'

/* ─────────────────────────────── the clock ─────────────────────────────── */

/**
 * The instant every queue measures `45s left` and `overdue 4d` against.
 *
 * **The fixed clock is not a test detail — it is what the mock IS.** Every
 * wave-2 fixture is written against `EYVAR_NOW` (`2026-06-25T09:14:00+03:00`),
 * the legacy app's own `REQ_NOW_REF` (`:9555`). Reading the host clock in mock
 * mode would render every SLA decades overdue, every incident breached and
 * every countdown meaningless, and a visual capture taken at 23:59 would
 * disagree with one taken at 00:01.
 *
 * In `http` mode the host clock is the right answer, so this returns the live
 * one — through `useTick`'s **single** shared interval ("one clock"), never a
 * per-screen `setInterval`. In mock mode the subscription is not even opened.
 */
export function useNowIso(): IsoDateTime {
  const live = useNow(60, DATA_SOURCE !== 'mock')
  return DATA_SOURCE === 'mock' ? EYVAR_NOW : live
}

/* ────────────────────────── the mutated-row overlay ────────────────────── */

export interface RowOverrides<T> {
  /** Overlay every held record on a freshly fetched page, in place. */
  apply: (rows: readonly T[]) => readonly T[]
  /** Hold the record the client just returned. */
  record: (row: T) => void
  clear: () => void
}

/**
 * A mutated row, held over the list until a real read agrees with it.
 *
 * **This is what makes §4.5's "the decided row converts in place" true against
 * a pure mock.** The clients deliberately do not write back to their fixture
 * arrays — `decideFairnessCase` returns `{ ...row, status: 'upheld' }` and the
 * next `listFairnessCases` returns the original — so without this overlay an
 * operator upholds a case, sees a toast, and watches the row still say `Open`.
 *
 * It is an ordinary optimistic-update overlay and **not** a second source of
 * truth: the value held is the response body, never something recomputed here.
 * **Q-29** rides on it directly — *"a background refresh must not remove a
 * decided row"* — and so does **AC-230**, because `apply` runs on every page
 * the client returns, not once.
 */
export function useRowOverrides<T extends { id: string }>(): RowOverrides<T> {
  const [held, setHeld] = useState<ReadonlyMap<string, T>>(() => new Map())

  const apply = useCallback(
    (rows: readonly T[]) => (held.size === 0 ? rows : rows.map((row) => held.get(row.id) ?? row)),
    [held],
  )

  const record = useCallback((row: T) => {
    setHeld((current) => new Map(current).set(row.id, row))
  }, [])

  const clear = useCallback(() => {
    setHeld((current) => (current.size === 0 ? current : new Map()))
  }, [])

  return { apply, record, clear }
}

/* ───────────────────────── the disposition runner ──────────────────────── */

export interface RowFailure {
  message: string
  retry: () => void
}

export interface RowActions<T extends { id: string }> {
  /** The rows as the operator should see them: fetched, with mutations overlaid. */
  rows: (fetched: readonly T[]) => readonly T[]
  /** **AC-41** — this row's failure, or `undefined`. Scoped to the row, never a banner. */
  failure: (id: string) => RowFailure | undefined
  /**
   * Every mutation goes through here, so **AC-41** cannot be forgotten once and
   * **`deciding`** (§4.11) cannot be re-triggered.
   */
  run: (options: {
    id: string
    errorKey: string
    toastKey?: string
    action: () => Promise<T>
  }) => Promise<boolean>
  /** True while any mutation is in flight — the confirmation's own disabled state. */
  busy: boolean
}

/**
 * The one path every claim, release, take-over and disposition takes.
 *
 * Three §4 rules are enforced here rather than in each of the five screens:
 *
 * **AC-41 / §4.11 `row-action-failed`** — a failed mutation renders an error
 * scoped to **that row's action cell**. Not a page banner, not a toast alone,
 * and every other row stays interactive. The retry is one click and re-runs the
 * identical call, so a transient 500 costs the operator nothing.
 *
 * **§4.11 `deciding`** — `busy` is true for the duration, so the confirmation's
 * primary is not re-triggerable. The row is **not** removed and does not
 * re-sort while it runs.
 *
 * **R10 / §4.5** — a completed mutation is a transient confirmation, so it gets
 * a **toast** and never a banner. A failure is a standing condition on one row,
 * so it gets the row error and never a toast. One event, one surface.
 */
export function useRowActions<T extends { id: string }>({ t }: { t: Translate }): RowActions<T> {
  const overrides = useRowOverrides<T>()
  const [busy, setBusy] = useState(false)
  const [failures, setFailures] = useState<ReadonlyMap<string, RowFailure>>(() => new Map())

  const clearFailure = useCallback((id: string) => {
    setFailures((current) => {
      if (!current.has(id)) return current
      const next = new Map(current)
      next.delete(id)
      return next
    })
  }, [])

  const run = useCallback(
    async ({
      id,
      errorKey,
      toastKey,
      action,
    }: {
      id: string
      errorKey: string
      toastKey?: string
      action: () => Promise<T>
    }): Promise<boolean> => {
      setBusy(true)
      clearFailure(id)
      try {
        overrides.record(await action())
        if (toastKey) toast(t(toastKey))
        return true
      } catch {
        setFailures((current) =>
          new Map(current).set(id, {
            message: t(errorKey),
            retry: () => void run({ id, errorKey, toastKey, action }),
          }),
        )
        return false
      } finally {
        setBusy(false)
      }
    },
    [clearFailure, overrides, t],
  )

  return {
    rows: overrides.apply,
    failure: (id) => failures.get(id),
    run,
    busy,
  }
}
