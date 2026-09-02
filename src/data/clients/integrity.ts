/**
 * Data integrity — the checks behind Admin › Data & Compliance's `integrity`
 * pane (P6-T4).
 *
 * ## Why this client reads other clients
 *
 * Every other client in this directory owns a fixture array. This one owns
 * none: a check is a **computation over the state the rest of the product
 * serves**, so its input has to be what a screen would see, not what a fixture
 * file happens to hold. Reading `listTrips()` rather than `allTripFixtures`
 * keeps the seam intact — when `DATA_SOURCE` flips to `http` the whole pane
 * moves to `GET /api/v1/integrity/*` and nothing above the seam changes, and
 * until it does, a check cannot pass because it read a different array from the
 * screen it is meant to be auditing.
 *
 * ## Determinism
 *
 * No `Date.now()`, no `Math.random()`, no clock arithmetic. Run ids come from a
 * session counter (`IRUN-0001` upward), the timestamp is `EYVAR_NOW`, and a
 * finding's id is derived from the check, the record and the field. Two runs
 * over unchanged data produce byte-identical output — which is the only way an
 * integrity report can be diffed, and therefore the only way anyone can tell a
 * new finding from an old one.
 *
 * ## A check reports; it does not repair
 *
 * Nothing here mutates anything. Legacy's `rebuildAllHistory()` (`:18605`)
 * *generates* trip and payment records so a stored total stops disagreeing with
 * the records behind it, and it carries **no permission gate** (`16b` §12 item
 * 1). Repair proposals are written up in the handoff and left unbuilt; see
 * `types/integrity.ts`.
 *
 * ## The rule
 *
 * **Every finding names the check that produced it** — `checkId`, required,
 * from a closed union. Nothing in this file constructs a finding without one,
 * because `finding()` will not let it.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock } from '../mock/delay'
import type { Halalas, LocalisedText } from '../types/common'
import type { CorporateAccount } from '../types/corporateAccount'
import type { Driver } from '../types/driver'
import type { CaptainPayout, Deduction, EscrowHold, WalletSummary } from '../types/financials'
import type {
  IntegrityCheck,
  IntegrityCheckGroup,
  IntegrityCheckId,
  IntegrityEntityType,
  IntegrityFinding,
  IntegrityRun,
  IntegritySeverity,
} from '../types/integrity'
import { INTEGRITY_CHECK_IDS } from '../types/integrity'
import type { JournalEntry, LedgerPosting } from '../types/ledger'
import { accountDefinition, isPendingSettlement } from '../types/ledger'
import type { NewRider, Rider } from '../types/rider'
import type { Subscription } from '../types/subscription'
import type { Ticket } from '../types/ticket'
import type { Trip } from '../types/trip'
import { listCorporateAccounts } from './corporateAccounts'
import { listDrivers } from './drivers'
import { journalEntries, allLedgerPostings } from './ledger'
import { listCaptainPayouts, listDeductions, listEscrowHolds } from './payouts'
import { listNewRiders, listRiders } from './riders'
import { listSubscriptions } from './subscriptions'
import { listTickets } from './tickets'
import { listTrips } from './trips'
import { listWallets } from './wallets'
import { http } from './http'

export const INTEGRITY_OPERATIONS = {
  checks: 'integrity.checks',
  run: 'integrity.run',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(INTEGRITY_OPERATIONS))

/**
 * Big enough to hold every fixture in one page. The checks read **whole
 * collections** — an orphan reference on page 4 is still an orphan reference —
 * so paging here would not reduce work, it would only make the answer depend on
 * where the page boundary fell.
 */
const WHOLE_COLLECTION = 10_000

/* ═══════════════════════════ session state ═══════════════════════════ */

interface CheckState {
  lastRunAt: string | null
  findingCount: number | null
  recordsScanned: number | null
}

const emptyState = (): CheckState => ({ lastRunAt: null, findingCount: null, recordsScanned: null })

let checkState = new Map<IntegrityCheckId, CheckState>()
let runSequence = 0

/**
 * Back to "never run", and back to run `IRUN-0001`.
 *
 * Both halves matter for the same reason `resetTickets` resets its message
 * counter: a test that cleared the results but not the counter would see
 * `IRUN-0001` on its first run and `IRUN-0004` on its second, which is
 * non-determinism arriving by the back door.
 */
export function resetIntegrity(): void {
  checkState = new Map()
  runSequence = 0
}

function stateFor(id: IntegrityCheckId): CheckState {
  return checkState.get(id) ?? emptyState()
}

/* ═════════════════════════════ snapshot ══════════════════════════════ */

interface Snapshot {
  riders: Rider[]
  newRiders: NewRider[]
  drivers: Driver[]
  trips: Trip[]
  subscriptions: Subscription[]
  tickets: Ticket[]
  corporates: CorporateAccount[]
  payouts: CaptainPayout[]
  escrows: EscrowHold[]
  deductions: Deduction[]
  wallets: WalletSummary[]
  postings: readonly LedgerPosting[]
  entries: readonly JournalEntry[]

  /* Indexes, built once. A check that does `find()` per row is O(n·m) and the
     ledger alone is 60-odd rows against 130 trips. */
  riderById: Map<string, Rider>
  /** Riders **and** new riders: a ticket about a signed-up-yesterday rider is legitimate. */
  riderNameById: Map<string, string>
  driverById: Map<string, Driver>
  tripById: Map<string, Trip>
  subscriptionById: Map<string, Subscription>
  corporateById: Map<string, CorporateAccount>
  entryById: Map<string, JournalEntry>
  walletByRiderId: Map<string, WalletSummary>
  /** Only holds that are still `held` — a released hold is not a claim on anything. */
  heldEscrowBySubscriptionId: Map<string, EscrowHold>
}

async function readSnapshot(signal?: AbortSignal): Promise<Snapshot> {
  const params = { pageSize: WHOLE_COLLECTION, signal }
  const [riders, newRiders, drivers, trips, subscriptions, tickets, corporates, payouts, escrows, deductions, wallets] =
    await Promise.all([
      listRiders(params),
      listNewRiders(params),
      listDrivers(params),
      listTrips(params),
      listSubscriptions(params),
      listTickets(params),
      listCorporateAccounts(params),
      listCaptainPayouts(params, signal),
      listEscrowHolds(params, signal),
      listDeductions(params, signal),
      listWallets(params, signal),
    ])

  const riderNameById = new Map<string, string>()
  for (const r of riders.items) riderNameById.set(r.id, r.name)
  for (const r of newRiders.items) riderNameById.set(r.id, r.name)

  return {
    riders: riders.items,
    newRiders: newRiders.items,
    drivers: drivers.items,
    trips: trips.items,
    subscriptions: subscriptions.items,
    tickets: tickets.items,
    corporates: corporates.items,
    payouts: payouts.items,
    escrows: escrows.items,
    deductions: deductions.items,
    wallets: wallets.items,
    postings: allLedgerPostings(),
    entries: journalEntries(),

    riderById: new Map(riders.items.map((r) => [r.id, r])),
    riderNameById,
    driverById: new Map(drivers.items.map((d) => [d.id, d])),
    tripById: new Map(trips.items.map((t) => [t.id, t])),
    subscriptionById: new Map(subscriptions.items.map((s) => [s.id, s])),
    corporateById: new Map(corporates.items.map((c) => [c.id, c])),
    entryById: new Map(journalEntries().map((e) => [e.id, e])),
    walletByRiderId: new Map(wallets.items.map((w) => [w.riderId, w])),
    heldEscrowBySubscriptionId: new Map(
      escrows.items.filter((e) => e.settlement === 'held').map((e) => [e.subscriptionId, e]),
    ),
  }
}

/* ═════════════════════════ finding construction ══════════════════════ */

interface FindingInput {
  checkId: IntegrityCheckId
  severity: IntegritySeverity
  entityType: IntegrityEntityType
  entityId: string
  entityLabel?: string
  field: string
  detail: LocalisedText
  counterpartType?: IntegrityEntityType
  counterpartId?: string
  deltaHalalas?: Halalas
}

/**
 * The only way a finding is made, which is how *"every row names its check"*
 * becomes structural rather than a review comment: `checkId` is a required
 * argument and there is no other constructor.
 */
function finding(input: FindingInput): IntegrityFinding {
  return {
    id: `${input.checkId}|${input.entityId}|${input.field}`,
    checkId: input.checkId,
    severity: input.severity,
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel: input.entityLabel ?? input.entityId,
    field: input.field,
    detail: input.detail,
    counterpartType: input.counterpartType ?? null,
    counterpartId: input.counterpartId ?? null,
    deltaHalalas: input.deltaHalalas ?? null,
  }
}

/* ═══════════════════════════ the catalogue ═══════════════════════════ */

interface CheckDefinition {
  id: IntegrityCheckId
  group: IntegrityCheckGroup
  severity: IntegritySeverity
  scope: readonly IntegrityEntityType[]
  run: (s: Snapshot) => { findings: IntegrityFinding[]; recordsScanned: number }
}

/* ── 1. dangling references ────────────────────────────────────────────── */

const refTripLinks: CheckDefinition = {
  id: 'ref.trip-links',
  group: 'reference',
  severity: 'critical',
  scope: ['trip'],
  run(s) {
    const out: IntegrityFinding[] = []
    for (const trip of s.trips) {
      const base = { checkId: 'ref.trip-links', severity: 'critical', entityType: 'trip', entityId: trip.id, entityLabel: trip.id } as const
      if (!s.riderNameById.has(trip.riderId)) {
        out.push(finding({ ...base, field: 'riderId', detail: { key: 'integrity.detail.danglingRider', params: { id: trip.riderId } }, counterpartType: 'rider', counterpartId: trip.riderId }))
      }
      if (trip.driverId !== null && !s.driverById.has(trip.driverId)) {
        out.push(finding({ ...base, field: 'driverId', detail: { key: 'integrity.detail.danglingDriver', params: { id: trip.driverId } }, counterpartType: 'driver', counterpartId: trip.driverId }))
      }
      if (trip.subscriptionId !== null && !s.subscriptionById.has(trip.subscriptionId)) {
        out.push(finding({ ...base, field: 'subscriptionId', detail: { key: 'integrity.detail.danglingSubscription', params: { id: trip.subscriptionId } }, counterpartType: 'subscription', counterpartId: trip.subscriptionId }))
      }
    }
    return { findings: out, recordsScanned: s.trips.length }
  },
}

const refSubscriptionLinks: CheckDefinition = {
  id: 'ref.subscription-links',
  group: 'reference',
  severity: 'critical',
  scope: ['subscription'],
  run(s) {
    const out: IntegrityFinding[] = []
    for (const sub of s.subscriptions) {
      const base = { checkId: 'ref.subscription-links', severity: 'critical', entityType: 'subscription', entityId: sub.id, entityLabel: sub.planName } as const
      if (!s.riderNameById.has(sub.riderId)) {
        out.push(finding({ ...base, field: 'riderId', detail: { key: 'integrity.detail.danglingRider', params: { id: sub.riderId } }, counterpartType: 'rider', counterpartId: sub.riderId }))
      }
      if (sub.driverId !== null && !s.driverById.has(sub.driverId)) {
        out.push(finding({ ...base, field: 'driverId', detail: { key: 'integrity.detail.danglingDriver', params: { id: sub.driverId } }, counterpartType: 'driver', counterpartId: sub.driverId }))
      }
    }
    return { findings: out, recordsScanned: s.subscriptions.length }
  },
}

const refPersonLinks: CheckDefinition = {
  id: 'ref.person-links',
  group: 'reference',
  severity: 'critical',
  scope: ['rider', 'driver'],
  run(s) {
    const out: IntegrityFinding[] = []
    for (const rider of s.riders) {
      const base = { checkId: 'ref.person-links', severity: 'critical', entityType: 'rider', entityId: rider.id, entityLabel: rider.name } as const
      rider.subscriptionIds.forEach((id, i) => {
        if (!s.subscriptionById.has(id)) {
          out.push(finding({ ...base, field: `subscriptionIds[${i}]`, detail: { key: 'integrity.detail.danglingSubscription', params: { id } }, counterpartType: 'subscription', counterpartId: id }))
        }
      })
      rider.tripIds.forEach((id, i) => {
        if (!s.tripById.has(id)) {
          out.push(finding({ ...base, field: `tripIds[${i}]`, detail: { key: 'integrity.detail.danglingTrip', params: { id } }, counterpartType: 'trip', counterpartId: id }))
        }
      })
      if (rider.corporateAccountId !== null && !s.corporateById.has(rider.corporateAccountId)) {
        out.push(finding({ ...base, field: 'corporateAccountId', detail: { key: 'integrity.detail.danglingCorporate', params: { id: rider.corporateAccountId } }, counterpartType: 'corporate-account', counterpartId: rider.corporateAccountId }))
      }
    }
    for (const driver of s.drivers) {
      const base = { checkId: 'ref.person-links', severity: 'critical', entityType: 'driver', entityId: driver.id, entityLabel: driver.name } as const
      driver.tripIds.forEach((id, i) => {
        if (!s.tripById.has(id)) {
          out.push(finding({ ...base, field: `tripIds[${i}]`, detail: { key: 'integrity.detail.danglingTrip', params: { id } }, counterpartType: 'trip', counterpartId: id }))
        }
      })
    }
    return { findings: out, recordsScanned: s.riders.length + s.drivers.length }
  },
}

const refTicketSubject: CheckDefinition = {
  id: 'ref.ticket-subject',
  group: 'reference',
  severity: 'critical',
  scope: ['ticket'],
  run(s) {
    const out: IntegrityFinding[] = []
    for (const ticket of s.tickets) {
      const base = { checkId: 'ref.ticket-subject', severity: 'critical', entityType: 'ticket', entityId: ticket.id, entityLabel: ticket.subject } as const
      const resolved =
        ticket.entityType === 'rider'
          ? s.riderNameById.has(ticket.entityId)
          : ticket.entityType === 'driver'
            ? s.driverById.has(ticket.entityId)
            : s.corporateById.has(ticket.entityId)
      if (!resolved) {
        const key =
          ticket.entityType === 'rider'
            ? 'integrity.detail.danglingRider'
            : ticket.entityType === 'driver'
              ? 'integrity.detail.danglingDriver'
              : 'integrity.detail.danglingCorporate'
        out.push(
          finding({
            ...base,
            field: 'entityId',
            detail: { key, params: { id: ticket.entityId } },
            counterpartType: ticket.entityType === 'corporate' ? 'corporate-account' : ticket.entityType,
            counterpartId: ticket.entityId,
          }),
        )
      }
    }
    return { findings: out, recordsScanned: s.tickets.length }
  },
}

const refMoneyParty: CheckDefinition = {
  id: 'ref.money-party',
  group: 'reference',
  severity: 'critical',
  scope: ['payout', 'escrow-hold', 'deduction'],
  run(s) {
    const out: IntegrityFinding[] = []
    for (const payout of s.payouts) {
      if (!s.driverById.has(payout.captainId)) {
        out.push(finding({ checkId: 'ref.money-party', severity: 'critical', entityType: 'payout', entityId: payout.captainId, entityLabel: payout.captainName, field: 'captainId', detail: { key: 'integrity.detail.danglingDriver', params: { id: payout.captainId } }, counterpartType: 'driver', counterpartId: payout.captainId }))
      }
    }
    for (const hold of s.escrows) {
      const base = { checkId: 'ref.money-party', severity: 'critical', entityType: 'escrow-hold', entityId: hold.id, entityLabel: hold.id } as const
      if (!s.driverById.has(hold.captainId)) {
        out.push(finding({ ...base, field: 'captainId', detail: { key: 'integrity.detail.danglingDriver', params: { id: hold.captainId } }, counterpartType: 'driver', counterpartId: hold.captainId }))
      }
      if (!s.riderNameById.has(hold.riderId)) {
        out.push(finding({ ...base, field: 'riderId', detail: { key: 'integrity.detail.danglingRider', params: { id: hold.riderId } }, counterpartType: 'rider', counterpartId: hold.riderId }))
      }
      if (!s.subscriptionById.has(hold.subscriptionId)) {
        out.push(finding({ ...base, field: 'subscriptionId', detail: { key: 'integrity.detail.danglingSubscription', params: { id: hold.subscriptionId } }, counterpartType: 'subscription', counterpartId: hold.subscriptionId }))
      }
    }
    for (const ded of s.deductions) {
      const base = { checkId: 'ref.money-party', severity: 'critical', entityType: 'deduction', entityId: ded.id, entityLabel: ded.id } as const
      if (!s.driverById.has(ded.captainId)) {
        out.push(finding({ ...base, field: 'captainId', detail: { key: 'integrity.detail.danglingDriver', params: { id: ded.captainId } }, counterpartType: 'driver', counterpartId: ded.captainId }))
      }
      if (ded.tripId !== null && !s.tripById.has(ded.tripId)) {
        out.push(finding({ ...base, field: 'tripId', detail: { key: 'integrity.detail.danglingTrip', params: { id: ded.tripId } }, counterpartType: 'trip', counterpartId: ded.tripId }))
      }
    }
    return { findings: out, recordsScanned: s.payouts.length + s.escrows.length + s.deductions.length }
  },
}

const refLedgerSubject: CheckDefinition = {
  id: 'ref.ledger-subject',
  group: 'reference',
  severity: 'critical',
  scope: ['ledger-posting'],
  run(s) {
    const out: IntegrityFinding[] = []
    for (const posting of s.postings) {
      const base = { checkId: 'ref.ledger-subject', severity: 'critical', entityType: 'ledger-posting', entityId: posting.id, entityLabel: posting.reference ?? posting.id } as const
      const scope = accountDefinition(posting.subjectAccount).scope
      if (scope !== 'platform') {
        const id = posting.subjectId
        if (id === null) {
          out.push(finding({ ...base, field: 'subjectId', detail: { key: 'integrity.detail.partyAccountWithoutSubject', params: { account: posting.subjectAccount } } }))
        } else {
          const resolved =
            scope === 'rider'
              ? s.riderNameById.has(id)
              : scope === 'captain'
                ? s.driverById.has(id)
                : s.subscriptionById.has(id)
          if (!resolved) {
            const key =
              scope === 'rider'
                ? 'integrity.detail.danglingRider'
                : scope === 'captain'
                  ? 'integrity.detail.danglingDriver'
                  : 'integrity.detail.danglingSubscription'
            out.push(
              finding({
                ...base,
                field: 'subjectId',
                detail: { key, params: { id } },
                counterpartType: scope === 'rider' ? 'rider' : scope === 'captain' ? 'driver' : 'subscription',
                counterpartId: id,
              }),
            )
          }
        }
      }
      if (posting.journalEntryId !== null && !s.entryById.has(posting.journalEntryId)) {
        out.push(finding({ ...base, field: 'journalEntryId', detail: { key: 'integrity.detail.danglingJournalEntry', params: { id: posting.journalEntryId } }, counterpartType: 'journal-entry', counterpartId: posting.journalEntryId }))
      }
      if (posting.reversesPostingId !== null && !s.postings.some((p) => p.id === posting.reversesPostingId)) {
        out.push(finding({ ...base, field: 'reversesPostingId', detail: { key: 'integrity.detail.danglingPosting', params: { id: posting.reversesPostingId } }, counterpartType: 'ledger-posting', counterpartId: posting.reversesPostingId }))
      }
    }
    return { findings: out, recordsScanned: s.postings.length }
  },
}

/* ── 2. two records that disagree ──────────────────────────────────────── */

/**
 * Denormalised names, against the record that owns the name.
 *
 * **`TKT-501` is the acceptance test**: the ticket names rider `RDR-1041` as
 * *"Mohammed Al-Ghamdi"*, `fixtures/riders.ts:22` calls that same id *"Nora
 * Al-Harbi"*. Nothing in the product compares them, so a support agent opens
 * the ticket and greets the customer by a stranger's name.
 *
 * Every denormalised name in the data layer is checked, not just the ticket:
 * the field exists on trips, subscriptions, payouts, holds and deductions for
 * the same index-table reason, and therefore carries the same risk. A name is
 * only compared when the id **resolves** — a dangling id is `ref.*`'s finding
 * and reporting it twice would double-count the same fault.
 */
const agreePartyName: CheckDefinition = {
  id: 'agree.party-name',
  group: 'contradiction',
  severity: 'warning',
  scope: ['trip', 'subscription', 'ticket', 'payout', 'escrow-hold', 'deduction'],
  run(s) {
    const out: IntegrityFinding[] = []

    const compare = (
      entityType: IntegrityEntityType,
      entityId: string,
      entityLabel: string,
      field: string,
      partyId: string,
      carried: string,
      counterpartType: IntegrityEntityType,
    ): void => {
      const canonical = counterpartType === 'driver' ? s.driverById.get(partyId)?.name : s.riderNameById.get(partyId)
      if (canonical === undefined || canonical === carried) return
      out.push(
        finding({
          checkId: 'agree.party-name',
          severity: 'warning',
          entityType,
          entityId,
          entityLabel,
          field,
          detail: { key: 'integrity.detail.nameDisagrees', params: { id: partyId, carried, canonical } },
          counterpartType,
          counterpartId: partyId,
        }),
      )
    }

    for (const trip of s.trips) {
      compare('trip', trip.id, trip.id, 'riderName', trip.riderId, trip.riderName, 'rider')
      if (trip.driverId !== null && trip.driverName !== null) {
        compare('trip', trip.id, trip.id, 'driverName', trip.driverId, trip.driverName, 'driver')
      }
    }
    for (const sub of s.subscriptions) {
      compare('subscription', sub.id, sub.planName, 'riderName', sub.riderId, sub.riderName, 'rider')
      if (sub.driverId !== null && sub.driverName !== null) {
        compare('subscription', sub.id, sub.planName, 'driverName', sub.driverId, sub.driverName, 'driver')
      }
    }
    for (const ticket of s.tickets) {
      if (ticket.entityType === 'corporate') continue
      compare(
        'ticket',
        ticket.id,
        ticket.subject,
        'entityName',
        ticket.entityId,
        ticket.entityName,
        ticket.entityType === 'rider' ? 'rider' : 'driver',
      )
    }
    for (const payout of s.payouts) {
      compare('payout', payout.captainId, payout.captainName, 'captainName', payout.captainId, payout.captainName, 'driver')
    }
    for (const hold of s.escrows) {
      compare('escrow-hold', hold.id, hold.id, 'captainName', hold.captainId, hold.captainName, 'driver')
      compare('escrow-hold', hold.id, hold.id, 'riderName', hold.riderId, hold.riderName, 'rider')
    }
    for (const ded of s.deductions) {
      compare('deduction', ded.id, ded.id, 'captainName', ded.captainId, ded.captainName, 'driver')
    }

    return {
      findings: out,
      recordsScanned:
        s.trips.length + s.subscriptions.length + s.tickets.length + s.payouts.length + s.escrows.length + s.deductions.length,
    }
  },
}

const agreeEscrowAmount: CheckDefinition = {
  id: 'agree.escrow-amount',
  group: 'contradiction',
  severity: 'critical',
  scope: ['subscription', 'escrow-hold'],
  run(s) {
    const out: IntegrityFinding[] = []
    /* A hold in ANY state, for the message only: *"the subscription still shows
       escrow that was released on the 21st"* and *"the subscription shows escrow
       nobody is holding"* are different faults with different fixes, and a check
       that words them identically sends the operator to the wrong place. */
    const anyEscrowBySubscriptionId = new Map(s.escrows.map((e) => [e.subscriptionId, e]))

    for (const sub of s.subscriptions) {
      const hold = s.heldEscrowBySubscriptionId.get(sub.id)
      const claimed = sub.escrowHeldHalalas
      if (claimed !== null && hold === undefined) {
        const settled = anyEscrowBySubscriptionId.get(sub.id)
        out.push(
          settled
            ? finding({ checkId: 'agree.escrow-amount', severity: 'critical', entityType: 'subscription', entityId: sub.id, entityLabel: sub.planName, field: 'escrowHeldHalalas', detail: { key: 'integrity.detail.escrowAfterRelease', params: { id: settled.id, settlement: settled.settlement, amountHalalas: claimed } }, counterpartType: 'escrow-hold', counterpartId: settled.id, deltaHalalas: claimed })
            : finding({ checkId: 'agree.escrow-amount', severity: 'warning', entityType: 'subscription', entityId: sub.id, entityLabel: sub.planName, field: 'escrowHeldHalalas', detail: { key: 'integrity.detail.escrowWithoutHold', params: { amountHalalas: claimed } }, deltaHalalas: claimed }),
        )
      } else if (claimed === null && hold !== undefined) {
        out.push(finding({ checkId: 'agree.escrow-amount', severity: 'warning', entityType: 'subscription', entityId: sub.id, entityLabel: sub.planName, field: 'escrowHeldHalalas', detail: { key: 'integrity.detail.holdWithoutEscrow', params: { id: hold.id, amountHalalas: hold.amountHalalas } }, counterpartType: 'escrow-hold', counterpartId: hold.id, deltaHalalas: -hold.amountHalalas }))
      } else if (claimed !== null && hold !== undefined && claimed !== hold.amountHalalas) {
        out.push(finding({ checkId: 'agree.escrow-amount', severity: 'critical', entityType: 'subscription', entityId: sub.id, entityLabel: sub.planName, field: 'escrowHeldHalalas', detail: { key: 'integrity.detail.escrowAmountDisagrees', params: { id: hold.id, subscriptionHalalas: claimed, holdHalalas: hold.amountHalalas, deltaHalalas: claimed - hold.amountHalalas } }, counterpartType: 'escrow-hold', counterpartId: hold.id, deltaHalalas: claimed - hold.amountHalalas }))
      }
    }
    return { findings: out, recordsScanned: s.subscriptions.length + s.escrows.length }
  },
}

/**
 * Legacy `reconcileEntity()` (`:18517`), including the reclassification it was
 * given at `:20441` — **and that reclassification is the whole point of the
 * check**, so it is ported rather than dropped:
 *
 * > *"A gap is only an ALERT when the window itself is empty — that means a
 * > failed import or a duplicate profile. A total larger than the window is
 * > expected and must not shout, or the alert stops being read."*
 *
 * So a rider whose stored `totalTrips` is 42 while we hold 3 is **not** a
 * finding: the panel holds a recent operational window, billing holds the
 * lifetime. A rider whose stored total is 42 while we hold **zero** is: that
 * account cannot be investigated, refunded accurately or defended in a dispute,
 * and it is also the signature of a duplicate profile.
 *
 * Note what is deliberately not carried across: legacy compared against
 * `entityDerived()`, which scans the trip collection, and **not** against the
 * `tripIds` array on the record. Same here — `Rider.tripIds` is a link list, not
 * a history, and comparing a lifetime total against it would fire on every
 * single rider.
 */
const agreeAggregateVsRecords: CheckDefinition = {
  id: 'agree.aggregate-vs-records',
  group: 'contradiction',
  severity: 'critical',
  scope: ['rider', 'driver'],
  run(s) {
    const out: IntegrityFinding[] = []
    const tripsByRider = new Map<string, number>()
    const tripsByDriver = new Map<string, number>()
    for (const trip of s.trips) {
      tripsByRider.set(trip.riderId, (tripsByRider.get(trip.riderId) ?? 0) + 1)
      if (trip.driverId !== null) tripsByDriver.set(trip.driverId, (tripsByDriver.get(trip.driverId) ?? 0) + 1)
    }
    for (const rider of s.riders) {
      if (rider.totalTrips > 0 && (tripsByRider.get(rider.id) ?? 0) === 0) {
        out.push(finding({ checkId: 'agree.aggregate-vs-records', severity: 'critical', entityType: 'rider', entityId: rider.id, entityLabel: rider.name, field: 'totalTrips', detail: { key: 'integrity.detail.aggregateWithoutRecords', params: { stored: rider.totalTrips } } }))
      }
    }
    for (const driver of s.drivers) {
      if (driver.totalTrips > 0 && (tripsByDriver.get(driver.id) ?? 0) === 0) {
        out.push(finding({ checkId: 'agree.aggregate-vs-records', severity: 'critical', entityType: 'driver', entityId: driver.id, entityLabel: driver.name, field: 'totalTrips', detail: { key: 'integrity.detail.aggregateWithoutRecords', params: { stored: driver.totalTrips } } }))
      }
    }
    return { findings: out, recordsScanned: s.riders.length + s.drivers.length }
  },
}

/* ── 3. one record disagreeing with itself ─────────────────────────────── */

const invariantStatusFields: CheckDefinition = {
  id: 'invariant.status-fields',
  group: 'invariant',
  severity: 'critical',
  scope: ['rider', 'driver', 'trip', 'subscription', 'ledger-posting'],
  run(s) {
    const out: IntegrityFinding[] = []
    const id = 'invariant.status-fields' as const

    /* `types/rider.ts` — status is derived in legacy from `subs.length`
       (`:6428`) and is a server field here, so the two must still agree. */
    for (const rider of s.riders) {
      const base = { checkId: id, entityType: 'rider', entityId: rider.id, entityLabel: rider.name } as const
      if (rider.status === 'subscriber' && rider.subscriptionIds.length === 0) {
        out.push(finding({ ...base, severity: 'warning', field: 'status', detail: { key: 'integrity.detail.subscriberWithoutSubscription' } }))
      }
      if (rider.status === 'on-demand' && rider.subscriptionIds.length > 0) {
        out.push(finding({ ...base, severity: 'warning', field: 'status', detail: { key: 'integrity.detail.onDemandWithSubscription', params: { count: rider.subscriptionIds.length } } }))
      }
    }

    /* `types/trip.ts` — `latenessMinutes` is `null` unless `status === 'late'`;
       `subscriptionId` is `null` iff the trip is a quick ride. */
    for (const trip of s.trips) {
      const base = { checkId: id, entityType: 'trip', entityId: trip.id, entityLabel: trip.id } as const
      if (trip.status === 'late' && trip.latenessMinutes === null) {
        out.push(finding({ ...base, severity: 'warning', field: 'latenessMinutes', detail: { key: 'integrity.detail.lateWithoutMinutes' } }))
      }
      if (trip.status !== 'late' && trip.latenessMinutes !== null) {
        out.push(finding({ ...base, severity: 'warning', field: 'latenessMinutes', detail: { key: 'integrity.detail.minutesWithoutLate', params: { status: trip.status, minutes: trip.latenessMinutes } } }))
      }
      if (trip.kind === 'Subscription' && trip.subscriptionId === null) {
        out.push(finding({ ...base, severity: 'warning', field: 'subscriptionId', detail: { key: 'integrity.detail.planTripWithoutSubscription' } }))
      }
      if (trip.kind === 'Quick ride' && trip.subscriptionId !== null) {
        out.push(finding({ ...base, severity: 'warning', field: 'subscriptionId', detail: { key: 'integrity.detail.quickRideWithSubscription', params: { id: trip.subscriptionId } } }))
      }
    }

    /* `types/driver.ts` — `status` is derived from `suspended` plus the review
       flags (`:6394`); `suspensionReason` is what the banner renders. */
    for (const driver of s.drivers) {
      const base = { checkId: id, entityType: 'driver', entityId: driver.id, entityLabel: driver.name } as const
      if (driver.suspended !== (driver.status === 'suspended')) {
        out.push(finding({ ...base, severity: 'critical', field: 'suspended', detail: { key: 'integrity.detail.suspensionDisagrees', params: { status: driver.status, suspended: String(driver.suspended) } } }))
      }
      if (driver.suspended && driver.suspensionReason === null) {
        out.push(finding({ ...base, severity: 'warning', field: 'suspensionReason', detail: { key: 'integrity.detail.suspendedWithoutReason' } }))
      }
      if (driver.planAccess === 'frozen' && driver.planFrozenUntil === null) {
        out.push(finding({ ...base, severity: 'warning', field: 'planFrozenUntil', detail: { key: 'integrity.detail.frozenWithoutUntil' } }))
      }
    }

    for (const sub of s.subscriptions) {
      const base = { checkId: id, entityType: 'subscription', entityId: sub.id, entityLabel: sub.planName } as const
      if (sub.status === 'frozen' && sub.frozenUntil === null) {
        out.push(finding({ ...base, severity: 'warning', field: 'frozenUntil', detail: { key: 'integrity.detail.frozenWithoutUntil' } }))
      }
      if (sub.status === 'cancelled' && sub.cancelledAt === null) {
        out.push(finding({ ...base, severity: 'warning', field: 'cancelledAt', detail: { key: 'integrity.detail.cancelledWithoutTimestamp' } }))
      }
      if (sub.status !== 'cancelled' && sub.cancelledAt !== null) {
        out.push(finding({ ...base, severity: 'critical', field: 'cancelledAt', detail: { key: 'integrity.detail.timestampWithoutCancelled', params: { status: sub.status } } }))
      }
    }

    /* `types/ledger.ts` §3.3 and §3.4d state these two outright. */
    for (const posting of s.postings) {
      const base = { checkId: id, entityType: 'ledger-posting', entityId: posting.id, entityLabel: posting.reference ?? posting.id } as const
      if ((posting.kind === 'reversal') !== (posting.reversesPostingId !== null)) {
        out.push(finding({ ...base, severity: 'critical', field: 'reversesPostingId', detail: { key: 'integrity.detail.reversalLinkDisagrees', params: { kind: posting.kind } } }))
      }
      if (posting.kind === 'adjustment' && posting.reasonCode === null) {
        out.push(finding({ ...base, severity: 'critical', field: 'reasonCode', detail: { key: 'integrity.detail.adjustmentWithoutReason' } }))
      }
      if (isPendingSettlement(posting.settlement) && posting.balanceAfterHalalas !== null) {
        out.push(finding({ ...base, severity: 'warning', field: 'balanceAfterHalalas', detail: { key: 'integrity.detail.pendingCarriesBalance', params: { settlement: posting.settlement, balanceHalalas: posting.balanceAfterHalalas } } }))
      }
    }

    return {
      findings: out,
      recordsScanned: s.riders.length + s.trips.length + s.drivers.length + s.subscriptions.length + s.postings.length,
    }
  },
}

const invariantCounters: CheckDefinition = {
  id: 'invariant.counters',
  group: 'invariant',
  severity: 'warning',
  scope: ['driver', 'subscription', 'escrow-hold'],
  run(s) {
    const out: IntegrityFinding[] = []
    const id = 'invariant.counters' as const

    for (const driver of s.drivers) {
      const base = { checkId: id, severity: 'warning', entityType: 'driver', entityId: driver.id, entityLabel: driver.name } as const
      const expected = Math.max(0, driver.maxSubscriptions - driver.activeSubscriptions)
      if (driver.openSubscriptionSlots !== expected) {
        out.push(finding({ ...base, field: 'openSubscriptionSlots', detail: { key: 'integrity.detail.slotsDisagree', params: { open: driver.openSubscriptionSlots, active: driver.activeSubscriptions, max: driver.maxSubscriptions, expected } } }))
      }
      if (driver.activeSubscriptions > driver.maxSubscriptions && !driver.multiSubException) {
        out.push(finding({ ...base, field: 'activeSubscriptions', detail: { key: 'integrity.detail.overCapacity', params: { active: driver.activeSubscriptions, max: driver.maxSubscriptions } } }))
      }
    }

    for (const sub of s.subscriptions) {
      if (sub.tripsCompleted > sub.tripsIncluded) {
        out.push(finding({ checkId: id, severity: 'warning', entityType: 'subscription', entityId: sub.id, entityLabel: sub.planName, field: 'tripsCompleted', detail: { key: 'integrity.detail.tripsOverIncluded', params: { completed: sub.tripsCompleted, included: sub.tripsIncluded } } }))
      }
    }

    for (const hold of s.escrows) {
      if (hold.tripsCompleted > hold.tripsRequired) {
        out.push(finding({ checkId: id, severity: 'warning', entityType: 'escrow-hold', entityId: hold.id, entityLabel: hold.id, field: 'tripsCompleted', detail: { key: 'integrity.detail.tripsOverRequired', params: { completed: hold.tripsCompleted, required: hold.tripsRequired } } }))
      }
    }

    return { findings: out, recordsScanned: s.drivers.length + s.subscriptions.length + s.escrows.length }
  },
}

/* ── 4. money ──────────────────────────────────────────────────────────── */

/**
 * `types/trip.ts` states the split verbatim: *"Legacy computes this at render:
 * `fare - driverEarn - stopFee` (`:3422`)"*. So the invariant is
 * `platformCut === fare − driverEarnings − extraStopFee`, and the residual is
 * reported in halalas.
 *
 * **A one-halala residual is a finding.** Money here is an integer count of
 * halalas by construction (§8.3), so there is no rounding to absorb: a
 * non-zero residual means one of the four numbers was computed somewhere else,
 * in floats, and written back.
 *
 * `tipHalalas` is deliberately outside the identity — a tip rides on top of the
 * fare and is neither the captain's earnings nor Eyvar's cut.
 */
const moneyTripSplit: CheckDefinition = {
  id: 'money.trip-split',
  group: 'financial',
  severity: 'critical',
  scope: ['trip'],
  run(s) {
    const out: IntegrityFinding[] = []
    for (const trip of s.trips) {
      const residual = trip.fareHalalas - trip.driverEarningsHalalas - trip.extraStopFeeHalalas - trip.platformCutHalalas
      if (residual !== 0) {
        out.push(
          finding({
            checkId: 'money.trip-split',
            severity: 'critical',
            entityType: 'trip',
            entityId: trip.id,
            entityLabel: trip.id,
            field: 'platformCutHalalas',
            detail: {
              key: 'integrity.detail.fareSplitDisagrees',
              params: {
                fareHalalas: trip.fareHalalas,
                earningsHalalas: trip.driverEarningsHalalas,
                extrasHalalas: trip.extraStopFeeHalalas,
                cutHalalas: trip.platformCutHalalas,
                deltaHalalas: residual,
              },
            },
            deltaHalalas: residual,
          }),
        )
      }
    }
    return { findings: out, recordsScanned: s.trips.length }
  },
}

/**
 * `types/rider.ts` promises this one in writing: *"`clients/financials.test.ts`
 * asserts it equals that rider's ledger closing balance, so the index and the
 * ledger can never disagree about one number."* A promise held by one test file
 * is a promise nobody re-checks after a fixture edit; this is the same
 * assertion, run against live client data, on demand, by an operator.
 */
const moneyWalletBalance: CheckDefinition = {
  id: 'money.wallet-balance',
  group: 'financial',
  severity: 'critical',
  scope: ['rider'],
  run(s) {
    const out: IntegrityFinding[] = []
    for (const rider of s.riders) {
      const wallet = s.walletByRiderId.get(rider.id)
      if (!wallet) continue
      if (rider.walletBalanceHalalas !== wallet.balanceHalalas) {
        out.push(
          finding({
            checkId: 'money.wallet-balance',
            severity: 'critical',
            entityType: 'rider',
            entityId: rider.id,
            entityLabel: rider.name,
            field: 'walletBalanceHalalas',
            detail: {
              key: 'integrity.detail.walletDisagrees',
              params: {
                recordHalalas: rider.walletBalanceHalalas,
                ledgerHalalas: wallet.balanceHalalas,
                deltaHalalas: rider.walletBalanceHalalas - wallet.balanceHalalas,
              },
            },
            deltaHalalas: rider.walletBalanceHalalas - wallet.balanceHalalas,
          }),
        )
      }
    }
    return { findings: out, recordsScanned: s.riders.length }
  },
}

/** AC-343 — `sum(debits) === sum(credits) === totalHalalas` on every entry. */
const moneyJournalBalance: CheckDefinition = {
  id: 'money.journal-balance',
  group: 'financial',
  severity: 'critical',
  scope: ['journal-entry'],
  run(s) {
    const out: IntegrityFinding[] = []
    for (const entry of s.entries) {
      const base = { checkId: 'money.journal-balance', severity: 'critical', entityType: 'journal-entry', entityId: entry.id, entityLabel: entry.reference } as const
      let debits = 0
      let credits = 0
      for (const line of entry.lines) {
        if (line.direction === 'debit') debits += line.amountHalalas
        else credits += line.amountHalalas
      }
      if (debits !== credits) {
        out.push(finding({ ...base, field: 'lines', detail: { key: 'integrity.detail.entryUnbalanced', params: { debitsHalalas: debits, creditsHalalas: credits, deltaHalalas: debits - credits } }, deltaHalalas: debits - credits }))
      } else if (entry.totalHalalas !== debits) {
        out.push(finding({ ...base, field: 'totalHalalas', detail: { key: 'integrity.detail.entryTotalDisagrees', params: { statedHalalas: entry.totalHalalas, linesHalalas: debits, deltaHalalas: entry.totalHalalas - debits } }, deltaHalalas: entry.totalHalalas - debits }))
      }
    }
    return { findings: out, recordsScanned: s.entries.length }
  },
}

/**
 * The net a payout would commit, against the two balances it is derived from.
 *
 * `types/financials.ts` is explicit that `netPayableHalalas` is **derived** —
 * `payable − cashDebt` — *"because it must be computed the same way in the
 * confirmation modal, on the row and in the audit entry"*. Two things can make
 * that derivation lie, and both are checked:
 *
 *   1. **An applied deduction that never reached the ledger.** `applyDeduction`
 *      posts to `liability.driver`; a `Deduction` marked `applied` with no
 *      posting naming it means the captain's payable is over-stated by exactly
 *      that amount, and D-F6 — *"every payout over-pays by the outstanding
 *      debt"* — is what that class of gap costs.
 *   2. **A negative net on a payout still marked `due`.** Committing it would
 *      move money the wrong way; the row needs its reason stated before anyone
 *      clicks (§11.2), not a failure at commit time.
 */
const moneyPayoutNet: CheckDefinition = {
  id: 'money.payout-net',
  group: 'financial',
  severity: 'critical',
  scope: ['payout', 'deduction'],
  run(s) {
    const out: IntegrityFinding[] = []
    const postedDeductionIds = new Set(
      s.postings.filter((p) => p.sourceType === 'deduction' && p.sourceId !== null).map((p) => p.sourceId as string),
    )
    for (const ded of s.deductions) {
      if (ded.status === 'applied' && !postedDeductionIds.has(ded.id)) {
        out.push(finding({ checkId: 'money.payout-net', severity: 'critical', entityType: 'deduction', entityId: ded.id, entityLabel: ded.id, field: 'status', detail: { key: 'integrity.detail.deductionNotPosted', params: { amountHalalas: ded.amountHalalas, captainId: ded.captainId } }, counterpartType: 'driver', counterpartId: ded.captainId, deltaHalalas: ded.amountHalalas }))
      }
    }
    for (const payout of s.payouts) {
      const net = payout.payableHalalas - payout.cashDebtHalalas
      if (payout.state === 'due' && net < 0) {
        out.push(finding({ checkId: 'money.payout-net', severity: 'warning', entityType: 'payout', entityId: payout.captainId, entityLabel: payout.captainName, field: 'payableHalalas', detail: { key: 'integrity.detail.negativeNet', params: { payableHalalas: payout.payableHalalas, cashDebtHalalas: payout.cashDebtHalalas, netHalalas: net } }, deltaHalalas: net }))
      }
    }
    return { findings: out, recordsScanned: s.payouts.length + s.deductions.length }
  },
}

/**
 * The catalogue, in the order the pane lists it: references first (a dangling
 * id makes every later check about that record meaningless), then
 * contradictions, then within-record invariants, then money.
 */
const CHECKS: readonly CheckDefinition[] = [
  refTripLinks,
  refSubscriptionLinks,
  refPersonLinks,
  refTicketSubject,
  refMoneyParty,
  refLedgerSubject,
  agreePartyName,
  agreeEscrowAmount,
  agreeAggregateVsRecords,
  invariantStatusFields,
  invariantCounters,
  moneyTripSplit,
  moneyWalletBalance,
  moneyJournalBalance,
  moneyPayoutNet,
]

/** The catalogue is complete and has no strays. Asserted at module load, not in a test. */
if (CHECKS.length !== INTEGRITY_CHECK_IDS.length) {
  throw new Error(
    `The integrity catalogue and IntegrityCheckId disagree: ${CHECKS.length} definitions, ${INTEGRITY_CHECK_IDS.length} ids`,
  )
}

function describe(def: CheckDefinition): IntegrityCheck {
  const state = stateFor(def.id)
  return {
    id: def.id,
    group: def.group,
    titleKey: `integrity.check.${def.id}.title`,
    descriptionKey: `integrity.check.${def.id}.desc`,
    severity: def.severity,
    scope: def.scope,
    lastRunAt: state.lastRunAt,
    findingCount: state.findingCount,
    recordsScanned: state.recordsScanned,
  }
}

/* ═════════════════════════════ the client ════════════════════════════ */

/**
 * GET /api/v1/integrity/checks
 *   -> IntegrityCheck[]
 *
 * The catalogue with each check's last-run state. `findingCount: null` means
 * *not run in this session*; `0` means *ran and found nothing*. Two different
 * facts, and the pane renders them differently.
 */
export async function listIntegrityChecks(signal?: AbortSignal): Promise<IntegrityCheck[]> {
  if (DATA_SOURCE === 'http') {
    return http.get<IntegrityCheck[]>('/integrity/checks', undefined, { signal })
  }
  return mock(INTEGRITY_OPERATIONS.checks, signal, () => CHECKS.map(describe))
}

/**
 * POST /api/v1/integrity/runs
 *   body: { checkIds?: IntegrityCheckId[] }
 *   -> IntegrityRun
 *
 * Omit `checkIds` to run everything. Running is an **explicit act** — nothing
 * on this pane scans on mount, because a scan that runs itself is a scan whose
 * results nobody dated.
 *
 * Findings come back ordered: severity first (`critical` before `warning`
 * before `advisory`), then check, then entity id. Legacy interleaves its
 * alerts with its expected gaps in `Object.keys` order, so *"a red row can sit
 * below 39 amber ones"* (`16b` §12 item 10) — an ordering is the cheapest fix
 * for that and it belongs on the server, where every consumer gets it.
 */
export async function runIntegrityChecks(
  params: { checkIds?: readonly IntegrityCheckId[]; signal?: AbortSignal } = {},
): Promise<IntegrityRun> {
  if (DATA_SOURCE === 'http') {
    return http.post<IntegrityRun>('/integrity/runs', { checkIds: params.checkIds }, { signal: params.signal })
  }

  /* Read first, outside `mock`: the snapshot is other clients' reads, each with
     its own operation id and its own injectable failure. `mock` then wraps the
     computation, so `?mockFail=integrity.run` fails the scan itself and
     `?mockFail=trips.list` fails it at the source — two distinct error states,
     both reachable. */
  const snapshot = await readSnapshot(params.signal)

  return mock(INTEGRITY_OPERATIONS.run, params.signal, () => {
    const selected = params.checkIds
      ? CHECKS.filter((c) => params.checkIds!.includes(c.id))
      : CHECKS
    if (selected.length === 0) {
      throw new Error(`No integrity check matches ${JSON.stringify(params.checkIds)}`)
    }

    runSequence += 1
    const findings: IntegrityFinding[] = []
    let recordsScanned = 0

    for (const def of selected) {
      const result = def.run(snapshot)
      findings.push(...result.findings)
      recordsScanned += result.recordsScanned
      checkState.set(def.id, {
        lastRunAt: EYVAR_NOW,
        findingCount: result.findings.length,
        recordsScanned: result.recordsScanned,
      })
    }

    return {
      id: `IRUN-${String(runSequence).padStart(4, '0')}`,
      ranAt: EYVAR_NOW,
      checkIds: selected.map((c) => c.id),
      checks: CHECKS.map(describe),
      findings: sortFindings(findings),
      recordsScanned,
    }
  })
}

const SEVERITY_RANK: Record<IntegritySeverity, number> = { critical: 0, warning: 1, advisory: 2 }

/** Severity, then check, then entity. Total and deterministic — never `Object.keys` order. */
export function sortFindings(findings: readonly IntegrityFinding[]): IntegrityFinding[] {
  return [...findings].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.checkId.localeCompare(b.checkId) ||
      a.entityId.localeCompare(b.entityId) ||
      a.field.localeCompare(b.field),
  )
}
