/**
 * The rider FULL-PAGE profile's own strings — and deliberately very few of them.
 *
 * ## Almost every string on this page belongs to the SHEET's dictionary
 *
 * §3's parity contract is *one content contract, two presentations*, and the
 * strings are half of the content. `src/components/profile/rider/copy.ts`
 * (`RIDER_PROFILE_EN`) is registered and already carries every string that names
 * a fact about a rider, so the page READS them rather than restating them:
 *
 * ```
 *   profile.rider.joined               the band's meta row
 *   profile.rider.rail.plan            the strip's third cell label
 *   profile.rider.rail.noPlan          a rider with no cycle
 *   profile.rider.rail.planLegs        `0 of 5 trips used`
 *   profile.rider.rail.planEnded/Ends  the cycle's date, in the right tense
 *   profile.rider.rail.since           `Since 22 Jun`
 *   profile.rider.rail.churnNone       §8.2's reason line when there is none
 *   profile.rider.activity.open        the open-trip eyebrow (X-13: ONE string)
 *   profile.rider.activity.captainOnBoard / .empty
 *   rider.trip.noCaptainYet            the unassigned case — from the SHARED
 *                                      vocabulary, not from the sheet, and
 *                                      present tense: the timeline's
 *                                      `rider.timeline.trip.noCaptain` reports
 *                                      what has happened, and this card is
 *                                      about a trip that has not.
 *   profile.rider.action.assign        the one filled button
 *   profile.rider.money.empty          the money group's empty sentence
 * ```
 *
 * plus the older shared vocabulary: `profile.field.*`, `profile.section.*`,
 * `profile.kind.*`, `profile.subStatus.*`, `profile.value.tier`,
 * `profile.state.*`, `people.riderStatus.*`, `people.tier.*`, `people.churn.*`,
 * `rider.churn.*` and `rider.timeline.*` (`i18n/vocabulary/copy.ts`),
 * `fin.settlement.*`, `fin.ledger.*`, `view.people.*` and `subtab.*`.
 *
 * **A second spelling of `Plan` on the page is how the page and the sheet start
 * disagreeing about a word**, which is the failure §3 exists to prevent. So the
 * rule in this file is: if the sheet says it, this file does not.
 *
 * What is left is what only a PAGE has — a back affordance that names where it
 * goes, two labels for a three-up strip the sheet renders as a vertical rail,
 * and a ledger table's furniture. The sheet has no table and no route to return
 * to.
 *
 * Rules the copy follows
 *   `copy.md` / R6  sentence case; a full sentence takes a period, a label or a
 *                   button does not. No `please`, no `failed`, no blame.
 *   §9.6 / AC-75    every interpolation is a named placeholder inside a SINGLE
 *                   key. Nothing on this page is assembled by `+` or by a
 *                   template literal joining two translated fragments.
 *   AC-670/671      a count that governs a noun is a plural FAMILY, never
 *                   `count + ' rides'`. §12 writes `{count} quick rides` flat,
 *                   which renders `1 quick rides`; the family is the same
 *                   sentence, also correct at one, and Arabic — six cardinal
 *                   categories — needs it regardless.
 *   D18 / X-4       no uppercase-plus-letter-spacing label. The band eyebrow is
 *                   the single licensed exception (§5.1) and it is uppercased by
 *                   CSS, not by the string.
 *   §8.3.1          an em dash never stands in for an absent value here, and
 *                   `0.00 SAR` is a real zero that prints as one.
 */

import type { Dictionary } from '@/lib'

export const ENTITY_RIDER_EN: Dictionary = {
  /* ── the back affordance (§7.2, AC-RP-14) ─────────────────────────────
     It names the DESTINATION, and the destination's own name comes from the
     route table (`view.people.riders`, `subtab.support.tickets`, …) rather than
     from an eleven-row list of nouns here — a second spelling of `Riders` on a
     back button is a second place for the word to drift from the tab it lands
     on. See `back.ts`. */
  'entity.rider.backTo': 'Back to {name}',

  /* ── the summary strip ────────────────────────────────────────────────
     Two labels. The third cell takes `profile.rider.rail.plan`, the sheet's.
     Sentence case: X-4 refuses the reference's `MONEY` / `ENGAGEMENT` /
     `STANDING`, because D18 bans uppercase plus letter-spacing on a label and
     these sit on `--ev-bg2` rather than on the band. */
  'entity.rider.strip.money': 'Money',
  'entity.rider.strip.engagement': 'Engagement',

  /* §8.3.1 — the unit is stated once beside the figure and the numeral itself is
     `Money unit="none"`, the way a table states its unit once in a header.

     **There is no `held` line under this balance, and the absence is a
     correction.** The wallet ledger's `pendingHalalas` is `0`: none of this
     rider's balance is held. `{amount} held` printed under a balance reads as
     *held out of your balance*, which is a false statement — the 98.00 is card
     money captured at a gateway and not settled onward. §8.3.4 wants a pending
     amount on a separate labelled line, and that line is over the `Payments`
     group, where its records are. */
  'entity.rider.money.inWallet': 'SAR in wallet',
  /* §8.3.2 / §9.4 — U+2212 in ordinary ink, with the condition carried by a
     WORD as well (§7.5). Never red, never parentheses, never a badge. */
  'entity.rider.money.belowZero': 'Balance is below zero',

  /* The engagement cell's second line: two independent facts with a decorative
     separator between them, never one sentence built from two fragments. */
  'entity.rider.trips.quickRides#one': '{count} quick ride',
  'entity.rider.trips.quickRides#other': '{count} quick rides',
  'entity.rider.trips.lastTrip': 'last trip {date}',
  /* Not an em dash: §8.3.1 reserves that for not-applicable, and a rider who has
     never taken a trip is an absence with a reason, which words carry. */
  'entity.rider.trips.noLastTrip': 'last trip not recorded',

  /* §6.6's zero case. An empty meter would claim a quota that does not exist. */
  'entity.rider.plan.noAllowance': 'No trip allowance on this plan',

  /* ── the open-trip card (§6.5) ────────────────────────────────────────
     The eyebrow, the captain line and the button label are the sheet's. Three
     things are the page's own: the card's meta line, its truncation count, and
     its empty sentence. */
  'entity.rider.trip.meta': '{id} · {date} · {status}',
  /* The accessible name for the three-node route. The VISIBLE form is two
     `<bdi>` endpoints with a mirrored glyph between them (§10.2); the sheet's
     `profile.rider.trip.route` puts the glyph inside the string instead. Both
     satisfy §9.5 and they are different constructions — reported. */
  'entity.rider.trip.route': '{origin} to {destination}',
  'entity.rider.trip.moreOpen#one': '{count} more open',
  'entity.rider.trip.moreOpen#other': '{count} more open',
  'entity.rider.trip.none': 'No trip is open right now.',
  /* §11.2 — disabled IN PLACE with this sentence, never hidden. It is the only
     refusal on this page: `Renew plan` and `Release` have no client operation,
     and a command with no operation is absent from both surfaces together
     rather than disabled with an invented reason. */
  'entity.rider.refusal.assignPermission': 'Opening dispatch needs the operations permission.',

  /* ── the dated history (§7.7) ─────────────────────────────────────────
     The heading is the page's; the empty sentence is the sheet's
     (`profile.rider.activity.empty`). */
  'entity.rider.history.title': 'History',

  /* ── the movements table (§7.6) ───────────────────────────────────────
     The column headers are `fin.ledger.col.*` — the same six the product's
     other ledger declares, because a second spelling of a column set is a
     second contract that has not noticed yet. */
  'entity.rider.movements.title': 'Wallet and payments',
  'entity.rider.movements.count#one': '{count} movement',
  'entity.rider.movements.count#other': '{count} movements',
  'entity.rider.movements.search': 'Search movements',
  /* §11.5. Not `fin.empty.noMatch`, which says *postings*. */
  'entity.rider.movements.noMatch': 'No movements match this search.',
  /* §11.1 / R8 — the one illustrated state on this page, and only because it is
     a whole-section zero-records-ever empty. The heading names what the section
     is FOR; the action goes where the rest of this rider's money lives. */
  'entity.rider.movements.empty.heading': 'No money has moved yet',
  'entity.rider.movements.empty.body':
    'This wallet has no movements. Top-ups and refunds appear here as they happen.',
  'entity.rider.movements.empty.action': 'View wallets',

  /* ── the payments group ───────────────────────────────────────────────
     `under review`, not `held`: see the note beside `entity.rider.money.*`. A
     state badge on a payment row and a summary label over a group are different
     things and may legitimately take different words. */
  'entity.rider.payments.count#one': '{count} payment',
  'entity.rider.payments.count#other': '{count} payments',
  'entity.rider.payments.underReview': '{amount} under review',
}
