/**
 * Operations › Requests — every operator-facing string, as keys (**AC-74**),
 * with no concatenation anywhere (**AC-75**).
 *
 * `specs/02-work-queues.md` §5. Copy rules from `docs/ref/copy.md`; the shared
 * §4 vocabulary is in `screens/queues/copy.ts` and is not repeated here.
 */

import type { Dictionary } from '@/lib'

export const REQUESTS_EN: Dictionary = {
  /* §8's metadata line (V4) — the mounted view's own record count. */
  'requests.meta.one': '1 request',
  'requests.meta.other': '{count} requests',

  'requests.search': 'Search by rider, pickup, destination or ID',

  /* ── columns ────────────────────────────────────────────────────────── */
  /* **`Ride`, not `Rider`.** The column's subject changed with the cell: the
     row's first line is the route and the rider is its qualifier, because the
     thing an operator is deciding about is the journey. The rider still has a
     name on line two and a link in the sheet. */
  'requests.col.ride': 'Ride',
  'requests.col.type': 'Type',
  'requests.col.pickup': 'Pickup',
  'requests.col.destination': 'Destination',
  'requests.col.requested': 'Requested',
  'requests.col.riderDetail': 'Rider detail',
  'requests.col.plan': 'Plan',
  'requests.col.class': 'Class',
  'requests.col.note': 'Rider note',

  /* §5.1 — two item types on one queue, and **they are not variants of each
     other**. AC-240: each row's type is legible without opening it. */
  'requests.channel.instant': 'Instant',
  'requests.channel.subscription': 'Subscription',

  /* ── status (R7 tones; no red badge, R5a) ───────────────────────────── */
  'requests.status.searching': 'Searching',
  'requests.status.offered': 'Offered',
  'requests.status.assigned': 'Assigned',
  /* Legacy paints this `b-red` on a `--red-lt` row (`:9893`, `:9950`). R5a
     permits neither. The WORD carries it. */
  'requests.status.noDrivers': 'No captain',
  'requests.status.expired': 'Expired',
  'requests.status.cancelled': 'Cancelled',

  /* **AC-246** — a request in the `offered` state offers no assign action and
     states that the offer is with the captain, not with ops. */
  'requests.offered.withCaptain': 'Offered to {name} — waiting for their reply',
  'requests.offered.unnamed': 'Offered to a captain — waiting for their reply',

  'requests.tag.vip': 'VIP',
  /* Legacy `🔁 Existing subscriber` (`:9909`). AC-76 takes the emoji. */
  'requests.tag.subscriber': 'Existing subscriber',
  'requests.rider.newRating': 'No rating yet',
  'requests.rider.rating': 'Rated {rating}',

  'requests.plan.weekly': 'Weekly',
  'requests.plan.biweekly': 'Biweekly',
  'requests.plan.monthly': 'Monthly',
  'requests.class.economy': 'Economy',
  'requests.class.comfort': 'Comfort',

  /* §7.7 — the identity's second line. ONE key with two named placeholders;
     `pickup + ' → ' + destination` is exactly what AC-75 forbids. */
  'requests.route': '{pickup} → {destination}',

  /* ── dispositions (§5.5) ────────────────────────────────────────────── */
  /* `copy.md` 2 — buttons are verbs. They are ONE word each because §7.3's
     width contract gives this lane 192px and a `table-layout: fixed` cell
     truncates rather than growing: `Close — no cap…` on every row is the defect
     the budget exists to prevent. The full act is named in the `title` and
     stated in full in the confirmation, which is where the consequence belongs. */
  'requests.action.assign': 'Assign',
  'requests.action.assign.help': 'Assign a captain to this request',
  'requests.action.expire': 'Close',
  'requests.action.expire.help': 'Close this request with no captain found',
  /* Names the RIDE, because that is what activating the link opens. It read
     `Open the record for {name}` while the cell opened the rider, and a label
     that announces a person and lands on a journey is worse than no label. */
  'requests.a11y.open': 'Open the ride from {pickup} to {destination}',

  'requests.assign.title': 'Assign a captain to {id}?',
  /* §5.1 — **this is the only queue where money moves on disposition.** The
     confirmation says so, and says what does not change. */
  'requests.assign.body.instant':
    'The rider is told a captain is on the way. Nothing is charged until the trip completes.',
  'requests.assign.body.subscription':
    "The rider's authorisation hold is captured and the subscription starts. This cannot be undone from here.",
  'requests.assign.confirm': 'Assign captain',
  'requests.assign.choice': 'Captain',
  'requests.assign.choice.help': 'Active captains only. The rider is told who is coming.',
  'requests.assign.choice.message': 'Choose a captain.',
  'requests.assign.choice.placeholder': 'Choose a captain',
  'requests.assign.choice.empty': 'No active captain is available to assign right now.',

  'requests.expire.title': 'Close {id} with no captain?',
  'requests.expire.body':
    'The rider is told nobody is available. Any authorisation hold is released and nothing is charged.',
  'requests.expire.confirm': 'Close request',

  'requests.decided.assigned': 'Assigned',
  'requests.decided.expired': 'Expired',
  'requests.decided.cancelled': 'Cancelled',


  /* ── the bulk bar (P4-T1, §9.3, D21) ────────────────────────────────── */
  /* §9.3 permits a queue a selection checkbox **only** where every bulk action
     is a claim or an assign, and forbids bulk disposition outright. `Claim` is
     the one command offered, and it is the one an operator working a queue
     reaches for twenty times an hour: take the next ten and start.

     A bulk TAKE-OVER is deliberately absent. AC-203 makes a take-over a
     confirmed act that NAMES the operator losing the item; over a set it would
     strip N owners at once and name none of them, so a row already held is
     BLOCKED rather than silently taken. */
  /* ── 360° reach (P8-T1) ─────────────────────────────────────────────── */
  'requests.a11y.openCaptain': 'Open the 360° profile for {name}',
  /* §11.2 — the id is on the row but the resolver says it names nothing. A
     different fact from "there is no id", with a different next action. */
  'requests.entity.unresolved': 'There is no record on file for this reference.',
  /* The half-sentence that follows the captain's LINK in the decision cell.
     Split from `requests.offered.withCaptain` rather than interpolated around
     an `<a>`: AC-75 forbids assembling a sentence around a component, and a
     translator cannot move a link that is inside a template. The one-name
     version stays for the row that has no captain id to open. */
  'requests.offered.waiting': '— waiting for their reply',

  'requests.bulk.claim': 'Claim',
  'requests.action.claim.blocked.one': 'This request is already claimed, or already decided.',
  'requests.action.claim.blocked.other':
    '{count} of the selected requests are already claimed, or already decided.',
  'requests.action.claim.blocked.all':
    'All {count} selected requests are already claimed, or already decided.',
  'requests.toast.claimed.other': '{count} requests claimed',

  'requests.action.noPermission':
    'You cannot claim a request. Ask an Owner for the “Live dispatch” permission.',

  'requests.toast.assigned': 'Captain assigned',
  'requests.toast.expired': 'Request closed',

  /* ── states (§4.7, §4.11) ───────────────────────────────────────────── */
  /* **E1 — the queue is clear.** Per view, because a queue with one sentence
     for six views tells five of them a half-truth (Q-36, **AC-234**). */
  'requests.empty.cleared.heading': 'Nothing waiting',
  'requests.empty.cleared.needsDecision': 'Every request has a captain or an answer.',
  'requests.empty.cleared.all': 'No ride requests have come in.',
  'requests.empty.cleared.instant': 'No instant ride request is waiting.',
  'requests.empty.cleared.subscription': 'No subscription request is waiting.',
  'requests.empty.cleared.assigned': 'No request has been assigned yet today.',
  'requests.empty.cleared.expired': 'No request has been closed without a captain.',

  /* E3 is unreachable here — work arrives from the system continuously (Q-37) —
     so this collapses into E1 and these strings never render. They stay
     because `DataTable` requires the copy, so an empty state cannot be a TODO. */
  'requests.empty.firstRun.heading': 'Ride requests land here',
  'requests.empty.firstRun.body':
    'Every instant ride and every subscription sign-up waiting on a captain appears in this queue.',
  'requests.empty.firstRun.action': 'Show all requests',

  'requests.empty.noMatch': 'No request matches this search.',

  'requests.banner.one': '1 request is past its deadline.',
  'requests.banner.other': '{count} requests are past their deadline.',

  'requests.error.list': "Couldn't load requests. The filters are unchanged.",
  /* **Row errors are two words plus a verb, and the length is a constraint not
     a style.** R20 fixes the row at one pitch, so an `ErrorState scope="row"`
     that wraps to three lines is clipped rather than grown — the sentence
     disappears into the cell it is meant to explain. The object is already on
     the row; the message names the ACT, and `Try again` names the fix
     (`copy.md` 4). */
  'requests.error.row.claim': "Couldn't claim.",
  'requests.error.row.release': "Couldn't release.",
  'requests.error.row.assign': "Couldn't assign.",
  'requests.error.row.expire': "Couldn't close.",
}
