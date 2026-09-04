/**
 * Operations › Live Dispatch — every string as a key (AC-74, AC-75).
 * Unregistered: `withFallback` tries the shell dictionary first, so the enum
 * families this file omits resolve through the shared vocabulary (T4.2).
 */

import type { Dictionary } from '@/lib'

export const DISPATCH_EN: Dictionary = {
  'action.cancel': 'Cancel',
  'column.rider': 'Rider',
  'dispatch.assignCaptain': 'Dispatch captain',
  'dispatch.dismissAlert': 'Acknowledge',
  'dispatch.empty.board.action': 'Go to requests',
  'dispatch.empty.board.body': 'Trips, waiting requests and captains appear here.',
  'dispatch.empty.board.heading': 'Nothing is moving yet',
  'dispatch.empty.fleet.body': 'Captains appear here as they come on shift.',
  'dispatch.empty.fleet.heading': 'No captain is online',
  'dispatch.empty.pending.body': 'Unmatched requests appear here.',
  'dispatch.empty.pending.heading': 'Nothing waiting',
  'dispatch.empty.trips.body': 'New trips appear here as captains accept them.',
  'dispatch.empty.trips.heading': 'Nothing in transit',
  'dispatch.fleet.subs': '{active}/{max} subscriptions',
  'dispatch.intervention.delayed': 'Delayed arrival · {trip}',
  'dispatch.intervention.sos': 'Emergency signal · {trip}',
  'dispatch.intervention.stranded': 'Rider stranded · {trip}',
  'dispatch.intervention.sub': '{captain} · {rider} at {place}',
  'dispatch.intervention.sub.noCaptain': 'No captain · {rider} at {place}',
  'dispatch.intervention.elapsed': '{minutes}m open',
  /* §11.2 — one sentence per refusal the two writes can raise, keyed by the
     code `clients/dispatch.ts` sends. The server's own message names a user id
     and a timestamp; an operator needs to know what to do instead. */
  'dispatch.intervention.refusal.already_acknowledged': 'Somebody else has already acknowledged this.',
  'dispatch.intervention.refusal.same_driver': 'That captain is already on this trip.',
  'dispatch.intervention.refusal.driver_unavailable': 'That captain is not on shift.',
  'dispatch.intervention.refusal.failed': 'Nothing changed. Try again.',
  'dispatch.interventions.active': '{count} active',
  'dispatch.interventions.title': 'Live interventions',
  'dispatch.interventions.open': 'Open',
  'dispatch.interventions.strip': '{count} interventions',
  'dispatch.map.a11y.desc': 'A map of Riyadh carrying {trips} trips in flight, {pending} requests waiting for a captain, and {captains} captains online.',
  /* T2.2 — the frame is declared (`geo.ts`) and deliberately tighter than the
     gazetteer, so a mark can fall outside it with no way back but the zoom.
     This re-fits the frame to every mark on the board. */
  'dispatch.map.fit': 'Fit to fleet',
  'dispatch.map.heading': 'Dispatch map',
  'dispatch.map.pin.request': 'Request {id}, waiting at {pickup}, going to {destination}',
  'dispatch.map.pin.trip': 'Trip {id}, picked up at {pickup}, going to {destination}',
  'dispatch.map.unknownPlace': 'an unrecorded place',
  /* R8 — a row with no coordinate is counted, never dropped in silence. It is
     most often a captain registered in another city (`fixtures/drivers.ts`),
     which no re-framing of Riyadh can bring in. */
  'dispatch.map.unplaced': '{count} rows have no place on file',
  'dispatch.map.zoom.in': 'Zoom in',
  'dispatch.map.zoom.out': 'Zoom out',
  'dispatch.layers.captains': 'Captains',
  'dispatch.layers.pending': 'Pending',
  'dispatch.layers.title': 'Map layers',
  'dispatch.layers.trips': 'Trips',
  'dispatch.legend.captainOnline': 'Captain online',
  'dispatch.legend.requestWaiting': 'Request waiting',
  'dispatch.legend.title': 'What the marks mean',
  'dispatch.legend.tripDestination': 'Trip destination',
  'dispatch.legend.tripPickup': 'Trip pickup',
  /* X15 — the caveat behind `InfoHint` on the legend title. The marks are
     placed from a registered district, not from telemetry (`geo.ts`). */
  'dispatch.legend.note': 'Captain marks show the district a captain is registered in, not a live position.',
  'dispatch.feed.collapse': 'Collapse',
  'dispatch.feed.expand': 'Expand',
  'dispatch.feed.scope.fleet': '{count} captains on shift',
  'dispatch.feed.scope.pending': '{count} waiting for a captain',
  'dispatch.feed.scope.trips': '{count} on the road',
  /* T1.3 — the board re-reads on the shell's clock and the meta says how old
     the figures are. It used to claim a live connection (X4). */
  'dispatch.meta': 'Updated {seconds}s ago',
  'dispatch.reading.autoMatch': 'Auto-match',
  'dispatch.reading.seconds': '{seconds}s',
  'dispatch.reading.matchTime': 'Match time',
  'dispatch.reading.utilisation': 'Utilisation',
  'dispatch.manual.desc': 'Assign a captain to request {id} for {rider}, picking up at {pickup}.',
  'dispatch.manual.assignError': "Couldn't assign the captain. Nothing was changed.",
  'dispatch.manual.empty': 'Assignment reopens when a captain comes on shift.',
  'dispatch.manual.error': "Captains didn't load. Try again, or close this and dispatch from the queue.",
  'dispatch.manual.loading': 'Loading captains',
  'dispatch.manual.title': 'Assign a captain',
  'dispatch.noInterventions': 'Every live trip is within its SLA.',
  'dispatch.place': 'Place',
  'dispatch.reassignCaptain': 'Reassign',
  'dispatch.reassign.desc': 'Choose the captain who goes to this rider.',
  'dispatch.reassign.title': 'Reassign captain',
  /* The feed's tabs and the map's layers name the same three things and are
     NOT the same key: a tab is a place to stand and a layer is a thing to
     draw, and the reference labels the fleet tab `Fleet` while the layer that
     paints its dots is `Captains`. */
  'dispatch.tab.fleet': 'Fleet',
  'dispatch.tab.pending': 'Pending',
  'dispatch.tab.trips': 'Trips',
  'dispatch.toast.acknowledged': 'Acknowledged {id}',
  'dispatch.toast.dispatched': 'Request {id} assigned to captain {name}',
  'dispatch.toast.reassigned': '{id} reassigned to {name}',
  /* The three active statuses, restated rather than reached for in
     `trips/copy.ts`: the day Dispatch wants `En route to pickup` where the
     trips table wants `En route`, one shared key would have to serve both. */
  'dispatch.trip.status.assigned': 'Assigned',
  'dispatch.trip.status.en-route': 'En route',
  'dispatch.trip.status.in-trip': 'In trip',
  'dispatch.unassigned': 'Unassigned',
  'sub.selectDriverPlaceholder': 'Choose an active captain',
  'trip.pickup': 'Pickup',
  /* Screen-specific, NOT the generic `action.*` key: `action.saving` carries a
     different value in three other screen dictionaries and the last spread
     into `EN` wins. A key that means four things is not a key. */
  'dispatch.action.assigning': 'Assigning…',
  'dispatch.selectCaptain': 'Select an available captain',
}
