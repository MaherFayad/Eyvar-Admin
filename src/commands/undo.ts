/**
 * **D18's undo handle, built once** — `design/05-command-centre.md` §2,
 * `DECISIONS.md` **D18**, phase **C-5**.
 *
 * ## The ruling, in the three clauses this file has to carry
 *
 * An action is undoable **only when its inverse is already a declared command
 * in the same registry and nothing left the console** — no message to a
 * customer, no money moved, no notification pushed, no third party told. Undo
 * runs that inverse **through the data seam as a real, separately audited
 * mutation**, never an optimistic local reversal. The window is **ten seconds
 * and is exactly the life of the toast offering it** (`outcomeToast.ts`).
 *
 * The mechanical test is what each registry states beside its own `undo:`
 * line. This file does not decide whether a command qualifies; it builds the
 * handle for one that already does.
 *
 * ## Why the inverse goes through the seam
 *
 * **The audit log is the product.** A reversal that never reaches the server
 * records the suspension and not the retraction — two entries, the act and its
 * retraction, and a log that can erase its own rows is not a log. It is also
 * the only way a rejection can be discovered: a second operator may have edited
 * the record inside the ten seconds, and a local reversal could not have found
 * that out.
 *
 * ## Why the three strings live on the handle
 *
 * Only the command knows the verb, the count and the record, which is the same
 * argument that put the confirmation copy in the command rather than in the
 * dialog. D18's toast table wants:
 *
 *   - **on success** a *second* toast stating the reversal, carrying **no undo
 *     of its own** — an undo of an undo is a loop with no floor (`doneMessage`);
 *   - **on failure** the toast becomes critical **in place**, states what is
 *     still true, and leaves the original effect on screen because it is still
 *     the truth (`failedMessage`, phrased as a fact and never as
 *     "something failed");
 *   - **after a second failure** a link to the record instead of `Try again`
 *     (`recordLink`), offered only where there IS one record — a link to an
 *     arbitrary member of a twelve-record set is a guess, and D18 asks for
 *     *the* record.
 *
 * ## The window does not extend on bulk
 *
 * Twelve records undone is one inverse over twelve ids — `Promise.all`, exactly
 * as the forward direction runs.
 */

import type { ProfileEntityType } from '@/data/types'
import { formatCount } from '@/lib'
import type { CommandContext, UndoHandle } from './registry'

export interface UndoOptions<T> {
  /**
   * The inverse, **through the data seam**. One call per target; the handle
   * fans out with `Promise.all` and lets a rejection reach the toast, which is
   * what `failedMessage` is for.
   */
  inverse: (target: T) => Promise<unknown>
  /**
   * The key family. `${prefix}.undone.one`, `.undone.other`,
   * `.undoFailed.one`, `.undoFailed.other` — all four must exist, and the
   * registry test asserts it.
   */
  copyPrefix: string
  /**
   * The named placeholders the **singular** sentences take — `{ name }` for a
   * person, `{ id }` for a trip or a ticket. **AC-75**: one key, named
   * placeholders, never concatenation.
   *
   * The plural sentences always take `{ count }` and take nothing else, because
   * naming two of twelve records is a sentence that has to choose which two.
   */
  nameOf: (target: T) => Readonly<Record<string, string>>
  /**
   * The 360° layer to open when `Try again` has itself failed. Omit for a
   * record type the profile resolver does not answer for — a link into the
   * overlay's not-found state is worse than no link.
   */
  record?: (target: T) => { entityType: ProfileEntityType; entityId: string }
}

/**
 * AC-1200's 20-step in-memory undo stack for a surface with no
 * server-audited inverse — the page editor (03 §5), not the command
 * centre's ten-second `undoHandle` above. Local only: wrong for anything
 * `undoHandle` already covers.
 */
const PAGE_EDITOR_UNDO_LIMIT = 20

export interface PageEditorUndoEntry<T> {
  /** Restores the state before the edit this entry recorded. */
  undo: () => T
}

export class PageEditorUndoStack<T> {
  private readonly entries: PageEditorUndoEntry<T>[] = []

  push(entry: PageEditorUndoEntry<T>): void {
    this.entries.push(entry)
    if (this.entries.length > PAGE_EDITOR_UNDO_LIMIT) this.entries.shift()
  }

  /** Pops and runs the last entry, or does nothing on an empty stack. */
  undo(): T | undefined {
    const entry = this.entries.pop()
    return entry?.undo()
  }

  get size(): number {
    return this.entries.length
  }
}

export function undoHandle<T>(ctx: CommandContext<T>, options: UndoOptions<T>): UndoHandle {
  const targets = ctx.targets
  const count = targets.length
  const only = count === 1 ? targets[0] : undefined
  const params: Readonly<Record<string, string>> =
    only === undefined ? { count: formatCount(count, ctx.language) } : options.nameOf(only)
  const suffix = only === undefined ? 'other' : 'one'
  const link = only === undefined || options.record === undefined ? null : options.record(only)

  return {
    /* D18: one control, labelled `Undo`. Never an icon, never `Cancel` —
       `Cancel` reads as *stop the thing in progress*, and it is already done. */
    label: ctx.t('command.undo'),
    run: async () => {
      await Promise.all(targets.map((target) => options.inverse(target)))
    },
    doneMessage: ctx.t(`${options.copyPrefix}.undone.${suffix}`, params),
    failedMessage: ctx.t(`${options.copyPrefix}.undoFailed.${suffix}`, params),
    ...(link === null
      ? {}
      : {
          recordLink: {
            label: ctx.t('command.undo.openRecord'),
            open: () => ctx.host.openProfile(link.entityType, link.entityId),
          },
        }),
  }
}
