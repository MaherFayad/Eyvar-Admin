/**
 * **The one write the rider sheet still offers, and why it is refused.** §11.2.
 *
 * §11.2: *a blocked control is disabled in place with a stated reason, never
 * hidden.* So `Assign a captain` is on the open-trip card, it is disabled, and
 * the sentence saying why is beside it — not in a tooltip, not in a `title`
 * attribute, and not implied by greying alone.
 *
 * ## Two kinds of reason, and the order between them
 *
 * A control can be blocked by **state** (there is nothing to act on) or by
 * **capability** (the product cannot do this from here). State wins, because it
 * is the reason an operator can act on. A trip that already has a captain is not
 * waiting for one, and naming the captain is more useful than naming the board.
 *
 * ## Why this one survived and the footer's two did not
 *
 * `Release` and `Renew plan` were built here and removed: a command with no
 * operation anywhere is not *blocked*, it does not **exist**, and §11.2 does not
 * reach it — see `RiderFooter`, which records both and the escrow client that
 * looks like it would serve one and does not.
 *
 * `Assign a captain` is the third instance of the same class and is **not
 * settled**: `TRIP_OPERATIONS` is `facets · list · get · flag`, and
 * `requests.assign` assigns a `RideRequest`, a different resource with no link
 * from `Trip`. So by the footer's rule it should go too. It is still here
 * because the surface's owner asked for it explicitly, its stated reason is
 * TRUE rather than invented — §6.2 independently says this layer commits
 * nothing, and dispatch is where a captain is assigned — and removing it under
 * a ruling that named the other two would be deciding a question nobody asked
 * me. **Raised in the handoff for a ruling.**
 *
 * **There is no permission gate here, deliberately.** `live_ops` can change
 * nothing while there is no operation behind it, so a permission check would be
 * a branch that never decides anything — the defect `shell/permissions.ts`
 * records as *"every `disabled={!gate.canWrite}` across five money screens was
 * decoration"*. The gate goes in with the operation, in the same change, or it
 * is theatre.
 */

import type { RiderTimelineEvent } from '@/data/types'
import type { Translate } from '@/lib'

export interface RefusalReason {
  key: string
  params?: Record<string, string | number>
}

export interface RiderRefusal {
  /** Ties the control to its sentence with `aria-describedby`. Stable per control. */
  reasonId: string
  label: (t: Translate) => string
  /**
   * `null` would mean *allowed*. **No factory below returns `null` today** — the
   * operation does not exist on the seam — and the field is here so the day one
   * lands, the enabling branch is a value change rather than a new shape.
   */
  reason: RefusalReason | null
  /** Undefined while `reason` is set. A disabled control has nothing to call. */
  onAct?: () => void
}

export const riderRefusals = {
  /**
   * Takes the TIMELINE EVENT, not the `Trip`.
   *
   * The open-trip card is built entirely from the event — that is what keeps
   * the sheet and the full page from merging three resources each and arriving
   * at two answers — and `detail.captainAssigned` is the fact this branch turns
   * on. `undefined` is the field never being set, which is NOT the same claim as
   * *"nobody came"* and must not refuse as if it were; only an explicit `true`
   * takes the already-assigned arm.
   */
  assignCaptain(event: RiderTimelineEvent): RiderRefusal {
    return {
      reasonId: `rider-refusal-assign-${event.id}`,
      label: (t) => t('profile.rider.action.assign'),
      reason:
        event.detail.captainAssigned === true
          ? { key: 'profile.rider.refusal.assignAssigned' }
          : { key: 'profile.rider.refusal.assign' },
    }
  },
}
