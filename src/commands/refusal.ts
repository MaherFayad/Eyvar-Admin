/**
 * **D21's three sentences, written once** — `design/05-command-centre.md` §2,
 * phase **C-5**.
 *
 * ## Why this file exists
 *
 * `captains.ts` declared `blockedSentence` privately, which was right when it
 * was the only registry. It is not right at five: the second copy is a
 * coincidence, the fifth is a policy written five times, and D21's **third**
 * sentence is precisely the clause a hand-written predicate forgets — it was
 * missing from `people/copy.ts`'s callers until P3-T9 wired it, and from every
 * Operations screen until `screens/operations/bulkRefusal.ts` was extracted for
 * exactly the same reason one layer up.
 *
 * `bulkRefusal.ts` is that file for a screen with no registry. **This is the
 * registry's own**, and the two are deliberately not one import: `setRefusal`
 * answers in `SetRefusal` shape (a reason, an eligible id set, a boolean)
 * because `DataTable`'s bulk bar wants all three, and `Command.unavailable`
 * answers `string | null` because §11.2 wants the sentence and the palette
 * derives the eligible set itself (`usePalette.ts:668`). A `commands/` module
 * importing from `screens/` would also invert the layering: a screen consumes a
 * registry, never the other way round.
 *
 * `captains.ts` is left as it was. It is P2-T2's reference implementation and
 * the file every later registry is read against; rewriting it to import this
 * would make the reference depend on the thing it is the reference for.
 * **Raised in the handoff:** it should adopt this once C-5 is reviewed, and the
 * duplication is one function until then.
 *
 * ## The three sentences, and why the third is not pedantry
 *
 * | case | key | reads |
 * |---|---|---|
 * | one target, blocked | `.blocked.one` | `This trip is already flagged.` |
 * | some blocked | `.blocked.other` | `3 of the selected trips are already flagged.` |
 * | **all blocked** | `.blocked.all` | `All 3 selected trips are already flagged.` |
 *
 * `.other` on a 3-of-3 selection is **true and misleading**: it invites the
 * operator to deselect a few and try again when there is nothing to deselect
 * to. Which sentence appears changes what they do next, which is the whole
 * argument for a third key (**AC-960**: `Select only the N eligible` is
 * withheld in that case, and the palette derives that from the same predicate).
 *
 * ## The set reading is strict
 *
 * Refuse if **any** target would be refused on its own row. The alternatives
 * are both worse and D21 records why: acting on the eligible subset silently
 * drops records the operator picked, and refusing only when *every* target is
 * ineligible lets a bulk bar act on a record the row menu refuses — which is
 * the four-way divergence D9 exists to remove, reintroduced at the set
 * boundary.
 *
 * ## The count is `formatCount`, never `String(n)`
 *
 * Arabic-Indic digits where the locale asks for them, grouped the same way as
 * every other number on the page (**AC-73**).
 */

import { formatCount } from '@/lib'
import type { CommandContext } from './registry'

/**
 * D21's sentence for `blocked` of `ctx.targets.length` refused records, or
 * `null` when nothing is blocked.
 *
 * @param prefix the key family, without the `.one` / `.other` / `.all` leaf —
 *               e.g. `trips.action.flag.blocked`. All three must exist; the
 *               registry test asserts it, because a missing `.all` is invisible
 *               until an operator selects a wholly ineligible set.
 */
export function blockedSentence<T>(
  ctx: CommandContext<T>,
  blocked: number,
  prefix: string,
): string | null {
  if (blocked === 0) return null
  const count = formatCount(blocked, ctx.language)
  /* A row kebab passes an array of one, and the singular sentence is about
     THAT record — `This trip is already flagged.` — not about a selection of
     one, which is a sentence no operator has ever needed. */
  if (ctx.targets.length === 1) return ctx.t(`${prefix}.one`)
  if (blocked === ctx.targets.length) return ctx.t(`${prefix}.all`, { count })
  return ctx.t(`${prefix}.other`, { count })
}

/**
 * The common shape of a domain predicate: count the targets this command would
 * refuse, then say so.
 *
 * Exists so a registry writes `blockedBy(ctx, (t) => t.flagged, '…')` rather
 * than re-deriving `filter(...).length` five times — the filter is not the
 * decision, the predicate is, and this keeps the predicate the only thing on
 * the line.
 */
export function blockedBy<T>(
  ctx: CommandContext<T>,
  isBlocked: (target: T) => boolean,
  prefix: string,
): string | null {
  return blockedSentence(ctx, ctx.targets.filter(isBlocked).length, prefix)
}
