/**
 * `pages.*` — WP-6.5 (`05-backend.md` §7; AC-1279, AC-1280, AC-1281).
 *
 * Every write runs the shared `validatePage()` (imported, never
 * reimplemented — the same function `03-pages-and-dashboards.md` §2 says
 * runs client-side and server-side on the identical JSONB) before touching
 * the database: an invalid page is refused with the validator's own codes
 * and nothing half-valid is ever stored (AC-1281).
 *
 * `PATCH` carries optimistic concurrency (AC-1279): the `UPDATE` is one
 * atomic statement guarded by `WHERE version = $expected`, so two writers
 * racing on the same page cannot both win — the loser gets a 409 naming
 * `details[0].code = 'stale'` and its write never lands, which is what lets
 * the client keep the operator's in-progress edits rather than silently
 * losing them to whoever committed first.
 *
 * `page_reports` (AC-1280) is rebuilt — deleted and re-inserted — on every
 * save, from the page's own `blocks`, never accumulated: a report dropped
 * from a page's blocks stops being "pinned" the moment that edit saves.
 */
import type { ApiErrorDetail } from '../errors'
import { conflictError, notFoundError, validationError } from '../errors'
import { jsonResponse, paginated, resolveOffsetPage, single } from '../envelope'
import { requirePermission, type RequestContext } from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'
import { validatePage, type PageViolation } from '@/data/reporting/pages/validate'
import type { Block, IconName, Page, PageKind, PageVisibility } from '@/data/types/page'
import type { FilterSpec } from '@/data/types/common'
import type { ReportWindow } from '@/data/types/report'
import type { PermissionKey } from '@/data/types/navigation'
import { recordAudit } from '../audit'

/**
 * `manage_analytics` (`02-report-builder-v2.md`, `annotation.ts`, `page.ts`)
 * is not yet a minted `PermissionKey` (D17) — every write here is gated on
 * the one analytics key that exists today. Named as a gap in this WP's
 * report; swapping it in later is a one-line change once the navigation
 * owner mints the key.
 */
const WRITE_PERMISSION: PermissionKey = 'view_analytics'
const READ_PERMISSION: PermissionKey = 'view_analytics'

/* ─────────────────────────── row shape ─────────────────────────────── */

interface PageRow {
  id: string
  kind: string
  title: string
  icon: string | null
  description: string | null
  owner_id: string
  visibility: string
  tags_json: unknown
  official: boolean
  scope_json: unknown
  blocks_json: unknown
  version: number
  published_at: string | null
  created_at: string
  updated_at: string
  updated_by: string
}

function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return JSON.parse(value) as T
  return value as T
}

function toPage(row: PageRow): Page {
  return {
    id: row.id,
    kind: row.kind as PageKind,
    title: row.title,
    icon: row.icon as IconName | null,
    description: row.description,
    ownerId: row.owner_id,
    visibility: row.visibility as PageVisibility,
    tags: parseJsonColumn<string[]>(row.tags_json, []),
    official: row.official,
    scope: parseJsonColumn<{ range: ReportWindow | null; filters: FilterSpec[] }>(row.scope_json, {
      range: null,
      filters: [],
    }),
    blocks: parseJsonColumn<Block[]>(row.blocks_json, []),
    version: row.version,
    publishedAt: row.published_at as Page['publishedAt'],
    createdAt: row.created_at as Page['createdAt'],
    updatedAt: row.updated_at as Page['updatedAt'],
    updatedBy: row.updated_by,
  }
}

/**
 * Every `reportId` a page embeds through a `report` or `metric` block,
 * recursively through `toggle`/`columns` nesting (§2 allows both to hold
 * either). `bookmark` is excluded on purpose — it links to a report, the
 * way a hyperlink does, and is not an embed a report's own deletion should
 * be blocked by.
 */
export function collectReportIds(blocks: readonly Block[]): string[] {
  const ids = new Set<string>()
  const visit = (list: readonly Block[]): void => {
    for (const block of list) {
      if (block.type === 'report' || block.type === 'metric') ids.add(block.reportId)
      if (block.type === 'toggle') visit(block.blocks)
      if (block.type === 'columns') for (const column of block.columns) visit(column.blocks)
    }
  }
  visit(blocks)
  return Array.from(ids)
}

/** AC-1280: deletes and re-inserts, so the index always reflects the blocks just saved, never a history of every block a page ever held. */
export async function rebuildPageReports(db: Database, pageId: string, blocks: readonly Block[]): Promise<void> {
  await db.sql`DELETE FROM page_reports WHERE page_id = ${pageId}`
  for (const reportId of collectReportIds(blocks)) {
    await db.sql`INSERT INTO page_reports (page_id, report_id) VALUES (${pageId}, ${reportId}) ON CONFLICT DO NOTHING`
  }
}

function violationsToDetails(violations: PageViolation[]): ApiErrorDetail[] {
  return violations.map((v) => ({
    field: v.blockId ?? (v.path || 'blocks'),
    code: v.code,
    message: v.message,
  }))
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

function readableBy(row: PageRow, userId: string): boolean {
  return row.visibility === 'team' || row.owner_id === userId
}

async function fetchPageRow(db: Database, id: string): Promise<PageRow | null> {
  const rows = await db.sql<PageRow>`SELECT * FROM pages WHERE id = ${id}`
  return rows[0] ?? null
}

/* ─────────────────────────── handlers ────────────────────────────────── */

/** GET /api/v1/pages  params: q · kind · tag · view=mine|team · page · pageSize  -> Paginated<Page> */
export function createListPagesHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, READ_PERMISSION)
    const rows = await db.sql<PageRow>`SELECT * FROM pages ORDER BY updated_at DESC`

    const url = new URL(req.url)
    const view = url.searchParams.get('view')
    const kind = url.searchParams.get('kind')
    const tag = url.searchParams.get('tag')
    const q = url.searchParams.get('q')?.trim().toLowerCase()

    let visible = rows.filter((r) => readableBy(r, operator.userId))
    if (view === 'mine') visible = visible.filter((r) => r.owner_id === operator.userId)
    if (view === 'team') visible = visible.filter((r) => r.visibility === 'team')
    if (kind) visible = visible.filter((r) => r.kind === kind)

    let pages = visible.map(toPage)
    if (tag) pages = pages.filter((p) => p.tags.includes(tag))
    if (q) pages = pages.filter((p) => p.title.toLowerCase().includes(q))

    const { page, pageSize, offset, limit } = resolveOffsetPage({
      page: numberParam(url, 'page'),
      pageSize: numberParam(url, 'pageSize'),
    })
    const items = pages.slice(offset, offset + limit)
    return jsonResponse(paginated(items, pages.length, page, pageSize))
  }
}

/** GET /api/v1/pages/:id  -> Single<Page>. A private page not owned by the caller 404s rather than 403 — existence of another operator's private page is not disclosed. */
export function createGetPageHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, READ_PERMISSION)
    const row = await fetchPageRow(db, ctx.params.id ?? '')
    if (!row || !readableBy(row, operator.userId)) throw notFoundError(`page ${ctx.params.id}`)
    return jsonResponse(single(toPage(row)))
  }
}

/**
 * POST /api/v1/pages
 *   body: { kind, title, icon?, description?, visibility, tags?, official?, scope?, blocks? }
 *   -> Single<Page>, 201
 *
 * AC-1281: `validatePage` runs before any `INSERT` — a candidate that fails
 * validation is refused with the violations and never reaches the database.
 */
export function createCreatePageHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const body = await parseJsonBody(req)

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) throw validationError([{ field: 'title', code: 'required', message: 'Title is required' }])

    const kind: PageKind = body.kind === 'case-study' || body.kind === 'note' ? body.kind : 'dashboard'
    const visibility: PageVisibility = body.visibility === 'team' ? 'team' : 'private'
    const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : []
    const official = body.official === true
    const scope = (body.scope as Page['scope'] | undefined) ?? { range: null, filters: [] }
    const blocks = Array.isArray(body.blocks) ? (body.blocks as Block[]) : []
    const icon = typeof body.icon === 'string' ? (body.icon as IconName) : null
    const description = typeof body.description === 'string' ? body.description : null

    const nowIso = new Date().toISOString()
    const candidate: Page = {
      id: 'pending',
      kind,
      title,
      icon,
      description,
      ownerId: operator.userId,
      visibility,
      tags,
      official,
      scope,
      blocks,
      version: 1,
      publishedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      updatedBy: operator.userId,
    }
    const violations = validatePage(candidate)
    if (violations.length > 0) throw validationError(violationsToDetails(violations))

    const inserted = await db.sql<PageRow>`
      INSERT INTO pages (kind, title, icon, description, owner_id, visibility, tags_json, official, scope_json, blocks_json, updated_by)
      VALUES (${kind}, ${title}, ${icon}, ${description}, ${operator.userId}, ${visibility}, ${JSON.stringify(tags)},
              ${official}, ${JSON.stringify(scope)}, ${JSON.stringify(blocks)}, ${operator.userId})
      RETURNING *
    `
    const row = inserted[0]!
    await rebuildPageReports(db, row.id, blocks)
    await recordAudit(db, { userId: operator.userId, action: 'page.create', entityType: 'page', entityId: row.id, summary: { title, kind } })
    return jsonResponse(single(toPage(row)), 201)
  }
}

/**
 * PATCH /api/v1/pages/:id
 *   body: { title?, icon?, description?, visibility?, tags?, official?, scope?, blocks?, version }
 *   -> Single<Page>, or 409 { kind: 'conflict', details: [{ field: 'version', code: 'stale' }] } (AC-1279)
 */
export function createUpdatePageHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const id = ctx.params.id ?? ''
    const body = await parseJsonBody(req)

    const existingRow = await fetchPageRow(db, id)
    if (!existingRow) throw notFoundError(`page ${id}`)
    const existing = toPage(existingRow)

    const providedVersion = typeof body.version === 'number' ? body.version : null
    if (providedVersion === null) {
      throw validationError([{ field: 'version', code: 'required', message: 'version is required on every page write' }])
    }

    const merged: Page = {
      ...existing,
      title: typeof body.title === 'string' ? body.title.trim() || existing.title : existing.title,
      icon: 'icon' in body ? ((body.icon as IconName | null) ?? null) : existing.icon,
      description: 'description' in body ? ((body.description as string | null) ?? null) : existing.description,
      visibility: body.visibility === 'team' || body.visibility === 'private' ? body.visibility : existing.visibility,
      tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : existing.tags,
      official: typeof body.official === 'boolean' ? body.official : existing.official,
      scope: (body.scope as Page['scope'] | undefined) ?? existing.scope,
      blocks: Array.isArray(body.blocks) ? (body.blocks as Block[]) : existing.blocks,
    }

    const violations = validatePage(merged)
    if (violations.length > 0) throw validationError(violationsToDetails(violations))

    const updatedRows = await db.sql<PageRow>`
      UPDATE pages SET
        title = ${merged.title}, icon = ${merged.icon}, description = ${merged.description},
        visibility = ${merged.visibility}, tags_json = ${JSON.stringify(merged.tags)},
        official = ${merged.official}, scope_json = ${JSON.stringify(merged.scope)},
        blocks_json = ${JSON.stringify(merged.blocks)}, version = version + 1,
        updated_at = now(), updated_by = ${operator.userId}
      WHERE id = ${id} AND version = ${providedVersion}
      RETURNING *
    `
    if (updatedRows.length === 0) {
      const currentRows = await db.sql<{ version: number }>`SELECT version FROM pages WHERE id = ${id}`
      const current = currentRows[0]
      // Deleted between the fetch above and this statement — a 404, not a stale conflict.
      if (!current) throw notFoundError(`page ${id}`)
      throw conflictError(
        [
          {
            field: 'version',
            code: 'stale',
            message: `expected version ${providedVersion}, the page is now at version ${current.version}`,
          },
        ],
        'The page changed since you last loaded it',
      )
    }

    const row = updatedRows[0]!
    await rebuildPageReports(db, id, merged.blocks)
    await recordAudit(db, { userId: operator.userId, action: 'page.update', entityType: 'page', entityId: id, summary: { title: merged.title, version: row.version } })
    return jsonResponse(single(toPage(row)))
  }
}

/** DELETE /api/v1/pages/:id -> { deleted: true }. `page_reports`/`page_stars` cascade via FK. */
export function createDeletePageHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const id = ctx.params.id ?? ''
    const deleted = await db.sql<{ id: string }>`DELETE FROM pages WHERE id = ${id} RETURNING id`
    if (deleted.length === 0) throw notFoundError(`page ${id}`)
    await recordAudit(db, { userId: operator.userId, action: 'page.delete', entityType: 'page', entityId: id })
    return jsonResponse({ deleted: true })
  }
}

/** POST /api/v1/pages/:id/publish -> Single<Page>. Idempotent: publishing an already-published page returns it unchanged rather than erroring. */
export function createPublishPageHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const id = ctx.params.id ?? ''
    const existing = await fetchPageRow(db, id)
    if (!existing) throw notFoundError(`page ${id}`)
    if (existing.published_at !== null) return jsonResponse(single(toPage(existing)))

    const updated = await db.sql<PageRow>`
      UPDATE pages SET published_at = now(), version = version + 1, updated_at = now(), updated_by = ${operator.userId}
      WHERE id = ${id}
      RETURNING *
    `
    await recordAudit(db, { userId: operator.userId, action: 'page.publish', entityType: 'page', entityId: id })
    return jsonResponse(single(toPage(updated[0]!)))
  }
}

/** POST /api/v1/pages/:id/duplicate -> Single<Page>, 201. A fresh draft owned by the requester: `official: false`, `publishedAt: null`, `version: 1`. */
export function createDuplicatePageHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const id = ctx.params.id ?? ''
    const source = await fetchPageRow(db, id)
    if (!source || !readableBy(source, operator.userId)) throw notFoundError(`page ${id}`)

    const title = `${source.title} (copy)`
    const inserted = await db.sql<PageRow>`
      INSERT INTO pages (kind, title, icon, description, owner_id, visibility, tags_json, official, scope_json, blocks_json, updated_by)
      VALUES (${source.kind}, ${title}, ${source.icon}, ${source.description}, ${operator.userId}, ${source.visibility},
              ${JSON.stringify(parseJsonColumn(source.tags_json, []))}, false,
              ${JSON.stringify(parseJsonColumn(source.scope_json, { range: null, filters: [] }))},
              ${JSON.stringify(parseJsonColumn(source.blocks_json, []))}, ${operator.userId})
      RETURNING *
    `
    const row = inserted[0]!
    await rebuildPageReports(db, row.id, parseJsonColumn<Block[]>(row.blocks_json, []))
    await recordAudit(db, { userId: operator.userId, action: 'page.create', entityType: 'page', entityId: row.id, summary: { title, duplicatedFrom: id } })
    return jsonResponse(single(toPage(row)), 201)
  }
}

/** POST /api/v1/pages/:id/star -> { starred, starCount }. A toggle: starred if it was not, unstarred if it was. */
export function createStarPageHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, READ_PERMISSION)
    const id = ctx.params.id ?? ''
    const existing = await fetchPageRow(db, id)
    if (!existing) throw notFoundError(`page ${id}`)

    const already = await db.sql<{ page_id: string }>`
      SELECT page_id FROM page_stars WHERE page_id = ${id} AND user_id = ${operator.userId}
    `
    if (already.length > 0) {
      await db.sql`DELETE FROM page_stars WHERE page_id = ${id} AND user_id = ${operator.userId}`
    } else {
      await db.sql`INSERT INTO page_stars (page_id, user_id) VALUES (${id}, ${operator.userId}) ON CONFLICT DO NOTHING`
    }
    const countRows = await db.sql<{ count: string }>`SELECT count(*)::text AS count FROM page_stars WHERE page_id = ${id}`
    return jsonResponse({ starred: already.length === 0, starCount: Number(countRows[0]?.count ?? '0') })
  }
}
