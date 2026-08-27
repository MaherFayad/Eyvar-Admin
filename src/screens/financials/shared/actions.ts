/**
 * The one path every money-moving mutation on Financials takes.
 *
 * Three rules are enforced here rather than in seven screens:
 *
 * **AC-431 / §11.2** — a failed row action renders on **that row**, not as a
 * page banner and not by replacing the whole card with an error state. Every
 * other row stays interactive, and the retry re-runs the identical call.
 *
 * **AC-430** — a mutation that fails leaves the record exactly as it was. That
 * is the client's guarantee (`mockMutation` throws before it assigns), and this
 * hook's half of it is that **nothing is written optimistically**: the overlay
 * only ever holds a value the client returned.
 *
 * **R10** — one event, one surface. A completed mutation is transient
 * confirmation, so it gets a **toast** and never a banner; a failure is a
 * standing condition on one row, so it gets the row error and never a toast.
 *
 * ## Why this is not `useRowActions` from `src/screens/queues`
 *
 * That hook is the §4 work-queue disposition runner and it constrains its row
 * type to `{ id: string }`. A `CaptainPayout` is keyed by `captainId` and a
 * `CaptainDebt` by `captainId` too — neither has an `id`, because neither is a
 * document. So the key is a parameter here instead of a field. The cash
 * reconciliation queue **does** use the queue hook, because it is a queue and
 * its rows are documents with ids; two vocabularies for two patterns is §5's
 * own point about that sub-tab carrying both.
 */

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import type { Translate } from '@/lib'

export interface RowFailure {
  message: string
  retry: () => void
}

export interface MoneyActions<T> {
  /** Overlay every record this session mutated onto a freshly read page, in place. */
  apply: (rows: readonly T[]) => readonly T[]
  /** **AC-431** — this row's failure, or `undefined`. */
  failure: (key: string) => RowFailure | undefined
  /** True while any mutation is in flight — the confirmation's own disabled state. */
  busy: boolean
  run: (options: {
    key: string
    errorMessage: string
    toastMessage?: string
    action: () => Promise<T>
  }) => Promise<boolean>
}

/**
 * @param keyOf the row's identity — `captainId`, `id`, `riderId`
 *
 * The overlay exists because the clients deliberately do not write back into
 * their fixture arrays for every resource: without it an operator releases an
 * escrow hold, sees the toast, and watches the row still say `Held`.
 */
export function useMoneyActions<T>({ keyOf }: { keyOf: (row: T) => string }): MoneyActions<T> {
  const [held, setHeld] = useState<ReadonlyMap<string, T>>(() => new Map())
  const [failures, setFailures] = useState<ReadonlyMap<string, RowFailure>>(() => new Map())
  const [busy, setBusy] = useState(false)

  const apply = useCallback(
    (rows: readonly T[]) =>
      held.size === 0 ? rows : rows.map((row) => held.get(keyOf(row)) ?? row),
    [held, keyOf],
  )

  const run = useCallback(
    async ({
      key,
      errorMessage,
      toastMessage,
      action,
    }: {
      key: string
      errorMessage: string
      toastMessage?: string
      action: () => Promise<T>
    }): Promise<boolean> => {
      setBusy(true)
      setFailures((current) => {
        if (!current.has(key)) return current
        const next = new Map(current)
        next.delete(key)
        return next
      })
      try {
        const result = await action()
        setHeld((current) => new Map(current).set(key, result))
        /* R10 — the transient confirmation, and nothing else. */
        if (toastMessage) toast(toastMessage)
        return true
      } catch {
        setFailures((current) =>
          new Map(current).set(key, {
            message: errorMessage,
            retry: () => void run({ key, errorMessage, toastMessage, action }),
          }),
        )
        return false
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  return {
    apply,
    failure: (key) => failures.get(key),
    busy,
    run,
  }
}

/** The row-scoped error message every Financials mutation shares (**AC-429**). */
export function rowErrorMessage(t: Translate): string {
  return t('fin.error.row')
}
