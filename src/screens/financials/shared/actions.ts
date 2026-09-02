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
  /**
   * **P4-T1** — one bulk command over a selected set.
   *
   * Sequential, not `Promise.all`, and that is the whole design of it. Every
   * mutation behind this hook is stateful on the server: a payout run reads the
   * captain's receivable, an authority envelope consumes a daily ceiling, and
   * the audit log is an ordered record of what an operator did. Firing twelve
   * at once makes the order of twelve audit entries an accident of scheduling.
   *
   * **The refusal is pre-flight and belongs to the caller** (`bulkRefusal` in
   * `derive.ts`): by the time this runs, every key in the set has been checked.
   * What can still go wrong here is a *failure* — a dropped request, an
   * injected fault — and that is per row: it lands in `failures` and renders on
   * its own row with a retry (**AC-431**), exactly as a single-row failure
   * does. `committed` and `failed` are returned so the caller can decide the
   * surface; **R10** is why it must not raise a toast when something failed,
   * because the rows are already carrying that standing condition.
   *
   * > **Not atomic, and no client seam can make it so today.** There is no
   * > batch endpoint on any Financials client, so N commands are N writes. A
   * > mid-set failure leaves the set half-applied with the remainder marked on
   * > their rows. Raised in the handoff.
   */
  runMany: (options: {
    keys: readonly string[]
    errorMessage: string
    /** Emitted once, only when **nothing** failed. */
    toastMessage?: string
    action: (key: string) => Promise<T>
  }) => Promise<{ committed: number; failed: number }>
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

  /**
   * One mutation, with no `busy` window and no toast of its own — those are
   * decisions about a whole *act*, and an act is one row for `run` and a whole
   * set for `runMany`. Sharing this is what keeps **AC-430** and **AC-431**
   * identical on both paths: nothing is written optimistically, and a failure
   * lands on the row it belongs to with a retry that re-runs the same call.
   */
  const runOne = useCallback(
    async (options: {
      key: string
      errorMessage: string
      action: () => Promise<T>
      /** What the row's own `Retry` re-runs. The two paths retry ONE row. */
      retry: () => void
    }): Promise<boolean> => {
      const { key, errorMessage, action, retry } = options
      setFailures((current) => {
        if (!current.has(key)) return current
        const next = new Map(current)
        next.delete(key)
        return next
      })
      try {
        const result = await action()
        setHeld((current) => new Map(current).set(key, result))
        return true
      } catch {
        setFailures((current) => new Map(current).set(key, { message: errorMessage, retry }))
        return false
      }
    },
    [],
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
      try {
        const committed = await runOne({
          key,
          errorMessage,
          action,
          retry: () => void run({ key, errorMessage, toastMessage, action }),
        })
        /* R10 + G9 — the transient confirmation, and nothing else. It is
           `success` because it only fires when the write committed. */
        if (committed && toastMessage) toast.success(toastMessage)
        return committed
      } finally {
        setBusy(false)
      }
    },
    [runOne],
  )

  const runMany = useCallback(
    async ({
      keys,
      errorMessage,
      toastMessage,
      action,
    }: {
      keys: readonly string[]
      errorMessage: string
      toastMessage?: string
      action: (key: string) => Promise<T>
    }): Promise<{ committed: number; failed: number }> => {
      setBusy(true)
      let committed = 0
      let failed = 0
      try {
        for (const key of keys) {
          const ok = await runOne({
            key,
            errorMessage,
            action: () => action(key),
            /* The retry is that ONE row's, not the set's. Re-running twelve
               payouts because one of them failed is how a bulk command pays a
               captain twice. */
            retry: () => void run({ key, errorMessage, action: () => action(key) }),
          })
          if (ok) committed += 1
          else failed += 1
        }
        /* **R10, and it is the reason `failed` is counted.** A set that
           committed whole is a transient confirmation and gets one toast. A set
           with a failure in it is a STANDING condition on the rows that failed,
           they are already carrying it, and a toast on top would be the second
           surface for one event. */
        if (failed === 0 && toastMessage) toast.success(toastMessage)
        return { committed, failed }
      } finally {
        setBusy(false)
      }
    },
    [runOne, run],
  )

  return {
    apply,
    failure: (key) => failures.get(key),
    busy,
    run,
    runMany,
  }
}

/** The row-scoped error message every Financials mutation shares (**AC-429**). */
export function rowErrorMessage(t: Translate): string {
  return t('fin.error.row')
}
