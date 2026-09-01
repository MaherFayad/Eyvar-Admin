/**
 * Admin › Communications — every operator-facing string on the pane, as keys
 * (**AC-74**), with no concatenation anywhere (**AC-75**).
 *
 * ## Why this file also exports a wrapper
 *
 * A screen dictionary reaches `t()` by being spread into `EN` in
 * `src/i18n/dictionaries.ts`. **That file is not mine** — it is edited by every
 * screen owner and several of us are working in parallel this week — so
 * `COMMUNICATIONS_EN` is exported for it and `withCommsCopy` bridges until the
 * merge lands: it hands each lookup the English line as `defaultValue`, which
 * `createTranslator` already honours as its last resort.
 *
 * The bridge is deliberately inert once the merge happens: `t()` reads the
 * active dictionary, then `EN`, and only then `defaultValue`. Nothing about a
 * call site changes, and no key ever renders raw.
 *
 * A key that is missing from `COMMUNICATIONS_EN` is passed through untouched,
 * so `t()` throws in dev exactly as AC-74 intends. The bridge widens the
 * dictionary; it does not soften the guard.
 *
 * ## Two rules the strings themselves obey
 *
 * **No sentence is assembled from two translated fragments.** Where a sentence
 * varies by an enum — a refusal reason, a missing locale, a failure code —
 * there is **one key per member**, never `'{prefix}: {reason}'`. Arabic does not
 * order those two halves the way English does, so a slot for a translated
 * fragment is untranslatable by construction.
 *
 * **A refusal names the fix.** §11.2 asks for a blocked control disabled in
 * place with a stated reason; a reason an operator cannot act on is decoration.
 * `comms.identity.blocked.*` and `comms.resend.no.*` each end on a next move.
 */

import type { Dictionary, Translate, TranslateParams } from '@/lib'

export const COMMUNICATIONS_EN: Dictionary = {
  /* ── the page ───────────────────────────────────────────────────────── */
  'comms.meta': '{total} messages in the log · {attention} needing attention',
  'comms.meta.empty': 'No messages in the log yet',

  /* ── the email log (the `inbox` / `outbox` views) ───────────────────── */
  'comms.log.title': 'Email log',
  'comms.log.search': 'Search by recipient, subject or message ID',
  'comms.col.recipient': 'Recipient',
  'comms.col.sender': 'Sender',
  'comms.col.correspondent': 'From',
  'comms.col.template': 'Template',
  'comms.col.subject': 'Subject',
  'comms.col.state': 'Delivery',
  'comms.col.queuedAt': 'Queued',
  'comms.col.ticket': 'Ticket',
  'comms.log.noTemplate': 'One-off message',
  'comms.log.resendOf': 'Resend of {id}',
  'comms.log.reply': 'Reply to {id}',

  /* The six states. One word each, and `complained` is spelled out because
     "complained" is jargon for what the recipient actually did (R17). */
  'comms.state.queued': 'Queued',
  'comms.state.sent': 'Sent',
  'comms.state.delivered': 'Delivered',
  'comms.state.bounced': 'Bounced',
  'comms.state.complained': 'Marked as spam',
  'comms.state.failed': 'Failed',

  /* The failure the operator reads. The provider's own words sit beside it as
     technical detail; this is the line they can act on. */
  'comms.failure.hardBounce': 'The address does not exist',
  'comms.failure.softBounce': 'The mailbox deferred it temporarily',
  'comms.failure.mailboxFull': 'The mailbox is full',
  'comms.failure.invalidAddress': 'The address is not a valid email address',
  'comms.failure.spamComplaint': 'The recipient marked it as spam',
  'comms.failure.unsubscribed': 'The recipient has unsubscribed',
  'comms.failure.rateLimited': 'The provider throttled the send',
  'comms.failure.providerError': 'The provider returned an error',
  'comms.failure.providerSaid': 'Provider response',

  'comms.log.resend': 'Resend',
  /* One key per refusal. Each ends on the next move, because a dead control
     with no way forward is indistinguishable from a broken one (§11.2). */
  'comms.resend.no.hardBounce': 'This address does not exist. Correct it on the account before sending again.',
  'comms.resend.no.invalidAddress': 'This is not a valid address. Correct it on the account before sending again.',
  'comms.resend.no.spamComplaint': 'The recipient marked our mail as spam. Sending again puts the sending domain at risk.',
  'comms.resend.no.unsubscribed': 'The recipient has unsubscribed. Reach them another way.',
  'comms.resend.no.notFailed': 'This message did not fail, so there is nothing to send again.',
  'comms.resend.no.inbound': 'This message arrived from a customer. Reply from the ticket instead.',
  'comms.resend.no.permission': 'Your role cannot send email.',
  'comms.toast.resent': 'Queued a new send to {recipient}.',
  'comms.toast.resendFailed': 'The message could not be queued again.',

  'comms.log.empty.outbox.heading': 'Every message the system sends lands here',
  'comms.log.empty.outbox.body':
    'Receipts, password resets and payout notices are recorded with the address they went to and what the mail provider did with them.',
  'comms.log.empty.inbox.heading': 'Replies from customers land here',
  'comms.log.empty.inbox.body':
    'When a customer answers a transactional message, the reply appears here beside the message it answers.',
  'comms.log.noMatch': 'No messages match this search.',
  'comms.log.error': 'The email log could not be loaded.',
  'comms.filter.state': 'Delivery state',
  'comms.filter.template': 'Template',
  'comms.filter.identity': 'Sender identity',

  /* ── sender identities ──────────────────────────────────────────────── */
  'comms.identity.title': 'Sender identities',
  'comms.identity.desc': 'The addresses the system may send as. Only a verified address can send.',
  'comms.identity.default': 'Default sender',
  'comms.identity.makeDefault': 'Make default',
  'comms.identity.replyTo': 'Replies go to {address}',
  'comms.identity.replyToSelf': 'Replies come back to this address',
  'comms.identity.verifiedOn': 'Verified {date}',
  'comms.identity.requestedOn': 'Requested {date}',
  'comms.identity.neverRequested': 'Verification has never been requested',

  'comms.verify.unverified': 'Not verified',
  'comms.verify.pending': 'Verification pending',
  'comms.verify.verified': 'Verified',
  'comms.verify.failed': 'Verification failed',

  /* §11.2 — one sentence per `SenderBlockReason`, each naming the next move. */
  'comms.identity.blocked.unverified': 'Verify this address before the system can send as it.',
  'comms.identity.blocked.pending': 'Verification is still running, so this address cannot send yet.',
  'comms.identity.blocked.failed': 'Verification failed for this address. Run it again before sending as it.',
  'comms.identity.blocked.alreadyDefault': 'This is already the default sender.',
  'comms.identity.blocked.permission': 'Your role cannot change sender identities.',

  'comms.identity.verify': 'Verify',
  'comms.identity.verifyAgain': 'Verify again',
  'comms.identity.verifyRunning': 'Verification is already running.',
  'comms.identity.verifyDone': 'This address is already verified.',
  'comms.toast.defaultSet': 'The system now sends as {address}.',
  'comms.toast.defaultFailed': 'The default sender could not be changed.',
  'comms.toast.verifyRequested': 'Verification requested for {address}.',
  'comms.toast.verifyFailed': 'Verification could not be requested.',
  'comms.identity.empty.heading': 'No address to send from',
  'comms.identity.empty.body':
    'A sender identity is the from-address on every transactional message. Until one is verified the system cannot send email.',
  'comms.identity.error': 'Sender identities could not be loaded.',

  /* ── transactional templates ────────────────────────────────────────── */
  'comms.template.title': 'Transactional templates',
  'comms.template.desc': 'One template per system event, per language.',
  'comms.template.locale.en': 'English',
  'comms.template.locale.ar': 'Arabic',
  /* One key per missing locale. Never `'{locale} missing'`. */
  'comms.template.missing.ar': 'No Arabic version',
  'comms.template.missing.en': 'No English version',
  'comms.template.missing.both': 'No template for this event',
  'comms.template.missingHelp':
    'A customer whose language has no template is sent the other language instead.',
  'comms.template.complete': 'Both languages',
  'comms.template.version': 'Version {version}',
  'comms.template.inUse': 'In use',
  'comms.template.draft': 'Draft',
  'comms.template.sends': '{count} in the log',
  'comms.template.updated': 'Updated {date}',
  'comms.template.edit': 'Edit',
  'comms.template.preview': 'Preview',
  'comms.template.empty.heading': 'No transactional template yet',
  'comms.template.empty.body':
    'A template turns a system event into the message a customer reads. Each one is written per language.',
  'comms.template.error': 'Templates could not be loaded.',
  'comms.template.coverageError': 'Language coverage could not be loaded.',

  /* ── the editor ─────────────────────────────────────────────────────── */
  'comms.editor.title': 'Edit template',
  'comms.editor.subject': 'Subject',
  'comms.editor.body': 'Body',
  'comms.editor.variables': 'Variables',
  'comms.editor.variablesHelp': 'Wrap a variable in double braces to use it in the subject or the body.',
  'comms.editor.preview': 'Preview',
  'comms.editor.previewHelp': 'Rendered with the sample value each variable declares.',
  'comms.editor.previewSubject': 'Subject',
  'comms.editor.previewBody': 'Body',
  'comms.editor.save': 'Save template',
  'comms.editor.saving': 'Saving',
  'comms.editor.cancel': 'Cancel',
  'comms.editor.close': 'Close',
  'comms.editor.issueError': 'Error',
  'comms.editor.issueWarning': 'Note',
  'comms.editor.declare': 'Declare {variable}',
  'comms.editor.saveBlocked': 'Fix the errors listed above before saving.',
  'comms.editor.readOnly': 'Your role cannot edit templates.',
  'comms.editor.error': 'The template could not be saved.',
  'comms.toast.templateSaved': 'Saved {name} as version {version}.',

  /* The validation sentences. Each names the variable, because "a variable is
     undeclared" is an observation and "declare riderName" is an instruction. */
  'comms.issue.undeclared.subject': 'The subject uses {variable}, which this template does not declare.',
  'comms.issue.undeclared.body': 'The body uses {variable}, which this template does not declare.',
  'comms.issue.unused': '{variable} is declared but never used.',
  'comms.issue.emptySubject': 'Enter a subject.',
  'comms.issue.emptyBody': 'Enter a body.',
  'comms.issue.inUse': 'This template is sent by a live system event.',

  'comms.editor.confirm.title': 'This template is live',
  'comms.editor.confirm.body':
    '{name} is sent by a live system event and has been sent {count} times. Saving changes what customers receive from the next send onwards.',
  'comms.editor.confirm.save': 'Save anyway',
  'comms.editor.confirm.cancel': 'Keep editing',

  /* ── the SMS / WhatsApp / push catalogue ────────────────────────────── */
  'comms.messaging.title': 'Notification templates',
  'comms.messaging.desc': 'Messages the gateway sends for trip and subscription events.',
  'comms.channel.sms': 'SMS',
  'comms.channel.push': 'Push',
  'comms.channel.whatsapp': 'WhatsApp',
  'comms.audience.driver': 'Captains',
  'comms.audience.rider': 'Riders',
  'comms.audience.both': 'Captains and riders',
  'comms.messaging.audience': 'Audience',
  'comms.messaging.empty.heading': 'No notification template yet',
  'comms.messaging.empty.body': 'SMS, WhatsApp and push messages triggered by system events are listed here.',
  'comms.messaging.error': 'Notification templates could not be loaded.',

  /* ── push broadcasts ────────────────────────────────────────────────── */
  'comms.push.title': 'Push broadcasts',
  'comms.push.desc': 'One message to a whole audience, with what the provider accepted.',
  'comms.push.compose': 'Send push broadcast',
  'comms.push.blocked': 'Your role cannot send broadcasts.',
  'comms.audience.allCaptains': 'All captains',
  'comms.audience.onlineCaptains': 'Captains online now',
  'comms.audience.allRiders': 'All riders',
  'comms.audience.activeSubscriptionRiders': 'Riders with an active subscription',
  'comms.push.devices': '{count} devices',
  'comms.push.openRate': 'Open rate {rate}',
  'comms.push.openRatePending': 'No open rate reported yet',
  'comms.push.state.queued': 'Queued',
  'comms.push.state.sent': 'Sent',
  'comms.push.state.failed': 'Failed',
  'comms.push.sentOn': 'Sent {date}',
  'comms.push.empty.heading': 'No broadcast sent yet',
  'comms.push.empty.body': 'A broadcast is a one-off push message to a whole audience. Every send is recorded here.',
  'comms.push.error': 'Push broadcasts could not be loaded.',

  'comms.push.composer.title': 'Compose push broadcast',
  'comms.push.composer.desc': 'One message, one audience, sent now.',
  'comms.push.composer.audience': 'Audience',
  'comms.push.composer.msgTitle': 'Title',
  'comms.push.composer.msgBody': 'Message',
  'comms.push.composer.deepLink': 'In-app link',
  'comms.push.composer.deepLinkHelp': 'Optional. Opens this screen in the app.',
  'comms.push.composer.send': 'Send broadcast',
  'comms.push.composer.sending': 'Sending',
  'comms.push.composer.cancel': 'Cancel',
  'comms.push.composer.incomplete': 'Enter a title and a message.',
  'comms.push.composer.audiencesError': 'Audiences could not be loaded. Close this and try again.',
  'comms.push.composer.error': 'The broadcast could not be sent.',
  'comms.toast.broadcastSent': 'Broadcast queued for {count} devices.',
}

/**
 * Resolve through the shell translator, falling back to this screen's English
 * line. See the header: a bridge, not a second dictionary.
 */
export function withCommsCopy(t: Translate): Translate {
  return (key: string, params?: TranslateParams): string => {
    const fallback = COMMUNICATIONS_EN[key]
    if (fallback === undefined) return t(key, params)
    return t(key, { ...params, defaultValue: fallback })
  }
}
