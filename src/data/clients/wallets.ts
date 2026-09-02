/**
 * Financials › Rider Wallets.
 *
 * **An index *of* ledgers.** The top level is an index table of riders —
 * selection, sort and filters all apply (foundation §7.1). The second level,
 * reached by the identity link, is that rider's ledger — none of the three
 * exists there (§7.2). The boundary is the identity link and the two rule sets
 * do not mix (AC-382).
 *
 * The wallet balance on the index row and the closing balance on the ledger are
 * **the same number from the same source**: `WalletSummary.balanceHalalas` is
 * read from the ledger's last settled posting, not from a second field that can
 * drift. `clients/financials.test.ts` asserts it against `Rider`.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import { FINANCIALS_PERIOD } from '../serverPolicy'
import { ApiError, type Facets, type Halalas, type Paginated, type QueryParams } from '../types/common'
import type { AuthorityCheck, FinancialsPeriod, WalletSummary } from '../types/financials'
import { isPendingSettlement, type Ledger, type LedgerPosting } from '../types/ledger'
import { appendAudit } from './audit'
import { allLedgerPostings, buildLedger, postEntry } from './ledger'
import { http } from './http'
import { currentMockUserId } from './session'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let riderFixtures!: Fixtures['riderFixtures']
let teamUserFixtures!: Fixtures['teamUserFixtures']
onFixturesLoaded((f) => {
  riderFixtures = f.riderFixtures
  teamUserFixtures = f.teamUserFixtures
})

export const WALLET_OPERATIONS = {
  list: 'wallets.list',
  facets: 'wallets.facets',
  ledger: 'wallets.ledger',
  authority: 'wallets.authority',
  adjust: 'wallets.adjust',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(WALLET_OPERATIONS))

/* ────────────────── the compensation policy ─────────────────── */

/**
 * `DB.compPolicy` (`:15379`), in halalas.
 *
 * **D-F20, preserved and made visible rather than quietly fixed.** The policy
 * is keyed `Owner / Operations / Support / Finance / default` while the four
 * roles that actually exist are `Owner / Ops Manager / Finance / Support`
 * (`ROLE_NAMES`, `types/session.ts:17`). So **`Ops Manager` falls through to
 * `default`** — 50 SAR per case, 300 daily — and the `Operations` tier
 * (200 / 2000) is configuration nobody can reach.
 *
 * `AuthorityCheck.appliedRole` reports which entry was used, so the
 * fall-through renders in the confirmation instead of surprising an operator at
 * commit time (AC-439). Fixing the key is a product decision, not a fixture
 * edit.
 */
const COMP_POLICY = {
  roles: {
    Owner: { perCaseHalalas: 100_000, dailyHalalas: 1_000_000 },
    Operations: { perCaseHalalas: 20_000, dailyHalalas: 200_000 },
    Support: { perCaseHalalas: 7_500, dailyHalalas: 60_000 },
    Finance: { perCaseHalalas: 50_000, dailyHalalas: 500_000 },
    default: { perCaseHalalas: 5_000, dailyHalalas: 30_000 },
  } as Record<string, { perCaseHalalas: Halalas; dailyHalalas: Halalas }>,
  secondApprovalAboveHalalas: 20_000,
  perRiderPer30dHalalas: 15_000,
  perRiderPer30dCount: 3,
}

let sessionAdjustments: LedgerPosting[] = []
let adjustmentSequence = 0

export function resetWallets(): void {
  sessionAdjustments = []
  adjustmentSequence = 0
}

/* ───────────────────────── the index ────────────────────────── */

function walletSummaries(): WalletSummary[] {
  return riderFixtures.map((rider) => {
    const rows = allLedgerPostings()
      .filter((p) => p.subjectAccount === 'liability.wallet' && p.subjectId === rider.id)
      .sort((a, b) => Date.parse(a.postedAt) - Date.parse(b.postedAt) || a.id.localeCompare(b.id))
    const lastSettled = [...rows].reverse().find((p) => p.balanceAfterHalalas !== null)
    return {
      riderId: rider.id,
      riderName: rider.name,
      balanceHalalas: lastSettled?.balanceAfterHalalas ?? 0,
      pendingHalalas: rows
        .filter((p) => isPendingSettlement(p.settlement))
        .reduce((s, p) => s + (p.direction === 'credit' ? p.amountHalalas : -p.amountHalalas), 0),
      postingCount: rows.length,
      lastActivityAt: rows.length ? rows[rows.length - 1]!.postedAt : null,
    }
  })
}

const walletShape: QueryShape<WalletSummary> = {
  searchable: [(w) => w.riderId, (w) => w.riderName],
  sortable: {
    riderName: (w) => w.riderName,
    balanceHalalas: (w) => w.balanceHalalas,
    pendingHalalas: (w) => w.pendingHalalas,
    postingCount: (w) => w.postingCount,
    lastActivityAt: (w) => w.lastActivityAt,
  },
  filterable: {
    riderId: (w) => w.riderId,
    riderName: (w) => w.riderName,
    balanceHalalas: (w) => w.balanceHalalas,
    pendingHalalas: (w) => w.pendingHalalas,
    postingCount: (w) => w.postingCount,
    /** Derived: `balance < 0`. **Q-F6 / foundation Q9** decides what it means. */
    negative: (w) => w.balanceHalalas < 0,
    /** A wallet that has never been used at all — the *first-run* empty ledger. */
    neverUsed: (w) => w.postingCount === 0,
    lastActivityAt: (w) => toInstant(w.lastActivityAt),
  },
  facetable: [],
  views: {
    'all-wallets': () => true,
    all: () => true,
    'negative-balances': (w) => w.balanceHalalas < 0,
    /* Adjustment postings, which is where the goodwill population lives. */
    goodwill: (w) => w.postingCount > 0,
  },
}

/**
 * GET /api/v1/wallets
 *   params: q · page · pageSize · sort · filter · view=all-wallets|negative-balances|goodwill
 *   -> Paginated<WalletSummary>
 *
 * `isNegative` is **derived** from the balance and is not a field.
 */
export async function listWallets(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<WalletSummary>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<WalletSummary>>('/wallets', { ...params }, { signal })
  }
  return mock(WALLET_OPERATIONS.list, signal, () => runQuery(walletSummaries(), params, walletShape))
}

/**
 * GET /api/v1/wallets/facets
 *   params: view
 *   -> Facets
 */
export async function getWalletFacets(view?: string | null, signal?: AbortSignal): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/wallets/facets', { view: view ?? undefined }, { signal })
  }
  return mock(WALLET_OPERATIONS.facets, signal, () =>
    computeFacets(walletSummaries(), walletShape, view),
  )
}

/**
 * GET /api/v1/ledgers/liability.wallet/:riderId
 *   params: from · to · page · pageSize
 *   -> Ledger
 *
 * `credit` means the rider's balance goes **up**; `debit` means down (§3.2).
 * That is the consumer convention on a bank statement, which is what a rider
 * reads, and it is what `DESIGN.md` §8.3.3's wireframe shows.
 *
 * The period defaults to the whole of time rather than to `FINANCIALS_PERIOD`:
 * a wallet ledger opened from an identity link should show the wallet, not the
 * current month. Pass a period to window it.
 */
export async function getWalletLedger(
  riderId: string,
  period?: FinancialsPeriod,
  signal?: AbortSignal,
): Promise<Ledger> {
  if (DATA_SOURCE === 'http') {
    return http.get<Ledger>(
      `/ledgers/liability.wallet/${riderId}`,
      { from: period?.start, to: period?.end },
      { signal },
    )
  }
  return mock(WALLET_OPERATIONS.ledger, signal, () => {
    const rider = riderFixtures.find((r) => r.id === riderId)
    if (!rider) throw notFound('rider', riderId)
    return buildLedger('liability.wallet', riderId, rider.name, {
      from: period?.start,
      to: period?.end,
    })
  })
}

/* ──────────────────── authority and adjustments ─────────────── */

/**
 * GET /api/v1/wallets/:riderId/authority
 *   params: amountHalalas · reasonCode
 *   -> AuthorityCheck
 *
 * **Server-computed, always.** `compCheck` (`:15412`) is authority, and
 * authority is not a client computation — a ceiling the browser evaluates is a
 * ceiling the browser can be asked not to evaluate.
 *
 * **D-F21 closed here.** The legacy check is bypassed unless the reason label
 * contains the literal string `'Goodwill'` (`reason.indexOf('Goodwill') >= 0`,
 * `:3985`), so choosing `Manual top-up` moves any amount with no per-case
 * ceiling, no daily ceiling and no per-rider pattern check. This envelope is
 * returned for **every** reason code (AC-385).
 *
 * It **never silently trims an amount** — `:15412`'s own comment says a quietly
 * reduced credit is worse than a clear refusal, and AC-359 and AC-384 agree.
 */
export async function checkAdjustmentAuthority(
  riderId: string,
  amountHalalas: number,
  reasonCode: string,
  signal?: AbortSignal,
): Promise<AuthorityCheck> {
  if (DATA_SOURCE === 'http') {
    return http.get<AuthorityCheck>(
      `/wallets/${riderId}/authority`,
      { amountHalalas, reasonCode },
      { signal },
    )
  }
  return mock(WALLET_OPERATIONS.authority, signal, () => authorityFor(riderId, amountHalalas))
}

function authorityFor(riderId: string, amountHalalas: number): AuthorityCheck {
  const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
  /* The fall-through D-F20 describes: an `Ops Manager` has no policy entry. */
  const appliedRole = COMP_POLICY.roles[me.role] ? me.role : 'default'
  const limits = COMP_POLICY.roles[appliedRole]!

  const mine = sessionAdjustments.filter((p) => p.actorId === me.id)
  const dailyUsedHalalas = mine.reduce((s, p) => s + p.amountHalalas, 0)
  const forRider = sessionAdjustments.filter((p) => p.subjectId === riderId)
  const per30dUsedHalalas = forRider.reduce((s, p) => s + p.amountHalalas, 0)

  /* **Only the per-case and daily ceilings block.** The per-rider pattern check
     raises a second approver and a note — it does not refuse (`:15425`), because
     a rider legitimately owed three credits in a month is a signal to
     investigate, not an amount to withhold. Getting this backwards makes
     `secondApprovalAboveSAR` unreachable, which is the bug in the note below. */
  let blockedReason: AuthorityCheck['blockedReason'] = null
  if (amountHalalas > limits.perCaseHalalas) {
    blockedReason = {
      key: 'fin.authority.abovePerCase',
      params: { capHalalas: limits.perCaseHalalas, role: appliedRole },
    }
  } else if (dailyUsedHalalas + amountHalalas > limits.dailyHalalas) {
    blockedReason = {
      key: 'fin.authority.aboveDaily',
      params: { capHalalas: limits.dailyHalalas, usedHalalas: dailyUsedHalalas },
    }
  }

  /**
   * **A finding in `DB.compPolicy` itself.** `perRiderPer30dSAR` is 150 and
   * `secondApprovalAboveSAR` is 200 (`:15386`–`:15388`), so a single credit
   * large enough to need a second approver *always* trips the per-rider check
   * first. If the per-rider check blocked, the second-approval path could never
   * be reached at all. It does not block, so both conditions raise the same
   * flag and AC-386's `pending` state stays reachable.
   */
  const patternFlagged =
    per30dUsedHalalas + amountHalalas > COMP_POLICY.perRiderPer30dHalalas ||
    forRider.length + 1 > COMP_POLICY.perRiderPer30dCount

  return {
    allowed: blockedReason === null,
    appliedRole,
    perCaseCapHalalas: limits.perCaseHalalas,
    dailyCapHalalas: limits.dailyHalalas,
    dailyUsedHalalas,
    per30dCapHalalas: COMP_POLICY.perRiderPer30dHalalas,
    per30dUsedHalalas,
    per30dCount: forRider.length,
    per30dCountCap: COMP_POLICY.perRiderPer30dCount,
    needsSecondApproval:
      patternFlagged || amountHalalas > COMP_POLICY.secondApprovalAboveHalalas,
    secondApprovalThresholdHalalas: COMP_POLICY.secondApprovalAboveHalalas,
    blockedReason,
  }
}

export interface AdjustWalletInput {
  riderId: string
  amountHalalas: number
  direction: 'credit' | 'debit'
  reasonCode: string
  note?: string
}

/**
 * POST /api/v1/wallets/:riderId/adjust
 *   body: { amountHalalas, direction, reasonCode, note }
 *   -> { posting: LedgerPosting, authority: AuthorityCheck }
 *   403 when the authority check refuses  ·  422 without a reason code
 *
 * **An adjustment is not a correction** (§3.4d). `reversesPostingId` is null,
 * `reasonCode` and `actorId` are required, and **there is no field in which to
 * name another posting** — that is AC-388, enforced by construction rather than
 * by a rule somebody has to remember. If an adjustment could reference a wrong
 * posting, the ledger would lose the causal link between an error and its
 * correction and nobody could later prove the two were the same event.
 *
 * Above the second-approval threshold the posting is created **`pending`** and
 * waits (AC-386). **Q-F7 is open**: there is no second-approver surface
 * anywhere in the product, and `compPolicy.secondApprovalAboveSAR` has existed
 * without one since it was written (`:15388`). It exists and waits rather than
 * committing unapproved.
 *
 * ## The GL leg, which this mutation used to omit
 *
 * | Leg | Ledger | Direction | Amount |
 * |---|---|---|---|
 * | 1 | `liability.wallet` (the rider) | as chosen | the amount |
 * | GL | `expense.goodwill` | the opposite | the same |
 *
 * The posting was written and **no journal entry was**, so the rider's wallet
 * ledger moved and the trial balance did not: `liability.wallet`'s GL balance
 * and the sum of its own postings disagreed by every adjustment ever made. Same
 * family as the four acts that wrote no posting at all — a subject ledger and
 * the GL stating different facts about the same money — and the reason it
 * escaped notice is that a trial balance which is never written to still says
 * `✓ books balance`.
 *
 * `expense.goodwill` is the counter-account because that is what the chart
 * calls this money (*Goodwill credits*, §3.8) and what `fin.reconcile.goodwill`
 * already reconciles. A **pending** adjustment writes the posting and **no
 * entry**: no money has moved yet, which is why `journalEntryId` is nullable
 * and why the GL and a subject ledger legitimately differ by the pending line
 * (AC-312).
 */
export async function adjustWallet(
  input: AdjustWalletInput,
  signal?: AbortSignal,
): Promise<{ posting: LedgerPosting; authority: AuthorityCheck }> {
  if (DATA_SOURCE === 'http') {
    return http.post(`/wallets/${input.riderId}/adjust`, input, { signal })
  }
  return mockMutation(WALLET_OPERATIONS.adjust, signal, () => {
    const rider = riderFixtures.find((r) => r.id === input.riderId)
    if (!rider) throw notFound('rider', input.riderId)
    if (!input.reasonCode.trim()) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'reason_code_required',
        message: 'An adjustment needs a reason code',
        details: [{ field: 'reasonCode', code: 'required', message: 'Choose a reason' }],
        retryable: false,
      })
    }
    if (!Number.isInteger(input.amountHalalas) || input.amountHalalas <= 0) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'amount_invalid',
        message: 'Enter an amount above zero, in whole halalas',
        details: [{ field: 'amountHalalas', code: 'positive', message: 'Enter an amount' }],
        retryable: false,
      })
    }

    const authority = authorityFor(input.riderId, input.amountHalalas)
    if (!authority.allowed) {
      throw new ApiError({
        status: 403,
        kind: 'forbidden',
        code: 'above_authority',
        /* Names the ceiling and the role that was applied. Never a trimmed amount. */
        message: `Above the ${authority.appliedRole} ceiling of ${authority.perCaseCapHalalas} halalas`,
        details: [
          { field: 'amountHalalas', code: 'cap', message: String(authority.perCaseCapHalalas) },
        ],
        retryable: false,
      })
    }

    const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
    adjustmentSequence += 1
    const id = `WTX-ADJ-${String(adjustmentSequence).padStart(4, '0')}`
    const settlement = authority.needsSecondApproval ? 'pending' : 'settled'

    const { postings } = postEntry({
      type: 'wallet_adjustment',
      reference: `adjustment|${id}`,
      meta: { riderId: input.riderId, actorId: me.id, reasonCode: input.reasonCode },
      postings: [
        {
          id,
          idPrefix: 'WTX-ADJ',
          subjectAccount: 'liability.wallet',
          subjectId: input.riderId,
          direction: input.direction,
          amountHalalas: input.amountHalalas,
          description: { key: 'fin.posting.adjustment', params: { reasonCode: input.reasonCode } },
          reference: id,
          sourceType: 'adjustment',
          /* No source document, and **no field naming another posting** (AC-388). */
          sourceId: null,
          kind: 'adjustment',
          settlement,
          actorId: me.id,
          reasonCode: input.reasonCode,
        },
      ],
      counterLines:
        settlement === 'settled'
          ? [
              {
                account: 'expense.goodwill',
                direction: input.direction === 'credit' ? 'debit' : 'credit',
                amountHalalas: input.amountHalalas,
              },
            ]
          : [],
    })
    const posting = postings[0]!
    sessionAdjustments = [...sessionAdjustments, posting]

    appendAudit({
      action: 'wallet.adjust',
      subjectType: 'rider',
      subjectId: input.riderId,
      amountHalalas: input.amountHalalas,
      reasonCode: input.reasonCode,
      note: input.note ?? null,
      detail: {
        key: 'fin.audit.walletAdjusted',
        params: { direction: input.direction, reference: id },
      },
    })

    return { posting, authority }
  })
}

/** The default window, re-exported so a screen does not import a fixture to get it. */
export const DEFAULT_FINANCIALS_PERIOD = FINANCIALS_PERIOD
