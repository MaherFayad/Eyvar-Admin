/**
 * Operations > Live Dispatch - every operator-facing string, as keys (**AC-74**),
 * with no concatenation anywhere (**AC-75**).
 *
 * **This screen is not registered in `src/i18n/dictionaries.ts` yet**, and that
 * file has a single owner. Until it is, `withFallback` (`../localCopy`) resolves
 * these keys against this dictionary - the same arrangement Trips and
 * Subscriptions already use.
 *
 * Before this file, Dispatch carried **41 `defaultValue` literals inside JSX**
 * across three components. That is the arrangement `copy.ts` exists to prevent:
 * `defaultValue` slips past the missing-key guard in `lib/i18n/translate.ts:98`,
 * so a translation pass cannot see the string at all, and an English literal in
 * a `.tsx` drifts the moment someone edits it in place.
 *
 * Requested of the shell owner:
 *
 * ```ts
 * import { DISPATCH_EN } from '@/screens/operations/dispatch/copy'
 * // ...and `...DISPATCH_EN` in the English assembly.
 * ```
 */

import type { Dictionary } from '@/lib'

export const DISPATCH_EN: Dictionary = {
  'action.cancel': 'Cancel',
  'column.rider': 'Rider',
  'dispatch.activeAlerts': 'Active',
  'dispatch.assignCaptain': 'Dispatch captain',
  'dispatch.autoMatchRate': 'Auto-match rate',
  'dispatch.avgMatchTime': 'Average match time',
  'dispatch.confirmAssign': 'Dispatch captain',
  'dispatch.dismissAlert': 'Acknowledge',
  'dispatch.empty.board.action': 'Go to requests',
  'dispatch.empty.board.body': 'Live Dispatch tracks trips in progress, requests waiting for a captain, and who is on shift. It fills as the day starts.',
  'dispatch.empty.board.heading': 'Nothing is moving yet',
  'dispatch.empty.fleet.body': 'Captains appear here as they come on shift.',
  'dispatch.empty.fleet.heading': 'No captain is online',
  'dispatch.empty.pending.body': 'Every ride request has a captain. Unmatched requests appear here.',
  'dispatch.empty.pending.heading': 'Nothing waiting',
  'dispatch.empty.trips.body': 'No trip is on the road right now. New trips appear here as captains accept them.',
  'dispatch.empty.trips.heading': 'Nothing in transit',
  'dispatch.error.telemetry': "Dispatch velocity isn't available while the board is down.",
  'dispatch.feed.activeTrips': 'Active trips',
  'dispatch.feed.fleet': 'Fleet online',
  'dispatch.feed.pendingMatch': 'Pending dispatch',
  'dispatch.fleet.active': 'Active',
  'dispatch.fleetUtilization': 'Fleet utilisation',
  'dispatch.inTransit': 'in-transit',
  'dispatch.intervention.delayed': 'Delayed arrival · {trip}',
  'dispatch.intervention.sos': 'Emergency signal · {trip}',
  'dispatch.intervention.stranded': 'Rider stranded · {trip}',
  'dispatch.intervention.sub': '{captain} · {rider} at {place}',
  'dispatch.intervention.sub.noCaptain': 'No captain · {rider} at {place}',
  'dispatch.intervention.elapsed': '{minutes}m open',
  'dispatch.interventions.title': 'Live interventions',
  'dispatch.interventions.unavailable': 'Interventions are read-only until the live alert feed is connected. Acknowledging or reassigning here would save nothing.',
  'dispatch.liveConnected': 'Live telemetry connected',
  'dispatch.liveTelemetry': 'Dispatch velocity',
  'dispatch.map.a11y.desc': 'A map of Riyadh carrying {trips} trips in flight, {pending} requests waiting for a captain, and {captains} captains online.',
  'dispatch.map.heading': 'Dispatch map',
  'dispatch.map.pin.request': 'Request {id}, waiting at {pickup}, going to {destination}',
  'dispatch.map.pin.trip': 'Trip {id}, picked up at {pickup}, going to {destination}',
  'dispatch.map.unknownPlace': 'an unrecorded place',
  'dispatch.map.unplaced': '{count} rows are outside this map',
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
  /* The captain marks are placed from a registered district, not from
     telemetry. Saying so under the legend is the difference between a board an
     operator can trust and one they find out about later. See `geo.ts`. */
  'dispatch.legend.note': 'Captain marks show the district a captain is registered in, not a live position.',
  'dispatch.feed.collapse': 'Collapse',
  'dispatch.feed.expand': 'Expand',
  'dispatch.feed.scope.fleet': '{count} captains on shift',
  'dispatch.feed.scope.pending': '{count} waiting for a captain',
  'dispatch.feed.scope.trips': '{count} on the road',
  'dispatch.fleet.subs': '{active}/{max} subscriptions',
  'dispatch.interventions.open': 'Open',
  'dispatch.interventions.strip': '{count} interventions',
  'dispatch.meta': '{count} in transit · as of {time}',
  'dispatch.reading.autoMatch': 'Auto-match',
  'dispatch.reading.seconds': '{seconds}s',
  'dispatch.reading.matchTime': 'Match time',
  'dispatch.reading.utilisation': 'Utilisation',
  'dispatch.manual.desc': 'Assign a captain to request {id} for {rider}, picking up at {pickup}.',
  'dispatch.manual.assignError': "Couldn't assign the captain. Nothing was changed.",
  'dispatch.manual.empty': 'No captain is on shift. Assignment reopens when one comes online.',
  'dispatch.manual.error': "Captains didn't load. Try again, or close this and dispatch from the queue.",
  'dispatch.manual.loading': 'Loading captains',
  'dispatch.manual.title': 'Assign a captain',
  'dispatch.noInterventions': 'Every live trip is within its SLA.',
  'dispatch.reassignCaptain': 'Reassign',
  /* The feed's tabs and the map's layers name the same three things and are
     NOT the same key: a tab is a place to stand and a layer is a thing to
     draw, and the reference labels the fleet tab `Fleet` while the layer that
     paints its dots is `Captains`. One key for both would have forced one of
     the two to read wrong. */
  'dispatch.tab.fleet': 'Fleet',
  'dispatch.tab.pending': 'Pending',
  'dispatch.tab.trips': 'Trips',
  'dispatch.toast.dispatched': 'Request {id} assigned to captain {name}',
  /* The three active statuses, restated here rather than reached for in
     `trips/copy.ts`. Two unregistered screen dictionaries importing each
     other is a coupling neither one declares, and the words are a translation
     unit either way — the day Dispatch wants `En route to pickup` where the
     trips table wants `En route`, one shared key would have to serve both. */
  'dispatch.trip.status.assigned': 'Assigned',
  'dispatch.trip.status.en-route': 'En route',
  'dispatch.trip.status.in-trip': 'In trip',
  'dispatch.unassigned': 'Unassigned',
  'sub.selectDriverPlaceholder': 'Choose an active captain',
  'trip.pickup': 'Pickup',
  /* Screen-specific, NOT the generic `action.*` key. `action.saving`,
     `action.goBack` and `sub.selectDriver` each carried a DIFFERENT value in a
     different screen dictionary, and the last spread into `EN` wins - so
     registering this dictionary would have silently relabelled three modals.
     A key that means four things is not a key. */
  'dispatch.action.assigning': 'Assigning…',
  'dispatch.selectCaptain': 'Select an available captain',
}
