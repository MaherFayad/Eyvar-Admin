/**
 * **Where the profile page goes back to** — owner amendment 1, spec §7.2,
 * AC-RP-16 … AC-RP-19.
 *
 * ## `navigate(-1)` is refused, and this is what replaces it
 *
 * The screen shipped `onBack={() => navigate(-1)}`, and so does the shell's own
 * top bar for this route (`TopBar.tsx:173`, reached because `resolveRoute`
 * gives `/entity/:id` `showsBackArrow: true`). It is wrong three ways and the
 * spec refuses it outright:
 *
 *   - **it dead-ends.** `/entity/RDR-4002` is pasted into tickets and runbooks;
 *     the person who opens that link has no in-app history and `-1` either does
 *     nothing or leaves the console entirely;
 *   - **it cannot be probed.** `window.history.length` counts entries from
 *     other origins, so there is no honest test for "is there something behind
 *     me";
 *   - **it is untestable** under `MemoryRouter`, which is where the no-history
 *     case — the one that matters — has to be asserted.
 *
 * ## What it does instead: a destination, and never a guess
 *
 * 1. `location.state.from`, when the navigation carried one. The sheet's
 *    `Open full profile` sets it to the route the sheet was open **over**, so
 *    an operator who opened this rider from a ticket lands back on the ticket
 *    with `?entity=` still on it and the sheet re-opened (AC-RP-20). That is
 *    the state-restoring half `-1` was doing accidentally, done deliberately.
 * 2. Otherwise `INDEX_ROUTE[entityType]` — the record's own index.
 * 3. **There is no third case**, which is why the control is never hidden and
 *    never disabled (§11.2): there is always a destination, in every one of the
 *    four states.
 *
 * This is the same answer three detail routes already reached —
 * `ApplicantDetailScreen:209`, `TicketDetailScreen:254`,
 * `CorporateDetailScreen:279` all pass an absolute index route rather than a
 * history step — generalised over the eleven kinds `/entity/:id` serves, which
 * is the one thing those three did not have to do.
 */

import { useLocation } from 'react-router-dom'
import { VIEW_APPLICATIONS, VIEW_CAPTAINS, VIEW_RIDERS } from '@/screens/operations/people/views'
import type { ProfileEntityType } from '@/data/types'

export interface IndexRoute {
  path: string
  /**
   * The destination's own name, from the route table's vocabulary. **Reused,
   * never minted**: a second spelling of `Riders` on a back button is a second
   * place for the word to drift from the tab it lands on.
   */
  labelKey: string
}

/**
 * **Total over `ProfileEntityType`, and that is the point** (AC-RP-18).
 *
 * `Record<ProfileEntityType, …>` over a closed union is the same device
 * `PROFILE_SECTION_RENDERERS` uses: a twelfth entity type without a destination
 * does not compile, so the back control can never fall through to a `?? '/'`
 * that nobody notices.
 *
 * **Four of the eleven have no index sub-tab of their own** — `payment`,
 * `complaint`, `new-rider` and `plan` are records that live inside other
 * screens. Each lands on the nearest route that actually lists or controls it,
 * and the label names *that* route rather than the record kind, so the button
 * never promises a screen the product does not have.
 */
export const INDEX_ROUTE: Readonly<Record<ProfileEntityType, IndexRoute>> = {
  rider: { path: `/operations/people?view=${VIEW_RIDERS}`, labelKey: 'view.people.riders' },
  /* A registration in its first 24 hours is a rider on the same index. */
  'new-rider': { path: `/operations/people?view=${VIEW_RIDERS}`, labelKey: 'view.people.riders' },
  driver: { path: `/operations/people?view=${VIEW_CAPTAINS}`, labelKey: 'view.people.captains' },
  applicant: {
    path: `/operations/people?view=${VIEW_APPLICATIONS}`,
    labelKey: 'view.people.applications',
  },
  trip: { path: '/operations/quick-rides', labelKey: 'subtab.operations.quickRides' },
  subscription: { path: '/operations/subscriptions', labelKey: 'subtab.operations.subscriptions' },
  'corporate-account': { path: '/operations/corporate', labelKey: 'subtab.operations.corporate' },
  ticket: { path: '/support/tickets', labelKey: 'subtab.support.tickets' },
  /* No complaints index exists; Support's own overview is the honest landing. */
  complaint: { path: '/support/overview', labelKey: 'subtab.support.overview' },
  /* Payments are controlled from Ledger & Payment Controls and nowhere else. */
  payment: { path: '/financials/ledger', labelKey: 'subtab.financials.ledger' },
  plan: { path: '/financials/pricing', labelKey: 'subtab.financials.pricing' },
}

/**
 * The route the navigation came from, when it carried one.
 *
 * `location.state`, never a query parameter: `routes.tsx` records why for the
 * sign-in redirect — *"the redirect target is an attacker-controllable URL
 * parameter"* — and the same reasoning applies to any route this page will
 * send an operator to on a single click.
 */
export interface ProfileNavState {
  from?: string
}

export function useReturnFrom(): string | null {
  const state = useLocation().state as ProfileNavState | null
  const from = state?.from
  /* An absolute in-app path or nothing. A `from` that is not a path this router
     owns is discarded rather than followed. */
  return typeof from === 'string' && from.startsWith('/') ? from : null
}
