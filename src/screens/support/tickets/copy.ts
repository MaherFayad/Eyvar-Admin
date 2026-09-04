/**
 * Support › Tickets — every operator-facing string, as keys (**AC-74**), with
 * no concatenation anywhere (**AC-75**).
 *
 * `TicketDetailScreen` made 26 `t(key, { defaultValue })` calls and
 * `TicketsScreen` a further handful; none of those keys existed in any
 * dictionary (`REMEDIATION-PLAN.md` §4.2). They are here now, which is what
 * makes the module translatable at all.
 *
 * ## The two families that carry the point of the screen
 *
 * **`ticket.sla.*`** — the console had no SLA on it. `slaDueAt`, `slaBreached`
 * and `createdAt` were all on the type and none was rendered, so an SLA console
 * showed no deadline, no breach and no age. The three readings §9.3 permits
 * each have a key here, and `sla.left` / `sla.overdue` / `sla.noClock` come
 * from `lib/sla.ts`'s own `SLA_MESSAGES_EN` rather than being restated.
 *
 * **`ticket.channel.*`** — `types/ticket.ts:59` says an absent `channel` means
 * *"unknown, ask before replying"* and *"never a default channel"*. The
 * composer replied anyway, showing the operator no destination at all. The
 * destination is now named above the box, and where there is none the composer
 * is disabled in place with `ticket.reply.blocked.noChannel` (§11.2).
 */

import type { Dictionary } from '@/lib'

export const TICKETS_EN: Dictionary = {
  /* ── the index ────────────────────────────────────────────────────── */
  /* §8's meta line, in `useQueueMeta`'s shape. */
  'ticket.meta.one': '1 ticket',
  'ticket.meta.other': '{count} tickets',
  'ticket.search': 'Search by ID, subject, requester or reason code',

  'ticket.col.ticket': 'Ticket',
  'ticket.col.subject': 'Subject',
  'ticket.col.requester': 'Requester',
  'ticket.col.category': 'Category',
  'ticket.col.priority': 'Priority',
  'ticket.col.status': 'Status',
  'ticket.col.owner': 'Owner',
  'ticket.col.sla': 'Reply due',
  'ticket.col.opened': 'Opened',
  'ticket.col.reasonCode': 'Reason code',
  'ticket.col.channel': 'Channel',
  /* §7.7: the identity's second line, one key. */
  'ticket.line': '{requester} · {reason}',

  /* ── the queue's promises (AC-211): the pill's accessible description ── */
  'ticket.promise.first-response': 'First-reply deadline',
  'ticket.promise.resolution': 'Resolution deadline',
  'ticket.promise.update': 'Next-update deadline',
  'ticket.promise.paused': 'Waiting on the customer. The resolution clock is paused.',
  'ticket.promise.none': 'The clock stopped when the ticket was decided.',

  /* ── R5a (a): one banner, one count ─────────────────────────────────── */
  'ticket.banner.one': '1 ticket is past a promise.',
  'ticket.banner.other': '{count} tickets are past a promise.',

  /* ── the bulk bar (S-12): claims only ───────────────────────────────── */
  'ticket.bulk.claim': 'Claim selected',
  'ticket.bulk.claim.blocked.one': 'This ticket is already held, or already decided.',
  'ticket.bulk.claim.blocked.other': '{count} of the selected tickets are already held or decided.',
  'ticket.bulk.claim.blocked.all': 'None of the {count} selected tickets can be claimed.',

  /* ── the cleared empties, per view (§4.7) ───────────────────────────── */
  'ticket.empty.cleared.heading': 'Nothing is waiting',
  'ticket.empty.cleared.unassigned': 'Every open ticket has an operator. New ones appear here as they arrive.',
  'ticket.empty.cleared.mine': 'You are not holding any tickets.',
  'ticket.empty.cleared.open': 'No ticket is open.',
  'ticket.empty.cleared.waiting': 'No ticket is waiting on a customer.',
  'ticket.empty.cleared.done': 'No ticket has been decided yet.',
  'ticket.empty.firstRun.action': 'Show decided tickets',

  /* ── row failures (AC-41): the act, and the fix ─────────────────────── */
  'ticket.error.row.claim': "Couldn't claim.",
  'ticket.error.row.release': "Couldn't release.",
  'ticket.error.row.resolve': "Couldn't resolve.",
  'ticket.error.row.reopen': "Couldn't reopen.",
  'ticket.toast.reopened.row': 'Reopened',

  'ticket.status.open': 'Open',
  'ticket.status.in-progress': 'In progress',
  'ticket.status.waiting': 'Waiting on customer',
  'ticket.status.resolved': 'Resolved',
  'ticket.status.closed': 'Closed',

  'ticket.priority.Critical': 'Critical',
  'ticket.priority.High': 'High',
  'ticket.priority.Medium': 'Medium',
  'ticket.priority.Low': 'Low',

  'ticket.owner.unassigned': 'Nobody has taken this',
  'ticket.a11y.open': 'Open ticket {id}',

  'ticket.empty.heading': 'No tickets waiting',
  'ticket.empty.body': 'Inbound customer care tickets and the calls operators log against them arrive here.',
  'ticket.empty.noMatch': 'No tickets match these filters.',
  'ticket.error.read': 'The tickets could not be loaded.',

  /* ── row and page actions · §11.2, disabled in place with a reason ── */
  'ticket.action.claim': 'Claim',
  'ticket.action.claim.blocked.owned': '{name} already owns this ticket.',
  'ticket.action.claim.blocked.closed': 'A closed ticket is not claimed. Reopen it first.',
  'ticket.action.claim.blocked.permission': 'You cannot claim tickets. Ask an Owner for the “Ticket handling” permission.',
  'ticket.action.resolve': 'Resolve',
  'ticket.action.resolve.blocked.done': 'This ticket is already {status}.',
  'ticket.action.resolve.blocked.permission': 'You cannot resolve tickets. Ask an Owner for the “Ticket handling” permission.',
  'ticket.action.open': 'Open',

  /* ── the detail page ──────────────────────────────────────────────── */
  'ticket.detail.meta': '{id} · {requester} · {category}',
  'ticket.detail.back': 'Back to tickets',
  'ticket.detail.notFound': 'That ticket is not on record',
  'ticket.detail.notFoundBody': 'Nothing here answers to {id}. It may have been merged, or the link may be old.',

  'ticket.details': 'Ticket',
  'ticket.field.status': 'Status',
  'ticket.field.priority': 'Priority',
  'ticket.field.reasonCode': 'Reason code',
  'ticket.field.owner': 'Owner',
  'ticket.field.opened': 'Opened',
  'ticket.field.channel': 'Reply goes to',
  'ticket.field.thread': 'Thread',

  /* ── the three promises (S-2) ─────────────────────────────────────── */
  'ticket.sla.heading': 'Promises',
  'ticket.sla.firstReply': 'First reply',
  'ticket.sla.resolution': 'Resolution',
  'ticket.sla.nextUpdate': 'Next update',
  'ticket.sla.due': 'Due {date}',
  'ticket.sla.breached': 'Breached',
  'ticket.sla.breachedDetail': 'This promise was missed. It was due {date}.',
  'ticket.sla.kept': 'Kept',
  'ticket.sla.keptLate': 'Kept late',
  'ticket.sla.met': 'Answered inside the promise.',
  'ticket.sla.paused': 'Waiting on the customer since {date}. The resolution clock is paused.',
  'ticket.sla.stopped': 'The clock stopped when the ticket was {status}.',
  'ticket.sla.age': 'Open {duration}',

  /* ── the lifecycle on the header (S-4, §5.3) ──────────────────────── */
  'ticket.action.blocked.decided': 'This ticket is decided. Reopen it first.',
  'ticket.action.wait': 'Wait on customer',
  'ticket.action.resume': 'Resume',
  'ticket.action.transfer': 'Transfer…',
  'ticket.action.recode': 'Change reason code…',
  'ticket.action.priority': 'Change priority…',
  'ticket.toast.waiting': '{id} is waiting on the customer',
  'ticket.toast.resumed': '{id} is in progress again',
  'ticket.toast.transferred': 'Transferred',
  'ticket.toast.recoded': '{id} re-coded. Its promises were re-derived.',
  'ticket.toast.priority': '{id} priority changed',
  'ticket.toast.failed': '{id} was not updated',

  'ticket.transfer.title': 'Transfer this ticket?',
  'ticket.transfer.body':
    'The operator you choose holds this ticket from the moment you confirm, and there is no undo. Its promises and its thread are unchanged, and your note is posted to the thread for them.',
  'ticket.transfer.confirm': 'Transfer',
  'ticket.transfer.choiceLabel': 'Transfer to',
  'ticket.transfer.choiceHelp': 'Operators who are not active are not listed.',
  'ticket.transfer.choiceMessage': 'Choose an operator.',
  'ticket.transfer.choicePlaceholder': 'Choose an operator',
  'ticket.transfer.blocked.noTargets': 'No other operator is active right now.',
  'ticket.transfer.noteLabel': 'Note for the receiving operator',
  'ticket.transfer.noteHelp': 'Posted to the thread as an internal note. The customer never sees it.',
  'ticket.transfer.noteMessage': 'Write a note for the receiving operator.',

  'ticket.recode.title': 'Change the reason code on {id}?',
  'ticket.recode.body':
    'The priority and all three promises are re-derived from the new code, counted from when the ticket opened. Nothing on the thread changes.',
  'ticket.recode.confirm': 'Change reason code',
  'ticket.recode.choiceLabel': 'Reason code',
  'ticket.recode.choiceHelp': 'The tier beside each code sets its promises.',
  'ticket.recode.choiceMessage': 'Choose a reason code.',
  'ticket.recode.choicePlaceholder': 'Choose a reason code',
  'ticket.recode.choiceEmpty': 'No other reason code is available for tickets.',

  'ticket.priority.title': 'Change the priority on {id}?',
  'ticket.priority.body': 'Priority orders nothing by itself; the promises stay as they are.',
  'ticket.priority.confirm': 'Change priority',
  'ticket.priority.choiceLabel': 'Priority',
  'ticket.priority.choiceHelp': 'The reason code sets the default. This overrides it.',
  'ticket.priority.choiceMessage': 'Choose a priority.',
  'ticket.priority.choicePlaceholder': 'Choose a priority',

  /* ── an internal note on the ticket thread (S-3's first half) ─────── */
  'ticket.thread.internal': 'Internal note',
  'ticket.thread.notSent': 'Not sent to the customer',

  /* ── the channel, and the refusal when there is none ──────────────── */
  'ticket.channel.chat': 'In-app chat',
  'ticket.channel.email': 'Email',
  'ticket.channel.whatsapp': 'WhatsApp',
  'ticket.channel.phone': 'Phone',
  'ticket.channel.unknown': 'Not known',
  'ticket.channel.unknownHelp': 'Nobody has contacted this customer yet, so there is no thread to reply into. Phone them and log the call, or open a channel from their profile first.',

  /* ── the thread ───────────────────────────────────────────────────── */
  'ticket.thread': 'Conversation',
  'ticket.thread.empty.heading': 'Nothing has been said yet',
  'ticket.thread.empty.body': 'This ticket was raised from an operations event. The first message or logged call will appear here.',
  'ticket.thread.from': '{name} · {role}',
  'ticket.thread.role.customer': 'Customer',
  'ticket.thread.role.agent': 'Operator',
  'ticket.thread.role.system': 'System',

  'ticket.call.entry': 'Call logged by {name}',
  'ticket.call.outcome.resolved-on-call': 'Resolved on the call',
  'ticket.call.outcome.escalated': 'Escalated to operations',
  'ticket.call.outcome.waiting-on-customer': 'Waiting on the customer',
  'ticket.call.outcome.no-answer': 'No answer',
  'ticket.call.noNotes': 'No note was left.',

  /* ── the composer ─────────────────────────────────────────────────── */
  'ticket.reply.to': 'Replying by {channel}',
  'ticket.reply.placeholder': 'Write to the customer',
  'ticket.reply.send': 'Send reply',
  'ticket.reply.sending': 'Sending…',
  'ticket.reply.blocked.noChannel': 'This ticket has no reply destination, so there is nowhere to send to.',
  'ticket.reply.blocked.empty': 'Write something before sending.',
  'ticket.reply.blocked.closed': 'A closed ticket does not take replies. Reopen it first.',
  'ticket.reply.blocked.permission': 'You cannot reply to tickets. Ask an Owner for the “Ticket handling” permission.',

  'ticket.requester': 'Requester',
  'ticket.requester.viewProfile': 'Open 360° profile',

  /* ── the log-call modal ───────────────────────────────────────────── */
  'ticket.logCall': 'Log a call',
  'ticket.logCall.blocked.permission': 'You cannot log calls. Ask an Owner for the “Ticket handling” permission.',
  'ticket.logCall.title': 'Log a call on {id}',
  'ticket.logCall.desc': 'Record how the call with {name} ended. It goes on the ticket, not to the customer.',
  'ticket.logCall.outcome': 'How it ended',
  'ticket.logCall.notes': 'What was said, and what happens next',
  'ticket.logCall.notesPlaceholder': 'Explained the surge calculation; agreed a 15 SAR credit',
  'ticket.logCall.willDo.resolved-on-call': 'Logging this resolves the ticket.',
  'ticket.logCall.willDo.escalated': 'Logging this moves the ticket to in progress.',
  'ticket.logCall.willDo.waiting-on-customer': 'Logging this moves the ticket to waiting on customer.',
  'ticket.logCall.willDo.no-answer': 'Logging this leaves the ticket where it is. Nobody was reached.',
  'ticket.logCall.blocked.note': 'Say what was agreed before logging it. Somebody else will read this.',
  'ticket.logCall.confirm': 'Log call',
  'ticket.logCall.saving': 'Saving…',
  'ticket.logCall.cancel': 'Cancel',
  'ticket.logCall.failed': 'The call was not logged. {reason}',

  /* ── toasts ───────────────────────────────────────────────────────── */
  'ticket.toast.claimed': '{id} is yours',
  'ticket.toast.claimFailed': '{id} was not claimed',
  'ticket.toast.replied': 'Sent to {channel}',
  'ticket.toast.replyFailed': 'The reply was not sent',
  /* The undo D18 traded the confirm away for. `commands/tickets.ts` took that
     trade — remove the dialog, the reversal is the net — and this screen never
     adopted the registry, so it got the removal without the net.

     **Its undo copy is NOT duplicated here.** `commands/copy.ts` already owns
     `ticket.toast.resolved.undone.one` and `.undoFailed.one`; declaring a second
     pair shadowed the registry's, which `domains.test.ts` caught by name. One
     vocabulary, owned once. */
  'ticket.toast.resolved': '{id} resolved',
  'ticket.toast.resolveFailed': '{id} was not resolved',
  'ticket.toast.callLogged': 'Call logged on {id}',

  /* ── the call guide, which is data and not copy ───────────────────── */
  'ticket.guide.heading': 'Call guide — {scenario}',
  'ticket.guide.say': 'What to say',
  'ticket.guide.do': 'What to do',
  'ticket.guide.policy': 'Policy {ref}',
}
