/**
 * `webhooks.*` — WP-6.6 (`05-backend.md` §7, §1: "a webhook is a credential").
 * A rule's `slack` channel references a webhook by id, never a URL typed
 * into the rule; this is where that id is minted and where the plaintext
 * URL is encrypted before it ever reaches a row or a response.
 *
 * `list` never returns `urlEncrypted` or the decrypted URL — only `id`,
 * `name`, `createdBy`, `createdAt` — so a webhook, once created, cannot be
 * read back in a form that could be replayed anywhere but this app's own
 * delivery path.
 */
import { notFoundError, validationError } from '../errors'
import { jsonResponse, paginated, resolveOffsetPage, single } from '../envelope'
import { requirePermission, type RequestContext } from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'
import type { SecretsAdapter } from '../secrets'
import type { PermissionKey } from '@/data/types/navigation'
import { recordAudit } from '../audit'

/** Slack webhook creation is `manage_team` under Admin › Integrations (04-alerting-v2.md §2). */
const WRITE_PERMISSION: PermissionKey = 'manage_team'
const READ_PERMISSION: PermissionKey = 'view_analytics'

interface WebhookRow {
  id: string
  name: string
  url_encrypted: string
  created_by: string
  created_at: string
}

export interface WebhookWire {
  id: string
  name: string
  createdBy: string
  createdAt: string
}

function toWire(row: WebhookRow): WebhookWire {
  return { id: row.id, name: row.name, createdBy: row.created_by, createdAt: row.created_at }
}

async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const text = await req.text()
    if (!text) return {}
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function numberParam(url: URL, name: string): number | undefined {
  const raw = url.searchParams.get(name)
  if (raw === null) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

/** GET /api/v1/webhooks -> Paginated<WebhookWire>. Never the URL — see the file header. */
export function createListWebhooksHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    requirePermission(ctx, READ_PERMISSION)
    const rows = await db.sql<WebhookRow>`SELECT * FROM webhooks ORDER BY created_at DESC`
    const url = new URL(req.url)
    const { page, pageSize, offset, limit } = resolveOffsetPage({ page: numberParam(url, 'page'), pageSize: numberParam(url, 'pageSize') })
    const items = rows.slice(offset, offset + limit).map(toWire)
    return jsonResponse(paginated(items, rows.length, page, pageSize))
  }
}

/** POST /api/v1/webhooks  body: { name, url }  -> Single<WebhookWire>, 201. `url` is encrypted before the `INSERT`, never stored or logged plain. */
export function createCreateWebhookHandler(db: Database, secrets: SecretsAdapter): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const body = await readJsonBody(req)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const url = typeof body.url === 'string' ? body.url.trim() : ''
    if (!name) throw validationError([{ field: 'name', code: 'required', message: 'A webhook name is required' }])
    if (!url || !/^https:\/\//.test(url)) {
      throw validationError([{ field: 'url', code: 'invalid', message: 'A Slack webhook URL must be https://' }])
    }

    const encrypted = secrets.encrypt(url)
    const rows = await db.sql<WebhookRow>`
      INSERT INTO webhooks (name, url_encrypted, created_by) VALUES (${name}, ${encrypted}, ${operator.userId}) RETURNING *
    `
    const row = rows[0]!
    // Never the URL, plaintext or encrypted — see the file header.
    await recordAudit(db, { userId: operator.userId, action: 'webhook.create', entityType: 'webhook', entityId: row.id, summary: { name } })
    return jsonResponse(single(toWire(row)), 201)
  }
}

/** DELETE /api/v1/webhooks/:id -> void, 204 */
export function createDeleteWebhookHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const id = ctx.params.id ?? ''
    const deleted = await db.sql<{ id: string }>`DELETE FROM webhooks WHERE id = ${id} RETURNING id`
    if (deleted.length === 0) throw notFoundError(`webhook ${id}`)
    await recordAudit(db, { userId: operator.userId, action: 'webhook.delete', entityType: 'webhook', entityId: id })
    return new Response(null, { status: 204 })
  }
}
