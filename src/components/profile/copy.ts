/**
 * The 360° profile's copy — one dictionary for **both** presentations.
 *
 * `ProfileLayer` (the drawer, `?entity=`) and `EntityPageScreen` (the full page,
 * `/entity/:entityId`) render the same sections from the same registry, so they
 * read the same keys. A string that existed twice is a string that drifts.
 *
 * Rules the copy follows
 *   `copy.md`  sentence case; a full sentence takes a period, a label does not
 *              (R6). No `please`, no `failed`, no blame.
 *   §3.5       an empty pair renders an explicit grey placeholder sentence,
 *              never blank — `profile.field.absent` is that sentence's short
 *              form and `—` is reserved for not-applicable (§8.3.1).
 *   §11.2      a section that cannot be built for this entity kind says **why**,
 *              in place. It is never hidden and never dressed as a failure.
 *   AC-75      every interpolation is a named placeholder inside a single key.
 */

import type { Dictionary } from '@/lib'

export const PROFILE_EN: Dictionary = {
  /* ── section headings (§6.2's card stack) ─────────────────────────── */
  'profile.section.identity': 'Identity',
  'profile.section.trips': 'Trips',
  'profile.section.subscriptions': 'Subscriptions',
  'profile.section.compliance': 'Compliance',
  'profile.section.commitment': 'Commitment',
  'profile.section.wallet': 'Wallet',
  'profile.section.payments': 'Payments',
  'profile.section.tickets': 'Tickets',
  'profile.section.disputes': 'Disputes',
  'profile.section.fairness': 'Fairness',
  'profile.section.movement': 'Movement',
  'profile.section.devices': 'Device',

  /* ── the right rail (§7.2 — status, summary and metadata only) ────── */
  'profile.rail.status': 'Status',
  'profile.rail.summary': 'Summary',
  'profile.rail.metadata': 'Metadata',

  /* ── the four states, per card ────────────────────────────────────── */
  'profile.state.error': "Couldn't load {section}.",
  'profile.state.retry': 'Try again',
  'profile.state.empty': 'Nothing recorded here yet.',
  'profile.state.emptyTrips': 'No trips recorded for this record yet.',
  'profile.state.emptySubscriptions': 'No subscriptions recorded for this record yet.',
  'profile.state.emptyTickets': 'No support tickets reference this record.',
  'profile.state.emptyDisputes': 'No dispute has been raised against this record.',
  'profile.state.emptyFairness': 'No fairness case names this captain.',
  'profile.state.emptyCommitment': 'No missed legs recorded. Commitment is clean.',
  'profile.state.emptyLedger': 'No money has moved on this ledger.',
  'profile.state.emptyMovement': 'No movement recorded for this record.',
  'profile.state.emptyCompliance': 'No documents are on file for this captain.',

  'profile.state.emptyPayments': 'No payments name this record.',
  /* Two empties that are ANSWERS, not gaps. A complaint filed in the rider's
     app was never a ticket, and a complaint that never escalated into a money
     claim is the ordinary and good outcome. Neither is "nothing yet". */
  'profile.state.emptyComplaintTicket': 'Filed in the app. No support ticket was opened for it.',
  'profile.state.emptyComplaintDispute': 'This complaint did not escalate into a money claim.',

  /* §11.2 — the section exists for this entity kind and its source does not.
     Stated in place, never hidden, never dressed as a failure.

     The card's HEADING sits directly above this sentence, so it names only the
     kind. `A Captain record has none.` under `Subscriptions` is a complete
     answer; repeating the heading inside the sentence would need a second,
     lower-case register for all twelve. */
  'profile.unavailable.noSource': 'A {kind} record has none.',

  /* ── field labels ─────────────────────────────────────────────────── */
  'profile.field.absent': 'Not recorded',
  /* §3.5 as amended — the header that opens the grouped-absence line. Reads as
     a label followed by the field names, so it takes a colon rather than a full
     stop: it introduces a list rather than making a statement. */
  'profile.field.absentMany': 'Not recorded:',
  'profile.field.id': 'Identity code',
  'profile.field.status': 'Status',
  'profile.field.kind': 'Record type',
  'profile.field.name': 'Name',
  'profile.field.phone': 'Phone',
  'profile.field.email': 'Email',
  'profile.field.city': 'City',
  'profile.field.address': 'Address',
  'profile.field.gender': 'Gender',
  'profile.field.joined': 'Joined',
  'profile.field.created': 'Created',
  'profile.field.nationalId': 'National ID',
  'profile.field.dateOfBirth': 'Date of birth',
  'profile.field.rating': 'Rating',
  'profile.field.tier': 'Tier',
  'profile.field.churnRisk': 'Churn risk',
  'profile.field.vehicle': 'Vehicle',
  'profile.field.vehicleClass': 'Vehicle class',
  'profile.field.plate': 'Plate',
  'profile.field.bank': 'Bank account',
  'profile.field.firstAction': 'First action',
  'profile.field.device': 'Device',
  'profile.field.appLanguage': 'App language',
  'profile.field.lastIp': 'Last IP',
  'profile.field.ipLocation': 'IP location',
  'profile.field.totalTrips': 'Trips completed',
  'profile.field.lifetimeValue': 'Lifetime value',
  'profile.field.walletBalance': 'Wallet balance',
  'profile.field.renewalRate': 'Renewal rate',
  'profile.field.quickRides': 'Quick rides',
  'profile.field.lastTrip': 'Last trip',
  'profile.field.monthEarnings': 'Earnings this month',
  'profile.field.onTime': 'On time',
  'profile.field.openComplaints': 'Open complaints',
  'profile.field.activeSubscriptions': 'Subscription slots',
  'profile.field.planAccess': 'Plan access',
  'profile.field.suspensionReason': 'Suspension reason',
  'profile.field.rider': 'Rider',
  'profile.field.captain': 'Captain',
  'profile.field.route': 'Route',
  'profile.field.pickup': 'Pickup',
  'profile.field.destination': 'Destination',
  'profile.field.startedAt': 'Started',
  'profile.field.endedAt': 'Ended',
  'profile.field.distance': 'Distance',
  'profile.field.duration': 'Duration',
  'profile.field.latenessMinutes': 'Late by',
  /* **AC-39** — the shell dictionary may not contain *please*, *invalid* or
     *failed*, and the guard scans every string rather than only the ones a
     screen calls an error. "Why it failed" tripped it. The rename is not a
     workaround: this is the label on a payment row that already reads
     `Failed`, so the word was carrying no information the row did not already
     give — and `Reason` is what the operator is actually looking for. */
  'profile.field.failureReason': 'Reason',
  'profile.field.detail': 'Statement',
  'profile.field.severity': 'Severity',
  'profile.field.resolution': 'Resolution',
  'profile.field.filedBy': 'Filed by',
  'profile.field.gateway': 'Gateway',
  'profile.field.instrument': 'Card',
  'profile.field.vat': 'VAT included',
  'profile.field.gatewayFee': 'Gateway fee',
  'profile.field.invoice': 'Invoice',
  'profile.field.capturedAt': 'Captured',
  'profile.field.settledAt': 'Settled',
  'profile.field.fare': 'Fare',
  'profile.field.driverEarnings': 'Captain earnings',
  'profile.field.platformCut': 'Platform cut',
  'profile.field.tip': 'Tip',
  'profile.field.extraStopFee': 'Extra stop fee',
  'profile.field.ratingGiven': 'Rating given',
  'profile.field.paymentId': 'Payment',
  'profile.field.plan': 'Plan',
  'profile.field.cycle': 'Cycle',
  'profile.field.legs': 'Legs used',
  'profile.field.paid': 'Paid',
  'profile.field.escrow': 'Escrow held',
  'profile.field.refunded': 'Refunded',
  'profile.field.frozenUntil': 'Frozen until',
  'profile.field.renewalLikelihood': 'Renewal likelihood',
  'profile.field.cancelledAt': 'Cancelled',
  'profile.field.cancellationReason': 'Cancellation reason',
  'profile.field.company': 'Company',
  'profile.field.contact': 'Contact',
  'profile.field.employees': 'Employees',
  'profile.field.totalSpend': 'Total spend',
  'profile.field.billingType': 'Billing',
  'profile.field.invoiceDay': 'Invoice day',
  'profile.field.nextInvoice': 'Next invoice',
  'profile.field.lastInvoice': 'Last invoice',
  'profile.field.subject': 'Subject',
  'profile.field.about': 'About',
  'profile.field.category': 'Category',
  'profile.field.reasonCode': 'Reason code',
  'profile.field.priority': 'Priority',
  'profile.field.owner': 'Owner',
  'profile.field.slaDue': 'Response due',
  'profile.field.messages': 'Messages',
  'profile.field.planNameAr': 'Arabic name',
  'profile.field.durationDays': 'Duration',
  'profile.field.executeDays': 'Legs per cycle',
  'profile.field.cancelCap': 'Free cancellations',
  'profile.field.commission': 'Commission',
  'profile.field.discount': 'Discount',
  'profile.field.classes': 'Classes',
  'profile.field.claimedBy': 'Claimed by',
  'profile.field.worstState': 'Worst document',
  'profile.field.docsOnFile': 'Documents on file',
  'profile.field.balance': 'Balance',
  'profile.field.pending': 'Pending',
  'profile.field.postings': 'Postings',
  'profile.field.direction': 'Direction',
  'profile.field.reference': 'Reference',
  'profile.field.postedAt': 'Posted',
  'profile.field.settlement': 'Settlement',
  'profile.field.strikes': 'Counting strikes',
  'profile.field.forfeited': 'Forfeited',
  'profile.field.unclaimed': 'Unclaimed',

  /* ── values that are not a record field ───────────────────────────── */
  'profile.value.days': '{count} days',
  'profile.value.km': '{value} km',
  'profile.value.minutes': '{count} min',
  'profile.value.percent': '{value}%',
  'profile.value.ratio': '{used} of {total}',
  'profile.value.stars': '{value} of 5',
  'profile.value.yes': 'Yes',
  'profile.value.no': 'No',
  'profile.value.tier': 'Tier {tier}',
  'profile.value.freezeDays': 'Freeze {count} days',
  'profile.value.waived': 'Waived',
  'profile.value.decayed': 'Aged out',
  'profile.value.counting': 'Counting',
  'profile.value.terminated': 'Terminated from plans',
  'profile.value.flagged': 'Flagged for review',
  'profile.value.desynced': 'Rider app out of sync',
  'profile.value.slaBreached': 'Response window missed',
  'profile.value.invoiceOverdue': 'Invoice overdue',
  'profile.value.multiSubException': 'Multi-subscription exception',
  'profile.value.declineFlag': 'Flagged for declines',
  'profile.value.manualFlag': 'Flagged manually',
  'profile.value.economy': 'Economy',
  'profile.value.comfort': 'Comfort',
  'profile.value.both': 'Economy and Comfort',
  'profile.value.none': 'None',

  /* ── entity kinds, for the metadata card's `Record type` row ──────── */
  'profile.kind.rider': 'Rider',
  'profile.kind.operator': 'Operator',
  'profile.field.role': 'Role',
  'profile.field.lastSignedIn': 'Last signed in',
  'profile.field.cap': 'Compensation cap',
  'profile.operator.noCap': 'No cap',
  'profile.operator.status.Active': 'Active',
  'profile.operator.status.Invited': 'Invited',
  'profile.operator.status.Suspended': 'Suspended',
  'profile.operator.section.access': 'Access',
  'profile.operator.effective': '{count} of {total} permissions',
  'profile.operator.override.plus': '+ {label}',
  'profile.operator.override.minus': '− {label}',
  'profile.operator.section.holding': 'Holding now',
  'profile.operator.holding.empty': 'Holding nothing right now.',
  'profile.operator.section.today': 'Recent activity',
  'profile.operator.today.empty': 'No entries yet.',
  'profile.operator.openActivity': 'Open in Activity Log',
  'profile.operator.section.sessions': 'Sessions',
  'profile.operator.sessions.empty': 'Signed in on no device.',
  'profile.operator.section.onboarding': 'Getting started',
  'profile.operator.onboarding.progress': '{done} of {total} steps',
  'profile.operator.onboarding.complete': 'Completed',
  'profile.operator.section.onCall': 'On-call',
  'profile.operator.onCall.primary': 'Primary on call',
  'profile.operator.onCall.secondary': 'Secondary on call',
  'profile.operator.onCall.none': 'Not on the rota',
  /* WP-5.6 — the digest is a personal preference; only the signed-in
     operator's own card can write it (`selfOnly` is the reason a colleague's
     card gives when the switch is disabled in place, D9 CQ-3). */
  'profile.operator.section.notifications': 'Notifications',
  'profile.operator.notifications.digest': 'Daily alert digest',
  'profile.operator.notifications.digest.hint': 'One notification each morning summarising the alerts that fired in the last 24 hours.',
  'profile.operator.notifications.selfOnly': 'Only this operator can change their own digest setting.',
  'profile.operator.notifications.failed': 'Wasn’t saved. Try again.',
  'profile.kind.driver': 'Captain',
  'profile.kind.trip': 'Trip',
  'profile.kind.subscription': 'Subscription',
  'profile.kind.payment': 'Payment',
  'profile.kind.complaint': 'Complaint',
  'profile.kind.new-rider': 'New rider',
  'profile.kind.applicant': 'Applicant',
  'profile.kind.ticket': 'Ticket',
  'profile.kind.corporate-account': 'Corporate account',
  'profile.kind.plan': 'Plan',
  /* **`Ride request`, not `Request`.** The word alone is what an operator calls
     every queue in the console; the noun has to say which. */
  'profile.kind.request': 'Ride request',

  /* ── statuses this module is the first to need a label for ────────── */
  'profile.tripStatus.requested': 'Requested',
  'profile.tripStatus.assigned': 'Assigned',
  'profile.tripStatus.en-route': 'On the way',
  'profile.tripStatus.in-trip': 'In trip',
  'profile.tripStatus.done': 'Completed',
  'profile.tripStatus.late': 'Late',
  'profile.tripStatus.cancelled': 'Cancelled',
  'profile.tripStatus.no-show': 'No show',

  'profile.subStatus.active': 'Active',
  'profile.subStatus.expiring': 'Expiring',
  'profile.subStatus.at-risk': 'At risk',
  'profile.subStatus.frozen': 'Frozen',
  'profile.subStatus.cancelled': 'Cancelled',
  'profile.subStatus.expired': 'Expired',

  'profile.ticketStatus.open': 'Open',
  'profile.ticketStatus.in-progress': 'In progress',
  'profile.ticketStatus.waiting': 'Waiting',
  'profile.ticketStatus.resolved': 'Resolved',
  'profile.ticketStatus.closed': 'Closed',

  'profile.corpStatus.Active': 'Active',
  'profile.corpStatus.Trial': 'Trial',
  'profile.corpStatus.Pending': 'Pending',
  'profile.corpStatus.Suspended': 'Suspended',

  'profile.planStatus.draft': 'Draft',
  'profile.planStatus.active': 'Active',
  'profile.planStatus.archived': 'Archived',

  'profile.caseStatus.open': 'Open',
  'profile.caseStatus.upheld': 'Upheld',
  'profile.caseStatus.overturned': 'Overturned',
  'profile.caseStatus.withdrawn': 'Withdrawn',

  'profile.caseKind.suspension-appeal': 'Suspension appeal',
  'profile.caseKind.rating-dispute': 'Rating dispute',
  'profile.caseKind.rider-report': 'Rider report',

  'profile.docState.valid': 'Valid',
  'profile.docState.expiring': 'Expiring',
  'profile.docState.critical': 'Expiring soon',
  'profile.docState.expired': 'Expired',
  'profile.docState.unknown': 'No file on record',

  /* `Payment` and `Complaint` are first-class resources now — both were ids on
     other records until `clients/payments.ts` and `clients/complaints.ts`
     landed, and `record.ts`'s `unbacked` arm went with them. These are the
     labels the two new kinds needed and nothing else had.

     **Settlement is NOT here.** `fin.settlement.*` already exists
     (`screens/financials/copy.ts`), and its tone comes from
     `SETTLEMENT_BADGE_TONE`, which returns `null` for `failed` and `escalated`
     because R5a spends red on four things and neither is one of them. */
  'profile.paymentKind.subscription-charge': 'Subscription charge',
  'profile.paymentKind.quick-ride-fare': 'Quick ride fare',
  'profile.paymentKind.wallet-topup': 'Wallet top-up',
  'profile.paymentKind.captain-payout': 'Captain payout',

  'profile.complaintStatus.open': 'Open',
  'profile.complaintStatus.under-review': 'Under review',
  'profile.complaintStatus.resolved': 'Resolved',
  /* A withdrawal is a terminal factual outcome, not a dismissal — the rider
     dropped it and nobody decided anything. */
  'profile.complaintStatus.withdrawn': 'Withdrawn',

  'profile.complaintCategory.punctuality': 'Late arrival',
  'profile.complaintCategory.no-show': 'Captain no-show',
  'profile.complaintCategory.cancellation': 'Cancellation',
  'profile.complaintCategory.route': 'Route taken',
  'profile.complaintCategory.conduct': 'Conduct',
  'profile.complaintCategory.fare': 'Fare charged',
  'profile.complaintCategory.off-platform-payment': 'Payment off the platform',
  'profile.complaintCategory.safety': 'Safety',
  'profile.complaintCategory.vehicle-condition': 'Vehicle condition',
  'profile.complaintCategory.other': 'Other',

  'profile.complaintSeverity.critical': 'Critical',
  'profile.complaintSeverity.high': 'High',
  'profile.complaintSeverity.normal': 'Normal',

  'profile.planAccess.granted': 'Granted',
  'profile.planAccess.frozen': 'Frozen',
  'profile.planAccess.terminated': 'Terminated',

  /* ── the ledger card (§6.2: six rows, newest first, no balance column) ── */
  'profile.ledger.title': '{account}',
  'profile.ledger.truncated': 'Showing the {shown} most recent of {total} postings.',
  'profile.ledger.credit': 'Credit',
  'profile.ledger.debit': 'Debit',

  /* ── list truncation, shared by every list card ───────────────────── */
  'profile.list.truncated': 'Showing {shown} of {total}.',
}
