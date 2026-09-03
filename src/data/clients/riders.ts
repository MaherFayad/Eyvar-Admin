/**
 * Riders and new riders — Operations › People, view *Riders*.
 *
 * Two resources: `Rider` (the full record) and `NewRider` (last-24-h
 * registrations, a different shape, `DB.newRiders`). Separate endpoints because
 * they are separate queries with separate cardinality.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import type { Facets, Paginated, QueryParams } from '../types/common'
import { isOpenComplaint } from '../types/complaint'
import { isPendingSettlement } from '../types/ledger'
import type {
  ChurnRisk,
  NewRider,
  Rider,
  RiderMoneyMovement,
  RiderMoneyMovements,
  RiderRelatedCount,
  RiderStatus,
  RiderSupportPresence,
  RiderTimelineDetail,
  RiderTimelineEvent,
  RiderTimelineKind,
} from '../types/rider'
import type { Trip } from '../types/trip'
import { http } from './http'
/* The wallet ledger, from the module that owns it. `clients/ledger.ts` does not
   import this file, so there is no cycle — and reading postings through the
   ledger client rather than the fixture keeps session adjustments
   (`adjustWallet`) inside the rider's movement list for free. */
import { allLedgerPostings } from './ledger'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let newRiderFixtures!: Fixtures['newRiderFixtures']
let riderFixtures!: Fixtures['riderFixtures']
let allSubscriptionFixtures!: Fixtures['allSubscriptionFixtures']
let allTripFixtures!: Fixtures['allTripFixtures']
let paymentFixtures!: Fixtures['paymentFixtures']
/* The six collections `getRiderSupportPresence` counts. Bound the same late
   way as the rest; see `mock/fixtures.ts` for why none of this is a static
   import. */
let complaintFixtures!: Fixtures['complaintFixtures']
let conversationFixtures!: Fixtures['conversationFixtures']
let disputeFixtures!: Fixtures['disputeFixtures']
let lostFoundFixtures!: Fixtures['lostFoundFixtures']
let fairnessCaseFixtures!: Fixtures['fairnessCaseFixtures']
let allRequestFixtures!: Fixtures['allRequestFixtures']
let ticketFixtures!: Fixtures['ticketFixtures']
onFixturesLoaded((f) => {
  newRiderFixtures = f.newRiderFixtures
  riderFixtures = f.riderFixtures
  allSubscriptionFixtures = f.allSubscriptionFixtures
  allTripFixtures = f.allTripFixtures
  paymentFixtures = f.paymentFixtures
  complaintFixtures = f.complaintFixtures
  conversationFixtures = f.conversationFixtures
  disputeFixtures = f.disputeFixtures
  lostFoundFixtures = f.lostFoundFixtures
  fairnessCaseFixtures = f.fairnessCaseFixtures
  allRequestFixtures = f.allRequestFixtures
  ticketFixtures = f.ticketFixtures
})

export const RIDER_OPERATIONS = {
  facets: 'riders.facets',
  list: 'riders.list',
  get: 'riders.get',
  listNew: 'riders.listNew',
  timeline: 'riders.timeline',
  movements: 'riders.movements',
  support: 'riders.support',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(RIDER_OPERATIONS))

export interface RiderQuery extends QueryParams {
  status?: RiderStatus
  churnRisk?: ChurnRisk
}

const riderShape: QueryShape<Rider> = {
  searchable: [(r) => r.name, (r) => r.id, (r) => r.phone, (r) => r.address],
  sortable: {
    name: (r) => r.name,
    rating: (r) => r.rating,
    totalTrips: (r) => r.totalTrips,
    lifetimeValueHalalas: (r) => r.lifetimeValueHalalas,
    walletBalanceHalalas: (r) => r.walletBalanceHalalas,
    renewalRatePercent: (r) => r.renewalRatePercent,
    joinedAt: (r) => r.joinedAt,
    lastTripAt: (r) => r.lastTripAt,
  },
  /* Declared for the resource, not for Operations › People — Rider Wallets,
     Growth and Contact Centre all query riders from other surfaces. Dates go
     through `toInstant`; see `mock/clock.ts`. */
  filterable: {
    /* identity — text */
    id: (r) => r.id,
    name: (r) => r.name,
    phone: (r) => r.phone,
    address: (r) => r.address,

    /* closed sets — options via `getRiderFacets` */
    status: (r) => r.status,
    tier: (r) => r.tier,
    churnRisk: (r) => r.churnRisk,
    city: (r) => r.city,
    gender: (r) => r.gender,
    appLanguage: (r) => r.appLanguage,
    driverGenderPreference: (r) => r.driverGenderPreference,
    corporateAccountId: (r) => r.corporateAccountId,

    /* booleans */
    hasPhoto: (r) => r.hasPhoto,

    /* numbers — number-range and money-range */
    rating: (r) => r.rating,
    walletBalanceHalalas: (r) => r.walletBalanceHalalas,
    totalTrips: (r) => r.totalTrips,
    lifetimeValueHalalas: (r) => r.lifetimeValueHalalas,
    renewalRatePercent: (r) => r.renewalRatePercent,
    quickRides: (r) => r.quickRides,

    /* dates */
    joinedAt: (r) => toInstant(r.joinedAt),
    lastTripAt: (r) => toInstant(r.lastTripAt),

    /* fraud signals — two seeded riders share `160.156.4.90` */
    lastIp: (r) => r.lastIp,
    ipLocation: (r) => r.ipLocation,
    device: (r) => r.device,
  },
  facetable: [
    'status',
    'tier',
    'churnRisk',
    'city',
    'gender',
    'appLanguage',
    'driverGenderPreference',
    'corporateAccountId',
  ],
  views: {
    riders: () => true,
    /* Reachable without hand-editing: the overdrawn-wallet backlog. */
    overdrawn: (r) => r.walletBalanceHalalas < 0,
  },
}

/**
 * GET /api/v1/riders
 *   params: q · status · churnRisk · page · pageSize · sort · filter · view=riders|overdrawn
 *   -> Paginated<Rider>
 *
 * Sortable: name · rating · totalTrips · lifetimeValueHalalas ·
 *           walletBalanceHalalas · renewalRatePercent · joinedAt · lastTripAt
 * Filterable: status · tier · churnRisk · city · corporateAccountId ·
 *             walletBalanceHalalas
 *
 * `status` and `churnRisk` are server-derived; legacy computes both at render
 * (`:6428`, `riderChurnRisk`). `walletBalanceHalalas` **may be negative** — what
 * the product does about that is an unanswered question, not a data error.
 */
export async function listRiders(
  params: RiderQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Rider>> {
  if (DATA_SOURCE === 'http') return http.get<Paginated<Rider>>('/riders', { ...params }, { signal })
  return mock(RIDER_OPERATIONS.list, signal, () => {
    const extra = [
      ...(params.status ? [{ field: 'status', op: 'eq' as const, value: params.status }] : []),
      ...(params.churnRisk ? [{ field: 'churnRisk', op: 'eq' as const, value: params.churnRisk }] : []),
    ]
    return runQuery(riderFixtures, { ...params, filters: [...(params.filters ?? []), ...extra] }, riderShape)
  })
}

/**
 * GET /api/v1/riders/:id
 *   -> Rider
 *
 * The 360° profile's header, money block, engagement block and identity block
 * are **this one read** — `churnReason` and `heldHalalas` are on the record for
 * that reason, and `types/rider.ts` gives it for each.
 */
export async function getRider(id: string, signal?: AbortSignal): Promise<Rider> {
  if (DATA_SOURCE === 'http') return http.get<Rider>(`/riders/${id}`, undefined, { signal })
  return mock(RIDER_OPERATIONS.get, signal, () => {
    const row = riderFixtures.find((r) => r.id === id)
    if (!row) throw notFound('rider', id)
    return row
  })
}

/* ───────────────────────── the record's history ─────────────────────────── */

/**
 * `TripStatus` → the timeline event that trip contributes, and **which of its
 * two timestamps dates it**.
 *
 * A finished trip is dated by `endedAt` and an open one by `startedAt`, which
 * for a `requested` trip is the moment it was requested (`TRP-9104`,
 * `2026-06-25T09:11`). Getting this backwards puts a trip that ended on the
 * 25th on the timeline at the time it was hailed, and the two can be days apart
 * on a subscription leg.
 *
 * **Every `isOpenTripStatus` state contributes `trip-requested`** — an open
 * trip has been requested and has not concluded, so the request is the only
 * event that has happened to it yet. `late` is **not** one of them: legacy's
 * `'Late +8'` is a finished trip that arrived eight minutes late, with a fare
 * and a settled payment (`:2677`). `types/trip.ts` sets out the whole table.
 */
const TRIP_EVENT: Record<Trip['status'], { kind: RiderTimelineKind; dateBy: 'started' | 'ended' }> = {
  requested: { kind: 'trip-requested', dateBy: 'started' },
  assigned: { kind: 'trip-requested', dateBy: 'started' },
  'en-route': { kind: 'trip-requested', dateBy: 'started' },
  'in-trip': { kind: 'trip-requested', dateBy: 'started' },
  done: { kind: 'trip-completed', dateBy: 'ended' },
  /* Completed, and eight minutes overdue. Dated by its end like any other
     finished trip — `TRP-7742.endedAt` being `null` is the fixture bug named
     in `types/trip.ts`, and the `?? startedAt` fallback below covers it. */
  late: { kind: 'trip-completed', dateBy: 'ended' },
  cancelled: { kind: 'trip-cancelled', dateBy: 'ended' },
  'no-show': { kind: 'trip-no-show', dateBy: 'ended' },
}

const timelineShape: QueryShape<RiderTimelineEvent> = {
  searchable: [(e) => e.recordId ?? '', (e) => e.kind],
  sortable: { at: (e) => e.at, kind: (e) => e.kind },
  filterable: { at: (e) => e.at, kind: (e) => e.kind, recordId: (e) => e.recordId },
  facetable: ['kind'],
}

function buildTimeline(rider: Rider): RiderTimelineEvent[] {
  const events: RiderTimelineEvent[] = []
  const event = (
    kind: RiderTimelineKind,
    at: string,
    recordId: string | null,
    recordType: RiderTimelineEvent['recordType'],
    detail: RiderTimelineDetail,
  ) => events.push({ id: `${kind}|${recordId ?? rider.id}`, at, kind, recordId, recordType, detail })

  /* ── registration ──
     Dated by `joinedAt`, which is the field the header prints, so the timeline
     and the header can never state two different join dates. The movement log
     supplies only the *place*; when it holds no registration row the key is
     omitted rather than filled with a guess from `city`. */
  const registered = rider.movementLog.find((m) => m.action === 'Account registered')
  event('account-registered', toInstant(rider.joinedAt)!, null, null, {
    ...(registered ? { location: registered.location } : {}),
    tier: rider.tier,
  })

  /* ── subscriptions ──
     Read by `riderId`, **not** through `Rider.subscriptionIds`. The link array
     is empty on `RDR-4002` while `SUB-2003` names them, and it is empty on
     purpose: `management.growth.dormantRiderShare` counts riders with no trip
     and no `subscriptionIds`, and `fixtures/metrics.ts` asserts the 8 % that
     count produces. Filling the array to make the profile work would move an
     asserted board tile. The contradiction is a finding, and the query is the
     way round it that does not corrupt a metric. */
  for (const sub of allSubscriptionFixtures.filter((s) => s.riderId === rider.id)) {
    const usage = { planName: sub.planName, tripsUsed: sub.tripsCompleted, tripsIncluded: sub.tripsIncluded }
    event('subscription-started', toInstant(sub.startedOn)!, sub.id, 'subscription', {
      planName: sub.planName,
      startedOn: sub.startedOn,
      endsOn: sub.endsOn,
    })
    if (sub.status === 'expired') {
      event('subscription-expired', toInstant(sub.endsOn)!, sub.id, 'subscription', usage)
    }
    if (sub.status === 'cancelled') {
      event('subscription-cancelled', sub.cancelledAt ?? toInstant(sub.endsOn)!, sub.id, 'subscription', usage)
    }
  }

  /* ── trips ── same reasoning: `riderId`, never `Rider.tripIds`. */
  for (const trip of allTripFixtures.filter((t) => t.riderId === rider.id)) {
    const { kind, dateBy } = TRIP_EVENT[trip.status]
    /* An `ended` event on a trip that never ended falls back to its start
       rather than being dropped: a cancelled trip with no `endedAt` is still an
       event, and dropping it would silently shorten the history. */
    const at = dateBy === 'ended' ? (trip.endedAt ?? trip.startedAt) : trip.startedAt
    /* `Trip.pickup` and `Trip.destination` are `string | null` — legacy stores
       the route as one pre-joined string and the two ends are absent on the
       rows it never split. The key is **omitted** rather than set to `null`, so
       the title's placeholder is missing rather than filled with the word
       `null`; `RiderTimelineDetail` is optional-keyed for exactly this. */
    event(kind, at, trip.id, 'trip', {
      ...(trip.pickup === null ? {} : { pickup: trip.pickup }),
      ...(trip.destination === null ? {} : { destination: trip.destination }),
      captainAssigned: trip.driverId !== null,
    })
  }

  /* Newest first, `id` as the tie-break so two events on the same day — a
     subscription that expired and a trip taken that morning — cannot swap
     places between two renders of the same data. */
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id))
}

/**
 * GET /api/v1/riders/:id/timeline
 *   params: page · pageSize · sort · filter (kind, at)
 *   -> Paginated<RiderTimelineEvent> — newest first
 *   404 when the rider does not exist
 *
 * The dated history both profile surfaces draw. **Server-derived across three
 * resources** — the account, its subscriptions and its trips — because a side
 * sheet and a full page merging those three each is the "two screens, two
 * answers" defect, and because same-day ordering has more than one plausible
 * answer and must have exactly one.
 *
 * Each event is `{ at, kind, recordId, detail }` and **never a rendered
 * sentence**: `kind` picks the string, `detail` fills its placeholders,
 * `recordId` + `recordType` are what the row links to in the profile overlay.
 * A pre-joined title would be untranslatable and would lose the link with it.
 *
 * **Money is deliberately absent** — see `GET /riders/:id/movements`. Top-ups
 * and fares are that list's; putting them here too makes `RDR-4002`'s four-event
 * history six, half of it repeating the card above it.
 *
 * Paginated because a rider with 412 trips has 412 events and the shape must
 * survive that. The profile asks for the first page.
 */
export async function getRiderTimeline(
  riderId: string,
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<RiderTimelineEvent>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<RiderTimelineEvent>>(
      `/riders/${riderId}/timeline`,
      { ...params },
      { signal },
    )
  }
  return mock(RIDER_OPERATIONS.timeline, signal, () => {
    const rider = riderFixtures.find((r) => r.id === riderId)
    if (!rider) throw notFound('rider', riderId)
    return runQuery(buildTimeline(rider), params, timelineShape)
  })
}

/* ───────────────────────────── the money list ───────────────────────────── */

/**
 * GET /api/v1/riders/:id/movements
 *   -> RiderMoneyMovements
 *   404 when the rider does not exist
 *
 * **One list, two ledgers, and the field that stops it lying.**
 *
 * The profile draws the rider's money as a single card — *"Quick ride fare ·
 * Held · −98.00"* beside *"Wallet top-up · Credit · +80.00"*. Those two rows
 * come from different places: a top-up is a `liability.wallet` posting, a
 * quick-ride fare is a `mada` capture that **never touched the wallet**. An
 * operator does not care, and should not have to.
 *
 * What that costs is one honest field. `movement.movesWalletBalance` is `true`
 * exactly on the rows that moved the wallet, and the rows that sum to
 * `walletBalanceHalalas` are exactly those. The list's own signed total is
 * **not** the balance and the envelope never claims it is:
 *
 * ```
 * RDR-4002:  +120.00  +80.00        →  200.00   the balance (2 settled wallet rows)
 *             −98.00  −64.00                    card money, never in the wallet
 *             signed sum of all four = +38.00 — which is not a balance of anything
 * ```
 *
 * `inWalletBalance` is **settled wallet rows only**, not `source === 'wallet'`:
 * an unsettled posting is a movement and is still outside the balance (AC-312).
 * `RDR-1041` is the case that proves the distinction — 140.00 of postings, a
 * 20.00 balance, and one authorised row for the difference.
 *
 * `heldHalalas` is the `98.00` the design labels *still held*: captured, frozen
 * for fraud review, and outside the balance by AC-312. It repeats
 * `Rider.heldHalalas` so a surface that has the record already does not need
 * this read to draw its money block, and `clients/riders.test.ts` asserts the
 * two agree.
 *
 * **A payment that names a wallet posting is not listed twice.** `PAY-6110`
 * carries `postingId: 'WTX-0003'` — one movement of money with a row on each
 * side. The posting wins (it carries the running balance) and takes the
 * payment's id onto `paymentId`.
 *
 * Amounts are positive integers with a `direction`; the sign the design draws
 * is `direction` rendered (`types/ledger.ts` §3.1, `DESIGN.md` §8.3).
 */
export async function getRiderMoneyMovements(
  riderId: string,
  signal?: AbortSignal,
): Promise<RiderMoneyMovements> {
  if (DATA_SOURCE === 'http') {
    return http.get<RiderMoneyMovements>(`/riders/${riderId}/movements`, undefined, { signal })
  }
  return mock(RIDER_OPERATIONS.movements, signal, () => {
    const rider = riderFixtures.find((r) => r.id === riderId)
    if (!rider) throw notFound('rider', riderId)

    const payments = paymentFixtures.filter((p) => p.riderId === riderId)
    /* The back-link, so a wallet posting can name the payment that produced it. */
    const paymentByPosting = new Map(
      payments.filter((p) => p.postingId !== null).map((p) => [p.postingId!, p.id]),
    )

    const walletRows: RiderMoneyMovement[] = allLedgerPostings()
      .filter((p) => p.subjectAccount === 'liability.wallet' && p.subjectId === riderId)
      .map((p) => ({
        id: p.id,
        source: 'wallet' as const,
        at: p.postedAt,
        label: p.description,
        state: p.settlement,
        direction: p.direction,
        amountHalalas: p.amountHalalas,
        paymentId: paymentByPosting.get(p.id) ?? null,
        /* **Settled rows only.** A pending posting is a wallet movement and is
           still outside the balance (AC-312) — `clients/wallets.ts` reads the
           balance from the last settled row for the same reason. `RDR-1041`'s
           140.00 of postings against a 20.00 balance is the worked case. */
        inWalletBalance: !isPendingSettlement(p.settlement),
        balanceAfterHalalas: p.balanceAfterHalalas,
      }))
    const walletPostingIds = new Set(walletRows.map((r) => r.id))

    const paymentRows: RiderMoneyMovement[] = payments
      /* The de-dup: this payment already has a row, on the wallet side. */
      .filter((p) => p.postingId === null || !walletPostingIds.has(p.postingId))
      .map((p) => ({
        id: p.id,
        source: 'payment' as const,
        at: p.initiatedAt,
        /* The payment's own kind, as a key. `profile.paymentKind.*` is the
           existing vocabulary; nothing new is minted here. */
        label: { key: `profile.paymentKind.${p.kind}` },
        state: p.settlement,
        /* **Rider-relative.** `direction` on a `Payment` is platform-relative —
           `inbound` is money arriving at Eyvar, which is money leaving the
           rider. Flipping it here is what lets one column carry both sources. */
        direction: p.direction === 'inbound' ? ('debit' as const) : ('credit' as const),
        amountHalalas: p.amountHalalas,
        paymentId: p.id,
        /* Card money. It is in the list because the operator is looking for it
           and **not** in the balance because it never was. */
        inWalletBalance: false,
        balanceAfterHalalas: null,
      }))

    const movements = [...walletRows, ...paymentRows].sort(
      (a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id),
    )

    return {
      riderId,
      /* Derived from the rows, never copied off the record — that is the whole
         point of the check `financials.test.ts` runs against `Rider`. */
      walletBalanceHalalas: movements
        .filter((m) => m.inWalletBalance)
        .reduce((sum, m) => sum + (m.direction === 'credit' ? m.amountHalalas : -m.amountHalalas), 0),
      /* **Over `payments`, not over `paymentRows`.** A payment that named a
         wallet posting was dropped from the list by the de-dup above — the
         money is still held, it is just being shown as its wallet row. Summing
         the surviving rows would report `0` held for `RDR-1041`, whose 120.00
         is `PAY-6120`/`WTX-0003`, one hold with two representations. Same
         definition as the `Rider.heldHalalas` literal, so the two agree by
         construction rather than by coincidence. */
      heldHalalas: payments
        .filter((p) => isPendingSettlement(p.settlement))
        .reduce((sum, p) => sum + (p.direction === 'inbound' ? p.amountHalalas : -p.amountHalalas), 0),
      movements,
      computedAt: EYVAR_NOW,
    }
  })
}

/* ────────────────────── what else references this rider ─────────────────── */

/** `{ total, open }` from one array and one open-predicate. Kept boring on purpose. */
function count<T>(rows: readonly T[], isOpen: (row: T) => boolean): RiderRelatedCount {
  return { total: rows.length, open: rows.filter(isOpen).length }
}

/**
 * GET /api/v1/riders/:id/support
 *   -> RiderSupportPresence
 *   404 when the rider does not exist
 *
 * **Does anything reference this rider, and is any of it still open.**
 *
 * The profile prints a paragraph of absent-and-present facts and the reference
 * design composed it from assumptions: it states *"No support tickets reference
 * this record"* about `RDR-4002`, who has an open complaint (`CMP-343`,
 * off-platform payment, high), an unanswered chat (`CNV-101`, waiting), a
 * dispute under review (`DSP-113`, no-show), a lost-and-found search
 * (`LF-212`), an open fairness case (`FC-0004`, rider-report) and an
 * SLA-breached ride request (`SREQ-006`). **Tickets are the one thing genuinely
 * absent.** A screen has to ask.
 *
 * One read rather than six, for the reason `components/profile/record.ts` gives
 * about the record itself — six clients to render one paragraph is six loading
 * states and six error states for a sentence. A card that wants the rows still
 * calls that resource's own client; this answers *"is there anything there"*.
 *
 * Each `open` predicate is the resource's own definition, never a second one
 * invented here: `isOpenComplaint` is imported from `types/complaint.ts`, and
 * every other one is written against that type's status union with the terminal
 * values named.
 */
export async function getRiderSupportPresence(
  riderId: string,
  signal?: AbortSignal,
): Promise<RiderSupportPresence> {
  if (DATA_SOURCE === 'http') {
    return http.get<RiderSupportPresence>(`/riders/${riderId}/support`, undefined, { signal })
  }
  return mock(RIDER_OPERATIONS.support, signal, () => {
    if (!riderFixtures.some((r) => r.id === riderId)) throw notFound('rider', riderId)

    return {
      riderId,
      complaints: count(
        complaintFixtures.filter((c) => c.riderId === riderId),
        (c) => isOpenComplaint(c.status),
      ),
      conversations: count(
        conversationFixtures.filter((c) => c.entityType === 'rider' && c.entityId === riderId),
        (c) => c.status !== 'closed',
      ),
      /* Both sides. A rider can file a claim (`DSP-113`) and can be the party a
         captain's claim is against, and the profile's question — *"is this
         record caught up in a dispute"* — does not care which end. */
      disputes: count(
        disputeFixtures.filter((d) => d.claimantId === riderId || d.againstId === riderId),
        (d) => d.status !== 'resolved',
      ),
      lostAndFound: count(
        lostFoundFixtures.filter((l) => l.riderId === riderId),
        (l) => l.status !== 'returned',
      ),
      fairnessCases: count(
        fairnessCaseFixtures.filter((c) => c.subjectId === riderId),
        (c) => c.status === 'open',
      ),
      requests: count(
        allRequestFixtures.filter((r) => r.riderId === riderId),
        (r) => r.status === 'searching' || r.status === 'offered' || r.status === 'no-drivers',
      ),
      tickets: count(
        ticketFixtures.filter((t) => t.entityId === riderId),
        (t) => t.status !== 'resolved' && t.status !== 'closed',
      ),
      computedAt: EYVAR_NOW,
    }
  })
}

const newRiderShape: QueryShape<NewRider> = {
  searchable: [(r) => r.name, (r) => r.id, (r) => r.phone],
  sortable: { name: (r) => r.name, joinedAt: (r) => r.joinedAt },
  filterable: {
    id: (r) => r.id,
    name: (r) => r.name,
    phone: (r) => r.phone,
    firstAction: (r) => r.firstAction,
    city: (r) => r.city,
    gender: (r) => r.gender,
    appLanguage: (r) => r.appLanguage,
    hasPhoto: (r) => r.hasPhoto,
    ipLocation: (r) => r.ipLocation,
    joinedAt: (r) => toInstant(r.joinedAt),
    dateOfBirth: (r) => toInstant(r.dateOfBirth),
  },
  facetable: ['city', 'gender', 'appLanguage', 'firstAction'],
}

/**
 * GET /api/v1/riders/new
 *   params: q · page · pageSize · sort
 *   -> Paginated<NewRider>
 *
 * Registrations in the last 24 h. A separate shape, not a filtered `Rider`:
 * these records carry KYC fields (`dateOfBirth`, `nationalId`) that full riders
 * do not, and carry none of the stats that full riders do.
 */
export async function listNewRiders(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<NewRider>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<NewRider>>('/riders/new', { ...params }, { signal })
  }
  return mock(RIDER_OPERATIONS.listNew, signal, () => runQuery(newRiderFixtures, params, newRiderShape))
}

/**
 * GET /api/v1/riders/facets
 *   params: view
 *   -> Facets — field name -> [{ value, count }], count-descending
 *
 * The option set for every `select` / `multi-select` filter over riders,
 * **derived from the data**. A screen that hard-codes `Riyadh` / `Jeddah` is
 * wrong the first time a third city is seeded (finding **F-6**). Scoped by
 * `view` only, so narrowing one filter never removes the options you would
 * need to widen it again.
 *
 * Facetable fields are declared on the shape's `facetable` list above.
 */
export async function getRiderFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/riders/facets', { view: view ?? undefined }, { signal })
  }
  return mock(RIDER_OPERATIONS.facets, signal, () => computeFacets(riderFixtures, riderShape, view))
}
