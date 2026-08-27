/**
 * The ledger model — the posting, the journal entry, and the chart of accounts.
 *
 * Specified in `docs/05-restructure/specs/03-financials.md` §3, which answers
 * **Q13**. This file is the contract; nothing here is a choice made at build
 * time.
 *
 * ## The one rule everything else hangs from (D-F1, §3.1)
 *
 * > **A posting carries a positive integer `amountHalalas` and a `direction` of
 * > `'debit' | 'credit'`. Balances are signed; postings are not.**
 *
 * Not invented — it is the shape the legacy app already uses in the two places
 * it models money properly:
 *
 *   - `postLedger()` writes `{account, debit:<positive>}` / `{account,
 *     credit:<positive>}`, never a signed field (`:19918`–`:19935`).
 *   - `creditRiderWallet` / `debitRiderWallet` write `{type:'credit'|'debit',
 *     amount:<positive>, balanceAfter}` (`:3937`, `:3947`), and the seeds match
 *     (`:2595`, `:2600`).
 *
 * Two alternatives were rejected for reasons that are properties of the type,
 * not preferences: a **signed amount** cannot pick a column, because `0` has no
 * sign and `DESIGN.md` §8.3.3 mandates two columns; **two nullable fields**
 * (`debitHalalas` / `creditHalalas`) can express *both set* and *neither set*,
 * two lies this shape cannot tell.
 *
 * ## `direction` is account-relative (§3.2)
 *
 * `debit` and `credit` mean nothing on their own. Every ledger declares its
 * subject account once, in its card header, and `direction` is relative to that
 * subject. `CHART_OF_ACCOUNTS[k].normalSide` is what tells a screen which way
 * increases the balance — that is AC-308's sub-line, and it is data, not copy
 * written per screen.
 */

import type { BadgeTone, Halalas, IsoDate, IsoDateTime, LocalisedText } from './common'

/* ─────────────────────── chart of accounts ──────────────────── */

/**
 * Every account money may touch. Kept from `:19865`–`:19877` with **three
 * changes**, each recorded as a change rather than smuggled in (§3.8):
 *
 *   - `ar.driver` is **NEW**. It replaces `DB.driverCashDebt`, a bare signed
 *     map outside the books (`:12081`), and it is what turns Cash & Captain
 *     Debt from a scoreboard into a ledger.
 *   - `ar.rider` gains its **first consumer ever** — chargebacks (§3.4c).
 *     Declared at `:19867` and never posted to (`12a` G8).
 *   - `liability.escrow` and `liability.driver` gain their **first consumers**
 *     — escrow holds and payouts (`12a` R11). Today the entire captain-money
 *     side is missing from a trial balance that prints `✓ books balance`.
 *
 * ## Five more, and the chart is **still closed** — the owner opened it once
 *
 * `expense.promo` · `expense.referral` · `expense.incentive` ·
 * `expense.gateway_fees` · `equity.opening`. **Nothing was struck.**
 *
 * The reasoning is worth keeping, because it says what *done* means here.
 * Promo, referral and incentive were served from **outside the books** as
 * `givebackOperationalFixture` — operational figures sitting beside a trial
 * balance rather than inside it. But `givebackHalalas` feeds
 * `contributionMarginHalalas`, and the contribution margin is **one of the two
 * numbers the Owner is asked to be able to state** (`owner.position`, design
 * §10.5). Served from outside, it is not derivable from the trial balance — so
 * a `✓ books balance` certifies only part of the number it appears to certify,
 * which §3.8 already calls **worse than an honest OUT OF BALANCE**.
 *
 * > **A management number is a GL number or it is not auditable.**
 *
 * `equity.opening` is forced by three places that already presumed it: §3.3's
 * `opening` posting type, §3.4d's migrated opening balance and §3.6 Path 2 all
 * assume an opening posting exists, and **nothing in the chart could balance
 * one**. It is the first `equity` account, which is why `AccountType` gains an
 * `equity` arm.
 */
export type AccountKey =
  | 'cash.gateway'
  | 'ar.rider'
  | 'ar.driver'
  | 'liability.wallet'
  | 'liability.driver'
  | 'liability.escrow'
  | 'tax.vat_output'
  | 'revenue.fares'
  | 'contra.refunds'
  | 'expense.driver_pay'
  | 'expense.goodwill'
  | 'expense.emergency'
  | 'expense.compensation'
  /* ── added by the product-owner ruling on the wave-3 findings ────────── */
  | 'expense.promo'
  | 'expense.referral'
  | 'expense.incentive'
  | 'expense.gateway_fees'
  | 'equity.opening'

export type AccountType = 'asset' | 'liability' | 'revenue' | 'contra' | 'expense' | 'equity'

/**
 * Which direction *increases* this account. Legacy derives it inline inside
 * `accountBalance()` (`:19947`) — `asset || expense || contra` are debit-normal,
 * everything else credit-normal. Stated as a field here so a card header can
 * render AC-308's sub-line without re-deriving the accounting convention on
 * every screen that shows a balance.
 */
export type NormalSide = 'debit' | 'credit'

export interface AccountDefinition {
  key: AccountKey
  /** English label, kept verbatim from `ACCOUNTS[k].label` (`:19865`). */
  label: string
  type: AccountType
  normalSide: NormalSide
  /**
   * Whether this account is scoped to a party. A rider wallet is one ledger
   * *per rider*; `contra.refunds` is one ledger for the platform. Drives
   * `LedgerPosting.subjectId` being non-null.
   */
  scope: 'rider' | 'captain' | 'subscription' | 'platform'
}

export const CHART_OF_ACCOUNTS: readonly AccountDefinition[] = [
  { key: 'cash.gateway', label: 'Cash at payment gateway', type: 'asset', normalSide: 'debit', scope: 'platform' },
  { key: 'ar.rider', label: 'Rider receivable', type: 'asset', normalSide: 'debit', scope: 'rider' },
  { key: 'ar.driver', label: 'Captain cash receivable', type: 'asset', normalSide: 'debit', scope: 'captain' },
  { key: 'liability.wallet', label: 'Rider wallet balances', type: 'liability', normalSide: 'credit', scope: 'rider' },
  { key: 'liability.driver', label: 'Captain earnings payable', type: 'liability', normalSide: 'credit', scope: 'captain' },
  { key: 'liability.escrow', label: 'Plan escrow held', type: 'liability', normalSide: 'credit', scope: 'subscription' },
  { key: 'tax.vat_output', label: 'VAT output payable', type: 'liability', normalSide: 'credit', scope: 'platform' },
  { key: 'revenue.fares', label: 'Fare revenue', type: 'revenue', normalSide: 'credit', scope: 'platform' },
  { key: 'contra.refunds', label: 'Refunds (contra revenue)', type: 'contra', normalSide: 'debit', scope: 'platform' },
  { key: 'expense.driver_pay', label: 'Captain earnings', type: 'expense', normalSide: 'debit', scope: 'platform' },
  { key: 'expense.goodwill', label: 'Goodwill credits', type: 'expense', normalSide: 'debit', scope: 'platform' },
  { key: 'expense.emergency', label: 'Emergency cover', type: 'expense', normalSide: 'debit', scope: 'platform' },
  { key: 'expense.compensation', label: 'Rider compensation', type: 'expense', normalSide: 'debit', scope: 'platform' },
  /**
   * The three giveback lines §6.2 names and §3.8's chart could not separate.
   * Until this pass they could only be booked to `expense.goodwill`, which is
   * why they were served as operational figures instead — and why the
   * contribution margin was not derivable from the books.
   */
  { key: 'expense.promo', label: 'Promotional discounts', type: 'expense', normalSide: 'debit', scope: 'platform' },
  { key: 'expense.referral', label: 'Referral rewards', type: 'expense', normalSide: 'debit', scope: 'platform' },
  { key: 'expense.incentive', label: 'Captain incentives', type: 'expense', normalSide: 'debit', scope: 'platform' },
  /** The processor's cut. Money that leaves the gateway and never was ours. */
  { key: 'expense.gateway_fees', label: 'Payment gateway fees', type: 'expense', normalSide: 'debit', scope: 'platform' },
  /**
   * **The first `equity` account, and the only one.** The balancing side of a
   * migrated opening balance — what §3.3's `opening` posting type, §3.4d and
   * §3.6 Path 2 all presumed and none of them could name. Credit-normal, as
   * equity is.
   */
  { key: 'equity.opening', label: 'Opening balances (migration)', type: 'equity', normalSide: 'credit', scope: 'platform' },
]

export const ACCOUNT_KEYS: readonly AccountKey[] = CHART_OF_ACCOUNTS.map((a) => a.key)

export function accountDefinition(key: AccountKey): AccountDefinition {
  const found = CHART_OF_ACCOUNTS.find((a) => a.key === key)
  if (!found) throw new Error(`Unknown account "${key}" — the chart of accounts is closed (§3.8)`)
  return found
}

/* ────────────────────────── the posting ─────────────────────── */

export type PostingDirection = 'debit' | 'credit'

/**
 * The four correction shapes of §3.4, plus the ordinary case.
 *
 * **Only `reversal` is a correction.** `refund`, `chargeback` and `adjustment`
 * are new economic events that happen to move money the other way, and each
 * leaves `reversesPostingId` null because the original posting is still true.
 * Conflating them is how a ledger stops being evidence.
 */
export type PostingKind = 'primary' | 'reversal' | 'refund' | 'chargeback' | 'adjustment'

/** The document that caused the posting. `sourceId` is the row's one and only link. */
export type PostingSourceType =
  | 'trip'
  | 'payment'
  | 'payout'
  | 'escrow'
  | 'deduction'
  | 'refund'
  | 'credit-note'
  | 'cash-report'
  | 'adjustment'
  | 'chargeback'
  | 'reversal'
  | 'opening'

/**
 * Where the money has got to. Tones are §7.2's, and **two of the ten have no
 * tone on purpose**: `failed` and `escalated` are R5a row-level critical
 * signals, not badges. R5 leaves no red badge to give them and the five-tone
 * palette (R7) is closed, so `SETTLEMENT_BADGE_TONE` returns `null` for both
 * and the screen owes them the three-part treatment instead.
 */
export type SettlementState =
  | 'settled'
  | 'held'
  | 'authorised'
  | 'pending'
  | 'reconciling'
  | 'released'
  | 'reversed'
  | 'voided'
  | 'failed'
  | 'escalated'

/** §7.2, verbatim. `null` = **not a badge** (R5a critical signal). Never invent a sixth tone. */
export const SETTLEMENT_BADGE_TONE: Readonly<Record<SettlementState, BadgeTone | null>> = {
  settled: 'success',
  held: 'warning',
  authorised: 'warning',
  pending: 'warning',
  reconciling: 'warning',
  released: 'neutral',
  reversed: 'neutral',
  voided: 'neutral',
  failed: null,
  escalated: null,
}

/**
 * The settlements that are **excluded from the balance** and from the running
 * balance column (AC-312). Their amounts appear in the separate `Pending` line
 * beneath the card-header balance, never inside it.
 */
export const PENDING_SETTLEMENTS: readonly SettlementState[] = [
  'held',
  'authorised',
  'pending',
  'reconciling',
]

export function isPendingSettlement(s: SettlementState): boolean {
  return PENDING_SETTLEMENTS.includes(s)
}

/**
 * One row on one subject ledger — a rider wallet, a captain payable, a captain
 * receivable, the refunds ledger, an escrow account.
 *
 * ## `balanceAfterHalalas` — the decision the spec left open, and its reason
 *
 * §3.3 types it `Halalas | null`; AC-312 requires a non-settled row to render
 * `—`. Either `null` or an omitted key satisfies the criterion, and the
 * debit/credit splitter reads it, so it had to be picked once.
 *
 * > **Decision: the field is always present, and `null` on a non-settled row.
 * > It is never optional and never omitted.**
 *
 * Four reasons, in order of how much each would cost to discover later:
 *
 * 1. **A required field forces every producer to state it.** With `?: Halalas`
 *    a new posting kind that forgets the field typechecks; with `Halalas |
 *    null` it does not. The compiler is the only thing that will ever audit a
 *    600-row fixture.
 * 2. **`undefined` has a second cause and `null` does not.** A missing key also
 *    arises from a typo'd property name and from a serializer dropping it.
 *    `exactOptionalPropertyTypes` is off in this project's `tsconfig.json`, so
 *    `undefined` and absent are the same value to TypeScript — meaning the
 *    splitter could not tell "server says no balance" from "field never
 *    arrived". `null` is one cause: the server said so.
 * 3. **It survives JSON.** `null` appears in the payload a backend engineer
 *    inspects. An omitted key does not, and "why is this field missing on some
 *    rows" becomes a support question instead of a documented value.
 * 4. **Consistency.** Every nullable in this data layer is `T | null` and never
 *    optional — `lastTripAt`, `slaDueAt`, `claim`, `reversesPostingId`. A
 *    second convention on the one field the splitter branches on is exactly
 *    where a second convention costs the most.
 *
 * The field is **persisted, never recomputed at render** (`DESIGN.md` §8.3,
 * AC-311). It is signed, because a balance is a value and values carry signs.
 */
export interface LedgerPosting {
  /** `WTX-0004`, `REF-0003`, `ESC-1041-R1`. Stable, and the reversal names it. */
  id: string
  /** Which ledger this row belongs to. Its `normalSide` is what `direction` is relative to. */
  subjectAccount: AccountKey
  /** Rider id / captain id / subscription id. `null` for a platform-level account. */
  subjectId: string | null
  /** Server clock, never a display string. Legacy stores `'25 Jun 07:00'` (`:2676`). */
  postedAt: IsoDateTime
  direction: PostingDirection
  /** **Positive integer, always.** A negative posting amount is a fixture bug (AC-300). */
  amountHalalas: Halalas
  /** i18n key + params (§11). Never a concatenated sentence. */
  description: LocalisedText
  /** The human-readable document number, when there is one. */
  reference: string | null
  sourceType: PostingSourceType
  /** The id of that document — the row's ONE link (AC-315). */
  sourceId: string | null
  kind: PostingKind
  /** Set **iff** `kind === 'reversal'` (§3.3 invariant). */
  reversesPostingId: string | null
  /** Back-link, written once by the act of reversal (§3.5). */
  reversedByPostingId: string | null
  settlement: SettlementState
  /** Persisted and signed. `null` on a non-settled row — see the note above. */
  balanceAfterHalalas: Halalas | null
  /** The GL entry this posting belongs to. `null` only on a row awaiting its entry. */
  journalEntryId: string | null
  /** The operator, for operator-initiated postings. Renders in the description line. */
  actorId: string | null
  /** **Required when `kind === 'adjustment'`** (§3.4d). `null` otherwise. */
  reasonCode: string | null
}

/* ───────────────────────── journal entry ────────────────────── */

export interface AccountLine {
  account: AccountKey
  direction: PostingDirection
  /** Positive integer. Same rule as a posting. */
  amountHalalas: Halalas
}

/**
 * The balanced GL entry, shown only on Ledger & Payment Controls.
 *
 * `sum(debit lines) === sum(credit lines)` on every entry (AC-343). An
 * unbalanced entry is **refused, not written** — legacy already does this and
 * keeps the refusal visible in `DB.moneyRejects` (`:19926`). Both behaviours
 * are kept: see `RefusedPosting`.
 */
export interface JournalEntry {
  /** `JE-00001` (`:19931`). */
  id: string
  postedAt: IsoDateTime
  /** `fare_capture` · `refund` · `wallet_credit` · … — the recipe that produced it. */
  type: string
  /** The idempotency key (`:19931`). Deterministic, derived from what was done. */
  reference: string
  lines: AccountLine[]
  /** `== sum of debit lines == sum of credit lines`. */
  totalHalalas: Halalas
  meta: Record<string, string>
}

/**
 * A posting the ledger refused. Kept visible rather than dropped — the one
 * thing the legacy money module gets unambiguously right (`:19926`).
 *
 * `reason` is a **key**, not a sentence: legacy builds `'unbalanced: debits X
 * vs credits Y'` (`:19924`) and then embeds it inside another sentence
 * (`:19928`), which is a sentence inside a sentence and cannot be translated.
 */
export interface RefusedPosting {
  reference: string
  type: string
  reason: LocalisedText
  attemptedAt: IsoDateTime
  lines: AccountLine[]
}

/* ──────────────────────── ledger envelope ───────────────────── */

/**
 * One subject ledger, as a screen reads it (§6.1).
 *
 * Deliberately **not** `Paginated<LedgerPosting>`: a ledger is oldest-first
 * with a labelled opening row, a labelled closing row and a truncation
 * statement in words (AC-317, AC-320), and its "page" is a window over an
 * ordered history rather than a page of an index. `totalPostings` /
 * `returnedPostings` carry what pagination needs without pretending the two
 * envelopes are the same thing.
 */
export interface Ledger {
  subjectAccount: AccountKey
  /** `null` for a platform-level account such as `contra.refunds`. */
  subjectId: string | null
  /** The party's name, resolved server-side. A component never joins to get it. */
  subjectName: string | null
  /** Signed. The balance carried into `periodStart`. */
  openingBalanceHalalas: Halalas
  /** Signed. Equals the last settled row's `balanceAfterHalalas` (AC-318). */
  closingBalanceHalalas: Halalas
  /**
   * Sum of `PENDING_SETTLEMENTS` rows. **Excluded from the balance** and shown
   * on its own labelled line beneath it (AC-312). Server-computed.
   */
  pendingHalalas: Halalas
  /** Oldest-first (AC-317). */
  postings: LedgerPosting[]
  /**
   * How many postings match the **period window**, before pagination.
   *
   * It is the denominator of `Showing {returned} of {total} postings` and it is
   * the figure AC-317 / AC-320's truncation statement is written against. That
   * is its only job and it is correct for it.
   *
   * **It is NOT "does this subject have any history".** The two questions read
   * alike and are not the same one: `totalPostings === 0` means *nothing
   * happened in the window you asked for*, which a subject with years of
   * history has every quiet month. Deciding a first-run empty state from it is
   * circular — the question *"is this ledger empty?"* answered with *"were
   * there rows in this window?"* — and it renders `No money has moved here yet`
   * directly beneath a `LedgerHeader` showing a real opening balance.
   *
   * **Use `lifetimePostings` for that.** The previous wording here read
   * *"across the whole ledger, before the window"*, which is ambiguous between
   * *before pagination* (what it means) and *before the period window* (what it
   * was read as), and four screens took the second reading. A field whose
   * comment does not name the layer it applies to gets applied at the wrong one.
   */
  totalPostings: number
  /** How many are in `postings`. `Showing {returned} of {total} postings`. */
  returnedPostings: number
  /**
   * How many postings this subject has **ever** had, ignoring the window and
   * ignoring pagination.
   *
   * A **subject-lifetime fact**, and the only honest input to a first-run empty
   * state: *"a platform ledger is never first-run empty; a party ledger can
   * be."* `lifetimePostings === 0` is the one condition under which a ledger
   * has genuinely never moved.
   *
   * Separate from `totalPostings` on purpose rather than derived from it,
   * because no window figure can answer a lifetime question — and a screen that
   * has both cannot accidentally use the wrong one, which is what happened when
   * it had only one.
   */
  lifetimePostings: number
  periodStart: IsoDate | null
  periodEnd: IsoDate | null
}

/* ─────────────── Ledger & Payment Controls readings ─────────── */

export interface TrialBalanceRow {
  account: AccountKey
  label: string
  type: AccountType
  /** Signed, on the account's normal side (`accountBalance`, `:19938`). */
  balanceHalalas: Halalas
}

export interface TrialBalance {
  /** **Every** account, including zero-balance ones (AC-415). */
  rows: TrialBalanceRow[]
  totalDebitsHalalas: Halalas
  totalCreditsHalalas: Halalas
  balanced: boolean
  /** Signed. `totalDebits − totalCredits`. `0` when balanced; the banner names it otherwise. */
  differenceHalalas: Halalas
  entryCount: number
}

/**
 * One row of the operational-vs-ledger comparison (`ledgerReconcile`, `:20061`).
 *
 * **D-F12 is closed here.** Legacy's refund row adds
 * `accountBalance('tax.vat_output') * 0` — multiplied by zero — so a
 * VAT-inclusive operational figure is compared against a VAT-exclusive ledger
 * figure and shows a permanent ~13.04 % break presented as a real one. AC-420
 * requires like-for-like, so the basis is stated on the row and both figures
 * are on it.
 */
export interface ReconciliationRow {
  /** i18n key for the row label. */
  label: LocalisedText
  operationalHalalas: Halalas
  ledgerHalalas: Halalas
  /** **Derived** by the screen: `operational − ledger`. Server sends it too, so the two can be compared. */
  differenceHalalas: Halalas
  /** Which basis both figures are on. A row comparing two different bases is the D-F12 defect. */
  vatBasis: 'inclusive' | 'exclusive' | 'not-applicable'
}

/** `idemStats()` (`:19941`). The evidence that double-submits were caught rather than charged. */
export interface IdempotencyStats {
  operations: number
  duplicated: number
  suppressed: number
}
