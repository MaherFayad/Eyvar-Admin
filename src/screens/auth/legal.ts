/**
 * The auth card's legal row — design §1.3, **AC-503** as amended by spec §19.3
 * **C-1**.
 *
 * §2.5 D's clause reads *"small legal links (`Help Privacy Terms`) at the
 * card's bottom-left"*. Design §1.3 keeps it **as a slot** and adds two rules:
 *
 * 1. **The row renders only the links the `legal` pane actually provides.**
 *    Eyvar has no help centre, so **`Help` is not rendered.** *"A dead `Help`
 *    on a sign-in page is worse than no `Help`."*
 * 2. **When the pane provides none, the row is not rendered at all** — no empty
 *    row, no dead link. That is why `AuthCard` branches on `legal.length` and
 *    why AC-503's *"contains … the legal link row. Nothing else."* gained a
 *    trailing clause: a correct card with an empty pane would otherwise fail
 *    the criterion that describes it.
 *
 * ## Why this is a module constant and not a fetch
 *
 * The pane is **Admin › Workspace**, which is wave 7. It does not exist, it has
 * no client, and the two links below are the two Eyvar has. Reading them from a
 * constant here is honest about that; inventing a `legal.ts` client that
 * returns a hard-coded array would be the same constant wearing a seam.
 *
 * **The `href`s are placeholders and are named as such.** There is no privacy
 * page and no terms page in this product yet. They point at routes that do not
 * resolve, which is the same state the rest of the console is in for wave-7
 * destinations — and the alternative, `href="#"`, is the dead link §1.3
 * forbids. Reported as a content gap, not papered over.
 */

import type { Translate } from '@/lib'
import type { LegalLink } from '@/components/auth/AuthCard'

/**
 * **A function of `t`, not a constant of strings** (**AC-669**): `Privacy` and
 * `Terms` are operator-facing and resolve through `auth.legal.privacy` /
 * `.terms` like every other word on the card.
 */
export function legalLinks(t: Translate): readonly LegalLink[] {
  return [
    { id: 'privacy', label: t('auth.legal.privacy'), href: '/legal/privacy' },
    { id: 'terms', label: t('auth.legal.terms'), href: '/legal/terms' },
  ]
}
