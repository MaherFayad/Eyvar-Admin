/**
 * Communications — the email seam, plus the two records that share its screen.
 *
 * **P6-T2.** There was zero coverage of email: `AdminCommunicationsScreen` held
 * a module-level `TEMPLATES` literal and a `broadcasts[]` array in component
 * state that invented `deliveredCount: 142` for every send. This file is the
 * contract that replaces both, and it is a **precondition for P5-T7** (outbound
 * email from a support ticket) and **P5-T8** (canned responses), so the model
 * matters more than the chrome.
 *
 * Three resources, in the order the pane presents them:
 *
 *   1. `SenderIdentity`  — the from-addresses the system may send as.
 *   2. `EmailTemplate`   — one row **per key per locale**, with declared
 *                          variables and a version.
 *   3. `EmailDelivery`   — one row per message, in both directions.
 *
 * Two more live here because they are the same screen's data and nothing else
 * models them: `PushBroadcast` (the fabricated count's replacement) and
 * `MessagingTemplate` (the SMS/WhatsApp/push catalogue the literal held). The
 * file is named for its principal resource, not its only one.
 *
 * ## The rules this file obeys, and why they are visible in the types
 *
 * **No display string is a translation key.** Every refusal, failure and state
 * crosses the seam as a **code from a closed union** — `blockedFor`,
 * `EmailFailure.code`, `EmailTemplateIssue.code` — and the UI owns the
 * sentence. `common.ts` already says the UI branches on `kind`, never on a
 * message string; the same reasoning applies to a reason. A closed union is
 * also filterable and countable, which a sentence is not.
 *
 * **Operator-authored content is data, not copy.** A template's `name`,
 * `subject` and `body`, and a broadcast's `title`, are written by an operator
 * in a locale they chose. They are not i18n keys and must never become one —
 * which is exactly why a template carries `locale` and why the pane has to be
 * able to say which locale is missing.
 *
 * **A derivation the UI must not repeat is a field.** `canSend`, `blockedFor`,
 * `canResend` and `missing` are computed once, on the server side of the seam.
 * A component that re-derives "may I send as this identity" is a second
 * predicate that will disagree with the first (D9).
 */

import type { IsoDateTime } from './common'

/* ───────────────────────── sender identities ───────────────────────── */

/**
 * Where an identity is in the domain-verification dance. Four states — and
 * **`unverified` is not `failed`**: one has never been attempted, the other was
 * attempted and rejected, and they offer the operator different next moves.
 */
export type SenderVerificationState = 'unverified' | 'pending' | 'verified' | 'failed'

export const SENDER_VERIFICATION_STATES: readonly SenderVerificationState[] = [
  'unverified',
  'pending',
  'verified',
  'failed',
]

/**
 * Why an identity may not be selected as a sender — **§11.2**, the half that
 * gets dropped: a blocked control is disabled in place with a stated reason,
 * never hidden. The reason is a code because the sentence is copy and copy
 * belongs to the screen; the code is what makes the refusal the **same**
 * refusal on the identities card, in the ticket composer (P5-T7) and in the
 * scheduled-report delivery picker (P7-T6).
 *
 * Three members, and **every one of them is reachable in the fixtures**. A
 * `suspended` member was drafted and cut: nothing in this product suspends an
 * identity today, and an enum member no record can ever carry is the same
 * invisible hole as a filter facet that matches nothing.
 */
export type SenderBlockReason = 'unverified' | 'verification-pending' | 'verification-failed'

export interface SenderIdentity {
  id: string
  /** The display name in the From header. Operator-authored content. */
  displayName: string
  address: string
  /** `null` means replies go to `address`. Never silently defaulted here. */
  replyTo: string | null
  verification: SenderVerificationState
  /** `null` when verification has never been requested — that is `unverified`. */
  verificationRequestedAt: IsoDateTime | null
  verifiedAt: IsoDateTime | null
  /**
   * **Exactly one identity in the set carries `true`.** The invariant is the
   * server's; `setDefaultSenderIdentity` is the only thing that moves it, and
   * it returns the whole set precisely because two rows change.
   */
  isDefault: boolean
  /** Derived server-side. The one answer to "may the system send as this". */
  canSend: boolean
  /** `null` exactly when `canSend` is true. */
  blockedFor: SenderBlockReason | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  /** Operator id behind the last change. `null` for a seeded identity. */
  updatedBy: string | null
}

/* ──────────────────────── transactional templates ──────────────────────── */

/**
 * The product is EN + AR, and Arabic is RTL. A template is written **for one
 * locale**, so the pair `(key, locale)` is the real identity of a template, and
 * a missing pair is a system event that cannot mail an Arabic-speaking rider.
 */
export type EmailLocale = 'en' | 'ar'

export const EMAIL_LOCALES: readonly EmailLocale[] = ['en', 'ar']

/**
 * The system event that triggers the template. A **closed set**: a template key
 * that is free text cannot be checked against the events that exist, and an
 * event with a typo in its key sends nothing and reports nothing.
 *
 * Adding an event adds a member here and two fixture rows (one per locale) —
 * that is the intended cost, and `listEmailTemplateCoverage` reports the gap the
 * moment only one of the two exists.
 */
export type EmailTemplateKey =
  | 'trip.receipt'
  | 'account.verifyEmail'
  | 'password.reset'
  | 'payout.processed'
  | 'subscription.renewalReminder'
  | 'ticket.reply'

export const EMAIL_TEMPLATE_KEYS: readonly EmailTemplateKey[] = [
  'trip.receipt',
  'account.verifyEmail',
  'password.reset',
  'payout.processed',
  'subscription.renewalReminder',
  'ticket.reply',
]

/**
 * A variable the template **declares**. `sample` is what a preview substitutes,
 * and it lives on the declaration rather than in the preview call for one
 * reason: a preview built from values invented at call time is a different
 * preview on every render and cannot be diffed by a visual regression.
 */
export interface EmailTemplateVariable {
  /** The name inside the braces, without braces or spaces. */
  name: string
  /** A required variable the body never references is a warning, not an error. */
  required: boolean
  /** Deterministic. Never a clock read, never a random pick. */
  sample: string
}

export type EmailTemplateStatus = 'draft' | 'active'

export interface EmailTemplate {
  id: string
  key: EmailTemplateKey
  locale: EmailLocale
  /** Operator-authored label for the pane. Content, not a translation key. */
  name: string
  /** May reference variables. */
  subject: string
  body: string
  /** Every variable the template is allowed to reference. */
  variables: EmailTemplateVariable[]
  /** Bumped by the server on every accepted save. The UI never sets it. */
  version: number
  status: EmailTemplateStatus
  /**
   * True when a live system event sends this template. **Saving one warns
   * first** — the warning is the point, and `sendCount` is what lets it say how
   * much traffic it is about to change rather than "this may be in use".
   */
  inUse: boolean
  /** Deliveries in the log that reference this template. Derived server-side. */
  sendCount: number
  updatedAt: IsoDateTime
  updatedBy: string | null
}

/** What an editor sends back. Everything else on a template is the server's. */
export interface EmailTemplateDraft {
  subject: string
  body: string
  /** Declaring a variable is an edit like any other, so it rides with the draft. */
  variables: EmailTemplateVariable[]
}

/**
 * Which locales a template key actually has, and which it is missing.
 *
 * Derived rather than counted in the component: "is Arabic missing" is one
 * question with one answer, and a pane that computes it from a filtered page of
 * templates gets it wrong the moment the page does not hold every row.
 */
export interface EmailTemplateCoverage {
  key: EmailTemplateKey
  /** From the `en` template if there is one, else from whichever exists. */
  name: string
  present: EmailLocale[]
  /** Empty means complete. Non-empty is a hole the pane must show. */
  missing: EmailLocale[]
  /** `null` for a locale in `missing`, so a row can link straight to the editor. */
  templateIds: Record<EmailLocale, string | null>
}

/**
 * A preview is the template **rendered with the sample values substituted**.
 *
 * `subject` and `body` here carry no variable syntax — a preview that shows the
 * source is not a preview, it is the editor with a different border. The one
 * exception is a reference the template does not declare: there is no value to
 * substitute, so it survives verbatim and is also listed in `undeclared`, which
 * is what makes the defect visible in the preview instead of in production.
 */
export interface EmailTemplatePreview {
  templateId: string
  key: EmailTemplateKey
  locale: EmailLocale
  /** Follows `locale`, so an Arabic preview renders RTL inside an LTR console. */
  dir: 'ltr' | 'rtl'
  subject: string
  body: string
  /** Exactly the values used, name to value. Lets a test assert substitution. */
  values: Record<string, string>
  /** Referenced by subject or body, declared nowhere. Save-blocking. */
  undeclared: string[]
}

export type EmailTemplateIssueCode =
  /** A reference the template does not declare. **Blocks the save, names the variable.** */
  | 'undeclared-variable'
  /** Declared, referenced nowhere. Harmless; worth saying. */
  | 'unused-variable'
  | 'empty-subject'
  | 'empty-body'
  /** Not a fault — the confirmation gate for a template that is live. */
  | 'template-in-use'

export interface EmailTemplateIssue {
  code: EmailTemplateIssueCode
  severity: 'error' | 'warning'
  /** Where it was found, when that is knowable. */
  field: 'subject' | 'body' | null
  /** The variable the operator has to fix. `null` for issues about the whole draft. */
  variable: string | null
}

export interface EmailTemplateValidation {
  /** False when any issue is `severity: 'error'`. Nothing else blocks a save. */
  valid: boolean
  issues: EmailTemplateIssue[]
  /** True when the save needs an explicit confirmation — the template is in use. */
  requiresConfirmation: boolean
}

/* ───────────────────────────── delivery log ───────────────────────────── */

/**
 * The six states, in lifecycle order. **Every one of them exists in the
 * fixtures**: a filter facet that can never match anything is an invisible
 * hole, and it is this codebase's most common defect.
 *
 * `bounced` and `complained` are distinct from `failed` on purpose — a bounce
 * is the recipient's mailbox refusing, a complaint is the recipient marking it
 * as spam (and it must suppress future sends), a failure is ours.
 */
export type EmailDeliveryState =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'bounced'
  | 'complained'
  | 'failed'

export const EMAIL_DELIVERY_STATES: readonly EmailDeliveryState[] = [
  'queued',
  'sent',
  'delivered',
  'bounced',
  'complained',
  'failed',
]

/** Why it did not arrive. A code; the sentence is the screen's. */
export type EmailFailureCode =
  | 'hard-bounce'
  | 'soft-bounce'
  | 'mailbox-full'
  | 'invalid-address'
  | 'spam-complaint'
  | 'unsubscribed'
  | 'rate-limited'
  | 'provider-error'

export interface EmailFailure {
  code: EmailFailureCode
  /**
   * The provider's own words, verbatim. Shown **beside** the translated code as
   * technical detail, never instead of it: it is untranslatable by construction
   * and an operator cannot act on it alone.
   */
  providerMessage: string
  at: IsoDateTime
}

/**
 * `outbox` is what we sent; `inbox` is what came back — a human reply to a
 * transactional message, which is the only inbound this product can receive
 * (bounces and complaints are **states on the outbound row**, not inbox rows,
 * because they belong to the send they describe).
 *
 * The two are one resource with two views because `routeTable.ts:791` says so:
 * collapsing the old Email Log into two views on this sub-tab is what removes
 * the product's only four-deep path (§3.7).
 */
export type EmailDirection = 'outbound' | 'inbound'

export interface EmailDelivery {
  id: string
  direction: EmailDirection
  /**
   * The address the message was addressed **to**: the customer for an outbound,
   * one of our sender identities for an inbound. Searchable, in both views.
   */
  recipient: string
  recipientName: string | null
  /** The address it was sent **from**. The mirror of `recipient`. */
  from: string
  /** Our identity on this message, whichever end it sat at. */
  senderIdentityId: string
  /** `null` for an inbound reply and for a one-off operator send. */
  templateKey: EmailTemplateKey | null
  templateId: string | null
  locale: EmailLocale
  subject: string
  state: EmailDeliveryState
  queuedAt: IsoDateTime
  /** The last state transition. Equal to `queuedAt` while still `queued`. */
  updatedAt: IsoDateTime
  /** Non-null exactly for `bounced`, `complained` and `failed`. */
  failure: EmailFailure | null
  /**
   * Derived server-side. A resend is offered on a failure a retry can fix and
   * refused on one it cannot — a hard bounce to a dead address and a spam
   * complaint both stay refused, and `failure.code` is the reason to show.
   */
  canResend: boolean
  /** The delivery this one is a retry of. `null` for an original send. */
  resendOf: string | null
  /** The outbound message an inbound is a reply to. `null` otherwise. */
  inReplyTo: string | null
  /** The support ticket this message belongs to — P5-T7's join. `null` otherwise. */
  ticketId: string | null
}

/* ─────────────────────── push broadcasts (same screen) ─────────────────── */

/**
 * Who a broadcast goes to. A closed set with a **device count that comes from
 * the audience**, which is the whole fix: the composer used to invent
 * `deliveredCount: 142` for every send regardless of who it went to.
 */
export type PushAudienceId =
  | 'all-captains'
  | 'online-captains'
  | 'all-riders'
  | 'active-subscription-riders'

export interface PushAudience {
  id: PushAudienceId
  /** Registered devices in the audience at the time of the read. */
  deviceCount: number
}

export type PushBroadcastState = 'queued' | 'sent' | 'failed'

export interface PushBroadcast {
  id: string
  title: string
  body: string
  audienceId: PushAudienceId
  deepLink: string | null
  sentAt: IsoDateTime
  sentBy: string | null
  state: PushBroadcastState
  /** Accepted by the push provider. **From the record**, never from a literal. */
  deliveredCount: number
  /**
   * A **percentage, 0–100** — not a fraction. `formatPercent` takes percentage
   * units, and a rate stored as `0.92` reaches it as `0.9%` at exactly one call
   * site out of every two; the unit belongs in the contract, not in a comment
   * at each reader.
   *
   * `null` until the provider reports one — which it cannot at send time.
   * Renders as an em dash, never `0`: not-applicable is not zero (§8.3.1).
   */
  openRate: number | null
}

/* ──────────────── the SMS / WhatsApp / push template catalogue ─────────── */

export type MessagingChannel = 'sms' | 'push' | 'whatsapp'

export type MessagingAudience = 'driver' | 'rider' | 'both'

/**
 * The catalogue that was a module literal in the screen. Distinct from
 * `EmailTemplate`: these have no subject, no per-locale row and no declared
 * variables today, and pretending otherwise would put four empty columns on the
 * card. When they grow variables they grow the same `variables` field, and
 * `emailTemplateIssues` already validates that shape.
 */
export interface MessagingTemplate {
  id: string
  /** The system event, as the messaging gateway knows it. */
  code: string
  name: string
  channel: MessagingChannel
  audience: MessagingAudience
  sampleText: string
  status: EmailTemplateStatus
}
