/**
 * Shared PGlite test harness: applies every migration, then hands back a
 * `Database` plus small seed helpers. Not itself a `*.test.ts` file, so
 * vitest's `include` glob never picks it up as a suite.
 */
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { migrate } from '../_db/migrate.mjs'
import { createPgliteDatabase, type Database } from '../_lib/db'
import { hashPassword } from '../_lib/password'

export async function createTestDatabase(): Promise<{ pglite: PGlite; db: Database }> {
  const pglite = new PGlite({ extensions: { pgcrypto } })
  const adapter = {
    run: (sql: string) => pglite.exec(sql).then(() => undefined),
    query: (sql: string, params: unknown[]) => pglite.query(sql, params),
  }
  await migrate(adapter)
  return { pglite, db: createPgliteDatabase(pglite) }
}

export interface SeededUser {
  id: string
  email: string
  password: string
  roleId: string
}

/** `roleId` must be one of the six built-in role ids `0002_auth.sql` seeds (`'Owner'`, `'Support'`, …). `secondFactorMethod`/`phone` are WP-6.2b's columns (`0004_team.sql`), optional so every pre-existing call site still type-checks. */
export async function seedUser(
  db: Database,
  opts: {
    email: string
    password: string
    roleId: string
    status?: 'Active' | 'Invited' | 'Suspended'
    secondFactorMethod?: 'sms' | 'totp' | null
    phone?: string | null
  },
): Promise<SeededUser> {
  const passwordHash = await hashPassword(opts.password)
  const rows = await db.sql<{ id: string }>`
    INSERT INTO users (email, name_en, name_ar, password_hash, role_id, status, second_factor_method, phone)
    VALUES (
      ${opts.email}, ${opts.email}, ${opts.email}, ${passwordHash}, ${opts.roleId}, ${opts.status ?? 'Active'},
      ${opts.secondFactorMethod ?? null}, ${opts.phone ?? null}
    )
    RETURNING id
  `
  return { id: rows[0]!.id, email: opts.email, password: opts.password, roleId: opts.roleId }
}

export async function seedSession(
  db: Database,
  opts: { userId: string; lastSeenAt?: Date; expiresAt?: Date; revoked?: boolean },
): Promise<string> {
  const rows = await db.sql<{ id: string }>`
    INSERT INTO sessions (user_id, last_seen_at, expires_at, revoked_at)
    VALUES (
      ${opts.userId},
      ${(opts.lastSeenAt ?? new Date()).toISOString()},
      ${(opts.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).toISOString()},
      ${opts.revoked ? new Date().toISOString() : null}
    )
    RETURNING id
  `
  return rows[0]!.id
}
