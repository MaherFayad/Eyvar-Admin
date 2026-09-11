/**
 * `annotations.*` — WP-6.5 (`05-backend.md` §3, §7). A marked date on a
 * trend chart (`src/data/types/annotation.ts`'s `Annotation`), returned
 * verbatim — the type and the table agree field for field.
 *
 * Only list, create and delete exist (`05-backend.md` §7's endpoint list
 * has no `GET /:id` or `PATCH` for this resource) — an annotation is
 * replaced by deleting and re-adding, never edited in place.
 */
import type { ApiErrorDetail } from '../errors'
import { notFoundError, validationError } from '../errors'
import { jsonResponse, paginated, resolveOffsetPage, single } from '../envelope'
import { requirePermission, type RequestContext } from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'
import type { Annotation, AnnotationKind } from '@/data/types/annotation'
import type { PermissionKey } from '@/data/types/navigation'

/** `manage_analytics` is not yet minted (D17) — see `handlers/pages.ts`'s identical note. */
const WRITE_PERMISSION: PermissionKey = 'view_analytics'
const READ_PERMISSION: PermissionKey = 'view_analytics'

const VALID_KINDS: readonly AnnotationKind[] = ['launch', 'price', 'incident', 'campaign', 'other']

interface AnnotationRow {
  id: string
  date: string
  label: string
  note: string
  kind: string
  created_by: string
  created_at: string
}

function toAnnotation(row: AnnotationRow): Annotation {
  return {
    id: row.id,
    date: row.date,
    label: row.label,
    note: row.note,
    kind: row.kind as AnnotationKind,
    createdBy: row.created_by,
    createdAt: row.created_at,
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

/** GET /api/v1/annotations  params: from · to (IsoDate, inclusive) · page · pageSize  -> Paginated<Annotation> */
export function createListAnnotationsHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    requirePermission(ctx, READ_PERMISSION)
    const rows = await db.sql<AnnotationRow>`SELECT * FROM annotations ORDER BY date DESC`

    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    let annotations = rows.map(toAnnotation)
    if (from) annotations = annotations.filter((a) => a.date >= from)
    if (to) annotations = annotations.filter((a) => a.date <= to)

    const { page, pageSize, offset, limit } = resolveOffsetPage({
      page: numberParam(url, 'page'),
      pageSize: numberParam(url, 'pageSize'),
    })
    const items = annotations.slice(offset, offset + limit)
    return jsonResponse(paginated(items, annotations.length, page, pageSize))
  }
}

/** POST /api/v1/annotations  body: { date, label, note, kind }  -> Single<Annotation>, 201 */
export function createCreateAnnotationHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const body = await parseJsonBody(req)

    const date = typeof body.date === 'string' ? body.date : ''
    const label = typeof body.label === 'string' ? body.label.trim() : ''
    const note = typeof body.note === 'string' ? body.note : ''
    const kind = typeof body.kind === 'string' && (VALID_KINDS as readonly string[]).includes(body.kind)
      ? (body.kind as AnnotationKind)
      : null

    const details: ApiErrorDetail[] = []
    if (!date) details.push({ field: 'date', code: 'required', message: 'date is required' })
    if (!label) details.push({ field: 'label', code: 'required', message: 'label is required' })
    if (!kind) details.push({ field: 'kind', code: 'invalid', message: `kind must be one of ${VALID_KINDS.join(', ')}` })
    if (details.length > 0) throw validationError(details)

    const inserted = await db.sql<AnnotationRow>`
      INSERT INTO annotations (date, label, note, kind, created_by)
      VALUES (${date}, ${label}, ${note}, ${kind}, ${operator.userId})
      RETURNING *
    `
    return jsonResponse(single(toAnnotation(inserted[0]!)), 201)
  }
}

/** DELETE /api/v1/annotations/:id -> { deleted: true } */
export function createDeleteAnnotationHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, WRITE_PERMISSION)
    const id = ctx.params.id ?? ''
    const deleted = await db.sql<{ id: string }>`DELETE FROM annotations WHERE id = ${id} RETURNING id`
    if (deleted.length === 0) throw notFoundError(`annotation ${id}`)
    return jsonResponse({ deleted: true })
  }
}
