/**
 * Admin › Policy — every operator-facing string on the four panes.
 *
 * Rules applied (`docs/ref/copy.md`)
 *   1   sentence case throughout; city names are proper nouns and keep theirs.
 *   2   buttons are verbs — `Add city`, `Retire code`, `Revert to inherited`.
 *   4   errors are imperatives naming the fix.
 *   6   no period on a badge or a button; sentences take one.
 *  10   no-data is stated in words, and the two empties are different
 *       sentences: *no code matches these filters* is a filter problem,
 *       *no reason code is defined* is a first-run.
 *
 * **The inheritance vocabulary is load-bearing.** `Inherited` and `Overridden`
 * are the two words the whole F-014 fix rests on, and an inherited cell always
 * states **the number it inherits and where from** — never a blank. A blank
 * input is what legacy could not distinguish from a zero, and `0` is a real
 * first-response target (T1 answers immediately).
 *
 * ## Where these keys live
 *
 * Spread into `EN` in `src/i18n/dictionaries.ts` — one import, one spread — so
 * the screen reads them off the shell translator like every other screen.
 *
 * **Two families have to be there rather than only here.** The `policy.audit.*`
 * keys are emitted by `clients/policy.ts` as `LocalisedText` on every write and
 * are resolved by Admin › Activity with the SHELL translator; and the
 * `policy.sla.tier.*` / `policy.sla.queue.*` keys are `labelKey`s carried on the
 * fixture rows themselves. Neither is reached through this screen, and a raw key
 * on an audit line is the one place a missing string is unrecoverable.
 * `localisedKeys.test.ts` fails the build if either drifts.
 */

import type { Dictionary } from '@/lib'

export const POLICY_EN: Dictionary = {
  /* ── the page ─────────────────────────────────────────────────── */
  'policy.entity': 'Operational policy',
  'policy.meta': 'Dispatch, operating cities, safety limits, reason codes and SLA targets',
  'policy.loading': 'Loading the operational policy',
  'policy.error.read': 'The operational policy did not load.',
  'policy.error.retry': 'Load again',
  'policy.blocked.permission':
    'You cannot change operational policy. Ask an Owner for the “Operational policy” permission.',
  'policy.toast.saved': 'Policy saved',
  'policy.toast.discarded': 'Changes discarded',
  'policy.action.cancel': 'Cancel',
  'policy.save.failed': 'That did not save. Check the fields below and try again.',

  /* ── 1. dispatch ──────────────────────────────────────────────── */
  'policy.dispatch.title': 'Matching and dispatch',
  'policy.dispatch.desc':
    'How far the first search reaches, how long it runs, and the ceiling surge may not pass.',
  'policy.dispatch.radius': 'Initial search radius, metres',
  'policy.dispatch.radius.help': '{value} km.',
  'policy.dispatch.timeout': 'Search phase timeout, seconds',
  'policy.dispatch.timeout.help': 'How long the first search runs before it widens.',
  'policy.dispatch.surge': 'Surge ceiling, percent of base fare',
  'policy.dispatch.surge.help': '250 is a 2.5× ceiling.',

  /* ── 2. cities ────────────────────────────────────────────────── */
  'policy.cities.title': 'Operating cities',
  'policy.cities.desc':
    'Quick rides and subscription packages, switched per city. A switch turned off stops new work; it does not end work already booked.',
  'policy.cities.col.city': 'City',
  'policy.cities.col.quickRides': 'Quick rides',
  'policy.cities.col.subscriptions': 'Subscriptions',
  'policy.cities.col.fleet': 'Active fleet',
  'policy.cities.fleet.value': '{count} captains',
  'policy.cities.fleet.help': 'Read-only. The fleet is measured, not set here.',
  'policy.cities.quickRides.a11y': 'Quick rides in {city}',
  'policy.cities.subscriptions.a11y': 'Subscriptions in {city}',
  'policy.cities.add': 'Add city',
  'policy.cities.add.title': 'Add an operating city',
  'policy.cities.add.desc':
    'The city joins the draft. Nothing changes for riders until you save.',
  'policy.cities.add.nameEn': 'City name (English)',
  'policy.cities.add.nameAr': 'City name (Arabic)',
  'policy.cities.add.confirm': 'Add to draft',
  'policy.cities.add.duplicate': 'That city is already listed.',
  'policy.cities.empty':
    'No city is configured. Add one to start dispatching.',

  /* ── 3. limits ────────────────────────────────────────────────── */
  'policy.limits.title': 'Safety limits',
  'policy.limits.desc': 'Guardrails on driving time, subscription load and rider cancellations.',
  'policy.limits.drivingHours': 'Captain daily driving cap, minutes',
  'policy.limits.drivingHours.help': '{value} hours.',
  'policy.limits.concurrentSubs': 'Concurrent subscriptions per captain',
  'policy.limits.riderCancels': 'Rider daily cancellations',

  /* ── 4a. SLA tier defaults ────────────────────────────────────── */
  'policy.sla.tiers.title': 'SLA tier defaults',
  'policy.sla.tiers.desc':
    'The clock a queue uses when it declares no override of its own. Change one here and every inherited cell below moves with it.',
  'policy.sla.tier.T1': 'Critical',
  'policy.sla.tier.T2': 'High',
  'policy.sla.tier.T3': 'Medium',
  'policy.sla.tier.T4': 'Low',
  'policy.sla.col.tier': 'Tier',
  'policy.sla.col.firstResponse': 'First response',
  'policy.sla.col.resolution': 'Resolution',
  'policy.sla.col.coverage': 'Coverage',
  'policy.sla.col.pause': 'Pause while waiting on the customer',
  'policy.sla.coverage.continuous': 'Around the clock',
  'policy.sla.coverage.business-hours': 'Business hours',
  'policy.sla.pause.a11y': 'Pause the {tier} resolution clock while waiting on the customer',
  'policy.sla.minutes': '{count} min',
  'policy.sla.atRisk': 'At risk at',
  'policy.sla.atRisk.help': 'Percent of the resolution window consumed before a row reads at risk.',
  'policy.sla.uncodedCeiling': 'Uncoded ceiling',
  'policy.sla.uncodedCeiling.help':
    'Percent of contacts on Other before the taxonomy counts as stale.',

  /* ── 4b. the queue × tier grid ────────────────────────────────── */
  'policy.sla.grid.title': 'SLA targets per queue',
  'policy.sla.grid.desc':
    'A queue answers on the tier default unless it overrides it. An overridden target stops following the tier — revert it to put it back.',
  'policy.sla.overrides.count': '{count} of {total} targets overridden',
  /* One per `WorkQueueId` (`data/types/workQueue.ts`). The keys are the
     canonical singular ids, so a queue's SLA row and its work items are named
     the same thing in the type system and in the copy. */
  'policy.sla.queue.request': 'Ride requests',
  'policy.sla.queue.incident': 'Safety and incidents',
  'policy.sla.queue.fairness': 'Captain fairness',
  'policy.sla.queue.assurance': 'Subscription assurance',
  'policy.sla.queue.absence': 'Rider absences',
  'policy.sla.queue.application': 'Captain applications',
  'policy.sla.queue.ticket': 'Support tickets',
  'policy.sla.queue.dispute': 'Disputes',
  'policy.sla.queue.erasure': 'Erasure requests',
  'policy.sla.state.inherited': 'Inherited',
  'policy.sla.state.overridden': 'Overridden',
  'policy.sla.inherited.value': '{count} min from {tier}',
  'policy.sla.override': 'Override',
  'policy.sla.override.a11y': 'Override the {field} target for {queue} at {tier}',
  'policy.sla.revert': 'Revert to inherited',
  'policy.sla.revert.a11y': 'Revert the {field} target for {queue} at {tier} to the tier default',
  'policy.sla.field.firstResponse': 'first response',
  'policy.sla.field.resolution': 'resolution',
  'policy.sla.breach.title': 'When a target is breached',
  'policy.sla.breach.marksRow': 'Mark the row',
  'policy.sla.breach.marksRow.a11y': 'Mark a breached row in the {queue} queue',
  'policy.sla.breach.reordersQueue': 'Sort breached work first',
  'policy.sla.breach.reordersQueue.a11y': 'Sort breached work first in the {queue} queue',
  'policy.sla.breach.escalate': 'Escalate to',
  'policy.sla.breach.escalate.none': 'Nobody',
  'policy.sla.breach.escalate.ops_supervisor': 'Operations supervisor',
  'policy.sla.breach.escalate.finance_lead': 'Finance lead',

  /* ── 5. the reason-code registry ──────────────────────────────── */
  'policy.reasons.title': 'Reason codes',
  'policy.reasons.desc':
    'The closed vocabulary every cancellation, refund, suspension and dispute is coded against. A code is never deleted or renamed — retire it and name what replaced it, because historical records point at the key.',
  'policy.reasons.count': '{active} in use · {retired} retired',
  'policy.reasons.search': 'Search codes and labels',
  'policy.reasons.col.code': 'Code',
  'policy.reasons.col.labelAr': 'Arabic label',
  'policy.reasons.col.surfaces': 'Offered on',
  'policy.reasons.col.tier': 'Tier',
  'policy.reasons.col.note': 'Elaboration',
  'policy.reasons.col.owner': 'Root-cause owner',
  'policy.reasons.col.state': 'State',
  'policy.reasons.owner.unassigned': 'Unassigned',
  'policy.reasons.note.required': 'Required',
  'policy.reasons.note.optional': 'Optional',
  'policy.reasons.state.active': 'In use',
  'policy.reasons.state.retired': 'Retired',
  'policy.reasons.retiredOn': 'Retired {date}',
  'policy.reasons.supersededBy': 'Use {code} instead',
  'policy.reasons.surfaceCount': '{count} surfaces',

  'policy.reasons.surface.trip-cancellation': 'Trip cancellation',
  'policy.reasons.surface.refund': 'Refund',
  'policy.reasons.surface.suspension': 'Suspension',
  'policy.reasons.surface.dispute-outcome': 'Dispute outcome',
  'policy.reasons.surface.wallet-adjustment': 'Wallet adjustment',
  'policy.reasons.surface.payout-deduction': 'Payout deduction',
  'policy.reasons.surface.subscription-freeze': 'Subscription freeze',
  'policy.reasons.surface.ticket': 'Support ticket',

  'policy.reasons.filter.surface': 'Surface',
  'policy.reasons.filter.state': 'State',
  'policy.reasons.filter.any': 'Any',

  'policy.reasons.action.add': 'Add code',
  'policy.reasons.action.edit': 'Edit',
  'policy.reasons.action.retire': 'Retire',
  'policy.reasons.action.restore': 'Put back in use',
  'policy.reasons.retire.blocked.alreadyRetired': 'This code is already retired.',
  'policy.reasons.restore.blocked.inUse': 'This code is already in use.',

  'policy.reasons.empty.heading': 'One word for each way work ends',
  'policy.reasons.empty.body':
    'A reason code is the closed vocabulary operators pick from when they dispose of work. Without one, every disposition is free text nobody can count.',
  'policy.reasons.empty.action': 'Add the first code',
  'policy.reasons.noMatch': 'No code matches these filters.',
  'policy.reasons.noMatch.action': 'Show every code',
  'policy.reasons.error': 'The reason codes did not load.',

  /* the editor */
  'policy.reasons.edit.title': 'Edit {code}',
  'policy.reasons.edit.desc': 'The key is fixed. Historical records point at it.',
  'policy.reasons.new.title': 'Add a reason code',
  'policy.reasons.new.desc':
    'Choose the key carefully — it is never renamed and never reused, even after it is retired.',
  'policy.reasons.field.key': 'Key',
  'policy.reasons.field.key.help': 'Capitals, digits and underscores. For example CAP_NOSHOW.',
  'policy.reasons.field.labelEn': 'Label (English)',
  'policy.reasons.field.labelAr': 'Label (Arabic)',
  'policy.reasons.field.reference': 'Guide reference',
  'policy.reasons.field.reference.help': 'The call-centre guide section, if the guide covers it.',
  'policy.reasons.field.tier': 'Tier',
  'policy.reasons.field.owner': 'Root-cause owner',
  'policy.reasons.field.surfaces': 'Offered on',
  'policy.reasons.field.requiresNote': 'Require a written elaboration',
  'policy.reasons.field.requiresNote.help':
    'The operator must type what happened before the disposition commits.',
  'policy.reasons.save': 'Save code',
  'policy.reasons.create': 'Add code',
  'policy.reasons.toast.created': '{code} added',
  'policy.reasons.toast.saved': '{code} saved',
  'policy.reasons.toast.retired': '{code} retired',
  'policy.reasons.toast.restored': '{code} is back in use',

  /* retirement */
  'policy.reasons.retire.title': 'Retire {code}?',
  'policy.reasons.retire.body':
    'It leaves every picker immediately. Every record already coded with it keeps rendering its label, in both languages, unchanged.',
  'policy.reasons.retire.successor': 'Use this code instead',
  'policy.reasons.retire.successor.none': 'No successor',
  'policy.reasons.retire.confirm': 'Retire code',

  /* ── audit detail, emitted by `clients/policy.ts` ─────────────── */
  'policy.audit.saved': 'Operational policy saved — {count} fields changed: {fields}',
  'policy.audit.codeCreated': 'Reason code {code} added',
  'policy.audit.codeSaved': 'Reason code {code} edited — {count} fields changed: {fields}',
  'policy.audit.codeRetired': 'Reason code {code} retired, superseded by {successor}',
  'policy.audit.codeRestored': 'Reason code {code} put back in use',
}
