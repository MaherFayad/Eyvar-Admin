/**
 * Operations › Trips — every operator-facing string, as keys (**AC-74**), with
 * no concatenation anywhere (**AC-75**).
 *
 * **This screen is not registered in `src/i18n/dictionaries.ts` yet**, and that
 * file has a single owner. Until it is, `withFallback` (`../localCopy`) resolves
 * these keys against this dictionary, so the strings live here — one place, in
 * a shape a translator can be handed — rather than as two hundred
 * `defaultValue` literals inside JSX. Registration is one import and one spread
 * in `dictionaries.ts`; nothing in the screen changes.
 *
 * Requested of the shell owner:
 *
 * ```ts
 * import { TRIPS_EN } from '@/screens/operations/trips/copy'
 * // ...and `...TRIPS_EN` in the English assembly.
 * ```
 */

import type { Dictionary } from '@/lib'

export const TRIPS_EN: Dictionary = {
  /* §8's metadata line — the mounted view's own record count. Two keys, never
     a plural engine: Arabic has six categories and a half-built engine is worse
     than an explicit choice. */
  'trips.meta.one': '1 trip',
  'trips.meta.other': '{count} trips',

  'trips.search': 'Search by trip id, rider, captain or place',

  /* ── columns ────────────────────────────────────────────────────────── */
  'trips.col.id': 'Trip',
  'trips.col.kind': 'Kind',
  'trips.col.rider': 'Rider',
  'trips.col.captain': 'Captain',
  'trips.col.route': 'Route',
  'trips.col.status': 'Status',
  'trips.col.fare': 'Fare',
  'trips.col.rating': 'Rating',
  'trips.col.started': 'Started',
  'trips.col.ended': 'Ended',
  'trips.col.subscription': 'Subscription',
  'trips.col.payment': 'Payment',
  'trips.col.distance': 'Distance',
  'trips.col.duration': 'Duration',

  /* O9 — the fare of a trip still under way. A cancelled trip renders blank,
     and a no-show that charged a fee names the fee it charged. */
  'trips.fare.notSettled': 'Not settled',
  'trips.fare.noShowFee': 'No-show fee',

  /* §7.7 — line 2 qualifies line 1. ONE key with two named placeholders;
     `pickup + ' → ' + destination` is exactly what AC-75 forbids. */
  'trips.route': '{pickup} → {destination}',

  'trips.kind.subscription': 'Subscription',
  'trips.kind.quickRide': 'Quick ride',

  /* R7 tones, and **no red badge** (R5a). `no-show` and `cancelled` are
     neutral; the WORD carries them. */
  'trips.status.requested': 'Requested',
  'trips.status.assigned': 'Assigned',
  'trips.status.en-route': 'En route',
  'trips.status.in-trip': 'In trip',
  'trips.status.done': 'Done',
  'trips.status.late': 'Late',
  'trips.status.cancelled': 'Cancelled',
  'trips.status.no-show': 'No-show',
  'trips.late.minutes': 'Late by {count} min',

  'trips.flagged': 'Flagged',
  'trips.rating.value': '{rating} of 5',

  /* ── 360° reach (P8-T1) ─────────────────────────────────────────────── */
  'trips.open.trip': 'Open the 360° profile for trip {id}',
  'trips.open.rider': 'Open the 360° profile for {name}',
  'trips.open.captain': 'Open the 360° profile for {name}',
  'trips.open.subscription': 'Open the 360° profile for subscription {id}',
  /* The payment column reused the SUBSCRIPTION key, so a screen reader
     announced "Open the 360° profile for subscription PAY-5510" — a
     payment id described as a subscription. Sighted operators never saw it;
     the visible text is the id itself. */
  'trips.open.payment': 'Open the 360° profile for payment {id}',
  /* §11.2 — a name whose entity cannot be resolved is PLAIN TEXT with the
     reason available, never a dead link. */
  'trips.captain.none': 'No captain',
  'trips.captain.none.reason': 'This trip was cancelled before a captain accepted it.',
  /* §11.2 — the OTHER reason a name is text rather than a link: the id is on
     the row, but the resolver says it names nothing this console can open.
     A different fact from "there is no id", and a different next action —
     report the reference, rather than wait for one to be assigned. */
  'trips.entity.unresolved': 'There is no record on file for this reference.',

  /* ── row actions (§7.8) ─────────────────────────────────────────────── */
  'trips.action.view': 'Telemetry',
  'trips.action.view.help': 'Open the full trip record and its fare breakdown',
  'trips.action.flag': 'Flag',
  'trips.action.unflag': 'Remove flag',
  'trips.action.noPermission':
    'You cannot flag a trip. Ask an Owner for the “Live dispatch” permission.',

  /* **D21 — three sentences, not two.** `.other` on a 3-of-3 selection is true
     AND misleading: it invites the operator to deselect a few and try again
     when there is nothing to deselect to. Which sentence appears changes what
     they do next, which is the whole argument for the third key. */
  'trips.action.flag.blocked.one': 'This trip is already flagged.',
  'trips.action.flag.blocked.other': '{count} of the selected trips are already flagged.',
  'trips.action.flag.blocked.all': 'All {count} selected trips are already flagged.',
  'trips.action.unflag.blocked.one': 'This trip is not flagged.',
  'trips.action.unflag.blocked.other': '{count} of the selected trips are not flagged.',
  'trips.action.unflag.blocked.all': 'None of the {count} selected trips is flagged.',

  /* ── the bulk bar (P4-T1) ───────────────────────────────────────────── */
  /* §13.4 — the inverted strip takes the compact form. */
  'trips.bulk.flag': 'Flag',
  'trips.bulk.unflag': 'Remove flag',
  /* The bulk bar shares the row menu's three refusal sentences above (D21);
     it does not mint a fourth. `Select only the N eligible` is `DataTable`'s
     own control, rendered from `eligibleIds`, and its copy is the shell's. */

  /* ── the flag form (§10.4 — validated in the modal, not as a 422) ───── */
  'trips.flag.title.one': 'Flag trip {id} for investigation?',
  'trips.flag.title.other': 'Flag {count} trips for investigation?',
  'trips.flag.body.one':
    'The trip stays completed and nothing is refunded. Ops review picks it up from the Flagged view.',
  'trips.flag.body.other':
    'The trips stay completed and nothing is refunded. Ops review picks them up from the Flagged view.',
  'trips.flag.category': 'Category',
  'trips.flag.categoryPlaceholder': 'Choose a category',
  'trips.flag.note': 'Investigation note',
  'trips.flag.notePlaceholder': 'What should the reviewer look at first?',
  'trips.flag.confirm': 'Flag trip',
  'trips.flag.confirm.other': 'Flag trips',
  'trips.flag.saveError': 'Couldn’t flag the trip. Nothing was changed.',
  'trips.reason.fareDispute': 'Fare or toll dispute',
  'trips.reason.routeDeviation': 'Significant route deviation',
  'trips.reason.speedViolation': 'Speed or reckless driving alert',
  'trips.reason.safetyIncident': 'Safety or conduct incident',
  'trips.reason.unusualPairing': 'Suspicious pairing',

  'trips.toast.flagged.one': 'Trip flagged',
  'trips.toast.flagged.other': '{count} trips flagged',
  'trips.toast.unflagged.one': 'Flag removed',
  'trips.toast.unflagged.other': 'Flag removed from {count} trips',
  'trips.error.flag': 'Couldn’t flag the trip. Nothing was changed.',
  'trips.error.unflag': 'Couldn’t remove the flag. Nothing was changed.',

  /* ── the trip record (drawer) ───────────────────────────────────────── */
  'trips.drawer.title': 'Trip {id}',
  'trips.drawer.pickup': 'Pickup',
  'trips.drawer.destination': 'Destination',
  'trips.drawer.people': 'Rider and captain',
  'trips.drawer.timing': 'Timing',
  'trips.drawer.fare': 'Fare and commission',
  'trips.drawer.quality': 'Quality and review',
  'trips.drawer.links': 'Related records',
  'trips.drawer.totalFare': 'Total fare',
  'trips.drawer.driverEarnings': 'Captain payout',
  'trips.drawer.platformCut': 'Platform fee',
  'trips.drawer.extraStopFee': 'Extra stop fee',
  'trips.drawer.tip': 'Tip',
  'trips.drawer.km': '{km} km',
  'trips.drawer.minutes': '{minutes} min',
  /* **AC-49's spirit on a fare breakdown: the lines must add up to the total,
     and when they do not the pane says so rather than leaving the operator to
     do the arithmetic.** `extraStopFeeHalalas` was missing from this pane, so
     on a trip with an extra stop the four visible lines did not reconcile. */
  'trips.drawer.reconcileWarning':
    'These lines do not add up to the total fare. The difference is {amount}.',
  'trips.drawer.stateDesynced': 'The rider app never acknowledged the last state change.',
  'trips.drawer.notRated': 'Not rated',
  'trips.drawer.inProgress': 'In progress',
  'trips.drawer.noRoute': 'No route was recorded',
  'trips.drawer.error': 'Couldn’t load this trip.',
  'trips.drawer.notFound': 'Trip {id} is not on file.',
  'trips.drawer.close': 'Close',

  /* ── states (§11.1, §11.5) ──────────────────────────────────────────── */
  /* X18 — an empty title is at most 5 words and a body 12, in one sentence. */
  'trips.empty.firstRun.heading': 'Every journey lands here',
  'trips.empty.firstRun.body':
    'A leg or a quick ride appears here once it starts.',
  'trips.empty.firstRun.action': 'Show every trip',
  'trips.empty.noMatch': 'No trip matches this search.',
  'trips.error.list': 'Couldn’t load trips. The filters are unchanged.',
}
