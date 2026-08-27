/**
 * `DB.dailySnapshots`, re-anchored — **thirty consecutive daily rows across
 * nine fields**, the only real history in the legacy app.
 *
 * Ported verbatim from `eyvar_ops_panel_v40_fixed.html:13803`–`:13832`. Every
 * value below is the legacy value; the only things that changed are the
 * **dates** and the **money unit**.
 *
 * ## Why the dates moved (AC-604, spec §4.2 item 4)
 *
 * The legacy series runs **26 Jun → 25 Jul 2026** while the fixed clock is
 * `2026-06-25T09:14` (`mock/clock.ts:25`). The whole thirty days sat in the
 * *future* of the clock, which made every row unusable: a comparison window
 * cannot end after the instant the board was computed, and a chart cannot plot
 * tomorrow. Shifting the window by **−30 days** lands it on
 * **27 May → 25 Jun 2026**, ending exactly on `EYVAR_TODAY`.
 *
 * The shift is a pure translation. The day-to-day movement — riders 6 → 10,
 * captains 4 → 7, the cancellation rate wandering between 3 % and 9 %, revenue
 * compounding from SAR 295 to SAR 647 — is the part with value and none of it
 * was regenerated. `snapshots.test.ts`… there is no such file: the invariants
 * are asserted in `clients/metrics.test.ts` under AC-604, beside the metric
 * comparisons that depend on them.
 *
 * ## The levels describe the LEGACY seed, not our fixtures — read this before
 * using a row as a baseline
 *
 * The final row says 10 riders, 7 captains and 6 active subscriptions. This
 * data layer's fixtures hold **13 riders, 52 active captains and 47 active
 * subscriptions**. The two datasets are an order of magnitude apart, because
 * the legacy seed is a demo and `fixtures/riders.ts` / `drivers.ts` /
 * `subscriptions.ts` are a working console.
 *
 * **So an absolute field here cannot be a comparison baseline for a derived
 * tile.** `52 active captains today against 6 a fortnight ago` is `+767 %` and
 * it is nonsense — the same defect the spec records as **L-3** (`:6969`), a
 * delta between two different populations. Those baselines are derived instead
 * from the *same fixture the value comes from*, as at the previous window's
 * close; see `fixtures/metrics.ts`.
 *
 * **`cancelRatePct` is the exception and it is the valuable one.** A rate is
 * level-independent: 3–9 % is as true of 47 subscriptions as of 6. It is the
 * one field here that can back a tile today, and spec §6.1 tile 1 is the tile —
 * *"currently on no board at all. That is the 'cancellations spiking' the
 * business owner asked for."* Its 15-day means are 5.20 % then 6.67 %.
 *
 * ## No client, on purpose
 *
 * Nothing outside `src/data` reads this. It is history *behind* the metrics,
 * consumed by `fixtures/metrics.ts` and `clients/metrics.ts`, and a screen that
 * wanted raw snapshots would be building a second chart layer. When the server
 * exists the rows arrive as
 * `GET /api/v1/metrics/snapshots?from&to -> Paginated<DailySnapshot>`; adding
 * that client is a two-line change here and no change anywhere else.
 */

import type { DailySnapshot } from '../types/metrics'

/** An inclusive day range over the snapshot rows. Both bounds are `IsoDate`. */
export interface DailySnapshotWindow {
  start: string
  end: string
}

/**
 * The last fifteen snapshot days — `2026-06-11` … `2026-06-25`, ending on the
 * fixed clock's day.
 *
 * **Fifteen, not thirty.** Thirty rows are one thirty-day window, not two: a
 * `previous 30 days` comparison needs sixty snapshots and the spec says so
 * itself for charts (§5.2, *"which needs 60 snapshots"*) while §5.1 and §6.1
 * ask for it on tiles. Fifteen and fifteen is the largest symmetric pair this
 * data supports, and it uses all thirty rows rather than the seven the chart
 * windows use.
 */
export const SNAPSHOT_CURRENT = { start: '2026-06-11', end: '2026-06-25' } as const

/** The fifteen days before it — `2026-05-27` … `2026-06-10`. */
export const SNAPSHOT_PREVIOUS = { start: '2026-05-27', end: '2026-06-10' } as const

/**
 * Ascending by `date`. Legacy stores them newest-first (`.reverse()` at
 * `:13833`) and every consumer re-sorts; storing them in plot order removes a
 * whole class of off-by-one.
 */
export const dailySnapshotFixtures: DailySnapshot[] = [
  { id: 'SNAP-0001', date: '2026-05-27', riders: 6, drivers: 4, activeSubs: 2, quickRides: 8, cancelRatePct: 7, totalRevenueHalalas: 29505, quickRideRevenueHalalas: 18588, subRevenueHalalas: 10917 },
  { id: 'SNAP-0002', date: '2026-05-28', riders: 6, drivers: 4, activeSubs: 2, quickRides: 12, cancelRatePct: 4, totalRevenueHalalas: 29156, quickRideRevenueHalalas: 18368, subRevenueHalalas: 10788 },
  { id: 'SNAP-0003', date: '2026-05-29', riders: 6, drivers: 4, activeSubs: 2, quickRides: 25, cancelRatePct: 4, totalRevenueHalalas: 30837, quickRideRevenueHalalas: 19427, subRevenueHalalas: 11410 },
  { id: 'SNAP-0004', date: '2026-05-30', riders: 6, drivers: 4, activeSubs: 2, quickRides: 9, cancelRatePct: 3, totalRevenueHalalas: 32112, quickRideRevenueHalalas: 20231, subRevenueHalalas: 11881 },
  { id: 'SNAP-0005', date: '2026-05-31', riders: 6, drivers: 4, activeSubs: 2, quickRides: 15, cancelRatePct: 3, totalRevenueHalalas: 31052, quickRideRevenueHalalas: 19563, subRevenueHalalas: 11489 },
  { id: 'SNAP-0006', date: '2026-06-01', riders: 6, drivers: 4, activeSubs: 2, quickRides: 25, cancelRatePct: 9, totalRevenueHalalas: 32190, quickRideRevenueHalalas: 20280, subRevenueHalalas: 11910 },
  { id: 'SNAP-0007', date: '2026-06-02', riders: 7, drivers: 4, activeSubs: 2, quickRides: 26, cancelRatePct: 7, totalRevenueHalalas: 31726, quickRideRevenueHalalas: 19988, subRevenueHalalas: 11739 },
  { id: 'SNAP-0008', date: '2026-06-03', riders: 7, drivers: 4, activeSubs: 3, quickRides: 8, cancelRatePct: 5, totalRevenueHalalas: 34031, quickRideRevenueHalalas: 19908, subRevenueHalalas: 14123 },
  { id: 'SNAP-0009', date: '2026-06-04', riders: 7, drivers: 5, activeSubs: 3, quickRides: 18, cancelRatePct: 7, totalRevenueHalalas: 35812, quickRideRevenueHalalas: 20950, subRevenueHalalas: 14862 },
  { id: 'SNAP-0010', date: '2026-06-05', riders: 7, drivers: 5, activeSubs: 3, quickRides: 18, cancelRatePct: 4, totalRevenueHalalas: 35043, quickRideRevenueHalalas: 20500, subRevenueHalalas: 14543 },
  { id: 'SNAP-0011', date: '2026-06-06', riders: 7, drivers: 5, activeSubs: 3, quickRides: 11, cancelRatePct: 8, totalRevenueHalalas: 33979, quickRideRevenueHalalas: 19877, subRevenueHalalas: 14101 },
  { id: 'SNAP-0012', date: '2026-06-07', riders: 7, drivers: 5, activeSubs: 3, quickRides: 16, cancelRatePct: 3, totalRevenueHalalas: 36462, quickRideRevenueHalalas: 21330, subRevenueHalalas: 15132 },
  { id: 'SNAP-0013', date: '2026-06-08', riders: 8, drivers: 5, activeSubs: 3, quickRides: 25, cancelRatePct: 4, totalRevenueHalalas: 38392, quickRideRevenueHalalas: 22459, subRevenueHalalas: 15933 },
  { id: 'SNAP-0014', date: '2026-06-09', riders: 8, drivers: 5, activeSubs: 3, quickRides: 20, cancelRatePct: 4, totalRevenueHalalas: 41465, quickRideRevenueHalalas: 24257, subRevenueHalalas: 17208 },
  { id: 'SNAP-0015', date: '2026-06-10', riders: 8, drivers: 5, activeSubs: 4, quickRides: 19, cancelRatePct: 6, totalRevenueHalalas: 42560, quickRideRevenueHalalas: 22982, subRevenueHalalas: 19578 },
  { id: 'SNAP-0016', date: '2026-06-11', riders: 8, drivers: 5, activeSubs: 4, quickRides: 9, cancelRatePct: 6, totalRevenueHalalas: 44371, quickRideRevenueHalalas: 23961, subRevenueHalalas: 20411 },
  { id: 'SNAP-0017', date: '2026-06-12', riders: 8, drivers: 6, activeSubs: 4, quickRides: 10, cancelRatePct: 6, totalRevenueHalalas: 46505, quickRideRevenueHalalas: 25113, subRevenueHalalas: 21392 },
  { id: 'SNAP-0018', date: '2026-06-13', riders: 8, drivers: 6, activeSubs: 4, quickRides: 20, cancelRatePct: 7, totalRevenueHalalas: 49077, quickRideRevenueHalalas: 26502, subRevenueHalalas: 22576 },
  { id: 'SNAP-0019', date: '2026-06-14', riders: 9, drivers: 6, activeSubs: 4, quickRides: 19, cancelRatePct: 5, totalRevenueHalalas: 49708, quickRideRevenueHalalas: 26842, subRevenueHalalas: 22866 },
  { id: 'SNAP-0020', date: '2026-06-15', riders: 9, drivers: 6, activeSubs: 4, quickRides: 14, cancelRatePct: 7, totalRevenueHalalas: 49948, quickRideRevenueHalalas: 26972, subRevenueHalalas: 22976 },
  { id: 'SNAP-0021', date: '2026-06-16', riders: 9, drivers: 6, activeSubs: 4, quickRides: 10, cancelRatePct: 5, totalRevenueHalalas: 51747, quickRideRevenueHalalas: 27943, subRevenueHalalas: 23803 },
  { id: 'SNAP-0022', date: '2026-06-17', riders: 9, drivers: 6, activeSubs: 5, quickRides: 15, cancelRatePct: 5, totalRevenueHalalas: 52757, quickRideRevenueHalalas: 26115, subRevenueHalalas: 26642 },
  { id: 'SNAP-0023', date: '2026-06-18', riders: 9, drivers: 6, activeSubs: 5, quickRides: 16, cancelRatePct: 6, totalRevenueHalalas: 53430, quickRideRevenueHalalas: 26448, subRevenueHalalas: 26982 },
  { id: 'SNAP-0024', date: '2026-06-19', riders: 9, drivers: 6, activeSubs: 5, quickRides: 9, cancelRatePct: 6, totalRevenueHalalas: 55147, quickRideRevenueHalalas: 27298, subRevenueHalalas: 27849 },
  { id: 'SNAP-0025', date: '2026-06-20', riders: 10, drivers: 7, activeSubs: 5, quickRides: 18, cancelRatePct: 9, totalRevenueHalalas: 57510, quickRideRevenueHalalas: 28467, subRevenueHalalas: 29042 },
  { id: 'SNAP-0026', date: '2026-06-21', riders: 10, drivers: 7, activeSubs: 5, quickRides: 14, cancelRatePct: 8, totalRevenueHalalas: 57268, quickRideRevenueHalalas: 28348, subRevenueHalalas: 28920 },
  { id: 'SNAP-0027', date: '2026-06-22', riders: 10, drivers: 7, activeSubs: 5, quickRides: 23, cancelRatePct: 9, totalRevenueHalalas: 56768, quickRideRevenueHalalas: 28100, subRevenueHalalas: 28668 },
  { id: 'SNAP-0028', date: '2026-06-23', riders: 10, drivers: 7, activeSubs: 5, quickRides: 22, cancelRatePct: 5, totalRevenueHalalas: 59426, quickRideRevenueHalalas: 29416, subRevenueHalalas: 30010 },
  { id: 'SNAP-0029', date: '2026-06-24', riders: 10, drivers: 7, activeSubs: 6, quickRides: 15, cancelRatePct: 7, totalRevenueHalalas: 59171, quickRideRevenueHalalas: 26627, subRevenueHalalas: 32544 },
  { id: 'SNAP-0030', date: '2026-06-25', riders: 10, drivers: 7, activeSubs: 6, quickRides: 21, cancelRatePct: 9, totalRevenueHalalas: 64737, quickRideRevenueHalalas: 24600, subRevenueHalalas: 40137 },
]

/** Rows whose `date` falls inside a window, inclusive. Both bounds are `IsoDate`. */
export const snapshotsBetween = (start: string, end: string): DailySnapshot[] =>
  dailySnapshotFixtures.filter((s) => s.date >= start && s.date <= end)
