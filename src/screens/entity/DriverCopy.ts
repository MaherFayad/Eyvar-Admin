/**
 * The captain FULL-PAGE profile's own strings — and deliberately very few.
 *
 * ## Almost every string on this page belongs to the sheet's dictionary
 *
 * §3's parity contract is *one content contract, two presentations*, and the
 * strings are half of the content. `components/profile/driver/copy.ts`
 * (`DRIVER_PROFILE_EN`) carries every string that names a **fact about a
 * captain**, and the page reads them rather than restating them:
 *
 * ```
 *   profile.driver.meta.*              the band's meta row
 *   profile.driver.banner.*            the standing banner
 *   profile.driver.block.*             the four summary blocks' labels
 *   profile.driver.flag.*              the standing conditions
 *   profile.driver.documents.*         the file, its counts and its countdowns
 *   profile.driver.earnings.*          the payable, the cash debt, AC-308's header
 *   profile.driver.capacity.*          the slot meter and its caption
 *   profile.driver.card.*              `Payout account`, `Performance`
 *   profile.driver.activity.*          the trip and movement groups
 *   profile.driver.deductions.*        the deduction list
 *   profile.driver.action.* / refusal.* the two navigations and their refusals
 * ```
 *
 * plus the older shared vocabulary: `profile.field.*`, `profile.section.*`,
 * `profile.kind.driver`, `profile.docState.*`, `profile.list.truncated`,
 * `profile.state.*`, `people.driverStatus.*`, `people.tier.*`, `people.class.*`,
 * `people.compliance.worst.*`, `people.col.doc.*`, `fin.ledger.*`,
 * `fin.payout.state.*`, `fin.deduction.status.*`, `fin.settlement.*`,
 * `view.people.*` and `subtab.*`.
 *
 * **A second spelling of `Documents` on the page is how the page and the sheet
 * start disagreeing about a word**, which is the failure §3 exists to prevent.
 * The rule in this file is: **if the sheet says it, this file does not.**
 *
 * What is left is what only a PAGE has — a back affordance that names where it
 * goes, and a `DataTable`'s furniture. The sheet has no table and no route to
 * return to.
 *
 * Rules the copy follows
 *   `copy.md` / R6  sentence case; a full sentence takes a period, a label or a
 *                   button does not. No `please`, no `failed`, no blame.
 *   §9.6 / AC-75    every interpolation is a named placeholder inside a SINGLE
 *                   key. Nothing here is assembled by `+` or by a template
 *                   literal joining two translated fragments.
 *   AC-670/671      a count that governs a noun is a plural FAMILY.
 *   D18 / X-4       no uppercase-plus-letter-spacing label anywhere. The band
 *                   eyebrow is the single licensed exception and it is
 *                   uppercased by CSS, not by the string.
 *   §8.3.1          an em dash never stands in for an absent value here.
 */

import type { Dictionary } from '@/lib'

export const ENTITY_DRIVER_EN: Dictionary = {
  /* ── the back affordance ──────────────────────────────────────────────
     It names the DESTINATION, and the destination's own name comes from the
     route table (`view.people.captains`) rather than from a list of nouns here
     — a second spelling of `Captains` on a back button is a second place for
     the word to drift from the tab it lands on. See `back.ts`. */
  'entity.driver.backTo': 'Back to {name}',

  /* ── the trips table (the page's second table) ────────────────────────
     **Owner amendment: `Trips completed` stops being a figure and becomes a
     list.** *"Trips completed is usually a list"* — a lifetime count is not
     something an operator acts on, the trips are.

     The column headers, the status words, the route line, the entity-link
     refusals and the `no-match` sentence are all `trips.*`, already declared by
     the Trips index and already translated. A second spelling of `Rider` on a
     profile is a second place for the word to drift from the table it links
     to; only what is captain-specific is minted here. */
  'entity.driver.trips.title': 'Trips',
  /* **The subheading names a CAPTAIN fact, not the table's row count**, and
     the word `completed` is what keeps the two apart: this is
     `Driver.totalTrips`, and the pagination beneath states how many rows the
     table holds. A bare `{count} trips` would read as a contradiction the
     first time a cancelled trip appeared in the rows. */
  'entity.driver.trips.count#one': '{count} trip completed',
  'entity.driver.trips.count#other': '{count} trips completed',
  'entity.driver.trips.search': 'Search trips',
  /* A real first-run: the record exists and nothing has happened on it. **No
     action** — nobody creates a trip, and a link to the Trips index scoped to a
     captain with none lands on the same emptiness one screen further away. */
  'entity.driver.trips.empty.heading': 'This captain has taken no trips',
  'entity.driver.trips.empty.body':
    'Every trip they drive lands here, with what it earned and how it ended.',
  /* §4B.8 — *no section repeats the tab's own name*. The timeline shared the
     Activity tab with nothing and so needed no heading; it now shares it with
     the trips table, and two headless lists read as one list that changed shape
     halfway down. `Activity history` is not `Activity`. */
  'entity.driver.timeline.title': 'Activity history',

  /* ── the payable ledger (the page's one table) ────────────────────────
     The column headers are `fin.ledger.col.*` — the same six the product's
     other ledgers declare, because a second spelling of a column set is a
     second contract that has not noticed yet. */
  'entity.driver.ledger.title': 'Payable movements',
  'entity.driver.ledger.count#one': '{count} posting',
  'entity.driver.ledger.count#other': '{count} postings',
  /* §5.4 — the table is a MONTH of a ledger, not the whole of it, and a silent
     window is a silent truncation. Two named parameters, one key. */
  'entity.driver.ledger.period': '{start} to {end}',
  'entity.driver.ledger.allTime': 'All postings',
  'entity.driver.ledger.search': 'Search postings',
  /* **`entity.driver.ledger.noMatch` was DELETED here, and it is worth saying
     why rather than leaving a gap in the sequence.**

     It read `No postings match this search.` and its own comment claimed
     `fin.empty.noMatch` was *"worded for the financials index"* — which was
     not true: that key reads `No postings match these filters.` and every
     other ledger in the product already uses it. It was a second spelling of a
     shared sentence, which is a second contract that has not noticed yet, and
     LR-4 retires it. The two narrowed empties this table can reach are both
     shared keys now — `fin.empty.noMatch` when the operator narrowed it and
     `fin.ledger.empty.period` when only the window did. The rider's wallet
     needs the identical pair, and that is exactly why neither is minted here. */

  /* **① — the ONLY empty on this table that is captain-specific**, and that is
     what earns it a key under this prefix rather than a shared one: the
     sentence names *this captain*, and the rider's wallet cannot read it.

     Decided from `lifetimePostings`, never `totalPostings` — the second is a
     window figure, and a quiet month is not a captain who has never earned.
     That is LR-2's trap and this table used to fall in it.

     **No illustration, by LR-3** — R8 *permits* one on a whole-page
     zero-records-ever state and does not *require* one, and no Financials
     empty takes it, because an operator never creates a posting. The heading,
     the body and the action stay (AC-427). See `DriverEarningsTable`: the
     suppression itself is blocked on a `DataTable` passthrough. */
  'entity.driver.ledger.empty.heading': 'No earnings have reached this captain',
  'entity.driver.ledger.empty.body':
    'A completed trip accrues earnings here, and a payout takes them out. Neither has happened.',
  /* `Back to payouts`, not `Open payouts`: R6 — the operator arrived at this
     profile from somewhere, and nobody CREATES a posting, so the one honest
     action is a return to where this captain's money is actually worked. */
  'entity.driver.ledger.empty.action': 'Back to payouts',
}
