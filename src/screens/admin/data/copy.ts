/**
 * Admin › Data & Compliance — every operator-facing string on the three cards:
 * the dataset export, the retention schedules, and the **data integrity pane**
 * (P6-T4).
 *
 * The `integrity.check.*` and `integrity.detail.*` families are the ones to
 * read carefully. They are minted by `clients/integrity.ts` as keys — a check's
 * description and a finding's sentence both cross the seam as `{ key, params }`
 * and are resolved here — so **the wording of a finding is a copy decision, not
 * a data one**. That is the whole reason `LocalisedText` exists: legacy builds
 * `'Trips: ' + stored + ' vs ' + derived` (`:18592`), which cannot be
 * translated, cannot be re-worded without editing a scan function, and puts the
 * numbers in the order English happens to want them.
 *
 * Rules applied (`docs/ref/copy.md`)
 *   1   sentence case throughout.
 *   2   buttons are verbs: `Run all checks`, `Export dataset`, `Save schedules`.
 *   4   errors are imperatives naming the fix, with no blame and no `failed`.
 *   6   no period on a badge, a button or a column heading; sentences take one.
 *  10   **no-data is stated in words.** The good empty here says *every check
 *       passed* — a success, not an absence. A check that has never been run
 *       says so in different words again, because "not run" and "found nothing"
 *       are the two facts this whole pane exists to keep apart.
 *
 * A note on the money placeholders: every param whose name ends in `Halalas` is
 * formatted by `formatLocalisedText` with `formatMoney`, so these templates
 * never carry a currency symbol or a decimal point of their own.
 */

import type { Dictionary } from '@/lib'

export const ADMIN_DATA_EN: Dictionary = {
  'adminData.meta': 'Data exports, retention schedules and the integrity checks behind them',

  /* ═══════════════════════ the integrity pane ═══════════════════════ */

  'adminData.integrity.title': 'Data integrity',
  'adminData.integrity.desc':
    'Checks that compare what a record stores against the records behind it. Every finding names the check that produced it, so you can tell a real problem from a rule that has gone stale.',

  /* Running is an explicit act. Legacy re-scans on every navigation to
     `settings` (`:8819`), which is why nobody there can date a result. */
  'adminData.integrity.run': 'Run all checks',
  'adminData.integrity.rerun': 'Run all checks again',
  'adminData.integrity.running': 'Running checks',
  'adminData.integrity.runOne': 'Run',
  'adminData.integrity.runOne.a11y': 'Run the check: {check}',
  'adminData.integrity.runningOne': 'Running',

  'adminData.integrity.col.check': 'Check',
  'adminData.integrity.col.lastRun': 'Last run',
  'adminData.integrity.col.findings': 'Findings',
  'adminData.integrity.col.severity': 'Severity',
  'adminData.integrity.col.action': 'Action',

  'adminData.integrity.neverRun': 'Not run yet',
  'adminData.integrity.clean': 'Passed',
  'adminData.integrity.findingCount': '{count} found',
  'adminData.integrity.scanned': '{count} records read',
  'adminData.integrity.runSummary':
    'Run {run} read {records} records across {checks} checks and found {findings}.',
  'adminData.integrity.runSummary.clean': 'Run {run} read {records} records across {checks} checks. Every check passed.',

  'adminData.integrity.group.reference': 'Dangling references',
  'adminData.integrity.group.contradiction': 'Records that disagree',
  'adminData.integrity.group.invariant': 'Records that disagree with themselves',
  'adminData.integrity.group.financial': 'Money that does not reconcile',

  /* R17 — `critical` and `warning` share one warning tone and are told apart by
     these words, never by a second fill. */
  'adminData.integrity.severity.critical': 'Critical',
  'adminData.integrity.severity.warning': 'Warning',
  'adminData.integrity.severity.advisory': 'Advisory',

  /* ── the findings table ── */

  /* Not `Findings` — the check list already has a `Findings` column, and two
     identical labels one card apart is how an operator reads a count as a
     heading. This names the whole set. */
  'adminData.integrity.findings.title': 'All findings',
  'adminData.integrity.findings.col.record': 'Record',
  'adminData.integrity.findings.col.check': 'Found by',
  'adminData.integrity.findings.col.problem': 'What is wrong',
  'adminData.integrity.findings.col.open': 'Open',
  'adminData.integrity.findings.open': 'Open record',
  'adminData.integrity.findings.open.a11y': 'Open {record}',
  'adminData.integrity.findings.unopenable': 'No page holds this record yet',
  'adminData.integrity.findings.field': 'Field {field}',
  'adminData.integrity.findings.counterpart': 'Disagrees with {id}',

  /* `16b` §12 item 9 — legacy caps at 40 rows with no way to see the rest.
     The cap is stated and it has an escape. */
  'adminData.integrity.findings.showing': 'Showing {shown} of {total} findings',
  'adminData.integrity.findings.showAll': 'Show all findings',

  'adminData.integrity.groupBy': 'Group by',
  'adminData.integrity.groupBy.check': 'Check',
  'adminData.integrity.groupBy.entity': 'Record type',
  'adminData.integrity.groupHeading.check': '{check} · {count}',
  'adminData.integrity.groupHeading.entity': '{entity} · {count}',

  'adminData.integrity.entity.rider': 'Riders',
  'adminData.integrity.entity.driver': 'Captains',
  'adminData.integrity.entity.trip': 'Trips',
  'adminData.integrity.entity.subscription': 'Subscriptions',
  'adminData.integrity.entity.ticket': 'Tickets',
  'adminData.integrity.entity.corporate-account': 'Corporate accounts',
  'adminData.integrity.entity.payout': 'Payouts',
  'adminData.integrity.entity.escrow-hold': 'Escrow holds',
  'adminData.integrity.entity.deduction': 'Deductions',
  'adminData.integrity.entity.ledger-posting': 'Ledger postings',
  'adminData.integrity.entity.journal-entry': 'Journal entries',

  /* ── the four states ── */

  'adminData.integrity.loading': 'Loading the integrity checks',
  'adminData.integrity.scanning': 'Reading records and applying every check',

  /* The FIRST-RUN empty: the checks exist, nobody has run them. Names what the
     pane is for, and its action starts the run. */
  'adminData.integrity.empty.heading': 'Find out where a stored total stops matching its records',
  'adminData.integrity.empty.body':
    'Nothing is scanned in the background. Run the checks and each one reports what it found, with its name on every row.',
  'adminData.integrity.empty.action': 'Run all checks',

  /* The GOOD empty (R8 `cleared`) — a success, not an absence. */
  'adminData.integrity.clear.heading': 'Every check passed',
  'adminData.integrity.clear.body':
    '{records} records were read and none of them disagreed with the records behind it.',

  'adminData.integrity.error.message': 'The checks could not read the records. Run them again.',
  'adminData.integrity.error.retry': 'Run again',
  'adminData.integrity.error.row': 'That check did not finish. Run it again.',

  /* §11.2 — an act nobody may take is disabled where it is, with the reason. */
  'adminData.integrity.blocked.permission': 'Your role cannot run the integrity checks.',

  /* ── the check catalogue: one title and one sentence per check ── */

  'integrity.check.ref.trip-links.title': 'Trips point at records that exist',
  'integrity.check.ref.trip-links.desc':
    'Every trip names a rider, a captain and a subscription. This check opens each of those ids and reports the ones that resolve to nothing.',

  'integrity.check.ref.subscription-links.title': 'Subscriptions point at records that exist',
  'integrity.check.ref.subscription-links.desc':
    'Every subscription names the rider who holds it and the captain who serves it. This check reports the ones whose ids resolve to nothing.',

  'integrity.check.ref.person-links.title': 'Rider and captain link lists resolve',
  'integrity.check.ref.person-links.desc':
    'A rider record lists its subscriptions, its trips and its corporate account; a captain lists its trips. This check opens every id in those lists.',

  'integrity.check.ref.ticket-subject.title': 'Tickets point at a customer who exists',
  'integrity.check.ref.ticket-subject.desc':
    'A ticket names a rider, a captain or a corporate account. This check looks the id up in the collection the ticket says it belongs to.',

  'integrity.check.ref.money-party.title': 'Money records name a party that exists',
  'integrity.check.ref.money-party.desc':
    'Payouts, escrow holds and deductions each name a captain, and some name a rider, a subscription or a trip. This check opens all of them.',

  'integrity.check.ref.ledger-subject.title': 'Ledger postings name a subject and an entry that exist',
  'integrity.check.ref.ledger-subject.desc':
    'A posting on a party account carries the id of that party, and belongs to a journal entry. This check opens both, and the posting a reversal says it reverses.',

  'integrity.check.agree.party-name.title': 'Two records agree on a person’s name',
  'integrity.check.agree.party-name.desc':
    'Trips, subscriptions, tickets, payouts, holds and deductions each carry a copy of a person’s name so a table can render without a second read. This check compares every copy against the record that owns the name.',

  'integrity.check.agree.escrow-amount.title': 'A subscription and its escrow hold agree',
  'integrity.check.agree.escrow-amount.desc':
    'A subscription shows the escrow held against it; Financials holds the record of that escrow. This check compares the two amounts and reports a subscription still showing escrow that has been released.',

  'integrity.check.agree.aggregate-vs-records.title': 'A lifetime total has records behind it',
  'integrity.check.agree.aggregate-vs-records.desc':
    'A rider or captain whose stored trip total is larger than what we hold is expected — we keep a recent window and billing keeps the lifetime. One whose stored total has nothing at all behind it is not, and that is what this check reports.',

  'integrity.check.invariant.status-fields.title': 'A status agrees with the fields that justify it',
  'integrity.check.invariant.status-fields.desc':
    'A subscriber holds a subscription, a late trip carries its lateness, a suspended captain carries a reason, a cancelled subscription carries the moment it was cancelled. This check reads each pair.',

  'integrity.check.invariant.counters.title': 'Counters on one record add up',
  'integrity.check.invariant.counters.desc':
    'Open subscription slots follow from the cap minus the active ones; completed trips cannot exceed the trips a plan includes. This check does the arithmetic.',

  'integrity.check.money.trip-split.title': 'A fare splits exactly',
  'integrity.check.money.trip-split.desc':
    'The fare, the captain’s earnings, the extra-stop fee and the Eyvar cut are one identity. Money is whole halalas, so any remainder at all means one of the four was computed somewhere else.',

  'integrity.check.money.wallet-balance.title': 'A wallet balance matches its ledger',
  'integrity.check.money.wallet-balance.desc':
    'The balance on a rider record and the closing balance of that rider’s wallet ledger are meant to be the same number from the same source. This check reads both.',

  'integrity.check.money.journal-balance.title': 'Every journal entry balances',
  'integrity.check.money.journal-balance.desc':
    'Debits equal credits on every entry, and both equal the total the entry states. An entry that does not balance is refused rather than written, so anything found here was written before that rule existed.',

  'integrity.check.money.payout-net.title': 'A payout’s net follows from the ledger',
  'integrity.check.money.payout-net.desc':
    'A deduction marked applied has moved money on the captain’s payable, and a payout still marked due does not owe a negative amount. This check reads the ledger for both.',

  /* ── what is wrong: one sentence per finding shape ── */

  'integrity.detail.danglingRider': 'No rider holds the id {id}.',
  'integrity.detail.danglingDriver': 'No captain holds the id {id}.',
  'integrity.detail.danglingTrip': 'No trip holds the id {id}.',
  'integrity.detail.danglingSubscription': 'No subscription holds the id {id}.',
  'integrity.detail.danglingCorporate': 'No corporate account holds the id {id}.',
  'integrity.detail.danglingJournalEntry': 'No journal entry holds the id {id}.',
  'integrity.detail.danglingPosting': 'No ledger posting holds the id {id}.',
  'integrity.detail.partyAccountWithoutSubject':
    'The account {account} is kept per party, and this posting names none.',

  'integrity.detail.nameDisagrees': 'Calls {id} “{carried}”. That record’s own name is “{canonical}”.',

  'integrity.detail.escrowWithoutHold':
    'Shows {amountHalalas} held in escrow. Financials holds no escrow against this subscription.',
  'integrity.detail.escrowAfterRelease':
    'Still shows {amountHalalas} held in escrow. Hold {id} is {settlement}.',
  'integrity.detail.holdWithoutEscrow':
    'Shows no escrow. Hold {id} holds {amountHalalas} against this subscription.',
  'integrity.detail.escrowAmountDisagrees':
    'Shows {subscriptionHalalas} held. Hold {id} holds {holdHalalas}, a difference of {deltaHalalas}.',

  'integrity.detail.aggregateWithoutRecords':
    'Stores a lifetime total of {stored} trips with no trip records behind it at all.',

  'integrity.detail.subscriberWithoutSubscription': 'Is marked a subscriber and holds no subscription.',
  'integrity.detail.onDemandWithSubscription': 'Is marked on-demand and holds {count} subscription.',
  'integrity.detail.lateWithoutMinutes': 'Is marked late and carries no lateness.',
  'integrity.detail.minutesWithoutLate': 'Is {status} and carries a lateness of {minutes} minutes.',
  'integrity.detail.planTripWithoutSubscription': 'Is a plan trip and names no subscription.',
  'integrity.detail.quickRideWithSubscription': 'Is a quick ride and names subscription {id}.',
  'integrity.detail.suspensionDisagrees': 'Reads {status} while its suspension flag reads {suspended}.',
  'integrity.detail.suspendedWithoutReason': 'Is suspended and carries no reason to show the captain.',
  'integrity.detail.frozenWithoutUntil': 'Is frozen and carries no date it thaws on.',
  'integrity.detail.cancelledWithoutTimestamp': 'Is cancelled and carries no moment of cancellation.',
  'integrity.detail.timestampWithoutCancelled': 'Reads {status} and carries a moment of cancellation.',
  'integrity.detail.reversalLinkDisagrees':
    'Is a {kind} posting, and its link to the posting it reverses does not match.',
  'integrity.detail.adjustmentWithoutReason': 'Is an adjustment and carries no reason code.',
  'integrity.detail.pendingCarriesBalance':
    'Is {settlement} and carries a running balance of {balanceHalalas}. A posting that has moved no money changes no balance.',

  'integrity.detail.slotsDisagree':
    'Shows {open} open slots against {active} active of {max}. The arithmetic gives {expected}.',
  'integrity.detail.overCapacity': 'Holds {active} subscriptions against a cap of {max}.',
  'integrity.detail.tripsOverIncluded': 'Records {completed} trips against the {included} the plan includes.',
  'integrity.detail.tripsOverRequired': 'Records {completed} trips against the {required} the hold requires.',

  'integrity.detail.fareSplitDisagrees':
    'Fare {fareHalalas} less earnings {earningsHalalas} less extras {extrasHalalas} leaves {deltaHalalas} unaccounted for beside a stated cut of {cutHalalas}.',
  'integrity.detail.walletDisagrees':
    'Stores a balance of {recordHalalas}. Its ledger closes at {ledgerHalalas}, a difference of {deltaHalalas}.',
  'integrity.detail.entryUnbalanced':
    'Debits {debitsHalalas} against credits {creditsHalalas}, out by {deltaHalalas}.',
  'integrity.detail.entryTotalDisagrees':
    'States a total of {statedHalalas} against lines summing to {linesHalalas}.',
  'integrity.detail.deductionNotPosted':
    'Is marked applied and moved nothing: no posting on {captainId} names it, so the payable is {amountHalalas} too high.',
  'integrity.detail.negativeNet':
    'Is due {payableHalalas} against a cash debt of {cashDebtHalalas}, which nets to {netHalalas}.',

  /* ═══════════════════════ the dataset export ═══════════════════════ */

  'adminData.export.title': 'Dataset export',
  'adminData.export.desc':
    'Exports a measure from the reporting layer over a window you choose. The file carries a header block naming the report, the window and the moment it was read, so the numbers stay attributable once they reach a spreadsheet.',

  'adminData.export.dataset': 'Dataset',
  'adminData.export.dataset.trips': 'Trips — completed and fares collected',
  'adminData.export.dataset.subscriptions': 'Subscriptions — started and cancelled',
  'adminData.export.dataset.captains': 'Captains — joined and registered',
  'adminData.export.dataset.riders': 'Riders — joined and activated',
  'adminData.export.dataset.revenue': 'Revenue — total and subscription',
  'adminData.export.dataset.support': 'Tickets and disputes',
  /* §11.2 — offered, disabled, and the reason stated where the option is. */
  'adminData.export.dataset.support.blocked': 'No support measure exists in the reporting layer yet',

  'adminData.export.format': 'File format',
  'adminData.export.format.csv': 'CSV',
  'adminData.export.format.jsonl': 'JSON Lines',
  'adminData.export.format.parquet': 'Apache Parquet',
  'adminData.export.format.blocked': 'Only CSV is produced today',

  'adminData.export.range': 'Window',
  'adminData.export.range.last-7d': 'Last 7 days',
  'adminData.export.range.last-30d': 'Last 30 days',
  'adminData.export.range.last-90d': 'Last 90 days',
  'adminData.export.range.last-365d': 'Last 365 days',

  'adminData.export.grain': 'Grain',
  'adminData.export.grain.day': 'Daily',
  'adminData.export.grain.week': 'Weekly',
  'adminData.export.grain.month': 'Monthly',

  'adminData.export.action': 'Export dataset',
  'adminData.export.running': 'Building the file',
  'adminData.export.toast': 'Downloaded {filename}',
  'adminData.export.error': 'The export could not be built. Try again.',
  'adminData.export.omitted':
    '{count} series were left out of the file because your role cannot read them. The file names each one.',

  /* ═══════════════════════ retention schedules ══════════════════════ */

  'adminData.retention.title': 'Retention schedules',
  'adminData.retention.desc':
    'How long each kind of record is kept before it is deleted or anonymised. Shortening a window destroys evidence you may still need — it must never be shorter than the payment provider’s dispute window.',

  'adminData.retention.audit': 'Audit and operational records',
  'adminData.retention.telemetry': 'High-frequency GPS telemetry',
  'adminData.retention.window': 'Operational data window',
  'adminData.retention.window.help':
    'How much trip history this console holds per customer. Lifetime totals stay a labelled billing reference and are never rebuilt here.',

  'adminData.retention.days': '{days} days',
  'adminData.retention.days.365': '365 days — one year',
  'adminData.retention.days.730': '730 days — two years, statutory',
  'adminData.retention.days.1825': '1,825 days — five years, ZATCA',
  'adminData.retention.days.30': '30 days',
  'adminData.retention.days.90': '90 days — standard',
  'adminData.retention.days.180': '180 days',
  'adminData.retention.months.12': '12 months',
  'adminData.retention.months.13': '13 months — a year plus headroom',
  'adminData.retention.months.24': '24 months',

  'adminData.retention.save': 'Save schedules',
  'adminData.retention.saving': 'Saving',
  'adminData.retention.saved': 'Retention schedules saved',
  'adminData.retention.unchanged': 'Nothing has changed yet',
  'adminData.retention.blocked': 'Your role cannot change retention schedules.',
  'adminData.retention.error': 'The schedules were not saved. Try again.',
  'adminData.retention.loading': 'Loading the retention schedules',
  'adminData.retention.lastSaved': 'Last saved {when} by {who}',
  'adminData.retention.neverSaved': 'Never changed',
}
