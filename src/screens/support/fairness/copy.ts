/**
 * Support › Captain Fairness — every operator-facing string, as keys
 * (**AC-74**), with no concatenation anywhere (**AC-75**).
 *
 * `specs/02-work-queues.md` §9. The shared §4 vocabulary is in
 * `screens/queues/copy.ts` and is not repeated here.
 *
 * §9.1: *"It is the only queue that exists to be **lost**."* Its own legacy
 * empty state says so — *"A high overturn rate on this page is not a failure —
 * it means the appeal route is doing its job and catching bad calls before they
 * cost you a captain"* (`:15677`) — and every string below is written to be
 * read that way. Nothing here calls an overturn a defect.
 */

import type { Dictionary } from '@/lib'

export const FAIRNESS_EN: Dictionary = {
  'fairness.meta.one': '1 case',
  'fairness.meta.other': '{count} cases',

  'fairness.search': 'Search by captain, rider, trip or ID',

  'fairness.col.captain': 'Captain',
  'fairness.col.rating': 'Disputed rating',
  'fairness.col.suspension': 'Suspension reason',
  'fairness.col.rider': 'Rider',
  'fairness.col.kind': 'Case',
  'fairness.a11y.open': 'Open the record for {name}',

  /* §7.7 — the identity's second line: what the captain is contesting. */
  'fairness.line': '{reason} · {id}',

  'fairness.kind.suspensionAppeal': 'Suspension appeal',
  'fairness.kind.ratingDispute': 'Rating dispute',
  'fairness.kind.riderReport': 'Rider report',

  /* §9.1 — **the only queue whose SLA target lives on the row.** Every case
     carries a reason code and the reason code carries the target: a rating
     dispute has 48 hours, a suspension appeal 24 (**AC-330**). */
  'fairness.reason.DRV_SUSPENSION_APPEAL': 'Appealing a suspension',
  'fairness.reason.DRV_RATING_DISPUTE': 'Disputing a rating',
  'fairness.reason.DRV_RIDER_NOSHOW': 'Rider no-show',
  'fairness.reason.DRV_RIDER_CONDUCT': 'Rider conduct',
  'fairness.reason.DRV_VEHICLE_DAMAGE': 'Vehicle damage',
  'fairness.reason.DRV_DEDUCTION_DISPUTE': 'Disputing a deduction',

  'fairness.status.open': 'Open',
  'fairness.status.upheld': 'Upheld',
  'fairness.status.overturned': 'Overturned',
  'fairness.status.withdrawn': 'Withdrawn',

  /* **AC-337** — the number the captain is contesting must be on the row.
     Legacy stores `disputedRating` and never renders it (`10a` §16.6). */
  'fairness.rating.value': '{rating} of 5',
  'fairness.rating.none': 'No rating on this case',
  /* **Q-77 / AC-334** — *"an overturned rating is always voided; the average is
     recomputed only when it can be."* The row states which of the two happened,
     **in words**. The in-code rationale is right and must survive: *"a seeded
     average with no denominator cannot be un-averaged — inventing one produces
     impossible results (removing a 2★ from 4.5 over an assumed n=2 yields
     7★)"* (`:15598`). This is the model for every derived-value honesty problem
     in the product. */
  'fairness.rating.recomputed': '{rating} of 5 · average recomputed',
  'fairness.rating.voidedOnly': '{rating} of 5 · score voided, average unchanged',

  'fairness.suspension.none': 'No reason on record',
  /* A decided row states when it was decided; the deadline column is for work still owed. */
  'fairness.decided.on': 'Decided {date}',

  /* ── dispositions (§9.6) ────────────────────────────────────────────── */
  'fairness.action.uphold': 'Uphold',
  'fairness.action.uphold.help': 'The original decision stands',
  'fairness.action.overturn': 'Overturn',
  'fairness.action.overturn.help': 'Reverse the original decision',

  'fairness.uphold.title': 'Uphold the decision against {name}?',
  'fairness.uphold.body':
    'The original decision stands and your reason goes on the captain’s record. It cannot be changed from here.',
  'fairness.uphold.confirm': 'Uphold',
  'fairness.overturn.title': 'Overturn the decision against {name}?',
  'fairness.overturn.body':
    'The original decision is reversed and your reason goes on the captain’s record. It cannot be changed from here.',
  'fairness.overturn.confirm': 'Overturn',
  /* **AC-333 / D-1** — required on both dispositions. Legacy initialises
     `rationale` and never writes it (`:15513`), so **every decided case in the
     legacy app is unexplained** — while its own confirmation copy argues that
     appeal legitimacy depends on a recorded reason. The mock enforces it with a
     422; §10.4 says the modal gets there first. */
  'fairness.rationale': 'Why',
  'fairness.rationale.help': 'The captain reads this. Say what decided it.',
  'fairness.rationale.message': 'Enter a reason the captain can read.',

  /* ── the record (S-8) ──────────────────────────────────────────────── */
  'fairness.detail.back': 'Back to cases',
  'fairness.detail.notFound': 'That case is not on record',
  'fairness.detail.notFoundBody': 'Nothing here answers to {id}. The link may be old.',
  'fairness.detail.contested': 'What the captain contests',
  'fairness.detail.decision': 'Decision',
  'fairness.detail.noRationale': 'No reason was recorded.',
  'fairness.detail.reinstated': 'Reinstated',
  'fairness.detail.trip': 'Trip',
  'fairness.detail.decidedInTime': 'Decided inside its window.',
  'fairness.detail.parties': 'Parties',
  'fairness.detail.captain': 'Captain {name}',
  'fairness.detail.rider': 'Rider {name}',
  'fairness.decided.blocked': 'This case is decided. A decision is not reversed from here.',

  'fairness.toast.upheld': 'Case upheld',
  'fairness.toast.overturned': 'Case overturned',

  /* ── §9.5 · captain economics, the read-only view ───────────────────── */
  /* **AC-340, AC-341.** Three rules bind and all of them are about honesty. The
     board itself carries no caption field for any of them (`caption: null` on
     both fairness metrics), so the scope limits are stated here, above it. */
  'fairness.economics.title': 'What this number does and does not measure',
  'fairness.economics.upperBound':
    'An engaged hour is time on trip. Waiting time needs captain-app telemetry this console does not receive, so every figure here is an upper bound.',
  'fairness.economics.tips': 'Earnings include tips.',
  /* **Q-80**, open with the Finance lead. It ships labelled as what it
     computes, which is not the same number as total earnings over total hours:
     a captain with one 5-minute trip weighs as much as one with 400 (**F-23**). */
  'fairness.economics.fleetAverage':
    'The fleet average is a mean of per-captain rates, not total earnings divided by total hours.',
  'fairness.economics.noAction':
    'Nothing on this view is a queue: no case, no deadline and no decision.',

  /* ── states (§4.7) ──────────────────────────────────────────────────── */
  /* **AC-343** — each case view can be dispositioned to zero and each names
     that view's scope. §9.1's own sentence is the tone to keep. */
  'fairness.empty.cleared.heading': 'Nothing to answer',
  'fairness.empty.cleared.appeals': 'No captain is waiting on a suspension appeal.',
  'fairness.empty.cleared.disputes': 'No rating is under dispute.',
  'fairness.empty.cleared.reports': 'No rider report is waiting on a decision.',

  'fairness.empty.firstRun.heading': 'The route back for a captain',
  'fairness.empty.firstRun.body':
    'A suspension appealed, a rating disputed, a rider reported. A high overturn rate here is not a failure — it means the appeal route is catching bad calls before they cost you a captain.',
  'fairness.empty.firstRun.action': 'Show captain economics',

  'fairness.empty.noMatch': 'No case matches this search.',

  'fairness.banner.one': '1 case is past its deadline.',
  'fairness.banner.other': '{count} cases are past their deadline.',

  'fairness.error.list': "Couldn't load fairness cases. The filters are unchanged.",
  'fairness.error.board': "Couldn't load captain economics.",
  /* **Row errors are two words plus a verb, and the length is a constraint not
     a style.** R20 fixes the row at one pitch, so an `ErrorState scope="row"`
     that wraps to three lines is clipped rather than grown — the sentence
     disappears into the cell it is meant to explain. The object is already on
     the row; the message names the ACT, and `Try again` names the fix
     (`copy.md` 4). */
  'fairness.error.row.claim': "Couldn't claim.",
  'fairness.error.row.release': "Couldn't release.",
  'fairness.error.row.decide': "Couldn't save the decision.",
}
