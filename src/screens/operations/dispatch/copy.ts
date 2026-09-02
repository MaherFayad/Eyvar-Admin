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
  'dispatch.interventions.title': 'Live interventions',
  'dispatch.interventions.unavailable': 'Interventions are read-only until the live alert feed is connected. Acknowledging or reassigning here would save nothing.',
  'dispatch.liveConnected': 'Live telemetry connected',
  'dispatch.liveTelemetry': 'Dispatch velocity',
  'dispatch.manual.desc': 'Assign a captain to request {id} for {rider}, picking up at {pickup}.',
  'dispatch.manual.assignError': "Couldn't assign the captain. Nothing was changed.",
  'dispatch.manual.empty': 'No captain is on shift. Assignment reopens when one comes online.',
  'dispatch.manual.error': "Captains didn't load. Try again, or close this and dispatch from the queue.",
  'dispatch.manual.loading': 'Loading captains',
  'dispatch.manual.title': 'Assign a captain',
  'dispatch.noInterventions': 'Every live trip is within its SLA.',
  'dispatch.reassignCaptain': 'Reassign',
  'dispatch.toast.dispatched': 'Request {id} assigned to captain {name}',
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
