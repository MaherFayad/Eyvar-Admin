/**
 * Domain value → tone and copy key, for the enums the 360° profile is the first
 * surface to render.
 *
 * **The People enums are NOT restated here.** `DRIVER_STATUS`, `RIDER_STATUS`,
 * `APPLICANT_STATUS` and the two tier maps already exist in
 * `screens/operations/people/domain.ts`, they already carry the tone decisions
 * the data layer's type files specify, and a second copy would be a second
 * answer to "is a suspension warning or neutral". This module imports them and
 * adds only what has no home yet: trip, subscription, ticket, corporate, plan,
 * fairness-case and compliance-document status.
 *
 * R7 closes the tone set at five and **there is no red badge** (R5a). Every map
 * below obeys the same readings the existing ones do:
 *   terminal factual outcome → `neutral` (`Cancelled`, `Expired`, `Archived`)
 *   needs attention          → `warning`, ONE tone (R17); the LABEL separates
 *                              `Expiring` from `Expiring soon`
 *   live / settled           → `success`
 *   not yet live             → `info` / `new`
 */

import type {
  BadgeTone,
  ComplaintStatus,
  ComplianceDocState,
  CorporateAccountStatus,
  DisputeStatus,
  FairnessCaseStatus,
  PlanStatus,
  RequestStatus,
  SettlementState,
  SubscriptionStatus,
  TicketStatus,
  TripStatus,
} from '@/data/types'

export interface ToneAndKey {
  tone: BadgeTone
  key: string
}

/** `en-route` and `in-trip` are live work; `late` needs attention; the two ends are terminal. */
export const TRIP_STATUS: Readonly<Record<TripStatus, ToneAndKey>> = {
  requested: { tone: 'new', key: 'profile.tripStatus.requested' },
  assigned: { tone: 'info', key: 'profile.tripStatus.assigned' },
  'en-route': { tone: 'info', key: 'profile.tripStatus.en-route' },
  'in-trip': { tone: 'success', key: 'profile.tripStatus.in-trip' },
  done: { tone: 'success', key: 'profile.tripStatus.done' },
  late: { tone: 'warning', key: 'profile.tripStatus.late' },
  cancelled: { tone: 'neutral', key: 'profile.tripStatus.cancelled' },
  'no-show': { tone: 'neutral', key: 'profile.tripStatus.no-show' },
}

/**
 * `expiring` and `at-risk` are both *needs attention* and both take the ONE
 * warning tone (R17). They differ by label, which is the rule, not a shortcut.
 */
export const SUBSCRIPTION_STATUS: Readonly<Record<SubscriptionStatus, ToneAndKey>> = {
  active: { tone: 'success', key: 'profile.subStatus.active' },
  expiring: { tone: 'warning', key: 'profile.subStatus.expiring' },
  'at-risk': { tone: 'warning', key: 'profile.subStatus.at-risk' },
  frozen: { tone: 'info', key: 'profile.subStatus.frozen' },
  cancelled: { tone: 'neutral', key: 'profile.subStatus.cancelled' },
  expired: { tone: 'neutral', key: 'profile.subStatus.expired' },
}

/**
 * **One map, two surfaces, and the keys are the QUEUE's own.**
 *
 * `RequestsScreen` held this inline while the queue was the only surface that
 * drew a request. The request sheet draws the same six states, and a second map
 * would be a second answer to *is `no-drivers` warning or red* — a question
 * R5a has already ruled on (**no red badge**: `no-drivers` is `warning`, and
 * the escalation is carried by the row marker and the word).
 *
 * The copy keys are `requests.status.*`, unchanged, because `REQUESTS_EN` is
 * spread into the shell dictionary and a second spelling of `Searching` is how
 * two surfaces start disagreeing about a word.
 */
export const REQUEST_STATUS: Readonly<Record<RequestStatus, ToneAndKey>> = {
  searching: { tone: 'info', key: 'requests.status.searching' },
  offered: { tone: 'new', key: 'requests.status.offered' },
  assigned: { tone: 'success', key: 'requests.status.assigned' },
  'no-drivers': { tone: 'warning', key: 'requests.status.noDrivers' },
  expired: { tone: 'neutral', key: 'requests.status.expired' },
  cancelled: { tone: 'neutral', key: 'requests.status.cancelled' },
}

export const TICKET_STATUS: Readonly<Record<TicketStatus, ToneAndKey>> = {
  open: { tone: 'warning', key: 'profile.ticketStatus.open' },
  'in-progress': { tone: 'info', key: 'profile.ticketStatus.in-progress' },
  waiting: { tone: 'warning', key: 'profile.ticketStatus.waiting' },
  resolved: { tone: 'success', key: 'profile.ticketStatus.resolved' },
  closed: { tone: 'neutral', key: 'profile.ticketStatus.closed' },
}

export const CORPORATE_STATUS: Readonly<Record<CorporateAccountStatus, ToneAndKey>> = {
  Active: { tone: 'success', key: 'profile.corpStatus.Active' },
  Trial: { tone: 'info', key: 'profile.corpStatus.Trial' },
  Pending: { tone: 'new', key: 'profile.corpStatus.Pending' },
  Suspended: { tone: 'neutral', key: 'profile.corpStatus.Suspended' },
}

export const PLAN_STATUS: Readonly<Record<PlanStatus, ToneAndKey>> = {
  draft: { tone: 'info', key: 'profile.planStatus.draft' },
  active: { tone: 'success', key: 'profile.planStatus.active' },
  archived: { tone: 'neutral', key: 'profile.planStatus.archived' },
}

/**
 * `types/fairness.ts` states these four tones and its reason: *"a high overturn
 * rate is not a failure — it means the appeal route is doing its job"*, so an
 * overturn is `success` and neither disposition is red.
 */
export const FAIRNESS_STATUS: Readonly<Record<FairnessCaseStatus, ToneAndKey>> = {
  open: { tone: 'info', key: 'profile.caseStatus.open' },
  upheld: { tone: 'neutral', key: 'profile.caseStatus.upheld' },
  overturned: { tone: 'success', key: 'profile.caseStatus.overturned' },
  withdrawn: { tone: 'neutral', key: 'profile.caseStatus.withdrawn' },
}

/**
 * **Per-document labels only.** The TONES for `ComplianceDocState` already exist
 * in `people/domain.ts` (`DOC_STATE`) and the `worstState` map including its
 * `null` case exists there too (`WORST_STATE`) — both are imported and used as
 * they are. What People has no key for is the state of a **single** document
 * read on its own line: its `worst.*` strings say `All valid` and `No file`,
 * which are answers about the whole file and read wrongly beside one date.
 *
 * So this map is labels, keyed by the same enum, and the tone still comes from
 * People. One tone decision, two label registers, no second answer to "is
 * `critical` warning or neutral".
 */
export const DOC_STATE_LABEL: Readonly<Record<ComplianceDocState, string>> = {
  valid: 'profile.docState.valid',
  expiring: 'profile.docState.expiring',
  critical: 'profile.docState.critical',
  expired: 'profile.docState.expired',
}

/**
 * Complaint status. Four values, and the two beyond legacy's `Open`/`Resolved`
 * are `types/complaint.ts`'s own argument: `withdrawn` exists so the rider
 * dropping it does not mean **deleting the row**, and `under-review` exists so
 * the middle state can be filtered on rather than inferred from a claim chip.
 */
export const COMPLAINT_STATUS: Readonly<Record<ComplaintStatus, ToneAndKey>> = {
  open: { tone: 'warning', key: 'profile.complaintStatus.open' },
  'under-review': { tone: 'info', key: 'profile.complaintStatus.under-review' },
  resolved: { tone: 'success', key: 'profile.complaintStatus.resolved' },
  /* A withdrawal is a terminal factual outcome, like `Rejected` (V-07). */
  withdrawn: { tone: 'neutral', key: 'profile.complaintStatus.withdrawn' },
}

/**
 * Dispute status — **the keys are `screens/support/disputes/copy.ts`'s**, not a
 * second set. That screen owns the vocabulary; this map only says which tone
 * each value takes on a profile card, and it takes the same three readings
 * every other status map in this file does.
 */
export const DISPUTE_STATUS: Readonly<Record<DisputeStatus, ToneAndKey>> = {
  open: { tone: 'warning', key: 'dispute.status.open' },
  'under-review': { tone: 'info', key: 'dispute.status.under-review' },
  resolved: { tone: 'success', key: 'dispute.status.resolved' },
}

/**
 * **Settlement is the one status whose tone is NOT decided here.**
 *
 * `SETTLEMENT_BADGE_TONE` (`types/ledger.ts`) is §7.2 verbatim, and two of its
 * ten values are deliberately `null`: `failed` and `escalated` get **no badge
 * at all**, because R5a spends red on four things and a returned payment is not
 * one of them, and a fifth tone is not on offer either. So this map is labels
 * only — `fin.settlement.*`, which `screens/financials/copy.ts` already owns —
 * and the caller reads the tone from the data layer and renders **plain text**
 * where it is `null`. Minting a tone for those two here would quietly undo the
 * decision the data layer's own test asserts.
 */
export const SETTLEMENT_LABEL_KEY = (state: SettlementState): string =>
  `fin.settlement.${state}`
