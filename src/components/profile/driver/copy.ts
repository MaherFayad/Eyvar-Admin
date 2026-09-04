/**
 * The captain presentation's own strings — every one of them under
 * `profile.driver.`, and every one of them rendered by **both** surfaces.
 *
 * One `Dictionary`, spread by `src/i18n/dictionaries.ts`, exactly as a screen's
 * `copy.ts` is. Nothing here is reachable through a `defaultValue`:
 * `createTranslator` throws on a missing key in dev, which is the mechanism that
 * finds one.
 *
 * ## The split against `entity.driver.*`
 *
 * `screens/entity/DriverCopy.ts` carries `entity.driver.*` and holds only what a
 * **page** has and a sheet does not: a back affordance that names a route, a
 * `DataTable`'s furniture, and two section headings that exist because the page
 * lays the same facts out as sections rather than as tabs.
 *
 * Everything that names a *fact about a captain* is here, because both surfaces
 * render it and a second spelling of `Documents` on one of them is how the two
 * start disagreeing about a word. The rider wave learned this the expensive way
 * and its `entity.rider.strip.money` / `profile.rider.rail.plan` split is the
 * scar; this file does not repeat it.
 *
 * ## Reused rather than restated
 *
 * The captain leans on keys that already exist and are already translated:
 * `people.driverStatus.*`, `people.tier.*`, `people.class.*`,
 * `people.compliance.worst.*`, `people.col.doc.*` (the document names, which
 * `ComplianceView` already owns), `profile.field.*`, `profile.section.*`,
 * `profile.kind.driver`, `profile.docState.*`, `profile.list.truncated`,
 * `profile.state.*`, `fin.ledger.*`, `fin.payout.state.*`, `fin.deduction.*`,
 * `fin.settlement.*` and `fin.posting.*`.
 *
 * **`fin.posting.*` and `fin.deduction.*` are minted by the DATA layer** as
 * `LocalisedText` and resolved here through `formatLocalisedText`. This file
 * mints none of them: two dictionaries declaring one key is a spread collision
 * that resolves in whichever order `dictionaries.ts` happens to list them, and
 * the losing translation is never seen.
 *
 * ## `Driver.suspensionReason` is NOT a key, and that is a defect I do not own
 *
 * It is `string | null` — a raw English sentence on the record — so the
 * suspension banner renders record content the way it renders an address. Every
 * other reason in the product is a `LocalisedText` (`Rider.churnReason`,
 * `Deduction.type`, `CaptainPayout.failureReason`). Raised in the handoff for
 * `src/data/types/driver.ts`'s owner; nothing here works around it, because a
 * client-side lookup table over free text would be a second, wrong answer.
 *
 * Rules the copy follows
 *   `copy.md` / R6  sentence case; a full sentence takes a period, a label or a
 *                   button does not. No `please`, no `failed`, no blame.
 *   §9.6 / AC-75    every interpolation is a named placeholder inside a SINGLE
 *                   key. Nothing here is assembled by `+`, by a template
 *                   literal, or by a conditional that joins two clauses.
 *   AC-670/671      a count that governs a noun is a plural FAMILY. `1 open
 *                   complaints` is unrepresentable, and Arabic's six cardinal
 *                   categories need the family regardless.
 *   D18 / X-4       no uppercase-plus-letter-spacing label. The band eyebrow is
 *                   the single licensed exception and it is uppercased by CSS.
 *   §8.3.1          an em dash never stands in for an absent value, and
 *                   `0.00 SAR` is a real zero that prints as one.
 */

import type { Dictionary } from '@/lib'

export const DRIVER_PROFILE_EN: Dictionary = {
  /* ── the band ─────────────────────────────────────────────────────────
     **The meta row leads with the VEHICLE, and that is the data layer's own
     reading rather than a preference.** `clients/profile.ts` builds a rider's
     `ProfileRef.subtitle` from the phone and a captain's from
     `driver.vehicle` — it already says that what identifies a captain at a
     glance is what they drive. The phone moves down to `Identity`, where a
     contact detail belongs. */
  'profile.driver.meta.rating': 'Rated {rating}',
  'profile.driver.meta.noRating': 'Not yet rated',
  'profile.driver.meta.joined': 'Driving since {date}',

  /* ── the standing banner (§11.4 — zero or ONE) ────────────────────────
     **Warning, never critical, and the precedent is the product's own.**
     `commands/captains.ts` records the ruling in terms: *"blue, not red (R5a):
     a suspension is reversible, so `affordance` is `default` and not
     `destructive`"*. R5a does licence a page-level critical banner, and this
     is deliberately not one — a reversible standing condition that an operator
     lifts from the Captains index does not earn the product's loudest surface.

     The two bodies differ because a suspension with no recorded reason is a
     different fact from one with a reason, and §9.6 forbids composing the
     second out of the first plus a clause. */
  'profile.driver.banner.suspended.title': 'This captain is suspended',
  'profile.driver.banner.suspended.body':
    'They take no trips and hold no subscription slots while this stands. Reason recorded: {reason}',
  'profile.driver.banner.suspended.noReason':
    'They take no trips and hold no subscription slots while this stands. No reason is recorded against the suspension.',
  'profile.driver.banner.planTerminated.title': 'Plan access is terminated',
  'profile.driver.banner.planTerminated.body':
    'This captain takes quick rides only. They cannot be assigned to a subscription.',
  'profile.driver.banner.planFrozen.title': 'Plan access is frozen until {date}',
  'profile.driver.banner.planFrozen.body':
    'Existing subscriptions run on. No new subscription can be assigned before that date.',

  /* ── block 1 · standing ───────────────────────────────────────────────
     **First on both surfaces, and the order is the whole argument.** A rider's
     first question is what they can spend; a captain's is whether they may
     work at all. Earnings, documents and performance are all moot behind a
     suspension, so the fact that gates the rest leads. */
  'profile.driver.block.standing': 'Standing',
  /* §3.5 — a block with nothing to report says so in a sentence, never a
     blank and never an em dash. */
  'profile.driver.standing.clear': 'No conditions on this record.',
  /* Each condition is its own line in a list of words (`FlagList`), never a
     sentence built by joining the ones that happen to be true (§9.6). §7.5:
     the word is the carrier, so the block survives greyscale with no tone. */
  'profile.driver.flag.suspended': 'Suspended',
  'profile.driver.flag.complaints#one': '{count} open complaint',
  'profile.driver.flag.complaints#other': '{count} open complaints',
  'profile.driver.flag.declines': 'Flagged for declining trips',
  'profile.driver.flag.manual': 'Flagged for review by an operator',
  'profile.driver.flag.planFrozen': 'Plan access frozen until {date}',
  'profile.driver.flag.planTerminated': 'Plan access terminated',
  /* **The payout gate, stated where the gates are.** `payoutAccountFields`
     already reads `BankAccount.status` as *"an account that is `Pending
     verification` or `Rejected` means a payout cannot land"* — the same
     sentence the two flags below are written under, and the record-side
     condition was missing from the list. Two keys and not one: a check that has
     not finished clears itself, a check that refused does not, and an operator
     does a different thing about each.

     A fragment naming a condition, no period, no blame — the six above. **No
     colour**: R5a spends red on four things and a bank account's verification
     state is not one of them (`bankStatusBadge` reached the same conclusion),
     and the word is the carrier (§7.5). */
  'profile.driver.flag.bankPending': 'Bank account is pending verification',
  'profile.driver.flag.bankRejected': 'Bank account was rejected',
  'profile.driver.flag.noBankAccount': 'No bank account on file',
  'profile.driver.flag.payoutReturned': 'Last payout returned by the bank',

  /* ── block 2 · documents ──────────────────────────────────────────────
     **The clock a rider does not have.** Five documents expire on their own
     and take a captain off the road with nobody acting, which is why this
     outranks money on a captain and has no counterpart on a rider at all.

     The VALUE is `people.compliance.worst.*` — the same five words the
     Compliance view prints, because an operator moving between the two must
     not have to translate. */
  'profile.driver.block.documents': 'Documents',
  'profile.driver.documents.soonest': '{document} expires {date}',
  'profile.driver.documents.expired': '{document} expired {date}',
  'profile.driver.documents.count#one': '{count} document on file',
  'profile.driver.documents.count#other': '{count} documents on file',
  /* `worstState === null` with an empty `docs` array. Not `All valid`, which
     is the most dangerous default available here, and not an em dash. */
  'profile.driver.documents.none': 'No documents on file',
  'profile.driver.documents.empty': 'No documents are on file for this captain.',
  /* The per-row second line. `{days}` is computed against the shared clock
     (`useNowIso`), never a module-scope `Date.now()`. */
  'profile.driver.documents.daysLeft#one': '{count} day left',
  'profile.driver.documents.daysLeft#other': '{count} days left',
  'profile.driver.documents.daysAgo#one': 'expired {count} day ago',
  'profile.driver.documents.daysAgo#other': 'expired {count} days ago',
  'profile.driver.documents.today': 'Expires today',
  /* The compliance file carries its own suspension reason, separate from the
     record's — `DriverCompliance.suspendedReason`. */
  'profile.driver.documents.suspendedBy': 'Compliance suspended this captain: {reason}',

  /* ── the expanded row (D-CP-7, §6) ────────────────────────────────────
     Two things, and BOTH always render, because an expansion that can be empty
     is a broken affordance.

     **(a) why the state says what it says.** `ComplianceDocState` is a DERIVED
     value — `types/driver.ts` fixes the boundaries and puts the bucket on the
     wire so three screens cannot reach three answers — and §8.2 requires a
     derived value to state its derivation. Today the boundary is invisible on
     every surface that prints the word. Four sentences, one per state, four
     keys, **none built by concatenation** (§9.6).

     These print COMPLIANCE's boundaries — 7 and 30 — because that is where this
     surface's state comes from. `docs/01-modules/10d-compliance.md` §11 records
     a third, undocumented 14-day urgency band in the legacy risk score, and
     eight seeded documents sit inside it, labelled `Expiring` here and
     `at-risk` there with nothing distinguishing them. Printing the boundary
     makes that contradiction visible instead of silent, which is the only way
     it gets fixed. **The component does not try to reconcile the two.** */
  'profile.driver.documents.why.valid': 'Marked valid because more than 30 days remain.',
  'profile.driver.documents.why.expiring': 'Marked expiring because 30 days or fewer remain.',
  'profile.driver.documents.why.critical':
    'Marked expiring soon because 7 days or fewer remain.',
  'profile.driver.documents.why.expired': 'Marked expired because the date has passed.',

  /* **(b) the scan, or its honest absence.**

     `No SCAN is stored` — not "uploaded", which asserts a workflow this console
     does not describe, and not "available", which asserts the scan exists and
     cannot be reached. The record has no scan on it; that is all we know and
     all we say. **No em dash**: §8.3.1 reserves `—` for
     not-applicable-or-unknown and `states.md` calls a dash *"a claim that the
     number exists somewhere"*. This is a claim that it does not. */
  'profile.driver.documents.noScan': 'No scan is stored for this document.',
  /* When the scan arrived and who sent it. `uploadedByUserId === null` means the
     captain sent it from the driver app, and `uploadedByUserName` is then their
     own name — one actor vocabulary, `LegAcknowledgement`'s, not a second. */
  'profile.driver.documents.uploaded': 'Uploaded {date} by {name}',

  /* ── the scan viewer — owner amendment 3, §8.1b ───────────────────────
     **§6.5a.0's vocabulary governs every string in this block, and it is not
     pedantry.** A *document* is the compliance record — its type, its expiry,
     its state. A *scan* is the uploaded file. The nouns are never swapped, and
     the one shipped string that swapped them is corrected at
     `refusal.viewDocument` below.

     Seven declared. One — `downloadRefused` — is **deliberately NOT declared**
     (AC-CP-148): today one boolean gates both controls (§6.5a.5), so a second
     refusal string would have no consumer and would be a fourth unreachable
     state. §8.1b writes its wording and marks it *held*; it lands the day
     finding C mints a narrower permission, and not before. */
  'profile.driver.documents.openScan': 'Open scan',
  /* **The ACCESSIBLE name, and it is one key with one named param** (§9.6,
     AC-75, AC-CP-138). In a list of five rows `Open scan` alone is ambiguous to
     anyone who cannot see which row it is in. It contains the visible label
     `Open scan` CONTIGUOUSLY, which is what WCAG 2.5.3 (Label in Name)
     requires — `Open the {document} scan in a new tab` would have failed it. */
  'profile.driver.documents.openScanNamed': 'Open scan: {document}',
  'profile.driver.documents.download': 'Download',
  'profile.driver.documents.downloadNamed': 'Download: {document}',
  /* State D′ (§6.5a.3). A PDF gets **no preview frame at all** — not an empty
     one, not a placard — because an empty bordered box is §6.4's exact
     prohibition one layer up. One sentence says *why* there is no picture, so
     *no preview because PDF* is never mistaken for *no preview because it
     failed*. Two short sentences, both take periods (R6), and the second names
     the control by its visible words so the pointer is followable. */
  'profile.driver.documents.pdfNoPreview': 'A PDF has no preview. Open the scan to read it.',
  /* State E. **`scan`, not `document`** — the document's expiry, state and
     derivation are all on screen and loaded fine; saying the document failed
     would tell the operator the wrong thing broke. Imperative, names the fix,
     no *please*, no *failed*, no blame. §8.1's `fileError` was struck before it
     was ever declared and this replaces it; the rewording is not cosmetic. */
  'profile.driver.documents.scanError': "Couldn't load this scan. Try again.",
  /* State F — the record lists a scan the store does not have. **States what
     happened and stops.** No `Try again` beside it, because retrying cannot
     help and a remedy that cannot work is a lie in the shape of one; no
     *"ask the captain to re-upload"*, because this console cannot upload and an
     instruction naming an act the surface does not have is a remedy in name
     only. It is a THIRD diagnosis, sharing no string with A (`noScan` — the
     record never had one) or E (we could not fetch it). */
  'profile.driver.documents.scanGone': 'The record lists a scan that is no longer in storage.',
  /* **Builder-added, and flagged rather than assumed.** §8.1 specifies
     `fileMeta` as `{kind} · {size}` and §8.3 then requires it to be *"two named
     params and one `aria-hidden` separator node, not a joined string"* — which
     is a construction, not a key, and is how the date and the countdown on line
     two are already built. So `fileMeta` has no consumer and is not declared;
     §8.1's own instruction for `expand`/`collapse` applies (*"if a builder
     finds no consumer, delete them rather than inventing one"*).

     **The size unit is NOT a key here, and the two that were are gone.** This
     block once declared `fileSizeKb` / `fileSizeMb` because `240` with no unit
     is what `conversations.thread.attachment` shipped. Three surfaces had each
     written that answer, so it now lives once in `src/lib/format/fileSize.ts`
     with its own `fileSize.kb` / `fileSize.mb` keys, and this viewer calls
     `formatFileSize` like the other two. Re-declaring a unit here would put a
     fourth byte convention in one product. */

  /* ── block 3 · earnings ───────────────────────────────────────────────
     **A payable, not a wallet, and the two are not the same instrument.** A
     rider's wallet is money they hold; this is money Eyvar OWES. On
     `liability.driver` a credit means the debt to the captain grew — a trip
     earned — and a debit means it shrank: a payout, or a deduction. The header
     states that once and every row's direction is relative to it (§3.2,
     AC-308). */
  'profile.driver.block.earnings': 'Earnings',
  'profile.driver.earnings.unit': 'SAR',
  'profile.driver.earnings.payable': 'payable to this captain',
  /* **A negative payable is a real state.** `DRV-0202` is −1,500: an absentee
     forfeited an emergency cover cost, so the captain owes ON the payable
     account. `payable to this captain` is false for that row, so the caption
     changes with the sign rather than the label being left wrong or the
     figure clamped. The numeral itself is U+2212 in ordinary ink — never red,
     never parentheses, never a badge (§8.3.2). */
  'profile.driver.earnings.negative': 'owed back on the payable account',
  'profile.driver.earnings.lastPaid': 'Last paid {date}',
  'profile.driver.earnings.neverPaid': 'No payout has been made yet',
  /* **One line for four figures — owner amendment 4, §13.3 #7, §13.5.**
     `cashDebtHalalas` is the `ar.driver` balance; `escrowHeldHalalas`,
     `payoutInFlightHalalas` and `pendingDeductionsHalalas` are off-ledger.
     None of the four is inside `liability.driver`, so none is inside the
     payable above them, and that is the ONE fact all four share.

     It replaces four per-line sentences (`.debtNote`, `.escrowNote`,
     `.inFlightNote`, `.pendingDeductionsNote`) that rendered on every record
     in every state and each restated its own label before saying it. §13.1's
     removal test: `Held in escrow 69.20` means exactly one thing without a
     definition of escrow, so the definition was commentary.

     §8.3.4's MUST — *"it MUST appear as a separate labelled LINE beneath the
     balance"* — is satisfied by the **line**, which is untouched. The sentence
     under the line never satisfied it and deleting it changes nothing.

     Fragment, no period (R6): it labels a group, it is not prose. It matches
     `profile.rider.money.outsideBalance` — `Not counted in the wallet balance`
     — deliberately, so the sister record's identical statement is said the
     same way. `the payable` is this screen's own established word: the
     figure's caption is `payable to this captain` and the ledger's title is
     `Payable movements`.

     **CP-P3.** It is true of exactly the four figures that exist today. A
     fifth subordinate figure that IS inside `liability.driver` would make it
     false and must re-open this ruling (AC-CP-165). */
  'profile.driver.earnings.notInPayable': 'Not included in the payable',
  'profile.driver.earnings.empty': 'Nothing has been posted to this captain’s earnings yet.',
  'profile.driver.earnings.postings': 'Payable movements',
  /* **AC-308 / §3.2 — the direction convention, stated once, above the rows.**
     `clients/payouts.ts` fixes it: *"`credit` means Eyvar owes them more
     (earnings accrued, escrow released); `debit` means less (a payout, a
     deduction). The header states that, once, and every row's `direction` is
     relative to it."* This is that header. It is the opposite of a wallet
     ledger and it is not guessable from the words `Debit` and `Credit` alone,
     which is exactly why the rule requires it in writing. */
  'profile.driver.earnings.direction':
    'A credit is money earned. A debit is money paid out or deducted.',

  /* ── block 4 · capacity ───────────────────────────────────────────────
     A captain has a fixed number of subscription slots and a rider has none.
     `activeSubscriptions` / `maxSubscriptions` were one string (`'4/5'`) in
     legacy; two integers here, so this can be a meter and a ratio rather than
     a label. */
  'profile.driver.block.capacity': 'Subscription slots',
  'profile.driver.capacity.used': '{used} of {total} slots taken',
  'profile.driver.capacity.full': 'No open slots',
  'profile.driver.capacity.open#one': '{count} slot open',
  'profile.driver.capacity.open#other': '{count} slots open',
  /* `multiSubException` — a per-captain override of the ops limit. It is why
     `maxSubscriptions` may exceed the platform default, so it is stated rather
     than left to be inferred from a number that looks wrong. */
  'profile.driver.capacity.exception': 'Multi-subscription exception granted',
  'profile.driver.capacity.none': 'No subscription capacity on this record',

  /* ── the tabs (sheet) ─────────────────────────────────────────────────
     **Four, and `Documents` leads.** The rider's three lead with `Activity`
     because a rider's record IS its history. A captain's leading question is
     what will stop them driving, and that is a document with a date on it.
     `Identity` carries no count: it is a set of pairs, not a list of records. */
  'profile.driver.tab.documents': 'Documents',
  'profile.driver.tab.earnings': 'Earnings',
  'profile.driver.tab.activity': 'Activity',

  /* ── the cards both surfaces render ───────────────────────────────────
     Sections on the page's side column; groups inside the sheet's `Identity`
     tab. Same words, same builders (`facts.tsx`), so the two cannot disagree. */
  'profile.driver.card.payout': 'Payout account',
  /* **`profile.driver.card.performance` is DELETED** (AC-CP-93). The card it
     headed is two figure rows now and a figure row never takes a section
     heading — its blocks carry their own (D-CP-3). The word survives as
     nothing, because each figure names itself. */

  /* ── the figure rows (D-CP-13) ────────────────────────────────────────
     Performance stops being a card of seven label/value rows and becomes two
     figure rows — `Rating · On time · Trips completed` and `Earnings this
     month · Trips this period` — built from the same `SummaryBlock` the
     summary strip renders.

     **Six of the eight strings already exist and are reused verbatim**, which
     is the point: `profile.field.rating`, `.onTime`, `.totalTrips`,
     `.monthEarnings`, `profile.driver.field.tripsInPeriod` and
     `profile.driver.meta.noRating` are all shipped and all translated. Minting
     a second `Rating` for a figure that used to be a field is how one fact
     acquires two words.

     The four below are the ones that did not exist. **Three are ABSENCES**,
     and they are three different sentences because they are three different
     claims — §3.5's rule that an absence is stated rather than dashed, plus
     R4-11's that a number the record does not have is not rendered. The fourth
     absence, `Not yet rated`, is `profile.driver.meta.noRating` and is reused.
     A single `Not recorded` across all four would be wrong twice over: an
     on-time rate with no history was never computable, which is a different
     fact from one we lost. */
  /* The caption under `Trips completed` — a qualifier on the number above it,
     never a figure of its own: a timestamp has nothing to aggregate. A
     fragment, so no period (R6). `{date}` arrives as `day-month-time`. */
  'profile.driver.figure.lastTrip': 'Last trip {date}',
  /* `totalTrips === 0` — a real zero, and still a sentence: `0` under `Trips
     completed` and `0` printed before a read returns are the same pixels. */
  'profile.driver.figure.noTrips': 'No trips yet',
  /* `onTimePercent === null`. **Not `Not recorded`** — `types/driver.ts` says
     it is `null` when there is *no history to compute from*, so the rate was
     never computable rather than lost. `0%` would be a terrible score. */
  'profile.driver.figure.noOnTime': 'Not enough history',
  /* `payout === null` — the captain the payouts run has never seen. **Not
     `0`**: a trip count for a period that does not exist is a figure the
     record does not have (R4-11). */
  'profile.driver.figure.noPeriod': 'No payout period yet',
  'profile.driver.bank.status.verified': 'Verified',
  'profile.driver.bank.status.pending': 'Pending verification',
  'profile.driver.bank.status.rejected': 'Rejected',
  /* **`bankHistory` needs no key here.** A replaced account is exactly the
     fact a fraud reviewer is looking for, and it is a DATED EVENT — so it
     is a `bank-account-changed` row on the timeline, with the two banks
     and the stated reason, rather than a count in a card. One home per
     fact. */
  'profile.driver.field.iban': 'IBAN',
  'profile.driver.field.accountHolder': 'Account holder',
  'profile.driver.field.bankName': 'Bank',
  'profile.driver.field.lastPayout': 'Last payout',
  'profile.driver.field.payoutState': 'Payout state',
  'profile.driver.field.tripsInPeriod': 'Trips this period',
  'profile.driver.field.cashDebt': 'Cash debt',
  'profile.driver.field.escrowHeld': 'Held in escrow',
  'profile.driver.field.payoutInFlight': 'Payout in flight',
  'profile.driver.field.pendingDeductions': 'Deductions pending',
  'profile.driver.field.capacity': 'Subscription slots',

  /* ── the timeline ─────────────────────────────────────────────────────
     One list, server-derived. `kind` picks the sentence and `detail` fills its
     placeholders; **no arm of `DriverTimelineEvent.detail` has an optional
     key**, so every placeholder a sentence declares is guaranteed present and
     `interpolate` cannot throw on an omission.

     Nothing here is joined. The trip sentences carry the RIDER rather than the
     route: `types/driver.ts` refuses to carry `pickup` / `destination` because
     both are nullable on `Trip` — the optional-key trap — and because a
     captain's own history is a list of *who they carried* where a rider's is a
     list of *where they went*. */
  'profile.driver.activity.empty': 'Nothing has happened on this record yet.',
  'profile.driver.timeline.registered': 'Account registered · {tier} tier, {vehicleClass}',
  'profile.driver.timeline.tripRequested': 'Trip requested · {rider}',
  'profile.driver.timeline.tripCompleted': 'Trip completed · {rider}',
  'profile.driver.timeline.tripCancelled': 'Trip cancelled · {rider}',
  'profile.driver.timeline.tripNoShow': 'Rider no-show · {rider}',
  /* Only an ALREADY LAPSED document produces an event. `expiring` and
     `critical` are dated in the future and have not happened; a history that
     lists them is not a history. The documents section draws those. */
  'profile.driver.timeline.documentExpired': '{document} expired',
  /* `reason` is operator prose and travels as data — nothing translates what
     somebody wrote. The two bank names are record content for the same reason. */
  'profile.driver.timeline.bankChanged': 'Bank account changed · {from} to {to} · {reason}',

  /* ── what else references this captain ────────────────────────────────
     Nine collections, where a rider has seven. **Only the two a captain has
     and a rider does not are minted here** — safety incidents and cash
     reports; the seven shared labels and all three presence sentences are
     `profile.rider.support.*`, reused, because a presence line means the same
     thing on both records. `Deductions` takes this file's own heading, the
     same word its section uses two inches away. */
  'profile.driver.support.heading': 'Elsewhere in the console',
  'profile.driver.support.safetyIncidents': 'Safety incidents',
  'profile.driver.support.cashReports': 'Cash reports',

  /* ── deductions ───────────────────────────────────────────────────────
     Money taken OFF a captain's payable. Both surfaces list them; only the
     page gives them a heading of their own. */
  'profile.driver.deductions.heading': 'Deductions',
  'profile.driver.deductions.empty': 'No deductions are recorded against this captain.',
  'profile.driver.deduction.meta': '{id} · raised {date}',
  'profile.driver.deduction.onTrip': '{id} · raised {date} · {trip}',

  /* ── refusals (§11.2) ─────────────────────────────────────────────────
     Both surfaces state a refusal in the same words, so an operator refused on
     one is not told something different on the other.

     **There is no `Suspend`, `Reinstate`, `Pay captain`, `Apply deduction` or
     `Waive deduction` control on either surface, and that is a ruling rather
     than a gap.** All five operations exist — which is what makes this
     different from the rider's two removed buttons — but every one of them is
     already DECLARED ONCE: `commands/captains.ts` owns suspend and reinstate
     for the Captains index and the palette, and the Payouts and Deductions
     screens own the three money acts. Declaring any of them a second time here
     is exactly the divergence `commands/captains.ts` was created to remove
     (*"the two lists had already diverged… `Suspend` in the row menu carried a
     refusal and `Suspend` in the bulk bar carried nothing"*). Each also
     requires a §5.3 confirmation with a validated reason, and §5.5 forbids a
     modal nested inside the profile modal — so the sheet could not host one
     and the page could, which would put a command on one surface and not the
     other. §3's parity contract refuses that outright.

     So the profile SURFACES the facts and NAVIGATES to where each decision is
     taken — the same conclusion the rider reached for `Assign a captain`, for
     the same reason: the work needs a screen this one is not. */
  'profile.driver.action.compliance': 'Open compliance file',
  'profile.driver.action.payouts': 'Open payouts',
  /* §6.3 / §11.2 — the SCAN is gated, and the row's expansion is not. Expanding
     reveals the state's derivation and whether a scan exists, neither of which
     an operator cannot already read in the collapsed row; gating a disclosure
     that discloses nothing new is chrome pretending to be security. A scan is a
     photograph of a government identity document and that is a different
     disclosure, so it takes `view_operations` — the SAME permission that gates
     the Compliance route where the same scan lives. **No new permission is
     minted here**; whether captain documents deserve one of their own is a
     product question, raised and not answered.

     Same construction and same cadence as the two navigation refusals, so an
     operator refused twice on one screen is refused in one voice (CM-3).

     **§8.2a — CORRECTED, and it is a correctness fix rather than a polish
     pass.** This read *"Viewing a captain's documents needs the operations
     permission."* over a list whose expansion §6.3 and AC-CP-40 rule is
     **never** gated. It refused the wrong object: an operator who hit it
     concluded the list itself was withheld and went looking for a permission
     that would change something it will not change. The only thing ever
     refused is the **scan** (§6.5a.0).

     The cadence is preserved on purpose — it still matches `Opening the
     compliance file …` and `Opening payouts …`, and the verb now improves the
     match: all three begin `Opening`. **The key NAME does not change**;
     `viewDocument` is now slightly off from what it says, and renaming it would
     touch two dictionaries and a component for zero operator benefit. */
  'profile.driver.refusal.viewDocument':
    "Opening a captain's scans needs the operations permission.",
  'profile.driver.refusal.compliance': 'Opening the compliance file needs the operations permission.',
  'profile.driver.refusal.payouts': 'Opening payouts needs the finance permission.',
}
