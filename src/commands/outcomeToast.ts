/**
 * **The outcome toast, and undo on it — P3-T9, D18, §6.2 D-16.**
 *
 * ## One function, because there is one contract
 *
 * Every surface that runs a command — the palette, the row kebab, the bulk bar,
 * the page-header overflow — has the same last step: say what happened, and
 * offer the inverse if there is one. Writing that four times is how the toast
 * duration, the second toast and the failure branch drift apart, which is the
 * same argument `registry.ts` makes about the label and the refusal. So it is
 * written once, here, beside the registry that produces the outcome.
 *
 * **The palette is its only caller today.** `CaptainsView.tsx:222` still calls
 * `toast(result.outcome.message)` directly and therefore drops the undo handle
 * on the floor — a screen file this task does not own. The one-line diff is in
 * the handoff, and until it lands `captain.suspend` is undoable from ⌘K and not
 * from the row kebab. That asymmetry is stated rather than papered over,
 * because it is also why `captain.reinstate` keeps its confirmation for now:
 * D18 buys a reversible command out of its dialog, and removing the dialog
 * before the surface offers the undo would take away the net without hanging
 * the rope.
 *
 * ## Why a toast may carry an action at all — §6.2 **D-16**
 *
 * `sonner.tsx`'s header used to read *"NO ACTION LINK — a toast never carries
 * an action the operator must take"*, and D-16 replaced that ban with the
 * reason behind it, as a test:
 *
 * > A toast may carry an action **if and only if** either (a) missing the
 * > action is harmless, or (b) the toast does not auto-dismiss.
 *
 * `Undo` passes **(a)**: missing it means the act stands, which is what the
 * operator asked for. `Try again` and `Open the record` pass **(b)**, because
 * they only ever appear on a toast that has stopped being transient. Nothing
 * here puts an action on an ordinary five-second toast whose omission loses
 * something — that remains legacy defect D7 and keeps its name.
 *
 * ## "Critical" is not a colour
 *
 * `sonner.tsx` says it outright: *"a critical toast is not a red toast, it is a
 * toast that has stopped being transient."* R5a spends red on four things and a
 * toast is not among them. So the failure branch changes the **duration** to
 * infinite and the **copy**, reuses the same toast id so it replaces in place
 * rather than stacking a second card, and adds no colour at all.
 */

import { toast } from 'sonner'
import type { Translate } from '@/lib'
import type { CommandOutcome, UndoHandle } from './registry'

/**
 * **D18 — ten seconds, and it is the toast.**
 *
 * `sonner.tsx` ships `duration={5000}` for every other toast; this is the one
 * override, in the one place. Ten and not five because the operator has to
 * *read* the line before deciding it was wrong, and R9's one line plus a
 * decision does not fit in five seconds at the end of a shift. Hovering pauses
 * the timer — already Sonner's behaviour — so an operator who noticed but is
 * mid-sentence does not lose the window.
 *
 * **There is no undo that outlives its affordance.** A window longer than the
 * toast is a promise nobody can see, and it lets the inverse race a second
 * operator's edit for a period the operator cannot perceive.
 */
export const UNDO_WINDOW_MS = 10_000

/**
 * Whatever a rejected inverse had to say, as the toast's second line.
 *
 * The first line is the command's own sentence — *what is still true* — and it
 * is written before the failure happens, so it cannot name a cause. D18 asks
 * the toast to state the failure **and why**; the why is the server's, and this
 * is where it goes. An error with nothing useful to say adds no line rather
 * than adding `[object Object]`.
 */
function describeFailure(error: unknown): string | undefined {
  if (error instanceof Error && error.message.trim() !== '') return error.message
  if (typeof error === 'string' && error.trim() !== '') return error
  return undefined
}

/**
 * Run the inverse and narrate it.
 *
 * `attempt` is D18's "exactly once": the first failure offers `Try again`, the
 * second replaces it with a link to the record where there is one, and after
 * that the toast states the truth and stops offering anything. **It is never
 * dismissed silently** — a failed undo that closes quietly leaves the operator
 * believing they retracted something they did not.
 */
async function reverse(
  undo: UndoHandle,
  t: Translate,
  id: string | number,
  attempt: number,
): Promise<void> {
  try {
    await undo.run()
    /* The success case replaces the original toast rather than stacking beside
       it: the offer it carried is gone, and leaving it on screen beside its own
       confirmation invites a second press. */
    toast.dismiss(id)
    /* The SECOND toast. No `action` — an undo of an undo is a loop with no
       floor — so it takes the ordinary five-second life from `sonner.tsx`. */
    toast(undo.doneMessage)
  } catch (error) {
    const retry =
      attempt === 1
        ? {
            label: t('command.undo.retry'),
            onClick: (event: { preventDefault: () => void }) => {
              /* Same reason as the `Undo` action below: Sonner deletes the
                 toast on an action press unless the handler prevents it, and
                 a toast that turns critical is meant to stay put. */
              event.preventDefault()
              void reverse(undo, t, id, 2)
            },
          }
        : undo.recordLink
          ? { label: undo.recordLink.label, onClick: undo.recordLink.open }
          : undefined

    toast(undo.failedMessage, {
      /* Same id — the toast turns critical IN PLACE. */
      id,
      description: describeFailure(error),
      /* Critical = not transient (see the header). `Infinity` is what makes the
         action admissible under D-16 clause (b), and the global close button is
         how the operator dismisses it deliberately. */
      duration: Infinity,
      ...(retry ? { action: retry } : {}),
    })
  }
}

/**
 * **State the outcome. Offer the inverse where there is one.**
 *
 * Handles `null` — a command that only navigated has nothing to say, and a
 * toast confirming a navigation the operator can see is noise (§11.5).
 */
export function toastOutcome(outcome: CommandOutcome<unknown> | null, t: Translate): void {
  if (outcome === null) return

  const undo = outcome.undo
  if (undo === undefined) {
    /* Five seconds, no action. The overwhelming majority. */
    toast(outcome.message)
    return
  }

  /* Declared before the call so the action's closure can name the id the call
     is about to return. The closure runs on a click, long after assignment. */
  let id: string | number = ''
  id = toast(outcome.message, {
    duration: UNDO_WINDOW_MS,
    action: {
      label: undo.label,
      /**
       * **`preventDefault` is what makes "in place" true.**
       *
       * Sonner removes a toast as soon as its action is pressed, unless the
       * handler prevents the default (`sonner/dist/index.mjs`: *"if
       * (event.defaultPrevented) return; deleteToast()"*). Without this line the
       * card is torn down on the click and the failure branch below re-adds a
       * new one under the same id — which D18 explicitly does not ask for: it
       * asks for the toast to **become critical in place**, because a card that
       * vanishes and returns reads as a second, unrelated message.
       *
       * The success branch dismisses it deliberately instead, which is the one
       * case where it *should* go.
       */
      onClick: (event) => {
        event.preventDefault()
        void reverse(undo, t, id, 1)
      },
    },
  })
}
