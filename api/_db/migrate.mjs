#!/usr/bin/env node
/**
 * Applies each `api/_db/migrations/NNNN_name.sql` file in order, recording it
 * in `schema_migrations` so a rerun is a no-op (AC-1271). `migrate(adapter)`
 * is the reusable core; `main()` is the `db:migrate` CLI, run against `pg`.
 */

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

/**
 * Two methods, not one: PGlite's `.query()` takes only a single statement, so
 * a multi-statement file needs `adapter.run` while `adapter.query(sql, params)`
 * runs one parameterised statement (AC-1271).
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
