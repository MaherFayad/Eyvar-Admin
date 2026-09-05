/**
 * Support › Contact Centre — the inbox's own strings (design 12 §12). Every
 * `conversations.*`, `view.conversations.*` and `queue.*` key is reused
 * unchanged from the console and the queues; only what the three-pane shape
 * adds lives here. Sentence case, verbs on buttons, no em dash (X14, R6).
 */

import type { Dictionary } from '@/lib'

export const INBOX_EN: Dictionary = {
  /* pane A */
  'inbox.search': 'Search by name, ID or message',
  'inbox.search.clear': 'Clear search',
  'inbox.folders.label': 'Folders',
  'inbox.folders.show': 'Show folders',
  'inbox.folders.hide': 'Hide folders',
  'inbox.folders.collapsed': '{folder} · {count}',
  'inbox.list.label': 'Conversations',
  'inbox.list.end': 'That’s every conversation in this folder.',
  'inbox.row.yours': 'Yours',
  'inbox.row.select': 'Select the conversation with {name}',
  'inbox.row.age': 'Last message {age}',

  /* pane B */
  'inbox.thread.label': 'Conversation with {name}',
  'inbox.thread.noSelection': 'Select a conversation to read it.',
  'inbox.thread.today': 'Today',
  'inbox.thread.yesterday': 'Yesterday',
  'inbox.thread.you': '{name} (you)',
  'inbox.thread.sentAt': 'Sent at {time}',
  'inbox.thread.new#one': '1 new',
  'inbox.thread.new#other': '{count} new',
  'inbox.thread.new.label': 'Scroll to the newest message',
  'inbox.thread.system': '{body} · {time}',
  'inbox.header.more': 'More actions',
  'inbox.header.back': 'Back to conversations',
  'inbox.header.details': 'Details',
  'inbox.bulk.clear': 'Clear selection',

  /* the composer, AC-CC-11: six carriers, none colour alone */
  'inbox.composer.label': 'Reply to {name}',
  'inbox.composer.tab.verb': 'Reply to',
  'inbox.composer.consequence.reply': 'Sent to {name} by {channel}',
  'inbox.composer.consequence.note': 'Internal note. Not sent to the customer.',
  'inbox.composer.placeholder.reply': 'Write a reply to {name}…',
  'inbox.composer.placeholder.note': 'Write an internal note…',
  'inbox.composer.keys.reply': 'Enter sends to {name} · Shift + Enter adds a line',
  'inbox.composer.keys.note': 'Enter adds an internal note · Shift + Enter adds a line',
  'inbox.composer.announce.reply': 'Reply. Sends to {name}.',
  'inbox.composer.announce.note': 'Internal note. Not sent to the customer.',

  /* pane C */
  'inbox.rail.show': 'Show details',
  'inbox.rail.hide': 'Hide details',
  'inbox.rail.elsewhere': 'Elsewhere in the console',
  'inbox.rail.error': 'This card did not load. Try again.',
  'inbox.rail.history.empty': 'No claims or transfers yet.',
  'inbox.customer.open': 'Open profile',
  'inbox.customer.plan': 'Plan',
  'inbox.customer.city': 'City',
}

/**
 * The `conversations.*` keys the console minted and the inbox still reads:
 * the thread, the composer's refusals and delivery words, the header actions
 * and their dialogs, the promise rows, the empty and error sentences, the
 * folder names' cleared bodies. Moved whole in Phase D; the names are kept.
 */
export const CONVERSATIONS_EN: Dictionary = {
  /* ── §8's meta line ─────────────────────────────────────────────────── */


  /* ── the views (D19) ────────────────────────────────────────────────── */
  /* **Declared here, not in the route table.** `routeTable.ts:696` gives this
     sub-tab `views: []`, and D19 names six. That file has a single owner, so
     the screen supplies the list and reports the divergence rather than editing
     it — the same way `SafetyScreen` reports its own. */
  'view.conversations.unassigned': 'Unassigned',
  'view.conversations.mine': 'Mine',
  'view.conversations.waiting': 'Waiting',
  'view.conversations.active': 'Active',
  'view.conversations.snoozed': 'Snoozed',
  'view.conversations.closed': 'Closed',

  /* ── the row ────────────────────────────────────────────────────────── */
  'conversations.a11y.unread': '{count} unread',

  /* **AC-937** — `CNV-107` has no messages at all. It renders the entity and
     the countdown and says so, rather than leaving a blank second line that
     reads as a rendering bug. */
  'conversations.preview.none': 'No messages yet',
  /* A chat and a WhatsApp thread have no subject; the preview stands in for one
     (D19). This key exists so the ABSENCE of a subject is never rendered as an
     empty string. */

  /* ── channels (D19) ─────────────────────────────────────────────────── */
  'conversations.channel.chat': 'Chat',
  'conversations.channel.email': 'Email',
  'conversations.channel.whatsapp': 'WhatsApp',
  'conversations.channel.phone': 'Phone',

  /* ── statuses · R7's five tones, no sixth ───────────────────────────── */
  'conversations.status.waiting': 'Waiting',
  'conversations.status.active': 'Active',
  'conversations.status.snoozed': 'Snoozed',
  'conversations.status.closed': 'Closed',

  /* ── the two promises (D22) ─────────────────────────────────────────── */
  /* **AC-211** — one countdown per row, and the STATUS badge says which promise
     is running. These are the countdown's accessible descriptions, in the shape
     Safety already uses. */
  'conversations.promise.firstResponse': 'First-response deadline',
  'conversations.promise.resolution': 'Resolution deadline',
  'conversations.promise.paused': 'Snoozed — both clocks are paused.',

  /* **R5a (a)** — one page banner stating the count, never one per row. It
     counts FIRST-RESPONSE breaches only; a resolution breach is a conversion
     prompt, not a backlog (D22, **AC-964**). */

  /* ── grab · release · take-over · transfer (D19) ────────────────────── */
  /* **Grab is a claim and it does not confirm** — D18 buys a reversible act out
     of the dialog. The verb is `Claim`, from `queue.claim`, because a chat
     queue is a queue and a second word for one act is how two screens disagree. */
  'conversations.transfer': 'Transfer',
  'conversations.transfer.title': 'Transfer this conversation?',
  /* Rule 9 — what will NOT change, and the fact that nothing walks it back. */
  'conversations.transfer.body':
    'The operator you choose owns this conversation from the moment you confirm, and there is no undo. The thread, the waiting time and the customer are unchanged, and a note naming both of you is posted into the thread.',
  'conversations.transfer.confirm': 'Transfer',
  'conversations.transfer.choiceLabel': 'Transfer to',
  'conversations.transfer.choiceHelp': 'Operators who are signed out are not listed.',
  'conversations.transfer.choiceMessage': 'Choose an operator.',
  'conversations.transfer.choicePlaceholder': 'Choose an operator',
  'conversations.transfer.choiceEmpty': 'No other operator is online or away right now.',
  'conversations.transfer.away': 'Away',
  'conversations.transfer.online': 'Online',
  'conversations.transfer.noteLabel': 'Note for the receiving operator',
  'conversations.transfer.noteHelp':
    'Posted into the thread as an internal note. The customer never sees it.',
  'conversations.transfer.noteMessage': 'Write a note for the receiving operator.',
  'conversations.toast.transferred': 'Transferred',

  /* **AC-942** — refused, with the reason naming their state. */
  'conversations.transfer.refused.offline': '{name} is signed out and cannot receive a transfer.',

  /* ── the cap (D22 · §11.2) ──────────────────────────────────────────── */
  /* **AC-967** — the reason NAMES THE NUMBER. Not "you are at your limit", not
     "too many chats": the operator has to know what to release to. */
  'conversations.cap.reached': 'You are holding {count} live chats, which is the limit.',

  /* ── availability (D19 · P5-T6) ─────────────────────────────────────── */
  /* **D19** — going offline does not release claims. Stated where the operator
     makes the choice, because the alternative is discovering it by losing work. */

  /* the conversation pane */
  /* **AC-938** — `messageCount`, never `messages.length`. */
  'conversations.thread.count.one': '1 message',
  'conversations.thread.count.other': '{count} messages',
  'conversations.thread.loadEarlier': 'Load earlier messages',
  /* R5-11 — three different absences may not wear the same sentence. This is a
     conversation that is new; `conversations.empty.*` is a queue with nothing
     in it. They are different facts. */
  'conversations.thread.empty': 'No messages yet.',
  'conversations.thread.error': 'Couldn’t load this conversation.',
  'conversations.thread.retry': 'Try again',
  'conversations.thread.internal': 'Internal note',
  /* §8.6.2 — this line lives in the note's HEADER and never in the delivery
     position, where it would sit two messages from `Not delivered — …`, at the
     same size, opening on the same word, meaning the opposite thing (delta D-1). */
  'conversations.thread.notSent': 'Not sent to the customer',
  'conversations.thread.attachment': '{filename} · {size}',
  /* §8.6.5 — named only where it differs from the message above it. */
  'conversations.thread.sentBy': 'Sent by {channel}',
  /* §8.6.7 — always on a failed message, never on a delivered one. */
  'conversations.thread.sendAgain': 'Send again',
  'conversations.thread.addEmail': 'Add an email address',

  /* the rail (§2.2 — status, summary and metadata only) */
  'conversations.rail.customer': 'Customer',
  'conversations.rail.thisConversation': 'This conversation',
  'conversations.rail.history': 'History',
  'conversations.rail.snoozed': 'Snoozed until {time}',
  'conversations.rail.opened': 'Opened {date}',
  'conversations.rail.claimed': 'Claimed by {name} {date}',
  'conversations.rail.handover': '{from} handed this to {to} {date}',
  /* §3.5 — the header primary on a closed conversation. `clients/conversations.ts`
     has `close` and nothing that reverses it, so it renders disabled in place. */
  'conversations.reopen': 'Reopen',

  /* Delivery — the five states, in words. A tick that only exists in colour is
     a tick a greyscale screen cannot read (§7.5). */
  'conversations.delivery.queued': 'Queued',
  'conversations.delivery.sent': 'Sent',
  'conversations.delivery.delivered': 'Delivered',
  'conversations.delivery.read': 'Read',
  'conversations.delivery.failed': 'Not delivered',
  'conversations.delivery.failedReason': 'Not delivered — {reason}',

  /* ── the ticket link (D19) ──────────────────────────────────────────── */
  'conversations.ticket.open': 'Open {id}',
  'conversations.ticket.create': 'Create ticket',
  /* §11.2 — disabled in place, with the reason. `createTicketForConversation`
     now exists and writes both sides of the link, so the missing piece is no
     longer an operation: it is the **form**. The mutation requires a category, a
     reason code and a priority, §6.4 carries no row for the conversion form that
     would collect them, and `ConfirmDialog` offers one `choice`, not three.
     Inventing the form here would be inventing a design. Raised to
     product-designer with the three options; the sentence stays operator-facing
     and says nothing about a schema. */
  'conversations.ticket.create.unavailable':
    'A ticket can only be raised about a rider, a captain or a corporate account.',
  'conversations.toast.ticketCreated': '{id} raised from this conversation',
  'conversations.ticket.linked': 'This conversation is the thread of {id}.',
  /* **AC-964** — the twenty-minute prompt, in words, with no escalation implied. */
  'conversations.ticket.overdue':
    'This has run past its resolution deadline. A conversation this long belongs in a ticket.',

  /* the composer — §8.6, final copy from `11-conversation-composer.md` §5.
     F-R5-1 is CLOSED. The two placeholder keys this block replaces
     (`composer.blocked`, `composer.blockedBody`) are deleted — delta D-6. */

  /* §8.6.2 — carrier 1, the register at rest. */
  'conversations.composer.register': 'Reply or internal note',
  'conversations.composer.note': 'Internal note',
  /* carrier 3 — the placeholder changes with the register. */
  /* carrier 4 — **the send label names the register.** */
  'conversations.composer.send': 'Send',
  'conversations.composer.addNote': 'Add note',
  /* carrier 5 — the line beneath the composer. The key names stay Latin and the
     separator and the sentence order belong to the translator, so this is ONE
     template and never three concatenated fragments (§9). */

  /* §8.6.5 — one control, and **the label never changes**. */
  'conversations.composer.byEmail': 'Reply by email',
  /* §8.6.5 — the address is NAMED before the press, and it is `<bdi>`-isolated
     at the call site: unisolated, an Arabic paragraph reorders the `@` and the
     TLD. Reachable now that `handles` can answer what the address IS (F-3). */
  'conversations.composer.byEmail.pressed': 'This reply goes by email to {address}.',

  /* §8.6.3 — every reason `Send` is refused, as real text beneath the composer
     (§8.6.8: once per screen, never per control, and never a tooltip). */
  'conversations.composer.unclaimed': 'Grab this conversation before replying.',
  'conversations.composer.heldBy': '{name} is handling this conversation.',
  'conversations.composer.closed': 'This conversation is closed. Reopen it to reply.',
  'conversations.composer.threadError':
    'Couldn’t load this conversation. Try again before replying.',
  'conversations.composer.phone': 'A call has no message to send. Log a note instead.',
  'conversations.composer.whatsapp':
    'WhatsApp isn’t connected yet. This conversation is read-only.',
  /* **F-4** — `CNV-110` is an EMAIL conversation with `handle: null`, so there
     is no `Reply by email` to disable and the refusal lands on `Send`. */
  'conversations.composer.noHandle': 'No email address on file for this rider.',
  /* D17's grammar: a capability sentence — no deictic, no count, naming the
     permission and who can grant it — which is why it reads the same on this
     surface as it does in a kebab and in the bulk bar. */
  'conversations.composer.noPermission':
    'You cannot send a message. Ask an Owner for the “{permission}” permission.',
  'conversations.composer.permission': 'Contact users',

  /* §8.6 §6 — a rejected send removes the optimistic bubble, restores the body,
     and renders the reason here. The line is chosen from the error, never
     written by the screen (`12-refusal-and-undo-surfaces.md` §3.3). */
  'conversations.composer.rejected.closed': 'This conversation was closed. Reopen it to send.',
  'conversations.composer.rejected.network': 'Your message didn’t send. Try again.',
  /* §8.6.7 — after `Send again`. */
  'conversations.composer.restored': 'Restored from a message that didn’t send.',

  /* ── closing ────────────────────────────────────────────────────────── */
  'conversations.close': 'Close conversation',
  'conversations.close.title': 'Close this conversation?',
  'conversations.close.body':
    'It leaves every open view and keeps its thread, its claim history and its deadlines exactly as they are. A conversation answered late stays recorded as late.',
  'conversations.close.confirm': 'Close conversation',
  'conversations.close.choiceLabel': 'Reason',
  'conversations.close.choiceHelp': 'Recorded on the conversation.',
  'conversations.close.choiceMessage': 'Choose a reason.',
  'conversations.close.choicePlaceholder': 'Choose a reason',
  'conversations.close.choiceEmpty': 'No reason is available.',
  'conversations.snooze': 'Snooze until…',
  'conversations.snooze.title': 'Snooze this conversation?',
  'conversations.snooze.body': 'Both clocks pause until it wakes, then it returns to the queue on its own.',
  'conversations.snooze.confirm': 'Snooze',
  'conversations.snooze.choiceLabel': 'Until',
  'conversations.snooze.choiceHelp': 'When it comes back.',
  'conversations.snooze.choiceMessage': 'Choose when.',
  'conversations.snooze.choicePlaceholder': 'Choose when',
  'conversations.snooze.choiceEmpty': 'No time is available.',
  'conversations.snooze.option.30m': 'In 30 minutes',
  'conversations.snooze.option.2h': 'In 2 hours',
  'conversations.snooze.option.tomorrow': 'Tomorrow at 09:00',
  'conversations.toast.snoozed': 'Snoozed',
  'conversations.error.row.snooze': 'Could not snooze this conversation.',
  'conversations.typing': '{name} is typing…',
  'conversations.logCall': 'Log a call',
  'conversations.logCall.blocked.noTicket': 'Raise a ticket first. The call is logged on it.',
  'conversations.toast.callLogged': 'Call logged',
  'conversations.reason.resolved': 'Resolved',
  'conversations.reason.noResponse': 'No response',
  'conversations.reason.duplicate': 'Duplicate',
  'conversations.reason.spam': 'Spam',
  'conversations.toast.closed': 'Closed',
  'conversations.toast.reopened': 'Reopened',

  /* ── phone is read-only in v1 (D19) ─────────────────────────────────── */

  /* ── the four states ────────────────────────────────────────────────── */
  'conversations.empty.cleared.unassigned':
    'Every conversation has an operator. New ones appear here the moment a customer writes in.',
  'conversations.empty.cleared.mine': 'You are not holding any conversations.',
  'conversations.empty.cleared.waiting': 'No customer is waiting for a first reply.',
  'conversations.empty.cleared.active': 'No conversation is in progress.',
  'conversations.empty.cleared.snoozed': 'Nothing is snoozed.',
  'conversations.empty.cleared.closed': 'Nothing has been closed yet.',
  'conversations.empty.firstRun.heading': 'No conversations yet',
  'conversations.empty.firstRun.body':
    'Chat and email conversations appear here as soon as a customer opens one.',
  'conversations.empty.firstRun.action': 'Show closed conversations',
  'conversations.empty.noMatch': 'No conversation matches these filters.',

  'conversations.error.list': 'The conversations did not load. Try again.',
  'conversations.error.row.claim': 'Claiming did not go through. Try again.',
  'conversations.error.row.release': 'Releasing did not go through. Try again.',
  'conversations.error.row.transfer': 'The transfer did not go through. Try again.',
  'conversations.error.row.close': 'Closing did not go through. Try again.',
  'conversations.error.row.reopen': 'Reopening did not go through. Try again.',
}
