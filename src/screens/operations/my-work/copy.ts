/**
 * Operations › My Work — every operator-facing string, as keys (**AC-74**),
 * with no concatenation anywhere (**AC-75**).
 *
 * `specs/02-work-queues.md` §7. The shared §4 vocabulary is in
 * `screens/queues/copy.ts` and is not repeated here.
 */

import type { Dictionary } from '@/lib'

export const MY_WORK_EN: Dictionary = {
  /* A plural family, chosen by `Intl.PluralRules` rather than by the screen.
     `count === 1 ? … : …` has two branches and Arabic needs six. */
  'myWork.meta#one': '1 item',
  'myWork.meta#other': '{count} items',
  /* **X3 / O8 / X15** — the header line counts the BACKLOG, so it agrees with
     the rail badge and disagrees with the mounted view. That surprise is what
     this sentence answers, and it is asked for rather than read. */
  'myWork.meta.hint': 'Yours and unclaimed, in every queue. The table counts this view.',

  'myWork.search': 'Search by subject, ID or queue',

  'myWork.col.item': 'Item',

  /* **X2 / T4.1 — the row's own words.** `clients/myWork.ts` used to build
     `Captain application — {name}` and print enum slugs; it now hands a key and
     its values, and every enum member resolves through the key the owning
     screen already ships (`fairness.kind.*`, `safety.type.*`, `people.class.*`,
     `dispute.kind.*`). Nothing below concatenates (AC-75).

     **Line one is the identity and nothing else** — the person, the trip, the
     record's own id. The kind, the reason and the record's own prose are line
     two. Line one used to lead with the kind and, on two queues, WAS the prose:
     an incident summary and a ticket subject wanted 593px and 666px of a 208px
     column, and a name-led row wanted 402px. An identity fits; a sentence never
     will, at any width. */
  /** The source record's own words: a subject line, a case detail. Data, not copy. */
  'myWork.item.text': '{text}',

  'myWork.item.application': '{name}',
  'myWork.item.application.sub': 'Captain application · {vehicleClass} · {documents} awaiting verification',
  'myWork.item.application.sub.clear': 'Captain application · {vehicleClass} · every document verified',

  'myWork.item.request.instant': '{pickup} → {destination}',
  'myWork.item.request.subscription': '{rider}',
  'myWork.item.request.instant.sub': 'Ride request · {rider} · {vehicleClass}',
  'myWork.item.request.instant.sub.noCaptain': 'Ride request · {rider} · no captain found',
  'myWork.item.request.subscription.sub': 'Subscription request · {vehicleClass}',
  'myWork.item.request.subscription.sub.noCaptain':
    'Subscription request · {vehicleClass} · no captain found',

  'myWork.item.assurance': '{subscription}',
  'myWork.item.assurance.sub.uncovered': 'Leg uncovered · {rider} · {plan}',
  'myWork.item.assurance.sub.unconfirmed': 'Unconfirmed leg · {rider} · {captain}',
  'myWork.item.assurance.sub.unconfirmed.noCaptain':
    'Unconfirmed leg · {rider} · no captain assigned',

  'myWork.item.incident': '{type} · {id}',

  'myWork.item.fairness': '{captain}',
  'myWork.item.fairness.sub': '{kind} · {text}',

  'myWork.item.ticket': '{id} · {entity}',
  'myWork.item.ticket.sub': '{category} · {subject}',

  'myWork.item.dispute': '{claimant}',
  'myWork.item.dispute.sub': '{kind} · against {name}',
  'myWork.item.dispute.sub.platform': '{kind} · against Eyvar',

  'myWork.a11y.open': 'Open {title}',
  'myWork.action.open': 'Open',
  'myWork.action.open.help': 'Open this item in the queue that owns it',

  /* **AC-280** — every row states which queue it came from, **in words**. Nine
     labels, one per `WorkQueueId`, because a projection that does not name its
     source is a list of rows an operator cannot act on (Q-40). */
  'myWork.queue.request': 'Requests',
  'myWork.queue.assurance': 'Trip Assurance',
  'myWork.queue.absence': 'Absences',
  'myWork.queue.incident': 'Safety & Incidents',
  'myWork.queue.fairness': 'Captain Fairness',
  'myWork.queue.application': 'Applications',
  'myWork.queue.ticket': 'Tickets',
  'myWork.queue.dispute': 'Disputes',
  'myWork.queue.erasure': 'Data & Integrity',

  /* R4-10 — severity is a LABEL. `critical` and `high` share one tone because
     R7 closes the palette at five and R5a permits no red badge; the WORD is
     what separates them, and the CLOCK is what orders them. */
  'myWork.severity.critical': 'Critical',
  'myWork.severity.high': 'High',
  'myWork.severity.normal': 'Normal',

  /* §7.4 **F-12** — `WORK_ROUTING` routes eleven of twelve queues to
     `'Operations'`, which is not in `TEAM_ROLES`, so **an Ops Manager sees an
     empty inbox**. Corrected in `types/work.ts`; this is the copy that makes the
     filter visible and reversible (Q-62, **AC-286**). */
  /* The chip renders `{label}: {value}`, so the label is the DIMENSION and the
     two values are the answers. Naming both the same produced
     `Routed to your role: Routed to your role`. */
  'myWork.routing.chip': 'Queue routing',
  'myWork.routing.clear': 'Show every queue',
  'myWork.routing.yes': 'Your role',
  'myWork.routing.no': 'Other roles',

  /* §7.2 — **My Work never decides anything.** It claims, releases and routes.
     `Decide`, `Approve`, `Advance` and `Cover it` (`:19138`–`:19211`) all become
     `Open`, and the decision happens where the context is (**AC-281**). */

  /* ── the bulk bar (P4-T1, §9.3, D21) ────────────────────────────────── */
  /* §9.3 permits a queue a selection checkbox **only** where every bulk action
     is a claim or an assign, and forbids bulk disposition outright. `Claim` is
     the one command offered, and it is the one an operator working a queue
     reaches for twenty times an hour: take the next ten and start.

     A bulk TAKE-OVER is deliberately absent. AC-203 makes a take-over a
     confirmed act that NAMES the operator losing the item; over a set it would
     strip N owners at once and name none of them, so a row already held is
     BLOCKED rather than silently taken. */
  'myWork.bulk.claim': 'Claim',
  'myWork.action.claim.blocked.one':
    'This item is already claimed, or its queue is not connected yet.',
  'myWork.action.claim.blocked.other':
    '{count} of the selected items are already claimed, or their queue is not connected yet.',
  'myWork.action.claim.blocked.all':
    'All {count} selected items are already claimed, or their queue is not connected yet.',
  'myWork.toast.claimed#one': '1 item claimed',
  'myWork.toast.claimed#other': '{count} items claimed',

  'myWork.claim.unavailable': 'Claim this from {queue}. It is not built yet.',

  /* ── states (§4.7, §7.5) ────────────────────────────────────────────── */
  'myWork.empty.cleared.heading': 'Nothing owed',
  'myWork.empty.cleared.mine': 'You are holding nothing. Unassigned has work waiting to be picked up.',
  'myWork.empty.cleared.unassigned': 'Every open item across the queues has somebody working it.',
  'myWork.empty.cleared.everything': 'Every queue is clear.',

  /* §7.5 `routed-to-zero` — **not E1 and not E2.** It names the filter, and it
     offers to switch routing off **in place** (**AC-287**). Legacy shows this
     message even when routing is off, where it is simply false (`:19290`). */
  'myWork.empty.routed': 'Nothing is open in the queues routed to your role.',
  /* X15 - the second sentence the one-line budget dropped. */
  'myWork.routed.hint': 'Other queues may still have work.',

  'myWork.empty.firstRun.heading': 'Your work, across every queue',
  'myWork.empty.firstRun.body':
    'Anything you hold or nobody has picked up, sorted by deadline.',
  'myWork.empty.firstRun.action': 'Show every queue',
  /* X15 - the scope and the sort order the shortened body dropped. */
  'myWork.firstRun.hint':
    'It spans every queue from Requests to Safety, ordered by deadline rather than by label.',

  'myWork.empty.noMatch': 'No item matches this search.',

  'myWork.banner.one': '1 item you can see is past its deadline.',
  'myWork.banner.other': '{count} items you can see are past their deadline.',

  'myWork.error.list': "Couldn't load your work. The filters are unchanged.",
  /* **Row errors are two words plus a verb, and the length is a constraint not
     a style.** R20 fixes the row at one pitch, so an `ErrorState scope="row"`
     that wraps to three lines is clipped rather than grown — the sentence
     disappears into the cell it is meant to explain. The object is already on
     the row; the message names the ACT, and `Try again` names the fix
     (`copy.md` 4). */
  'myWork.error.row.claim': "Couldn't claim.",
  'myWork.error.row.release': "Couldn't release.",
}
