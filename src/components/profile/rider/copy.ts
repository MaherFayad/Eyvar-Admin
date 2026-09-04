/**
 * The rider presentation's own strings — design §6.2, and the rider sheet spec.
 *
 * One `Dictionary`, spread by `src/i18n/dictionaries.ts`, exactly as a screen's
 * `copy.ts` is. Nothing here is reachable through a `defaultValue`:
 * `createTranslator` throws on a missing key in dev, which is the mechanism that
 * finds one.
 *
 * **Reused rather than restated.** The sheet leans on keys that already exist
 * and are already translated — `profile.section.*`, `profile.field.*`,
 * `profile.value.ratio`, `profile.list.truncated`, `profile.ledger.*`,
 * `people.riderStatus.*`, `people.tier.*`, `people.churn.*`,
 * `profile.subStatus.*`, `profile.tripStatus.*`, `fin.settlement.*`. A second
 * spelling of *Wallet* on one surface is how two surfaces start disagreeing
 * about a word.
 *
 * ## The route's arrow is NOT here, and that is the point
 *
 * A trip row's `{pickup} → {destination}` is `rider.timeline.*.subtitle`, in
 * `src/i18n/vocabulary/copy.ts`, whose Arabic entry carries `←`. §9.5 and
 * `direction.ts`: *"glyphs that mirror are swapped at string-construction time,
 * never with CSS"* — and a dictionary entry IS string-construction time. It is
 * shared vocabulary because both profile surfaces draw that row, and a second
 * copy under this prefix would be a second answer to which way the arrow points.
 *
 * `Trip.route` is never used: it is one pre-joined string with a hard-coded
 * `→` that no dictionary can mirror, no `<bdi>` can isolate and no translator
 * can reach.
 *
 * ## `rider.churn.*` is CONSUMED here and minted somewhere else
 *
 * `Rider.churnReason` is a `LocalisedText` the data layer mints, and
 * `types/rider.ts` enumerates the six keys it can carry. Both profile surfaces
 * render it, so it is shared vocabulary and it lives in
 * `src/i18n/vocabulary/copy.ts`, which exists for exactly that — keys the data
 * layer emits and more than one surface resolves.
 *
 * **This file mints none of them.** Two dictionaries declaring one key is a
 * spread collision that resolves silently in whichever order
 * `dictionaries.ts` happens to list them, and the losing translation is simply
 * never seen. `RiderRail` calls `formatLocalisedText(rider.churnReason, t)`,
 * which throws on a missing key in dev — which is the mechanism that finds the
 * day they are not there, and is the reason no fallback string is written here.
 */

import type { Dictionary } from '@/lib'

export const RIDER_PROFILE_EN: Dictionary = {
  /* ── the band ─────────────────────────────────────────────────────── */
  'profile.rider.joined': 'Joined {date}',

  /* ── the rail ─────────────────────────────────────────────────────── */
  /** §8.3.1 — the unit stated ONCE beside the figure, the way a table states
      it once in its header. The numeral itself is `Money unit="none"`. */
  'profile.rider.rail.unit': 'SAR',
  /** §8.3.4 — a pending amount is its own labelled line beneath a balance and
      never inside it. Deliberately NOT `Held`: `Held` under a wallet balance
      reads as *held out of your balance*, and none of the rider's balance is.
      See `RiderRail`. */
  'profile.rider.rail.underReview': 'Payments under review',
  /** Not `Subscription` and not `Last plan`. See `RiderRail`. */
  'profile.rider.rail.plan': 'Plan',
  'profile.rider.rail.noPlan': 'No plan on this record',
  'profile.rider.rail.planLegs': '{used} of {total} trips used',
  'profile.rider.rail.planEnded': '{plan} · ended {date}',
  'profile.rider.rail.planEnds': '{plan} · ends {date}',
  'profile.rider.rail.since': 'Since {date}',
  'profile.rider.rail.churnNone': 'No negative signal on record.',

  /* ── the panels ───────────────────────────────────────────────────── */
  'profile.rider.tab.activity': 'Activity',
  'profile.rider.tab.money': 'Money',
  'profile.rider.activity.open': 'Open right now',
  'profile.rider.activity.earlier': 'Earlier',
  'profile.rider.activity.empty': 'Nothing has happened on this record yet.',
  'profile.rider.activity.captainOnBoard': 'A captain is on this trip.',
  /**
   * **Consumed by the full-page profile, not by this sheet.**
   *
   * The sheet takes the sentence from `rider.timeline.trip.noCaptain` — the
   * SHARED resolver's, so both surfaces say it in the same words — and this
   * key is what `screens/entity/RiderOpenTrip.tsx` reads today. It stays until
   * that surface moves to the shared one, at which point it should be deleted
   * rather than left as a second spelling of one sentence. Raised in the
   * handoff.
   */
  'profile.rider.money.empty': 'No money has moved on this record yet.',
  /** The rows do not sum to the balance and are not meant to — a card capture
      never touched the wallet, and an unsettled posting is outside the balance
      by AC-312. Said on the rows it is true of, so nobody adds the column up
      and concludes the screen is wrong.

      **Two call sites, and both are load-bearing** (owner amendment 3, §16.5):
      the money rows in `RiderPanels`, where it names WHICH rows sit outside the
      balance, and the `Payments under review` block in `RiderRail`, where the
      figure stacks directly under the wallet balance in one column and the
      misread is available. It replaced `profile.rider.rail.underReviewNote`'s two
      sentences there rather than a second key being minted: a second spelling
      of a shared sentence is a second contract that has not noticed yet.

      The RANK differs by context and that is correct — `text-xs` in the rail,
      where it is the block's only secondary line, and `text-2xs` on a money
      row, where it is a third line under a label and a timestamp (§2.3). */
  'profile.rider.money.outsideBalance': 'Not counted in the wallet balance',

  /* ── what else references this rider ─────────────────── */
  'profile.rider.support.heading': 'Elsewhere in the console',
  /** `{total: 3, open: 0}` and `{total: 0}` are different states and get
      different sentences — *"three complaints, all resolved"* is not the same
      page as *"no complaints"*. Neither is ever composed with another
      resource's. */
  'profile.rider.support.none': 'None',
  'profile.rider.support.some': '{total} on record · {open} open',
  'profile.rider.support.allClosed': '{total} on record · none open',
  'profile.rider.support.complaints': 'Complaints',
  'profile.rider.support.conversations': 'Conversations',
  'profile.rider.support.lostAndFound': 'Lost and found',
  'profile.rider.support.fairnessCases': 'Fairness cases',
  'profile.rider.support.requests': 'Ride requests',

  /* ── the one blocked write (§11.2). See `refusals.ts`. ────────────── */
  'profile.rider.action.assign': 'Assign a captain',
  'profile.rider.refusal.assignAssigned': 'A captain is already on this trip.',
  /**
   * **A refusal names the next step, never the rule behind it** (finding G1).
   *
   * This used to read *"A captain is assigned on the dispatch board. This layer
   * commits nothing."* Both sentences were wrong for an operator.
   *
   * The second named a design rule. §5.7 is that a control explains itself in
   * the reader's terms, and no operator knows what a layer commits — it is the
   * reason the control is disabled, not anything they can act on.
   *
   * The first was mis-tensed and said the opposite of what it meant: *"a
   * captain **is** assigned"* reads as *one already has been*, directly under a
   * line saying none has. The plural present states the practice instead.
   */
  'profile.rider.refusal.assign': 'Captains are assigned on the dispatch board.',
}
