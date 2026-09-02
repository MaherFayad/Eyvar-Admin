/**
 * `ConfirmDialog`'s own copy — the one string the shared confirmation owns.
 *
 * Everything else on that modal is the **caller's**: the title, the body, the
 * primary's verb and every reason or choice label are supplied per act, because
 * §5.3 requires the title to name the object and the primary to repeat the
 * verb, and neither can be written once for forty acts. `Cancel` is the
 * exception — it is the same word every time, and `copy.md` rule 2 lists it as
 * one of the five permitted non-verb labels.
 *
 * **Why this is a new key rather than a reused one.** The four dialogs G5
 * collapsed each carried their own cancel — `queue.confirm.cancel`,
 * `people.confirm.cancel`, `admin.team.confirm.cancel` — and the shared
 * component cannot honestly reach into one screen's namespace for a string it
 * renders on every screen. `admin.team.confirm.cancel` still has a caller of
 * its own (`AddUserModal`) and `queue.confirm.cancel` is still
 * `ConfirmMoneyDialog`'s, so neither is dead; `people.confirm.cancel` now is,
 * and is left in place for its owner to remove.
 *
 * Assembled into `EN` the same way a screen's `copy.ts` is — one import, one
 * spread — following `components/profile/copy.ts`, which is the precedent for a
 * component owning its strings.
 */

import type { Dictionary } from '@/lib'

export const CONFIRM_EN: Dictionary = {
  'confirm.cancel': 'Cancel',
}
