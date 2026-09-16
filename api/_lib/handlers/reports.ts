/**
 * `reports.*`: the saved-report library (05-backend.md §7) — list/create/
 * get/update/delete, tags, star, duplicate, version history. `reports.run`/
 * `export`/`sample`/`contribution` live elsewhere (§6). AC-1280: `DELETE`
 * refuses, naming the pinning pages, reading `page_reports` directly. */
import { conflictError, notFoundError, validationError } from '../errors'
import { jsonResponse, paginated, resolveOffsetPage, single } from '../envelope'
import { requirePermission, type RequestContext } from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'
import { REPORT_NAME_MAX } from '@/data/types/report'
import type { PermissionKey } from '@/data/types/navigation'
import { recordAudit } from '../audit'

/** `manage_analytics` is not yet minted (D17) — see `handlers/pages.ts`'s identical note. */
const WRITE_PERMISSION: PermissionKey = 'view_analytics'
const READ_PERMISSION: PermissionKey = 'view_analytics'

const MAX_VERSIONS = 20

export interface SavedReportWire {
  id: string
  name: string
  description: string | null
  query: unknown
  ownerId: string
  visibility: 'private' | 'team'
  tags: string[]
  official: boolean
  createdAt: string
  updatedAt: string
  updatedBy: string
  lastRunAt: string | null
  /** Whether the requesting operator has starred this report. */
  starred: boolean
  starCount: number
  /** `page_reports` read back, never derived from scanning any page's blocks (AC-1280). */
  pinnedPageIds: string[]
}

interface ReportRow {
  id: string
  name: string
  description: string | null
  query_json: unknown
  owner_id: string
  visibility: string
  tags_json: unknown
  official: boolean
  created_at: string
  updated_at: string
  updated_by: string
  last_run_at: string | null
  starred: boolean
  star_count: string
}

function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return JSON.parse(value) as T
  return value as T
}

function toWire(row: ReportRow, pinnedPageIds: string[]): SavedReportWire {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    query: parseJsonColumn(row.query_json, null),
    ownerId: row.owner_id,
    visibility: row.visibility as 'private' | 'team',
    tags: parseJsonColumn<string[]>(row.tags_json, []),
    official: row.official,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    lastRunAt: row.last_run_at,
    starred: row.starred,
    starCount: Number(row.star_count ?? '0'),
    pinnedPageIds,
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

function validateName(name: unknown): string | null {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (trimmed.length === 0) return null
  if (trimmed.length > REPORT_NAME_MAX) return null
  return trimmed
}

async function fetchReportRow(db: Database, id: string, userId: string): Promise<ReportRow | null> {
  const rows = await db.sql<ReportRow>`
    SELECT r.*,
           EXISTS(SELECT 1 FROM saved_report_stars s WHERE s.report_id = r.id AND s.user_id = ${userId}) AS starred,
           (SELECT count(*)::text FROM saved_report_stars s2 WHERE s2.report_id = r.id) AS star_count
    FROM saved_reports r
    WHERE r.id = ${id}
  `
  return rows[0] ?? null
}

async function pinnedPageIdsOf(db: Database, reportId: string): Promise<string[]> {
  const rows = await db.sql<{ page_id: string }>`SELECT page_id FROM page_reports WHERE report_id = ${reportId}`
  return rows.map((r) => r.page_id)
}

async function insertVersion(db: Database, reportId: string, userId: string, query: unknown): Promise<void> {
  await db.sql`INSERT INTO saved_report_versions (report_id, by, query_json) VALUES (${reportId}, ${userId}, ${JSON.stringify(query)})`
  // Keep the newest MAX_VERSIONS; anything older than the Nth-newest row goes.
  await db.sql`
    DELETE FROM saved_report_versions
    WHERE report_id = ${reportId}
      AND at < (
        SELECT at FROM saved_report_versions WHERE report_id = ${reportId} ORDER BY at DESC OFFSET ${MAX_VERSIONS - 1} LIMIT 1
      )
  `
}

function readableBy(row: { visibility: string; owner_id: string }, userId: string): boolean {
  return row.visibility === 'team' || row.owner_id === userId
}

/* ─────────────────────────── handlers ────────────────────────────────── */

/** GET /api/v1/reports  params: q · view=mine|team · tag · page · pageSize  -> Paginated<SavedReportWire> */
export function createListReportsHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, READ_PERMISSION)
    const rows = await db.sql<ReportRow>`
      SELECT r.*,
             EXISTS(SELECT 1 FROM saved_report_stars s WHERE s.report_id = r.id AND s.user_id = ${operator.userId}) AS starred,
             (SELECT count(*)::text FROM saved_report_stars s2 WHERE s2.report_id = r.id) AS star_count
      FROM saved_reports r
      ORDER BY r.updated_at DESC
    `

    const url = new URL(req.url)
    const view = url.searchParams.get('view')
    const tag = url.searchParams.get('tag')
    const q = url.searchParams.get('q')?.trim().toLowerCase()

    let visible = rows.filter((r) => readableBy(r, operator.userId))
    if (view === 'mine') visible = visible.filter((r) => r.owner_id === operator.userId)
    if (view === 'team') visible = visible.filter((r) => r.visibility === 'team')

    let wires = visible.map((r) => toWire(r, []))
    if (tag) wires = wires.filter((w) => w.tags.includes(tag))
    if (q) wires = wires.filter((w) => w.name.toLowerCase().includes(q))

    const { page, pageSize, offset, limit } = resolveOffsetPage({
      page: numberParam(url, 'page'),
      pageSize: numberParam(url, 'pageSize'),
    })
    const items = wires.slice(offset, offset + limit)
    return jsonResponse(paginated(items, wires.length, page, pageSize))
  }
}

/** GET /api/v1/reports/:id -> Single<SavedReportWire>. A private report not owned by the caller 404s. */
export function createGetReportHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, READ_PERMISSION)
    const row = await fetchReportRow(db, ctx.params.id ?? '', operator.userId)
    if (!row || !readableBy(row, operator.userId)) throw notFoundError(`report ${ctx.params.id}`)
    const pinnedPageIds = await pinnedPageIdsOf(db, row.id)
    return jsonResponse(single(toWire(row, pinnedPageIds)))
  }
}

/** POST /api/v1/reports  body: { name, description?, query, visibility?, tags?, official? }  -> Single<SavedReportWire>, 201 */
export function createCreateReportHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const body = await parseJsonBody(req)

    const name = validateName(body.name)
    if (!name) {
      throw validationError([
        { field: 'name', code: 'invalid', message: `name must be 1–${REPORT_NAME_MAX} characters` },
      ])
    }
    if (typeof body.query !== 'object' || body.query === null) {
      throw validationError([{ field: 'query', code: 'required', message: 'query is required' }])
    }

    const description = typeof body.description === 'string' ? body.description : null
    const visibility = body.visibility === 'team' ? 'team' : 'private'
    const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : []
    const official = body.official === true

    const inserted = await db.sql<ReportRow>`
      INSERT INTO saved_reports (name, description, query_json, owner_id, visibility, tags_json, official, updated_by)
      VALUES (${name}, ${description}, ${JSON.stringify(body.query)}, ${operator.userId}, ${visibility},
              ${JSON.stringify(tags)}, ${official}, ${operator.userId})
      RETURNING *, false AS starred, '0' AS star_count
    `
    const row = inserted[0]!
    await insertVersion(db, row.id, operator.userId, body.query)
    await recordAudit(db, { userId: operator.userId, action: 'report.create', entityType: 'report', entityId: row.id, summary: { name } })
    return jsonResponse(single(toWire(row, [])), 201)
  }
}

/** PATCH /api/v1/reports/:id  body: { name?, description?, query?, visibility?, tags?, official? }  -> Single<SavedReportWire> */
export function createUpdateReportHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const id = ctx.params.id ?? ''
    const body = await parseJsonBody(req)

    const existing = await fetchReportRow(db, id, operator.userId)
    if (!existing) throw notFoundError(`report ${id}`)

    const name = 'name' in body ? validateName(body.name) : existing.name
    if (!name) {
      throw validationError([
        { field: 'name', code: 'invalid', message: `name must be 1–${REPORT_NAME_MAX} characters` },
      ])
    }
    const description = 'description' in body ? ((body.description as string | null) ?? null) : existing.description
    const query = 'query' in body ? body.query : parseJsonColumn(existing.query_json, null)
    const visibility = body.visibility === 'team' || body.visibility === 'private' ? body.visibility : existing.visibility
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((t): t is string => typeof t === 'string')
      : parseJsonColumn<string[]>(existing.tags_json, [])
    const official = typeof body.official === 'boolean' ? body.official : existing.official

    const updated = await db.sql<ReportRow>`
      UPDATE saved_reports SET
        name = ${name}, description = ${description}, query_json = ${JSON.stringify(query)},
        visibility = ${visibility}, tags_json = ${JSON.stringify(tags)}, official = ${official},
        updated_at = now(), updated_by = ${operator.userId}
      WHERE id = ${id}
      RETURNING *, ${existing.starred} AS starred, ${existing.star_count} AS star_count
    `
    const row = updated[0]!
    if ('query' in body) await insertVersion(db, id, operator.userId, query)
    const pinnedPageIds = await pinnedPageIdsOf(db, id)
    await recordAudit(db, { userId: operator.userId, action: 'report.update', entityType: 'report', entityId: id, summary: { name } })
    return jsonResponse(single(toWire(row, pinnedPageIds)))
  }
}

/**
 * DELETE /api/v1/reports/:id -> { deleted: true }, or 409 naming the pinning
 * pages (AC-1280). Reads `page_reports` directly, not a scan of every page's
 * `blocks_json`, so the refusal is cheap regardless of page count.
 */
export function createDeleteReportHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const id = ctx.params.id ?? ''

    const pinning = await db.sql<{ id: string; title: string }>`
      SELECT p.id, p.title FROM page_reports pr JOIN pages p ON p.id = pr.page_id WHERE pr.report_id = ${id}
    `
    if (pinning.length > 0) {
      throw conflictError(
        pinning.map((p) => ({ field: 'pageId', code: 'pinned', message: `${p.title} (${p.id})` })),
        `Refused: ${pinning.length} page(s) embed this report`,
      )
    }

    const deleted = await db.sql<{ id: string }>`DELETE FROM saved_reports WHERE id = ${id} RETURNING id`
    if (deleted.length === 0) throw notFoundError(`report ${id}`)
    await recordAudit(db, { userId: operator.userId, action: 'report.delete', entityType: 'report', entityId: id })
    return jsonResponse({ deleted: true })
  }
}

/** POST /api/v1/reports/:id/duplicate -> Single<SavedReportWire>, 201. A private, unstarred, unofficial copy owned by the requester. */
export function createDuplicateReportHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const id = ctx.params.id ?? ''
    const source = await fetchReportRow(db, id, operator.userId)
    if (!source || !readableBy(source, operator.userId)) throw notFoundError(`report ${id}`)

    const name = `${source.name} (copy)`
    const inserted = await db.sql<ReportRow>`
      INSERT INTO saved_reports (name, description, query_json, owner_id, visibility, tags_json, official, updated_by)
      VALUES (${name}, ${source.description}, ${JSON.stringify(parseJsonColumn(source.query_json, null))}, ${operator.userId},
              ${source.visibility}, ${JSON.stringify(parseJsonColumn(source.tags_json, []))}, false, ${operator.userId})
      RETURNING *, false AS starred, '0' AS star_count
    `
    const row = inserted[0]!
    await insertVersion(db, row.id, operator.userId, parseJsonColumn(source.query_json, null))
    await recordAudit(db, { userId: operator.userId, action: 'report.create', entityType: 'report', entityId: row.id, summary: { name, duplicatedFrom: id } })
    return jsonResponse(single(toWire(row, [])), 201)
  }
}

/** POST /api/v1/reports/:id/star -> { starred, starCount }. A toggle. */
export function createStarReportHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, READ_PERMISSION)
    const id = ctx.params.id ?? ''
    const existingRows = await db.sql<{ id: string }>`SELECT id FROM saved_reports WHERE id = ${id}`
    if (existingRows.length === 0) throw notFoundError(`report ${id}`)

    const already = await db.sql<{ report_id: string }>`
      SELECT report_id FROM saved_report_stars WHERE report_id = ${id} AND user_id = ${operator.userId}
    `
    if (already.length > 0) {
      await db.sql`DELETE FROM saved_report_stars WHERE report_id = ${id} AND user_id = ${operator.userId}`
    } else {
      await db.sql`INSERT INTO saved_report_stars (report_id, user_id) VALUES (${id}, ${operator.userId}) ON CONFLICT DO NOTHING`
    }
    const countRows = await db.sql<{ count: string }>`SELECT count(*)::text AS count FROM saved_report_stars WHERE report_id = ${id}`
    return jsonResponse({ starred: already.length === 0, starCount: Number(countRows[0]?.count ?? '0') })
  }
}

/** GET /api/v1/reports/:id/versions -> { items: Array<{ at, by, query }> }, newest first, capped at the last 20 (`saved_report_versions`). */
export function createGetReportVersionsHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, READ_PERMISSION)
    const id = ctx.params.id ?? ''
    const existingRows = await db.sql<{ id: string }>`SELECT id FROM saved_reports WHERE id = ${id}`
    if (existingRows.length === 0) throw notFoundError(`report ${id}`)

    const rows = await db.sql<{ at: string; by: string; query_json: unknown }>`
      SELECT at, by, query_json FROM saved_report_versions WHERE report_id = ${id} ORDER BY at DESC LIMIT ${MAX_VERSIONS}
    `
    return jsonResponse({
      items: rows.map((r) => ({ at: r.at, by: r.by, query: parseJsonColumn(r.query_json, null) })),
    })
  }
}
