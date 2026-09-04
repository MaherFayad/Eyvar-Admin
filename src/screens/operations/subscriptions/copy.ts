/**
 * Operations › Subscriptions — every operator-facing string, as keys
 * (**AC-74**), with no concatenation anywhere (**AC-75**).
 *
 * **Not registered in `src/i18n/dictionaries.ts` yet**, and that file has a
 * single owner. `withFallback` (`../localCopy`) resolves these against this
 * dictionary meanwhile, so the copy lives in one reviewable place rather than
 * as `defaultValue` literals scattered through JSX. Registration is one import
 * and one spread; nothing in the screen changes.
 *
 * ```ts
 * import { SUBSCRIPTIONS_EN } from '@/screens/operations/subscriptions/copy'
 * ```
 */

import type { Dictionary } from '@/lib'

export const SUBSCRIPTIONS_EN: Dictionary = {
  'subs.meta.one': '1 subscription',
  'subs.meta.other': '{count} subscriptions',

  'subs.search': 'Search by subscription id, rider, captain or plan',

  /* ── columns ────────────────────────────────────────────────────────── */
  'subs.col.id': 'Subscription',
  'subs.col.rider': 'Rider',
  'subs.col.captain': 'Captain',
  'subs.col.status': 'Status',
  'subs.col.trips': 'Trips',
  'subs.col.paid': 'Paid',
  'subs.col.ends': 'Ends',
  'subs.col.starts': 'Starts',
  'subs.col.plan': 'Plan',
  'subs.col.class': 'Vehicle class',
  'subs.col.escrow': 'Escrow held',
  'subs.col.renewal': 'Renewal likelihood',
  'subs.col.frozenUntil': 'Frozen until',
  'subs.col.refunded': 'Refunded',

  /* §7.7 — line 2 qualifies line 1. One key, two named placeholders. */
  'subs.identity.secondary': '{plan} · {trips}',
  'subs.trips.ratio': '{completed} of {included}',
  'subs.renewal.percent': '{percent}%',
  /* §8.3.1 — `null` renewal likelihood is a KNOWN fact (no renewal history),
     not an absent value, so it reads in words. */
  'subs.renewal.none': 'No history yet',

  'subs.status.active': 'Active',
  'subs.status.expiring': 'Expiring',
  'subs.status.at-risk': 'At risk',
  'subs.status.frozen': 'Frozen',
  'subs.status.cancelled': 'Cancelled',
  'subs.status.expired': 'Expired',

  'subs.plan.weekly': 'Weekly',
  'subs.plan.biweekly': 'Biweekly',
  'subs.plan.monthly': 'Monthly',

  /* ── 360° reach (P8-T1) ─────────────────────────────────────────────── */
  'subs.open.subscription': 'Open the 360° profile for subscription {id}',
  'subs.open.rider': 'Open the 360° profile for {name}',
  'subs.open.captain': 'Open the 360° profile for {name}',
  'subs.captain.none': 'Unassigned',
  'subs.captain.none.reason': 'No captain has been assigned to this subscription yet.',
  /* §11.2 — the OTHER reason a name is text rather than a link: the id is on
     the row, but the resolver says it names nothing this console can open.
     A different fact from "there is no id", and a different next action —
     report the reference, rather than wait for one to be assigned. */
  'subs.entity.unresolved': 'There is no record on file for this reference.',

  /* ── row actions (§7.8) ─────────────────────────────────────────────── */
  'subs.action.view': 'Open',
  'subs.action.freeze': 'Freeze',
  'subs.action.changeDriver': 'Change captain',
  'subs.action.cancel': 'Cancel and settle',
  'subs.action.noPermission':
    'You cannot change a subscription. Ask an Owner for the “Subscription control” permission.',
  /* **The one control on this screen with no write behind it.** §11.2 says a
     blocked control is disabled in place with a stated reason, never hidden, so
     it renders and says this rather than quietly reassigning nothing. */
  'subs.action.changeDriver.unavailable':
    'Reassigning a captain is not connected yet. Nothing would be saved.',
  'subs.action.freeze.blocked.one': 'This subscription is cancelled or expired.',
  'subs.action.cancel.blocked.one': 'This subscription is already cancelled or expired.',

  /* ── the bulk bar (P4-T1) ───────────────────────────────────────────── */
  'subs.bulk.freeze': 'Freeze',
  /* **The set rule.** Refused if ANY selected record would be refused on its
     own row, naming how many of how many AND why. No partial application. */
  'subs.bulk.freeze.blocked':
    '{count} of {total} selected subscriptions cannot be frozen — they are cancelled or expired.',

  /* ── the freeze form ────────────────────────────────────────────────── */
  'subs.freeze.title.one': 'Freeze {id}?',
  'subs.freeze.title.other': 'Freeze {count} subscriptions?',
  'subs.freeze.body.one':
    'The rider keeps every unused trip and is charged nothing while it is paused. It resumes on its own, and you can cancel the freeze at any time.',
  'subs.freeze.body.other':
    'Each rider keeps every unused trip and is charged nothing while paused. They resume on their own, and you can cancel a freeze at any time.',
  'subs.freeze.duration': 'How long',
  'subs.freeze.reason': 'Reason for the hold',
  'subs.freeze.reasonPlaceholder': 'Rider travel, medical leave, school holiday',
  'subs.freeze.resumeOn': 'Resumes on {date}',
  'subs.freeze.days': '{count} days',
  'subs.freeze.confirm': 'Freeze subscription',
  'subs.freeze.confirm.other': 'Freeze subscriptions',
  'subs.freeze.saveError': 'Couldn’t freeze the subscription. Nothing was changed.',
  'subs.toast.frozen.one': 'Subscription frozen',
  'subs.toast.frozen.other': '{count} subscriptions frozen',

  /* ── the cancel and settle form ─────────────────────────────────────── */
  'subs.settle.title': 'Cancel and settle {id}?',
  'subs.settle.body':
    'The subscription ends now and the rider keeps nothing unused. The refund is calculated and paid by Finance, and this cannot be undone from here.',
  'subs.settle.reason': 'Termination reason',
  'subs.settle.note': 'Internal note',
  'subs.settle.notePlaceholder': 'Who approved this, and on what grounds',
  'subs.settle.paid': 'Paid for the package',
  'subs.settle.tripsRatio': 'Completed of total',
  'subs.settle.unused': 'Unused trips',
  /* **The word `Estimated` is load-bearing.** This figure is computed in the
     browser from `paidHalalas / tripsIncluded × unused`; the SETTLEMENT is
     computed by the server and returned on `cancelSubscription`. The two can
     disagree, and the label used to read `Calculated refund`, which claims an
     authority the number does not have. Reported to product-owner: the server's
     figure should be quoted before the operator commits, not after. */
  'subs.settle.estimate': 'Estimated refund',
  'subs.settle.estimateHelp':
    'An estimate from the unused trips. Finance calculates the settlement when the cancellation is confirmed.',
  'subs.settle.confirm': 'Cancel subscription',
  'subs.settle.saveError': 'Couldn’t cancel the subscription. Nothing was changed.',
  'subs.toast.cancelled': 'Subscription cancelled — {amount} refunded',
  'subs.reason.noDriver': 'No replacement captain available',
  'subs.reason.serviceFailure': 'Service failure or repeated missed trips',
  'subs.reason.relocated': 'Rider moved outside the service zone',
  'subs.reason.vehicleBreakdown': 'Vehicle breakdown or long maintenance',
  'subs.reason.riderViolation': 'Rider policy violation',

  /* ── the subscription record (drawer) ───────────────────────────────── */
  'subs.drawer.plan': 'Plan and term',
  'subs.drawer.people': 'Rider and captain',
  'subs.drawer.money': 'Money',
  'subs.drawer.outcome': 'How it ended',
  'subs.drawer.escrow': 'Escrow held',
  'subs.drawer.escrow.none': 'No hold',
  'subs.drawer.refunded': 'Refunded',
  'subs.drawer.cancelledAt': 'Cancelled',
  'subs.drawer.cancelReason': 'Reason given',
  'subs.drawer.error': 'Couldn’t load this subscription.',
  'subs.drawer.notFound': 'Subscription {id} is not on file.',

  /* ── states (§11.1, §11.5) ──────────────────────────────────────────── */
  'subs.empty.firstRun.heading': 'Standing journeys, and the captain committed to each one',
  'subs.empty.firstRun.body':
    'A rider who books the same journey on a schedule appears here, with the captain committed to it and the trips still owed.',
  'subs.empty.firstRun.action': 'Show every subscription',
  'subs.empty.noMatch': 'No subscription matches this search.',
  'subs.error.list': 'Couldn’t load subscriptions. The filters are unchanged.',

  /* ── change-captain dialog (P4) ─────────────────────────────────────
     These fourteen strings were `t(key, { defaultValue })` inside the JSX,
     in Title Case, with `Reassigning...` on the busy label. Relocated here
     and rewritten to `copy.md`: sentence case, `…` not `...`, and the
     option line is ONE key with five named placeholders rather than six
     JSX fragments a translator cannot reorder (AC-75). */
  'sub.changeDriver.title': 'Change the assigned captain',
  'sub.changeDriver.desc': 'Reassign subscription {id} ({rider}) to another qualified captain.',
  'sub.changeDriver.saveError': 'Couldn’t reassign the captain. Nothing was changed.',
  'sub.changeDriver.error':
    'Captains didn’t load. Try again, or close this and reassign from the captain’s profile.',
  'sub.changeDriver.empty':
    'No other captain is active right now. Reassignment reopens when one comes online.',
  'sub.currentDriver': 'Current captain',
  /* O9 — the absence is why the operator opened Change captain. */
  'sub.noDriver': 'No captain assigned',
  'sub.plan': 'Plan',
  'sub.progress': 'Trips completed',
  'sub.selectDriver': 'New captain',
  'sub.selectDriverLoading': 'Loading captains',
  'sub.selectDriverPlaceholder': 'Choose an active captain',
  'sub.driverOption': '{name} — {city} · {rating} · {active}/{max} subs',
  'sub.confirmChange': 'Reassign captain',
  'sub.reassigning': 'Reassigning…',
  'action.cancel': 'Cancel',

  /* §7.4.5 — the settle dialog's reason select used its own LABEL as the
     placeholder, so the field read `Termination reason` twice. */
  'subs.settle.reasonPlaceholder': 'Choose a reason',

  /* Moved out of JSX `defaultValue` literals, 2026-09-02. A `defaultValue`
     resolves as a third fallback the missing-key guard never sees
     (`lib/i18n/translate.ts:98`), so these strings were invisible to an
     extractor AND to the copy tests -- an unaudited copy surface, not just
     an untranslatable one. */
}
