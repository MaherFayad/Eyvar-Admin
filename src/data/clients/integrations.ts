/**
 * Integrations — API keys and webhooks, **P6-T10**, behind D20's *Integrations*
 * pane on Admin › Workspace.
 *
 * Shaped exactly like `team.ts` and `securityPolicy.ts`, its two newest
 * neighbours: a `DATA_SOURCE` branch on every operation, the `mock` /
 * `mockMutation` wrapper so latency and injected failure are never skipped, one
 * operation-id constant per call so QA can fail any one of them from
 * `?mockFail=`, and `Paginated<T>` on every list.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ## The five things this file decides
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **1. A secret is minted here and never stored.** `issueApiKey`,
 * `rotateApiKey`, `createWebhookEndpoint` and `rotateWebhookSecret` are the
 * only four functions in this codebase that return an `IssuedSecret`, and the
 * value they return is not written to `keys` / `endpoints`. Only the display
 * prefix is. `types/integrations.ts` sets out why at length: **AC-951's
 * re-read clause is ruled by the model, not by the UI.** There is no
 * `getApiKeySecret`, there is no `?reveal=`, and neither can be added without
 * changing the stored shape — which is the whole point.
 *
 * **2. Rotation is the support path, not a ritual.** Because the secret is
 * unrecoverable, *"the integration lost its key"* has exactly one answer, and
 * it is `rotateApiKey`. So rotation keeps the key's identity — same id, same
 * name, same scopes, same usage history — and replaces only the credential.
 * A rotated key does not become a second row in the table, because it is not a
 * second key.
 *
 * **3. A replay is a new delivery row.** It does not mutate the failed
 * attempt, for the reason `clients/emails.ts:625` already states about
 * resending: *"a log that rewrites a failure into a success when someone
 * retries it is not a log."* `replayOf` threads the two, the new row lands
 * `pending`, and the mock does not invent an outcome for a request nothing
 * sent. **AC-952** is satisfied by the pair of rows, not by a mutated one.
 *
 * **4. Three derivations are computed on read, never stored.** `canReplay`,
 * and an endpoint's `lastDeliveryAt` and `consecutiveFailures`, are functions
 * of the delivery log. Disabling an endpoint changes `canReplay` for every one
 * of its deliveries at once; a stored copy would need a migration on every
 * write and would be wrong in between. The fixture carries seed values for
 * readability and this client overwrites them on every read, so there is
 * exactly one answer to *"may this be replayed"* (**D9**).
 *
 * **5. A key cannot be issued with a scope its issuer does not hold.**
 * Without this, any operator holding `manage_workspace` — the pane's own write
 * key — could mint a machine credential carrying `process_payouts` and then
 * present it, which is a complete bypass of D17's matrix through a settings
 * pane. The refusal is a 422 naming the offending scopes, and the pane offers
 * only the scopes the operator holds so the refusal is a backstop rather than
 * the first thing they meet. **This rule is applied, not invented from
 * nothing** — it is D17's own reasoning about `manage_settings` (*"one key
 * doing two jobs, and nobody able to grant half of it"*) at the credential
 * boundary — but it is not written down in D20, so it is flagged in the
 * handoff for ratification rather than assumed to be settled.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ## The audit gap, and why it is one line rather than eleven
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every write here writes an audit entry. `AuditAction` in `types/audit.ts` is
 * a **closed union** and does not yet carry the seven members these writes
 * need; that file's owner asked for one central widening rather than a fourth
 * agent's edit in a day, so the members were **requested and not made here**.
 *
 * `clients/emails.ts` hit the same wall and shipped its writes unaudited,
 * recording it as *"a gap, not a completed handoff"*. That is the worse of the
 * two options: the entries then do not exist, so nothing can assert them and
 * the gap is invisible until somebody reads the header. This file instead
 * funnels **all seven** through `auditIntegrations` below, which carries the
 * single widening assertion and a strictly-typed local union so a typo cannot
 * reach it. The day the members land in `AuditAction`, one line changes and
 * nothing else in this file moves.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { runQuery, type QueryShape } from '../mock/query'
import { effectivePermissions } from '../types/session'
import type { AuditAction, AuditEntry } from '../types/audit'
import { ApiError, type Paginated, type QueryParams } from '../types/common'
import {
  API_KEY_SCOPES,
  type ApiKey,
  type ApiKeyIssueResult,
  type IssueApiKeyInput,
  type IssuedSecret,
  type WebhookDelivery,
  type WebhookEndpoint,
  type WebhookEndpointCreateResult,
  type WebhookEndpointDraft,
  type WebhookEndpointState,
} from '../types/integrations'
import type { PermissionKey } from '../types/navigation'
import { appendAudit } from './audit'
import { http } from './http'
import { currentMockUserId } from './session'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let apiKeyFixtures!: Fixtures['apiKeyFixtures']
let webhookDeliveryFixtures!: Fixtures['webhookDeliveryFixtures']
let webhookEndpointFixtures!: Fixtures['webhookEndpointFixtures']
let teamUserFixtures!: Fixtures['teamUserFixtures']
onFixturesLoaded((f) => {
  apiKeyFixtures = f.apiKeyFixtures
  webhookDeliveryFixtures = f.webhookDeliveryFixtures
  webhookEndpointFixtures = f.webhookEndpointFixtures
  teamUserFixtures = f.teamUserFixtures
  /* Seeded here rather than at module load: these locals are built from
     late-bound fixtures, which are undefined until the fixture chunk lands. */
  keys = apiKeyFixtures.map(cloneKey)
  endpoints = webhookEndpointFixtures.map(cloneEndpoint)
  deliveries = webhookDeliveryFixtures.map(cloneDelivery)
  keySequence = apiKeyFixtures.length
  endpointSequence = webhookEndpointFixtures.length
  deliverySequence = webhookDeliveryFixtures.length
})

export const INTEGRATION_OPERATIONS = {
  keys: 'integrations.keys.list',
  issueKey: 'integrations.keys.issue',
  rotateKey: 'integrations.keys.rotate',
  revokeKey: 'integrations.keys.revoke',
  endpoints: 'integrations.webhooks.list',
  createEndpoint: 'integrations.webhooks.create',
  updateEndpoint: 'integrations.webhooks.update',
  rotateEndpointSecret: 'integrations.webhooks.rotateSecret',
  deliveries: 'integrations.deliveries.list',
  replayDelivery: 'integrations.deliveries.replay',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(INTEGRATION_OPERATIONS))

/* ────────────────────────────── the store ─────────────────────────────── */

let keys!: ApiKey[]
let endpoints!: WebhookEndpoint[]
let deliveries!: WebhookDelivery[]

/** Ids and credentials come from sequences, never from a clock or a random. */
let keySequence = 0
let endpointSequence = 0
let deliverySequence = 0
let secretSequence = 0

export function resetIntegrations(): void {
  /* Nothing seeded yet: the fixture chunk has not landed, so there is no
     state to reset and the rows this would read are still undefined. The
     binder in this module seeds fresh state when it does land. */
  if (!fixturesLoaded()) return
  keys = apiKeyFixtures.map(cloneKey)
  endpoints = webhookEndpointFixtures.map(cloneEndpoint)
  deliveries = webhookDeliveryFixtures.map(cloneDelivery)
  keySequence = apiKeyFixtures.length
  endpointSequence = webhookEndpointFixtures.length
  deliverySequence = webhookDeliveryFixtures.length
  secretSequence = 0
}

function cloneKey(key: ApiKey): ApiKey {
  return { ...key, scopes: [...key.scopes] }
}

function cloneEndpoint(endpoint: WebhookEndpoint): WebhookEndpoint {
  return { ...endpoint, events: [...endpoint.events] }
}

function cloneDelivery(delivery: WebhookDelivery): WebhookDelivery {
  return {
    ...delivery,
    failure: delivery.failure === null ? null : { ...delivery.failure },
  }
}

/* ─────────────────────── secrets, minted deterministically ─────────────── */

/**
 * FNV-1a. **Not a security primitive** — a real server mints from a CSPRNG and
 * stores an Argon2 digest. This exists so a mock can produce a *different*
 * credential on every issue while `seam.test.ts` still forbids `Math.random()`
 * in this directory, and so a visual regression can diff a reveal dialog.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

function token(seed: string, length: number): string {
  let out = ''
  let round = 0
  while (out.length < length) {
    out += fnv1a(`${seed}#${round}`).toString(36).padStart(7, '0')
    round += 1
  }
  return out.slice(0, length)
}

/**
 * The one place a credential comes into existence. Returns the full secret and
 * the prefix that is all the store will keep of it.
 *
 * The digest is computed and immediately dropped: this mock has no password
 * file to write it to, and inventing a field to hold it would be the first
 * step back towards a secret that can be read a second time. The **real**
 * server stores `digest` and nothing else, which is what makes the display
 * prefix the only survivor. `types/integrations.ts` carries the ruling.
 */
function mintSecret(tag: 'evk_live' | 'whsec'): IssuedSecret {
  secretSequence += 1
  const body = token(`${tag}:${secretSequence}`, 36)
  const prefix = `${tag}_${body.slice(0, 4)}`
  return { secret: `${prefix}${body.slice(4)}`, prefix, oneTime: true }
}

/**
 * The issuing operator's effective authority — the ceiling on what a key may
 * carry.
 *
 * **This deliberately does NOT call `currentMockPermissions()`, and that is a
 * defect report rather than a preference.** That helper reads
 * `TeamUser.permissions`, which D17 retired: it is the *"legacy seed's
 * absolute set per operator … the free-floating permission set D17 rules out"*
 * (`clients/session.ts:183`), and `TeamUser.permissions` is marked
 * `@deprecated` in `types/session.ts:263` naming this exact replacement.
 * `buildSession` already reads `effectivePermissions(role, permissionDelta)`,
 * so the two disagree today: **USR-1 is an `Owner` and therefore holds all
 * twenty keys on `Session.permissions`, while `currentMockPermissions()`
 * returns the thirteen legacy strings** — no `view_analytics`, no
 * `view_operations`, no `manage_workspace`. Anything gating on that helper is
 * gating on a set the console does not show the operator.
 *
 * This computes it the way `buildSession` does, so the ceiling here and the
 * scope list the pane renders from `Session.permissions` cannot disagree.
 * Raised with the owner of `clients/session.ts`; when that helper is corrected
 * this function becomes a one-line call to it.
 */
function issuerPermissions(): readonly PermissionKey[] {
  const user = teamUserFixtures.find((each) => each.id === currentMockUserId())
  return user === undefined ? [] : effectivePermissions(user.role, user.permissionDelta)
}

/* ─────────────────────────── the audit funnel ─────────────────────────── */

/**
 * **One funnel for all seven writes, and no widening assertion.**
 *
 * This held a local `IntegrationsAuditAction` union and a single
 * `as unknown as AuditAction`, because `AuditAction` is closed and did not yet
 * carry these members. The two alternatives were both worse: widening that
 * union here would have been the fifth agent editing one file in a day, and
 * shipping the writes unaudited would mean the entries do not exist — so no
 * test could assert AC-950's *"one audit entry"* and the gap would be invisible
 * until somebody read a header.
 *
 * **The members have since landed centrally, so the local union and the cast
 * are both deleted.** `action` is now `AuditAction` itself, and a misspelling
 * is a compile error at the call site rather than something the assertion would
 * have waved through.
 */
function auditIntegrations(
  action: AuditAction,
  input: {
    subjectType: string
    subjectId: string
    detail: AuditEntry['detail']
  },
): void {
  appendAudit({
    action,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    /* None of these moves money. `null` is what the Activity table's `—` means. */
    amountHalalas: null,
    reasonCode: null,
    note: null,
    detail: input.detail,
  })
}

/* ═════════════════════════════════ API keys ════════════════════════════ */

const keyShape: QueryShape<ApiKey> = {
  searchable: [(row) => row.name, (row) => row.prefix, (row) => row.id],
  sortable: {
    name: (row) => row.name,
    createdAt: (row) => row.createdAt,
    lastUsedAt: (row) => row.lastUsedAt,
    requestCount: (row) => row.requestCount,
    /* **Added by the sort/filter sweep.** A column the operator can read is a
       column they can order by, unless ordering it is meaningless — see
       `docs/TABLE-SORT-AUDIT.md` for the three kinds this sweep left alone. */
    state: (r) => r.state,
  },
  filterable: { state: (row) => row.state, scopes: (row) => row.scopes },
  facetable: ['state'],
}

/**
 * GET /api/v1/integrations/api-keys
 *   params: q · state · sort · page · pageSize
 *   -> Paginated<ApiKey>, newest first
 *
 * **No element of this response can carry a secret.** `ApiKey` has no field
 * for one — see `types/integrations.ts`.
 */
export async function listApiKeys(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<ApiKey>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<ApiKey>>(
      '/integrations/api-keys',
      { ...params, signal: undefined },
      { signal },
    )
  }
  return mock(INTEGRATION_OPERATIONS.keys, signal ?? params.signal, () => {
    const newestFirst = [...keys].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    return runQuery(newestFirst.map(cloneKey), params, keyShape)
  })
}

/**
 * POST /api/v1/integrations/api-keys
 *   body: IssueApiKeyInput
 *   -> ApiKeyIssueResult — **the only response in the product that carries a
 *      secret, and it carries it once**
 *
 * The 422s are raised here rather than only in the form for the reason
 * `workspace.ts` gives: a limit that lives only in the browser is a limit the
 * next surface skips. The escalation guard in particular must be server-side,
 * because a form that offers the operator only their own scopes is a
 * convenience and not a boundary.
 */
export async function issueApiKey(
  input: IssueApiKeyInput,
  signal?: AbortSignal,
): Promise<ApiKeyIssueResult> {
  if (DATA_SOURCE === 'http') {
    return http.post<ApiKeyIssueResult>('/integrations/api-keys', input, { signal })
  }
  return mockMutation(INTEGRATION_OPERATIONS.issueKey, signal, () => {
    const name = input.name.trim()
    const scopes = [...input.scopes]
    const invalid: Array<{ field: string; code: string; message: string }> = []

    if (name === '') {
      invalid.push({
        field: 'name',
        code: 'required',
        message: 'Name the integration this key is for.',
      })
    }
    if (scopes.length === 0) {
      invalid.push({
        field: 'scopes',
        code: 'required',
        message: 'A key with no scopes can do nothing. Pick at least one.',
      })
    }
    const unknown = scopes.filter((scope) => !API_KEY_SCOPES.includes(scope))
    if (unknown.length > 0) {
      invalid.push({
        field: 'scopes',
        code: 'unknown_scope',
        message: `Not a scope a key may carry: ${unknown.join(', ')}.`,
      })
    }
    /* Decision 5 in the header. The issuer's own authority is the ceiling. */
    const held = issuerPermissions()
    const escalating = scopes.filter(
      (scope) => API_KEY_SCOPES.includes(scope) && !held.includes(scope),
    )
    if (escalating.length > 0) {
      invalid.push({
        field: 'scopes',
        code: 'scope_exceeds_issuer',
        message: `You do not hold ${escalating.join(', ')}, so a key you issue cannot carry it.`,
      })
    }
    if (invalid.length > 0) throw validationError('invalid_api_key', invalid)

    const issued = mintSecret('evk_live')
    keySequence += 1
    const key: ApiKey = {
      id: `KEY-${keySequence}`,
      name,
      prefix: issued.prefix,
      scopes,
      state: 'active',
      createdAt: EYVAR_NOW,
      createdBy: currentMockUserId(),
      lastUsedAt: null,
      requestCount: 0,
      rotatedAt: null,
      revokedAt: null,
      revokedBy: null,
    }
    keys = [key, ...keys]

    auditIntegrations('apiKey.issue', {
      subjectType: 'apiKey',
      subjectId: key.id,
      /* The scope NAMES, and the prefix — never the secret. An audit log is
         read by more people than the credential is, which is the same rule
         `workspace.update` follows for a support phone number. */
      detail: {
        key: 'admin.audit.integrations.keyIssued',
        params: { name: key.name, prefix: key.prefix, scopes: scopes.join(', ') },
      },
    })
    return { key: cloneKey(key), issued }
  })
}

/**
 * POST /api/v1/integrations/api-keys/:id/rotate
 *   -> ApiKeyIssueResult — a new secret, once, for the **same** key
 *
 * The old credential stops working immediately. There is no overlap window,
 * and that is a decision worth naming: an overlap makes rotation safe for the
 * integration and makes *"is the leaked key dead yet"* unanswerable for the
 * operator, which is the question rotation is usually being used to settle. A
 * staged rotation is a real feature and it is **reported, not invented here**.
 */
export async function rotateApiKey(id: string, signal?: AbortSignal): Promise<ApiKeyIssueResult> {
  if (DATA_SOURCE === 'http') {
    return http.post<ApiKeyIssueResult>(`/integrations/api-keys/${id}/rotate`, undefined, { signal })
  }
  return mockMutation(INTEGRATION_OPERATIONS.rotateKey, signal, () => {
    const existing = keys.find((row) => row.id === id)
    if (!existing) throw notFound('api key', id)
    if (existing.state === 'revoked') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'key_revoked',
        message: `Key ${id} is revoked; rotating it would resurrect a credential that was deliberately killed.`,
        retryable: false,
      })
    }
    const issued = mintSecret('evk_live')
    const previousPrefix = existing.prefix
    const rotated: ApiKey = {
      ...existing,
      /* Same id, same name, same scopes, same usage history. Only the
         credential changed — see decision 2 in the header. */
      prefix: issued.prefix,
      rotatedAt: EYVAR_NOW,
    }
    keys = keys.map((row) => (row.id === id ? rotated : row))

    auditIntegrations('apiKey.rotate', {
      subjectType: 'apiKey',
      subjectId: id,
      detail: {
        key: 'admin.audit.integrations.keyRotated',
        params: { name: rotated.name, from: previousPrefix, to: rotated.prefix },
      },
    })
    return { key: cloneKey(rotated), issued }
  })
}

/**
 * POST /api/v1/integrations/api-keys/:id/revoke
 *   -> ApiKey
 *
 * Terminal, and the usage record survives it. *"It was still being called when
 * we killed it"* is exactly the fact somebody comes back for.
 */
export async function revokeApiKey(id: string, signal?: AbortSignal): Promise<ApiKey> {
  if (DATA_SOURCE === 'http') {
    return http.post<ApiKey>(`/integrations/api-keys/${id}/revoke`, undefined, { signal })
  }
  return mockMutation(INTEGRATION_OPERATIONS.revokeKey, signal, () => {
    const existing = keys.find((row) => row.id === id)
    if (!existing) throw notFound('api key', id)
    if (existing.state === 'revoked') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'already_revoked',
        message: `Key ${id} is already revoked.`,
        retryable: false,
      })
    }
    const revoked: ApiKey = {
      ...existing,
      state: 'revoked',
      revokedAt: EYVAR_NOW,
      revokedBy: currentMockUserId(),
    }
    keys = keys.map((row) => (row.id === id ? revoked : row))

    auditIntegrations('apiKey.revoke', {
      subjectType: 'apiKey',
      subjectId: id,
      detail: {
        key: 'admin.audit.integrations.keyRevoked',
        params: { name: revoked.name, prefix: revoked.prefix },
      },
    })
    return cloneKey(revoked)
  })
}

/* ═══════════════════════════════ webhooks ══════════════════════════════ */

/**
 * The three fields that are functions of the log. Recomputed on every read —
 * decision 4 in the header.
 */
function withEndpointDerivations(endpoint: WebhookEndpoint): WebhookEndpoint {
  const mine = deliveries
    .filter((row) => row.endpointId === endpoint.id)
    .sort((a, b) => Date.parse(a.attemptedAt) - Date.parse(b.attemptedAt))
  const last = mine[mine.length - 1]
  let consecutiveFailures = 0
  for (let index = mine.length - 1; index >= 0; index -= 1) {
    const row = mine[index]!
    /* A `pending` attempt is neither a success nor a failure and must not
       reset the streak: a replay queued thirty seconds ago does not mean the
       endpoint recovered. */
    if (row.state === 'pending') continue
    if (row.state === 'failed') consecutiveFailures += 1
    else break
  }
  return {
    ...endpoint,
    events: [...endpoint.events],
    lastDeliveryAt: last?.attemptedAt ?? null,
    consecutiveFailures,
  }
}

/**
 * GET /api/v1/integrations/webhooks
 *   -> WebhookEndpoint[]
 *
 * Not paginated. An endpoint list is a handful of rows an operator reads whole
 * — `getSecurityPolicy`'s shape, not `listEmailDeliveries`'s.
 */
export async function listWebhookEndpoints(signal?: AbortSignal): Promise<WebhookEndpoint[]> {
  if (DATA_SOURCE === 'http') {
    return http.get<WebhookEndpoint[]>('/integrations/webhooks', undefined, { signal })
  }
  return mock(INTEGRATION_OPERATIONS.endpoints, signal, () =>
    [...endpoints]
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
      .map(withEndpointDerivations),
  )
}

/** Shared by create and update: an endpoint we cannot post to is not an endpoint. */
function validateDraft(draft: WebhookEndpointDraft): void {
  const invalid: Array<{ field: string; code: string; message: string }> = []
  if (draft.name.trim() === '') {
    invalid.push({ field: 'name', code: 'required', message: 'Name the endpoint.' })
  }
  const url = draft.url.trim()
  if (!/^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/.test(url)) {
    invalid.push({
      field: 'url',
      code: 'invalid_url',
      /* `https` only, and stated as the reason rather than as a format rule:
         the payload is signed, and a signature over plaintext protects
         nothing. */
      message: 'An absolute https:// URL. Signed payloads are not sent over http.',
    })
  }
  if (draft.events.length === 0) {
    invalid.push({
      field: 'events',
      code: 'required',
      message: 'An endpoint with no events subscribed never fires. Pick at least one.',
    })
  }
  if (invalid.length > 0) throw validationError('invalid_webhook_endpoint', invalid)
}

/**
 * POST /api/v1/integrations/webhooks
 *   body: WebhookEndpointDraft
 *   -> WebhookEndpointCreateResult — endpoint plus the signing secret, once
 *
 * The signing secret follows the API key's rule exactly, and for a sharper
 * reason: it is what the *receiver* verifies with, so it is copied into
 * somebody else's system. There is no re-read path, and rotation is the
 * answer to losing it.
 */
export async function createWebhookEndpoint(
  draft: WebhookEndpointDraft,
  signal?: AbortSignal,
): Promise<WebhookEndpointCreateResult> {
  if (DATA_SOURCE === 'http') {
    return http.post<WebhookEndpointCreateResult>('/integrations/webhooks', draft, { signal })
  }
  return mockMutation(INTEGRATION_OPERATIONS.createEndpoint, signal, () => {
    validateDraft(draft)
    const issued = mintSecret('whsec')
    endpointSequence += 1
    const endpoint: WebhookEndpoint = {
      id: `WHK-${endpointSequence}`,
      name: draft.name.trim(),
      url: draft.url.trim(),
      events: [...draft.events],
      state: 'enabled',
      secretPrefix: issued.prefix,
      createdAt: EYVAR_NOW,
      createdBy: currentMockUserId(),
      rotatedAt: null,
      lastDeliveryAt: null,
      consecutiveFailures: 0,
    }
    endpoints = [...endpoints, endpoint]

    auditIntegrations('webhook.create', {
      subjectType: 'webhook',
      subjectId: endpoint.id,
      detail: {
        key: 'admin.audit.integrations.webhookCreated',
        params: { name: endpoint.name, url: endpoint.url, events: endpoint.events.join(', ') },
      },
    })
    return { endpoint: withEndpointDerivations(endpoint), issued }
  })
}

/**
 * PATCH /api/v1/integrations/webhooks/:id
 *   body: Partial<WebhookEndpointDraft> & { state? }
 *   -> WebhookEndpoint
 *
 * One operation for the target, the subscription list and the enabled state.
 * They are three fields on one record and three endpoints would be three audit
 * entries for what an operator experiences as one edit — the mistake the three
 * legacy Workspace panes made with the logo.
 */
export async function updateWebhookEndpoint(
  id: string,
  patch: Partial<WebhookEndpointDraft> & { state?: WebhookEndpointState },
  signal?: AbortSignal,
): Promise<WebhookEndpoint> {
  if (DATA_SOURCE === 'http') {
    return http.patch<WebhookEndpoint>(`/integrations/webhooks/${id}`, patch, { signal })
  }
  return mockMutation(INTEGRATION_OPERATIONS.updateEndpoint, signal, () => {
    const existing = endpoints.find((row) => row.id === id)
    if (!existing) throw notFound('webhook endpoint', id)

    const next: WebhookEndpoint = {
      ...existing,
      name: patch.name?.trim() ?? existing.name,
      url: patch.url?.trim() ?? existing.url,
      events: patch.events === undefined ? existing.events : [...patch.events],
      state: patch.state ?? existing.state,
    }
    validateDraft({ name: next.name, url: next.url, events: next.events })

    const changed: string[] = []
    if (next.name !== existing.name) changed.push('name')
    if (next.url !== existing.url) changed.push('url')
    if (next.events.join(',') !== existing.events.join(',')) changed.push('events')
    if (next.state !== existing.state) changed.push('state')

    endpoints = endpoints.map((row) => (row.id === id ? next : row))
    auditIntegrations('webhook.update', {
      subjectType: 'webhook',
      subjectId: id,
      detail: {
        key: 'admin.audit.integrations.webhookUpdated',
        params: { name: next.name, fields: changed.join(', ') || '—', state: next.state },
      },
    })
    return withEndpointDerivations(next)
  })
}

/**
 * POST /api/v1/integrations/webhooks/:id/rotate-secret
 *   -> IssuedSecret — once
 *
 * Deliveries signed with the old secret stay in the log exactly as they were.
 * Rotating a signing key does not retroactively unsign what was already sent.
 */
export async function rotateWebhookSecret(
  id: string,
  signal?: AbortSignal,
): Promise<IssuedSecret> {
  if (DATA_SOURCE === 'http') {
    return http.post<IssuedSecret>(`/integrations/webhooks/${id}/rotate-secret`, undefined, {
      signal,
    })
  }
  return mockMutation(INTEGRATION_OPERATIONS.rotateEndpointSecret, signal, () => {
    const existing = endpoints.find((row) => row.id === id)
    if (!existing) throw notFound('webhook endpoint', id)
    const issued = mintSecret('whsec')
    const previousPrefix = existing.secretPrefix
    const next: WebhookEndpoint = {
      ...existing,
      secretPrefix: issued.prefix,
      rotatedAt: EYVAR_NOW,
    }
    endpoints = endpoints.map((row) => (row.id === id ? next : row))

    auditIntegrations('webhook.rotateSecret', {
      subjectType: 'webhook',
      subjectId: id,
      detail: {
        key: 'admin.audit.integrations.webhookSecretRotated',
        params: { name: next.name, from: previousPrefix, to: next.secretPrefix },
      },
    })
    return issued
  })
}

/* ─────────────────────────── the delivery log ──────────────────────────── */

/** Decision 4: computed, never read from the stored row. */
function withReplayability(delivery: WebhookDelivery): WebhookDelivery {
  const endpoint = endpoints.find((row) => row.id === delivery.endpointId)
  return {
    ...cloneDelivery(delivery),
    canReplay: delivery.state === 'failed' && endpoint?.state === 'enabled',
  }
}

const deliveryShape: QueryShape<WebhookDelivery> = {
  searchable: [(row) => row.id, (row) => row.subjectId, (row) => row.event],
  sortable: {
    attemptedAt: (row) => row.attemptedAt,
    statusCode: (row) => row.statusCode,
    durationMs: (row) => row.durationMs,
    /* **Added by the sort/filter sweep.** A column the operator can read is a
       column they can order by, unless ordering it is meaningless — see
       `docs/TABLE-SORT-AUDIT.md` for the three kinds this sweep left alone. */
    id: (r) => r.id,
    event: (r) => r.event,
    endpointId: (r) => r.endpointId,
    state: (r) => r.state,
  },
  filterable: {
    endpointId: (row) => row.endpointId,
    state: (row) => row.state,
    event: (row) => row.event,
  },
  facetable: ['endpointId', 'state', 'event'],
}

/**
 * GET /api/v1/integrations/webhook-deliveries
 *   params: q · endpointId · state · event · sort · page · pageSize
 *   -> Paginated<WebhookDelivery>, newest first
 */
export async function listWebhookDeliveries(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<WebhookDelivery>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<WebhookDelivery>>(
      '/integrations/webhook-deliveries',
      { ...params, signal: undefined },
      { signal },
    )
  }
  return mock(INTEGRATION_OPERATIONS.deliveries, signal ?? params.signal, () => {
    const newestFirst = [...deliveries].sort(
      (a, b) => Date.parse(b.attemptedAt) - Date.parse(a.attemptedAt),
    )
    return runQuery(newestFirst.map(withReplayability), params, deliveryShape)
  })
}

/**
 * POST /api/v1/integrations/webhook-deliveries/:id/replay
 *   -> WebhookDelivery — **the new row**, pending
 *
 * **AC-952**, and the same semantics `resendEmailDelivery` established:
 *
 *   - the failed attempt is left **exactly** as it is, including its status
 *     code and its response body;
 *   - the replay is a **new** row, `pending`, with `replayOf` pointing at the
 *     original, so the log shows a retry without losing what happened;
 *   - the mock does **not** decide whether the replay succeeds. Nothing sent
 *     it. Inventing an outcome here is the `deliveredCount: 142` defect.
 *
 * A replay of a replay is legal and threads to its immediate parent, so the
 * chain is walkable one hop at a time rather than collapsing to the original.
 */
export async function replayWebhookDelivery(
  id: string,
  signal?: AbortSignal,
): Promise<WebhookDelivery> {
  if (DATA_SOURCE === 'http') {
    return http.post<WebhookDelivery>(
      `/integrations/webhook-deliveries/${id}/replay`,
      undefined,
      { signal },
    )
  }
  return mockMutation(INTEGRATION_OPERATIONS.replayDelivery, signal, () => {
    const original = deliveries.find((row) => row.id === id)
    if (!original) throw notFound('webhook delivery', id)
    const endpoint = endpoints.find((row) => row.id === original.endpointId)
    if (!endpoint) throw notFound('webhook endpoint', original.endpointId)

    if (original.state !== 'failed') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'replay_refused_not_failed',
        message: `Delivery ${id} is ${original.state}; only a failed attempt is replayed.`,
        retryable: false,
      })
    }
    if (endpoint.state !== 'enabled') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'replay_refused_endpoint_disabled',
        message: `Endpoint ${endpoint.id} is disabled; enable it before replaying.`,
        retryable: false,
      })
    }

    deliverySequence += 1
    const replay: WebhookDelivery = {
      id: `WHD-${deliverySequence}`,
      endpointId: original.endpointId,
      event: original.event,
      state: 'pending',
      attemptedAt: EYVAR_NOW,
      durationMs: null,
      statusCode: null,
      failure: null,
      canReplay: false,
      replayOf: original.id,
      subjectId: original.subjectId,
    }
    deliveries = [replay, ...deliveries]

    auditIntegrations('webhook.replay', {
      subjectType: 'webhook',
      subjectId: endpoint.id,
      detail: {
        key: 'admin.audit.integrations.webhookReplayed',
        params: { endpoint: endpoint.name, original: original.id, replay: replay.id },
      },
    })
    return withReplayability(replay)
  })
}

/* ─────────────────────────────── shared ────────────────────────────────── */

function validationError(
  code: string,
  details: Array<{ field: string; code: string; message: string }>,
): ApiError {
  return new ApiError({
    status: 422,
    kind: 'validation',
    code,
    message: `Integrations request failed validation: ${details.map((d) => d.field).join(', ')}`,
    details,
    retryable: false,
  })
}
