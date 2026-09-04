/**
 * The ride record's copy — the sheet, the page, and every string on both.
 *
 * One dictionary for two surfaces, because they are two arrangements of one
 * record and a second dictionary would be a second chance for them to call the
 * same thing by two names. `ProfileLayer` and `EntityPageScreen` both resolve
 * these keys the same way every screen-owned dictionary is resolved — see
 * `screens/operations/localCopy.ts` for why the wrapper exists and what deletes
 * it.
 *
 * **No concatenation** (AC-75): every sentence with a value in it is one key
 * with named placeholders. `pickup + ' → ' + destination` is exactly what that
 * rule forbids, and the arrow is inside the string so the Arabic entry can
 * carry `←` instead — §9.5's rule that a mirroring glyph is swapped at
 * string-construction time and never with CSS.
 */

import type { Dictionary } from '@/lib'

export const TRIP_PROFILE_EN: Dictionary = {
  /* ── the band ───────────────────────────────────────────────────────── */
  'profile.trip.kind': 'Trip',
  'profile.trip.band.route': '{pickup} → {destination}',
  /* Four facts, one line, one key. The id first because it is what an operator
     pastes into a search box or reads down a phone. */
  'profile.trip.band.meta': '{id} · {date} · {rider} · {captain}',
  'profile.trip.band.metaNoCaptain': '{id} · {date} · {rider}',
  'profile.trip.band.flagged': 'Flagged',

  /* ── the map ────────────────────────────────────────────────────────── */
  'profile.trip.map.heading': 'The route',
  'profile.trip.map.a11y':
    'A map of Riyadh showing the pickup at {pickup} and the drop-off at {destination}.',
  'profile.trip.map.a11yLive':
    'A map of Riyadh showing the pickup at {pickup}, the drop-off at {destination}, and the captain’s estimated position between them.',
  'profile.trip.map.pickup': 'Pickup',
  'profile.trip.map.destination': 'Drop-off',
  'profile.trip.map.captain': 'Captain now',
  /* §11.3 — the figure says what it IS. A number labelled `Distance` a few
     pixels from a fare is one an operator will price against, and this one is
     the crow-flies gap between two district anchors. */
  'profile.trip.map.straightLine': '{distance} km straight line',
  'profile.trip.map.unplaced': '{place} could not be placed on the map.',
  'profile.trip.map.none': 'Neither end of this ride is a place the map knows.',
  /* The caveat, in the operator's own words rather than in a code comment. It
     is on the surface because a mark that looks like a GPS fix and is not will
     otherwise be read as one. */
  'profile.trip.map.estimated': 'Captain’s position is estimated from time elapsed, not tracked.',
  'profile.trip.map.expand': 'Open the map',
  /* The dialog's description line. `places.ts`'s caveat has to travel with the
     picture when the picture gets big enough to look authoritative. */
  'profile.trip.map.dialogNote':
    'Pickup and drop-off are placed at their district, and the line between them is a connector rather than the road anybody drove.',
  'profile.trip.map.zoom.in': 'Zoom in',
  'profile.trip.map.zoom.out': 'Zoom out',

  /* ── the figures ────────────────────────────────────────────────────── */
  'profile.trip.fact.distance': 'Distance',
  'profile.trip.fact.elapsed': 'Elapsed',
  'profile.trip.fact.remaining': 'Remaining',
  /* The row `Remaining` becomes once the ETA is behind us. A separate LABEL and
     not a negative number: `Remaining −20 min` is arithmetic, `Overdue by
     20 min` is the sentence an operator acts on. */
  'profile.trip.fact.overdueLabel': 'Overdue',
  'profile.trip.fact.overdue': 'by {minutes} min',
  'profile.trip.fact.plan': 'Against plan',
  'profile.trip.fact.duration': 'Duration',
  'profile.trip.fact.km': '{km} km',
  'profile.trip.fact.minutes': '{minutes} min',
  'profile.trip.fact.speed': '{speed} km/h',
  /* The signed forms. A `+` typed into a template would be concatenation and
     would also be the wrong glyph in Arabic. */
  'profile.trip.fact.over': '+{minutes} min',
  'profile.trip.fact.under': '−{minutes} min',
  'profile.trip.fact.onPlan': 'On plan',
  'profile.trip.fact.eta': 'ETA {time}',
  'profile.trip.fact.noPlan': 'No quoted duration to measure against.',

  /* ── the two parties ────────────────────────────────────────────────── */
  'profile.trip.party.passenger': 'Passenger',
  'profile.trip.party.captain': 'Captain',
  'profile.trip.party.callRider': 'Call rider',
  'profile.trip.party.callCaptain': 'Call captain',
  'profile.trip.party.noCaptain': 'No captain assigned',
  'profile.trip.party.noCaptainReason':
    'This ride was cancelled before a captain accepted it, so there is nobody to call.',
  'profile.trip.party.mobile': 'Mobile',
  'profile.trip.party.subscription': 'Subscription',
  'profile.trip.party.rating': 'Rating given',
  'profile.trip.party.notRated': 'Not rated',
  'profile.trip.party.ratingWithNote': '{rating} — “{note}”',
  'profile.trip.party.vehicle': 'Vehicle',
  'profile.trip.party.standing': 'Standing',
  /* Three facts about a captain, one line, one key — the same rule as the
     band's meta. O9 drops the clause an absent figure would leave dangling;
     four shapes, four whole sentences, never a join in code (AC-75). */
  'profile.trip.party.standingValue': '{rating} rating · {trips} trips · {onTime} on time',
  'profile.trip.party.standingValueNoRating': '{trips} trips · {onTime} on time',
  'profile.trip.party.standingValueNoOnTime': '{rating} rating · {trips} trips',
  'profile.trip.party.standingValueTripsOnly': '{trips} trips',
  'profile.trip.party.vehicleValue': '{vehicle} · {tier}',
  'profile.trip.party.openRider': 'Open {name}’s profile',
  'profile.trip.party.openCaptain': 'Open {name}’s profile',

  /* ── the subscription block (subscription legs only) ────────────────── */
  'profile.trip.sub.leg': '{id} · {plan} · leg {index} of {total}',
  'profile.trip.sub.open': 'Open subscription {id}',
  'profile.trip.sub.unresolved':
    'This subscription is no longer on file, so it cannot be opened.',

  /* ── the stage rail ─────────────────────────────────────────────────── */
  'profile.trip.tab.stages': 'Stages',
  'profile.trip.tab.fare': 'Fare',
  'profile.trip.stages.heading': 'What happened',
  'profile.trip.stage.requested': 'Requested',
  'profile.trip.stage.accepted': 'Captain accepted',
  'profile.trip.stage.arrived': 'Arrived at pickup',
  'profile.trip.stage.started': 'Trip started',
  'profile.trip.stage.detour': 'Detour',
  'profile.trip.stage.detourOn': 'Detour on {place}',
  'profile.trip.stage.dropoff': 'Drop-off',
  'profile.trip.stage.cancelled': 'Cancelled',
  'profile.trip.stage.pending': 'Not yet',
  'profile.trip.stage.lost': '{minutes} min late',
  'profile.trip.stage.added': '+{minutes} min',
  'profile.trip.stage.wait': '{minutes} min',
  /* The one-line summary above the rail — the whole reason this surface
     exists, so it says the number rather than making the operator add up. */
  'profile.trip.stages.lost': '{minutes} min lost',
  'profile.trip.stages.onTime': 'Nothing lost',
  'profile.trip.stages.error': 'The stage log could not be read.',
  'profile.trip.stages.empty': 'No stages have been recorded for this ride.',

  /* ── the fare ───────────────────────────────────────────────────────── */
  'profile.trip.fare.heading': 'Fare',
  'profile.trip.fare.total': 'Total fare',
  'profile.trip.fare.captain': 'Captain earnings',
  'profile.trip.fare.platform': 'Eyvar cut',
  'profile.trip.fare.extraStop': 'Extra stop',
  'profile.trip.fare.tip': 'Tip',
  'profile.trip.fare.payment': 'Payment',
  'profile.trip.fare.noPayment': 'No payment was taken for this ride.',
  /* §9.2's ledger discipline: a set of figures that claims to decompose a total
     has to be shown to. The sentence names the size of the gap, because "these
     do not reconcile" without the number is a fact nobody can act on. */
  'profile.trip.fare.reconcile':
    'These lines do not add up to the total — {amount} SAR is unaccounted for.',

  /* ── the footer and the record's own state ──────────────────────────── */
  'profile.trip.footer.open': 'Open full record',
  'profile.trip.state.error': 'This ride could not be read.',
  'profile.trip.state.retry': 'Try again',
  'profile.trip.desynced':
    'The rider’s app never acknowledged the last state change, so what the rider sees may differ from this record.',
}
