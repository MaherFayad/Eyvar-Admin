/**
 * Support › Disputes & Lost and Found — every operator-facing string, as keys
 * (**AC-74**), with no concatenation anywhere (**AC-75**).
 *
 * The screen this replaces made **29 `t(key, { defaultValue: 'English' })`
 * calls** and defined not one of those keys — `REMEDIATION-PLAN.md` §4.2 counts
 * them. Every one of them resolved only through the `defaultValue` hatch at
 * `lib/i18n/translate.ts:98`, which means they could never be translated: an
 * Arabic dictionary has no key to hold them.
 *
 * Two things in here are **data-layer** keys rather than screen copy, and they
 * are here because this is the module that owns the vocabulary:
 *
 * - `dispute.posting.settlement` is a `LocalisedText` minted by
 *   `clients/disputes.ts` for the captain settlement's ledger posting.
 *   `src/i18n/localisedKeys.test.ts` fails the build if it is missing.
 * - the `dispute.status.*`, `dispute.kind.*` and `dispute.outcome.*` families
 *   are the closed unions in `types/dispute.ts`. One label per member, so a
 *   seventh member is a missing key at build time rather than a raw
 *   `vehicle-damage` printed at an operator.
 *
 * Copy rules applied: sentence case, a verb on every button, no terminal period
 * on a label, R6 on periods in body text (`docs/ref/copy.md`).
 */

import type { Dictionary } from '@/lib'

export const DISPUTES_EN: Dictionary = {
  /* ── the page ─────────────────────────────────────────────────────── */
  'dispute.meta#one': '1 claim',
  'dispute.meta#other': '{count} claims',
  'dispute.lf.meta#one': '1 report',
  'dispute.lf.meta#other': '{count} reports',

  'dispute.search': 'Search by claim, claimant, captain, trip or ID',
  'dispute.lf.search': 'Search by item, rider, captain, trip or ID',

  /* ── the disputes table ───────────────────────────────────────────── */
  'dispute.col.case': 'Claim',
  'dispute.col.what': 'What is claimed',
  'dispute.col.parties': 'Parties',
  'dispute.col.amount': 'Claimed (SAR)',
  'dispute.col.status': 'Status',
  'dispute.col.due': 'Verdict due',
  'dispute.col.outcome': 'Verdict',

  /* §8.3 — a closed set of kinds, one label each. */
  'dispute.kind.no-show': 'Captain no-show',
  'dispute.kind.vehicle-class': 'Wrong vehicle class',
  'dispute.kind.fare-dispute': 'Fare disputed',
  'dispute.kind.toll-charge': 'Toll or levy',
  'dispute.kind.cancellation-fee': 'Cancellation fee',
  'dispute.kind.vehicle-damage': 'Vehicle damage',

  'dispute.status.open': 'Open',
  'dispute.status.under-review': 'Under review',
  'dispute.status.resolved': 'Resolved',

  'dispute.outcome.full-refund': 'Refunded in full',
  'dispute.outcome.partial-refund': 'Part refunded',
  'dispute.outcome.goodwill-credit': 'Goodwill credit',
  'dispute.outcome.declined': 'Declined',

  /* ONE key per shape. Never a fragment joined to a value (AC-75). */
  'dispute.line.claimant': 'Claimant {name}',
  'dispute.line.against': 'Against {name}',
  'dispute.line.noAgainst': 'No party named',
  'dispute.line.owner': 'With {name}',
  'dispute.line.unowned': 'Nobody has taken this',
  'dispute.line.settled': '{outcome} · {amount}',
  'dispute.line.settledNothing': '{outcome} · no money moved',

  /* ── the disputes row actions (§11.2 — disabled in place, with a reason) ── */
  'dispute.action.take': 'Take claim',
  'dispute.action.take.blocked.resolved': 'This claim has already been decided.',
  'dispute.action.take.blocked.owned': '{name} is already working on it.',
  'dispute.action.take.blocked.permission': 'You cannot take claims. Ask an Owner for the “Ticket handling” permission.',
  'dispute.action.resolve': 'Resolve claim',
  'dispute.action.resolve.blocked.resolved': 'Decided on {date}. A verdict is not reversed here.',
  'dispute.action.resolve.blocked.permission': 'You cannot resolve claims. Ask an Owner for the “Ticket handling” permission.',

  /* ── the disputes empty and error states ──────────────────────────── */
  'dispute.empty.heading': 'No claims to answer',
  'dispute.empty.body': 'Fare adjustments, cancellation fees and property damage claims arrive here from the support ticket that raised them.',
  'dispute.empty.noMatch': 'No claims match these filters.',
  'dispute.error.read': 'The claims could not be loaded.',

  /* ── lost and found ───────────────────────────────────────────────── */
  'dispute.lf.col.case': 'Report',
  'dispute.lf.col.item': 'Item',
  'dispute.lf.col.rider': 'Rider',
  'dispute.lf.col.captain': 'Captain and trip',
  'dispute.lf.col.status': 'Status',
  'dispute.lf.col.reported': 'Reported',

  'dispute.lf.status.searching': 'Searching',
  'dispute.lf.status.with-captain': 'With the captain',
  'dispute.lf.status.returned': 'Returned',
  'dispute.lf.status.unrecoverable': 'Not recovered',

  'dispute.lf.line.captain': '{name} · {trip}',
  'dispute.lf.line.noCaptain': 'No captain on the report · {trip}',

  'dispute.lf.action.found': 'Captain has it',
  'dispute.lf.action.found.blocked.noCaptain': 'This report names no captain, so nobody can be asked to check the vehicle.',
  'dispute.lf.action.found.blocked.past': 'This report is already past that step.',
  'dispute.lf.action.found.blocked.permission': 'You cannot update reports. Ask an Owner for the “Ticket handling” permission.',
  'dispute.lf.action.returned': 'Mark returned',
  'dispute.lf.action.returned.blocked.searching': 'The captain has not confirmed they have it yet.',
  'dispute.lf.action.returned.blocked.done': 'This item is already back with its owner.',
  'dispute.lf.action.returned.blocked.permission': 'You cannot update reports. Ask an Owner for the “Ticket handling” permission.',

  'dispute.lf.empty.heading': 'Nothing has been left behind',
  'dispute.lf.empty.body': 'Items reported missing after a trip appear here, from the moment a rider tells us until the moment the item is back.',
  'dispute.lf.empty.noMatch': 'No reports match these filters.',
  'dispute.lf.error.read': 'The lost property reports could not be loaded.',

  'dispute.lf.action.unrecoverable': 'Stop searching',
  'dispute.lf.action.blocked.unrecoverable': 'The search for this item was given up.',
  'dispute.lf.unrecoverable.title': 'Stop searching for {id}?',
  'dispute.lf.unrecoverable.body':
    'The report closes as not recovered and leaves the open views. The rider, the captain and the trip stay on the record.',
  'dispute.lf.unrecoverable.confirm': 'Give up the search',
  'dispute.lf.unrecoverable.reason': 'Why',
  'dispute.lf.unrecoverable.reasonHelp': 'The rider will be told. Say what was tried.',
  'dispute.lf.unrecoverable.reasonMessage': 'Say what was tried before giving up.',
  'dispute.lf.toast.unrecoverable': '{id} closed as not recovered',

  /* ── the detail (S-7) ─────────────────────────────────────────────── */
  'dispute.a11y.open': 'Open claim {id}',
  'dispute.detail.meta': '{id} · {claimant} · {amount}',
  'dispute.detail.back': 'Back to claims',
  'dispute.detail.notFound': 'That claim is not on record',
  'dispute.detail.notFoundBody': 'Nothing here answers to {id}. It may have been merged, or the link may be old.',
  'dispute.detail.trip': 'Trip',
  'dispute.detail.subscription': 'Subscription',
  'dispute.detail.ticket': 'Ticket',
  'dispute.detail.verdict': 'Verdict',
  'dispute.banner.one': '1 claim is past its verdict deadline.',
  'dispute.banner.other': '{count} claims are past their verdict deadline.',

  /* ── raising a claim, reporting an item (§5.6) ────────────────────── */
  'dispute.new': 'New claim',
  'dispute.new.title': 'Raise a claim',
  'dispute.new.desc': 'What is claimed, by whom, and for how much. The verdict is owed within 48 hours.',
  'dispute.new.claimant': 'Claimant',
  'dispute.new.claimant.placeholder': 'Search riders and captains by name or ID',
  'dispute.new.claimant.searching': 'Searching…',
  'dispute.new.claimant.none': 'Nobody matches. Try the ID.',
  'dispute.new.claimant.change': 'Change',
  'dispute.new.kind': 'What is claimed',
  'dispute.new.kind.placeholder': 'Choose a kind',
  'dispute.new.amount': 'Amount claimed (SAR)',
  'dispute.new.amount.help': 'The ceiling a settlement may not exceed.',
  'dispute.new.trip': 'Trip',
  'dispute.new.claim': 'In their words',
  'dispute.new.claim.help': 'What the claimant said, as they said it.',
  'dispute.new.confirm': 'Raise claim',
  'dispute.new.saving': 'Raising…',
  'dispute.new.blocked.claimant': 'Choose who is claiming.',
  'dispute.new.blocked.kind': 'Choose what is claimed.',
  'dispute.new.blocked.amount': 'Enter the amount claimed.',
  'dispute.new.blocked.claim': 'Write the claim in their words.',
  'dispute.new.failed': 'The claim was not raised. {reason}',
  'dispute.toast.created': '{id} raised',

  'dispute.lf.new': 'New report',
  'dispute.lf.new.title': 'Report a lost item',
  'dispute.lf.new.desc': 'Which rider, what they left, and on which trip. The search starts now.',
  'dispute.lf.new.rider': 'Rider',
  'dispute.lf.new.rider.placeholder': 'Search riders by name or ID',
  'dispute.lf.new.item': 'What was left behind',
  'dispute.lf.new.trip': 'Trip',
  'dispute.lf.new.trip.help': 'The trip ID from the rider’s history. The captain on it is asked to check the vehicle.',
  'dispute.lf.new.confirm': 'Start the search',
  'dispute.lf.new.saving': 'Starting…',
  'dispute.lf.new.blocked.rider': 'Choose the rider.',
  'dispute.lf.new.blocked.item': 'Describe the item.',
  'dispute.lf.new.blocked.trip': 'Name the trip.',
  'dispute.lf.new.failed': 'The report was not created. {reason}',
  'dispute.lf.toast.created': '{id} is searching',

  /* ── the resolve modal ────────────────────────────────────────────── */
  'dispute.resolve.title': 'Resolve {id}',
  'dispute.resolve.desc': 'Decide {claimant}’s claim and record what moves.',
  'dispute.resolve.claimed': 'Claimed',
  'dispute.resolve.kind': 'Claim',
  'dispute.resolve.filed': 'Filed',
  'dispute.resolve.claim': 'In their words',

  'dispute.resolve.evidence': 'Evidence',
  'dispute.evidence.gps-trail': 'GPS trail',
  'dispute.evidence.app-events': 'App events',
  'dispute.evidence.contact-log': 'Contact log',
  'dispute.evidence.vehicle-registry': 'Vehicle registry',
  'dispute.evidence.trip-photo': 'Trip photo',
  'dispute.evidence.history': 'History',
  'dispute.resolve.noEvidence': 'Nothing was attached to this claim. Decide on what the claimant says, and say so in the note.',

  'dispute.resolve.verdict': 'Verdict',
  'dispute.resolve.amount': 'Amount to settle',
  'dispute.resolve.amountUnit': 'SAR',
  'dispute.resolve.amountHelp': 'Up to the {max} claimed.',
  'dispute.resolve.note': 'Why',
  'dispute.resolve.notePlaceholder': 'What the evidence showed, and what you told them',

  /* The derived line. §8 derived-value field: it states the consequence in
     words before the operator commits, and it is computed, never typed. */
  'dispute.resolve.willMove.rider': 'Confirming credits {amount} to {name}’s rider wallet.',
  'dispute.resolve.willMove.captain': 'Confirming credits {amount} to {name}’s captain earnings.',
  'dispute.resolve.willMove.nothing': 'Confirming moves no money. The claim is recorded as declined.',

  'dispute.resolve.confirm': 'Confirm verdict',
  'dispute.resolve.submitting': 'Recording…',
  'dispute.resolve.cancel': 'Cancel',
  'dispute.resolve.blocked.amountRequired': 'Enter the amount to settle before confirming.',
  'dispute.resolve.blocked.amountAboveClaim': 'A settlement cannot exceed the {max} claimed.',
  'dispute.resolve.blocked.aboveCap': 'Above your cap of {cap}. Request approval to hand it on.',
  'dispute.resolve.capLine': 'Up to {cap}: your cap.',
  'dispute.resolve.requestApproval': 'Request approval',
  'dispute.toast.approvalRequested': 'Handed to {name} for approval',
  'dispute.audit.approvalRequested': 'Approval requested from {name}',
  'dispute.resolve.blocked.permission': 'You cannot resolve claims. Ask an Owner for the “Ticket handling” permission.',
  'dispute.resolve.failed': 'The verdict was not recorded and no money moved. {reason}',

  /* ── toasts ───────────────────────────────────────────────────────── */
  'dispute.toast.taken': '{id} is yours',
  'dispute.toast.resolved': '{id} settled — {amount} credited to {name}',
  'dispute.toast.declined': '{id} declined — no money moved',
  'dispute.toast.failed': '{id} was not resolved',
  'dispute.lf.toast.advanced': '{id} is now {status}',
  'dispute.lf.toast.failed': '{id} was not updated',

  /* ── minted by the DATA layer, resolved verbatim by `t()` ─────────── */
  'dispute.posting.settlement': 'Settlement of dispute {disputeId}',
}
