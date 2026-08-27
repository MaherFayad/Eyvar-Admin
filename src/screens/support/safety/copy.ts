/**
 * Support › Safety & Incidents — every operator-facing string, as keys
 * (**AC-74**), with no concatenation anywhere (**AC-75**).
 *
 * `specs/02-work-queues.md` §8. The shared §4 vocabulary is in
 * `screens/queues/copy.ts` and is not repeated here.
 *
 * **Q-54 bites hardest here.** Legacy renders `🆘 CRITICAL` (`:13429`) inside a
 * `b-red` badge on a `--red-lt` row. All three go: the emoji under **AC-76**,
 * the red badge under **R5a**, and the row tint under **Q-22**. What is left is
 * the word `Critical`, which is R17's principle and R4-10's ruling — *"the
 * label carries the distinction; the row marker carries the escalation; the
 * clock carries the order."*
 */

import type { Dictionary } from '@/lib'

export const SAFETY_EN: Dictionary = {
  'safety.meta.one': '1 incident',
  'safety.meta.other': '{count} incidents',

  'safety.search': 'Search by summary, reporter, trip or ID',

  'safety.col.incident': 'Incident',
  'safety.col.protocol': 'Protocol',
  'safety.a11y.open': 'Open incident {id}',

  /* §7.7 — the identity's second line: what happened, and to which trip. ONE
     key per shape; never a fragment joined to a value. */
  'safety.line.withTrip': '{type} · {trip}',
  'safety.line.noTrip': '{type} · no trip on record',
  /* **AC-323 / F-14** — two of three seeded incidents reference trip ids that
     are not in `DB.trips`, so one of the two reachable `Open trip` buttons
     produces an error toast instead of a record. The row says so and offers no
     link, rather than offering one that breaks. */
  'safety.line.unresolvableTrip': '{type} · {trip} is not on record',

  /* §8.3 — a CLOSED set. Legacy `inc.type` is free text rendered verbatim
     (`:13432`), which cannot be filtered, counted or translated. */
  'safety.type.sos': 'SOS',
  'safety.type.accident': 'Accident',
  'safety.type.harassment': 'Harassment',
  'safety.type.unsafeDriving': 'Unsafe driving',
  'safety.type.theft': 'Theft',
  'safety.type.other': 'Other',

  /* R4-10 — three levels, three WORDS. `critical` and `high` share the
     `warning` tone because R7 closes the palette at five and R5a permits no red
     badge; the resolution moves into the label, the row marker and the clock. */
  'safety.severity.critical': 'Critical',
  'safety.severity.high': 'High',
  'safety.severity.normal': 'Normal',

  /* **Q-11 / AC-303** — two clocks, one running at a time, and **the STATUS
     badge says which promise it is**. The countdown pill gains no new variant. */
  'safety.status.unacknowledged': 'Unacknowledged',
  'safety.status.acknowledged': 'Acknowledged',
  'safety.status.closed': 'Closed',
  'safety.promise.acknowledge': 'Acknowledgement deadline',
  'safety.promise.resolve': 'Resolution deadline',

  /* §8.6 — `INC_STEPS` (`:13394`), in order. */
  'safety.step.contact': 'Contact',
  'safety.step.verify': 'Verify',
  'safety.step.act': 'Act',
  'safety.step.document': 'Document',
  'safety.step.a11y': '{step} — {incident}',
  'safety.step.countLabel': '{done} of {total} protocol steps complete',
  /* **Q-69 / AC-315** — order is enforced for `document` only, and it is
     enforced at RENDER (Q-25), so the operator meets the rule and not a 422. */
  'safety.step.documentBlocked': 'Contact, verify and act have to be complete first.',
  'safety.step.closed': 'A closed incident’s protocol is read-only.',

  'safety.action.close': 'Close',
  'safety.action.close.help': 'Close this incident',
  /* **AC-308** — disabled while any step is outstanding, and it says how many. */
  'safety.action.close.blocked': '{count} protocol steps are still outstanding.',
  'safety.action.close.blockedOne': '1 protocol step is still outstanding.',
  'safety.close.title': 'Close {id}?',
  'safety.close.body':
    'The incident leaves the open queue and its protocol becomes read-only. The record stays, and nothing about the captain or the rider changes.',
  'safety.close.confirm': 'Close incident',
  'safety.toast.closed': 'Incident closed',
  'safety.toast.step': 'Protocol updated',

  'safety.decided.closed': 'Closed',

  /* ── states (§4.7) ──────────────────────────────────────────────────── */
  /* **AC-324** — the two are different screens, and this is the ONE queue where
     both are reachable (Q-37). */
  'safety.empty.cleared.heading': 'Nothing open',
  'safety.empty.cleared.open': 'Every incident has been worked and closed.',
  'safety.empty.cleared.critical': 'No critical incident is open.',
  'safety.empty.cleared.closed': 'No incident has been closed yet.',

  /* E3 — before the first incident is ever reported. The heading names what the
     section is FOR, never the absence of data. */
  'safety.empty.firstRun.heading': 'Safety incidents land here',
  'safety.empty.firstRun.body':
    'An SOS from a moving car, a collision, a report against a captain or a rider — each one is claimed by a named person and worked through four steps.',
  'safety.empty.firstRun.action': 'Show every incident',

  'safety.empty.noMatch': 'No incident matches this search.',

  'safety.banner.one': '1 incident is past its deadline.',
  'safety.banner.other': '{count} incidents are past their deadline.',

  'safety.error.list': "Couldn't load incidents. The filters are unchanged.",
  /* **Row errors are two words plus a verb, and the length is a constraint not
     a style.** R20 fixes the row at one pitch, so an `ErrorState scope="row"`
     that wraps to three lines is clipped rather than grown — the sentence
     disappears into the cell it is meant to explain. The object is already on
     the row; the message names the ACT, and `Try again` names the fix
     (`copy.md` 4). */
  'safety.error.row.claim': "Couldn't claim.",
  'safety.error.row.release': "Couldn't release.",
  'safety.error.row.step': "Couldn't update the step.",
  'safety.error.row.close': "Couldn't close.",
}
