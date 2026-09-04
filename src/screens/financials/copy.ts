/**
 * Every operator-facing string on the seven Financials sub-tabs — **AC-442**,
 * **AC-443**, **AC-444**.
 *
 * The keys the DATA layer already emits are re-declared here rather than
 * invented: `fin.posting.*`, `fin.refused.*`, `fin.reconcile.*`,
 * `fin.deduction.*`, `fin.authority.*` and `fin.payout.failure.*` all arrive as
 * `LocalisedText` from `src/data`, and a screen that renders one without a line
 * in this file renders a raw key. `financials.copy.test.ts` asserts the cover
 * mechanically, so a fixture that grows a key fails the build rather than
 * shipping `fin.posting.somethingNew` to a Finance lead.
 *
 * Rules applied (`docs/ref/copy.md`)
 *   1   sentence case; only proper nouns and account labels capitalised.
 *   2   buttons are verbs. `Cancel` is the one permitted non-verb.
 *   4   **AC-429** — an error names the fix as an imperative and contains none
 *       of "please", "invalid", "failed to" or an apology. `financials.copy.test.ts`
 *       greps for all four.
 *   6   no period on a toast, a badge or a menu item; banner and empty-state
 *       SENTENCES take one.
 *   9   a confirmation says what will NOT change.
 *  10   end-of-list and no-data are stated in words, never as a blank.
 *
 * **AC-443, and it is the rule this file is most likely to lose.** Every
 * dynamic value sits in a NAMED PLACEHOLDER inside one key. There is no
 * sentence fragment anywhere below and nothing is assembled at a call site — a
 * money amount arrives already formatted by `formatMoney`, through
 * `localisedText()`, so the string a translator sees is whole.
 */

import type { Dictionary } from '@/lib'

export const FINANCIALS_EN: Dictionary = {
  /* ══════════════════ the ledger, shared by five sub-tabs ═══════════════ */

  /* **AC-321** — the column order is Date · Reference · Description · Debit ·
     Credit · Balance on every Financials ledger, and **AC-322** puts the unit
     in the header exactly once per money column and in no cell of it. */
  'fin.ledger.col.date': 'Date',
  'fin.ledger.col.reference': 'Reference',
  'fin.ledger.col.description': 'Description',
  'fin.ledger.col.debit': 'Debit (SAR)',
  'fin.ledger.col.credit': 'Credit (SAR)',
  'fin.ledger.col.balance': 'Balance (SAR)',

  /* **AC-317** — labelled opening and closing rows, emboldened on both sides.
     **AC-319** — the two column totals, stated rather than left to be added up. */
  'fin.ledger.opening': 'Opening balance',
  'fin.ledger.closing': 'Closing balance',
  'fin.ledger.totals': 'Debits {debits} · Credits {credits}',

  /* **AC-308** — the card header names its subject account in words and the
     sub-line states which direction increases the balance. Both come from the
     chart of accounts, so no screen writes an accounting convention of its own. */
  'fin.ledger.subject.platform': '{account}',
  'fin.ledger.subject.party': '{account} · {name}',
  'fin.ledger.normalSide.debit': 'A debit increases this balance.',
  'fin.ledger.normalSide.credit': 'A credit increases this balance.',

  /* **AC-312** — one line, one label, beneath the balance, and it must not read
     as part of it. */
  'fin.ledger.balance': 'Balance',
  'fin.ledger.pending': 'Pending',
  'fin.ledger.pending.help': 'Not in the balance until it settles.',

  /* **AC-320** — a truncated ledger says so in words. No ledger caps silently. */
  'fin.ledger.truncated': 'Showing {shown} of {total} postings',

  'fin.ledger.search': 'Search postings',
  'fin.ledger.source': 'View source',
  'fin.ledger.reversedBy': 'Reversed by {reference}',
  'fin.ledger.reverses': 'Reverses {reference}',

  /* §7.2's ten settlement states, in words, so **AC-310** holds with colour
     removed. `failed` and `escalated` have no badge tone — R5a gives them the
     row marker and these words instead. */
  'fin.settlement.settled': 'Settled',
  'fin.settlement.held': 'Held',
  'fin.settlement.authorised': 'Authorised',
  'fin.settlement.pending': 'Pending',
  'fin.settlement.reconciling': 'Reconciling',
  'fin.settlement.released': 'Released',
  'fin.settlement.reversed': 'Reversed',
  'fin.settlement.voided': 'Voided',
  /* **Not the word "failed".** `qa.copy.test.tsx` bans it across the whole
     dictionary and §7.2 only requires the state to be carried IN WORDS — so the
     words are the bank's own outcome, which is more precise anyway: the money
     did not leave. */
  'fin.settlement.failed': 'Returned by the bank',
  'fin.settlement.escalated': 'Escalated',

  /* ══════════════════ posting descriptions (data layer) ═════════════════ */

  'fin.posting.openingBalance': 'Opening balance carried forward',
  'fin.posting.promoCredit': 'Promotional credit',
  'fin.posting.referralBonus': 'Referral reward for introducing {refereeName}',
  'fin.posting.goodwillCredit': 'Goodwill credit',
  'fin.posting.compensationCredit': 'Rider compensation',
  'fin.posting.tripFare': 'Fare for trip {tripId}',
  'fin.posting.tripFarePart': 'Part fare for trip {tripId}',
  'fin.posting.tripEarnings': 'Earnings for trip {tripId}',
  'fin.posting.earningsAccrual': 'Earnings accrued {from} to {to}',
  'fin.posting.chargeback': 'Chargeback {reference}',

  /* Seven postings that arrived with the ledger fixture's enum-coverage pass —
     `SettlementState`'s previously-unreachable members and the invoice /
     credit-note lifecycle. Each is a `descriptionKey` on a posting, resolved
     verbatim by `t()`, so the build-time guard fails while any is absent.
     Written from each posting's own account, direction and params rather than
     from its key name: `invoiceVoided` is the credit that reverses
     `invoiceRaised` for the same reference, and saying so is the whole value of
     the line on a ledger somebody is reconciling. */
  'fin.posting.walletTopup': 'Wallet top-up',
  'fin.posting.invoiceRaised': 'Invoice {reference} raised',
  'fin.posting.invoiceVoided': 'Invoice {reference} voided',
  'fin.posting.payoutReleased': 'Payout {reference} released',
  'fin.posting.payoutReversed': 'Payout {reference} reversed',
  'fin.posting.creditNoteVatReversal': 'VAT reversed on credit note {noteNumber}',
  'fin.posting.gatewaySettlementPending': 'Awaiting gateway settlement {reference}',
  'fin.posting.chargebackReceivable': 'Chargeback raised against trip {tripId}',
  'fin.posting.subscriptionAuthorised': 'Subscription payment authorised',
  'fin.posting.refundIssued': 'Refund {reference} to {riderName}',
  'fin.posting.refundToWallet': 'Refund {reference} credited to the wallet',
  'fin.posting.cashTopup': 'Cash top-up collected by {captainName}',
  'fin.posting.cashTopupCollected': 'Cash top-up collected from {riderName}',
  'fin.posting.cashCommission': 'Commission on the cash fare for trip {tripId}',
  'fin.posting.cashCommissionBatch': 'Commission on {reports} cash reports',
  'fin.posting.cashCommissionUnreported': 'Commission on a cash fare never reported',
  'fin.posting.cashSurplus': 'Cash reported above the fare',
  'fin.posting.cashRepayment': 'Cash repayment received',
  'fin.posting.escrowHeld': 'Escrow held against subscription {subscriptionId}',
  'fin.posting.escrowReleased': 'Escrow {escrowId} released',
  'fin.posting.escrowReleasedToCaptain': 'Escrow released to {captainName}',
  'fin.posting.payout': 'Payout {reference}',
  'fin.posting.payoutFailed': 'Payout {reference} returned by the bank',
  'fin.posting.deductionApplied': 'Deduction {reference} applied',
  /* The receivable leg. When a deduction exceeds what this cycle's earnings can
     cover, the excess is debited to `ar.driver` — the captain cash receivable —
     and carries forward. Minted since wave 3 and defined nowhere until the
     `LocalisedText` guard in `i18n/localisedKeys.test.ts` found it. */
  'fin.posting.deductionReceivable': 'Deduction {reference} carried as a receivable',

  /* The `payment` resource landed after this file was written, and both of these
     are `LocalisedText` minted by `fixtures/payments.ts` and `clients/payments.ts`
     — so `t()` resolves them verbatim and `localisedKeys.test.ts` fails the build
     while either is absent. Written here rather than in the data layer because a
     sentence an operator reads is copy, and copy lives beside its screen. */
  'fin.payment.failure.insufficientFunds': 'The card was declined for insufficient funds.',
  'fin.payment.escalation.unsettledPastCycle':
    'Unsettled {days} days past its cycle — escalate to the gateway.',
  'fin.posting.emergencyCover': 'Emergency cover paid to the replacement',
  'fin.posting.emergencyForfeit': 'Emergency cover forfeited by the absentee',
  'fin.posting.adjustment': 'Adjustment · {reasonCode}',
  /* **AC-326** — the reversing row names the posting it reverses. */
  'fin.posting.reverses': 'Reverses {reference}',

  /* ══════════════════════ shared states and errors ══════════════════════ */

  /* **AC-429** — every one of these is an imperative naming the fix. */
  'fin.error.read': 'Change the period or the filters, then read again.',
  'fin.error.retry': 'Read again',
  'fin.error.mutation': 'Try that again.',
  'fin.error.row': 'That did not go through. Try again.',

  /* LR-4's second ledger empty: a window with nothing in it. NOT
     captain-specific -- the rider's wallet needs the identical sentence, and a
     second spelling under an entity prefix is how the two drift. No action: a
     window the operator did not narrow is not theirs to clear. */
  'fin.ledger.empty.period': 'No postings between {start} and {end}.',
  'fin.empty.noMatch': 'No postings match these filters.',
  'fin.empty.clear': 'Clear filters',
  'fin.empty.firstRun.heading': 'This account, posting by posting',
  'fin.empty.firstRun.body':
    'Postings appear the moment a fare, a payout or a credit touches this account.',
  'fin.empty.firstRun.action': 'Read the chart of accounts',

  /* ══════════════════════════════ Overview ══════════════════════════════ */

  'fin.overview.period': '{from} to {to}',
  'fin.overview.meta': 'Period {from} to {to}',
  'fin.overview.margin.heading': 'Contribution margin',
  'fin.overview.gross': 'Gross bookings',
  'fin.overview.captainEarnings': 'Captain earnings',
  'fin.overview.grossMargin': 'Gross margin',
  'fin.overview.giveback': 'Giveback',
  'fin.overview.contributionMargin': 'Contribution margin',
  'fin.overview.grossMarginPercent': 'Gross margin %',
  'fin.overview.contributionPercent': 'Contribution %',
  'fin.overview.giveback.heading': 'What was given back',
  'fin.overview.giveback.promo': 'Promotional discounts',
  'fin.overview.giveback.referral': 'Referral rewards',
  'fin.overview.giveback.incentive': 'Captain incentives',
  'fin.overview.giveback.refunds': 'Refunds',
  'fin.overview.giveback.goodwill': 'Goodwill credits',
  'fin.overview.giveback.emergency': 'Emergency cover',
  'fin.overview.positions.heading': 'Where the money is held',
  'fin.overview.pendingPayouts': 'Owed to captains',
  'fin.overview.escrowHeld': 'Escrow held',
  'fin.overview.escrowReady': 'Escrow ready to release',
  'fin.overview.captainDebt': 'Captain cash debt',
  'fin.overview.riderWalletLiability': 'Rider wallet balances',
  'fin.overview.tiles.heading': 'The period',
  /* **AC-353 states "every tile states the period it covers", and the five
     position tiles do not cover one.** `accountBalanceFrom` is a balance over
     every entry ever written, not a flow inside a window, so a period caption
     on those five would be a false statement about the number above it. They
     say what they are instead. Raised in the handoff as an AC / data-layer
     mismatch rather than papered over. */
  'fin.overview.asAt': 'Balance to date, outside the period.',
  /* Still `Previous month` / `Next month`, and still translated: the stepper
     survived the picker as a pair of chevrons, so these are now the buttons'
     ACCESSIBLE NAMES rather than their visible labels. Deleting them would
     have left two unlabelled glyphs. */
  'fin.overview.period.previous': 'Previous month',
  'fin.overview.period.next': 'Next month',

  /* §10.2's range popover. The five presets are the windows a close process
     recognises, on month boundaries; the calendar beside them is what makes
     any other window reachable without fifteen clicks of a stepper.

     `lastThreeMonths` INCLUDES the current month — a Finance lead asking for
     three months in June wants April, May and June, and a window stopping at
     May would silently exclude the period every other control is showing.
     `quarterToDate` is the CALENDAR quarter and is named so: Q-F8 is open and
     no fiscal year has been defined, so the day a close process disagrees with
     this preset, the label is what makes the disagreement visible. */
  'fin.period.presets': 'Reporting periods',
  'fin.period.preset.thisMonth': 'This month',
  'fin.period.preset.lastMonth': 'Last month',
  'fin.period.preset.lastThreeMonths': 'Last 3 months',
  'fin.period.preset.quarterToDate': 'Quarter to date',
  'fin.period.preset.yearToDate': 'Year to date',
  /* Announced beside the checked preset, for a reader who cannot see the tick
     (§7.5 — the check is a mark, so it needs a word). */
  'fin.period.active': 'Current period',
  'fin.period.from': 'From',
  'fin.period.to': 'To',
  'fin.period.apply': 'Apply',
  'fin.period.cancel': 'Cancel',

  /* **AC-351** — one critical banner, the difference in SAR, a link to the
     refused-postings view. **No tile turns red.** */
  'fin.overview.outOfBalance.title': 'The books are out of balance by {amount}.',
  'fin.overview.outOfBalance.body':
    'Total debits and total credits disagree. Every refused posting is kept and can be read.',
  'fin.overview.outOfBalance.action': 'Read refused postings',
  'fin.overview.refused.title': 'One posting was refused.',
  'fin.overview.refused.titleMany': '{count} postings were refused.',

  /* ═══════════════════════ Revenue & Refunds ════════════════════════════ */

  'fin.revenue.view.refunds': 'Refunds',
  'fin.revenue.view.creditNotes': 'Credit notes',
  'fin.revenue.view.margin': 'Contribution margin',

  'fin.revenue.byPlan.heading': 'Revenue by plan',
  'fin.revenue.byPlan.plan': 'Plan',
  'fin.revenue.byPlan.subs': 'Active subs',
  'fin.revenue.byPlan.trips': 'Trips',
  'fin.revenue.byPlan.gross': 'Gross (SAR)',
  'fin.revenue.byPlan.platform': 'Platform (SAR)',
  'fin.revenue.byPlan.captain': 'Captain (SAR)',
  'fin.revenue.byPlan.givebacks': 'Givebacks (SAR)',
  'fin.revenue.byPlan.contribution': 'Contribution (SAR)',
  'fin.revenue.byPlan.contributionPercent': 'Contrib %',
  'fin.revenue.byPlan.arpa': 'ARPA (SAR)',
  'fin.revenue.byPlan.platformPercent': 'Take rate %',
  'fin.revenue.byPlan.total': 'Total',

  'fin.refund.col.id': 'Refund',
  'fin.refund.col.rider': 'Rider',
  'fin.refund.col.amount': 'Amount (SAR)',
  'fin.refund.col.reason': 'Reason',
  'fin.refund.col.destination': 'Destination',
  'fin.refund.col.issued': 'Issued',
  'fin.refund.col.by': 'Issued by',
  'fin.refund.destination.instrument': 'Payment instrument',
  'fin.refund.destination.wallet': 'Rider wallet',
  'fin.refund.unsourced': 'No traceable payment',
  /* The view header's three figures, computed from the rows on screen. */
  'fin.refund.header.heading': 'Refunds issued',
  'fin.refund.header.count': 'Refunds',
  'fin.refund.header.total': 'Refunded',
  'fin.refund.search': 'Search refunds',
  'fin.refund.empty.heading': 'No refunds in this period',
  'fin.refund.empty.body': 'A refund appears here the moment one is issued, with its credit note.',
  'fin.refund.empty.action': 'Read the refunds ledger',

  'fin.creditNote.col.number': 'Credit note',
  'fin.creditNote.col.buyer': 'Buyer',
  'fin.creditNote.col.subtotal': 'Net (SAR)',
  'fin.creditNote.col.vat': 'VAT (SAR)',
  'fin.creditNote.col.total': 'Total (SAR)',
  'fin.creditNote.col.invoice': 'Against invoice',
  'fin.creditNote.col.issued': 'Issued',
  'fin.creditNote.unlinked': 'No matched invoice',
  'fin.creditNote.header.heading': 'Credit notes issued',
  'fin.creditNote.header.count': 'Notes',
  'fin.creditNote.header.vat': 'VAT',
  'fin.creditNote.search': 'Search credit notes',
  'fin.creditNote.empty.heading': 'No credit notes yet',
  'fin.creditNote.empty.body': 'Every refund mints one. They appear here as they are issued.',
  'fin.creditNote.empty.action': 'Read refunds',
  /* **AC-356** — a page banner with a count, and the row carries the critical
     signal. Never a fabricated invoice number. */
  'fin.creditNote.unlinked.title': 'One credit note has no matched invoice.',
  'fin.creditNote.unlinked.titleMany': '{count} credit notes have no matched invoice.',
  'fin.creditNote.unlinked.body': 'Each names no invoice rather than naming one it did not match.',
  'fin.creditNote.unlinked.action': 'Show only unmatched',

  /* ═══════════════════════ Payouts & Escrow ═════════════════════════════ */

  'fin.payouts.view.all': 'All postings',
  'fin.payouts.view.payouts': 'Payouts',
  'fin.payouts.view.escrow': 'Escrow',
  'fin.payouts.view.deductions': 'Deductions',

  'fin.payout.col.captain': 'Captain',
  'fin.payout.col.tier': 'Tier',
  'fin.payout.col.trips': 'Trips',
  'fin.payout.col.earned': 'Earned (SAR)',
  'fin.payout.col.payable': 'Payable (SAR)',
  'fin.payout.col.debt': 'Cash debt (SAR)',
  'fin.payout.col.net': 'Net payable (SAR)',
  'fin.payout.col.state': 'State',
  'fin.payout.state.due': 'Due',
  'fin.payout.state.processing': 'Processing',
  'fin.payout.state.paid': 'Paid',
  'fin.payout.state.failed': 'Returned by the bank',
  'fin.payout.state.reversed': 'Reversed',
  'fin.payout.search': 'Search captains',
  'fin.payout.action.pay': 'Pay',
  'fin.payout.action.ledger': 'View ledger',
  'fin.payout.back': 'Back to payouts',
  'fin.payout.blocked.nothing': 'Nothing is payable after cash debt.',
  'fin.payout.blocked.noBank': 'Add a bank account before paying this captain.',
  'fin.payout.blocked.permission':
    'You cannot pay a captain. Ask an Owner for the “Captain payouts” permission.',
  'fin.payout.empty.heading': 'No captain has earnings this period',
  'fin.payout.empty.body': 'A captain appears here as soon as a trip accrues earnings to them.',
  'fin.payout.empty.action': 'Read the payable ledger',
  /* **AC-366** — three labelled lines, and the transferred amount is the net. */
  'fin.payout.confirm.title': 'Pay {captain} {net}?',
  'fin.payout.confirm.body':
    'Payable {payable}, less cash debt {debt}, transfers {net}. The debt is cleared by this payout and nothing else about the captain changes.',
  'fin.payout.confirm.confirm': 'Pay',
  'fin.payout.toast.paid': 'Payout sent',
  /* **AC-367** — a page banner with a count, and the row carries the marker. */
  'fin.payout.failed.title': 'One payout was returned by the bank.',
  'fin.payout.failed.titleMany': '{count} payouts were returned by the bank.',
  'fin.payout.failed.body': 'The money did not leave. The payable balance is unchanged.',
  'fin.payout.failed.action': 'Show only returned',
  'fin.payout.failure.noBankAccount': 'No bank account on file',

  'fin.escrow.col.id': 'Hold',
  'fin.escrow.col.subscription': 'Subscription',
  'fin.escrow.col.captain': 'Captain',
  'fin.escrow.col.rider': 'Rider',
  'fin.escrow.col.amount': 'Amount (SAR)',
  'fin.escrow.col.progress': 'Progress',
  'fin.escrow.col.state': 'State',
  'fin.escrow.progress': '{completed}/{required} trips delivered',
  'fin.escrow.action.release': 'Release',
  'fin.escrow.blocked.trips': 'Release when every plan trip is delivered.',
  'fin.escrow.blocked.state': 'This hold is already {state}.',
  'fin.escrow.cancelled': 'Subscription cancelled mid-plan',
  'fin.escrow.search': 'Search holds',
  'fin.escrow.empty.heading': 'Nothing is held in escrow',
  'fin.escrow.empty.body': 'A plan subscription holds its captain earnings here until the trips are delivered.',
  'fin.escrow.empty.action': 'Read subscriptions',
  'fin.escrow.confirm.title': 'Release {amount} to {captain}?',
  'fin.escrow.confirm.body':
    'The hold stays on this list showing its released state, and the amount is credited to the captain payable ledger. The subscription is unaffected.',
  'fin.escrow.confirm.confirm': 'Release',
  'fin.escrow.toast.released': 'Escrow released',

  'fin.deduction.col.id': 'Deduction',
  'fin.deduction.col.captain': 'Captain',
  'fin.deduction.col.type': 'Reason',
  'fin.deduction.col.trip': 'Trip',
  'fin.deduction.col.amount': 'Amount (SAR)',
  'fin.deduction.col.status': 'Status',
  'fin.deduction.status.pending': 'Pending',
  'fin.deduction.status.applied': 'Applied',
  'fin.deduction.status.waived': 'Waived',
  'fin.deduction.waivedBy': 'Waived by {actor} · {reason}',
  'fin.deduction.search': 'Search deductions',
  'fin.deduction.action.apply': 'Apply',
  'fin.deduction.action.waive': 'Waive',
  'fin.deduction.blocked.decided': 'This deduction is already {state}.',
  'fin.deduction.empty.heading': 'No deductions raised',
  'fin.deduction.empty.body': 'A late pickup or a cleanliness report raises one against the captain.',
  'fin.deduction.empty.action': 'Read the payable ledger',
  'fin.deduction.apply.title': 'Apply {amount} against {captain}?',
  'fin.deduction.apply.body':
    'The amount comes off the captain payable balance. Anything the payable cannot cover becomes cash receivable rather than being written off.',
  'fin.deduction.apply.confirm': 'Apply',
  'fin.deduction.waive.title': 'Waive {amount} for {captain}?',
  'fin.deduction.waive.body':
    'The deduction stays on this list showing who waived it and why. The captain keeps the amount and nothing is posted.',
  'fin.deduction.waive.confirm': 'Waive',
  'fin.deduction.waive.reason.label': 'Reason',
  'fin.deduction.waive.reason.help': 'The captain reads this. Name what happened.',
  'fin.deduction.waive.reason.message': 'Enter a reason the captain can read.',
  'fin.deduction.toast.applied': 'Deduction applied',
  'fin.deduction.toast.waived': 'Deduction waived',
  /* The four raised in the fixtures. Legacy stores each as an English sentence
     inside the record (`:2807`); they are keys here. */
  'fin.deduction.latePickup': 'Late pickup',
  'fin.deduction.latePickupRepeat': 'Late pickup, repeated',
  'fin.deduction.riderNoShow': 'Rider no-show not reported',
  'fin.deduction.vehicleCleanliness': 'Vehicle cleanliness',

  /* ═══════════ the bulk bar — P4-T1, D21, §11.2 over a SET ═════════════ */

  /* **The rule these sentences encode (D21, RATIFIED).** A bulk command is
     refused if **any** selected record would be refused, the refusal **names
     the count**, and there is **no partial apply** — the one way out is the
     bar's own `Select only the N eligible`, which changes the selection by the
     operator's own act before the command becomes available. On a money
     surface that distinction is the whole thing: a half-applied bulk payout is
     a reconciliation incident, and the outcome toast must name the number that
     was on the bar (**AC-961**).

     **Three sentences per cause, not two.** D21: *"`.other` is wrong when every
     target is blocked"* — `4 of the selected payouts cannot be paid` is true of
     4-of-4 and invites the operator to believe a subset would work, when the
     right next act is to pick a different command.

       `.one`    one record selected, and it is refused
       `.other`  some of the selection is refused — the escape hatch renders
       `.all`    every selected record is refused — no escape hatch (**AC-960**)

     **The role refusal carries all three forms too**, rather than one flat
     sentence. It refuses the whole set, so in practice it is always the `.all`
     shape — and writing it as one count-free line would make the one refusal an
     operator most needs to recognise the only one that does not look like the
     others. **AC-962**: it outranks every domain cause, which is the order the
     `*_REFUSAL_ORDER` arrays declare.

     `{count}` is the **blocked** subset, formatted by `formatCount` so Arabic
     gets Arabic-Indic digits (D21 rendering rule 4). Never `String(n)`.

     **One key, one whole sentence** (AC-443). The rejected alternative is a
     frame with the row-level refusal interpolated into it — a sentence inside a
     sentence, which is the finding `fin.refused.*` already records. */

  'fin.bulk.pay.permission.one': 'This payout cannot be paid. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.pay.permission.other':
    '{count} of the selected payouts cannot be paid. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.pay.permission.all':
    'All {count} selected payouts cannot be paid. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.pay.noBank.one': 'This payout cannot be paid — no bank account is on file.',
  'fin.bulk.pay.noBank.other':
    '{count} of the selected payouts cannot be paid — no bank account is on file.',
  'fin.bulk.pay.noBank.all':
    'All {count} selected payouts cannot be paid — no bank account is on file.',
  'fin.bulk.pay.nothing.one': 'This payout cannot be paid — nothing is payable after cash debt.',
  'fin.bulk.pay.nothing.other':
    '{count} of the selected payouts cannot be paid — nothing is payable after cash debt.',
  'fin.bulk.pay.nothing.all':
    'All {count} selected payouts cannot be paid — nothing is payable after cash debt.',
  /* A **plural family** (`lib/i18n/plural.ts`) for the confirmation title, not a
     pair of caller-chosen keys: Arabic takes six cardinal forms and a call site
     is not the thing that should hold the CLDR table. `{count}` is the one
     numeric parameter, so every money value arrives pre-formatted.
     (The refusal cases above are NOT a plural family: `all` is a case, not a
     CLDR category, and no `Intl.PluralRules` can select it.) */
  'fin.bulk.pay.confirm.title#one': 'Pay 1 captain {net}?',
  'fin.bulk.pay.confirm.title#other': 'Pay {count} captains {net}?',
  'fin.bulk.pay.confirm.body':
    'Every captain is paid their own net — the payable less the cash debt on it. The totals above are for the whole selection. The debts are cleared by these payouts and nothing else about the captains changes.',
  'fin.bulk.pay.confirm.confirm': 'Pay',
  'fin.bulk.pay.toast': 'Payouts sent',

  'fin.bulk.release.permission.one': 'This hold cannot be released. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.release.permission.other':
    '{count} of the selected holds cannot be released. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.release.permission.all':
    'All {count} selected holds cannot be released. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.release.state.one':
    'This hold cannot be released — it is already released or reversed.',
  'fin.bulk.release.state.other':
    '{count} of the selected holds cannot be released — they are already released or reversed.',
  'fin.bulk.release.state.all':
    'All {count} selected holds cannot be released — they are already released or reversed.',
  'fin.bulk.release.trips.one': 'This hold cannot be released — not every plan trip is delivered.',
  'fin.bulk.release.trips.other':
    '{count} of the selected holds cannot be released — not every plan trip is delivered.',
  'fin.bulk.release.trips.all':
    'All {count} selected holds cannot be released — not every plan trip is delivered.',
  'fin.bulk.release.confirm.title#one': 'Release {amount} from 1 hold?',
  'fin.bulk.release.confirm.title#other': 'Release {amount} from {count} holds?',
  'fin.bulk.release.confirm.body':
    'Every hold stays on this list showing its released state, and each amount is credited to its own captain payable ledger. The subscriptions are unaffected.',
  'fin.bulk.release.confirm.confirm': 'Release',
  'fin.bulk.release.toast': 'Escrow released',

  'fin.bulk.apply.permission.one':
    'This deduction cannot be applied. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.apply.permission.other':
    '{count} of the selected deductions cannot be applied. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.apply.permission.all':
    'All {count} selected deductions cannot be applied. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.apply.decided.one': 'This deduction cannot be applied — it is already applied or waived.',
  'fin.bulk.apply.decided.other':
    '{count} of the selected deductions cannot be applied — they are already applied or waived.',
  'fin.bulk.apply.decided.all':
    'All {count} selected deductions cannot be applied — they are already applied or waived.',
  'fin.bulk.apply.confirm.title#one': 'Apply {amount} from 1 deduction?',
  'fin.bulk.apply.confirm.title#other': 'Apply {amount} from {count} deductions?',
  'fin.bulk.apply.confirm.body':
    'Each amount comes off its own captain payable balance. Anything a payable cannot cover becomes cash receivable rather than being written off.',
  'fin.bulk.apply.confirm.confirm': 'Apply',
  'fin.bulk.apply.toast': 'Deductions applied',

  'fin.bulk.waive.permission.one': 'This deduction cannot be waived. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.waive.permission.other':
    '{count} of the selected deductions cannot be waived. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.waive.permission.all':
    'All {count} selected deductions cannot be waived. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.waive.decided.one': 'This deduction cannot be waived — it is already applied or waived.',
  'fin.bulk.waive.decided.other':
    '{count} of the selected deductions cannot be waived — they are already applied or waived.',
  'fin.bulk.waive.decided.all':
    'All {count} selected deductions cannot be waived — they are already applied or waived.',
  'fin.bulk.waive.confirm.title#one': 'Waive {amount} on 1 deduction?',
  'fin.bulk.waive.confirm.title#other': 'Waive {amount} on {count} deductions?',
  'fin.bulk.waive.confirm.body':
    'Every deduction stays on this list showing who waived it and why. The captains keep the amounts and nothing is posted.',
  'fin.bulk.waive.confirm.confirm': 'Waive',
  'fin.bulk.waive.toast': 'Deductions waived',

  /* **AC-75** — one key, one placeholder. The link's accessible name is never
     `Open` plus a name glued together at the call site. */
  'fin.a11y.openProfile': 'Open the 360° profile for {name}',
  'fin.a11y.openWallet': 'Open the wallet ledger for {name}',

  /* ═══════════════════ Cash & Captain Debt ═════════════════════════════ */

  'fin.cash.view.queue': 'Reconciliation queue',
  'fin.cash.view.ledger': 'Captain debt ledger',
  'fin.cash.view.overCap': 'Over cap',

  'fin.cash.col.id': 'Report',
  'fin.cash.col.captain': 'Captain',
  'fin.cash.col.rider': 'Rider',
  'fin.cash.col.expected': 'Expected (SAR)',
  'fin.cash.col.reported': 'Reported (SAR)',
  'fin.cash.col.deviation': 'Deviation (SAR)',
  'fin.cash.col.classification': 'Classification',
  'fin.cash.col.repeat': 'Repeats',
  'fin.cash.col.reported.at': 'Reported',
  'fin.cash.col.debtAdded': 'Debt added (SAR)',
  /* **AC-372** — `null` reported is `Never reported` in words, not `0.00 SAR`,
     and its deviation is an em dash. */
  'fin.cash.neverReported': 'Never reported',
  'fin.cash.class.match': 'Matches',
  'fin.cash.class.over_report': 'Over-reported',
  'fin.cash.class.under_report': 'Under-reported',
  'fin.cash.class.no_report': 'Never reported',
  'fin.cash.riderConfirmed': 'Rider confirmed',
  'fin.cash.riderUnconfirmed': 'Rider has not confirmed',
  'fin.cash.repeat': '{count} earlier under-reports',
  'fin.cash.search': 'Search cash reports',
  /* **AC-374** — a closed set of exactly two dispositions. */
  'fin.cash.action.resolve': 'Resolve',
  'fin.cash.action.escalate': 'Escalate',
  'fin.cash.resolve.title': 'Resolve {report}?',
  'fin.cash.resolve.body':
    'The report stays in the queue showing your decision and the time. The debt already added to the captain is unchanged.',
  'fin.cash.resolve.confirm': 'Resolve',
  'fin.cash.escalate.title': 'Escalate {report} to Trust & Safety?',
  'fin.cash.escalate.body':
    'The report stays in the queue showing your decision. Trust & Safety take it from here and the captain keeps working.',
  'fin.cash.escalate.confirm': 'Escalate',
  /* **P4-T1 on a QUEUE, and the one bulk command §9.3 permits here.**
     `design/00-shell.md` §9.3: a queue carries a checkbox column *"only if
     every bulk action offered is a claim or assign action"*, and, in the same
     table, ***"Bulk disposition must not ship."*** So `Claim` is the whole set
     of bulk commands on this queue — `Resolve` and `Escalate` each need their
     own reason about their own report, and a set that shares one reason is the
     blanket justification the audit trail exists to prevent. */
  /* **D21's three forms**, one set per cause. The role refusal is first in
     `CLAIM_REFUSAL_ORDER` (**AC-962**) and carries the same three forms as the
     domain causes, so the refusal an operator most needs to recognise does not
     read differently from the rest. */
  'fin.bulk.claim.permission.one': 'This report cannot be claimed. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.claim.permission.other':
    '{count} of the selected reports cannot be claimed. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.claim.permission.all':
    'All {count} selected reports cannot be claimed. Ask an Owner for the “Captain payouts” permission.',
  'fin.bulk.claim.decided.one': 'This report cannot be claimed — it is already decided.',
  'fin.bulk.claim.decided.other':
    '{count} of the selected reports cannot be claimed — they are already decided.',
  'fin.bulk.claim.decided.all':
    'All {count} selected reports cannot be claimed — they are already decided.',
  'fin.bulk.claim.heldByOther.one':
    'This report cannot be claimed — another operator holds it.',
  'fin.bulk.claim.heldByOther.other':
    '{count} of the selected reports cannot be claimed — another operator holds them.',
  'fin.bulk.claim.heldByOther.all':
    'All {count} selected reports cannot be claimed — another operator holds them.',
  /* Already yours is a refusal rather than a no-op, because a bulk command that
     silently skips records is the partial apply D21 rules out. */
  'fin.bulk.claim.mine.one': 'This report is already yours.',
  'fin.bulk.claim.mine.other': '{count} of the selected reports are already yours.',
  'fin.bulk.claim.mine.all': 'All {count} selected reports are already yours.',
  /* **No confirmation, and that is the same decision the row control made.**
     A claim moves no money and takes nothing from anybody — releasing is one
     click away. A take-over does need one, and is not offered in bulk. */
  'fin.bulk.claim.toast': 'Reports claimed',
  'fin.cash.reason.label': 'Reason',
  'fin.cash.reason.help': 'One line. It goes on the record with your name.',
  'fin.cash.reason.message': 'Enter a reason.',
  'fin.cash.toast.resolved': 'Report resolved',
  'fin.cash.toast.escalated': 'Report escalated',
  'fin.cash.decided': '{actor} · {date}',
  'fin.cash.empty.heading': 'Nothing waiting',
  'fin.cash.empty.body': 'Every cash report for this period has been decided.',
  /* **AC-378** — the escalated count, once, as a page banner. */
  'fin.cash.escalated.title': 'One report is with Trust & Safety.',
  'fin.cash.escalated.titleMany': '{count} reports are with Trust & Safety.',
  'fin.cash.escalated.body': 'Each stays here showing who escalated it and when.',
  'fin.cash.escalated.action': 'Show only escalated',

  'fin.debt.col.captain': 'Captain',
  'fin.debt.col.balance': 'Owes (SAR)',
  'fin.debt.col.cap': 'Cap (SAR)',
  'fin.debt.col.openReports': 'Open reports',
  'fin.debt.col.lastReport': 'Last report',
  'fin.debt.search': 'Search captains',
  'fin.debt.inCredit': 'In credit',
  /* **AC-380** — the same source value on this sub-tab and on the profile. */
  'fin.debt.suspended': 'Cash collection suspended',
  'fin.debt.action.repay': 'Record repayment',
  'fin.debt.action.ledger': 'View ledger',
  'fin.debt.empty.heading': 'No captain owes cash',
  'fin.debt.empty.body': 'A cash fare adds commission to a captain receivable. None is outstanding.',
  'fin.debt.empty.action': 'Read the reconciliation queue',
  /* **AC-379** — partial is the point. The modal states the remainder. */
  'fin.debt.repay.title': 'Record a repayment from {captain}?',
  'fin.debt.repay.body':
    '{captain} owes {balance}. Enter what was handed over — a part payment leaves the rest outstanding and visible.',
  'fin.debt.repay.confirm': 'Record repayment',
  'fin.debt.repay.amount.label': 'Amount received',
  'fin.debt.repay.amount.help': 'Up to {balance}.',
  'fin.debt.repay.amount.message': 'Enter an amount up to {balance}.',
  'fin.debt.repay.reason.label': 'Reason',
  'fin.debt.repay.reason.help': 'Where the cash was handed over.',
  'fin.debt.repay.reason.message': 'Enter where the cash was handed over.',
  'fin.debt.toast.repaid': 'Repayment recorded',

  /* ═══════════════════════════ Rider Wallets ════════════════════════════ */

  'fin.wallets.view.all': 'All wallets',
  'fin.wallets.view.goodwill': 'Goodwill',
  'fin.wallets.view.negative': 'Negative balances',

  'fin.wallet.col.rider': 'Rider',
  'fin.wallet.col.balance': 'Balance (SAR)',
  'fin.wallet.col.pending': 'Pending (SAR)',
  'fin.wallet.col.postings': 'Postings',
  'fin.wallet.col.lastActivity': 'Last activity',
  'fin.wallet.search': 'Search riders',

  /* **AC-382** — the two facts about a wallet that are DERIVED and therefore
     belong to no column: a balance below zero, and a wallet that has never been
     used. Both are `filterable` on the wallets query shape already; before this
     the only way to either was a whole view. Rule 1 — sentence case; rule 6 —
     a filter item is a menu item and takes no period. */
  'fin.wallet.filter.negative': 'Balance below zero',
  'fin.wallet.filter.negative.true': 'Below zero',
  'fin.wallet.filter.negative.false': 'Zero or above',
  'fin.wallet.filter.neverUsed': 'Wallet ever used',
  'fin.wallet.filter.neverUsed.true': 'Never used',
  'fin.wallet.filter.neverUsed.false': 'Used at least once',
  'fin.wallet.action.adjust': 'Adjust',
  'fin.wallet.action.ledger': 'View ledger',
  'fin.wallet.empty.heading': 'No rider holds a wallet balance',
  'fin.wallet.empty.body': 'A top-up, a goodwill credit or a refund to the wallet opens one.',
  'fin.wallet.empty.action': 'Read refunds',
  'fin.wallet.back': 'Back to wallets',
  'fin.wallet.negative.title': 'One rider wallet is below zero.',
  'fin.wallet.negative.titleMany': '{count} rider wallets are below zero.',
  'fin.wallet.negative.body':
    'Whether a negative balance blocks a booking is not decided. The balance is stated and nothing is enforced here.',
  'fin.wallet.negative.action': 'Show only negative',

  /* **AC-387** — the primary is disabled until a reason is chosen.
     **AC-388** — there is no field naming another posting, and there is no key
     for one either. */
  'fin.wallet.adjust.title': 'Adjust {rider}’s wallet?',
  'fin.wallet.adjust.body':
    'This is a new posting, not a correction of an existing one. It carries your name and your reason, and it cannot be pointed at another posting.',
  'fin.wallet.adjust.confirm': 'Post adjustment',
  'fin.wallet.adjust.amount.label': 'Amount',
  'fin.wallet.adjust.amount.help': 'Your ceiling is {cap} per case.',
  'fin.wallet.adjust.amount.message': 'Enter an amount above zero.',
  'fin.wallet.adjust.reason.label': 'Reason code',
  'fin.wallet.adjust.reason.help': 'The rider does not see this. Name why the money moved.',
  'fin.wallet.adjust.reason.message': 'Choose a reason.',
  'fin.wallet.adjust.direction.credit': 'Credit the rider',
  'fin.wallet.adjust.direction.debit': 'Debit the rider',
  'fin.wallet.toast.adjusted': 'Adjustment posted',
  /* **AC-386** — the confirmation says so BEFORE it commits, and the posting
     lands pending. */
  'fin.wallet.adjust.secondApproval':
    'Above {threshold} a second approver is needed. The posting is created pending and waits.',
  /* **AC-384** — the refusal names the cap in SAR and the role that carries it. */
  'fin.authority.abovePerCase': 'Above the {role} ceiling of {capHalalas} per case.',
  'fin.authority.aboveDaily': 'Above the daily ceiling of {capHalalas}. {usedHalalas} used today.',
  'fin.authority.applied': 'Ceiling applied: {role}',

  /* ═════════════════════════ Pricing & Plans ════════════════════════════ */

  /* §4.5 — ONE standing condition, ONE banner, and it must not read as an
     error. `info`, not `warning`: nothing is wrong, something is undecided. */
  'fin.pricing.stageA.title': 'Prices are read-only until the rate card owner is decided.',
  'fin.pricing.stageA.body':
    'Four stores price this product and they disagree. A plan’s catalogue is editable; its rates, commission and discount are shown as they stand.',

  'fin.pricing.plan.col.name': 'Plan',
  'fin.pricing.plan.col.duration': 'Duration',
  'fin.pricing.plan.col.execute': 'Trips',
  'fin.pricing.plan.col.commission': 'Commission %',
  'fin.pricing.plan.col.discount': 'Discount %',
  'fin.pricing.plan.col.status': 'Status',
  'fin.pricing.plan.days': '{count} days',
  'fin.pricing.plan.status.draft': 'Draft',
  'fin.pricing.plan.status.active': 'Active',
  'fin.pricing.plan.status.archived': 'Archived',
  'fin.pricing.plan.action.edit': 'Edit',
  'fin.pricing.plan.search': 'Search plans',
  'fin.pricing.plan.empty.heading': 'No subscription plans',
  'fin.pricing.plan.empty.body': 'A plan is what a rider subscribes to. None is published.',
  'fin.pricing.plan.empty.action': 'Read the rate card',

  'fin.pricing.quick.col.name': 'Class',
  'fin.pricing.quick.col.base': 'Base fare (SAR)',
  'fin.pricing.quick.col.perKm': 'Per km (SAR)',
  'fin.pricing.quick.col.perMin': 'Per minute (SAR)',
  'fin.pricing.quick.col.active': 'Offered',
  'fin.pricing.quick.search': 'Search classes',
  'fin.pricing.quick.empty.heading': 'No quick-ride classes',
  'fin.pricing.quick.empty.body': 'A class is what a rider picks when they book without a plan.',
  'fin.pricing.quick.empty.action': 'Read the rate card',
  'fin.pricing.quick.yes': 'Offered',
  'fin.pricing.quick.no': 'Withdrawn',

  'fin.pricing.rateCard.heading': 'Rate card {version}',
  'fin.pricing.rateCard.status.live': 'Live',
  'fin.pricing.rateCard.status.draft': 'Draft',
  'fin.pricing.rateCard.status.superseded': 'Superseded',
  'fin.pricing.rateCard.effective': 'Effective from {date}',
  'fin.pricing.rateCard.effectiveUntil': 'Effective {from} to {to}',
  'fin.pricing.rateCard.commission': 'Commission: {onDemand}% on demand, {subscription}% on a plan',
  'fin.pricing.rateCard.vatIncluded': 'Every consumer price includes VAT.',
  'fin.pricing.rateCard.col.class': 'Class',
  'fin.pricing.rateCard.col.base': 'Base (SAR)',
  'fin.pricing.rateCard.col.perKm': 'Per km (SAR)',
  'fin.pricing.rateCard.col.perMin': 'Per minute (SAR)',
  'fin.pricing.rateCard.col.minFare': 'Minimum (SAR)',
  'fin.pricing.rateCard.col.cancelFee': 'Cancellation (SAR)',
  'fin.pricing.rateCard.col.wait': 'Waiting',
  'fin.pricing.rateCard.wait': '{free} min free, then {rate}',
  'fin.pricing.rateCard.simulation':
    'Modelled on {trips} trips: the rider bill moves from {before} to {after}, {delta}%',
  'fin.pricing.rateCard.noSimulation': 'Not modelled against any trip.',
  /* **AC-404**, **AC-405** — both refusals are stated at RENDER, on the
     control, before anybody clicks it. */
  'fin.pricing.rateCard.approve': 'Approve',
  'fin.pricing.rateCard.approve.blocked.proposer': 'You proposed this card. Another approver signs it off.',
  'fin.pricing.rateCard.approve.blocked.simulation': 'Model this card against real trips before approving it.',
  'fin.pricing.rateCard.approve.blocked.stage': 'Approving a rate card waits on the pricing owner decision.',
  'fin.pricing.rateCard.floors':
    'Floors: {margin}% target margin, {support} support per subscriber, {fee}% payment fee, {reserve}% emergency reserve',
  'fin.pricing.rateCard.empty.heading': 'No rate card',
  'fin.pricing.rateCard.empty.body': 'A rate card is what every fare is computed from.',
  'fin.pricing.rateCard.empty.action': 'Read the plans',

  'fin.pricing.cancel.col.scenario': 'Scenario',
  'fin.pricing.cancel.col.appliesTo': 'Applies to',
  'fin.pricing.cancel.col.fee': 'Fee',
  'fin.pricing.cancel.col.enabled': 'Enabled',
  'fin.pricing.cancel.appliesTo.quick_ride': 'Quick ride',
  'fin.pricing.cancel.appliesTo.subscription': 'Subscription',
  'fin.pricing.cancel.feePercent': '{percent}% of the refund',
  'fin.pricing.cancel.grace': 'Free inside {minutes} minutes',
  'fin.pricing.cancel.locked': 'Free by policy',
  'fin.pricing.cancel.enabled.yes': 'Enabled',
  'fin.pricing.cancel.enabled.no': 'Off',
  /* **AC-414** — a rule with no enforcement path says so, in words, on the row. */
  'fin.pricing.cancel.notEnforced': 'Stored, never applied',
  'fin.pricing.cancel.notEnforced.title': 'Five cancellation rules are stored and never applied.',
  'fin.pricing.cancel.notEnforced.body':
    'Editing one changes what this page shows and changes nothing a rider is charged.',
  'fin.pricing.cancel.search': 'Search rules',
  'fin.pricing.cancel.empty.heading': 'No cancellation rules',
  'fin.pricing.cancel.empty.body': 'A rule decides what a rider is charged when they cancel.',
  'fin.pricing.cancel.empty.action': 'Read the rate card',
  'pricing.cancel.qrBeforeAssigned': 'Cancelled before a captain was assigned',
  'pricing.cancel.qrGracePeriod': 'Cancelled inside the grace window',
  'pricing.cancel.qrAfterGrace': 'Cancelled after the grace window',
  'pricing.cancel.qrAfterArrival': 'Cancelled after the captain arrived',
  'pricing.cancel.qrRiderNoShow': 'Rider did not show',
  'pricing.cancel.qrDriverFault': 'Captain cancelled',
  'pricing.cancel.subBeforeFirstTrip': 'Cancelled before the first plan trip',
  'pricing.cancel.subMidCycle': 'Cancelled mid-plan',
  'pricing.cancel.note.alwaysFreeNoCommitment': 'Always free: nothing was committed.',
  'pricing.cancel.note.graceWindow': 'Free inside the window, charged after it.',
  'pricing.cancel.note.alwaysFreeDriverFault': 'Always free: the captain cancelled.',
  'pricing.cancel.note.fullRefundNothingDelivered': 'Full refund: no trip was delivered.',
  'pricing.cancel.note.unusedPortion': 'Charged against the unused portion of the plan.',

  /* Surge. **AC-410** — nothing here raises a multiplier. */
  'fin.pricing.surge.heading': 'Surge windows',
  'fin.pricing.surge.readOnly': 'Windows are set by pricing. Operations may only suspend surge.',
  'fin.pricing.surge.window': '{label} · {days} · {start} to {end}',
  'fin.pricing.surge.multiplier': '{value}×',
  'fin.pricing.surge.enabled': 'Running',
  'fin.pricing.surge.disabled': 'Off',
  'fin.pricing.surge.suspensions': 'Suspensions running',
  'fin.pricing.surge.suspension': '{zone} · {reason}',
  'fin.pricing.surge.suspension.by': 'Raised by {actor}',
  'fin.pricing.surge.suspension.expires': 'Ends in {duration}',
  'fin.pricing.surge.suspension.expired': 'Ended',
  'fin.pricing.surge.suspension.none': 'Surge is running everywhere.',
  'fin.pricing.surge.suspend': 'Suspend surge',
  'fin.pricing.surge.suspend.title': 'Suspend surge in {zone}?',
  'fin.pricing.surge.suspend.body':
    'Fares in the zone return to the base rate until it ends. A suspension cannot be extended — it is raised again. Nothing already priced changes.',
  'fin.pricing.surge.suspend.confirm': 'Suspend surge',
  'fin.pricing.surge.suspend.reason.label': 'Reason',
  'fin.pricing.surge.suspend.reason.help': 'Why surge is coming off. Up to {hours} hours.',
  'fin.pricing.surge.suspend.reason.message': 'Enter why surge is being suspended.',
  'fin.pricing.surge.suspend.zone.label': 'Zone',
  'fin.pricing.surge.suspend.zone.help': 'Where the suspension applies.',
  'fin.pricing.surge.suspend.zone.message': 'Choose a zone.',
  'fin.pricing.surge.suspend.zone.placeholder': 'Choose a zone',
  'fin.pricing.surge.suspend.zone.empty': 'No zone is tracked.',
  'fin.pricing.surge.toast.suspended': 'Surge suspended',

  /* ═════════════════════════ the plan editor ════════════════════════════ */

  'fin.planEditor.section.catalogue': 'Catalogue',
  'fin.planEditor.section.pricing': 'Pricing',
  'fin.planEditor.section.features': 'Features',
  'fin.planEditor.nameEn.label': 'Name (English)',
  'fin.planEditor.nameAr.label': 'Name (Arabic)',
  'fin.planEditor.nameAr.help': 'Both names are required. This one is what an Arabic rider sees.',
  'fin.planEditor.name.required': 'Enter a name.',
  'fin.planEditor.durationDays.label': 'Duration (days)',
  'fin.planEditor.executeDays.label': 'Trips in the plan',
  'fin.planEditor.cancelCap.label': 'Free cancellations',
  'fin.planEditor.sortOrder.label': 'Sort order',
  'fin.planEditor.status.label': 'Status',
  'fin.planEditor.number.required': 'Enter a number.',
  'fin.planEditor.economyActive.label': 'Offer Economy',
  'fin.planEditor.comfortActive.label': 'Offer Comfort',
  'fin.planEditor.feature.label': 'Feature {index}',
  'fin.planEditor.feature.en': 'English',
  'fin.planEditor.feature.ar': 'Arabic',
  'fin.planEditor.feature.required': 'Enter both languages.',
  /* **AC-443** — the limit moved into a named placeholder. It was baked into
     both strings as the literal `60`, in two places, while the rule itself
     lives in one place in the data layer; a translator was being asked to
     retype a number that a server rule owns. */
  'fin.planEditor.feature.tooLong': 'Up to {max} characters.',
  'fin.planEditor.feature.count': '{count} of {max}',
  /**
   * **AC-448** — the Arabic name's character count, localised: both numbers go
   * through `formatCount`, so an Arabic console renders Arabic-Indic digits and
   * an English one renders Latin.
   *
   * **Advisory, and the count is the whole of it.** The server enforces a
   * length on a feature line and on neither name, so this field counts and does
   * not refuse — a client-only refusal here would block a save the API would
   * have accepted. Raised for product-owner: if a plan name has a real limit it
   * belongs in the data layer beside the feature rule, and this becomes an
   * enforced one the same day.
   */
  'fin.planEditor.name.count': '{count} of {max}',
  'fin.planEditor.commissionPercent.label': 'Commission %',
  'fin.planEditor.discountPercent.label': 'Discount %',
  'fin.planEditor.economyPerMinute.label': 'Economy per minute (SAR)',
  'fin.planEditor.economyPerKm.label': 'Economy per km (SAR)',
  'fin.planEditor.comfortPerMinute.label': 'Comfort per minute (SAR)',
  'fin.planEditor.comfortPerKm.label': 'Comfort per km (SAR)',
  /* §4.6's disabled treatment carries its own reason. **AC-392** turns on this
     reading differently from a derived value, which has no input at all. */
  'fin.planEditor.pricing.disabled': 'Set on the rate card. Editable when the pricing owner is decided.',
  /* **AC-400** — the error is on the INPUT, and one page-level banner names it. */
  'fin.planEditor.percent.range': 'Enter a percentage between 0 and 100.',
  'fin.planEditor.banner.invalid.title': 'One field needs fixing before this saves.',
  'fin.planEditor.banner.invalid.titleMany': '{count} fields need fixing before this saves.',
  'fin.planEditor.banner.invalid.body': 'Each is named beneath the field it belongs to.',
  'fin.planEditor.banner.rejected.title': 'The plan was not saved.',
  'fin.planEditor.banner.rejected.body': 'Check the fields below and save again.',
  'fin.planEditor.toast.saved': 'Plan saved',
  'fin.planEditor.formula.heading': 'How these are computed',
  'fin.planEditor.preview.heading': 'Worked example',
  /* **AC-399** — the column header states its literal inputs, and the note
     states the assumption. Two examples, two rules, each stating its own. */
  'fin.planEditor.preview.column': '{km} km · {minutes} min × {days} trips',
  'fin.planEditor.preview.note.plan': 'Surge is excluded: a plan leg never carries a multiplier.',
  'fin.planEditor.preview.class.economy': 'Economy',
  'fin.planEditor.preview.class.comfort': 'Comfort',
  'pricing.derived.driverShare': 'Captain share',
  'pricing.derived.gross': 'Gross per trip',
  'pricing.derived.discounted': 'Discounted per trip',
  'pricing.derived.planTotal': 'Plan total',
  'pricing.derived.driverEarns': 'Captain earns',
  'pricing.derived.platformKeeps': 'Eyvar keeps',

  /* ═══════════════ Ledger & Payment Controls ═══════════════════════════ */

  'fin.controls.view.trialBalance': 'Trial balance',
  'fin.controls.view.journal': 'Journal',
  'fin.controls.view.reconciliation': 'Reconciliation',
  'fin.controls.view.refused': 'Refused postings',
  'fin.controls.view.gateways': 'Payment gateways',
  'fin.controls.view.vat': 'VAT & invoicing',

  'fin.trial.col.account': 'Account',
  'fin.trial.col.key': 'Key',
  'fin.trial.col.type': 'Type',
  'fin.trial.col.balance': 'Balance (SAR)',
  'fin.trial.search': 'Search accounts',
  'fin.trial.balanced': 'Debits equal credits.',
  'fin.trial.type.asset': 'Asset',
  'fin.trial.type.liability': 'Liability',
  'fin.trial.type.revenue': 'Revenue',
  'fin.trial.type.contra': 'Contra revenue',
  'fin.trial.type.expense': 'Expense',
  'fin.trial.type.equity': 'Equity',
  'fin.trial.empty.heading': 'No account has a balance',
  'fin.trial.empty.body': 'Every account in the chart is listed the moment anything posts to it.',
  'fin.trial.empty.action': 'Read the journal',

  'fin.journal.col.id': 'Entry',
  'fin.journal.col.posted': 'Posted',
  'fin.journal.col.type': 'Recipe',
  'fin.journal.col.lines': 'Lines (SAR)',
  'fin.journal.col.total': 'Total (SAR)',
  'fin.journal.line.debit': 'Dr {account} · {amount}',
  'fin.journal.line.credit': 'Cr {account} · {amount}',
  'fin.journal.search': 'Search journal entries',
  'fin.journal.empty.heading': 'No journal entries',
  'fin.journal.empty.body': 'Every balanced entry the ledger accepts is listed here, newest first.',
  'fin.journal.empty.action': 'Read the trial balance',

  'fin.reconcile.col.label': 'Comparison',
  'fin.reconcile.col.operational': 'Operational (SAR)',
  'fin.reconcile.col.ledger': 'Ledger (SAR)',
  'fin.reconcile.col.difference': 'Difference (SAR)',
  'fin.reconcile.col.basis': 'VAT basis',
  'fin.reconcile.basis.inclusive': 'Including VAT',
  'fin.reconcile.basis.exclusive': 'Excluding VAT',
  'fin.reconcile.basis.not-applicable': 'No VAT',
  'fin.reconcile.riderWallets': 'Rider wallet balances',
  'fin.reconcile.refunds': 'Refunds issued',
  'fin.reconcile.goodwill': 'Goodwill credits',
  'fin.reconcile.captainReceivable': 'Captain cash receivable',
  'fin.reconcile.search': 'Search comparisons',
  'fin.reconcile.empty.heading': 'Nothing to reconcile',
  'fin.reconcile.empty.body': 'Each comparison puts an operational figure beside its ledger account.',
  'fin.reconcile.empty.action': 'Read the trial balance',
  'fin.reconcile.idempotency': '{operations} operations · {duplicated} duplicates caught · {suppressed} suppressed',

  'fin.refused.col.reference': 'Reference',
  'fin.refused.col.type': 'Recipe',
  'fin.refused.col.reason': 'Reason',
  'fin.refused.col.attempted': 'Attempted',
  'fin.refused.col.lines': 'Lines (SAR)',
  'fin.refused.search': 'Search refused postings',
  'fin.refused.empty.heading': 'Nothing has been refused',
  'fin.refused.empty.body': 'A posting the ledger will not write is kept here with its reason.',
  'fin.refused.empty.action': 'Read the journal',
  'fin.refused.unbalanced': 'Debits {debitsHalalas} against credits {creditsHalalas}',
  'fin.refused.unknownAccount': '{account} is not in the chart of accounts',

  'fin.gateway.col.name': 'Gateway',
  'fin.gateway.col.type': 'Type',
  'fin.gateway.col.transactions': 'Transactions',
  'fin.gateway.col.volume': 'Volume (SAR)',
  'fin.gateway.col.enabled': 'Enabled',
  'fin.gateway.default': 'Default',
  'fin.gateway.action.setDefault': 'Make default',
  'fin.gateway.search': 'Search gateways',
  'fin.gateway.toggle': 'Accept payments through {gateway}',
  /* **AC-422** — the refusal names what to do first, and the switch goes back. */
  'fin.gateway.blocked.default': 'Set a different default gateway first.',
  'fin.gateway.blocked.disabled': 'Enable this gateway before making it the default.',
  'fin.gateway.empty.heading': 'No payment gateway',
  'fin.gateway.empty.body': 'A gateway is where a card payment is taken. None is configured.',
  'fin.gateway.empty.action': 'Read the trial balance',
  'fin.gateway.toast.enabled': 'Gateway enabled',
  'fin.gateway.toast.disabled': 'Gateway disabled',
  'fin.gateway.toast.default': 'Default gateway changed',

  'fin.vat.heading': 'VAT registration',
  'fin.vat.registrationNumber': 'VAT number',
  'fin.vat.companyLegalName': 'Legal name',
  'fin.vat.companyAddress': 'Address',
  'fin.vat.ratePercent': 'Rate',
  'fin.vat.rate': '{value}%',
  'fin.invoice.heading': 'Invoice numbering',
  'fin.invoice.next': 'Next number',
  'fin.invoice.lastIssued': 'Last issued',
  'fin.invoice.gapless': 'The sequence is issued by the server and never skips a number.',
  'fin.invoice.none': 'None issued yet',

  /* ────────────────────── audit detail lines (AC-74) ─────────────────────
     **These 14 keys were minted by the data layer and defined nowhere.**

     Every financial client writes `AuditEntry.detail` as a `LocalisedText`, and
     `detail` had no UI consumer until Admin › Activity read it — so the gap sat
     unnoticed through wave 3. The first render threw
     `Missing translation key "fin.audit.gatewayDefaulted"`, which is AC-74's
     dev-time guard doing exactly its job.

     Three rules govern the sentences below.

     **Money is a `…Halalas` param and is never written into the string.**
     `formatLocalisedText` (`lib/format/localisedText.ts`) formats any param whose
     name ends in `Halalas` through `formatMoney` before interpolation, because
     `common.ts` promises *"money params stay integer halalas so `formatMoney` is
     still the only formatter"*. A sentence here that spelled out a currency would
     break that promise.

     **One key, one sentence, no concatenation** (AC-75). Each is a complete past-
     tense statement of what happened, so Arabic can reorder it freely.

     **Past tense, and no blame** (AC-39). An audit line records an act, and the
     operator who took it is a separate column — the sentence never says "you". */

  'fin.audit.cash.resolve': 'Resolved the cash report {reference}.',
  'fin.audit.cash.escalate': 'Escalated the cash report {reference}.',
  'fin.audit.cashRepayment': 'Recorded a cash repayment. {remainingHalalas} of debt remains.',
  'fin.audit.postingReleased': 'Released the held posting {reference}.',
  'fin.audit.postingReversed': 'Reversed the posting {original} with {reversal}.',
  'fin.audit.gatewayToggled': 'Changed whether the {gateway} gateway accepts payments.',
  'fin.audit.gatewayDefaulted': 'Made {gateway} the default payment gateway.',
  'fin.audit.payoutPaid':
    'Paid {netHalalas} — {payableHalalas} payable, less {cashDebtHalalas} of cash debt.',
  'fin.audit.escrowReleased': 'Released the escrow hold {escrowId}.',
  'fin.audit.deductionApplied': 'Applied the deduction {reference}.',
  'fin.audit.deductionWaived': 'Waived the deduction {reference}.',
  'fin.audit.planSaved': 'Saved the plan {plan}.',
  'fin.audit.refundIssued': 'Issued the refund {reference} to {destination}.',
  'fin.audit.walletAdjusted': 'Adjusted a wallet — {direction} {reference}.',

  /* ── FINANCIALS-UX-PLAN §5 Wallets, Pricing & Ledger ── */

  /* §1 P0-1 — the refused banner used to reuse the out-of-balance sentence and
     so contradicted the balanced totals printed beneath it. */
  'fin.overview.refused.body':
    'Every refused posting is kept and can be read. None of them is in these totals.',

  /* §5.3 — the wallets view header, in `LedgerCard`'s Balance shape. */
  'fin.wallets.header.label': 'Rider wallet balances',
  'fin.wallets.header.caption': '{wallets} wallets · {negative} below zero',
  /* AC-384 — the ceiling is on the page before the dialog opens. */
  'fin.wallets.authority.label': 'Your goodwill authority',
  'fin.wallets.authority.daily': 'Daily {used} of {cap}',
  'fin.wallets.authority.caps': 'Per case {perCase} · {countCap} per rider in 30 days',

  /* §5.4 — the plan's money page is Revenue, not this catalogue. The period
     is on the page meta and on the control above the table, so the header
     carries the unit and nothing else (§8.3.1). */
  'fin.pricing.plan.col.gross': 'Gross (SAR)',
  'fin.pricing.plan.action.revenue': 'Open revenue',

  /* §5.5 / V-20 — the balanced books stated as a heading, never as a colour. */
  'fin.controls.trial.heading': 'Trial balance',
  'fin.controls.trial.balanced': 'Balanced',
  'fin.controls.trial.unbalanced': 'Out of balance',
  'fin.controls.trial.debits': 'Total debits',
  'fin.controls.trial.credits': 'Total credits',
  'fin.controls.trial.caption': '{entries} entries · {suppressed} duplicates suppressed',
  /* ── FINANCIALS-UX-PLAN §5 Payouts & Cash ── */

  'fin.payout.figures.heading': 'This payout run',
  'fin.payout.figure.net': 'Net payable this run',
  'fin.escrow.cancelledTotal': 'One hold is on a cancelled subscription',
  'fin.escrow.cancelledTotalMany': '{count} holds are on cancelled subscriptions',
  'fin.cash.status.pending': 'Awaiting decision',
  'fin.cash.status.resolved': 'Resolved',
  'fin.cash.status.escalated': 'Escalated',
  'fin.debt.figures.heading': 'Captain debt',
  'fin.debt.figure.outstanding': 'Outstanding captain debt',
  'fin.debt.figure.cap': 'Cap',
  'fin.debt.figure.captains': 'Across {count} captains',
  /* ── FINANCIALS-UX-PLAN §4 Revenue ── */

  'fin.revenue.view.byPlan': 'Revenue by plan',
  'fin.revenue.view.refundsLedger': 'Refunds ledger',

  'fin.revenue.mode.label': 'How this view is drawn',
  'fin.revenue.mode.charts': 'Charts',
  'fin.revenue.mode.table': 'Table',
  'fin.revenue.export': 'Export CSV',

  'fin.revenue.plan.list': 'Plans',
  'fin.revenue.plan.facts': '{subs} active subs · {trips} trips',
  'fin.revenue.plan.facts.noSubs': '{trips} trips',
  'fin.revenue.plan.detail.facts': '{subs} active subs · {trips} trips · {from} to {to}',
  'fin.revenue.plan.detail.facts.noSubs': '{trips} trips · {from} to {to}',
  'fin.revenue.plan.sparkline': 'Gross by day, {from} to {to}',

  'fin.revenue.plan.chart.heading': 'Daily gross and contribution',
  'fin.revenue.plan.chart.description': 'Gross and contribution by day, {from} to {to}',
  'fin.revenue.plan.chart.gross': 'Gross',
  'fin.revenue.plan.chart.contribution': 'Contribution',

  'fin.revenue.plan.composition.heading': 'Where the gross went',
  'fin.revenue.plan.composition.captain': 'Captain earnings',
  'fin.revenue.plan.composition.givebacks': 'Givebacks',
  'fin.revenue.plan.composition.contribution': 'Contribution',

  'fin.revenue.plan.refunds.heading': 'Refunds on this plan',
  'fin.revenue.plan.refunds.rate': 'Refund rate {rate} of this plan’s gross',
  'fin.revenue.plan.refunds.none': 'No refund landed on this plan in this period.',

  /* The four detail tiles. `MetricTile` reads `metric.{key}`, so these are in
     the `metric.` namespace and named for the plan detail that owns them. */
  'metric.fin.revenue.plan.gross': 'Gross',
  'metric.fin.revenue.plan.platform': 'Platform',
  'metric.fin.revenue.plan.contribution': 'Contribution',
  'metric.fin.revenue.plan.contributionPercent': 'Contribution %',
  /* A change in a percentage is points, not a percentage of a percentage. */
  /* ── FINANCIALS-UX-PLAN §3 Overview ── */

  /* P0-1. The refused banner reused the out-of-balance sentence, which says
     debits and credits disagree — under a footer reading `Debits 15,754.93 ·
     Credits 15,754.93`. Refused postings are a different condition. */

  'fin.overview.board.lede': '{from} to {to}, measured against {compareFrom} to {compareTo}.',
  'fin.overview.board.lede.alone': '{from} to {to}. There is no earlier window to measure against.',
  'fin.overview.chapter.period': 'The period',
  'fin.overview.chapter.period.note': 'Flows over {from} to {to}.',
  'fin.overview.chapter.positions': 'Where the money is held',
  'fin.overview.chapter.positions.note': 'Balances as at {at}.',
  'fin.overview.charts.heading': 'How the month ran',
  'fin.overview.lists.heading': 'Where it went',

  'metric.financials.overview.grossBookings': 'Gross bookings',
  'metric.financials.overview.captainEarnings': 'Captain earnings',
  'metric.financials.overview.grossMargin': 'Gross margin',
  'metric.financials.overview.giveback': 'Giveback',
  'metric.financials.overview.contributionMargin': 'Contribution margin',
  'metric.financials.overview.contributionPercent': 'Contribution %',
  'metric.financials.overview.refunds': 'Refunds',
  'metric.financials.overview.pendingPayouts': 'Owed to captains',
  'metric.financials.overview.escrowHeld': 'Escrow held',
  'metric.financials.overview.escrowReady': 'Escrow ready to release',
  'metric.financials.overview.captainDebt': 'Captain cash debt',
  'metric.financials.overview.riderWallets': 'Rider wallet balances',
  'metric.financials.overview.heldInTotal': 'Held in total',

  /* R4-4 §4.2 — a denominator or a scope limit, never a status, ≤38 chars. */
  'fin.overview.caption.shareOfGross': '{share} of gross',
  'fin.overview.caption.shareOfMargin': '{share} of gross margin',
  'fin.overview.caption.shareOfGiveback': '{share} of giveback',
  'fin.overview.caption.escrowReady': 'Cleared the hold window.',
  'fin.overview.caption.captainDebt': 'Captains in debt only.',
  'fin.overview.caption.heldInTotal': 'Across five accounts.',

  /* §4.3 — a change in a RATE is a point difference. Read by `MetricDelta`. */
  'metric.delta.points': ' pts',

  'chart.financials.overview.grossByDay': 'Gross bookings by day',
  'chart.financials.overview.contributionPercentByDay': 'Contribution % by day',

  'breakdown.financials.overview.giveback': 'What was given back',
  'breakdown.dimension.giveback-line': 'giveback lines',
  'fin.overview.giveback.share': '{shareOfGiveback} of giveback · {shareOfMargin} of gross margin',

  'fin.overview.decisions.heading': 'What needs a decision',
  'fin.overview.decisions.empty': 'Nothing on the books is waiting on a decision.',
  'fin.overview.decision.payouts': 'Payouts returned by the bank',
  'fin.overview.decision.creditNotes': 'Credit notes with no invoice',
  'fin.overview.decision.cash': 'Cash reports escalated',

  'fin.overview.empty.heading': 'Nothing posted in this window',
  'fin.overview.empty.body':
    'The books hold {postings} postings. None was posted between {from} and {to}.',
  'fin.overview.firstRun.heading': 'The books are empty',
  'fin.overview.firstRun.body':
    'Nothing has been posted yet. The first captured fare opens the ledger and every figure here follows from it.',
  'fin.overview.firstRun.action': 'Open the ledger',

  /* ── FINANCIALS-UX-PLAN §10 Wallets & Ledger ── */

  /* **R2-1** — the figures the Journal, Refused and Gateways view headers
     state. Every one is returned by the read or summed from the rows on screen. */
  'fin.controls.journal.note': 'Newest first.',
  'fin.controls.journal.entries': 'Entries',
  'fin.controls.refused.count': 'Refused',
  'fin.controls.refused.debits': 'Debits attempted',
  'fin.controls.gateways.enabled': 'Enabled',
  'fin.controls.gateways.ofTotal': 'of {total}',
  'fin.controls.gateways.volume': 'Volume',

  /* **R2-5** — the recipe that produced a journal entry, in words. The raw id
     stays on the row's secondary line; no cell reads `gateway_fee` as its
     primary text. */
  'fin.recipe.adjustment': 'Adjustment',
  'fin.recipe.campaignSpend': 'Campaign spend',
  'fin.recipe.captainIncentive': 'Captain incentive',
  'fin.recipe.cashRepayment': 'Cash repayment',
  'fin.recipe.cashReportDebt': 'Cash report debt',
  'fin.recipe.cashSurplus': 'Cash surplus',
  'fin.recipe.cashTopup': 'Cash top-up',
  'fin.recipe.chargeback': 'Chargeback',
  'fin.recipe.chargebackWallet': 'Wallet chargeback',
  'fin.recipe.deduction': 'Deduction',
  'fin.recipe.disputeSettlement': 'Dispute settlement',
  'fin.recipe.driverAccrual': 'Captain earnings accrued',
  'fin.recipe.emergencyCover': 'Emergency cover',
  'fin.recipe.emergencyRecovery': 'Emergency cover recovered',
  'fin.recipe.escrowHold': 'Escrow held',
  'fin.recipe.escrowRelease': 'Escrow released',
  'fin.recipe.fareCapture': 'Fare captured',
  'fin.recipe.fareCaptureBatch': 'Fares captured in a batch',
  'fin.recipe.gatewayFee': 'Gateway fee',
  'fin.recipe.invoiceRaised': 'Invoice raised',
  'fin.recipe.invoiceVoided': 'Invoice voided',
  'fin.recipe.openingBalance': 'Opening balance',
  'fin.recipe.payout': 'Payout',
  'fin.recipe.payoutReversal': 'Payout reversed',
  'fin.recipe.promoCredit': 'Promotional credit',
  'fin.recipe.referralReward': 'Referral reward',
  'fin.recipe.refund': 'Refund',
  'fin.recipe.reversal': 'Reversal',
  'fin.recipe.walletAdjustment': 'Wallet adjustment',
  'fin.recipe.walletCredit': 'Wallet credit',
  'fin.recipe.walletDebit': 'Wallet debit',
  'fin.recipe.walletTopup': 'Wallet top-up',
}
