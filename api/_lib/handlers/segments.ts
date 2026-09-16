/**
 * `segments.*` (05-backend.md §3, §7): a saved, reusable population filter,
 * returned verbatim — `Segment` has no field this schema cannot round-trip,
 * so there is no separate wire shape the way `reports.ts` needs one.
 */
import type { ApiErrorDetail } from '../errors'
import { notFoundError, validationError } from '../errors'
import { jsonResponse, paginated, resolveOffsetPage, single } from '../envelope'
import { requirePermission, type RequestContext } from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'
import type { PerformedSpec, Segment, SegmentVisibility } from '@/data/types/segment'
import type { FilterSpec } from '@/data/types/common'
import type { PermissionKey } from '@/data/types/navigation'
import { recordAudit } from '../audit'

/** `manage_analytics` is not yet minted (D17) — see `handlers/pages.ts`'s identical note. */
const WRITE_PERMISSION: PermissionKey = 'view_analytics'
const READ_PERMISSION: PermissionKey = 'view_analytics'

interface SegmentRow {
  id: string
  name: string
  description: string | null
  filters_json: unknown
  performed_json: unknown
  owner_id: string
  visibility: string
}

function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return JSON.parse(value) as T
  return value as T
}

function toSegment(row: SegmentRow): Segment {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    filters: parseJsonColumn<FilterSpec[]>(row.filters_json, []),
    performed: parseJsonColumn<PerformedSpec | null>(row.performed_json, null),
    ownerId: row.owner_id,
    visibility: row.visibility as SegmentVisibility,
  }
}

async function parseJsonBody(req: Request): Promise<Record<string, unknown>> {
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

function readableBy(row: { visibility: string; owner_id: string }, userId: string): boolean {
  return row.visibility === 'team' || row.owner_id === userId
}

function validationDetail(field: string, message: string): ApiErrorDetail {
  return { field, code: 'required', message }
}

/* ─────────────────────────── handlers ────────────────────────────────── */

/** GET /api/v1/segments  params: q · view=mine|team · page · pageSize  -> Paginated<Segment> */
export function createListSegmentsHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, READ_PERMISSION)
    const rows = await db.sql<SegmentRow>`SELECT * FROM segments ORDER BY updated_at DESC`

    const url = new URL(req.url)
    const view = url.searchParams.get('view')
    const q = url.searchParams.get('q')?.trim().toLowerCase()

    let visible = rows.filter((r) => readableBy(r, operator.userId))
    if (view === 'mine') visible = visible.filter((r) => r.owner_id === operator.userId)
    if (view === 'team') visible = visible.filter((r) => r.visibility === 'team')

    let segments = visible.map(toSegment)
    if (q) segments = segments.filter((s) => s.name.toLowerCase().includes(q))

    const { page, pageSize, offset, limit } = resolveOffsetPage({
      page: numberParam(url, 'page'),
      pageSize: numberParam(url, 'pageSize'),
    })
    const items = segments.slice(offset, offset + limit)
    return jsonResponse(paginated(items, segments.length, page, pageSize))
  }
}

/** GET /api/v1/segments/:id -> Single<Segment>. A private segment not owned by the caller 404s. */
export function createGetSegmentHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, READ_PERMISSION)
    const rows = await db.sql<SegmentRow>`SELECT * FROM segments WHERE id = ${ctx.params.id ?? ''}`
    const row = rows[0]
    if (!row || !readableBy(row, operator.userId)) throw notFoundError(`segment ${ctx.params.id}`)
    return jsonResponse(single(toSegment(row)))
  }
}

/** POST /api/v1/segments  body: { name, description?, filters, performed?, visibility? }  -> Single<Segment>, 201 */
export function createCreateSegmentHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const body = await parseJsonBody(req)

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) throw validationError([validationDetail('name', 'Name is required')])

    const description = typeof body.description === 'string' ? body.description : null
    const filters = Array.isArray(body.filters) ? (body.filters as FilterSpec[]) : []
    const performed = (body.performed as PerformedSpec | null | undefined) ?? null
    const visibility: SegmentVisibility = body.visibility === 'team' ? 'team' : 'private'

    const inserted = await db.sql<SegmentRow>`
      INSERT INTO segments (name, description, filters_json, performed_json, owner_id, visibility)
      VALUES (${name}, ${description}, ${JSON.stringify(filters)}, ${performed ? JSON.stringify(performed) : null},
              ${operator.userId}, ${visibility})
      RETURNING *
    `
    const row = inserted[0]!
    await recordAudit(db, { userId: operator.userId, action: 'segment.create', entityType: 'segment', entityId: row.id, summary: { name } })
    return jsonResponse(single(toSegment(row)), 201)
  }
}

/** PATCH /api/v1/segments/:id  body: { name?, description?, filters?, performed?, visibility? }  -> Single<Segment> */
export function createUpdateSegmentHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const id = ctx.params.id ?? ''
    const body = await parseJsonBody(req)

    const existingRows = await db.sql<SegmentRow>`SELECT * FROM segments WHERE id = ${id}`
    const existing = existingRows[0]
    if (!existing) throw notFoundError(`segment ${id}`)

    const name = typeof body.name === 'string' ? body.name.trim() : existing.name
    if (!name) throw validationError([validationDetail('name', 'Name is required')])
    const description = 'description' in body ? ((body.description as string | null) ?? null) : existing.description
    const filters = Array.isArray(body.filters) ? (body.filters as FilterSpec[]) : parseJsonColumn(existing.filters_json, [])
    const performed = 'performed' in body
      ? ((body.performed as PerformedSpec | null | undefined) ?? null)
      : parseJsonColumn<PerformedSpec | null>(existing.performed_json, null)
    const visibility = body.visibility === 'team' || body.visibility === 'private' ? body.visibility : existing.visibility

    const updated = await db.sql<SegmentRow>`
      UPDATE segments SET
        name = ${name}, description = ${description}, filters_json = ${JSON.stringify(filters)},
        performed_json = ${performed ? JSON.stringify(performed) : null}, visibility = ${visibility}, updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `
    await recordAudit(db, { userId: operator.userId, action: 'segment.update', entityType: 'segment', entityId: id, summary: { name } })
    return jsonResponse(single(toSegment(updated[0]!)))
  }
}

/** DELETE /api/v1/segments/:id -> { deleted: true } */
export function createDeleteSegmentHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const id = ctx.params.id ?? ''
    const deleted = await db.sql<{ id: string }>`DELETE FROM segments WHERE id = ${id} RETURNING id`
    if (deleted.length === 0) throw notFoundError(`segment ${id}`)
    await recordAudit(db, { userId: operator.userId, action: 'segment.delete', entityType: 'segment', entityId: id })
    return jsonResponse({ deleted: true })
  }
}
