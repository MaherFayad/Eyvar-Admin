/**
 * **Every fact the captain profile states, built once, for both surfaces.**
 *
 * ## Why this file exists at all
 *
 * The rider wave shipped its sheet's `identityFields` inside `RiderPanels.tsx`
 * and its page's `IdentityCard` inside `RiderProfilePage.tsx`, and the two lists
 * are not the same list — the sheet carries `Quick rides` and the four device
 * facts, the page does not; the page carries `Gender`, the sheet's grid orders
 * `Rating` differently. Nothing is *wrong* on either, and that is the point:
 * the spec's §3 parity contract (*"the surfaces may arrange facts differently
 * but may never disagree about a fact, and neither may show a fact the other
 * cannot"*) is enforced there by a test that diffs two rendered trees, which
 * catches the divergence a commit late.
 *
 * Here the contract is **structural**. There is one builder per group, it takes
 * no surface argument, and both surfaces call it. A fact cannot appear on one
 * surface and not the other, because there is no second list to add it to. The
 * surfaces choose *geometry* — the sheet pours these into a tabbed
 * `FieldList layout="grid"`, the page into tab panels — and geometry is the
 * only thing a surface chooses.
 *
 * **Two exceptions, and they are exceptions to the second clause and not the
 * first.** `FigureGrid` and `TabCount` are rendered here rather than by each
 * surface, because D-CP-13 and §4B.9 rule their geometry **for both surfaces**:
 * two columns at every width, `px-0 py-0`, no frame; a `Skeleton` and never a
 * `0`. Geometry that a ruling already chose is not left for a surface to
 * choose, and the rider wave's rail and strip — one shape, two implementations,
 * drifted inside a single wave — are the evidence for what the second copy
 * costs.
 *
 * ## The one derivation with teeth: two ledgers, never one number
 *
 * `payableHalalas` is the `liability.driver` balance — money **Eyvar owes the
 * captain**. `cashDebtHalalas` is the `ar.driver` balance — money **the captain
 * owes Eyvar**, from cash fares they kept. `types/financials.ts` is explicit
 * that the *net* is what a payout commits and is **deliberately not a field**,
 * *"because it must be computed the same way in the confirmation modal, on the
 * row and in the audit entry"*.
 *
 * **This file computes no net, and nothing downstream may.** No figure, caption,
 * total or heading on either surface adds, subtracts or otherwise combines the
 * two. They are rendered as two labelled facts with a stated relationship
 * (§8.3.4's construction, applied across two ledgers rather than within one)
 * and the profile does not take the payout, so it has no business stating the
 * amount a payout would move. A screen that showed a net here would be showing
 * a number no ledger holds, beside two that both do.
 *
 * Rules applied
 *   §3.5       an absent value is `null` and reaches `splitAbsent()`. Never an
 *              empty string, never an em dash, never a fabricated zero.
 *   §8.3.1     every figure goes through `Money` / `formatCount` / `formatDecimal`
 *              / `formatDate` / `formatPercent`. No `toFixed` anywhere, and no
 *              string arithmetic: `formatCount` refuses a fraction by contract
 *              and a rating is `4.9`, so the two are not interchangeable.
 *   §9.6       every sentence is one key with named parameters. The absent
 *              facts are GROUPED by `splitAbsent()`, which is the shipped path,
 *              rather than described by a composed clause.
 *   R4-11      a number the record does not have is not rendered. `rating: 0`
 *              is legacy's "no rating yet" and the data layer already turned it
 *              into `null`; `onTimePercent: null` is "no history to compute
 *              from" and prints no percentage.
 *   §7.5       a condition is carried by a WORD. `standingFlags` returns words.
 */

import type { CSSProperties, ReactNode } from 'react'
import { StarIcon } from 'lucide-react'
import { Money } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import type { BannerModel } from '@/components/Banner'
import type {
  BankAccountStatus,
  CaptainPayout,
  ComplianceDoc,
  ComplianceDocState,
  ComplianceDocType,
  Driver,
  DriverCompliance,
} from '@/data/types'
import { COMPLIANCE_DOC_TYPES, documentLabelKey } from '@/data/types'
import {
  formatCount,
  formatDate,
  formatDecimal,
  formatPercent,
  type Language,
  type Translator,
} from '@/lib'
import { DRIVER_STATUS, DRIVER_TIER, VEHICLE_CLASS } from '@/screens/operations/people/domain'
import { NumberValue, type Field } from '../fields'
import { BlockCaption, BlockFigure, SummaryBlock } from './SummaryBlock'
/* `reads.ts` imports the hooks and the clients and **not this file**, so the
   edge is one-way and there is no cycle. `tabCounts` needs the four-way
   compliance switch, and re-deriving it here would be the second answer
   `complianceState` exists to prevent. */
import { complianceState, type DriverReads } from './reads'

/* ─────────────────────────── the document file ─────────────────────────── */

/**
 * The three expiring documents' label keys, **derived from the one place the
 * document set is declared** (`DOCUMENT_TYPES`, `types/driver.ts`).
 *
 * **Not a second set of labels.** It used to be a hand-written map, written
 * when the data layer's own constant carried untranslatable English strings.
 * The constant carries `labelKey` now, so this reads it: a second spelling of a
 * document's name on this surface is a second place for the word to drift from
 * the Compliance table the page links to.
 */
export const DOC_LABEL: Readonly<Record<ComplianceDocType, string>> = {
  id_card: documentLabelKey('id_card'),
  license: documentLabelKey('license'),
  vehicle_reg: documentLabelKey('vehicle_reg'),
}

/**
 * The canonical order of the three, kept as the **tie-break** for two documents
 * that expire on the same day (D-CP-5). It is no longer the reading order.
 */
const DOC_ORDER: readonly ComplianceDocType[] = COMPLIANCE_DOC_TYPES.map((d) => d.key)

/**
 * Whole days from `now` to `expiresOn`, positive into the future.
 *
 * **The clock is passed in, never read here.** `types/driver.ts` states the
 * rule: the expiry *buckets* are the domain's and are a field, the *days
 * remaining* depend on the clock and are the UI's, computed *"against a passed
 * clock, never from a module-scope `Date.now()`"*. In mock mode that clock is
 * `EYVAR_NOW`, which is what every fixture was written against — read the host
 * clock and every document is decades expired.
 *
 * Both instants are floored to their Riyadh calendar day before subtracting, so
 * a document expiring later today reads `Expires today` rather than `0 days
 * left` or `1 day left` depending on the hour the page was opened.
 */
export function daysUntil(expiresOn: string, nowIso: string): number {
  const day = (value: string): number => Date.parse(`${value.slice(0, 10)}T00:00:00+03:00`)
  return Math.round((day(expiresOn) - day(nowIso)) / 86_400_000)
}

export interface DocumentRow {
  type: ComplianceDocType
  label: string
  expiresOn: string
  state: ComplianceDoc['state']
  /** Positive into the future, `0` today, negative once expired. */
  days: number
  /**
   * **The whole record, carried rather than copied.**
   *
   * `type`, `expiresOn` and `state` above are the collapsed row and are kept
   * because three call sites read them by name. Everything the EXPANDED row
   * needs — `dateSource`, `recordedAt`, `previousExpiresOn`, `file` — is on the
   * record and is read from here. Restating those four as five more flat fields
   * would make this interface a second, lagging declaration of a type
   * `types/driver.ts` already owns, and the first field the data layer adds
   * would be invisible to the viewer until somebody noticed.
   */
  doc: ComplianceDoc
}

/**
 * The file, **ordered by deadline**, with the clock applied once.
 *
 * ## D-CP-5 — soonest first, not canon first
 *
 * This walked `DOC_ORDER` — national ID, licence, vehicle licence,
 * operating card — a fixed canonical order. That is right for the Compliance
 * **view**, where the five are *columns* and positional memory is the whole
 * point of a table, and `ComplianceView.tsx` keeps it: it declares its own
 * `DOC_COLUMNS` and does not call this builder, so nothing there changes
 * (AC-CP-19).
 *
 * It is wrong for a profile, where the operator's question is *"what is about to
 * stop this person driving"*. So the rows are sorted by `expiresOn` ascending —
 * an expired document has the earliest date and therefore sorts first, which is
 * correct, because it is the most urgent thing on the record.
 *
 * **`DOC_ORDER` survives as the tie-break, and it is not decoration.** Two
 * documents sharing an expiry date must produce one deterministic order or every
 * screenshot test flickers and `soonestDocument()` names a different document
 * between renders.
 *
 * **It makes the summary block and the list agree by construction.**
 * `DocumentsBlock`'s caption names `soonestDocument()`; under this order that
 * document is provably row 1 — the reduce below keeps the FIRST of any equal
 * pair and the array is already in tie-break order — so the block is a pointer
 * at the list rather than a second, independently-derived claim (AC-CP-18).
 *
 * **No `order` argument.** The spec offered one; there is no second consumer to
 * need it. `ComplianceView` builds its own columns, and §11 F's own rule applies
 * — an unused option on a component is how a later consumer picks the wrong one.
 * The day a caller wants canonical order it can pass one, and the change is
 * three lines.
 */
export function documentRows(
  compliance: DriverCompliance,
  t: Translator,
  nowIso: string,
): DocumentRow[] {
  const rank = new Map(DOC_ORDER.map((type, index) => [type, index]))
  return compliance.docs
    .map((doc) => ({
      type: doc.type,
      label: t(DOC_LABEL[doc.type]),
      expiresOn: doc.expiresOn,
      state: doc.state,
      days: daysUntil(doc.expiresOn, nowIso),
      doc,
    }))
    .sort((a, b) => {
      /* ISO dates compare correctly as strings — same length, most significant
         field first — so no `Date` is parsed to order five rows. */
      if (a.expiresOn !== b.expiresOn) return a.expiresOn < b.expiresOn ? -1 : 1
      /* `?? DOC_ORDER.length` puts a type the canon does not know at the end
         rather than at the front, which is where an unrecognised document
         belongs on a list ordered by urgency. */
      return (rank.get(a.type) ?? DOC_ORDER.length) - (rank.get(b.type) ?? DOC_ORDER.length)
    })
}

/**
 * **Why the state says what it says** — §8.2, one key per bucket.
 *
 * `ComplianceDocState` is a derived value and `types/driver.ts` fixes its
 * boundaries: `< 0` expired, `<= 7` critical, `<= 30` expiring, else valid. The
 * bucket travels on the wire so three screens cannot reach three answers, and
 * until now the BOUNDARY was invisible on every surface that printed the word.
 *
 * A map from state to key, so the sentence and the badge cannot get out of step
 * and nothing is built by concatenation (§9.6).
 */
export const DOC_STATE_WHY: Readonly<Record<ComplianceDocState, string>> = {
  valid: 'profile.driver.documents.why.valid',
  expiring: 'profile.driver.documents.why.expiring',
  critical: 'profile.driver.documents.why.critical',
  expired: 'profile.driver.documents.why.expired',
}

/** The row's second line — the countdown, in words, never a bare number. */
export function documentCountdown(row: DocumentRow, t: Translator): string {
  if (row.days === 0) return t('profile.driver.documents.today')
  if (row.days < 0) return t.plural('profile.driver.documents.daysAgo', { count: -row.days })
  return t.plural('profile.driver.documents.daysLeft', { count: row.days })
}

/**
 * The document nearest its date, and it is **not the same question** as
 * `worstState`.
 *
 * `worstState` is the file's worst bucket; this is the next thing that happens.
 * They usually name the same document and they do not have to — a licence that
 * expired last year is `expired` and the *next* event may be a licence due
 * on Tuesday. The block states the worst as its value and this as its caption,
 * so both questions are answered and neither is inferred from the other.
 */
export function soonestDocument(rows: readonly DocumentRow[]): DocumentRow | null {
  if (rows.length === 0) return null
  /* Strict `<`, so an equal date keeps the EARLIER element — which, under
     `documentRows`' D-CP-5 order, is `rows[0]`. That identity is what AC-CP-18
     asserts, and it holds because of the tie-break rather than by luck. */
  return rows.reduce((soonest, row) => (row.expiresOn < soonest.expiresOn ? row : soonest))
}

/* ──────────────────────────────── standing ─────────────────────────────── */

/**
 * **A bank account that cannot receive money, as the two facts it can be.**
 *
 * `BankAccountStatus` has three members and `payoutAccountFields` already reads
 * all three: *"an account that is `Pending verification` or `Rejected` means a
 * payout cannot land"*. That sentence is the same sentence `standingFlags`
 * writes for its two payout-derived entries — *both stop the captain being
 * paid* — and the record-side condition was missing from the list. Adding it
 * is the fix.
 *
 * **Two flags, not one, and the grain is the existing list's.** `Pending
 * verification` and `Rejected` are not one operational fact wearing two words:
 * the first is *the check has not finished* and clears itself, the second is
 * *the check refused this account* and clears only when somebody supplies a new
 * one. The six flags above already separate causes at exactly that grain —
 * `flaggedForDeclines` and `manualFlag` both mean *under review* and are two
 * entries because an operator does two different things about them.
 *
 * **A map, so the union is exhausted rather than sampled.** A fourth
 * `BankAccountStatus` would fail this file to compile instead of silently
 * producing no flag, which is what a pair of `if`s on the same discriminant
 * would do. `DOC_LABEL` and `DOC_STATE_WHY` are the same construction.
 *
 * **Neither is red and neither is a badge** (R5a, §7.5). R5a spends red on four
 * things and a bank account's verification state is not one of them —
 * `bankStatusBadge` below already reached that conclusion, and this list carries
 * no tone at all. The WORD is the carrier.
 */
const BANK_STATUS_FLAG: Readonly<Record<BankAccountStatus, string | null>> = {
  Verified: null,
  'Pending verification': 'profile.driver.flag.bankPending',
  Rejected: 'profile.driver.flag.bankRejected',
}

/**
 * **Every condition on this captain, as words in a list** — §7.5, `FlagList`.
 *
 * ## There is no risk score here, and the reason is not that the concept is
 * missing
 *
 * It will be asked, because the rider profile carries `churnRisk` as a figure
 * with a stated reason and this block looks like where its twin would go. The
 * accurate answer, from `types/driver.ts`:
 *
 *   - **The concept exists.** Legacy `driverRiskScore(drvId)`
 *     (`eyvar_ops_panel_v40_fixed.html:14283`–`:14306`) is *"Driver
 *     availability risk"*, returns `{score, reasons[]}` exactly as
 *     `riderChurnRisk` does, and `fixtures/metrics.ts` already seeds
 *     `management.risk.atRiskCaptains` against it. Nobody overlooked it.
 *   - **It was refused, for three reasons on the record**: its weights are
 *     unstated policy no spec carries; one of its bands (*"expires within 14
 *     days"*) is an already-reported defect against `ComplianceDocState`'s 7
 *     and 30; and the tile it feeds is a recorded literal that deriving would
 *     move.
 *   - **Nothing on `Driver` is a prediction.** `suspended`,
 *     `flaggedForDeclines`, `manualFlag` and `openComplaints` are facts that
 *     have already happened, and `status` is the enum derived from them.
 *
 * Two things follow for this surface. Everything a score would be computed
 * *from* is already served first-hand and is rendered here and in the documents
 * block, so a captain's standing is **stated rather than scored**. And the
 * owner's amendment to R5a — which permits red for a **rider's churn risk** —
 * has nothing here to reach: there is no prediction on this record to be the
 * fifth use, and extending it to a suspension or a rating would be exactly how
 * "one exception" becomes "red means nothing".
 *
 * `Driver.status` is a server field derived from three signals
 * (`types/driver.ts`: *"`suspended` → Suspended; open complaints ∨
 * `flaggedForDeclines` ∨ `manualFlag` → Under review; otherwise Active"*), and
 * the contributing flags stay on the record **because the detail page shows
 * why**. This is that. The status word is the block's value; these are the
 * reasons it holds.
 *
 * They are a list and never a sentence: §9.6 forbids joining clauses, and a
 * conditional join is still a join. Nothing renders when the list is empty and
 * the caller states that in one sentence instead.
 *
 * `payout` is optional because its read fails independently of the record's —
 * two of the conditions come from it, and a failed payout read must not
 * silently drop them or claim they are absent. `undefined` means *not known
 * yet*; the caller renders the block's own loading state rather than a short
 * list that will grow.
 *
 * **The bank's own status is NOT one of those two, and that is the point of
 * where it sits.** It is on `Driver`, which is the caller's read, so the payout
 * gate is stated in the first frame the record paints — on the sheet's rail and
 * in the page's strip, above the tab row, on every tab, in every state. D-CP-12
 * dropped the captain page's right-hand rail on the argument that the gate
 * moves *up* into this list; until it did, `Pending verification` was reachable
 * only from the Earnings tab, which is a gate behind a tab (D-CP-9).
 */
export function standingFlags(
  driver: Driver,
  payout: CaptainPayout | null | undefined,
  t: Translator,
  language: Language,
): string[] {
  const flags: string[] = []
  if (driver.suspended) flags.push(t('profile.driver.flag.suspended'))
  if (driver.openComplaints > 0) {
    flags.push(t.plural('profile.driver.flag.complaints', { count: driver.openComplaints }))
  }
  if (driver.flaggedForDeclines) flags.push(t('profile.driver.flag.declines'))
  if (driver.manualFlag) flags.push(t('profile.driver.flag.manual'))
  if (driver.planAccess === 'terminated') flags.push(t('profile.driver.flag.planTerminated'))
  if (driver.planAccess === 'frozen' && driver.planFrozenUntil !== null) {
    flags.push(
      t('profile.driver.flag.planFrozen', {
        date: formatDate(driver.planFrozenUntil, { style: 'day-month-year', language }),
      }),
    )
  }
  /* **The payout gate, in three flags and in read order.**

     The bank status is on the RECORD, so it renders in the first frame beside
     the six above; the two below come off the payout read and arrive later.
     Ordering them that way is what stops the list reordering under the
     operator's eye when the second read lands — a list that rewrites itself
     after it has been read is the hazard `StandingBlock` holds the payout pair
     back for.

     All three say one thing: this captain cannot be paid. Which is the same
     class of condition as the six above, which is why they are here and not in
     a card of their own. */
  const bankFlag = BANK_STATUS_FLAG[driver.bank.status]
  if (bankFlag !== null) flags.push(t(bankFlag))
  if (payout != null && payout.bankAccountLast4 === null) {
    flags.push(t('profile.driver.flag.noBankAccount'))
  }
  if (payout != null && payout.state === 'failed') {
    flags.push(t('profile.driver.flag.payoutReturned'))
  }
  return flags
}

/**
 * **§11.4 — zero or ONE banner, and the more severe condition wins.**
 *
 * Three conditions can earn the surface's one banner and they are ordered, so
 * a suspended captain whose plan access is also terminated gets the suspension
 * and not two cards. `under-review` is deliberately **not** here: it is a state
 * an operator reads, not a condition that changes what the console will let
 * them do, and it is already the `Standing` block's value.
 *
 * **Tone is `warning`, and the ruling is the product's own.**
 * `commands/captains.ts` records it in terms — *"blue, not red (R5a): a
 * suspension is reversible, so `affordance` is `default` and not
 * `destructive`"*. R5a does licence a page-level **critical** banner as one of
 * red's four uses, and this deliberately does not take it: a reversible
 * standing condition that an operator lifts from the Captains index has not
 * earned the product's loudest surface, and spending red on it would make the
 * next genuinely irreversible thing quieter.
 *
 * **No actions.** §11.4 permits up to two, and the only ones that would belong
 * — `Reinstate`, `Lift the freeze` — are commands declared in
 * `commands/captains.ts` for the Captains index. See `copy.ts` for why this
 * surface declares none of them.
 *
 * ## A banner and not a timeline event, and that division is deliberate
 *
 * `Driver` carries `suspended` and `suspensionReason` and **no `suspendedAt`**.
 * A timeline event needs a time, so a suspension cannot be one without a date
 * being invented, which is worse than omitting it. A banner reports **current
 * state** rather than a dated event, so the two surfaces divide cleanly: this
 * says the captain is suspended *now*, `getDriverTimeline` says nothing about
 * it, and neither lies. **If a dated suspension is ever wanted on the timeline,
 * `Driver.suspendedAt` is the one change that unlocks it** — the absence there
 * is a decision, not an oversight.
 */
export function standingBanner(
  driver: Driver,
  t: Translator,
  language: Language,
): BannerModel | null {
  if (driver.suspended) {
    return {
      id: 'driver.suspended',
      tone: 'warning',
      title: t('profile.driver.banner.suspended.title'),
      /* Two whole sentences, chosen — never one sentence with a clause glued
         on when a reason happens to exist (§9.6). `suspensionReason` is a raw
         string on the record rather than a `LocalisedText`; it renders as
         record content the way an address does, and the gap is in the handoff. */
      body:
        driver.suspensionReason === null
          ? t('profile.driver.banner.suspended.noReason')
          : t('profile.driver.banner.suspended.body', { reason: driver.suspensionReason }),
    }
  }
  if (driver.planAccess === 'terminated') {
    return {
      id: 'driver.planTerminated',
      tone: 'warning',
      title: t('profile.driver.banner.planTerminated.title'),
      body: t('profile.driver.banner.planTerminated.body'),
    }
  }
  if (driver.planAccess === 'frozen' && driver.planFrozenUntil !== null) {
    return {
      id: 'driver.planFrozen',
      tone: 'info',
      title: t('profile.driver.banner.planFrozen.title', {
        date: formatDate(driver.planFrozenUntil, { style: 'day-month-year', language }),
      }),
      body: t('profile.driver.banner.planFrozen.body'),
    }
  }
  return null
}

/* ───────────────────────────── the band's meta ─────────────────────────── */

/**
 * **A captain record is two things: a person and a vehicle. A rider record is
 * one thing** (D-CP-1).
 *
 * That is the only structural fact available at the very top of the screen, and
 * `bandMeta` threw it away: it returned six items in one flat row where two
 * describe a car and four describe a human, and at 480 that wrapped to three
 * lines of mixed-rank facts and read as a run-on.
 *
 * So there are two builders, and **both surfaces call both** — `DriverBand` on
 * the sheet, `DriverProfilePage`'s band block on the page — so the two cannot
 * disagree about a fact. **No fact leaves the band and no fact changes rank.**
 * Six items in, six items out (AC-CP-04); only the row is new.
 *
 * ```
 *  CAPTAIN . DRV-0101                                      person   text-sm
 *  Ahmed Salem                                             hero-muted, | rules
 *  Rated 4.9 | Gold tier | Riyadh | Driving since Feb 2025
 *  Corolla 2022 . White . Economy                          vehicle  text-xs
 *                                                          hero-label, . spans
 * ```
 *
 * The two rows differ by **rank and by separator**, and the second difference is
 * the load-bearing one: the person row's four items are four independent facts
 * and take the band's 1px `bg-hero-line` rules between them; the vehicle row is
 * **one description of one object** and takes `aria-hidden` `·` spans instead.
 * That is why they read as two kinds of thing rather than as one row that
 * wrapped.
 *
 * Built as data, so a row drops an absent fact without leaving an orphan
 * separator — the separators go BETWEEN what survives, never beside what might
 * not.
 */
export function bandPersonMeta(driver: Driver, t: Translator, language: Language): ReactNode[] {
  return [
    /* R4-11 — `rating: null` is legacy's `0` meaning *no rating yet*, already
       normalised by the data layer. A captain with no rating says so in words;
       they do not render zero stars, which reads as a review score nobody
       gave. */
    driver.rating === null ? (
      t('profile.driver.meta.noRating')
    ) : (
      <RatingStars rating={driver.rating} t={t} language={language} />
    ),
    driver.city,
    /* **`Tier Gold` and `Driving since` are no longer on this row**, on the
       owner's instruction, and neither fact left the record: `profile.field.tier`
       and `profile.field.joined` are both in `identityFields()` below, which is
       where the rider already keeps its own. The tier in particular had to MOVE
       rather than go — `DRIVER_TIER` was rendered in exactly one place in the
       product, this row, so deleting it would have dropped a captain's tier from
       the profile entirely. */
  ].filter((value) => value !== '')
}

/** Legacy's scale. `Driver.rating` is `0`–`5` and `null` means *not yet rated*. */
const RATING_MAX = 5

/**
 * **The rating as a shape plus its figure** — five glyphs and the number, never
 * five glyphs alone.
 *
 * This is `SlotMeter`'s construction, one component over: the glyphs are
 * `aria-hidden` **in full** and a single visually-hidden sentence carries the
 * value, so §7.5 has one carrier to maintain rather than two that can disagree,
 * and a screen reader hears `Rated 4.6` instead of five identical star names.
 * The visible figure is `aria-hidden` for the same reason — it and the sentence
 * are the same fact, and announcing both reads as `4.6 Rated 4.6`.
 *
 * **No new colour and no new token.** The stars take `currentColor`, so on the
 * band they are the person row's own `--ev-hero-muted` and anywhere else they
 * are whatever the text around them is. R5a has nothing to spend on a rating and
 * is not asked to.
 *
 * **Filled to the NEAREST whole star, and the figure is the value.** Five
 * glyphs cannot express `4.6`, so they are a texture and the number beside them
 * is the precision — exactly the argument `SlotMeter` makes for dropping its
 * meter past a dozen segments. `formatDecimal(…, 1, language)` keeps Western
 * digits in both languages, which is already correct and unchanged.
 */
export function RatingStars({
  rating,
  t,
  language,
}: {
  rating: number
  t: Translator
  language: Language
}): ReactNode {
  const figure = formatDecimal(rating, 1, language)
  const filled = Math.round(rating)
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden="true" className="inline-flex items-center gap-0.5">
        {Array.from({ length: RATING_MAX }, (_, index) => (
          <StarIcon
            key={index}
            className={index < filled ? 'size-3 fill-current' : 'size-3 opacity-50'}
          />
        ))}
      </span>
      <span aria-hidden="true" className="tabular-nums">
        {figure}
      </span>
      <span className="sr-only">{t('profile.driver.meta.rating', { rating: figure })}</span>
    </span>
  )
}

/**
 * The equipment row — **`Driver.vehicle` verbatim**, then the class.
 *
 * `types/driver.ts` is explicit that `vehicle` is *"one display string in
 * legacy, and genuinely one field"*, so it is **not split** and the `·` inside
 * `'Corolla 2022 · White'` is the data's, not the layer's. The class is a
 * separate element with its own separator node beside it, so no string is built
 * by joining two translated fragments (§9.6).
 *
 * It is one rank below the person row — `text-xs text-hero-label`, the measured
 * eyebrow rank at 5.89 : 1 on `--ev-hero`. **A rank, not a new token.**
 *
 * `clients/profile.ts` builds a rider's `ProfileRef.subtitle` from the phone and
 * a captain's from `driver.vehicle`: the data layer already says what identifies
 * a captain at a glance is what they drive. The phone is a contact detail and
 * lives in `Identity`, with the rest of the contact details.
 */
export function bandVehicleMeta(driver: Driver, t: Translator): string[] {
  return [driver.vehicle, t(VEHICLE_CLASS[driver.vehicleClass])].filter(
    (value) => value !== '',
  )
}

/* ──────────────────────────── the field groups ─────────────────────────── */

/** The status word plus its tone, for the one place a captain wears a badge. */
export function statusBadge(driver: Driver, t: Translator): ReactNode {
  const status = DRIVER_STATUS[driver.status]
  return <StatusBadge tone={status.tone}>{t(status.key)}</StatusBadge>
}

/**
 * Who this captain is. Contact and person facts only — the vehicle is in the
 * band and the money is in `payoutAccountFields`.
 */
export function identityFields(driver: Driver, t: Translator, language: Language): Field[] {
  return [
    { label: t('profile.field.status'), value: statusBadge(driver, t) },
    { label: t('profile.field.phone'), value: driver.phone || null },
    { label: t('profile.field.email'), value: driver.email },
    { label: t('profile.field.gender'), value: driver.gender },
    { label: t('profile.field.city'), value: driver.city || null },
    { label: t('profile.field.address'), value: driver.address || null },
    /* **Moved here off the band, not deleted.** `DRIVER_TIER` was rendered in
       exactly one place in the product — the band's person row — so taking it
       off that row without a new home would have dropped a captain's tier from
       the profile entirely. Identity is where the rider already keeps its own,
       so the two entity types now agree about where a tier lives. */
    { label: t('profile.field.tier'), value: t(DRIVER_TIER[driver.tier]) },
    {
      /* `Driving since` on the band was this same field at month precision.
         Legacy stores `'Feb 2025'` and the converter sets the day to 01, so a
         `day-month-year` style here would render a day nobody recorded. */
      label: t('profile.field.joined'),
      value: formatDate(driver.joinedAt, { style: 'month-year', language }),
    },
  ]
}

/**
 * **Where the money goes, and whether it can get there.**
 *
 * A rider has no counterpart to this card at all. `BankAccount.status` is a
 * gate: an account that is `Pending verification` or `Rejected` means a payout
 * cannot land, which is why the state is a badge here rather than a word in a
 * list — this is a status on a record, which is exactly what the badge family
 * communicates.
 *
 * `payout` may be `null` — the captain has no payout record for the period —
 * and the three fields that come from it are then absent rather than zero. A
 * `0.00 SAR` payable for a captain the payouts run has never seen is a figure
 * the record does not have (R4-11).
 */
export function payoutAccountFields(
  driver: Driver,
  payout: CaptainPayout | null,
  t: Translator,
  language: Language,
): Field[] {
  return [
    { label: t('profile.driver.field.bankName'), value: driver.bank.bankName || null },
    { label: t('profile.driver.field.accountHolder'), value: driver.bank.holder || null },
    /* A Latin code inside what may be an Arabic paragraph. `FieldList` wraps
       every value in a `<bdi>`, so the IBAN's spaced groups cannot be walked
       backwards by the bidi algorithm (AC-73). */
    {
      label: t('profile.driver.field.iban'),
      value: driver.bank.iban ? <NumberValue>{driver.bank.iban}</NumberValue> : null,
    },
    { label: t('profile.field.status'), value: bankStatusBadge(driver.bank.status, t) },
    {
      label: t('profile.driver.field.lastPayout'),
      value:
        payout === null || payout.lastPayoutAt === null
          ? null
          : formatDate(payout.lastPayoutAt, { style: 'day-month-year', language }),
    },
    {
      label: t('profile.driver.field.payoutState'),
      value: payout === null ? null : t(`fin.payout.state.${payout.state}`),
    },
    /* **The cash debt is NOT here**, and the omission is the parity contract
       working. It is stated once, on the `Earnings` block, on both surfaces —
       and §8.3.4's construction is that a figure outside a balance sits
       *beneath that balance*, which is where it means something. Printed a
       second time in a card three inches away it would be a fact with two
       homes, and two homes is how one of them goes stale. */
  ]
}

function bankStatusBadge(status: BankAccountStatus, t: Translator): ReactNode {
  /* R7's five tones. `Rejected` is `neutral` and not red: R5a spends red on
     four things and a bank account's verification state is not one of them,
     and `types/driver.ts` reaches the same conclusion for a suspension. The
     WORD is what carries it (§7.5). */
  const tone = status === 'Verified' ? 'success' : status === 'Rejected' ? 'neutral' : 'warning'
  const key =
    status === 'Verified'
      ? 'profile.driver.bank.status.verified'
      : status === 'Rejected'
        ? 'profile.driver.bank.status.rejected'
        : 'profile.driver.bank.status.pending'
  return <StatusBadge tone={tone}>{t(key)}</StatusBadge>
}

/**
 * **`performanceFields` is deleted here** (AC-CP-92), and this note is what is
 * left of it so the next reader does not rediscover the question.
 *
 * It returned seven label/value rows in one `Performance` card and D-CP-13
 * dissolved it into the two figure rows below. It survived one wave longer than
 * the ruling because **both surfaces still called it**, and deleting a builder
 * before its replacement is mounted takes the facts off the screen with it —
 * AC-CP-04's principle, that a card may shed facts and the RECORD may not.
 *
 * This is the commit that removed the last consumer, so this is the commit that
 * deletes it. **Every one of the seven has a stated home** and the suite pins
 * the list against the spec's own table rather than against the dead builder:
 *
 * | row | home |
 * |---|---|
 * | `rating`, `onTimePercent`, `totalTrips` | `drivingFigures` → the Activity tab |
 * | `tripsInPeriod`, `monthEarningsHalalas` | `periodFigures` → the Earnings tab |
 * | `lastTripAt` | the **caption** on `Trips completed`. A timestamp has nothing to aggregate |
 * | `capacity` | **struck** — it renders `4 of 5 slots taken`, which IS `CapacityBlock`, on both surfaces, today. Tiling it states one fact twice on one screen |
 *
 * `profile.driver.card.performance` goes with it: the word `Performance` names
 * nothing now, because each figure names itself (D-CP-3).
 */

/* ───────────────────── performance, as figures (D-CP-13) ───────────────── */

/**
 * A figure block's content, as the **two things it can actually be**.
 *
 * A union rather than `ReactNode | null` beside a sentence, because AC-CP-94 is
 * a statement about *place*: an absent figure renders **one grey sentence in
 * the figure's place** — never beneath it, never as `0`, never as an em dash.
 * A shape with two optional slots lets a renderer draw both, or neither, and no
 * test catches the day one does. This shape cannot express either mistake.
 */
export type FigureValue =
  | { kind: 'figure'; node: ReactNode }
  | { kind: 'absent'; sentence: string }

const asFigure = (node: ReactNode): FigureValue => ({ kind: 'figure', node })
const asAbsent = (sentence: string): FigureValue => ({ kind: 'absent', sentence })

export interface Figure {
  /** A React key and a test handle. Stable across renders and both languages. */
  id: string
  label: string
  value: FigureValue
  /**
   * A qualifier on the figure above — *a scope limit, a denominator* — or
   * `null`. It is never a second fact standing on its own; a fact that needs
   * its own label is its own block.
   */
  caption: string | null
}

/**
 * A numeral at figure rank. **`CapacityBlock`'s construction, verbatim** — one
 * figure rank on this record rather than a second that agrees with it today.
 *
 * `tabular-nums` on top of `SummaryBlock`'s `data-numeric` for the same reason
 * `CapacityBlock` states it: a figure that reflows between renders is R4's own
 * complaint, and the two carriers cost nothing.
 */
function Numeral({ children }: { children: ReactNode }) {
  return <span className="text-kpi-lead font-medium tabular-nums text-foreground">{children}</span>
}

/**
 * **What this captain is like** — the three facts that are true of them
 * generally, at figure rank.
 *
 * ## The split, and the test it survived
 *
 * `performanceFields` returned seven label/value rows in one card, and D-CP-13
 * rules Performance into two figure rows. The line I drew is **the window the
 * fact is true over**: a rating, an on-time rate and a lifetime trip count are
 * true of this captain *as a captain* and do not change when the payout period
 * rolls; `tripsInPeriod` and `monthEarningsHalalas` are true only of a window
 * that is on the screen and are false the moment it moves.
 *
 * Checked against the seven before it was accepted, because a name that the
 * data does not honour is worse than no name:
 *
 * | fact | window | home |
 * |---|---|---|
 * | `rating` | lifetime average | `drivingFigures` |
 * | `onTimePercent` | lifetime rate, `null` when there is no history | `drivingFigures` |
 * | `totalTrips` | lifetime count | `drivingFigures` |
 * | `lastTripAt` | **not a figure** — a timestamp has nothing to aggregate | the caption below `Trips completed` |
 * | `tripsInPeriod` | the payout period | `periodFigures` |
 * | `monthEarningsHalalas` | the calendar month | `periodFigures` |
 * | `capacity` | **neither** — a standing quota, and already `CapacityBlock` | unchanged, on both surfaces |
 *
 * **Five of the seven divide cleanly and two do not, and neither exception
 * bends the rule** — one is not a figure at all and the other is not a
 * performance fact at all. So the names hold. **Nothing is deleted**
 * (AC-CP-04): every one of the seven has a stated home above, and the two that
 * leave the figure rows keep the ones they already had.
 *
 * **One qualification on `periodFigures`, recorded rather than smoothed over.**
 * Its two figures are windows, and they are **not the same window** — `Trips
 * this period` is `CaptainPayout`'s payout period and `Earnings this month` is
 * a calendar month, and `CaptainPayout` carries no period bounds to state.
 * Each label names its own window, so neither figure claims the other's, but
 * the row is two windows and an operator who reads it as one will divide one by
 * the other. Reported in the handoff; not resolvable in this file.
 *
 * ## Absence
 *
 * Three different honest sentences, because the three absences are three
 * different claims. `rating === null` is legacy's `0` meaning *never rated*;
 * `onTimePercent === null` is *no history to compute from*, which is why it is
 * `Not enough history` and not `Not recorded` — the value was never computable,
 * which is a different statement from a value we lost. `totalTrips === 0` is a
 * **real zero** and still prints a sentence rather than a `0` at figure rank,
 * because `0` under `Trips completed` and `0` under a broken read are the same
 * pixels (R4-11).
 */
export function drivingFigures(driver: Driver, t: Translator, language: Language): Figure[] {
  return [
    {
      id: 'rating',
      label: t('profile.field.rating'),
      /* **`formatDecimal`, not `formatCount`** — a rating is `4.9` and
         `formatCount` refuses a fraction by contract. The stars stay on the
         band: five glyphs are a texture at meta rank, and a figure row is
         where the precision goes. */
      value:
        driver.rating === null
          ? asAbsent(t('profile.driver.meta.noRating'))
          : asFigure(<Numeral>{formatDecimal(driver.rating, 1, language)}</Numeral>),
      caption: null,
    },
    {
      id: 'onTime',
      label: t('profile.field.onTime'),
      value:
        driver.onTimePercent === null
          ? asAbsent(t('profile.driver.figure.noOnTime'))
          : asFigure(<Numeral>{formatPercent(driver.onTimePercent, language)}</Numeral>),
      caption: null,
    },
  ]
}

/**
 * **The one figure that is really a LIST**, kept as a builder of its own so
 * that a surface which cannot render the list still states the fact.
 *
 * ## Why this is not a surface-specific variant of `drivingFigures`
 *
 * The owner, looking at the built page: *"trips completed is usually a list."*
 * They are right — a lifetime count of 1,284 is not something an operator acts
 * on, the trips are — and the page now renders `DriverTripsTable`, whose
 * `heading` is `Trips`, whose `subheading` is this count, and whose first row
 * (newest-first) **is** the last trip. Stating the count as a figure *above*
 * that table would be one fact twice on one screen, which is the defect
 * `payoutAccountFields` already refuses for the cash debt.
 *
 * **The sheet has no room for the table**, and that is measured rather than
 * assumed: `DataTable`'s narrow rendering is keyed to `--ev-bp-compact`
 * (**768px**) through a media query on the VIEWPORT, so at a 1280 viewport the
 * sheet's 447px panel would get a full `<table>` inside a horizontal scroll
 * container — the sideways scroll D-CP-12 closed, back inside a drawer that
 * §4.4 refuses to widen. `MiniLedger` exists for exactly this reason.
 *
 * So the split is **semantic, not per-surface** — the same line
 * `drivingFigures` / `periodFigures` were split on:
 *
 * - `drivingFigures` is the two **rates** that have no list behind them.
 * - `tripFigures` is the one figure that **is** a list, for a surface that
 *   cannot render one.
 *
 * Neither takes a surface argument, so neither can be handed the wrong one.
 * The page calls `drivingFigures` + the table; the sheet calls
 * `drivingFigures` + this. AC-CP-04 holds on both: `totalTrips` and
 * `lastTripAt` are on screen either way.
 *
 * **The divergence is real and is reported rather than hidden.** The page shows
 * this captain's trips and the sheet does not — the same shape as `MiniLedger`
 * (six postings, no balance column) against `DriverEarningsTable` (the windowed
 * table). §3 lets a surface choose the box; the fact is identical in both.
 */
export function tripFigures(driver: Driver, t: Translator, language: Language): Figure[] {
  return [
    {
      id: 'totalTrips',
      label: t('profile.field.totalTrips'),
      value:
        driver.totalTrips === 0
          ? asAbsent(t('profile.driver.figure.noTrips'))
          : asFigure(<Numeral>{formatCount(driver.totalTrips, language)}</Numeral>),
      /* **The caption turns on `lastTripAt` alone, and deliberately not on the
         count.** A record with no trips and a last-trip date is a contradiction
         in the data; suppressing the line would hide it and drop a fact the
         record holds (AC-CP-04). The screen states both and the contradiction
         is visible, which is the only way it gets fixed. */
      caption:
        driver.lastTripAt === null
          ? null
          : t('profile.driver.figure.lastTrip', {
              date: formatDate(driver.lastTripAt, { style: 'day-month-time', language }),
            }),
    },
  ]
}

/**
 * **What happened in the window on screen** — the two figures that are true of
 * a period rather than of a captain.
 *
 * `payout === null` is the captain the payouts run has never seen, and it reads
 * `No payout period yet` rather than `0`: a count for a period that does not
 * exist is a figure the record does not have (R4-11). `monthEarningsHalalas` is
 * on the record and is never absent — `0.00` there is a real zero and prints as
 * one (§8.3.1), which is the opposite case and is why only one of these two
 * carries an absence sentence.
 *
 * **`Earnings this month` is not a duplicate of `EarningsBlock`.** That block
 * states `payableHalalas` — the `liability.driver` **balance**, what Eyvar owes
 * right now — and four subordinate lines, none of which is this. A month's
 * earnings is an accrual over a window; a payable is a position. **No figure
 * here is summed with, netted against or otherwise combined with either
 * ledger** — this file computes no net and nothing downstream may.
 */
export function periodFigures(
  driver: Driver,
  payout: CaptainPayout | null,
  t: Translator,
  language: Language,
): Figure[] {
  return [
    {
      id: 'monthEarnings',
      label: t('profile.field.monthEarnings'),
      /* §8.3.1 — the unit stated ONCE beside the figure, the way a table states
         it once in a header, and `BlockFigure` puts the two on one BASELINE
         rather than in one box. `EarningsBlock`'s construction, reused. */
      value: asFigure(
        <>
          <Money
            amount={driver.monthEarningsHalalas}
            unit="none"
            className="text-kpi-lead font-medium"
          />
          <span className="text-2xs text-muted-foreground">
            {t('profile.driver.earnings.unit')}
          </span>
        </>,
      ),
      caption: null,
    },
    {
      id: 'tripsInPeriod',
      label: t('profile.driver.field.tripsInPeriod'),
      value:
        payout === null
          ? asAbsent(t('profile.driver.figure.noPeriod'))
          : asFigure(<Numeral>{formatCount(payout.tripsInPeriod, language)}</Numeral>),
      caption: null,
    },
  ]
}

/**
 * **The row itself — two across, on page ground.**
 *
 * A component and not a snippet each surface writes, because D-CP-13 rules the
 * geometry **for both surfaces**: `grid-cols-2` at every width, `gap-x-6
 * gap-y-6`, no fill, no border, no divider, no shadow. The file's own contract
 * is that a surface chooses geometry — and here the geometry was *chosen once,
 * by the ruling*, so there is nothing left for a surface to choose and no
 * reason for two copies of it to exist. The rider wave's rail and strip are the
 * evidence: one shape, two implementations, drifted inside a wave.
 *
 * ## The column count is FITTED, not declared — and D-CP-13's arithmetic was
 * stale before it shipped
 *
 * The owner, looking at the built page: *"put all metrics side by side."*
 * `Rating` and `On time` sat on row one and the third figure wrapped to row
 * two, because this grid was `grid-cols-2` at every width.
 *
 * **D-CP-13 computed that against a main column that no longer exists.** Its
 * argument — *three across leaves 157px against the 154px a `652.60 SAR`
 * figure measures at `--text-kpi-lead`, and 3px is not clearance* — was done
 * while the page still had its 320px rail, giving 704px at 1440 and 568 in
 * Arabic. **D-CP-12 removed the rail in the same amendment.** Measured in
 * Chromium on the built page:
 *
 * ```
 *   viewport 1440   grid box 1264   3 figures side by side
 *   viewport 1344   grid box 1168   3 figures side by side
 *   the sheet 480   grid box  415   2 across, the third wraps
 * ```
 *
 * At 1168 three across is **381px a column** and four is 274 — both enormous
 * against the 154 that argument was defending. The constraint is gone, so the
 * grid is widened; **the stale arithmetic above is exactly what happens when
 * the numbers are not written down**, which is why these are.
 *
 * **`auto-fit` rather than a column count**, so the row still collapses on its
 * own at a narrow width and inside the drawer, where three genuinely does not
 * fit. `--figure-col` is the minimum a figure may be squeezed to and the track
 * grows past it; `auto-fit` collapses the empty tracks, so a two-figure row in
 * a wide panel is two columns filling the width rather than two columns and
 * three ghosts.
 *
 * **The construction is `FactGrid`'s, verbatim** — `repeat(auto-fit,
 * minmax(var(--fact-col),1fr))` with the value handed in through a CSS
 * variable. That is the shipped answer to this exact problem, on the Identity
 * tab of this same page, and reaching for a second one would be a second
 * contract. It is the only arbitrary value in this file and it is named in the
 * handoff as the precedent-backed exception it is.
 *
 * `px-0 py-0` cancels `SummaryBlock`'s own `px-4 py-4` so a figure's
 * inline-start edge is the section's, not 16px inside it. **`0` is on every
 * grid; no type token changes and D-2 is not cited** (AC-CP-95).
 *
 * An odd row's trailing cell is page ground — §4.2's *order beats evenness*,
 * the same call `DriverStrip` makes for its short cells.
 *
 * **`MetricTile` is refused**, and not for taste: `Metric` requires `key`,
 * `subTabId`, `category` and `asOf`, and `/entity/:entityId` resolves with
 * `subTabId: null` *by design* — the profile belongs to no workspace, and
 * `Driver.rating` has no freshness stamp. All four would be fabricated, and
 * `asOf` exists precisely to stop that. **A board metric is a population; this
 * one is a person.**
 */
export function FigureGrid({
  figures,
  /**
   * The narrowest a figure track may be squeezed to before the row wraps.
   *
   * **14rem = 224px, measured against the widest figure that actually renders
   * here.** The earlier 12rem was sized against `652.60 SAR` at 154px, but the
   * figure on screen is `Earnings this month` — `12,400.50 SAR` — whose
   * content box measures **210px**, so 192 was 18px short and the unit would
   * have wrapped under its own numeral. 224 clears the real widest by 14.
   */
  minColumn = '14rem',
}: {
  figures: readonly Figure[]
  minColumn?: string
}) {
  return (
    <div
      style={{ '--figure-col': minColumn } as CSSProperties}
      /* **`auto-fill`, NOT `auto-fit`, and the difference is the whole defect
         the owner reported as *"put all metrics side by side"*.** `auto-fit`
         collapses every empty track to 0 and then shares the container between
         the survivors — so a two-figure row on the 1264px page gave each figure
         a **620px** track. Measured natural widths in that row: `Rating` 56px,
         `On time` 82px, `Trips this period` 93px, `Earnings this month` 210px.
         A 56px figure in a 620px track is not a row of metrics, it is two
         numbers at opposite ends of the page with 500px of nothing between them,
         which is what the screenshot showed.

         `auto-fill` keeps the empty tracks, so the filled ones stay at track
         size and the figures pack against the inline-start edge as one group.
         Measured after: 1264px box → 5 tracks of 233px; 1168 → 4 of 274; the
         sheet's 415 → 1, stacked, which is correct for a drawer that cannot
         give a 210px figure two columns without clipping its currency. */
      className="grid grid-cols-[repeat(auto-fill,minmax(var(--figure-col),1fr))] gap-x-6 gap-y-6"
    >
      {figures.map((figure) => (
        <SummaryBlock key={figure.id} label={figure.label} className="px-0 py-0">
          {figure.value.kind === 'figure' ? (
            <BlockFigure>{figure.value.node}</BlockFigure>
          ) : (
            /* §3.5 / AC-CP-94 — one grey sentence IN THE FIGURE'S PLACE.
               `StandingBlock`'s shipped construction for the same problem. */
            <BlockCaption>{figure.value.sentence}</BlockCaption>
          )}
          {figure.caption !== null && <BlockCaption>{figure.caption}</BlockCaption>}
        </SummaryBlock>
      ))}
    </div>
  )
}

/* ─────────────────────────────── the tab row ───────────────────────────── */

/**
 * **The two counts a captain's tab row carries, derived once for both
 * surfaces** (AC-CP-77).
 *
 * The sheet derived these inline and the page shipped without them rather than
 * write a second copy. This is the one copy. A count is *the number of records
 * behind the tab*, never the number of rows on screen, and a record is counted
 * under exactly one tab — narrowed by the sheet's own further clause:
 *
 * > **A tab carries a count only when exactly one collection sits behind it and
 * > the server knows its total.**
 *
 * So there are two entries and not four. `Earnings` holds the payable ledger
 * *and* the deduction list and their members overlap — an applied deduction
 * **is** a posting on that ledger — so any single number is a double count or a
 * silent claim about which collection is the real one. `Identity` is a set of
 * pairs, not a list of records, and a `1` on it would count nothing an operator
 * can count.
 *
 * **A count is one of three things, and the third is why this is not
 * `number | null`.** A zero printed before a read returns is indistinguishable
 * from a real zero, and on `Documents` that mistake reads as *this captain has
 * filed nothing*. `no-file` — the 404 that is an ANSWER — is a real `0` and
 * prints as one. So far, two.
 *
 * **The third is a read that FAILED, and it was shipped conflated with the
 * first.** Both returned `null`, `TabCount` drew a `Skeleton` for `null`, and a
 * failed compliance read therefore left an **indefinite shimmer beside a tab
 * that was not loading** — a chip promising a number that is never coming. The
 * previous wave preserved that behaviour rather than change it quietly and
 * raised it for a ruling. **It has been ruled: in flight draws the skeleton,
 * failed draws nothing.** A count that cannot be known is better absent than
 * permanently pending, and the tab itself is still rendered, still selectable
 * and still carries the section's own error inside it (AC-CP-76, AC-CP-78).
 *
 * The union is what makes the third case impossible to lose again: a renderer
 * cannot fall through `'unknown'` into the skeleton branch by accident, where
 * two `null`s meaning two things always eventually merge.
 */
export type TabCountValue =
  /** A real number, including a real `0`. */
  | number
  /** The read has not answered. A `Skeleton`, never a `0` that guesses. */
  | 'loading'
  /** The read failed. **Nothing renders** — not a skeleton, not a `0`, not a dash. */
  | 'unknown'

export interface TabCounts {
  documents: TabCountValue
  activity: TabCountValue
}

export function tabCounts(reads: DriverReads, t: Translator, nowIso: string): TabCounts {
  const compliance = complianceState(reads.compliance)
  return {
    /* **The file's size, read through the same builder that renders it**, which
       is what `DriverPanels` computes today and is preserved verbatim.
       `documentRows` maps and sorts and drops nothing, so this is
       `compliance.docs.length` by construction — **the day it filters, this
       must become `docs.length`**, because a count is the records behind the
       tab and not the rows shown. */
    documents:
      compliance.kind === 'file'
        ? documentRows(compliance.compliance, t, nowIso).length
        : compliance.kind === 'no-file'
          ? /* The 404 that is an ANSWER — a captain with no compliance file has
               no documents, and that is a real `0`, not an unknown. */
            0
          : compliance.kind === 'error'
            ? 'unknown'
            : 'loading',
    /* **The server's `total`, never the rows on screen.** `getDriverTimeline`
       is paginated at six and a captain with 412 trips has 412 events; the list
       states its own truncation in words beneath, so `Activity 21` over
       `Showing 6 of 21.` reconciles by reading. */
    activity:
      reads.timeline.status === 'error'
        ? 'unknown'
        : reads.timeline.status === 'loading'
          ? 'loading'
          : (reads.timeline.data?.total ?? 0),
  }
}

/**
 * The count beside a tab's name — **a skeleton while the read is in flight,
 * nothing at all when it failed, and never a `0` that guesses** (§4B.9).
 *
 * Here rather than on each surface for the same reason the derivation is: two
 * chips that agree today are two chips. `bg-neutral` is R7's neutral tone and
 * carries no state — a count is not a status.
 *
 * **`'unknown'` renders nothing, and that is the whole of the ruling.** A
 * skeleton is a promise that a number is coming; beside a tab whose read has
 * failed it is a promise nothing will keep, and it shimmers for as long as the
 * operator leaves the profile open. The tab still renders, is still selectable
 * and still carries its section's own `ErrorState` with `Try again` inside it,
 * so nothing is hidden — only the false promise is.
 */
export function TabCount({ value, language }: { value: TabCountValue; language: Language }) {
  if (value === 'loading') return <Skeleton className="h-4 w-5" />
  if (value === 'unknown') return null
  return (
    <span className="rounded-md bg-neutral px-1.5 text-2xs tabular-nums text-neutral-foreground">
      {formatCount(value, language)}
    </span>
  )
}

/** The four device facts, identical on both surfaces. */
export function deviceFields(driver: Driver, t: Translator): Field[] {
  return [
    { label: t('profile.field.device'), value: driver.device || null },
    { label: t('profile.field.appLanguage'), value: driver.appLanguage || null },
    { label: t('profile.field.lastIp'), value: driver.lastIp || null },
    { label: t('profile.field.ipLocation'), value: driver.ipLocation || null },
  ]
}
