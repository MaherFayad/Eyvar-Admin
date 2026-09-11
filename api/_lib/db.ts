/**
 * The Postgres seam — `05-backend.md` §1: Neon's HTTP driver for request
 * handlers (no pool, survives Fluid Compute), `pg` + `attachDatabasePool` for
 * the long-running cron functions, and PGlite for tests. All three implement
 * `Database`, so `api/_lib/compile.ts` and every handler (WP-6.2+) write one
 * `db.sql` tagged template and never import a driver directly.
 */

import { neon } from '@neondatabase/serverless'
import { Pool } from 'pg'
import { attachDatabasePool } from '@vercel/functions'

export interface Database {
  /** `` await db.sql`SELECT * FROM measures WHERE key = ${key}` ``. Positional params only — never string-concatenate a value in. */
  sql<T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>
  /** Closes the underlying connection. No-op for the HTTP driver, which holds none open. */
  close(): Promise<void>
}

type RawQuery = (text: string, values: unknown[]) => Promise<unknown[]>

/** Turns a tagged template into `$1 $2 …` positional SQL text plus a values array, then delegates to `rawQuery`. */
function makeSqlTag(rawQuery: RawQuery): Database['sql'] {
  return async function sql<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> {
    let text = strings[0] ?? ''
    for (let i = 0; i < values.length; i++) {
      text += `$${i + 1}${strings[i + 1] ?? ''}`
    }
    return (await rawQuery(text, values)) as T[]
  }
}

/** Production request handlers: `@neondatabase/serverless` over HTTP, no pool to leak. */
export function createNeonDatabase(connectionString: string): Database {
  const neonSql = neon(connectionString)
  return {
    sql: makeSqlTag((text, values) => neonSql.query(text, values) as Promise<unknown[]>),
    close: async () => {
      // The HTTP driver holds no connection open between calls.
    },
  }
}

/** Cron functions that run long: a real `pg.Pool`, registered with `attachDatabasePool` so a suspended invocation still drains it (05-backend.md §1). */
export function createPgPoolDatabase(connectionString: string): Database {
  const pool = new Pool({ connectionString })
  attachDatabasePool(pool)
  return {
    sql: makeSqlTag(async (text, values) => (await pool.query(text, values)).rows),
    close: () => pool.end(),
  }
}

/**
 * Wraps an already-constructed PGlite instance (or any object with the same
 * `.query()` shape) so tests run the identical `Database` interface against
 * in-process Postgres. The instance's lifecycle is the caller's — `close()`
 * here is a no-op so one PGlite instance can back several `Database` wrappers
 * in a test file.
 */
export function createPgliteDatabase(pglite: {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>
}): Database {
  return {
    sql: makeSqlTag(async (text, values) => (await pglite.query(text, values)).rows),
    close: async () => {
      // The test owns the PGlite instance's lifecycle, not this wrapper.
    },
  }
}

/** `DATABASE_URL` → the Neon HTTP driver, matching what a request handler runs against in production. */
export function createDatabaseFromEnv(): Database {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  return createNeonDatabase(connectionString)
}
