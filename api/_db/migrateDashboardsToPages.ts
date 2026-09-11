/**
 * The one-time companion to `0006_pages.sql` — `03-pages-and-dashboards.md`
 * §2: "The backend runs [`dashboardToPage`] once in migration
 * `0003_pages.sql`'s companion script" (the file that doc names is stale;
 * this WP's own migration is `0006_pages.sql`, the numbering having moved
 * on under concurrent WPs — same job). `dashboardToPage`
 * (`src/data/reporting/pages/migrate.ts`) is pure and reused verbatim here,
 * never reimplemented.
 *
 * **No production `dashboards` table exists yet.** A v1 `Dashboard` today
 * lives only in the frontend's mock fixtures (`src/data/fixtures/reports.ts`)
 * — nothing has migrated it into Postgres, so this function is a no-op
 * against every database this WP has access to. It is written and tested
 * against a `dashboards` table shaped like `Dashboard` (§3's own sketch),
 * guarded by an `information_schema` check so a database with no such table
 * is left alone rather than erroring, and is ready the moment one exists.
 *
 * **Not wired into `npm run db:migrate`.** That CLI (`api/_db/migrate.mjs`)
 * is plain `.mjs`, applying `.sql` files with no TypeScript loader — it
 * cannot `import` this module or `dashboardToPage` without one, and this WP
 * may not add a dependency (`package.json` is outside `api/**`). Run it
 * explicitly instead, from a one-off Node script or a `vitest`-driven task,
 * once a real `dashboards` table is populated. Named in this WP's final
 * report as a deferral for the owner.
 */
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
 * Converts every `dashboards` row to a `Page` via `dashboardToPage` and
 * inserts it, rebuilding `page_reports` for each. `dashboardToPage` reuses
 * the dashboard's own id (§2), so a second run inserts nothing new
 * (`ON CONFLICT (id) DO NOTHING`) — idempotent, like every migration step
 * (AC-1271's rule, honoured here even though this is not a `.sql` file the
 * migration runner tracks). Returns how many pages this run wrote.
 */
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
