/**
 * The subscription presentation's own strings — the sheet a Subscriptions row
 * opens.
 *
 * One `Dictionary`, spread by `src/i18n/dictionaries.ts`, exactly as a screen's
 * `copy.ts` is. Nothing here is reachable through a `defaultValue`:
 * `createTranslator` throws on a missing key in dev, which is the mechanism
 * that finds one.
 *
 * ## Reused rather than restated
 *
 * This file is deliberately small, because a subscription sheet and a request
 * sheet are the same shape and must not grow two vocabularies for it:
 *
 * | reused | from | why |
 * |---|---|---|
 * | `requests.route` | the requests queue | it carries the **arrow**, and the Arabic entry carries `←`. §9.5 fixes the swap at string-construction time, so a second key would be a second answer to which way the commute points. |
 * | `profile.request.map.pickup` / `.destination` / `.straightLine` / `.unplaced` / `.none` / `.zoom.*` | the request sheet | the two maps draw the same two ends on the same city; one spelling of `Pickup` |
 * | `profile.request.rail.unit` | the request sheet | `SAR` |
 * | `profile.request.tab.details` / `.timeline` / `.group.money` / `.group.rider` / `.field.*` | the request sheet | the pairs are the same pairs |
 * | `profile.subStatus.*` | `profile/copy.ts` | the six cycle states, already toned by `SUBSCRIPTION_STATUS` |
 * | `profile.value.ratio` | `profile/copy.ts` | `{used} of {total}` |
 * | `subs.action.*`, `subs.reason.*`, `subs.toast.*` | the subscriptions queue | the three commands are the queue's, and so is every word on them |
 *
 * What is left is what only a commitment has: its legs, its cycle window, its
 * escrow, its renewal likelihood, and the direction of the daily leg.
 */

import type { Dictionary } from '@/lib'

export const SUBSCRIPTION_PROFILE_EN: Dictionary = {
  /* ── the map ─────────────────────────────────────────────────────────── */
  'profile.subscription.map.heading': 'The daily route',
  'profile.subscription.map.a11y.oneWay':
    'A map of Riyadh with the daily pickup at {pickup} and the drop-off at {destination}.',
  'profile.subscription.map.a11y.roundTrip':
    'A map of Riyadh with the daily route between {pickup} and {destination}, run in both directions.',
  /* **`Round trip`, not `Return`.** `Return` reads as the leg home on its own;
     this names the whole daily shape, which is what doubles the legs. */
  'profile.subscription.map.roundTrip': 'Round trip',
  'profile.subscription.map.oneWay': 'One way',

  /* ── what floats on the map ──────────────────────────────────────────── */
  'profile.subscription.figure.legs': 'Legs used',
  'profile.subscription.figure.legsLeft': '{count} left',
  'profile.subscription.figure.paid': 'Paid',

  /* ── the rail ────────────────────────────────────────────────────────── */
  'profile.subscription.rail.captain': 'Captain',
  'profile.subscription.rail.noCaptain': 'No captain assigned to this cycle',
  'profile.subscription.rail.cycle': 'Cycle',
  /* One key, two named placeholders — never two dates joined in JSX (§9.6). */
  'profile.subscription.rail.window': '{from} — {to}',
  'profile.subscription.rail.frozenUntil': 'Frozen until {date}',
  'profile.subscription.rail.cancelledOn': 'Cancelled {date}',
  'profile.subscription.rail.escrow': 'Held in escrow',
  'profile.subscription.rail.escrowNote': 'Released to the captain as legs are delivered.',
  /* §3.5 — `null` escrow is *no hold*, which is a known fact and not a blank. */
  'profile.subscription.rail.noEscrow': 'Nothing is held against this cycle.',
  'profile.subscription.rail.renewal': 'Renewal likelihood',
  'profile.subscription.rail.noRenewal': 'No history to predict from yet.',

  /* ── the panels ──────────────────────────────────────────────────────── */
  'profile.subscription.group.commitment': 'The commitment',
  'profile.subscription.group.cancellation': 'Why it was cancelled',
  'profile.subscription.field.tripKind': 'Daily route',
  'profile.subscription.field.legs': 'Legs',

  /* ── the timeline ────────────────────────────────────────────────────── */
  /* Every row is a date the record carries. `Ends` is listed even when it is in
     the future and is labelled as the date the cycle ends rather than as
     something that happened — a commitment running out on a stated day is the
     fact an operator is usually here to check. */
  'profile.subscription.event.started': 'Cycle started',
  'profile.subscription.event.ends': 'Cycle ends',
  'profile.subscription.event.frozen': 'Frozen until this date',
  'profile.subscription.event.cancelled': 'Cancelled and settled',
}
