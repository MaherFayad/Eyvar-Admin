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
 * no client, and there is nothing to read. Reading the row from a constant here
 * is honest about that; inventing a `legal.ts` client that returns a hard-coded
 * array would be the same constant wearing a seam.
 *
 * ---
 *
 * # THE ROW IS EMPTY, AND THAT IS THE DECISION — not a stub
 *
 * This file used to return two links, `/legal/privacy` and `/legal/terms`, and
 * its own header called them *"placeholders … named as such"*. **They were dead
 * links, on all six auth screens, and rule 1 above forbids exactly that.** The
 * file stated the rule and broke it two lines later.
 *
 * ## What was actually broken
 *
 * Neither path exists — not in `src/data/fixtures/routeTable.ts`, not in
 * `src/routes.tsx`. `AuthCard` renders the row as `<a href>`, which is a full
 * document load, and the `*` catch-all lives **inside `RequireSession`**
 * (`routes.tsx:152`, `:192`). So the click resolved one of two ways, both
 * wrong:
 *
 * - **signed out** — `RequireSession` redirects to `/signin` with
 *   `state.from = '/legal/privacy'`, so an operator asking to read the privacy
 *   policy *before* signing in is answered with the sign-in form they were
 *   already looking at;
 * - **signed in** (today's mock default — `GET /session` succeeds, see
 *   `RequireSession`'s note) — `NotFoundScreen`, rendered inside the full app
 *   shell, rail and all.
 *
 * ## Why the links are REMOVED rather than the pages BUILT
 *
 * Building two publicly-routed pages was the alternative, and it was rejected
 * on three grounds, strongest first:
 *
 * 1. **The privacy policy of a product that handles rider location data is not
 *    a thing an engineer drafts, and a page that says so is not a policy.**
 *    Marking invented text *"not yet drafted"* is the honest way to ship
 *    fabricated copy, but it is still a page whose entire content is an
 *    apology. The operator learns exactly what they learn from no link, and the
 *    product acquires a URL that looks like a policy and is not one — which is
 *    the worse of the two failure modes the moment anybody screenshots it.
 * 2. **This file already ruled on the identical question and chose removal.**
 *    `Help` is absent because Eyvar has no help centre. Eyvar has no privacy
 *    page and no terms page either. Rendering two of the three and suppressing
 *    the third is not a distinction the product can defend; applying the rule
 *    the file already wrote is not a new decision.
 * 3. **`AuthCard` is built for this.** `legal.length === 0` is a specified
 *    state, not a degraded one (AC-503's trailing clause exists for it), so the
 *    empty row costs no route, no screen, no copy and no test. **Removal is
 *    reversible in one line; a wrong public page is not.**
 *
 * **What this is NOT an argument for.** It is not an argument that the console
 * should never link its legal documents. It is an argument that the link
 * follows the document, and the document is **Admin › Workspace's `legal` pane
 * (wave 7)** — the legacy app's `legalDocuments` store is its source. The day
 * that pane exists, this function reads it and the row returns on all six
 * screens with no other change.
 *
 * **Escalated as a content gap**, not closed here: whoever owns the product has
 * to commission a privacy policy and terms of service, and until they do the
 * console has none to link.
 */

import type { Translate } from '@/lib'
import type { LegalLink } from '@/components/auth/AuthCard'

/**
 * **Still a function of `t`** (**AC-669**), and deliberately so. `t` is unused
 * only while the list is empty; the two keys it will resolve — `auth.legal.privacy`
 * and `auth.legal.terms` — are **kept in `copy.ts` on purpose**, so that
 * restoring the row is a change to this array and nothing else. Turning this
 * into a bare `[]` constant would make the return of the row a signature
 * change across six call sites.
 */
export function legalLinks(_t: Translate): readonly LegalLink[] {
  return []
}
