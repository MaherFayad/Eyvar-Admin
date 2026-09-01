/**
 * **D21 — bulk set semantics, in one function.**
 *
 * `DECISIONS.md` § *D21 — Bulk set semantics*:
 *
 * > A bulk command is **refused if any selected record would be refused**, the
 * > refusal **names the count**, there is **no partial apply**, and the escape
 * > hatch is a single control — **`Select only the N eligible`** — which changes
 * > the operator's selection visibly and by their own act before the command
 * > becomes available.
 *
 * Every Operations screen with a bulk bar has to answer the same four questions
 * — is this refused, which sentence, which ids would be accepted, and does a
 * permission refusal outrank the domain one. Answering them five times is how
 * five screens end up with four answers, and D21's third sentence is precisely
 * the clause that a hand-written predicate forgets.
 *
 * `src/commands/registry.ts` is the equivalent for a domain that has a command
 * registry (captains). Most Operations screens do not have one yet — their
 * predicates are two lines against a boolean field — and giving each of them a
 * registry to get one sentence right would be the wrong trade. This is the
 * shape they share, and nothing in it is a decision: the three sentences, the
 * ordering and the eligible set are all D21's.
 *
 * ## The three sentences, and why the third one is not pedantry
 *
 * | case | key | reads |
 * |---|---|---|
 * | one target, blocked | `.blocked.one` | `This trip is already flagged.` |
 * | some blocked | `.blocked.other` | `3 of the selected trips are already flagged.` |
 * | **all blocked** | `.blocked.all` | `All 3 selected trips are already flagged.` |
 *
 * `.other` on a 3-of-3 selection is **true and misleading**: it invites the
 * operator to deselect a few and try again, when there is nothing to deselect
 * to. Which sentence appears changes what they do next, which is the whole
 * argument for a third key.
 *
 * ## Two rules that are easy to get backwards
 *
 * **A permission refusal outranks a domain refusal** (D17). *"Three are already
 * suspended"* when the real answer is *"you may not suspend anyone"* wastes the
 * operator's time twice — once reading it and once acting on it.
 *
 * **The count is `formatCount(n, language)`, never `String(n)`.** Arabic-Indic
 * digits where the locale asks for them, and grouped the same way as every
 * other number on the page.
 *
 * ## `eligibleIds` is a narrowing, not a partial apply
 *
 * The set returned is *the ids in the current selection the command would
 * accept*. `DataTable` renders `Select only the N eligible` from it and calls
 * `table.selectOnly`; the selection changes on screen before the command is
 * available, so the outcome toast can never name a different number from the
 * bar. It is empty when every target is blocked, and the bar correctly renders
 * no control in that case (**AC-960**).
 */

import { formatCount, type Language, type Translate } from '@/lib'

export interface SetRefusal {
  /** §11.2's sentence, or `null` when the command is available. */
  reason: string | null
  /**
   * **D21's escape hatch.** The ids in the current selection this command would
   * accept. Empty when every target is blocked — there is nothing to narrow to,
   * and `DataTable` renders no control.
   */
  eligibleIds: ReadonlySet<string>
  /** Convenience for a call site that only needs the boolean. */
  refused: boolean
}

export interface SetRefusalOptions<T> {
  /** What the command would act on. One row from a kebab, the selection from a bar. */
  targets: readonly T[]
  getId: (row: T) => string
  /** True when THIS record would be refused on its own row. */
  isBlocked: (row: T) => boolean
  /**
   * **D17 / D21 rule 5** — the permission sentence, or `null` when the operator
   * may act. Checked FIRST: it outranks every domain refusal, and when it
   * applies nothing is eligible, because the refusal is about the operator and
   * not about the records.
   */
  roleReason?: string | null
  /** `<domain>.action.<verb>.blocked` — the three keys share this prefix. */
  blockedKeyPrefix: string
  t: Translate
  language: Language
}

const EMPTY: ReadonlySet<string> = new Set<string>()

export function setRefusal<T>({
  targets,
  getId,
  isBlocked,
  roleReason = null,
  blockedKeyPrefix,
  t,
  language,
}: SetRefusalOptions<T>): SetRefusal {
  /* D21 rule 5 — permission first, and nothing is eligible under it. Narrowing
     the selection cannot make a role able to act. */
  if (roleReason !== null) {
    return { reason: roleReason, eligibleIds: EMPTY, refused: true }
  }

  /* An empty selection is not a refusal. The bulk bar does not render at all
     with nothing selected, and a sentence about zero records would be noise if
     it did. */
  if (targets.length === 0) {
    return { reason: null, eligibleIds: EMPTY, refused: false }
  }

  const blocked = targets.filter(isBlocked)
  if (blocked.length === 0) {
    return { reason: null, eligibleIds: new Set(targets.map(getId)), refused: false }
  }

  const count = formatCount(blocked.length, language)

  if (targets.length === 1) {
    return { reason: t(`${blockedKeyPrefix}.one`), eligibleIds: EMPTY, refused: true }
  }

  if (blocked.length === targets.length) {
    /* AC-960 — the `.all` sentence, and NO eligible set: there is nothing to
       narrow to, so the bar must not offer to narrow. */
    return { reason: t(`${blockedKeyPrefix}.all`, { count }), eligibleIds: EMPTY, refused: true }
  }

  return {
    reason: t(`${blockedKeyPrefix}.other`, { count }),
    eligibleIds: new Set(targets.filter((row) => !isBlocked(row)).map(getId)),
    refused: true,
  }
}
