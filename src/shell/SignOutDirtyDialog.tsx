/**
 * `Sign out` while a form is dirty — design §8.4, **AC-568**.
 *
 * > *"Not the §8.3 path — the session is alive, so this is the shell's existing
 * > `navigate-away-dirty` modal (00-shell §11.6 row 10), **unchanged**, with
 * > `Discard changes` reworded to `Discard and sign out`. Cancelling leaves the
 * > operator signed in and the form dirty. **Only the operator discards their
 * > own work.**"*
 *
 * ## Two paths that look identical and are not
 *
 * | | §8.3, inside the re-auth modal | §8.4, this |
 * |---|---|---|
 * | The session | **expired** | alive |
 * | The surface | the re-auth modal swaps its own body | its own `alert-dialog` |
 * | Cancelling returns to | the password body, still frozen | the console, still dirty, still signed in |
 *
 * They share a sentence and nothing else. Folding them into one component would
 * mean one surface that has to know whether the session behind it is alive,
 * which is the kind of flag that is eventually read wrong.
 *
 * ## What this is NOT, and it is worth being exact
 *
 * **This is not 00-shell §11.6 row 10.** That row intercepts *every*
 * navigation out of a dirty route, which needs a router blocker and touches
 * every screen in the product; its copy keys (`state.leaveDirty.*`) have been
 * in the dictionary since the shell was built with **zero call sites**, which
 * is a real gap and still is. This builds the **one** case AC-568 names — the
 * sign-out — and reuses that row's copy so the two cannot drift when the
 * general case lands. Named in the handoff rather than quietly widened.
 *
 * Rules applied
 *   §5.3        `alert-dialog`, 440 px, vertically centred. The title states
 *               the verb, the body states the consequence **and what will not
 *               change**, and the primary repeats the verb.
 *   §5.3/R5a    the primary is **blue, not red**. §5.3 restricts red, it does
 *               not mandate it, and the shell already took this position for
 *               `navigate-away-dirty`. Signing out is recoverable; the work is
 *               what is lost, and that is what the body says.
 *   `copy.md` 5 `{entity}` is the SaveBar's own dirty noun, so the two surfaces
 *               name the same object.
 *   `copy.md` 9 the body says what does **not** change.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Translate } from '@/lib'

export interface SignOutDirtyDialogProps {
  open: boolean
  /** The SaveBar's dirty noun — `Unsaved plan` → `plan`. */
  entity: string | null
  t: Translate
  /** **AC-568** — leaves the operator signed in and the form dirty. */
  onCancel: () => void
  onConfirm: () => void
}

export function SignOutDirtyDialog({
  open,
  entity,
  t,
  onCancel,
  onConfirm,
}: SignOutDirtyDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        /* `Escape` and an outside interaction both arrive here. Unlike the
           re-auth modal, this one **may** be dismissed: the session is alive,
           nothing is frozen, and cancelling is the safe outcome — so the
           dismissal is simply the cancel. */
        if (!next) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('state.leaveDirty.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {/* Names what will be lost, and what will not. `{entity}` is the
                SaveBar's noun, so the bar and this dialog agree. */}
            {t('state.leaveDirty.body', { entity: entity ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t('state.leaveDirty.cancel')}</AlertDialogCancel>
          {/* §8.4's one reworded string: `Discard changes` → `Discard and sign
              out`, because the operator is doing both and a primary that names
              only half of it is a primary they press expecting to stay. */}
          <AlertDialogAction variant="default" onClick={onConfirm}>
            {t('session.signOutDirty.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
