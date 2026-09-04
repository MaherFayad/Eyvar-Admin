/**
 * The Financials derived values — spec §6.2, **AC-342**, **AC-347**.
 *
 * The client deliberately does **not** send gross margin, contribution margin
 * or either percentage: they are one subtraction and one division each, they
 * must be identical on Overview and on Revenue & Refunds (**AC-347**), and the
 * `null`-when-the-denominator-is-zero rule that makes **AC-342** render an em
 * dash belongs in one place rather than in six copies of `a / b`.
 *
 * This file is that place. It is pure, it has no React in it, and every screen
 * that shows a margin calls it rather than writing the arithmetic again.
 *
 * **Not in `src/lib`, deliberately.** These are Financials domain arithmetic,
 * not app vocabulary, and `src/hooks` / `src/lib` have a single owner
 * (`PHASE-PLAN.md`). If a second workspace ever needs a contribution margin it
 * moves there **with** utilities-engineer, not around them.
 */

import type { FinancialsOverview, Halalas } from '@/data/types'

/**
 * The eight lines the margin chain is computed from. Named as a shape rather
 * than as `FinancialsOverview` so the **comparison window** runs through the
 * same arithmetic — AC-347 is one implementation, not one caller.
 */
export type MarginComponents = Pick<
  FinancialsOverview,
  | 'grossBookingsHalalas'
  | 'captainEarningsHalalas'
  | 'promoHalalas'
  | 'referralHalalas'
  | 'incentiveHalalas'
  | 'refundsHalalas'
  | 'goodwillHalalas'
  | 'emergencyCoverHalalas'
>

export interface MarginBreakdown {
  grossBookingsHalalas: Halalas
  captainEarningsHalalas: Halalas
  /** `gross − captainEarnings`. */
  grossMarginHalalas: Halalas
  /** promo + referral + incentive + refunds + goodwill + emergency (`:15730`). */
  givebackHalalas: Halalas
  /** `grossMargin − giveback`. */
  contributionMarginHalalas: Halalas
  /** **`null` when gross is zero** — AC-342. Never `0`, never `NaN`, never `Infinity`. */
  grossMarginPercent: number | null
  contributionMarginPercent: number | null
}

/**
 * `null` when the denominator is zero or either operand is not finite.
 *
 * **AC-342** — *"a percentage whose denominator is zero renders `—`, never
 * `0%`, never `NaN`, never `Infinity`"*. A screen holding `null` renders the em
 * dash; it never asks this function for a number it can print.
 */
export function percentOrNull(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null
  if (denominator === 0) return null
  return (numerator / denominator) * 100
}

/**
 * The margin chain, computed once from the components the client sends.
 *
 * **A refund is counted exactly once** — it is in `refundsHalalas` and nowhere
 * else. Legacy books the cancellation path as `refunds` *and* as `goodwill`
 * (`12a` R1) and the contribution card subtracts it twice; **AC-352** closes
 * that, and the closure is structural here because there is one addition and
 * `goodwillHalalas` is the client's own `expense.goodwill` flow.
 */
export function marginBreakdown(overview: MarginComponents): MarginBreakdown {
  const grossMarginHalalas = overview.grossBookingsHalalas - overview.captainEarningsHalalas
  const givebackHalalas =
    overview.promoHalalas +
    overview.referralHalalas +
    overview.incentiveHalalas +
    overview.refundsHalalas +
    overview.goodwillHalalas +
    overview.emergencyCoverHalalas
  const contributionMarginHalalas = grossMarginHalalas - givebackHalalas

  return {
    grossBookingsHalalas: overview.grossBookingsHalalas,
    captainEarningsHalalas: overview.captainEarningsHalalas,
    grossMarginHalalas,
    givebackHalalas,
    contributionMarginHalalas,
    grossMarginPercent: percentOrNull(grossMarginHalalas, overview.grossBookingsHalalas),
    contributionMarginPercent: percentOrNull(
      contributionMarginHalalas,
      overview.grossBookingsHalalas,
    ),
  }
}

/**
 * The net a payout commits — **AC-366**, and the one number three surfaces have
 * to agree on: the row, the confirmation and the audit entry.
 *
 * Derived rather than served, because `payableHalalas` and `cashDebtHalalas`
 * are each independently true and a third wire value can disagree with both.
 */
export function netPayableHalalas(payableHalalas: Halalas, cashDebtHalalas: Halalas): Halalas {
  return payableHalalas - cashDebtHalalas
}

/**
 * A cash report's deviation — `reported − topup − expected` (§6.5).
 *
 * **`null` when the report was never made**, which is a different fact from
 * zero and renders an em dash (**AC-372**).
 */
export function deviationHalalas(report: {
  reportedHalalas: Halalas | null
  topupHalalas: Halalas
  expectedFareHalalas: Halalas
}): Halalas | null {
  if (report.reportedHalalas === null) return null
  return report.reportedHalalas - report.topupHalalas - report.expectedFareHalalas
}

/** `completed / required`, as a percentage. `null` when nothing is required. */
export function escrowProgressPercent(completed: number, required: number): number | null {
  return percentOrNull(completed, required)
}

/** §6.4 — `tripsCompleted >= tripsRequired && settlement === 'held'`. Derived, never stored (D-F19). */
export function isEscrowReleasable(hold: {
  tripsCompleted: number
  tripsRequired: number
  settlement: 'held' | 'released' | 'reversed'
}): boolean {
  return hold.settlement === 'held' && hold.tripsCompleted >= hold.tripsRequired
}

/* ─────────────────────── §11.2's refusals, named ────────────────────────── */

/**
 * **AC-368 — one function per action decides BOTH whether it is refused and
 * which sentence says so.**
 *
 * The defect this replaces was structural, not a missing string: `disabled` was
 * a boolean predicate, so the three conditions that refuse a payout collapsed
 * into one `true` and the copy that explains each of them — written, translated
 * and reviewed — had nowhere to attach. §11.2 asks for *"disabled in place with
 * its reason"* and only the first half could be built.
 *
 * Returning **the copy key or `null`** rather than a boolean makes the two
 * halves the same decision. A fourth refusal added to one of these functions
 * arrives with its sentence or it does not compile, and a control cannot go
 * dead with nothing to say.
 *
 * These return keys rather than sentences so they stay pure and testable; the
 * screen holds `t` and interpolates.
 */

/** Why `Pay` is refused on this row — permission, no bank account, nothing net. */
export function payWithheldFrom(
  payout: { bankAccountLast4: string | null; payableHalalas: Halalas; cashDebtHalalas: Halalas },
  canWrite: boolean,
): 'fin.payout.blocked.permission' | 'fin.payout.blocked.noBank' | 'fin.payout.blocked.nothing' | null {
  if (!canWrite) return 'fin.payout.blocked.permission'
  if (payout.bankAccountLast4 === null) return 'fin.payout.blocked.noBank'
  if (netPayableHalalas(payout.payableHalalas, payout.cashDebtHalalas) <= 0) {
    return 'fin.payout.blocked.nothing'
  }
  return null
}

/**
 * Why `Release` is refused on this hold — **AC-365**'s outstanding trips are
 * one of three, and the already-decided hold is a different sentence from the
 * unfinished one.
 */
export function releaseWithheldFrom(
  hold: { tripsCompleted: number; tripsRequired: number; settlement: 'held' | 'released' | 'reversed' },
  canWrite: boolean,
): 'fin.payout.blocked.permission' | 'fin.escrow.blocked.state' | 'fin.escrow.blocked.trips' | null {
  if (!canWrite) return 'fin.payout.blocked.permission'
  if (hold.settlement !== 'held') return 'fin.escrow.blocked.state'
  if (!isEscrowReleasable(hold)) return 'fin.escrow.blocked.trips'
  return null
}

/** Why `Apply` or `Waive` is refused on this deduction. */
export function deductionWithheldFrom(
  deduction: { status: 'pending' | 'applied' | 'waived' },
  canWrite: boolean,
): 'fin.payout.blocked.permission' | 'fin.deduction.blocked.decided' | null {
  if (!canWrite) return 'fin.payout.blocked.permission'
  if (deduction.status !== 'pending') return 'fin.deduction.blocked.decided'
  return null
}

/**
 * Why `Claim` is refused on this cash report — **P4-T1's queue case**.
 *
 * §9.3 lets a queue carry a checkbox column *"only if every bulk action offered
 * is a claim or assign action"*, and `design/00-shell.md` §9.3 adds the other
 * half in one line: ***"Bulk disposition must not ship."*** So the
 * reconciliation queue's one bulk command is `Claim`, and this is the predicate
 * behind it — the same shape as the three above, so the row control and the
 * bulk bar cannot word a refusal differently.
 */
export function claimWithheldFrom(
  report: {
    status: 'pending' | 'resolved' | 'escalated'
    /* Structural, and `readonly`-friendly: the two fields this decision reads,
       and no more. `ClaimState` carries a third member (`done`) that is not a
       claim on this queue, so it is not named here either. */
    claim: { state: string; ownerId: string } | null
  },
  canWrite: boolean,
  currentUserId: string,
):
  | 'fin.payout.blocked.permission'
  | 'fin.cash.blocked.decided'
  | 'fin.cash.blocked.mine'
  | 'fin.cash.blocked.heldByOther'
  | null {
  if (!canWrite) return 'fin.payout.blocked.permission'
  if (report.status !== 'pending') return 'fin.cash.blocked.decided'
  if (report.claim?.state === 'claimed') {
    return report.claim.ownerId === currentUserId
      ? 'fin.cash.blocked.mine'
      : 'fin.cash.blocked.heldByOther'
  }
  return null
}

/* ───────────────── §11.2 over a SET rather than a row ───────────────── */

/**
 * **The set rule, in one function (D21, ratified): a bulk command is refused if
 * ANY selected record would be refused, and the refusal names the count.**
 *
 * No partial apply. On a money surface a half-applied bulk payout is a
 * reconciliation incident, so the command refuses the whole set rather than
 * quietly paying the eligible five and leaving four behind with nothing on
 * screen to say so. The way out is the bar's own `Select only the N eligible`,
 * which changes the **selection** — not what the command does with it.
 *
 * ## Why the count and the cause are two different numbers
 *
 * `blocked` is every refused row, whatever refused it. `key` is the **one**
 * cause the sentence names.
 *
 * A selection can trip more than one cause — a captain with no bank account
 * beside a captain with nothing payable — and D21's rendering rule 4 is
 * explicit that the count is `blocked.length`. That is also what keeps the
 * sentence and the escape hatch consistent: `blocked + eligible === total`, so
 * *"2 of the selected payouts cannot be paid"* sits beside *"Select only the 3
 * eligible"* over a selection of five and the two agree.
 *
 * **The named cause is then the first one in the declared order, and it may not
 * be the only one true of the set.** That is a known limit of a one-sentence
 * refusal and is raised with product-designer: the alternative is a sentence
 * assembled from fragments, which AC-443 forbids outright. The order puts the
 * most general cause first, so what is named is never the *narrower* truth.
 *
 * @param withheld one entry per SELECTED row — the value that row's own
 *   `…WithheldFrom` returned. Passing the row predicates' output rather than
 *   the rows is what stops the bulk bar and the row kebab drifting: there is
 *   one predicate per command in this file and both surfaces read it.
 * @param order which cause to name, most general first. Declared by the caller
 *   because precedence is a copy decision — **AC-962**: *"your role cannot move
 *   money"* outranks *"no bank account"*, and no ordering of a union type could
 *   know that.
 *
 * @returns the named cause, how many rows are refused **in total**, and how
 *   many were selected; `null` when every selected row is permitted.
 */
export function bulkRefusal<K extends string>(
  withheld: ReadonlyArray<K | null>,
  order: readonly K[],
): { key: K; blocked: number; total: number } | null {
  const total = withheld.length
  const blocked = withheld.filter((each) => each !== null).length
  if (blocked === 0) return null
  for (const key of order) {
    if (withheld.includes(key)) return { key, blocked, total }
  }
  /* A cause the caller did not order is still a refusal — returning `null` here
     would enable a command over rows their own row action refuses, which is the
     exact divergence D9 records. Name the first one found. */
  const unordered = withheld.find((each): each is K => each !== null)
  return unordered === undefined ? null : { key: unordered, blocked, total }
}
