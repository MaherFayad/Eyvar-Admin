/**
 * Operations › Trip Assurance — every operator-facing string, as keys
 * (**AC-74**), with no concatenation anywhere (**AC-75**).
 *
 * `specs/02-work-queues.md` §6. The shared §4 vocabulary is in
 * `screens/queues/copy.ts` and is not repeated here.
 */

import type { Dictionary } from '@/lib'

export const ASSURANCE_EN: Dictionary = {
  'assurance.meta.legs.one': '1 leg',
  'assurance.meta.legs.other': '{count} legs',
  'assurance.meta.absences.one': '1 absence',
  'assurance.meta.absences.other': '{count} absences',

  'assurance.search.legs': 'Search by rider, captain, route or subscription',
  'assurance.search.absences': 'Search by captain or subscription',

  /* ── columns ────────────────────────────────────────────────────────── */
  'assurance.col.leg': 'Leg',
  'assurance.col.departs': 'Departs',
  'assurance.col.backup': 'Backup captain',
  'assurance.col.confirmation': 'Confirmation',
  'assurance.col.nearby': 'Nearby',
  'assurance.col.occurred': 'Missed',
  'assurance.col.tier': 'Strike',
  'assurance.col.forfeited': 'Forfeited (SAR)',
  'assurance.col.subscription': 'Subscription',

  /* §7.7 — the identity's second line, as ONE key. */
  'assurance.leg.line': '{time} · {captain}',
  'assurance.leg.noCaptain': '{time} · no captain assigned',
  'assurance.a11y.open': 'Open the record for {name}',

  /* ── §6.4 item 1 · the readiness ladder is a REASON, not a severity ──── */
  /* **Q-58 / AC-263.** Legacy renders a `critical` leg with a red row
     background regardless of how far away departure is (`:8703` has no time
     condition). Under Q-22 that background does not ship: the reason goes in a
     column and the lateness goes in the countdown. These are the six values. */
  'assurance.reason.captainUnavailable': 'Captain unavailable',
  'assurance.reason.captainNotMoving': 'Captain not en route',
  'assurance.reason.riderUnconfirmed': 'Rider not confirmed',
  'assurance.reason.awaitingConfirmation': 'Awaiting confirmation',
  'assurance.reason.noBackup': 'No eligible backup',
  'assurance.reason.onTrack': 'On track',

  /* ── captain departure state (R7 tones) ─────────────────────────────── */
  'assurance.captain.moving': 'On the way',
  'assurance.captain.notStarted': 'Not started',
  'assurance.captain.unavailable': 'Unavailable',

  /* ── §6.4 item 3 · the confirmation source is load-bearing ──────────── */
  /* **AC-268** — a leg recorded as `assumed` by an operator must be visually
     AND textually distinct from one the captain confirmed in the app. Three
     acknowledgement weights that all look like a tick is `07.3`'s finding, and
     the answer is three different words and three different tones. */
  'assurance.ack.none': 'Not confirmed',
  'assurance.ack.app': 'Confirmed in app',
  'assurance.ack.phone': 'Attested by phone',
  'assurance.ack.whatsapp': 'Attested on WhatsApp',
  /* `ACK_SOURCE` (`:18135`): *"Not a confirmation. Use only when the leg must
     proceed and somebody has decided to carry the risk."* The word says so. */
  'assurance.ack.assumed': 'Assumed — not confirmed',
  'assurance.ack.by': '{source} · {name}',
  'assurance.ack.handedOff': 'Handed to backup',

  /* ── backup coverage ────────────────────────────────────────────────── */
  /* **AC-265** — a registered backup who fails eligibility is NOT coverage,
     and the row states the reason by name. This is the gap `renderCoverage`
     calls the only number that matters (`:17517`). */
  'assurance.backup.none': 'Nobody registered',
  'assurance.backup.eligible': '{name} — eligible',
  'assurance.backup.ineligible': '{name} — {reason}',
  'assurance.backup.offered': 'Offered to {name}',
  'assurance.backup.nearby.one': '1 captain nearby',
  'assurance.backup.nearby.other': '{count} captains nearby',
  'assurance.backup.nearby.none': 'Nobody nearby',

  /* ── dispositions (§6.4) ────────────────────────────────────────────── */
  'assurance.action.confirm': 'Confirm',
  'assurance.action.confirm.help': 'Record the captain’s confirmation for this leg',
  'assurance.action.offerBackup': 'Hand over',
  'assurance.action.offerBackup.help': 'Offer this leg to a backup captain',

  'assurance.confirm.title': 'Record confirmation for {id}?',
  'assurance.confirm.body':
    'The leg is marked confirmed and leaves the confirmation queue. The captain is not notified from here.',
  'assurance.confirm.commit': 'Record confirmation',
  'assurance.confirm.choice': 'How was it confirmed?',
  'assurance.confirm.choice.help':
    'The source is on the record. “Assumed” is not a confirmation — it is a risk somebody accepted.',
  'assurance.confirm.choice.message': 'Choose how this was confirmed.',
  'assurance.confirm.choice.placeholder': 'Choose a source',
  'assurance.confirm.choice.empty': 'No confirmation source is available.',
  'assurance.confirm.reason': 'Who is carrying the risk?',
  'assurance.confirm.reason.help':
    'Required for “Assumed”. Name the person who decided this leg proceeds unconfirmed.',
  'assurance.confirm.reason.message': 'Say who is carrying the risk.',

  'assurance.offer.title': 'Hand {id} to a backup captain?',
  'assurance.offer.body':
    'The backup has 20 minutes to answer. The leg is not covered until they do, and the primary captain keeps the leg until then.',
  'assurance.offer.commit': 'Send the offer',
  'assurance.offer.choice': 'Backup captain',
  'assurance.offer.choice.help': 'Active captains only.',
  'assurance.offer.choice.message': 'Choose a backup captain.',
  'assurance.offer.choice.placeholder': 'Choose a captain',
  'assurance.offer.choice.empty': 'No active captain is available to take this leg.',

  'assurance.toast.confirmed': 'Confirmation recorded',
  'assurance.toast.offered': 'Offer sent',

  /* ── absences (§6.4 item 6) ─────────────────────────────────────────── */
  'assurance.absence.tier': 'Strike {tier} of 3',
  'assurance.absence.counting': 'Counting',
  'assurance.absence.waived': 'Waived',
  'assurance.absence.decayed': 'Aged out',
  'assurance.absence.terminated': 'Plan terminated',
  'assurance.absence.frozen': 'Frozen {days} days',
  'assurance.action.waive': 'Waive',
  'assurance.action.waive.help': 'Waive this strike, with a reason on the record',
  'assurance.waive.title': 'Waive this strike against {name}?',
  'assurance.waive.body':
    'The strike stays in the ledger and stops counting towards the next tier. The forfeited earnings are not returned from here.',
  'assurance.waive.confirm': 'Waive strike',
  'assurance.waive.reason': 'Why this strike is waived',
  'assurance.waive.reason.help': 'The captain reads this. Name what changed the decision.',
  'assurance.waive.reason.message': 'Enter a reason.',
  'assurance.toast.waived': 'Strike waived',

  /* ── states (§4.7) ──────────────────────────────────────────────────── */
  'assurance.empty.cleared.heading': 'Nothing at risk',
  'assurance.empty.cleared.departing': 'Every leg departing in the next 24 hours is on track.',
  'assurance.empty.cleared.noBackup': 'Every plan has a backup captain who would actually be sent.',
  'assurance.empty.cleared.awaiting': 'Every leg has a confirmation.',
  /* **The healthy state, and it is not a missing fixture.** An empty strike
     ledger means nobody has missed a committed leg. */
  'assurance.empty.cleared.absences': 'No captain has missed a committed leg.',
  'assurance.empty.cleared.all': 'No subscription leg needs attention.',

  'assurance.empty.firstRun.heading': 'Tomorrow’s subscription trips land here',
  'assurance.empty.firstRun.body':
    'Every leg departing soon, every plan without a backup captain and every unconfirmed commitment appears in this queue.',
  'assurance.empty.firstRun.action': 'Show every leg',

  'assurance.empty.noMatch': 'No leg matches this search.',
  'assurance.empty.noMatch.absences': 'No absence matches this search.',

  'assurance.banner.one': '1 leg is past its deadline.',
  'assurance.banner.other': '{count} legs are past their deadline.',

  'assurance.error.list': "Couldn't load Trip Assurance. The filters are unchanged.",
  'assurance.error.absences': "Couldn't load the strike ledger. The filters are unchanged.",
  /* **Row errors are two words plus a verb, and the length is a constraint not
     a style.** R20 fixes the row at one pitch, so an `ErrorState scope="row"`
     that wraps to three lines is clipped rather than grown — the sentence
     disappears into the cell it is meant to explain. The object is already on
     the row; the message names the ACT, and `Try again` names the fix
     (`copy.md` 4). */
  'assurance.error.row.claim': "Couldn't claim.",
  'assurance.error.row.release': "Couldn't release.",
  'assurance.error.row.confirm': "Couldn't confirm.",
  'assurance.error.row.offer': "Couldn't send.",
  'assurance.error.row.waive': "Couldn't waive.",
}
