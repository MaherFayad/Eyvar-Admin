/**
 * A mutated row, held over the list until the next real read agrees with it.
 *
 * **Why this exists, and why it is not a private cache.** The mock clients are
 * deliberately pure: `suspendDriver` returns `{ ...row, status: 'suspended' }`
 * and does **not** write back to the fixture array (`clients/drivers.ts`), so
 * a refetch returns the original row. Without this, an operator suspends a
 * captain, sees a toast, and watches the table say `Active` — which is worse
 * than not offering the action.
 *
 * So the screen holds what the **server returned**, keyed by id, and overlays
 * it on the list. That is an ordinary optimistic-update overlay, not a second
 * source of truth: the value is the response body, never something recomputed
 * here, and it dies with the view. When the mock persists mutations (or a real
 * API lands), this keeps working and stops mattering.
 *
 * A screen-local hook on purpose: `src/hooks/` has a single owner and this is
 * not shared logic yet. If a second screen needs it, it moves there — with
 * utilities-engineer, not around them.
 */

import { useCallback, useState } from 'react'

export interface RowOverrides<T> {
  /** Overlay every held record on a freshly fetched page, in place. */
  apply: (rows: readonly T[]) => readonly T[]
  /** Hold the record the client just returned. */
  record: (row: T) => void
  /** Drop everything — for a deliberate reload. */
  clear: () => void
}

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
