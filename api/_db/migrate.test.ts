/**
 * AC-1271: migrations apply on PGlite from empty and are idempotent on a
 * second run. `pgcrypto` is loaded as a PGlite extension because
 * `0001_analytics.sql` calls `CREATE EXTENSION pgcrypto` for `audit_log`'s
 * default id.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { migrate } from './migrate.mjs'

let db: PGlite | undefined

afterEach(async () => {
  await db?.close()
  db = undefined
})

function adapterFor(pglite: PGlite) {
  return {
    run: (sql: string) => pglite.exec(sql).then(() => undefined),
    query: (sql: string, params: unknown[]) => pglite.query(sql, params),
  }
}

describe('api/_db/migrate.mjs', () => {
  it('applies 0001_analytics.sql from empty and records it', async () => {
    db = new PGlite({ extensions: { pgcrypto } })
    const adapter = adapterFor(db)

    const applied = await migrate(adapter)
    expect(applied).toContain('0001_analytics.sql')

    const tables = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    )
    const names = tables.rows.map((r) => r.table_name)
    expect(names).toContain('schema_migrations')
    expect(names).toContain('audit_log')

    const recorded = await db.query<{ name: string }>('SELECT name FROM schema_migrations')
    expect(recorded.rows.map((r) => r.name)).toContain('0001_analytics.sql')
  })

  it('is idempotent on a second run', async () => {
    db = new PGlite({ extensions: { pgcrypto } })
    const adapter = adapterFor(db)

    await migrate(adapter)
    const secondRun = await migrate(adapter)

    expect(secondRun).toEqual([])
    const recorded = await db.query('SELECT name FROM schema_migrations')
    expect(recorded.rows).toHaveLength(1)
  })
})
