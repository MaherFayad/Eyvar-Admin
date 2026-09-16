/**
 * Proves `migrateDashboardsToPages` two ways: a safe no-op against every
 * database this WP can reach (no `dashboards` table exists yet, F-V2-29),
 * and correct once one exists, shaped like `Dashboard`.
 */
import { afterEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { migrateDashboardsToPages } from './migrateDashboardsToPages'

let pglite: PGlite
let db: Database

afterEach(async () => {
  await pglite.close()
})

async function setup(): Promise<void> {
  const created = await createTestDatabase()
  pglite = created.pglite
  db = created.db
}

describe('migrateDashboardsToPages', () => {
  it('is a no-op when no dashboards table exists', async () => {
    await setup()
    const migrated = await migrateDashboardsToPages(db)
    expect(migrated).toBe(0)
  })

  it('converts a dashboards row to a page via dashboardToPage, and rebuilds page_reports', async () => {
    await setup()
    const owner = await seedUser(db, { email: 'dash-owner@eyvar.test', password: 'pw', roleId: 'Owner' })

    await db.sql`
      CREATE TABLE dashboards (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, owner_id TEXT NOT NULL,
        tiles_json JSONB NOT NULL, range_json JSONB, filters_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
      )
    `
    const tiles = [
      { tileId: 't1', reportId: 'RPT-1', pinnedName: 'Trips', order: 0, span: 'full' },
      { tileId: 't2', reportId: 'RPT-2', pinnedName: 'Riders', order: 1, span: 'half' },
      { tileId: 't3', reportId: 'RPT-3', pinnedName: 'Drivers', order: 2, span: 'half' },
    ]
    await db.sql`
      INSERT INTO dashboards (id, name, description, owner_id, tiles_json, range_json, filters_json, created_at, updated_at)
      VALUES ('dash-1', 'Ops board', 'Daily ops numbers', ${owner.id}, ${JSON.stringify(tiles)}, NULL, '[]', now(), now())
    `

    const migrated = await migrateDashboardsToPages(db)
    expect(migrated).toBe(1)

    const pages = await db.sql<{ id: string; title: string; kind: string; visibility: string; version: number }>`
      SELECT id, title, kind, visibility, version FROM pages WHERE id = 'dash-1'
    `
    expect(pages).toHaveLength(1)
    expect(pages[0]).toMatchObject({ id: 'dash-1', title: 'Ops board', kind: 'dashboard', visibility: 'team', version: 1 })

    // One full tile stands alone; the two half tiles pair into one columns block — three reportIds, all indexed.
    const pinned = await db.sql<{ report_id: string }>`SELECT report_id FROM page_reports WHERE page_id = 'dash-1' ORDER BY report_id`
    expect(pinned.map((r) => r.report_id)).toEqual(['RPT-1', 'RPT-2', 'RPT-3'])

    // Idempotent: a second run inserts nothing new.
    const secondRun = await migrateDashboardsToPages(db)
    expect(secondRun).toBe(0)
    const countRows = await db.sql<{ count: string }>`SELECT count(*)::text AS count FROM pages WHERE id = 'dash-1'`
    expect(countRows[0]!.count).toBe('1')
  })
})
