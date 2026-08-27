/**
 * Financials › Ledger & Payment Controls, plus the subject-ledger reader every
 * other Financials client is built on.
 *
 * `buildLedger` is the one place a `Ledger` envelope is assembled — opening
 * row, postings window, closing row, pending line, truncation counts. Five
 * sub-tabs render a ledger; if each built its own envelope, five screens would
 * disagree about what "closing balance" means, which is the exact failure the
 * legacy app has across `finance`, `wallets`, `rwallets` and the `ledger` pane.
 *
 * The trial balance, every account balance and the reconciliation rows are
 * **computed from `journalEntryFixtures`**, not stored. That is what makes
 * AC-417 structural: an account that can never be posted to shows zero and
 * cannot be faked, and changing a fixture changes the tile (AC-346, AC-423).
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import {
  journalEntryFixtures,
  ledgerPostingFixtures,
  outOfBalanceEntryFixture,
  refusedPostingFixtures,
} from '../fixtures/ledger'
import {
  captainDebtFixtures,
  invoiceSequenceFixture,
  paymentGatewayFixtures,
  refundFixtures,
  vatConfigFixture,
} from '../fixtures/financials'
import { riderFixtures } from '../fixtures/riders'
import { ApiError, type Halalas, type LocalisedText, type Paginated } from '../types/common'
import type { InvoiceSequence, PaymentGateway, VatConfig } from '../types/financials'
import {
  accountDefinition,
  CHART_OF_ACCOUNTS,
  isPendingSettlement,
  type AccountKey,
  type AccountLine,
  type IdempotencyStats,
  type JournalEntry,
  type Ledger,
  type LedgerPosting,
  type PostingDirection,
  type PostingKind,
  type PostingSourceType,
  type ReconciliationRow,
  type RefusedPosting,
  type SettlementState,
  type TrialBalance,
} from '../types/ledger'
import { http } from './http'
import { appendAudit } from './audit'
import { CURRENT_USER_ID, teamUserFixtures } from '../fixtures/teamUsers'

export const LEDGER_OPERATIONS = {
  postings: 'ledger.postings',
  posting: 'ledger.posting',
  reverse: 'ledger.reverse',
  trialBalance: 'ledger.trialBalance',
  journal: 'ledger.journal',
  refused: 'ledger.refused',
  reconciliation: 'ledger.reconciliation',
  idempotency: 'ledger.idempotency',
  gateways: 'ledger.gateways',
  toggleGateway: 'ledger.toggleGateway',
  setDefaultGateway: 'ledger.setDefaultGateway',
  vatConfig: 'ledger.vatConfig',
  invoiceSequence: 'ledger.invoiceSequence',
} as const

/* ─────────────────── mutable mock state ─────────────────────── */

/**
 * Postings written by mutations in this session. Kept separate from the
 * fixture array so `resetLedger()` is a single assignment and one test cannot
 * leak a reversal into the next file's closing balance.
 */
let sessionPostings: LedgerPosting[] = []
let sessionEntries: JournalEntry[] = []
let gatewayState: PaymentGateway[] = paymentGatewayFixtures.map((g) => ({ ...g }))
let outOfBalance = false

export function resetLedger(): void {
  sessionPostings = []
  sessionEntries = []
  gatewayState = paymentGatewayFixtures.map((g) => ({ ...g }))
  outOfBalance = false
}

/**
 * Put the books out of balance, so AC-351's critical banner and AC-416's
 * out-of-balance state are reachable without hand-editing a fixture.
 *
 * The mechanism is a **migration entry whose two sides do not agree** — the
 * only way a trial balance can go out of balance under this model, because
 * `postLedger` refuses an unbalanced entry at write time and always has
 * (`:19926`). The app cannot write one; a legacy import can.
 */
export function useOutOfBalanceLedger(): void {
  outOfBalance = true
}

/**
 * Fixtures **overlaid** by anything this session wrote, keyed by id.
 *
 * Not concatenated: a reversal marks the original row `reversed` and writes a
 * modified copy, and a plain concatenation would leave the untouched fixture
 * row in front of it — so the ledger would show the original as still settled
 * and a second reversal would be permitted. That is the exact bug AC-330
 * describes, arriving through the back door of a fixture array.
 */
function allPostings(): LedgerPosting[] {
  if (sessionPostings.length === 0) return [...ledgerPostingFixtures]
  const overlay = new Map(sessionPostings.map((p) => [p.id, p]))
  const merged = ledgerPostingFixtures.map((p) => overlay.get(p.id) ?? p)
  const seen = new Set(merged.map((p) => p.id))
  return [...merged, ...sessionPostings.filter((p) => !seen.has(p.id))]
}

/** Every posting, fixture plus session, for clients that build their own views. */
export function allLedgerPostings(): LedgerPosting[] {
  return allPostings()
}

/** Append or replace a posting written by a mutation in another client. */
export function recordSessionPosting(posting: LedgerPosting): void {
  sessionPostings = [...sessionPostings.filter((p) => p.id !== posting.id), posting]
}

function allEntries(): JournalEntry[] {
  const base = [...journalEntryFixtures, ...sessionEntries]
  return outOfBalance ? [...base, outOfBalanceEntryFixture] : base
}

/* ─────────────── writing money: the one door in ──────────────── */

/**
 * **Every money-moving act in this data layer goes through `postEntry`.**
 *
 * It exists because four acts did not. `payCaptain`, `releaseEscrow`,
 * `applyDeduction` and `recordCashRepayment` each moved a **summary** figure
 * and wrote an **audit entry**, and none of them wrote a `LedgerPosting` —
 * while AC-362, AC-364, AC-371 and AC-379 each say *posting*, explicitly. The
 * index converted, the payable dropped, and the captain's payable ledger showed
 * nothing: **the summary and the ledger stated different facts about the same
 * money, with the ledger as the wrong one.** That is §1's complaint arriving
 * from the other direction, and the ledger is the record.
 *
 * A helper rather than four hand-written blocks, for the reason the four blocks
 * demonstrate: an act that has to remember to write both legs is an act that
 * will one day write one. Here the GL entry is **derived from the postings**
 * plus whatever counter-legs have no subject ledger, and an entry that does not
 * balance is refused at write time — `postLedger` already refuses one
 * (`:19926`) and the mock must not be more permissive than the thing it stands
 * in for.
 *
 * What it guarantees, so no caller has to:
 *
 *   - `amountHalalas` is a **positive integer** on every posting and every GL
 *     line; a zero-amount leg is dropped, a negative one throws (AC-300).
 *   - `balanceAfterHalalas` chains from the subject's current closing balance,
 *     on the account's normal side, in draft order (AC-311). Several postings
 *     on one subject in one entry chain through each other.
 *   - `postedAt` is `EYVAR_NOW`. There is no `Date.now()` in this file.
 *   - Debits equal credits, or nothing is written at all (AC-343).
 */
export interface PostingDraft {
  /**
   * Stem for the generated id — `PAY-0101`, `ARD-0103`, `ESC-1052`. The
   * sequence number is the count of postings this subject already has, so ids
   * stay greppable and deterministic across runs.
   */
  idPrefix: string
  /** When the document names the posting itself, as a refund names `REF-0004-P`. */
  id?: string
  subjectAccount: AccountKey
  subjectId: string | null
  direction: PostingDirection
  /** Positive integer. `0` drops the leg; negative throws. */
  amountHalalas: Halalas
  description: LocalisedText
  reference: string | null
  sourceType: PostingSourceType
  sourceId: string | null
  kind?: PostingKind
  settlement?: SettlementState
  actorId?: string | null
  reasonCode?: string | null
}

export interface PostEntryInput {
  /** `payout` · `escrow_release` · `deduction` · `cash_repayment` · `refund`. */
  type: string
  /** The idempotency key, deterministic and derived from what was done (`:19931`). */
  reference: string
  meta: Record<string, string>
  /** The legs that land on a subject ledger. */
  postings: PostingDraft[]
  /**
   * The legs that do not — `cash.gateway`, `revenue.fares`, `expense.*`. They
   * are GL-only because those accounts have no party and therefore no subject
   * ledger; `CHART_OF_ACCOUNTS[k].scope === 'platform'` is the test.
   */
  counterLines?: AccountLine[]
}

function nextEntryId(): string {
  return `JE-9${String(sessionEntries.length + 1).padStart(4, '0')}`
}

/** The subject's closing balance right now: the last settled row's persisted balance. */
export function subjectClosingBalance(account: AccountKey, subjectId: string | null): Halalas {
  const rows = allPostings()
    .filter((p) => p.subjectAccount === account && p.subjectId === subjectId)
    .sort((a, b) => Date.parse(a.postedAt) - Date.parse(b.postedAt) || a.id.localeCompare(b.id))
  return [...rows].reverse().find((p) => p.balanceAfterHalalas !== null)?.balanceAfterHalalas ?? 0
}

/** Every party that has ever been posted to on this account, in a stable order. */
export function subjectIdsFor(account: AccountKey): string[] {
  const ids = new Set<string>()
  for (const p of allPostings()) {
    if (p.subjectAccount === account && p.subjectId !== null) ids.add(p.subjectId)
  }
  return [...ids].sort()
}

/** Net the legs down to one line per account, so the journal reads as a GL entry does. */
function netLines(lines: AccountLine[]): AccountLine[] {
  const byAccount = new Map<AccountKey, number>()
  for (const line of lines) {
    const signed = line.direction === 'debit' ? line.amountHalalas : -line.amountHalalas
    byAccount.set(line.account, (byAccount.get(line.account) ?? 0) + signed)
  }
  const out: AccountLine[] = []
  for (const account of CHART_OF_ACCOUNTS.map((a) => a.key)) {
    const signed = byAccount.get(account)
    if (signed === undefined || signed === 0) continue
    out.push({
      account,
      direction: signed > 0 ? 'debit' : 'credit',
      amountHalalas: Math.abs(signed),
    })
  }
  return out
}

export function postEntry(input: PostEntryInput): {
  entry: JournalEntry | null
  postings: LedgerPosting[]
} {
  const drafts = input.postings.filter((d) => d.amountHalalas !== 0)
  for (const d of [...drafts, ...(input.counterLines ?? [])]) {
    if (!Number.isInteger(d.amountHalalas) || d.amountHalalas < 0) {
      throw new Error(
        `A posting amount is positive and integral (AC-300); got ${d.amountHalalas} on ${
          'idPrefix' in d ? d.idPrefix : d.account
        }`,
      )
    }
  }

  /* **A pending leg produces no GL line.** An authorised hold has moved no
     money, which is why `journalEntryId` is nullable and why the GL and a
     subject ledger legitimately differ by exactly the pending line (AC-312).
     An entry with no lines at all is therefore not written — the posting
     carries `journalEntryId: null` and waits for its entry. */
  const lines = netLines([
    ...drafts
      .filter((d) => !isPendingSettlement(d.settlement ?? 'settled'))
      .map((d) => ({
        account: d.subjectAccount,
        direction: d.direction,
        amountHalalas: d.amountHalalas,
      })),
    ...(input.counterLines ?? []).filter((l) => l.amountHalalas !== 0),
  ])

  const debits = lines.filter((l) => l.direction === 'debit').reduce((s, l) => s + l.amountHalalas, 0)
  const credits = lines.filter((l) => l.direction === 'credit').reduce((s, l) => s + l.amountHalalas, 0)
  if (debits !== credits) {
    /* Refused, not written — and loudly, because in a mock an unbalanced entry
       is a bug in the client that built it, not a bad import. */
    throw new Error(
      `Refusing an unbalanced entry (${input.reference}): debits ${debits} vs credits ${credits}`,
    )
  }

  const entryId = lines.length === 0 ? null : nextEntryId()
  const taken = new Set(allPostings().map((p) => p.id))
  const running = new Map<string, Halalas>()
  /* Per subject, so two legs on two different ledgers in one entry each carry
     their own ledger's next number rather than sharing a counter and leaving a
     gap that reads like a deleted row. */
  const sequence = new Map<string, number>()
  const written: LedgerPosting[] = []

  for (const draft of drafts) {
    const subjectKey = `${draft.subjectAccount}|${draft.subjectId ?? ''}`
    const seeded =
      sequence.get(subjectKey) ??
      allPostings().filter(
        (p) => p.subjectAccount === draft.subjectAccount && p.subjectId === draft.subjectId,
      ).length
    let next = seeded + 1
    let id = draft.id ?? `${draft.idPrefix}-${next}`
    if (draft.id !== undefined && taken.has(draft.id)) {
      /* A document that names its own posting has named one that already
         exists. Silently renaming it would break the document's link to it —
         `Refund.postingId` would point at nothing. */
      throw new Error(`Posting id ${draft.id} is already taken`)
    }
    while (taken.has(id)) id = `${draft.idPrefix}-${++next}`
    sequence.set(subjectKey, next)
    taken.add(id)

    const settlement = draft.settlement ?? 'settled'
    const previous =
      running.get(subjectKey) ?? subjectClosingBalance(draft.subjectAccount, draft.subjectId)
    const delta = draft.direction === 'credit' ? draft.amountHalalas : -draft.amountHalalas
    const signed =
      accountDefinition(draft.subjectAccount).normalSide === 'credit'
        ? previous + delta
        : previous - delta

    /* A pending row carries `null` and is excluded from the balance (AC-312),
       so it must not advance the running balance either. */
    const balanceAfterHalalas = isPendingSettlement(settlement) ? null : signed
    if (balanceAfterHalalas !== null) running.set(subjectKey, balanceAfterHalalas)

    written.push({
      id,
      subjectAccount: draft.subjectAccount,
      subjectId: draft.subjectId,
      postedAt: EYVAR_NOW,
      direction: draft.direction,
      amountHalalas: draft.amountHalalas,
      description: draft.description,
      reference: draft.reference,
      sourceType: draft.sourceType,
      sourceId: draft.sourceId,
      kind: draft.kind ?? 'primary',
      reversesPostingId: null,
      reversedByPostingId: null,
      settlement,
      balanceAfterHalalas,
      journalEntryId: entryId,
      actorId: draft.actorId ?? null,
      reasonCode: draft.reasonCode ?? null,
    })
  }

  const entry: JournalEntry | null =
    entryId === null
      ? null
      : {
          id: entryId,
          postedAt: EYVAR_NOW,
          type: input.type,
          reference: input.reference,
          lines,
          totalHalalas: debits,
          meta: input.meta,
        }

  if (entry) sessionEntries = [...sessionEntries, entry]
  for (const posting of written) recordSessionPosting(posting)

  return { entry, postings: written }
}

/* ───────────────────── account arithmetic ───────────────────── */

/**
 * `accountBalance()` (`:19938`), with the normal side read from the chart
 * rather than re-derived from `type` at every call site.
 *
 * Signed: assets, expenses and contra-revenue are debit-normal, so a debit
 * increases them; liabilities and revenue are credit-normal.
 */
export function accountBalanceFrom(entries: readonly JournalEntry[], account: AccountKey): Halalas {
  let debits = 0
  let credits = 0
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.account !== account) continue
      if (line.direction === 'debit') debits += line.amountHalalas
      else credits += line.amountHalalas
    }
  }
  return accountDefinition(account).normalSide === 'debit' ? debits - credits : credits - debits
}

/** Only the debits (or only the credits) to one account, for the period figures §6.2 names. */
export function accountFlowFrom(
  entries: readonly JournalEntry[],
  account: AccountKey,
  direction: 'debit' | 'credit',
  window?: { from?: string; to?: string },
): Halalas {
  let total = 0
  for (const entry of entries) {
    if (!withinWindow(entry.postedAt, window)) continue
    for (const line of entry.lines) {
      if (line.account === account && line.direction === direction) total += line.amountHalalas
    }
  }
  return total
}

function withinWindow(at: string, window?: { from?: string; to?: string }): boolean {
  if (!window) return true
  const t = Date.parse(at)
  if (window.from && t < Date.parse(toInstant(window.from)!)) return false
  // Inclusive upper bound: a period ending 2026-06-30 includes all of that day.
  if (window.to && t > Date.parse(`${window.to}T23:59:59.999+03:00`)) return false
  return true
}

/** Exported for the other Financials clients, which all need period-scoped account flows. */
export function journalEntries(): readonly JournalEntry[] {
  return allEntries()
}

/* ────────────────────── the ledger builder ──────────────────── */

export interface LedgerQuery {
  /** Inclusive `IsoDate`. Postings before it fold into the opening balance. */
  from?: string
  /** Inclusive `IsoDate`. */
  to?: string
  /** 1-based. A ledger's "page" is a window over an ordered history, not an index page. */
  page?: number
  pageSize?: number
  signal?: AbortSignal
}

/**
 * Assemble one subject ledger.
 *
 * Ordering is oldest-first (AC-317), by `postedAt` then by `id` so two postings
 * on the same instant have a stable order across runs — a ledger whose rows
 * shuffle between renders cannot be diffed by a visual regression test.
 *
 * `closingBalanceHalalas` is the **last settled row's persisted
 * `balanceAfterHalalas`**, never a re-sum of the amounts. That is AC-311: edit
 * an earlier posting's amount in a fixture and no later row's balance changes,
 * because nothing recomputes it.
 */
export function buildLedger(
  subjectAccount: AccountKey,
  subjectId: string | null,
  subjectName: string | null,
  query: LedgerQuery = {},
): Ledger {
  const rows = allPostings()
    .filter((p) => p.subjectAccount === subjectAccount && p.subjectId === subjectId)
    .sort((a, b) => Date.parse(a.postedAt) - Date.parse(b.postedAt) || a.id.localeCompare(b.id))

  const before = rows.filter((p) => query.from && Date.parse(p.postedAt) < Date.parse(toInstant(query.from)!))
  const inWindow = rows.filter((p) => withinWindow(p.postedAt, query))

  const lastSettledBefore = [...before].reverse().find((p) => p.balanceAfterHalalas !== null)
  const openingBalanceHalalas = lastSettledBefore?.balanceAfterHalalas ?? 0

  const lastSettledInWindow = [...inWindow].reverse().find((p) => p.balanceAfterHalalas !== null)
  const closingBalanceHalalas = lastSettledInWindow?.balanceAfterHalalas ?? openingBalanceHalalas

  const pendingHalalas = inWindow
    .filter((p) => isPendingSettlement(p.settlement))
    .reduce((sum, p) => sum + (p.direction === 'credit' ? p.amountHalalas : -p.amountHalalas), 0)

  const pageSize = query.pageSize ?? inWindow.length
  const page = query.page ?? 1
  const start = (page - 1) * pageSize
  const postings = inWindow.slice(start, start + pageSize)

  return {
    subjectAccount,
    subjectId,
    subjectName,
    openingBalanceHalalas,
    closingBalanceHalalas,
    pendingHalalas,
    postings,
    totalPostings: inWindow.length,
    returnedPostings: postings.length,
    /* The subject's whole history, window ignored. `rows` was already computed
       and its length already thrown away; naming it is what stops a screen
       answering "has this subject ever moved money?" with the window count.
       See `types/ledger.ts` on both fields. */
    lifetimePostings: rows.length,
    periodStart: query.from ?? null,
    periodEnd: query.to ?? null,
  }
}

/**
 * GET /api/v1/ledgers/:account/:subjectId
 *   params: from · to · page · pageSize
 *   -> Ledger
 *
 * `subjectId` is omitted for a platform-level account (`contra.refunds`), which
 * the http transport encodes as `/ledgers/contra.refunds`.
 */
export async function getLedger(
  subjectAccount: AccountKey,
  subjectId: string | null,
  query: LedgerQuery = {},
): Promise<Ledger> {
  if (DATA_SOURCE === 'http') {
    const path = subjectId ? `/ledgers/${subjectAccount}/${subjectId}` : `/ledgers/${subjectAccount}`
    return http.get<Ledger>(path, { from: query.from, to: query.to, page: query.page, pageSize: query.pageSize }, { signal: query.signal })
  }
  return mock(LEDGER_OPERATIONS.postings, query.signal, () =>
    buildLedger(subjectAccount, subjectId, resolveSubjectName(subjectAccount, subjectId), query),
  )
}

/** Party names are resolved server-side; a component never joins to get one. */
export function resolveSubjectName(account: AccountKey, subjectId: string | null): string | null {
  if (subjectId === null) return null
  const scope = accountDefinition(account).scope
  if (scope === 'rider') return riderFixtures.find((r) => r.id === subjectId)?.name ?? subjectId
  if (scope === 'captain') {
    return captainDebtFixtures.find((c) => c.captainId === subjectId)?.captainName ?? subjectId
  }
  return subjectId
}

/**
 * GET /api/v1/postings/:id
 *   -> LedgerPosting
 *
 * Path 2 of the reversal flow (§3.6) resolves a posting by **reference**, so a
 * reference lookup falls back to `reference` when the id misses.
 */
export async function getPosting(idOrReference: string, signal?: AbortSignal): Promise<LedgerPosting> {
  if (DATA_SOURCE === 'http') {
    return http.get<LedgerPosting>(`/postings/${idOrReference}`, undefined, { signal })
  }
  return mock(LEDGER_OPERATIONS.posting, signal, () => {
    const row =
      allPostings().find((p) => p.id === idOrReference) ??
      allPostings().find((p) => p.reference === idOrReference)
    if (!row) throw notFound('posting', idOrReference)
    return row
  })
}

/**
 * POST /api/v1/postings/:id/reverse
 *   body: { reasonCode, note }
 *   -> { original: LedgerPosting, reversal: LedgerPosting | null }
 *   409 when already reversed  ·  422 without a reason code
 *
 * Idempotent on the deterministic key `('reverse', postingId)` (`:19895`) —
 * the one place the legacy key needs no time component, unlike the refund key
 * which wrongly has none (**D-F13**). A double-click, a retry and a second tab
 * all produce exactly one reversing posting (AC-331).
 *
 * **A reversal on a `held` or `authorised` posting is a release, not a
 * reversal** (AC-332): the row transitions to `released` and **no new posting
 * is written**, because no money moved. `releaseEscrow` splices the record out
 * of the array today (`:7064`) and that must not ship.
 */
export async function reversePosting(
  postingId: string,
  reasonCode: string,
  note = '',
  signal?: AbortSignal,
): Promise<{ original: LedgerPosting; reversal: LedgerPosting | null }> {
  if (DATA_SOURCE === 'http') {
    return http.post(`/postings/${postingId}/reverse`, { reasonCode, note }, { signal })
  }
  return mockMutation(LEDGER_OPERATIONS.reverse, signal, () => {
    const original = allPostings().find((p) => p.id === postingId)
    if (!original) throw notFound('posting', postingId)

    if (!reasonCode.trim()) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'reason_code_required',
        message: 'A reversal needs a reason code',
        details: [{ field: 'reasonCode', code: 'required', message: 'Choose a reason' }],
        retryable: false,
      })
    }

    if (original.reversedByPostingId) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'already_reversed',
        /* Names the reversing posting so the refusal can link to it (AC-330). */
        message: `${postingId} was already reversed by ${original.reversedByPostingId}`,
        details: [
          { field: 'reversedByPostingId', code: 'exists', message: original.reversedByPostingId },
        ],
        retryable: false,
      })
    }

    const me = teamUserFixtures.find((u) => u.id === CURRENT_USER_ID)!

    /* Held or authorised: release, no new posting, no money moved. */
    if (original.settlement === 'held' || original.settlement === 'authorised') {
      const released: LedgerPosting = { ...original, settlement: 'released' }
      sessionPostings = [...sessionPostings.filter((p) => p.id !== original.id), released]
      appendAudit({
        action: 'posting.reverse',
        subjectType: 'posting',
        subjectId: original.id,
        amountHalalas: original.amountHalalas,
        reasonCode,
        note: note || null,
        detail: { key: 'fin.audit.postingReleased', params: { reference: original.id } },
      })
      return { original: released, reversal: null }
    }

    const reversalId = `${original.id}-R1`
    const journalEntryId = `JE-9${String(sessionEntries.length + 1).padStart(4, '0')}`
    const flipped = original.direction === 'debit' ? 'credit' : 'debit'
    const delta = flipped === 'credit' ? original.amountHalalas : -original.amountHalalas
    const previous = original.balanceAfterHalalas ?? 0

    const reversal: LedgerPosting = {
      id: reversalId,
      subjectAccount: original.subjectAccount,
      subjectId: original.subjectId,
      postedAt: EYVAR_NOW,
      direction: flipped,
      /* **Copied, never recomputed**, so the net effect cannot drift by a
         halala (§3.4a). */
      amountHalalas: original.amountHalalas,
      description: { key: 'fin.posting.reverses', params: { reference: original.id } },
      reference: reversalId,
      sourceType: 'reversal',
      sourceId: original.id,
      kind: 'reversal',
      reversesPostingId: original.id,
      reversedByPostingId: null,
      settlement: 'settled',
      balanceAfterHalalas: previous + delta,
      journalEntryId,
      actorId: me.id,
      reasonCode,
    }

    const originalEntry = allEntries().find((e) => e.id === original.journalEntryId)
    if (originalEntry) {
      sessionEntries = [
        ...sessionEntries,
        {
          id: journalEntryId,
          postedAt: EYVAR_NOW,
          type: 'reversal',
          reference: `reverse|${original.id}`,
          /* The mirror image: same accounts, directions flipped (§3.4a). */
          lines: originalEntry.lines.map((l) => ({
            ...l,
            direction: l.direction === 'debit' ? ('credit' as const) : ('debit' as const),
          })),
          totalHalalas: originalEntry.totalHalalas,
          meta: { reverses: originalEntry.id, postingId: original.id, actorId: me.id },
        },
      ]
    }

    const marked: LedgerPosting = {
      ...original,
      settlement: 'reversed',
      reversedByPostingId: reversalId,
    }
    sessionPostings = [...sessionPostings.filter((p) => p.id !== original.id), marked, reversal]

    appendAudit({
      action: 'posting.reverse',
      subjectType: 'posting',
      subjectId: original.id,
      amountHalalas: original.amountHalalas,
      reasonCode,
      note: note || null,
      detail: {
        key: 'fin.audit.postingReversed',
        params: { original: original.id, reversal: reversalId },
      },
    })

    return { original: marked, reversal }
  })
}

/* ─────────────────── trial balance & journal ─────────────────── */

/**
 * GET /api/v1/ledger/trial-balance
 *   params: from · to
 *   -> TrialBalance
 *
 * Lists **every** account in the chart, including zero-balance ones (AC-415).
 * A trial balance that hides its empty rows cannot show you that
 * `liability.escrow` has never been posted to, which is the exact failure
 * `12a` R11 records.
 */
export async function getTrialBalance(signal?: AbortSignal): Promise<TrialBalance> {
  if (DATA_SOURCE === 'http') {
    return http.get<TrialBalance>('/ledger/trial-balance', undefined, { signal })
  }
  return mock(LEDGER_OPERATIONS.trialBalance, signal, () => {
    const entries = allEntries()
    let totalDebitsHalalas = 0
    let totalCreditsHalalas = 0
    for (const entry of entries) {
      for (const line of entry.lines) {
        if (line.direction === 'debit') totalDebitsHalalas += line.amountHalalas
        else totalCreditsHalalas += line.amountHalalas
      }
    }
    return {
      rows: CHART_OF_ACCOUNTS.map((a) => ({
        account: a.key,
        label: a.label,
        type: a.type,
        balanceHalalas: accountBalanceFrom(entries, a.key),
      })),
      totalDebitsHalalas,
      totalCreditsHalalas,
      balanced: totalDebitsHalalas === totalCreditsHalalas,
      differenceHalalas: totalDebitsHalalas - totalCreditsHalalas,
      entryCount: entries.length,
    }
  })
}

/**
 * GET /api/v1/ledger/journal
 *   params: page · pageSize
 *   -> Paginated<JournalEntry>
 *
 * **Newest-first** — the one exception to oldest-first in this wave, because
 * the journal carries no running balance and therefore no order to preserve
 * (§6.8). The fixture is stored oldest-first and reversed here, so the fixture
 * stays readable as a chronology.
 */
export async function listJournalEntries(
  params: { page?: number; pageSize?: number; signal?: AbortSignal } = {},
): Promise<Paginated<JournalEntry>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<JournalEntry>>(
      '/ledger/journal',
      { page: params.page, pageSize: params.pageSize },
      { signal: params.signal },
    )
  }
  return mock(LEDGER_OPERATIONS.journal, params.signal, () => {
    const rows = [...allEntries()].sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
    const pageSize = params.pageSize ?? 25
    const page = params.page ?? 1
    const start = (page - 1) * pageSize
    return {
      items: rows.slice(start, start + pageSize),
      page,
      pageSize,
      total: rows.length,
      totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
    }
  })
}

/**
 * GET /api/v1/ledger/refused
 *   -> RefusedPosting[]
 *
 * Refusals are kept visible, never dropped — legacy gets this right
 * (`:19926`) and it stays (AC-419).
 */
export async function listRefusedPostings(signal?: AbortSignal): Promise<RefusedPosting[]> {
  if (DATA_SOURCE === 'http') return http.get<RefusedPosting[]>('/ledger/refused', undefined, { signal })
  return mock(LEDGER_OPERATIONS.refused, signal, () => refusedPostingFixtures)
}

/**
 * GET /api/v1/ledger/reconciliation
 *   -> ReconciliationRow[]
 *
 * **D-F12 closed.** Legacy's refund row adds `accountBalance('tax.vat_output')
 * * 0` — literally multiplied by zero (`:20065`) — so a VAT-inclusive
 * operational figure is compared with a VAT-exclusive ledger figure and shows a
 * permanent ~13.04 % break presented as a real one. Every row here declares its
 * `vatBasis` and both figures are on it (AC-420).
 *
 * The `ar.driver` row is a **genuine** break and is meant to be: the
 * operational figure the Cash sub-tab shows is the positive-only total, and the
 * ledger figure nets in the one captain who is in credit. The 4.40 gap is
 * exactly what AC-381 forbids hiding.
 */
export async function listReconciliation(signal?: AbortSignal): Promise<ReconciliationRow[]> {
  if (DATA_SOURCE === 'http') {
    return http.get<ReconciliationRow[]>('/ledger/reconciliation', undefined, { signal })
  }
  return mock(LEDGER_OPERATIONS.reconciliation, signal, () => {
    const entries = allEntries()
    const walletOperational = riderFixtures.reduce((s, r) => s + r.walletBalanceHalalas, 0)
    /* Net of VAT on both sides — the refund documents' gross is VAT-inclusive,
       so the operational figure uses each credit note's subtotal. */
    const refundOperational = refundFixtures.reduce(
      (s, r) => s + Math.round(r.amountHalalas / 1.15),
      0,
    )
    const debtOperational = captainDebtFixtures
      .filter((c) => c.balanceHalalas > 0)
      .reduce((s, c) => s + c.balanceHalalas, 0)

    const rows: Array<Omit<ReconciliationRow, 'differenceHalalas'>> = [
      {
        label: { key: 'fin.reconcile.riderWallets' },
        operationalHalalas: walletOperational,
        ledgerHalalas: accountBalanceFrom(entries, 'liability.wallet'),
        vatBasis: 'not-applicable',
      },
      {
        label: { key: 'fin.reconcile.refunds' },
        operationalHalalas: refundOperational,
        ledgerHalalas: accountBalanceFrom(entries, 'contra.refunds'),
        vatBasis: 'exclusive',
      },
      {
        label: { key: 'fin.reconcile.goodwill' },
        operationalHalalas: accountBalanceFrom(entries, 'expense.goodwill'),
        ledgerHalalas: accountBalanceFrom(entries, 'expense.goodwill'),
        vatBasis: 'not-applicable',
      },
      {
        label: { key: 'fin.reconcile.captainReceivable' },
        operationalHalalas: debtOperational,
        ledgerHalalas: accountBalanceFrom(entries, 'ar.driver'),
        vatBasis: 'not-applicable',
      },
    ]
    return rows.map((r) => ({
      ...r,
      differenceHalalas: r.operationalHalalas - r.ledgerHalalas,
    }))
  })
}

/**
 * GET /api/v1/ledger/idempotency
 *   -> IdempotencyStats
 *
 * `idemStats()` (`:19941`) — the evidence that double-submits were caught
 * rather than charged.
 */
export async function getIdempotencyStats(signal?: AbortSignal): Promise<IdempotencyStats> {
  if (DATA_SOURCE === 'http') {
    return http.get<IdempotencyStats>('/ledger/idempotency', undefined, { signal })
  }
  return mock(LEDGER_OPERATIONS.idempotency, signal, () => ({
    operations: 1_284,
    duplicated: 7,
    suppressed: 9,
  }))
}

/* ─────────────────────── payment gateways ───────────────────── */

/**
 * GET /api/v1/gateways
 *   params: from · to
 *   -> PaymentGateway[]
 */
export async function listGateways(signal?: AbortSignal): Promise<PaymentGateway[]> {
  if (DATA_SOURCE === 'http') return http.get<PaymentGateway[]>('/gateways', undefined, { signal })
  return mock(LEDGER_OPERATIONS.gateways, signal, () => gatewayState)
}

/**
 * POST /api/v1/gateways/:id/enabled
 *   body: { enabled: boolean }
 *   -> PaymentGateway
 *   409 when disabling the default gateway
 *
 * Disabling the default is refused, naming that a different default must be set
 * first (`:7480`, correct behaviour, kept). The switch returns to its previous
 * position; it never optimistically flips (AC-422).
 */
export async function setGatewayEnabled(
  id: string,
  enabled: boolean,
  signal?: AbortSignal,
): Promise<PaymentGateway> {
  if (DATA_SOURCE === 'http') {
    return http.post<PaymentGateway>(`/gateways/${id}/enabled`, { enabled }, { signal })
  }
  return mockMutation(LEDGER_OPERATIONS.toggleGateway, signal, () => {
    const gateway = gatewayState.find((g) => g.id === id)
    if (!gateway) throw notFound('gateway', id)
    if (!enabled && gateway.isDefault) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'default_gateway',
        message: 'Set a different default gateway first',
        retryable: false,
      })
    }
    const next = { ...gateway, enabled }
    gatewayState = gatewayState.map((g) => (g.id === id ? next : g))
    appendAudit({
      action: 'gateway.toggle',
      subjectType: 'gateway',
      subjectId: id,
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: { key: 'fin.audit.gatewayToggled', params: { gateway: gateway.name } },
    })
    return next
  })
}

/**
 * POST /api/v1/gateways/:id/default
 *   -> PaymentGateway[]
 *   409 when the gateway is disabled
 */
export async function setDefaultGateway(id: string, signal?: AbortSignal): Promise<PaymentGateway[]> {
  if (DATA_SOURCE === 'http') {
    return http.post<PaymentGateway[]>(`/gateways/${id}/default`, undefined, { signal })
  }
  return mockMutation(LEDGER_OPERATIONS.setDefaultGateway, signal, () => {
    const gateway = gatewayState.find((g) => g.id === id)
    if (!gateway) throw notFound('gateway', id)
    if (!gateway.enabled) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'gateway_disabled',
        message: 'Enable the gateway before making it the default',
        retryable: false,
      })
    }
    gatewayState = gatewayState.map((g) => ({ ...g, isDefault: g.id === id }))
    appendAudit({
      action: 'gateway.setDefault',
      subjectType: 'gateway',
      subjectId: id,
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: { key: 'fin.audit.gatewayDefaulted', params: { gateway: gateway.name } },
    })
    return gatewayState
  })
}

/* ──────────────────── VAT and invoicing ─────────────────────── */

/**
 * GET /api/v1/vat-config
 *   -> VatConfig
 */
export async function getVatConfig(signal?: AbortSignal): Promise<VatConfig> {
  if (DATA_SOURCE === 'http') return http.get<VatConfig>('/vat-config', undefined, { signal })
  return mock(LEDGER_OPERATIONS.vatConfig, signal, () => vatConfigFixture)
}

/**
 * GET /api/v1/invoice-sequence
 *   -> InvoiceSequence
 *
 * Read-only across the seam. Gapless numbering is a legal requirement, so a
 * client never allocates a number — legacy increments the sequence inside a
 * *render* function (`:4404`), so previewing an invoice burns one (AC-424).
 */
export async function getInvoiceSequence(signal?: AbortSignal): Promise<InvoiceSequence> {
  if (DATA_SOURCE === 'http') {
    return http.get<InvoiceSequence>('/invoice-sequence', undefined, { signal })
  }
  return mock(LEDGER_OPERATIONS.invoiceSequence, signal, () => invoiceSequenceFixture)
}
