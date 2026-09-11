#!/usr/bin/env node
/**
 * Applies every `NNNN_name.sql` file in `api/_db/migrations/` in name order,
 * recording each in `schema_migrations`. Re-running is a no-op for files
 * already recorded (`05-backend.md` §1 "Schema management").
 *
 * `migrate(adapter)` is the reusable core — `api/_db/migrate.test.ts` calls
 * it directly against PGlite. `main()` below is the `db:migrate` CLI, which
 * runs it against `DATABASE_URL` with `pg`.
 */

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

/**
 * `adapter.run(sql)` executes a (possibly multi-statement) migration file.
 * `adapter.query(sql, params)` executes one parameterised statement and
 * returns `{ rows }`. Two methods, not one, because PGlite's `.query()`
 * accepts only a single statement — multi-statement migration files need
 * `.exec()` there and the simple-query protocol (no params) on `pg`.
 */
export async function migrate(adapter) {
  await adapter.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
  const appliedRows = await adapter.query('SELECT name FROM schema_migrations', [])
  const applied = new Set(appliedRows.rows.map((r) => r.name))

  const newlyApplied = []
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
    await adapter.run(sql)
    await adapter.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
    newlyApplied.push(file)
  }
  return newlyApplied
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set')
    process.exitCode = 1
    return
  }

  const { default: pg } = await import('pg')
  const pool = new pg.Pool({ connectionString })
  const adapter = {
    run: (sql) => pool.query(sql).then(() => undefined),
    query: (sql, params) => pool.query(sql, params),
  }
  try {
    const applied = await migrate(adapter)
    console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'No new migrations')
  } finally {
    await pool.end()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
}
