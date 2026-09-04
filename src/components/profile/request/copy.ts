/**
 * The request presentation's own strings — the sheet that opens when an
 * operator selects a row on either Requests queue.
 *
 * One `Dictionary`, spread by `src/i18n/dictionaries.ts`, exactly as a screen's
 * `copy.ts` is. Nothing here is reachable through a `defaultValue`:
 * `createTranslator` throws on a missing key in dev, which is the mechanism
 * that finds one.
 *
 * ## Reused rather than restated
 *
 * The sheet leans hard on keys that already exist and are already translated,
 * because a second spelling of a word an operator already knows is how two
 * surfaces start disagreeing:
 *
 * | reused | from | why it must not be re-minted |
 * |---|---|---|
 * | `requests.route` | the queue's own copy | it carries the **arrow**, and the Arabic entry carries `←`. §9.5: a glyph that mirrors is swapped at string-construction time, never with CSS. A second copy would be a second answer to which way the ride points. |
 * | `requests.status.*` | the queue | the six states, with `REQUEST_STATUS` in `profile/domain.ts` now the one tone map behind both surfaces |
 * | `requests.channel.*` | the queue | `Instant` / `Subscription` |
 * | `subs.plan.*` | the subscriptions queue | the three plan names |
 * | `sla.left` / `sla.overdue` | the shared SLA vocabulary | the countdown, rendered with the words the row already uses |
 * | `shell.layer.openFullProfile` | the shell | the footer's one link |
 *
 * ## `Estimated fare` and `Authorisation hold` are two labels, deliberately
 *
 * `types/request.ts` carries them as two nullable fields, one per channel,
 * rather than one field meaning two things. The copy follows the data: an
 * instant request's money is a **quote for a ride that has not happened**, and
 * a subscription request's is **a hold that assignment captures**. Calling both
 * of them `Amount` would put one word over two facts an operator has to treat
 * differently — one is an estimate they may ignore, the other is money that
 * moves the moment they press the button.
 */

import type { Dictionary } from '@/lib'

export const REQUEST_PROFILE_EN: Dictionary = {
  /* ── the band ────────────────────────────────────────────────────────── */
  /* The eyebrow is `profile.kind.request`, shared. The meta row is built from
     values rather than from a sentence, so an absent one leaves no orphan. */
  'profile.request.band.vip': 'VIP',

  /* ── the map ─────────────────────────────────────────────────────────── */
  'profile.request.map.heading': 'The route',
  'profile.request.map.a11y':
    'A map of Riyadh with the pickup at {pickup} and the drop-off at {destination}.',
  'profile.request.map.pickup': 'Pickup',
  'profile.request.map.destination': 'Drop-off',
  /* **`straight line`, never `distance`.** We hold two district names and no
     polyline, so the figure is the crow-flies gap between two hand-placed
     anchors. The label says exactly that, because a number called `Distance`
     sitting beside a fare is one an operator will price against. */
  'profile.request.map.straightLine': '{distance} km straight line',
  /* The gazetteer had no entry for one end of the ride. The map draws what it
     can and names what it could not — a place missing from a picture and a
     place missing from the data look identical once you stop saying which. */
  'profile.request.map.unplaced': '{place} could not be placed on the map.',
  'profile.request.map.none': 'Neither end of this ride is a place the map knows.',
  /* The expanded map. The key sits in the REQUEST dictionary and the
     subscription sheet reads it, exactly as it already reads
     `profile.request.map.pickup` — one control, one spelling. */
  'profile.request.map.expand': 'Open the map',
  'profile.request.map.dialogNote':
    'Pickup and drop-off are placed at their district, and the line between them is a connector rather than the road anybody drove.',
  'profile.request.map.zoom.in': 'Zoom in',
  'profile.request.map.zoom.out': 'Zoom out',

  /* ── what floats on the map ──────────────────────────────────────────── */
  'profile.request.float.waiting': 'Waiting',
  'profile.request.float.waited': 'Waited',

  /* ── the rail ────────────────────────────────────────────────────────── */
  'profile.request.rail.unit': 'SAR',
  'profile.request.rail.since': 'Asked at {time}',
  'profile.request.rail.fare': 'Estimated fare',
  'profile.request.rail.fareNote': 'Quoted when the rider asked. The trip may bill differently.',
  'profile.request.rail.hold': 'Authorisation hold',
  'profile.request.rail.holdNote': 'Captured when a captain is assigned.',
  'profile.request.rail.noQuote': 'No quote was returned for this ride.',
  'profile.request.rail.captain': 'Captain',
  'profile.request.rail.assignedOn': 'Assigned {date}',
  'profile.request.rail.offerCloses': 'Reply window closes {time}',
  'profile.request.rail.noCaptain': 'Nobody has taken this ride yet',
  'profile.request.rail.owner': 'Owner',
  'profile.request.rail.ownerNone': 'Unclaimed',
  'profile.request.rail.ownerSince': 'Held since {time}',

  /* ── the panels ──────────────────────────────────────────────────────── */
  'profile.request.tab.details': 'Details',
  'profile.request.tab.timeline': 'Timeline',
  'profile.request.group.ride': 'The ride',
  'profile.request.group.money': 'Money',
  'profile.request.group.rider': 'Rider',
  'profile.request.group.captain': 'Captain',
  'profile.request.group.notes': 'Rider’s note',
  'profile.request.notes.empty': 'The rider left no note.',

  /* ── field labels ────────────────────────────────────────────────────── */
  'profile.request.field.channel': 'Type',
  'profile.request.field.pickup': 'Pickup',
  'profile.request.field.destination': 'Drop-off',
  'profile.request.field.vehicleClass': 'Vehicle class',
  'profile.request.field.requestedAt': 'Requested',
  'profile.request.field.fare': 'Estimated fare',
  'profile.request.field.hold': 'Authorisation hold',
  'profile.request.field.plan': 'Plan',
  'profile.request.field.preferredTime': 'Preferred pickup time',
  'profile.request.field.captain': 'Captain',
  'profile.request.field.notes': 'Rider’s note',
  'profile.request.field.slaDue': 'Deadline',
  'profile.request.field.riderRating': 'Rider rating',
  'profile.request.field.priorSubscription': 'Subscribed before',
  'profile.request.field.offerExpires': 'Offer window closes',
  'profile.request.field.assignedBy': 'Assigned by',
  'profile.request.field.subscription': 'Subscription created',

  /* ── the timeline ────────────────────────────────────────────────────── */
  /* **Every row is a STAMP the record carries**, ordered. Nothing here is
     inferred: there is no `offeredAt` field, so the offer's row is the moment
     its reply window closes, which is the field that exists. */
  'profile.request.event.requested': 'Rider asked for this ride',
  'profile.request.event.claimed': '{name} claimed it',
  'profile.request.event.offerCloses': 'Reply window closes for {name}',
  'profile.request.event.breached': 'Deadline passed with nobody assigned',
  'profile.request.event.assigned': 'Assigned to {name}',
  'profile.request.event.assignedBy': 'Assigned to {name} by {actor}',
  'profile.request.event.expired': 'Closed without a captain',
  'profile.request.event.cancelled': 'Rider cancelled',
}
