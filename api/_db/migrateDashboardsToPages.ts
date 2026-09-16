/**
 * One-time companion to `0006_pages.sql`, reusing `dashboardToPage`
 * verbatim. No production `dashboards` table exists yet (safe no-op), and
 * this is not wired into `db:migrate` — that CLI is plain `.mjs` and cannot
 * import TypeScript (F-V2-29). Run it explicitly once one exists. */
import { dashboardToPage } from '@/data/reporting/pages/migrate'
import type { Dashboard } from '@/data/types/report'
import type { Database } from '../_lib/db'
import { collectReportIds } from '../_lib/handlers/pages'

interface DashboardRow {
  id: string
  name: string
  description: string | null
  owner_id: string
  tiles_json: unknown
  range_json: unknown
  filters_json: unknown
  created_at: string
  updated_at: string
}

function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return JSON.parse(value) as T
  return value as T
}

function toDashboard(row: DashboardRow): Dashboard {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    tiles: parseJsonColumn(row.tiles_json, []),
    range: parseJsonColumn(row.range_json, null),
    filters: parseJsonColumn(row.filters_json, []),
    createdAt: row.created_at as Dashboard['createdAt'],
    updatedAt: row.updated_at as Dashboard['updatedAt'],
  }
}

/**
 * Converts each `dashboards` row to a `Page` and inserts it, rebuilding
 * `page_reports`. `dashboardToPage` reuses the dashboard's own id, so a
 * second run inserts nothing new (`ON CONFLICT (id) DO NOTHING`) — idempotent
 * per AC-1271, though this file is not one the migration runner tracks. */
export async function migrateDashboardsToPages(db: Database): Promise<number> {
  const tableExists = await db.sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dashboards'
    ) AS exists
  `
  if (!tableExists[0]?.exists) return 0

  const rows = await db.sql<DashboardRow>`SELECT * FROM dashboards`
  let migrated = 0
  for (const row of rows) {
    const page = dashboardToPage(toDashboard(row))
    const inserted = await db.sql<{ id: string }>`
      INSERT INTO pages (id, kind, title, icon, description, owner_id, visibility, tags_json, official, scope_json, blocks_json, version, published_at, created_at, updated_at, updated_by)
      VALUES (${page.id}, ${page.kind}, ${page.title}, ${page.icon}, ${page.description}, ${page.ownerId}, ${page.visibility},
              ${JSON.stringify(page.tags)}, ${page.official}, ${JSON.stringify(page.scope)}, ${JSON.stringify(page.blocks)},
              ${page.version}, ${page.publishedAt}, ${page.createdAt}, ${page.updatedAt}, ${page.updatedBy})
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `
    if (inserted.length === 0) continue
    migrated += 1

    await db.sql`DELETE FROM page_reports WHERE page_id = ${page.id}`
    for (const reportId of collectReportIds(page.blocks)) {
      await db.sql`INSERT INTO page_reports (page_id, report_id) VALUES (${page.id}, ${reportId}) ON CONFLICT DO NOTHING`
    }
  }
  return migrated
}
