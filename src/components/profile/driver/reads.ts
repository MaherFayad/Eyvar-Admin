/**
 * **Every read the captain profile issues — declared once, called by both
 * surfaces.**
 *
 * The rider wave's sheet (`useRiderReads`) and page (`RiderProfilePage`'s five
 * inline `useAsync` calls) issue *different* queries for the same collections,
 * with different page sizes and — in two cases — different cache keys, and its
 * own file header records the hazard: *"sharing a key would serve one surface
 * the other's rows."* The two surfaces are then kept honest by a parity test
 * that renders both and diffs them.
 *
 * Here there is one hook. Both surfaces call it, so the queries, the sorts, the
 * page sizes and the cache keys are the same by construction and there is
 * nothing for a test to diff. A surface may arrange these rows differently; it
 * cannot be looking at different rows.
 *
 * ## The eight reads a captain profile makes — seven of them this hook's
 *
 * The first row is the caller's: `ProfileLayer` and `EntityPageScreen` each own
 * the record read and hand the result down, so the band paints from it while the
 * seven below are still in flight.
 *
 * | read | what it answers | why separate |
 * |---|---|---|
 * | `getDriver` (owned by the caller) | the band, standing, capacity, identity, the vehicle, the bank | one record, one request — four sections derive from it |
 * | `getDriverMoneyMovements` | **the five money figures** and what moved them | a captain has two ledgers and three off-ledger figures. One read, so five numbers on one line cannot arrive at five different times or from five different requests |
 * | `listCaptainPayouts` | the payout POSITION — the account, its state, when it was last paid | a different question from *how much*: `payableHalalas` is read from the ledger by both, and this read is used for the account facts only. See below |
 * | `getCaptainPayableLedger` | what moved the payable, **with a running balance** | the ledger is windowed and the position is not; conflating them is how a screen prints a period figure under a live label |
 * | `getDriverCompliance` | the five documents and their dates | its own resource with its own cardinality. `types/driver.ts`: fusing it onto `Driver` because they share a screen is the mistake §5.1 warns about |
 * | `getDriverTimeline` | the record's own lifecycle | **server-derived**, so a sheet and a page cannot merge the same resources and arrive at two answers, and same-day ordering has exactly one answer |
 * | `getDriverSupportPresence` | what else in the console references this captain | nine collections. `Driver.openComplaints` counts one of them, so a profile that read that field would answer `0` for a captain with an open dispute, an unresolved cash report and a fairness case |
 * | `listDeductions` | what has been taken off, and why | the presence read gives the *count*; this gives the rows, with their reasons |
 *
 * ## Two reads carry `payableHalalas`, and only one of them is rendered
 *
 * `DriverMoneyMovements.payableHalalas` and `CaptainPayout.payableHalalas` are
 * the same number by construction — `types/driver.ts` says so, and both are
 * `subjectClosingBalance('liability.driver', id)` rather than a value carried
 * beside the ledger. **The profile renders the first and never the second.**
 * One figure, one source, and no possibility of two reads landing at different
 * moments and painting two amounts a second apart. `listCaptainPayouts` is read
 * for the facts only it has: the bank account's last four, the payout state,
 * `lastPayoutAt` and `tripsInPeriod`.
 *
 * ## `getDriverCompliance` throws a 404 for a captain with no file, and a 404
 * here is an ANSWER
 *
 * *"No documents on record"* is a fact about the captain, not a failure of the
 * request, and rendering `Couldn't load Documents. Try again.` over it is a
 * false statement an operator cannot distinguish from an outage. `isApiError`
 * is the machine-readable discriminator (the message string is never branched
 * on), so the fetcher maps `not-found` to `null` and `isEmpty` is overridden so
 * that `null` stays `content`. `complianceState()` below is the four-way switch
 * every consumer uses, so no component re-derives it.
 */

import { useAsync, type AsyncResult } from '@/hooks'
import {
  getCaptainPayableLedger,
  getDriverCompliance,
  getDriverMoneyMovements,
  getDriverSupportPresence,
  getDriverTimeline,
  listCaptainPayouts,
  listDeductions,
} from '@/data/clients'
import { isApiError } from '@/data/types'
import type {
  CaptainPayout,
  Deduction,
  DriverCompliance,
  DriverMoneyMovements,
  DriverSupportPresence,
  DriverTimelineEvent,
  Ledger,
  Paginated,
} from '@/data/types'

/**
 * How many rows of a captain-scoped collection either surface holds.
 *
 * The profile shows a bounded window and states its truncation in words (§5.4);
 * it is not an index and does not paginate. Six is `MINI_LEDGER_ROWS`, the
 * figure §6.2 fixes for a profile's money card, reused so the timeline and the
 * deduction list are the same height as it rather than three arbitrary numbers.
 */
export const DRIVER_LIST_ROWS = 6

export interface DriverReads {
  /** The five money figures and the rows behind them. The block's one source. */
  money: AsyncResult<DriverMoneyMovements>
  /** The payout POSITION — account, state, last paid. Never the payable figure. */
  payout: AsyncResult<Paginated<CaptainPayout>>
  /** `null` data is the captain with no file on record — an answer, not a miss. */
  compliance: AsyncResult<DriverCompliance | null>
  ledger: AsyncResult<Ledger>
  deductions: AsyncResult<Paginated<Deduction>>
  timeline: AsyncResult<Paginated<DriverTimelineEvent>>
  support: AsyncResult<DriverSupportPresence>
}

/**
 * `enabled` is the caller saying *this record is a captain*.
 *
 * It is a parameter and not a `driverId === ''` sentinel because a hook cannot
 * be called conditionally: `ProfileLayer` calls this for all eleven record
 * kinds and must fire the reads for exactly one of them. An empty id under a
 * disabled read is never used as a key — `useAsync` stores nothing while
 * `enabled` is false, so the other ten kinds cost no request.
 */
export function useDriverReads(driverId: string, enabled = true): DriverReads {
  const money = useAsync<DriverMoneyMovements>(
    (signal) => getDriverMoneyMovements(driverId, signal),
    {
      deps: [driverId],
      enabled,
      cacheKey: 'drivers.movements',
      /* A captain with no movements is a real, renderable answer — five
         figures, all of which may legitimately be zero, and a list the panel
         prints its own sentence for. The default `Paginated`-shaped guess does
         not apply to this envelope. */
      isEmpty: () => false,
    },
  )

  const payout = useAsync<Paginated<CaptainPayout>>(
    (signal) =>
      listCaptainPayouts(
        { filters: [{ field: 'captainId', op: 'eq', value: driverId }], pageSize: 1 },
        signal,
      ),
    {
      deps: [driverId],
      enabled,
      cacheKey: 'payouts.list',
      /* A captain the payouts run has never seen returns `total: 0`, and that
         is a real answer the block states in words. It stays `empty` rather
         than being forced to `content`, so `SectionStates` prints the sentence
         and no figure is invented for it. */
    },
  )

  const compliance = useAsync<DriverCompliance | null>(
    async (signal) => {
      try {
        return await getDriverCompliance(driverId, signal)
      } catch (error) {
        /* A 404 is the captain having no file, which is a FACT. Any other
           failure is a failure and is rethrown so the error state is honest. */
        if (isApiError(error) && error.kind === 'not-found') return null
        throw error
      }
    },
    {
      deps: [driverId],
      enabled,
      cacheKey: 'compliance.get',
      /* `null` is an answer, so it must not be reported as `empty` — the
         default `isEmpty` would, and the four-way switch below would then
         never see it. */
      isEmpty: () => false,
    },
  )

  const ledger = useAsync<Ledger>((signal) => getCaptainPayableLedger(driverId, undefined, signal), {
    deps: [driverId],
    enabled,
    cacheKey: 'payouts.ledger',
    /* An envelope, not a list: `Ledger` has no `total`, and a ledger with no
       postings in the window is not an empty READ — it has an opening balance,
       a closing balance and a period, all of which render. The table decides
       first-run from `lifetimePostings`, which is the only field that can
       answer a lifetime question. */
    isEmpty: () => false,
  })

  const deductions = useAsync<Paginated<Deduction>>(
    (signal) =>
      listDeductions(
        {
          filters: [{ field: 'captainId', op: 'eq', value: driverId }],
          sort: { field: 'raisedAt', dir: 'desc' },
          pageSize: DRIVER_LIST_ROWS,
        },
        signal,
      ),
    { deps: [driverId], enabled, cacheKey: 'payouts.deductions' },
  )

  /* **Server-derived, and that is the whole point of it.** A captain with 412
     trips has 412 events, so the envelope is paginated and the profile asks for
     the first page and states its truncation in words (§5.4). The badge that
     would count it is deliberately absent — see `DriverPanels`. */
  const timeline = useAsync<Paginated<DriverTimelineEvent>>(
    (signal) => getDriverTimeline(driverId, { pageSize: DRIVER_LIST_ROWS }, signal),
    { deps: [driverId], enabled, cacheKey: 'drivers.timeline' },
  )

  const support = useAsync<DriverSupportPresence>(
    (signal) => getDriverSupportPresence(driverId, signal),
    {
      deps: [driverId],
      enabled,
      cacheKey: 'drivers.support',
      /* Nine counts, all of which may legitimately be zero. `{0,0}` on every
         resource is an ANSWER — *"nothing anywhere references this captain"* —
         and the card prints it per resource. It is not an empty read. */
      isEmpty: () => false,
    },
  )

  return { money, payout, compliance, ledger, deductions, timeline, support }
}

/**
 * The compliance read, as the four things it can actually be.
 *
 * `no-file` is a **fact about the captain** and is deliberately not folded into
 * either `error` (nothing failed) or an empty list (there is no list — the
 * envelope is an object). Every consumer switches on this, so the 404-is-an-
 * answer rule is written once.
 */
export type ComplianceState =
  | { kind: 'loading' }
  | { kind: 'error'; retry: () => void }
  | { kind: 'no-file' }
  | { kind: 'file'; compliance: DriverCompliance }

export function complianceState(result: AsyncResult<DriverCompliance | null>): ComplianceState {
  if (result.status === 'loading') return { kind: 'loading' }
  if (result.status === 'error') return { kind: 'error', retry: result.refetch }
  if (result.data === null) return { kind: 'no-file' }
  return { kind: 'file', compliance: result.data }
}
