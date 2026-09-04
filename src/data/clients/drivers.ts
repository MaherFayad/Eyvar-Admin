/**
 * Captains and fleet compliance — Operations › People, views *Captains* and
 * *Compliance*.
 *
 * **Two resources, one file, separate functions.** People also covers
 * Applications (`applicants.ts`) and Riders (`riders.ts`). Four resources share
 * one route; they do not share a type, a query or an endpoint. §5.1: "the
 * component set a single sub-tab needs is the *union* of its patterns" — the
 * data set is a union too, not a fusion.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import { ApiError } from '../types/common'
import type { Facets, IsoDateTime, Paginated, QueryParams, RelatedCount } from '../types/common'
import { isOpenComplaint } from '../types/complaint'
import type { PermissionKey } from '../types/navigation'
import type {
  ComplianceDocFile,
  ComplianceDocumentFileRead,
  Driver,
  DriverCompliance,
  DriverMoneyMovement,
  DriverMoneyMovements,
  DriverStatus,
  DriverSupportPresence,
  DriverTimelineEvent,
  DriverTimelineKind,
} from '../types/driver'
import { isPendingSettlement } from '../types/ledger'
import type { Trip } from '../types/trip'
import { http } from './http'
/* The two ledgers a captain has, from the module that owns them. `ledger.ts`
   does not import this file, so there is no cycle — and reading postings
   through the ledger client rather than the fixture keeps a payout committed in
   the session inside the captain's movement list for free. */
import { allLedgerPostings, subjectClosingBalance } from './ledger'
/* Escrow and deductions, likewise live rather than seeded: `payouts.ts` holds
   the session copies that `releaseEscrow`, `applyDeduction` and `waiveDeduction`
   mutate, and a profile reading the fixture array behind them would keep showing
   a hold that was released two clicks ago. */
import { deductionRows, escrowHoldRows } from './payouts'
/* Who is asking. The scan read is permitted separately from the record read,
   and `currentMockPermissions()` is the mock server's answer to "what may this
   operator do" — the same resolution `buildSession` delivers to the shell, so a
   refusal here and the permission list an operator is shown cannot disagree. */
import { currentMockPermissions } from './session'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let allDriverFixtures!: Fixtures['allDriverFixtures']
let complianceFixtures!: Fixtures['complianceFixtures']
/* The mock object store. Bound the same late way as every fixture, which is
   what keeps ~400 lines of PNG/JPEG/PDF encoder out of a `VITE_DATA_SOURCE=http`
   build entirely — against a real store they are dead code. */
let complianceScanBytes!: Fixtures['complianceScanBytes']
/* The captain's own history — trips they drove, and the payments that name them. */
let allTripFixtures!: Fixtures['allTripFixtures']
let paymentFixtures!: Fixtures['paymentFixtures']
/* The nine collections `getDriverSupportPresence` counts. Bound the same late
   way as the rest; see `mock/fixtures.ts` for why none of this is a static
   import. Escrow and deductions are NOT here — they are read live from
   `clients/payouts.ts`, which holds the session copies. */
let cashReportFixtures!: Fixtures['cashReportFixtures']
let complaintFixtures!: Fixtures['complaintFixtures']
let conversationFixtures!: Fixtures['conversationFixtures']
let disputeFixtures!: Fixtures['disputeFixtures']
let fairnessCaseFixtures!: Fixtures['fairnessCaseFixtures']
let lostFoundFixtures!: Fixtures['lostFoundFixtures']
let safetyIncidentFixtures!: Fixtures['safetyIncidentFixtures']
let ticketFixtures!: Fixtures['ticketFixtures']
onFixturesLoaded((f) => {
  allDriverFixtures = f.allDriverFixtures
  complianceFixtures = f.complianceFixtures
  complianceScanBytes = f.complianceScanBytes
  allTripFixtures = f.allTripFixtures
  paymentFixtures = f.paymentFixtures
  cashReportFixtures = f.cashReportFixtures
  complaintFixtures = f.complaintFixtures
  conversationFixtures = f.conversationFixtures
  disputeFixtures = f.disputeFixtures
  fairnessCaseFixtures = f.fairnessCaseFixtures
  lostFoundFixtures = f.lostFoundFixtures
  safetyIncidentFixtures = f.safetyIncidentFixtures
  ticketFixtures = f.ticketFixtures
})

export const DRIVER_OPERATIONS = {
  complianceFacets: 'compliance.facets',
  facets: 'drivers.facets',
  list: 'drivers.list',
  get: 'drivers.get',
  timeline: 'drivers.timeline',
  movements: 'drivers.movements',
  support: 'drivers.support',
  suspend: 'drivers.suspend',
  reinstate: 'drivers.reinstate',
  complianceList: 'compliance.list',
  complianceGet: 'compliance.get',
  complianceDocumentFile: 'compliance.documentFile',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(DRIVER_OPERATIONS))

export interface DriverQuery extends QueryParams {
  status?: DriverStatus
}

/** What the mock engine may search, sort and filter on. Anything not here throws rather than silently returning everything. */
const driverShape: QueryShape<Driver> = {
  searchable: [(d) => d.name, (d) => d.id, (d) => d.phone, (d) => d.vehicle, (d) => d.email],
  sortable: {
    name: (d) => d.name,
    rating: (d) => d.rating,
    totalTrips: (d) => d.totalTrips,
    monthEarningsHalalas: (d) => d.monthEarningsHalalas,
    onTimePercent: (d) => d.onTimePercent,
    joinedAt: (d) => d.joinedAt,
    lastTripAt: (d) => d.lastTripAt,
    activeSubscriptions: (d) => d.activeSubscriptions,
  },
  /**
   * **Filterability is a property of the resource, not of the screen.** Wave 1
   * renders captains on Operations › People, but Risk & Signals, Trip
   * Assurance, Payouts and Admin all query the same records from other
   * surfaces. The full set is declared here so those waves do not each come
   * back for one more accessor — and because `runQuery` throws on an
   * undeclared field, which reaches the operator as the error state.
   *
   * Every **date** field goes through `toInstant`, so a `date-range` filter
   * compares instant against instant. See `mock/clock.ts` for why a bare
   * `2025-02-01` is not safe to compare against a Riyadh-bounded range.
   */
  filterable: {
    /* identity — text */
    id: (d) => d.id,
    name: (d) => d.name,
    phone: (d) => d.phone,
    email: (d) => d.email,
    vehicle: (d) => d.vehicle,

    /* closed sets — select / multi-select, options via `getDriverFacets` */
    status: (d) => d.status,
    tier: (d) => d.tier,
    vehicleClass: (d) => d.vehicleClass,
    city: (d) => d.city,
    gender: (d) => d.gender,
    appLanguage: (d) => d.appLanguage,
    planAccess: (d) => d.planAccess,
    bankStatus: (d) => d.bank.status,

    /* booleans */
    suspended: (d) => d.suspended,
    hasPhoto: (d) => d.hasPhoto,
    multiSubException: (d) => d.multiSubException,
    flaggedForDeclines: (d) => d.flaggedForDeclines,
    manualFlag: (d) => d.manualFlag,

    /* numbers — number-range and money-range */
    rating: (d) => d.rating,
    openComplaints: (d) => d.openComplaints,
    totalTrips: (d) => d.totalTrips,
    monthEarningsHalalas: (d) => d.monthEarningsHalalas,
    onTimePercent: (d) => d.onTimePercent,
    activeSubscriptions: (d) => d.activeSubscriptions,
    maxSubscriptions: (d) => d.maxSubscriptions,
    openSubscriptionSlots: (d) => d.openSubscriptionSlots,

    /* dates — the kind that had no reachable field until now */
    joinedAt: (d) => toInstant(d.joinedAt),
    lastTripAt: (d) => toInstant(d.lastTripAt),
    planFrozenUntil: (d) => toInstant(d.planFrozenUntil),

    /* fraud signals — Management › Risk & Signals (wave 4) reads these */
    lastIp: (d) => d.lastIp,
    ipLocation: (d) => d.ipLocation,
    device: (d) => d.device,
  },
  facetable: [
    'status',
    'tier',
    'vehicleClass',
    'city',
    'gender',
    'appLanguage',
    'planAccess',
    'bankStatus',
  ],
  views: {
    captains: () => true,
  },
}

/**
 * GET /api/v1/drivers
 *   params: q · status · page · pageSize · sort=<field>:<dir> · filter=<field>:<op>:<value>
 *   -> Paginated<Driver>
 *
 * Sortable: name · rating · totalTrips · monthEarningsHalalas · onTimePercent ·
 *           joinedAt · lastTripAt · activeSubscriptions
 * Filterable: status · tier · vehicleClass · city · suspended · planAccess ·
 *             rating · openComplaints
 *
 * `status` is server-derived from `suspended`, the flag set and the open
 * complaint count (see `types/driver.ts`). Do not recompute it client-side.
 */
export async function listDrivers(
  params: DriverQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Driver>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Driver>>('/drivers', { ...params }, { signal })
  }
  return mock(DRIVER_OPERATIONS.list, signal, () => {
    const filters = params.status
      ? [...(params.filters ?? []), { field: 'status', op: 'eq' as const, value: params.status }]
      : params.filters
    return runQuery(allDriverFixtures, { ...params, filters }, driverShape)
  })
}

/**
 * GET /api/v1/drivers/:id
 *   -> Driver
 *   404 when the id does not exist
 */
export async function getDriver(id: string, signal?: AbortSignal): Promise<Driver> {
  if (DATA_SOURCE === 'http') return http.get<Driver>(`/drivers/${id}`, undefined, { signal })
  return mock(DRIVER_OPERATIONS.get, signal, () => {
    const row = allDriverFixtures.find((d) => d.id === id)
    if (!row) throw notFound('captain', id)
    return row
  })
}

/**
 * POST /api/v1/drivers/:id/suspend
 *   body: { reason: string }
 *   -> Driver
 *
 * `reason` is required by the domain: the suspension banner names it, and a
 * suspension with no stated reason is not appealable.
 */
export async function suspendDriver(
  id: string,
  reason: string,
  signal?: AbortSignal,
): Promise<Driver> {
  if (DATA_SOURCE === 'http') return http.post<Driver>(`/drivers/${id}/suspend`, { reason }, { signal })
  return mockMutation(DRIVER_OPERATIONS.suspend, signal, () => {
    const row = allDriverFixtures.find((d) => d.id === id)
    if (!row) throw notFound('captain', id)
    return { ...row, status: 'suspended' as const, suspended: true, suspensionReason: reason }
  })
}

/**
 * POST /api/v1/drivers/:id/reinstate
 *   -> Driver
 */
export async function reinstateDriver(id: string, signal?: AbortSignal): Promise<Driver> {
  if (DATA_SOURCE === 'http') return http.post<Driver>(`/drivers/${id}/reinstate`, undefined, { signal })
  return mockMutation(DRIVER_OPERATIONS.reinstate, signal, () => {
    const row = allDriverFixtures.find((d) => d.id === id)
    if (!row) throw notFound('captain', id)
    return { ...row, status: 'active' as const, suspended: false, suspensionReason: null }
  })
}

/* ───────────────────────── the record's history ─────────────────────────── */

/**
 * `TripStatus` → the timeline event that trip contributes, and **which of its
 * two timestamps dates it**.
 *
 * The same table `clients/riders.ts` builds, read from the captain's side, and
 * deliberately not a second copy of the reasoning: a finished trip is dated by
 * `endedAt` and an open one by `startedAt`, every `isOpenTripStatus` state
 * contributes `trip-requested`, and `late` is a *finished* trip that arrived
 * eight minutes late. `types/trip.ts` sets out the whole table.
 *
 * It is duplicated as a `Record` rather than imported from `riders.ts` because
 * the two map into **different unions** — `RiderTimelineKind` and
 * `DriverTimelineKind` — and a shared constant would have to be typed as the
 * intersection, which is the string literals with neither union's guarantee.
 * The union memberships are what make an unhandled status a compile error on
 * both sides.
 */
type TripEventKind = Extract<DriverTimelineKind, `trip-${string}`>

const DRIVER_TRIP_EVENT: Record<
  Trip['status'],
  { kind: TripEventKind; dateBy: 'started' | 'ended' }
> = {
  requested: { kind: 'trip-requested', dateBy: 'started' },
  assigned: { kind: 'trip-requested', dateBy: 'started' },
  'en-route': { kind: 'trip-requested', dateBy: 'started' },
  'in-trip': { kind: 'trip-requested', dateBy: 'started' },
  done: { kind: 'trip-completed', dateBy: 'ended' },
  /* Completed, and overdue. Dated by its end like any other finished trip —
     `TRP-7742.endedAt` being `null` is the fixture bug named in `types/trip.ts`,
     and it is `DRV-0103`'s trip, so this captain's timeline is where it shows.
     The `?? startedAt` fallback below covers it. */
  late: { kind: 'trip-completed', dateBy: 'ended' },
  cancelled: { kind: 'trip-cancelled', dateBy: 'ended' },
  'no-show': { kind: 'trip-no-show', dateBy: 'ended' },
}

/**
 * The four arms whose detail is `{ riderName }`.
 *
 * The assertion is on the **`kind` field only**, and it is there because
 * `DriverTimelineEvent` is a union of seven arms while `kind` here is a
 * four-member union — TypeScript will not assign one object to a union without
 * a single discriminant. `detail` is annotated on its own line above it, so the
 * thing this file exists to guarantee is still checked: drop `riderName` and
 * this does not compile.
 */
function tripEvent(kind: TripEventKind, trip: Trip, at: IsoDateTime): DriverTimelineEvent {
  /* `riderName` is non-null on `Trip`, so this detail cannot be short a
     placeholder. The route is not carried — `types/driver.ts` says why. */
  const detail: { riderName: string } = { riderName: trip.riderName }
  return {
    id: `${kind}|${trip.id}`,
    at,
    kind,
    recordId: trip.id,
    recordType: 'trip',
    detail,
  } as DriverTimelineEvent
}

const driverTimelineShape: QueryShape<DriverTimelineEvent> = {
  searchable: [(e) => e.recordId ?? '', (e) => e.kind],
  sortable: { at: (e) => e.at, kind: (e) => e.kind },
  filterable: { at: (e) => e.at, kind: (e) => e.kind, recordId: (e) => e.recordId },
  facetable: ['kind'],
}

function buildDriverTimeline(driver: Driver): DriverTimelineEvent[] {
  const events: DriverTimelineEvent[] = []

  /* ── registration ──
     Dated by `joinedAt`, which is the field the header prints, so the timeline
     and the header can never state two different join dates. No `location`:
     `types/driver.ts` says why, and the short version is `DRV-0203`. */
  events.push({
    id: `account-registered|${driver.id}`,
    at: toInstant(driver.joinedAt)!,
    kind: 'account-registered',
    recordId: null,
    recordType: null,
    detail: { tier: driver.tier, vehicleClass: driver.vehicleClass },
  })

  /* ── trips ──
     Read by `driverId`, **not** through `Driver.tripIds`. The link array is
     three ids on `DRV-0101` while nineteen trips name the captain, and it is
     empty on `DRV-0106` beside 145 lifetime trips — the seeded contradiction at
     `:2671` that `fixtures/drivers.ts` preserves on purpose. A timeline built
     from the array would be three events long on the record both profile
     surfaces are drawn against. */
  for (const trip of allTripFixtures.filter((t) => t.driverId === driver.id)) {
    const { kind, dateBy } = DRIVER_TRIP_EVENT[trip.status]
    /* An `ended` event on a trip that never ended falls back to its start
       rather than being dropped: a cancelled trip with no `endedAt` is still an
       event, and dropping it would silently shorten the history. */
    events.push(tripEvent(kind, trip, dateBy === 'ended' ? (trip.endedAt ?? trip.startedAt) : trip.startedAt))
  }

  /* ── compliance ──
     Only documents that have **already lapsed**. An expiry in the future has
     not happened, and a history that lists it is not a history. */
  const compliance = complianceFixtures.find((c) => c.driverId === driver.id)
  for (const doc of compliance?.docs ?? []) {
    if (doc.state !== 'expired') continue
    events.push({
      id: `document-expired|${driver.id}|${doc.type}`,
      at: toInstant(doc.expiresOn)!,
      kind: 'document-expired',
      recordId: null,
      recordType: null,
      detail: { docType: doc.type },
    })
  }

  /* ── banking ──
     `DRV-0104` is the only captain with a change on file (`:2653`), which is
     why the card exists and why exactly one record exercises it. */
  for (const change of driver.bankHistory) {
    events.push({
      id: `bank-account-changed|${driver.id}|${change.replacedAt}`,
      at: toInstant(change.replacedAt)!,
      kind: 'bank-account-changed',
      recordId: null,
      recordType: null,
      detail: {
        fromBank: change.bankName,
        toBank: driver.bank.bankName,
        reason: change.reason,
      },
    })
  }

  /* Newest first, `id` as the tie-break so two events on the same day — a
     document that lapsed and a trip driven that morning — cannot swap places
     between two renders of the same data. */
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id))
}

/**
 * GET /api/v1/drivers/:id/timeline
 *   params: page · pageSize · sort · filter (kind, at)
 *   -> Paginated<DriverTimelineEvent> — newest first
 *   404 when the captain does not exist
 *
 * The dated history both profile surfaces draw. **Server-derived across three
 * resources** — the account, its trips and its compliance file, plus the bank
 * changes on the record — because a side sheet and a full page merging those
 * each is the "two screens, two answers" defect, and because same-day ordering
 * has more than one plausible answer and must have exactly one.
 *
 * Each event is `{ at, kind, recordId, recordType, detail }` and **never a
 * rendered sentence**: `kind` picks the string, `detail` fills its
 * placeholders, `recordId` + `recordType` are what the row links to in the
 * profile overlay.
 *
 * **`detail` is typed per `kind` and has no optional key on any arm**, which is
 * the one structural difference from `GET /riders/:id/timeline`.
 * `interpolate` throws on an omitted parameter, so an optional placeholder is a
 * crash waiting for the first record that lacks it; here a builder that omits
 * one does not compile. `types/driver.ts` sets out what each arm carries and
 * what it refuses to carry.
 *
 * **Money is deliberately absent** — see `GET /drivers/:id/movements`. So are
 * complaints, disputes, incidents and fairness cases: those are support records
 * and they are `GET /drivers/:id/support`. The timeline is the record's own
 * lifecycle, on both profiles, and that rule is worth more than a longer list.
 *
 * Paginated because a captain with 412 trips has 412 events and the shape must
 * survive that. The profile asks for the first page.
 */
export async function getDriverTimeline(
  driverId: string,
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<DriverTimelineEvent>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<DriverTimelineEvent>>(
      `/drivers/${driverId}/timeline`,
      { ...params },
      { signal },
    )
  }
  return mock(DRIVER_OPERATIONS.timeline, signal, () => {
    const driver = allDriverFixtures.find((d) => d.id === driverId)
    if (!driver) throw notFound('captain', driverId)
    return runQuery(buildDriverTimeline(driver), params, driverTimelineShape)
  })
}

/* ───────────────────────────── the money list ───────────────────────────── */

/** The subject ledger behind each `DriverMovementSource` that has one. */
const MOVEMENT_ACCOUNT = {
  payable: 'liability.driver',
  receivable: 'ar.driver',
} as const

/**
 * GET /api/v1/drivers/:id/movements
 *   -> DriverMoneyMovements
 *   404 when the captain does not exist
 *
 * **One list, two ledgers and two off-ledger sources — and the field that stops
 * it lying.**
 *
 * A rider's money is a wallet balance and some card money. A captain's is not
 * that with the sign flipped. It is *what Eyvar owes them* (`liability.driver`),
 * *what they owe Eyvar* (`ar.driver`), *what is held against undelivered plan
 * trips* (escrow) and *what has been sent and has not landed* (a payout in
 * flight). Four sources, five figures, one list, and `movement.countsToward`
 * naming which of the two balances each row is actually inside.
 *
 * ```
 * DRV-0101:  +640.00  +12.60                    →  652.60   payable  (2 settled liability.driver rows)
 *             +3.15   +20.00                    →   23.15   cash debt (2 settled ar.driver rows, debit-positive)
 *            +69.20  (2 held escrow rows)       →  138.40   held, and in neither
 *           −640.00  (PAY-W640, pending)        →  640.00   in flight, and in neither
 *
 *            a captain-relative signed sum of all seven = +127.85 — the balance of nothing
 * ```
 *
 * ## What is NOT in the list, and why each one is out
 *
 * **Inbound payments, even the ones that name this captain.** `Payment` carries
 * `captainId` on a fare, and `types/payment.ts` says exactly what it means:
 * *"the captain being paid, **or the captain who drove the trip that was paid
 * for**"*. `DRV-0101` is named on eighteen inbound payments totalling 632.87 —
 * money **riders** paid, of which the captain sees a commissioned share through
 * an earnings accrual. Listing them would show a captain receiving 86.50 for a
 * plan charge they were paid 69.20 of. A denormalised join key is not
 * ownership.
 *
 * **A settled or reversed outbound payout.** The ledger is the record: when a
 * payout moves, `payCaptain` writes the `liability.driver` debit, and that
 * posting is already in the list. `PAY-W820` names its posting outright
 * (`postingId: 'PAY-0102-4'`) — the rider's `PAY-6110`/`WTX-0003` pair in a
 * captain's costume — and `PAY-W900` does not, which is why the rule is *"the
 * posting always wins"* rather than *"de-dup on `postingId`"*. On the one rule
 * the two records for `DRV-0104` cannot double-count; on the other they would,
 * to 1,355.00 against 900.00 of movement.
 *
 * **A pending payout is the exception, and it is the whole reason this source
 * exists.** A pending leg produces no GL line (AC-312), so the ledger *cannot*
 * hold it. `PAY-W640` is 640.00 initiated at 06:00 on 25 June and still
 * pending: it is not in the payable, it is not a posting, and an operator
 * reading this captain's money has to see it. `payoutInFlightHalalas` is
 * therefore exactly the sum of the listed `payout` rows — where the rider's
 * `heldHalalas` has to be summed over `payments` rather than over the rows,
 * because its de-dup drops rows that are still held.
 *
 * **A released escrow hold.** Same rule as the payout: releasing posts a
 * `liability.driver` credit (AC-364, `JE-00026`), so the posting is the
 * movement. Only `held` rows are listed, and they carry `countsToward: null`
 * because the money is not payable until the trips are delivered.
 *
 * **A deduction.** Applying one posts a `liability.driver` debit (AC-371), so
 * again the posting is the movement. A *pending* deduction has moved nothing
 * and is reported as a figure rather than a row.
 *
 * ## Where it is read from
 *
 * Postings through `allLedgerPostings()`, escrow through `escrowHoldRows()` and
 * deductions through `deductionRows()` — the **live** collections, not the
 * fixture arrays. So a payout, an escrow release or a deduction committed in
 * the session moves this captain's profile immediately, which is what makes the
 * error and success states reachable without a reload. `clients/riders.ts`
 * reads the wallet the same way and for the same reason.
 *
 * Amounts are positive integers with a `direction`, and **nothing is flipped**:
 * both subject ledgers are captain-scoped, so each posting's own direction
 * already reads as *"did this captain's position improve"*. `types/driver.ts`
 * has the four-line table.
 */
export async function getDriverMoneyMovements(
  driverId: string,
  signal?: AbortSignal,
): Promise<DriverMoneyMovements> {
  if (DATA_SOURCE === 'http') {
    return http.get<DriverMoneyMovements>(`/drivers/${driverId}/movements`, undefined, { signal })
  }
  return mock(DRIVER_OPERATIONS.movements, signal, () => {
    if (!allDriverFixtures.some((d) => d.id === driverId)) throw notFound('captain', driverId)

    const postings = allLedgerPostings()

    const ledgerRows = (source: 'payable' | 'receivable'): DriverMoneyMovement[] =>
      postings
        .filter((p) => p.subjectAccount === MOVEMENT_ACCOUNT[source] && p.subjectId === driverId)
        .map((p) => ({
          id: p.id,
          source,
          at: p.postedAt,
          label: p.description,
          state: p.settlement,
          direction: p.direction,
          amountHalalas: p.amountHalalas,
          /* **Settled rows only.** A pending posting is a movement and is still
             outside the balance (AC-312) — `subjectClosingBalance` reads the
             last *settled* row's persisted balance for the same reason. */
          countsToward: isPendingSettlement(p.settlement)
            ? null
            : source === 'payable'
              ? ('payable' as const)
              : ('cash-debt' as const),
          paymentId: null,
          escrowId: null,
          balanceAfterHalalas: p.balanceAfterHalalas,
        }))

    /* Held holds only. A released one is a `liability.driver` credit posting and
       is already in the list above; listing both would show the same money
       twice where the posting exists, and money that arrived where it did not. */
    const held = escrowHoldRows().filter((e) => e.captainId === driverId && e.settlement === 'held')
    const escrowRows: DriverMoneyMovement[] = held.map((e) => ({
      id: e.id,
      source: 'escrow' as const,
      at: e.heldSince,
      /* An existing key with an existing parameter. Nothing is minted here. */
      label: { key: 'fin.posting.escrowHeld', params: { subscriptionId: e.subscriptionId } },
      state: e.settlement,
      /* Money accruing to the captain. It is not theirs until the plan is
         delivered, which is what `countsToward: null` says. */
      direction: 'credit' as const,
      amountHalalas: e.amountHalalas,
      countsToward: null,
      paymentId: null,
      escrowId: e.id,
      /* Not on a captain-scoped ledger, so there is no running balance to give. */
      balanceAfterHalalas: null,
    }))

    const inFlight = paymentFixtures.filter(
      (p) =>
        p.captainId === driverId && p.direction === 'outbound' && isPendingSettlement(p.settlement),
    )
    const payoutRows: DriverMoneyMovement[] = inFlight.map((p) => ({
      id: p.id,
      source: 'payout' as const,
      at: p.initiatedAt,
      /* `profile.paymentKind.captain-payout` — the existing vocabulary, the one
         `clients/riders.ts` already uses for the other three kinds. */
      label: { key: `profile.paymentKind.${p.kind}` },
      state: p.settlement,
      /* A payout reduces what Eyvar owes them, so the captain's *position*
         falls even as cash reaches them — the same convention the settled
         payout's `liability.driver` debit uses, so the row before and the row
         after a settlement read alike. */
      direction: 'debit' as const,
      amountHalalas: p.amountHalalas,
      countsToward: null,
      paymentId: p.id,
      escrowId: null,
      balanceAfterHalalas: null,
    }))

    const movements = [
      ...ledgerRows('payable'),
      ...ledgerRows('receivable'),
      ...escrowRows,
      ...payoutRows,
    ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id))

    return {
      driverId,
      /* Read from the ledger, never re-summed and never copied off
         `CaptainPayout` — AC-311 is explicit that the closing balance is the
         last settled row's persisted `balanceAfterHalalas`, and
         `clients/payouts.ts` derives the payouts index from the same call. Two
         surfaces, one number, structurally. */
      payableHalalas: subjectClosingBalance('liability.driver', driverId),
      cashDebtHalalas: subjectClosingBalance('ar.driver', driverId),
      escrowHeldHalalas: held.reduce((sum, e) => sum + e.amountHalalas, 0),
      payoutInFlightHalalas: inFlight.reduce((sum, p) => sum + p.amountHalalas, 0),
      pendingDeductionsHalalas: deductionRows()
        .filter((d) => d.captainId === driverId && d.status === 'pending')
        .reduce((sum, d) => sum + d.amountHalalas, 0),
      movements,
      computedAt: EYVAR_NOW,
    }
  })
}

/* ────────────────────── what else references this captain ───────────────── */

/** `{ total, open }` from one array and one open-predicate. Kept boring on purpose. */
function count<T>(rows: readonly T[], isOpen: (row: T) => boolean): RelatedCount {
  return { total: rows.length, open: rows.filter(isOpen).length }
}

/**
 * GET /api/v1/drivers/:id/support
 *   -> DriverSupportPresence
 *   404 when the captain does not exist
 *
 * **Does anything reference this captain, and is any of it still open.**
 *
 * One read rather than nine, for the reason `components/profile/record.ts`
 * gives about the record itself — nine clients to render one paragraph is nine
 * loading states and nine error states for a sentence. A card that wants the
 * rows still calls that resource's own client; this answers *"is there anything
 * there"*.
 *
 * **`Driver.openComplaints` cannot answer it.** It is one number counting one
 * collection, and `types/complaint.ts` already calls it *"a count with nothing
 * behind it"*. `DRV-0101` reads `openComplaints: 1` while carrying three
 * disputes, eight safety incidents, six fairness cases, six cash reports, seven
 * deductions, two lost-and-found searches and a Contact Centre thread. A
 * profile that composed *"nothing else references this captain"* from that
 * field would be wrong about nine things at once — which is precisely the
 * failure `RiderSupportPresence` was written after.
 *
 * `{ total, open }` and not a boolean: **`{total: 7, open: 0}` and
 * `{total: 0, open: 0}` are different answers to "should I look here"**, and a
 * single count cannot say which. `DRV-0101`'s deductions are exactly the first
 * case — seven raised, all decided.
 *
 * Each `open` predicate is the resource's own definition, never a second one
 * invented here: `isOpenComplaint` is imported from `types/complaint.ts`, and
 * every other one is written against that type's status union with the terminal
 * values named. `types/driver.ts` carries the table of what is counted, what is
 * counted from **both** sides, and the two collections a captain has that a
 * rider does not.
 */
export async function getDriverSupportPresence(
  driverId: string,
  signal?: AbortSignal,
): Promise<DriverSupportPresence> {
  if (DATA_SOURCE === 'http') {
    return http.get<DriverSupportPresence>(`/drivers/${driverId}/support`, undefined, { signal })
  }
  return mock(DRIVER_OPERATIONS.support, signal, () => {
    if (!allDriverFixtures.some((d) => d.id === driverId)) throw notFound('captain', driverId)

    return {
      driverId,
      complaints: count(
        complaintFixtures.filter((c) => c.driverId === driverId),
        (c) => isOpenComplaint(c.status),
      ),
      conversations: count(
        conversationFixtures.filter((c) => c.entityType === 'driver' && c.entityId === driverId),
        (c) => c.status !== 'closed',
      ),
      /* Both sides, exactly as on the rider's: a captain can file a claim and
         can be the party a rider's claim is against, and the profile's question
         — *"is this record caught up in a dispute"* — does not care which end. */
      disputes: count(
        disputeFixtures.filter((d) => d.claimantId === driverId || d.againstId === driverId),
        (d) => d.status !== 'resolved',
      ),
      /* Items left in **this captain's vehicle**. `LostFoundItem.driverId` is
         nullable precisely because a rider who cannot identify the trip has no
         captain to ask — so this is the captain's own half of that record. */
      lostAndFound: count(
        lostFoundFixtures.filter((l) => l.driverId === driverId),
        (l) => l.status !== 'returned',
      ),
      fairnessCases: count(
        fairnessCaseFixtures.filter((c) => c.driverId === driverId),
        (c) => c.status === 'open',
      ),
      tickets: count(
        ticketFixtures.filter((t) => t.entityId === driverId),
        (t) => t.status !== 'resolved' && t.status !== 'closed',
      ),
      /* Raised against them **or** by them. `INC-013` in the legacy seed is a
         captain-reported accident with no counterparty at all (`againstId:
         null`), and it is still an incident on that captain's record. */
      safetyIncidents: count(
        safetyIncidentFixtures.filter(
          (i) => i.againstId === driverId || i.reporterId === driverId,
        ),
        (i) => i.status !== 'closed',
      ),
      /* `escalated` counts as open: it has left the queue's normal path and
         still needs somebody, which is the whole distinction from `resolved`. */
      cashReports: count(
        cashReportFixtures.filter((c) => c.captainId === driverId),
        (c) => c.status !== 'resolved',
      ),
      /* Read live, so a deduction applied or waived in the session moves the
         count. `applied` and `waived` are both decided; only `pending` is open. */
      deductions: count(
        deductionRows().filter((d) => d.captainId === driverId),
        (d) => d.status === 'pending',
      ),
      computedAt: EYVAR_NOW,
    }
  })
}

/* ────────────────────────────── Compliance ─────────────────────────────── */

const complianceShape: QueryShape<DriverCompliance> = {
  searchable: [(c) => c.driverName, (c) => c.driverId, (c) => c.vehicle],
  sortable: {
    driverName: (c) => c.driverName,
    worstState: (c) => c.worstState,
    /* Soonest expiry across the file — what an operator actually sorts by. */
    soonestExpiry: (c) => c.docs.map((d) => d.expiresOn).sort()[0] ?? null,
  },
  filterable: {
    driverId: (c) => c.driverId,
    driverName: (c) => c.driverName,
    vehicle: (c) => c.vehicle,
    worstState: (c) => c.worstState,
    suspended: (c) => c.suspendedReason !== null,
    /**
     * Soonest expiry across the file — the field a `date-range` filter uses to
     * answer "whose documents lapse this month". `null` for a captain with no
     * documents, which sorts and filters as "not set" rather than as "never".
     */
    soonestExpiry: (c) => toInstant(c.docs.map((d) => d.expiresOn).sort()[0] ?? null),
    /**
     * How many documents are on file at all.
     *
     * **This is the answer to finding F-5.** Compliance's old hand-built filter
     * offered `No file` — `worstState === null` — and `toFilterSpec` cannot
     * express "this field IS null", because `select` reserves `null` for `Any`.
     * A **number-range** filter of `0 … 0` on this field selects exactly the
     * same captains, using a control that already exists. It is a workaround,
     * not a reason to stop fixing `isNull`.
     */
    docCount: (c) => c.docs.length,
    expiredCount: (c) => c.docs.filter((d) => d.state === 'expired').length,
    /**
     * **How many of this captain's expiry dates nobody ever read off a
     * document** — `dateSource === 'auto-default'`, the one-year runway
     * `approveDriver` writes into a blank (`:11111`–`:11113`).
     *
     * A number-range filter of `1 …` is *"show me every captain whose file is
     * partly guesswork"*, which is a question Compliance cannot ask today at
     * all. Filterability is a property of the resource, not of the screen (see
     * the note on `driverShape`), so it is declared whether or not the first
     * screen offers the control.
     */
    unverifiedDateCount: (c) => c.docs.filter((d) => d.dateSource === 'auto-default').length,
    /** How many documents have a scan on record. `0` with a non-zero `docCount` is a file of dates and nothing else. */
    fileCount: (c) => c.docs.filter((d) => d.file !== null).length,
  },
  facetable: ['worstState'],
  views: {
    compliance: () => true,
    /* The backlog view: anything not clean, including captains with no file. */
    'needs-attention': (c) => c.worstState !== 'valid',
  },
}

/**
 * GET /api/v1/compliance/drivers
 *   params: q · page · pageSize · sort · filter · view=compliance|needs-attention
 *   -> Paginated<DriverCompliance>
 *
 * `worstState` is `null` for a captain with **no documents on file** — a real
 * and common case (legacy `DB.driverDocs` covers five captains out of six).
 * `null` is not `valid`; the UI must not render it as compliant.
 *
 * Days-remaining is **not** returned. It depends on the clock; the UI computes
 * it from `expiresOn` against a clock it is passed (`mock/clock.ts`).
 *
 * Each `ComplianceDoc` carries its **provenance** — `dateSource`, `recordedAt`,
 * `recordedByUserId` / `recordedByUserName`, `previousExpiresOn` — and the
 * record of its uploaded scan, `file`, which is `null` when there is none and
 * **never carries a URL**. See `getDriverCompliance` for why the documents ride
 * on the compliance read rather than a route of their own, and
 * `types/driver.ts` for why there are no bytes.
 *
 * `dateSource: 'auto-default'` means **no human ever read that document** — the
 * approval filled a blank with a one-year runway (`:11111`). It is not a
 * cosmetic flag: such a date is a guess, and the row renders it in the same ink
 * as one read off paper.
 */
export async function listDriverCompliance(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<DriverCompliance>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<DriverCompliance>>('/compliance/drivers', { ...params }, { signal })
  }
  return mock(DRIVER_OPERATIONS.complianceList, signal, () =>
    runQuery(complianceFixtures, params, complianceShape),
  )
}

/**
 * GET /api/v1/compliance/drivers/:driverId
 *   -> DriverCompliance
 *   404 when the captain has no compliance record
 *
 * **The captain's whole compliance file, documents included — there is no
 * per-document read and there should not be one.**
 *
 * A document is now more than a row: it carries where its expiry came from
 * (`dateSource`), who wrote it and when (`recordedAt` / `recordedByUser*`),
 * what it replaced (`previousExpiresOn`) and the record of the uploaded scan
 * (`file`). All of it arrives here, in the read the profile already makes.
 *
 * Three reasons it is not `/compliance/drivers/:driverId/documents/:type`:
 *
 *   1. **Five documents, ten small fields each.** The whole addition is under a
 *      kilobyte per captain. A second round-trip per opened document would cost
 *      more than the payload it saves, on a surface an operator opens and closes
 *      five times in a row.
 *   2. **Nothing here is separately permitted.** `view_operations` reaches the
 *      Compliance record; no permission distinguishes the row from the document
 *      behind it. The moment one does — and it will, for the bytes — that is a
 *      different route on a different resource, not a split of this one.
 *   3. **A viewer that re-fetches can disagree with the list it was opened
 *      from.** One read, one answer, is the rule this seam exists to keep.
 *
 * **The scan itself is not here and is not anywhere.** `ComplianceDocFile`
 * carries the record row — name, type, size, uploaded-at, uploaded-by — and no
 * URL, because no object store exists and legacy's own viewer is a striped
 * rectangle captioned *"Simulated scan preview"* (`:10893`). When the bytes
 * exist they are a **streaming read of their own**, keyed by `ComplianceDoc.id`
 * and permitted separately; it is one route and one client function to add, and
 * declaring it now would ship a field every screen has to special-case as
 * permanently null. `file: null` — no scan on record — is the common case and
 * the honest one.
 */
export async function getDriverCompliance(
  driverId: string,
  signal?: AbortSignal,
): Promise<DriverCompliance> {
  if (DATA_SOURCE === 'http') {
    return http.get<DriverCompliance>(`/compliance/drivers/${driverId}`, undefined, { signal })
  }
  return mock(DRIVER_OPERATIONS.complianceGet, signal, () => {
    const row = complianceFixtures.find((c) => c.driverId === driverId)
    if (!row) throw notFound('compliance record', driverId)
    return row
  })
}

/* ──────────────── the scan behind a compliance document ─────────────── */

/**
 * **The permissions a compliance scan is read under**, and the honest wiring of
 * a gate the permission model does not yet have a key for.
 *
 * `types/driver.ts` calls the byte read *"separately-permitted"*, and
 * `getDriverCompliance` says why nothing else on this resource is: *"no
 * permission distinguishes the row from the document behind it. The moment one
 * does — and it will, for the bytes — that is a different route on a different
 * resource"*. This is that route, so the gate has to be narrower than the
 * list's. Two existing keys, and no new one:
 *
 *   `view_operations`  reaches the compliance record at all. `routeTable.ts`
 *                      gates Operations › People on it, so an operator without
 *                      it never sees the row this document hangs off.
 *   `view_profiles`    reaches the **person**. D17's 360° layer key, which
 *                      `types/rider.ts:472` already uses for the one comparable
 *                      field in the product — *"Saudi national id. PII — gated
 *                      on `view_profiles`"*. A driving licence scan carries a
 *                      photograph, a date of birth and a national id number; if
 *                      the number is PII behind that key, a picture of the card
 *                      it is printed on cannot be less.
 *
 * **The gap, stated rather than papered over.** There is no
 * `view_identity_documents` key and this file does not mint one — the twenty
 * keys are D17's and a data client inventing a twenty-first is exactly the
 * free-floating permission D17 exists to stop. What that costs is real and
 * measurable: **every one of the six roles holds both keys**
 * (`types/session.ts:94`), so this pair refuses nobody by role baseline, and the
 * only seeded operator it stops is `USR-2` (Finance), who fails on
 * `view_operations` — the *record* half, not the scan half. The narrower half of
 * the gate therefore has no seeded refusal, and QA reaches it with
 * `?mockFail=compliance.documentFile:403`.
 *
 * Raised to product-owner as the question it is: *should reading a captain's
 * identity documents require a key that reading their compliance dates does
 * not?* If yes, this constant is the one line that changes.
 */
export const COMPLIANCE_SCAN_PERMISSIONS: readonly PermissionKey[] = [
  'view_operations',
  'view_profiles',
]

/**
 * GET /api/v1/compliance/documents/:documentId/file
 *   -> the bytes, with Content-Type: image/jpeg | image/png | application/pdf
 *   204 when the document exists and holds no file — NOT an error, and the common case
 *   403 when the operator lacks view_operations or view_profiles
 *   404 when no document has that id
 *   502 when the store returns a media type this app cannot decode
 *
 * **The streaming read `ComplianceDocFile` said would exist one day.** That
 * type refuses `url`, `href`, `thumbnailUrl` and `previewUrl` on the record and
 * argues it in full; nothing here weakens that. **The record still carries no
 * URL.** The bytes are addressed by `ComplianceDoc.id`, which was already on
 * the record because *"a viewer needs something to be addressed by"*.
 *
 * A **separate route on a separate resource**, not a field and not part of
 * `GET /compliance/drivers/:driverId`, for the three reasons that read lists
 * plus the one this adds: bytes are megabytes and a compliance record is under
 * a kilobyte. Folding them together would make opening a captain's file
 * download five scans nobody asked for.
 *
 * ## The four outcomes, and the two that are easiest to confuse
 *
 * `ComplianceDocumentFileRead` carries the two that are not failures.
 * `outcome: 'no-file-on-record'` is **187 of the 255 seeded documents** and is
 * not a 404: *the document has no scan* and *there is no such document* are
 * different sentences and only one of them is somebody's bug. On the wire that
 * is a 204, which is why this endpoint cannot be modelled as "returns bytes or
 * fails".
 *
 * The other two are both rejections and both `ApiError`, kept apart by `kind`:
 * `forbidden` (403, `retryable: false`) is *you may not see this*, anything
 * else is *we could not fetch it*. `compliance.test.ts` §8 makes the argument
 * about a different field in the same words — *"those are opposite diagnoses
 * and an operator acts differently on each"* — and an `ErrorState` that offered
 * `Try again` on a refusal would invite an operator to retry their way past a
 * permission.
 *
 * ## What the mock serves, and why it is safe to look at
 *
 * Real, decodable bytes in all three media types, composed per document by
 * `fixtures/complianceScans.ts` and **never a picture of a document**: every one
 * renders `NOT A REAL DOCUMENT` above the type, the captain and the document id.
 * The ruling's objection to a placeholder is a training argument — *"an operator
 * who is taught that the viewer shows a licence will read the next placeholder
 * as a licence too"* — so the sample is given no licence shape to be mistaken
 * for. That file argues the trade-off at length; the one consequence a caller
 * must know is that **`bytes.byteLength` is nothing like `file.sizeBytes`** in
 * mock mode. The record's size is a claim about a real upload and is what the
 * meta line prints; these bytes are a sample of the pipeline. Only against a
 * real store are the two the same file.
 */
export async function getComplianceDocumentFile(
  documentId: string,
  signal?: AbortSignal,
): Promise<ComplianceDocumentFileRead> {
  if (DATA_SOURCE === 'http') {
    const response = await http.bytes(
      `/compliance/documents/${encodeURIComponent(documentId)}/file`,
      undefined,
      { signal },
    )
    /* 204 — the record holds no object. `requestBytes` resolves rather than
       throws for exactly this case; turning it into the outcome is this
       client's job, because only this client knows what the absence means. */
    if (response === null) return { outcome: 'no-file-on-record', documentId }
    if (!isServableMimeType(response.mimeType)) {
      /* A media type this app cannot render is a failed read — not a refusal and
         not an absence. Narrowing here rather than widening the type keeps the
         viewer's switch exhaustive: a `string` would push a fourth,
         unhandleable branch onto every caller for a case the store should never
         produce. */
      throw new ApiError({
        status: 502,
        kind: 'server',
        code: 'unsupported_media_type',
        message: `The store returned ${response.mimeType || 'no media type'} for ${documentId}`,
        retryable: false,
      })
    }
    return { outcome: 'bytes', documentId, mimeType: response.mimeType, bytes: response.bytes }
  }

  return mock(DRIVER_OPERATIONS.complianceDocumentFile, signal, () => {
    /* Permission first, and before the lookup. A refusal that only fired for
       documents that exist would tell an operator who may not read scans which
       ids are real. */
    requireCompliancePermissions()

    for (const record of complianceFixtures) {
      const doc = record.docs.find((d) => d.id === documentId)
      if (doc === undefined) continue
      if (doc.file === null) return { outcome: 'no-file-on-record', documentId }
      return {
        outcome: 'bytes',
        documentId,
        mimeType: doc.file.mimeType,
        bytes: complianceScanBytes(record.driverId, doc),
      }
    }
    throw notFound('compliance document', documentId)
  })
}

/** The three the viewer can decode. Narrows a transport `string` onto the record's union. */
function isServableMimeType(value: string): value is ComplianceDocFile['mimeType'] {
  return value === 'image/jpeg' || value === 'image/png' || value === 'application/pdf'
}

/**
 * Throws the 403 an object store would, naming the key that is missing.
 *
 * The key travels in `details` rather than only in the message because §6.3's
 * refusal sentence interpolates it — *You need the \"{permission}\" permission* —
 * and parsing a key back out of an English message is how a refusal becomes
 * untranslatable.
 */
function requireCompliancePermissions(): void {
  const held = new Set(currentMockPermissions())
  const missing = COMPLIANCE_SCAN_PERMISSIONS.filter((key) => !held.has(key))
  if (missing.length === 0) return
  throw new ApiError({
    status: 403,
    kind: 'forbidden',
    code: 'permission_required',
    message: `Reading a compliance scan needs the "${missing.join('" and "')}" permission`,
    details: missing.map((key) => ({ field: 'permission', code: 'required', message: key })),
    retryable: false,
  })
}

/**
 * GET /api/v1/drivers/facets
 *   params: view
 *   -> Facets — field name -> [{ value, count }], count-descending
 *
 * The option set for every `select` / `multi-select` filter over captains,
 * **derived from the data**. A screen that hard-codes `Riyadh` / `Jeddah` is
 * wrong the first time a third city is seeded (finding **F-6**). Scoped by
 * `view` only, so narrowing one filter never removes the options you would
 * need to widen it again.
 *
 * Facetable fields are declared on the shape's `facetable` list above.
 */
export async function getDriverFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/drivers/facets', { view: view ?? undefined }, { signal })
  }
  return mock(DRIVER_OPERATIONS.facets, signal, () => computeFacets(allDriverFixtures, driverShape, view))
}

/**
 * GET /api/v1/compliance/drivers/facets
 *   params: view
 *   -> Facets — field name -> [{ value, count }], count-descending
 *
 * The option set for every `select` / `multi-select` filter over compliance records,
 * **derived from the data**. A screen that hard-codes `Riyadh` / `Jeddah` is
 * wrong the first time a third city is seeded (finding **F-6**). Scoped by
 * `view` only, so narrowing one filter never removes the options you would
 * need to widen it again.
 *
 * Facetable fields are declared on the shape's `facetable` list above.
 */
export async function getDriverComplianceFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/compliance/drivers/facets', { view: view ?? undefined }, { signal })
  }
  return mock(DRIVER_OPERATIONS.complianceFacets, signal, () => computeFacets(complianceFixtures, complianceShape, view))
}
