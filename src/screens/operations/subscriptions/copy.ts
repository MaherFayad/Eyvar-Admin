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
  'subs.action.unfreeze': 'Resume',
  'subs.action.changeDriver': 'Change captain',
  'subs.action.cancel': 'Cancel and settle',
  'subs.action.noPermission':
    'You cannot change a subscription. Ask an Owner for the “Subscription control” permission.',
  /* D21's three sentences per command. The `.all` leaf is the one a
     hand-written predicate forgets, and it is invisible until an operator
     selects a wholly ineligible set. */
  'subs.action.freeze.blocked.one': 'This subscription is cancelled or expired.',
  'subs.action.freeze.blocked.other':
    '{count} of the selected subscriptions are cancelled or expired.',
  'subs.action.freeze.blocked.all':
    'All {count} selected subscriptions are cancelled or expired.',
  'subs.action.unfreeze.blocked.one': 'This subscription is not on hold.',
  'subs.action.unfreeze.blocked.other': '{count} of the selected subscriptions are not on hold.',
  'subs.action.unfreeze.blocked.all': 'None of the {count} selected subscriptions is on hold.',
  'subs.action.changeDriver.blocked.one': 'This subscription is cancelled or expired.',
  'subs.action.cancel.blocked.one': 'This subscription is already cancelled or expired.',

  /* ── the bulk bar (P4-T1) ───────────────────────────────────────────── */
  'subs.bulk.freeze': 'Freeze',
  'subs.bulk.unfreeze': 'Resume',

  /* ── the freeze form ────────────────────────────────────────────────── */
  'subs.freeze.title.one': 'Freeze {id}?',
  'subs.freeze.title.other': 'Freeze {count} subscriptions?',
  'subs.freeze.body.one':
    'The rider keeps every unused trip and is charged nothing while it is paused. It resumes on its own, and you can cancel the freeze at any time.',
  'subs.freeze.body.other':
    'Each rider keeps every unused trip and is charged nothing while paused. They resume on their own, and you can cancel a freeze at any time.',
  'subs.freeze.duration': 'How long',
  /* The three lines a `ConfirmDialog` host renders around a closed option
     list. The queue and the sheet use `FreezeModal`, which needs the label
     alone; §11.6 still wants the empty and invalid sentences to exist. */
  'subs.freeze.durationHelp': 'The subscription resumes on its own.',
  'subs.freeze.durationPlaceholder': 'Choose a window',
  'subs.freeze.durationMessage': 'Choose how long the hold lasts.',
  'subs.freeze.durationEmpty': 'No freeze window is available.',
  'subs.freeze.reason': 'Reason for the hold',
  'subs.freeze.reasonPlaceholder': 'Rider travel, medical leave, school holiday',
  'subs.freeze.resumeOn': 'Resumes on {date}',
  'subs.freeze.days': '{count} days',
  'subs.freeze.confirm': 'Freeze subscription',
  'subs.freeze.confirm.other': 'Freeze subscriptions',
  'subs.freeze.saveError': 'Couldn’t freeze the subscription. Nothing was changed.',
  'subs.toast.frozen.one': 'Subscription frozen',
  'subs.toast.frozen.other': '{count} subscriptions frozen',
  /* D18's four leaves per reversible command. The undone sentence names the
     record; the failed one states what is still true, as a fact. */
  'subs.toast.frozen.undone.one': '{id} is running again',
  'subs.toast.frozen.undone.other': '{count} subscriptions are running again',
  'subs.toast.frozen.undoFailed.one': '{id} is still on hold',
  'subs.toast.frozen.undoFailed.other': '{count} subscriptions are still on hold',
  'subs.toast.resumed.one': 'Subscription resumed',
  'subs.toast.resumed.other': '{count} subscriptions resumed',
  'subs.toast.resumed.undone.one': '{id} is on hold again',
  'subs.toast.resumed.undone.other': '{count} subscriptions are on hold again',
  'subs.toast.resumed.undoFailed.one': '{id} is still running',
  'subs.toast.resumed.undoFailed.other': '{count} subscriptions are still running',

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
  /* X14 — the qualifier takes the product's own separator, never an em dash. */
  'subs.toast.cancelled': 'Subscription cancelled · {amount} refunded',
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
  /* X18 — an empty title is at most 5 words and a body 12, in one sentence. */
  'subs.empty.firstRun.heading': 'Standing journeys land here',
  'subs.empty.firstRun.body':
    'A journey booked on a schedule appears here with its captain.',
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
  /* X18 — an empty body is one sentence of at most 12 words. */
  'sub.changeDriver.empty': 'No other captain is active right now.',
  'sub.currentDriver': 'Current captain',
  /* O9 — the absence is why the operator opened Change captain. */
  'sub.noDriver': 'No captain assigned',
  'sub.plan': 'Plan',
  'sub.progress': 'Trips completed',
  'sub.selectDriver': 'New captain',
  'sub.selectDriverLoading': 'Loading captains',
  'sub.selectDriverPlaceholder': 'Choose a captain',
  /* §11.2 — the client's three 422s, at render. An ineligible captain is
     listed and disabled with the sentence, never hidden from the picker. */
  'sub.candidate.same': 'Already the captain on this subscription.',
  'sub.candidate.unavailable': 'This captain is not active.',
  'sub.candidate.belowPlan': 'Their vehicle is below the plan’s tier.',
  /* X14 / AC-75 — one key, named placeholders, the product's own separator. The
     second is O9: an unrated captain drops the clause rather than printing a
     mark for a rating nobody has given. */
  'sub.driverOption': '{name} · {city} · {rating} · {active}/{max} subs',
  'sub.driverOption.unrated': '{name} · {city} · {active}/{max} subs',
  'sub.confirmChange': 'Reassign captain',
  'sub.reassigning': 'Reassigning…',
  'sub.changeDriver.reason': 'Reason for the change',
  'sub.changeDriver.reasonPlaceholder': 'What the rider was told, and who approved it',
  'subs.toast.reassigned': 'Captain changed to {name}',
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
