/**
 * Seeded API keys, webhook endpoints and webhook deliveries — **P6-T10**,
 * Admin › Workspace › Integrations.
 *
 * ## Nothing here is carried across from the legacy app, and that is a finding
 *
 * `eyvar_ops_panel_v40_fixed.html` has no API-key surface and no webhook
 * surface. The word *webhook* appears once, at `:1924`, inside a `Coming soon`
 * panel about per-user Slack/Teams notification channels; `api key` appears
 * nowhere. So there are no legacy literals to preserve and no legacy defect to
 * reproduce — every value below is modelled from D20's done-condition, and the
 * shapes are borrowed from the two neighbours that already do this work well
 * (`fixtures/emails.ts` for a delivery log, `fixtures/teamUsers.ts` for a
 * lifecycle with a terminal state).
 *
 * ## What the seed has to be able to reach
 *
 * QA must reach every state without hand-editing a fixture (`seam.test.ts`).
 * So the seed carries, on purpose:
 *
 *   - a key **never used** (`lastUsedAt: null`, `requestCount: 0`), which is a
 *     different fact from a key used long ago and is rendered differently;
 *   - a key that has been **rotated**, so `rotatedAt` has a non-null reader;
 *   - a **revoked** key, so the terminal state has a row and both of its
 *     actions are refused in place with a reason;
 *   - a **read-only** key and a key holding `process_payouts`, so the scope
 *     column has both a harmless and an alarming row to render;
 *   - a **disabled** endpoint, so `Replay` has a refusal that is not a
 *     permission refusal;
 *   - an endpoint with **no deliveries at all**, so the log's empty state is
 *     reachable by filtering rather than by emptying the fixture;
 *   - **both** failure shapes: one with a status code and a response body
 *     (AC-952's "failure reason"), one that never reached a response at all
 *     and therefore has neither;
 *   - an existing **replay chain** — a failed attempt and the replay of it —
 *     so `replayOf` renders before anybody clicks anything.
 *
 * Every timestamp is relative to `EYVAR_NOW` (`2026-06-25T09:14:00+03:00`) and
 * written out literally. There is no clock arithmetic in this file.
 */

import type {
  ApiKey,
  WebhookDelivery,
  WebhookEndpoint,
} from '../types/integrations'

/* ═════════════════════════════════ API keys ════════════════════════════ */

export const apiKeyFixtures: readonly ApiKey[] = [
  {
    id: 'KEY-1',
    name: 'Billing reconciliation (nightly)',
    prefix: 'evk_live_7f3a',
    /* The narrowest set that does the job. A reconciliation job reads money
       and settles nothing, so it holds `view_finance` and not `process_payouts`. */
    scopes: ['view_finance', 'view_analytics'],
    state: 'active',
    createdAt: '2026-02-11T10:02:00+03:00',
    createdBy: 'USR-1',
    lastUsedAt: '2026-06-25T03:00:00+03:00',
    requestCount: 18_402,
    rotatedAt: null,
    revokedAt: null,
    revokedBy: null,
  },
  {
    id: 'KEY-2',
    name: 'Corporate portal (Aramco)',
    prefix: 'evk_live_2c58',
    scopes: ['view_operations', 'view_profiles', 'manage_subscriptions'],
    state: 'active',
    createdAt: '2026-04-02T13:40:00+03:00',
    createdBy: 'USR-1',
    lastUsedAt: '2026-06-24T21:12:00+03:00',
    requestCount: 6_115,
    /* Rotated once, after the partner's own credential store was rebuilt. The
       key kept its id, its name, its scopes and its usage history; only the
       credential changed. */
    rotatedAt: '2026-05-19T09:30:00+03:00',
    revokedAt: null,
    revokedBy: null,
  },
  {
    id: 'KEY-3',
    name: 'Payout settlement worker',
    prefix: 'evk_live_9d10',
    /* The row that makes the scope column worth having: a machine credential
       that can move money. The pane marks it, because an operator scanning a
       key list should not have to read three chips to notice. */
    scopes: ['view_finance', 'process_payouts'],
    state: 'active',
    createdAt: '2026-05-30T08:15:00+03:00',
    createdBy: 'USR-1',
    lastUsedAt: '2026-06-25T06:45:00+03:00',
    requestCount: 941,
    rotatedAt: null,
    revokedAt: null,
    revokedBy: null,
  },
  {
    id: 'KEY-4',
    name: 'Data warehouse export (staging)',
    prefix: 'evk_live_4b77',
    scopes: ['view_analytics'],
    state: 'active',
    /* Issued and never presented. `null` and `0` together, so the pane can say
       *never used* rather than rendering an em dash that also means
       *unknown*. */
    createdAt: '2026-06-23T16:20:00+03:00',
    createdBy: 'USR-1',
    lastUsedAt: null,
    requestCount: 0,
    rotatedAt: null,
    revokedAt: null,
    revokedBy: null,
  },
  {
    id: 'KEY-5',
    name: 'Legacy dispatch bridge',
    prefix: 'evk_live_1a44',
    scopes: ['view_operations', 'live_ops'],
    state: 'revoked',
    createdAt: '2025-11-08T11:00:00+03:00',
    createdBy: 'USR-1',
    /* The usage record survives revocation. "It was still being called when we
       killed it" is exactly the fact somebody comes back to look for. */
    lastUsedAt: '2026-06-01T04:22:00+03:00',
    requestCount: 233_890,
    rotatedAt: null,
    revokedAt: '2026-06-01T09:05:00+03:00',
    revokedBy: 'USR-1',
  },
]

/* ═══════════════════════════════ webhooks ══════════════════════════════ */

export const webhookEndpointFixtures: readonly WebhookEndpoint[] = [
  {
    id: 'WHK-1',
    name: 'Corporate billing sink',
    url: 'https://hooks.aramco-mobility.example/eyvar/billing',
    events: ['trip.completed', 'subscription.activated', 'subscription.expired'],
    state: 'enabled',
    secretPrefix: 'whsec_2b91',
    createdAt: '2026-03-14T09:00:00+03:00',
    createdBy: 'USR-1',
    rotatedAt: null,
    lastDeliveryAt: '2026-06-25T08:58:00+03:00',
    consecutiveFailures: 0,
  },
  {
    id: 'WHK-2',
    name: 'Fleet partner · driver lifecycle',
    url: 'https://api.najm-fleet.example/v2/eyvar/events',
    events: ['driver.approved', 'trip.cancelled', 'payment.failed'],
    state: 'enabled',
    secretPrefix: 'whsec_8e04',
    createdAt: '2026-04-28T14:30:00+03:00',
    createdBy: 'USR-1',
    rotatedAt: '2026-06-10T12:00:00+03:00',
    lastDeliveryAt: '2026-06-25T07:41:00+03:00',
    /* Failing right now, and the log below says why. The pane surfaces this on
       the endpoint rather than making the operator find it in the log. */
    consecutiveFailures: 3,
  },
  {
    id: 'WHK-3',
    name: 'Internal analytics relay',
    url: 'https://relay.internal.eyvar.app/hooks/analytics',
    events: ['trip.completed', 'rider.registered', 'payout.paid'],
    /* Disabled, not deleted: it keeps its subscription list and its history,
       and `Replay` on its failed deliveries is refused for a reason that has
       nothing to do with the operator's permissions. */
    state: 'disabled',
    secretPrefix: 'whsec_5f6d',
    createdAt: '2026-01-20T10:10:00+03:00',
    createdBy: 'USR-1',
    rotatedAt: null,
    lastDeliveryAt: '2026-06-18T22:03:00+03:00',
    consecutiveFailures: 1,
  },
  {
    id: 'WHK-4',
    name: 'PDPL erasure notifier (new)',
    url: 'https://compliance.eyvar.app/hooks/erasure',
    events: ['rider.registered'],
    state: 'enabled',
    secretPrefix: 'whsec_c3a7',
    createdAt: '2026-06-24T17:45:00+03:00',
    createdBy: 'USR-1',
    rotatedAt: null,
    /* Registered yesterday, nothing sent yet. Filtering the log to this
       endpoint is how QA reaches the log's empty state. */
    lastDeliveryAt: null,
    consecutiveFailures: 0,
  },
]

/**
 * Newest last; the client sorts newest-first on read, exactly as
 * `listEmailDeliveries` does.
 */
export const webhookDeliveryFixtures: readonly WebhookDelivery[] = [
  {
    id: 'WHD-1',
    endpointId: 'WHK-1',
    event: 'subscription.activated',
    state: 'succeeded',
    attemptedAt: '2026-06-24T19:02:00+03:00',
    durationMs: 214,
    statusCode: 200,
    failure: null,
    canReplay: false,
    replayOf: null,
    subjectId: 'SUB-1042',
  },
  {
    id: 'WHD-2',
    endpointId: 'WHK-3',
    event: 'payout.paid',
    state: 'failed',
    attemptedAt: '2026-06-18T22:03:00+03:00',
    durationMs: 8_012,
    statusCode: null,
    failure: {
      code: 'timeout',
      statusCode: null,
      /* No response at all. `null` rather than `''`: the pane says *the
         endpoint never answered*, which is a different sentence from *it
         answered with nothing*. */
      responseBody: null,
    },
    canReplay: false,
    replayOf: null,
    subjectId: 'PAY-3390',
  },
  {
    id: 'WHD-3',
    endpointId: 'WHK-2',
    event: 'driver.approved',
    state: 'failed',
    attemptedAt: '2026-06-25T06:14:00+03:00',
    durationMs: 342,
    statusCode: 500,
    failure: {
      code: 'http-5xx',
      statusCode: 500,
      responseBody: '{"error":"upstream_unavailable","retry_after":120}',
    },
    canReplay: true,
    replayOf: null,
    subjectId: 'DRV-221',
  },
  {
    id: 'WHD-4',
    endpointId: 'WHK-2',
    event: 'driver.approved',
    state: 'failed',
    attemptedAt: '2026-06-25T06:31:00+03:00',
    durationMs: 298,
    statusCode: 500,
    failure: {
      code: 'http-5xx',
      statusCode: 500,
      responseBody: '{"error":"upstream_unavailable","retry_after":120}',
    },
    canReplay: true,
    /* The replay chain that exists before anybody clicks: WHD-4 is a replay of
       WHD-3, WHD-3 is untouched, and both rows are in the log. */
    replayOf: 'WHD-3',
    subjectId: 'DRV-221',
  },
  {
    id: 'WHD-5',
    endpointId: 'WHK-2',
    event: 'payment.failed',
    state: 'failed',
    attemptedAt: '2026-06-25T07:41:00+03:00',
    durationMs: 121,
    statusCode: 422,
    failure: {
      code: 'http-4xx',
      statusCode: 422,
      /* A 4xx a replay cannot fix, and the body says so in the endpoint's own
         words. The pane still offers the replay — §11.2 disables in place
         rather than hiding — but the reason names the next move. */
      responseBody: '{"error":"unknown_event_type","detail":"payment.failed is not registered"}',
    },
    canReplay: true,
    replayOf: null,
    subjectId: 'PMT-8821',
  },
  {
    id: 'WHD-6',
    endpointId: 'WHK-1',
    event: 'trip.completed',
    state: 'succeeded',
    attemptedAt: '2026-06-25T08:58:00+03:00',
    durationMs: 187,
    statusCode: 201,
    failure: null,
    canReplay: false,
    replayOf: null,
    subjectId: 'TRP-77120',
  },
  {
    id: 'WHD-7',
    endpointId: 'WHK-1',
    event: 'trip.completed',
    state: 'pending',
    attemptedAt: '2026-06-25T09:12:00+03:00',
    durationMs: null,
    statusCode: null,
    failure: null,
    canReplay: false,
    replayOf: null,
    subjectId: 'TRP-77121',
  },
]
