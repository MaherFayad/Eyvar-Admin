/**
 * API keys and webhooks — **D20**'s *Integrations* pane on Admin › Workspace
 * (**P6-T10**), and the resource behind `clients/integrations.ts`.
 *
 * Three lifecycles live here and they are deliberately not one:
 *
 *   1. **an API key** — issued, used, rotated, revoked;
 *   2. **a webhook endpoint** — created, subscribed, enabled/disabled, its
 *      signing secret rotated;
 *   3. **a webhook delivery** — attempted once, and replayed as a *new*
 *      attempt rather than as an edit of the old one.
 *
 * There is no legacy surface to carry behaviour across from. `eyvar_ops_panel_
 * v40_fixed.html` contains the word *webhook* exactly once — `:1924`, inside a
 * `Coming soon` panel describing per-user Slack/Teams notification channels —
 * and contains no API-key concept at all. Everything below is modelled from
 * D20's done-condition and AC-951 / AC-952, not from an existing implementation.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ## AC-951, and the clause it leaves open
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * > *"Issuing an API key displays its secret exactly once; reopening the key's
 * > row afterwards shows only its prefix and offers rotate and revoke."*
 *
 * The first half is a UI rule. **The second half is a data-model question**,
 * and it has two possible readings:
 *
 *   **(a) the secret is stored and merely not shown** — the row *could* reveal
 *        it again and the product chooses not to, which makes "exactly once" a
 *        display convention that the next surface, the next export, or one
 *        `SELECT` walks straight past;
 *   **(b) the secret is not stored at all** — only a one-way digest and a
 *        display prefix survive the issuing call, so *nothing anywhere* can
 *        produce it a second time.
 *
 * **This file rules (b), and the type is written so (a) cannot be built on top
 * of it.** `ApiKey` has no secret field. The full secret exists exactly once,
 * in the return value of `issueApiKey` / `rotateApiKey`, as an `IssuedSecret`
 * that is **not** part of any list response and is never re-derivable from one.
 *
 * The digest a real server would compare a presented credential against is
 * **not modelled in this file at all**, and that absence is deliberate: it
 * never crosses the seam, so a client-side type for it would be a field with
 * no reader and the first foothold for a `GET /api-keys/:id/secret` that
 * "already has the data". The mock computes a credential and drops everything
 * but the prefix; see `clients/integrations.ts`, `mintSecret`.
 *
 * Three consequences follow, and each is a rule some other surface would
 * otherwise have to re-invent:
 *
 *   - **`GET /api-keys` cannot leak it**, because the list element is `ApiKey`
 *     and `ApiKey` has nowhere to put it. A future export, a future search
 *     index and a future support tool all inherit that for free.
 *   - **"I lost it" has exactly one answer, and it is `rotate`.** Recovery is
 *     not a missing feature to be added later; it is arithmetically impossible
 *     against a digest. Rotation therefore is not a hardening ritual here — it
 *     is the *support path*, which is why `rotateApiKey` returns an
 *     `IssuedSecret` of the same shape as an issue.
 *   - **The reveal surface owes the operator that consequence BEFORE it
 *     closes**, not after. A dialog that shows a secret and a `Done` button
 *     teaches the operator that the secret is somewhere; the pane's reveal
 *     requires an explicit acknowledgement that it is not. See
 *     `SecretRevealDialog.tsx`.
 *
 * The reading that was rejected — (a) — is the one that produces the surface
 * D20 warns about in its own acceptance criterion: a key row with a `Show`
 * control that works. Nothing in this model can grow one.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ## The rules this file inherits from its neighbours
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **No display string crosses the seam.** Every state and every failure is a
 * code from a closed union and the UI owns the sentence — `types/email.ts`'s
 * rule, for the same two reasons: a closed union is filterable and countable,
 * and a sentence is neither.
 *
 * **A derivation the UI must not repeat is a field.** `canReplay` is computed
 * once, server-side, exactly as `EmailDelivery.canResend` is. A component that
 * re-derives *"may this be replayed"* is a second predicate that will disagree
 * with the first (**D9**).
 *
 * **Operator-authored content is data, not copy.** A key's `name` and an
 * endpoint's `url` are typed by an operator. They are never i18n keys.
 */

import type { IsoDateTime } from './common'
import type { PermissionKey } from './navigation'

/* ═════════════════════════════════ API keys ════════════════════════════ */

/**
 * **Two states, not three.** A rotated key is still `active` — rotation
 * replaces the secret *under the same key record*, so the key's identity, its
 * name, its scopes and its usage history are continuous across a rotation and
 * only the credential changes. Modelling `rotated` as a third state would make
 * every consumer ask "is a rotated key live?" and half of them would guess.
 *
 * `revoked` is terminal. There is no un-revoke: the credential is dead the
 * instant it is revoked, and *"issue a new one"* is a different act with a
 * different audit entry, which is the honest description of what happened.
 */
export type ApiKeyState = 'active' | 'revoked'

export const API_KEY_STATES: readonly ApiKeyState[] = ['active', 'revoked'] as const

/**
 * The scopes a key may carry — **D17's twenty keys, minus the retired one.**
 *
 * D20 says a key carries *"the permissions it carries (D17's twenty keys)"*.
 * Nineteen are offered. `manage_settings` is excluded because D17 **retired**
 * it: it survives in `PermissionKey` only as *"a transitional alias, granted to
 * `Owner` and to nobody else"*, it **gates no route-table row**, and its own
 * declaration says to delete it the day the last of five screens migrates.
 * Minting new credentials against a key that is scheduled for deletion would
 * make those credentials silently lose their authority on the day it goes.
 *
 * This is not a scope decision of this file's own — it is D17's ruling applied.
 * Every other key in the union is offerable.
 */
export const API_KEY_SCOPES: readonly PermissionKey[] = [
  'view_analytics',
  'view_operations',
  'view_finance',
  'view_support',
  'view_admin',
  'view_profiles',
  'approve_drivers',
  'manage_subscriptions',
  'live_ops',
  'manage_plans',
  'process_payouts',
  'release_escrow',
  'apply_deductions',
  'manage_tickets',
  'contact_users',
  'manage_ops_policy',
  'manage_workspace',
  'manage_data_governance',
] as const

/**
 * **Two keys are withdrawn from the list above, and the withdrawal is D30's,
 * not an oversight. Do not add them back.**
 *
 * `manage_team` and `manage_security_policy` are absent because they change
 * **who may do things**: a credential holding either can mint operators or
 * disable the second factor — permanently, with no human in the loop.
 *
 * The issuer check is not enough on its own and this is the hole it cannot
 * close. That rule binds an issuer to their own authority; it does nothing
 * about an **Owner**, who holds all twenty and could therefore mint an
 * Owner-equivalent credential. And a machine credential is not a person: no
 * second factor, no session lifetime, and **it outlives its issuer's
 * offboarding**.
 *
 * So this is a withdrawal from the list rather than another clause on the
 * issuer check, deliberately — **no issuer, however senior, should be able to
 * put those two behind a bearer token.** A script that needs to create an
 * operator is a script that should fail and page somebody.
 *
 * `manage_data_governance` **stays**, because a nightly export is legitimate
 * automation. But note what else it covers: **PDPL erasure execution, and
 * erasure by bearer token is not acceptable.** That is AC-1012 — blocked and
 * unbuilt rather than assumed, and owned by mock-data-engineer.
 *
 * Seventeen of twenty are offerable. `manage_settings` is the third absence and
 * is D17 applied — it is retired and gates no route row, so a credential minted
 * against it would silently lose its authority the day the key is deleted.
 */

/**
 * One issued key, as every read of it will ever look.
 *
 * **There is no `secret` field and there must never be one.** See the header:
 * AC-951's re-read clause is ruled by the absence of this field, not by a
 * component choosing not to render it.
 */
export interface ApiKey {
  id: string
  /** Operator-authored. What the key is for — `Billing reconciliation nightly`. */
  name: string
  /**
   * The leading, non-secret segment of the credential — `evk_live_7f3a`. It is
   * what a log line, a support conversation and this pane's table identify the
   * key by. It is **not** a truncated secret in the sense that matters: the
   * remaining entropy is gone, not hidden.
   */
  prefix: string
  scopes: readonly PermissionKey[]
  state: ApiKeyState
  createdAt: IsoDateTime
  createdBy: string
  /**
   * The usage record D20 asks for. `null` means *issued and never presented* —
   * which is a different fact from *used a long time ago*, and the pane says
   * so rather than rendering an em dash for both.
   */
  lastUsedAt: IsoDateTime | null
  /** Calls made with this key's current credential. `0` alongside a null `lastUsedAt`. */
  requestCount: number
  /** When the credential was last replaced. `null` on a key never rotated. */
  rotatedAt: IsoDateTime | null
  revokedAt: IsoDateTime | null
  revokedBy: string | null
}

/**
 * **The one and only carrier of a secret across the seam.**
 *
 * Returned by `issueApiKey`, `rotateApiKey`, `createWebhookEndpoint` and
 * `rotateWebhookSecret`; returned by nothing else, ever. It is a separate type
 * from `ApiKey` so that no list, no cache and no `Paginated<ApiKey>` can be
 * assigned one, and so a reviewer can grep one name to find every place a
 * secret is in memory.
 *
 * `oneTime` is `true` on every instance. It is a field rather than a comment
 * because it is what the reveal surface reads to decide it must demand an
 * acknowledgement before it closes — and because a future value of `false`
 * would be a visible, reviewable change to this contract rather than a quiet
 * one in a component.
 */
export interface IssuedSecret {
  /** The full credential. Held in memory by exactly one dialog, and not persisted. */
  secret: string
  /** The stored, non-secret half — what the row shows from now on. */
  prefix: string
  /** Always `true`. See above. */
  oneTime: true
}

export interface ApiKeyIssueResult {
  key: ApiKey
  /** The only time this key's secret exists outside the operator's clipboard. */
  issued: IssuedSecret
}

export interface IssueApiKeyInput {
  name: string
  scopes: readonly PermissionKey[]
}

/* ═══════════════════════════════ webhooks ══════════════════════════════ */

/**
 * The events an endpoint may subscribe to. A closed union: an endpoint that
 * can subscribe to a free-text event is an endpoint nobody can enumerate
 * subscribers for, and the delivery log's per-event filter has nothing to
 * offer.
 *
 * Each maps onto a state transition this product already models —
 * `trips.ts`, `subscriptions.ts`, `payouts.ts`, `applicants.ts` — so no event
 * here is speculative.
 */
export type WebhookEventKey =
  | 'trip.completed'
  | 'trip.cancelled'
  | 'subscription.activated'
  | 'subscription.expired'
  | 'payout.paid'
  | 'payment.failed'
  | 'driver.approved'
  | 'rider.registered'

export const WEBHOOK_EVENT_KEYS: readonly WebhookEventKey[] = [
  'trip.completed',
  'trip.cancelled',
  'subscription.activated',
  'subscription.expired',
  'payout.paid',
  'payment.failed',
  'driver.approved',
  'rider.registered',
] as const

/**
 * **`disabled` is not `deleted`.** A disabled endpoint keeps its deliveries,
 * its subscription list and its signing secret, so re-enabling it is one click
 * and the log it already produced stays readable. Deleting one would take the
 * evidence of every failure with it, which is the thing an operator opens this
 * pane to look at.
 */
export type WebhookEndpointState = 'enabled' | 'disabled'

export interface WebhookEndpoint {
  id: string
  /** Operator-authored. */
  name: string
  /** Absolute `https://` target. Validated in the client, not only in the form. */
  url: string
  events: readonly WebhookEventKey[]
  state: WebhookEndpointState
  /**
   * The signing secret's display prefix — `whsec_2b91`. The secret itself
   * follows the same rule as an API key's: shown once, at creation and at
   * rotation, and stored only as a digest. See this file's header.
   */
  secretPrefix: string
  createdAt: IsoDateTime
  createdBy: string
  rotatedAt: IsoDateTime | null
  /** Derived from the log, not maintained beside it. `null` before the first attempt. */
  lastDeliveryAt: IsoDateTime | null
  /**
   * Failures since the last success. Derived server-side from the log for the
   * same reason `EmailTemplate.sendCount` is: *"a counter maintained beside the
   * thing it counts drifts from it"*.
   */
  consecutiveFailures: number
}

export interface WebhookEndpointDraft {
  name: string
  url: string
  events: readonly WebhookEventKey[]
}

export interface WebhookEndpointCreateResult {
  endpoint: WebhookEndpoint
  /** The signing secret, once. Same contract as `ApiKeyIssueResult.issued`. */
  issued: IssuedSecret
}

/* ─────────────────────────── the delivery log ──────────────────────────── */

/**
 * `pending` is a real state and not a placeholder: a replay is queued, and the
 * mock leaves it queued exactly as `resendEmailDelivery` leaves its new row
 * `queued`. Inventing a success for a request nothing sent is the defect that
 * fabricated `deliveredCount: 142` on the broadcast composer.
 */
export type WebhookDeliveryState = 'pending' | 'succeeded' | 'failed'

export const WEBHOOK_DELIVERY_STATES: readonly WebhookDeliveryState[] = [
  'pending',
  'succeeded',
  'failed',
] as const

/**
 * Why an attempt did not land. A code, never a sentence — the UI owns the
 * words, and `types/email.ts` sets out why.
 *
 * `http-4xx` and `http-5xx` are separated because they ask the operator for
 * different next moves: a 4xx means *their* endpoint rejected the payload and
 * a replay will fail identically until they change something; a 5xx means it
 * was briefly unwell and a replay is exactly the right response.
 */
export type WebhookFailureCode =
  | 'timeout'
  | 'connection-refused'
  | 'dns-failure'
  | 'tls-error'
  | 'http-4xx'
  | 'http-5xx'

export interface WebhookFailure {
  code: WebhookFailureCode
  /**
   * The endpoint's own HTTP status, where there was one. `null` for a failure
   * that never reached a response — a DNS failure has no status code, and
   * rendering `0` for it would be a number the operator could act on wrongly.
   */
  statusCode: number | null
  /**
   * **The response body, verbatim and truncated by the server.** Untranslatable
   * by construction and shown beside the coded reason, never instead of it —
   * the rule `EmailLogCard` already follows for `failure.providerMessage`.
   */
  responseBody: string | null
}

/**
 * One attempt. **Immutable once written.**
 *
 * A replay does not touch this record — it writes a new one whose `replayOf`
 * points here. That is `resendEmailDelivery`'s rule (`clients/emails.ts:625`),
 * stated there as *"a log that rewrites a failure into a success when someone
 * retries it is not a log"*, and it is the same rule for the same reason.
 */
export interface WebhookDelivery {
  id: string
  endpointId: string
  event: WebhookEventKey
  state: WebhookDeliveryState
  attemptedAt: IsoDateTime
  /** Round-trip time. `null` while `pending` and on a failure with no response. */
  durationMs: number | null
  /** Present on success and on any failure that got a response. */
  statusCode: number | null
  /** Non-null exactly when `state` is `failed`. */
  failure: WebhookFailure | null
  /**
   * Derived server-side (**D9**). True only where a replay could plausibly
   * land: a failed attempt on an endpoint that is currently enabled. The UI
   * renders the control regardless and states the refusal (§11.2); it does not
   * re-derive this.
   */
  canReplay: boolean
  /** The delivery this one is a replay of. `null` for an original attempt. */
  replayOf: string | null
  /** So a row can say what was sent without a second read. */
  subjectId: string
}
