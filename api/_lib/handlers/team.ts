/**
 * The operator lifecycle `src/data/clients/team.ts` declares — WP-6.2b,
 * finishing what WP-6.2 stubbed: invite · resend · revoke · suspend ·
 * reinstate · offboard, plus the permission override `clients/rbac.ts`
 * guards the same way (F-016). `toTeamUser` now returns every column
 * WP-6.2 had to send back `null` — `phone`, `photoUrl`, `secondFactor`,
 * `permissionDelta`, `compensationCapHalalas` — from `0004_team.sql`.
 *
 * ## F-016 is enforced in the database, not after a read
 *
 * *"The last holder of `manage_team` cannot be stripped of it, suspended, or
 * removed."* `suspendOperator`, `offboardOperator` and `setPermissionDelta`'s
 * revoking branch each run ONE atomic SQL statement that locks every active
 * `manage_team` holder (`FOR UPDATE`) before deciding — never a
 * read-then-write pair. Two concurrent requests each trying to remove the
 * last two holders serialise on that lock: the first to commit wins, the
 * second re-evaluates against the now-committed state and finds itself
 * removing the *actual* last holder, so its `WHERE` clause matches zero rows
 * and it is refused. A plain "check, then update" — even inside the same
 * request — cannot give that guarantee, because the check and the write are
 * two separate round trips a second request can land between.
 */
import type { TeamUser, TeamUserStatus, PermissionDelta } from '@/data/types/session'
import type { SecondFactor } from '@/data/types/auth'
import type { TeamInvite } from '@/data/types/team'
import type { PermissionKey } from '@/data/types/navigation'
import type { IsoDateTime } from '@/data/types/common'
import type { ApiErrorDetail } from '../errors'
import { HttpError, notFoundError, validationError } from '../errors'
import { jsonResponse } from '../envelope'
import { requirePermission, type RequestContext } from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'
import { generateToken } from '../otp'
import { hashPassword } from '../password'
import { createEmailAdapterFromEnv } from '../email'

const INVITE_TOKEN_DAYS = 7

function offsetFromNowIso(ms: number): IsoDateTime {
  return new Date(Date.now() + ms).toISOString() as IsoDateTime
}

async function parseJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await req.text()
    if (!text) return null
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** A refusal named as the rule it protects — `TeamGuardCode`/`RbacGuardCode` as the wire `code`, per `CONTRACT.md` §11. */
function refuse(code: string, message: string, field?: string): HttpError {
  const details: ApiErrorDetail[] = field ? [{ field, code, message }] : []
  return new HttpError(409, code, message, details, { kind: 'conflict', retryable: false })
}

const LAST_HOLDER_MESSAGE =
  'Refused: this is the last active operator holding `manage_team`. ' +
  'The last holder cannot be stripped of it, suspended or removed (F-016).'

async function deliverInviteEmail(to: string, token: string): Promise<void> {
  const adapter = createEmailAdapterFromEnv()
  await adapter.send({ to, subject: 'You are invited to Eyvar', html: `<p>Activation token: ${token}</p>` })
}

/* ───────────────────────────── row shape ───────────────────────────────── */

interface UserRow {
  id: string
  email: string
  name_en: string
  role_id: string
  status: string
  phone: string | null
  photo_url: string | null
  second_factor_method: 'sms' | 'totp' | null
  permission_granted: string[]
  permission_revoked: string[]
  compensation_cap_halalas: number | null
  last_login_at: string | null
  /** `role_permissions.permission_key` for `role_id`, `array_agg`'d — the baseline `permissionDelta` is signed against. */
  baseline: (string | null)[]
}

/**
 * `db.sql` is a tagged template: every `${}` becomes a bound `$n` parameter,
 * never spliced-in SQL text (there is no "raw fragment" escape hatch — see
 * `db.ts`'s `makeSqlTag`). So this SELECT is written out at each of its two
 * call sites rather than built from a shared string constant.
 */
async function fetchUserRow(db: Database, id: string): Promise<UserRow | null> {
  const rows = await db.sql<UserRow>`
    SELECT u.id, u.email, u.name_en, u.role_id, u.status, u.phone, u.photo_url,
           u.second_factor_method, u.permission_granted, u.permission_revoked,
           u.compensation_cap_halalas, u.last_login_at,
           array_remove(array_agg(rp.permission_key), NULL) AS baseline
    FROM users u
    LEFT JOIN role_permissions rp ON rp.role_id = u.role_id
    WHERE u.id = ${id}
    GROUP BY u.id
  `
  return rows[0] ?? null
}

async function fetchAllUserRows(db: Database): Promise<UserRow[]> {
  return db.sql<UserRow>`
    SELECT u.id, u.email, u.name_en, u.role_id, u.status, u.phone, u.photo_url,
           u.second_factor_method, u.permission_granted, u.permission_revoked,
           u.compensation_cap_halalas, u.last_login_at,
           array_remove(array_agg(rp.permission_key), NULL) AS baseline
    FROM users u
    LEFT JOIN role_permissions rp ON rp.role_id = u.role_id
    GROUP BY u.id
    ORDER BY u.name_en
  `
}

function maskPhone(phone: string | null): string {
  return phone ? `••••••${phone.slice(-2)}` : '••••••'
}

function secondFactorOf(row: UserRow): SecondFactor | null {
  if (!row.second_factor_method) return null
  return row.second_factor_method === 'totp'
    ? { method: 'totp', hint: 'Authenticator app' }
    : { method: 'sms', hint: maskPhone(row.phone) }
}

/** D17 — `permissionDelta` is `null` when both arrays are empty ("the role baseline exactly"), never an empty-but-present delta. */
function permissionDeltaOf(row: UserRow): PermissionDelta | null {
  if (row.permission_granted.length === 0 && row.permission_revoked.length === 0) return null
  return {
    role: row.role_id,
    granted: row.permission_granted as PermissionKey[],
    revoked: row.permission_revoked as PermissionKey[],
  }
}

/** Baseline union granted minus revoked — D17's `effectivePermissions`. */
function effectivePermissionsOf(row: UserRow): PermissionKey[] {
  const baseline = row.baseline.filter((p): p is string => p !== null) as PermissionKey[]
  const revoked = new Set(row.permission_revoked)
  const out = baseline.filter((key) => !revoked.has(key))
  for (const key of row.permission_granted as PermissionKey[]) {
    if (!revoked.has(key) && !out.includes(key)) out.push(key)
  }
  return out
}

function toTeamUser(row: UserRow): TeamUser {
  return {
    id: row.id,
    name: row.name_en,
    email: row.email,
    phone: row.phone,
    photoUrl: row.photo_url,
    role: row.role_id,
    lastLoginAt: row.last_login_at as IsoDateTime | null,
    status: row.status as TeamUserStatus,
    secondFactor: secondFactorOf(row),
    permissions: effectivePermissionsOf(row),
    permissionDelta: permissionDeltaOf(row),
    compensationCapHalalas: row.compensation_cap_halalas,
  }
}

/* ─────────────────────── who exists (session.teamUsers) ────────────────── */

/** GET /api/v1/team-users -> `{ items: TeamUser[] }` */
export function createListTeamUsersHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, 'manage_team')
    const rows = await fetchAllUserRows(db)
    return jsonResponse({ items: rows.map(toTeamUser) })
  }
}

/** GET /api/v1/team-users/:id -> `TeamUser` */
export function createGetTeamUserHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, 'manage_team')
    const row = await fetchUserRow(db, ctx.params.id ?? '')
    if (!row) throw notFoundError(`team user ${ctx.params.id}`)
    return jsonResponse(toTeamUser(row))
  }
}

/* ──────────────────────────── the lifecycle ───────────────────────────── */

/**
 * POST /api/v1/team/operators
 *   body: { name, email, phone, role, compensationCapHalalas }
 *   -> TeamUser
 *
 * Lands `Invited`, `secondFactor: null`, permissions from the role baseline
 * (never from the caller — a free permission set on an invite is out of
 * scope, D4). `capForRole`'s role-default policy is not reproduced; a
 * `compensationCapHalalas: null` on the input is left `null` (no cap) rather
 * than defaulted — named as a gap in WP-6.2b's report.
 */
export function createInviteOperatorHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    requirePermission(ctx, 'manage_team')
    const body = await parseJsonBody(req)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const phone = typeof body?.phone === 'string' && body.phone.trim() !== '' ? body.phone.trim() : null
    const role = typeof body?.role === 'string' ? body.role : ''
    const compensationCapHalalas = typeof body?.compensationCapHalalas === 'number' ? body.compensationCapHalalas : null

    const details: ApiErrorDetail[] = []
    if (!name) details.push({ field: 'name', code: 'required', message: 'Name is required' })
    if (!email) details.push({ field: 'email', code: 'required', message: 'Email is required' })
    if (!role) details.push({ field: 'role', code: 'required', message: 'Role is required' })
    if (details.length > 0) throw validationError(details)

    const existing = await db.sql<{ id: string }>`SELECT id FROM users WHERE lower(email) = ${email.toLowerCase()}`
    if (existing.length > 0) {
      throw refuse('email_taken', `An operator already exists with the email ${email}`, 'email')
    }
    const roleRows = await db.sql<{ id: string }>`SELECT id FROM roles WHERE id = ${role}`
    if (roleRows.length === 0) throw notFoundError(`role ${role}`)

    /* An `Invited` record cannot sign in — a random, unguessable placeholder rather than a nullable column. */
    const placeholderHash = await hashPassword(generateToken())
    const created = await db.sql<{ id: string }>`
      INSERT INTO users (email, name_en, name_ar, password_hash, role_id, status, phone, compensation_cap_halalas)
      VALUES (${email}, ${name}, ${name}, ${placeholderHash}, ${role}, 'Invited', ${phone}, ${compensationCapHalalas})
      RETURNING id
    `
    const userId = created[0]!.id
    const token = generateToken()
    await db.sql`
      INSERT INTO invites (user_id, email, token, expires_at)
      VALUES (${userId}, ${email}, ${token}, ${offsetFromNowIso(INVITE_TOKEN_DAYS * 24 * 60 * 60_000)})
    `
    await deliverInviteEmail(email, token)

    const row = await fetchUserRow(db, userId)
    if (!row) throw notFoundError(`operator ${userId}`)
    return jsonResponse(toTeamUser(row), 201)
  }
}

/**
 * POST /api/v1/team/invites/:userId/resend
 *   -> TeamInvite
 *
 * No state change on the operator. 409 on a record that is not `Invited`.
 */
export function createResendInviteHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, 'manage_team')
    const userId = ctx.params.userId ?? ''
    const userRows = await db.sql<{ email: string; status: string }>`SELECT email, status FROM users WHERE id = ${userId}`
    const user = userRows[0]
    if (!user) throw notFoundError(`operator ${userId}`)
    if (user.status !== 'Invited') throw refuse('not_invited', `Operator ${userId} has no outstanding invitation to resend`)

    const existingRows = await db.sql<{ token: string; resend_count: number }>`
      SELECT token, resend_count FROM invites WHERE user_id = ${userId}
    `
    const existing = existingRows[0]
    const token = existing?.token ?? generateToken()
    const resendCount = (existing?.resend_count ?? 0) + 1
    const expiresAt = offsetFromNowIso(INVITE_TOKEN_DAYS * 24 * 60 * 60_000)

    await db.sql`
      INSERT INTO invites (user_id, email, token, sent_at, expires_at, resend_count)
      VALUES (${userId}, ${user.email}, ${token}, now(), ${expiresAt}, ${resendCount})
      ON CONFLICT (user_id) DO UPDATE
        SET token = EXCLUDED.token, sent_at = now(), expires_at = EXCLUDED.expires_at, resend_count = EXCLUDED.resend_count
    `
    await deliverInviteEmail(user.email, token)

    return jsonResponse<TeamInvite>({
      userId,
      email: user.email,
      token,
      sentAt: new Date().toISOString() as IsoDateTime,
      expiresAt,
      resendCount,
    })
  }
}

/**
 * DELETE /api/v1/team/invites/:userId
 *   -> { revoked: true }
 *
 * The record goes with the invitation — an invitee has never signed in and
 * holds nothing. `ON DELETE CASCADE` removes the `invites` row too.
 */
export function createRevokeInviteHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, 'manage_team')
    const userId = ctx.params.userId ?? ''
    const userRows = await db.sql<{ status: string }>`SELECT status FROM users WHERE id = ${userId}`
    const user = userRows[0]
    if (!user) throw notFoundError(`operator ${userId}`)
    if (user.status !== 'Invited') throw refuse('not_invited', `Operator ${userId} has no outstanding invitation to revoke`)
    await db.sql`DELETE FROM users WHERE id = ${userId}`
    return jsonResponse({ revoked: true })
  }
}

/**
 * The three guarded writes below (`suspend`, `offboard`, `override`'s
 * revoking branch) each open with the same `WITH holders AS (...)` —
 * repeated verbatim rather than shared, because `db.sql` is a tagged
 * template with no raw-fragment splice (see `fetchUserRow`'s comment): the
 * `FOR UPDATE`-locked "who actively holds manage_team" set has to be written
 * inline in every statement that needs it.
 */

/**
 * POST /api/v1/team/operators/:id/suspend
 *   -> TeamUser
 *
 * F-016 applies. One atomic statement: lock every active `manage_team`
 * holder, then flip status only if the target is not the sole one.
 */
export function createSuspendOperatorHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, 'manage_team')
    const userId = ctx.params.id ?? ''
    const statusRows = await db.sql<{ status: string }>`SELECT status FROM users WHERE id = ${userId}`
    const current = statusRows[0]
    if (!current) throw notFoundError(`operator ${userId}`)
    if (current.status !== 'Active') throw refuse('not_active', `Operator ${userId} is ${current.status}, not Active`)

    const updated = await db.sql<{ id: string }>`
      WITH holders AS (
        SELECT u.id FROM users u
        WHERE u.status = 'Active'
          AND 'manage_team' = ANY(
            COALESCE((SELECT array_agg(rp.permission_key) FROM role_permissions rp WHERE rp.role_id = u.role_id), ARRAY[]::text[])
            || u.permission_granted
          )
          AND NOT ('manage_team' = ANY(u.permission_revoked))
        ORDER BY u.id
        FOR UPDATE OF u
      )
      UPDATE users SET status = 'Suspended'
      WHERE id = ${userId} AND status = 'Active'
        AND (
          NOT EXISTS (SELECT 1 FROM holders WHERE id = ${userId})
          OR (SELECT count(*) FROM holders) > 1
        )
      RETURNING id
    `
    if (updated.length === 0) throw refuse('last_manage_team_holder', LAST_HOLDER_MESSAGE)

    const row = await fetchUserRow(db, userId)
    if (!row) throw notFoundError(`operator ${userId}`)
    return jsonResponse(toTeamUser(row))
  }
}

/**
 * POST /api/v1/team/operators/:id/reinstate
 *   -> TeamUser
 *
 * Not guarded — reinstating can only raise the holder count.
 */
export function createReinstateOperatorHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, 'manage_team')
    const userId = ctx.params.id ?? ''
    const statusRows = await db.sql<{ status: string }>`SELECT status FROM users WHERE id = ${userId}`
    const current = statusRows[0]
    if (!current) throw notFoundError(`operator ${userId}`)
    if (current.status !== 'Suspended') throw refuse('not_suspended', `Operator ${userId} is ${current.status}, not Suspended`)

    await db.sql`UPDATE users SET status = 'Active' WHERE id = ${userId}`
    const row = await fetchUserRow(db, userId)
    if (!row) throw notFoundError(`operator ${userId}`)
    return jsonResponse(toTeamUser(row))
  }
}

/**
 * DELETE /api/v1/team/operators/:id
 *   -> { offboarded: true }
 *
 * F-016 applies, atomically as `suspend` — offboarding the last
 * administrator would lock every remaining operator out permanently.
 */
export function createOffboardOperatorHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, 'manage_team')
    const userId = ctx.params.id ?? ''
    const existing = await db.sql<{ id: string }>`SELECT id FROM users WHERE id = ${userId}`
    if (existing.length === 0) throw notFoundError(`operator ${userId}`)

    const deleted = await db.sql<{ id: string }>`
      WITH holders AS (
        SELECT u.id FROM users u
        WHERE u.status = 'Active'
          AND 'manage_team' = ANY(
            COALESCE((SELECT array_agg(rp.permission_key) FROM role_permissions rp WHERE rp.role_id = u.role_id), ARRAY[]::text[])
            || u.permission_granted
          )
          AND NOT ('manage_team' = ANY(u.permission_revoked))
        ORDER BY u.id
        FOR UPDATE OF u
      )
      DELETE FROM users WHERE id = ${userId}
        AND (
          NOT EXISTS (SELECT 1 FROM holders WHERE id = ${userId})
          OR (SELECT count(*) FROM holders) > 1
        )
      RETURNING id
    `
    if (deleted.length === 0) throw refuse('last_manage_team_holder', LAST_HOLDER_MESSAGE)
    return jsonResponse({ offboarded: true })
  }
}

/**
 * PUT /api/v1/team/operators/:id/override
 *   body: { granted, revoked }
 *   -> TeamUser
 *
 * The delta is signed against the operator's current role: a granted key the
 * baseline already holds, or a revoked key it never held, is dropped rather
 * than stored (`clients/rbac.ts`'s `setPermissionDelta`, verbatim). F-016
 * guards only the branch that would actually drop `manage_team` — granting
 * or leaving it alone never needs the lock.
 */
export function createSetPermissionDeltaHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    requirePermission(ctx, 'manage_team')
    const userId = ctx.params.id ?? ''
    const body = await parseJsonBody(req)
    const grantedInput = Array.isArray(body?.granted)
      ? (body.granted as unknown[]).filter((v): v is string => typeof v === 'string')
      : []
    const revokedInput = Array.isArray(body?.revoked)
      ? (body.revoked as unknown[]).filter((v): v is string => typeof v === 'string')
      : []

    const userRows = await db.sql<{ role_id: string }>`SELECT role_id FROM users WHERE id = ${userId}`
    const user = userRows[0]
    if (!user) throw notFoundError(`operator ${userId}`)

    const baselineRows = await db.sql<{ permission_key: string }>`
      SELECT permission_key FROM role_permissions WHERE role_id = ${user.role_id}
    `
    const baseline = new Set(baselineRows.map((r) => r.permission_key))
    const granted = Array.from(new Set(grantedInput)).filter((key) => !baseline.has(key))
    const revoked = Array.from(new Set(revokedInput)).filter((key) => baseline.has(key))
    const nextHoldsManageTeam = (baseline.has('manage_team') || granted.includes('manage_team')) && !revoked.includes('manage_team')

    if (nextHoldsManageTeam) {
      await db.sql`UPDATE users SET permission_granted = ${granted}, permission_revoked = ${revoked} WHERE id = ${userId}`
    } else {
      const updated = await db.sql<{ id: string }>`
        WITH holders AS (
          SELECT u.id FROM users u
          WHERE u.status = 'Active'
            AND 'manage_team' = ANY(
              COALESCE((SELECT array_agg(rp.permission_key) FROM role_permissions rp WHERE rp.role_id = u.role_id), ARRAY[]::text[])
              || u.permission_granted
            )
            AND NOT ('manage_team' = ANY(u.permission_revoked))
          ORDER BY u.id
          FOR UPDATE OF u
        )
        UPDATE users SET permission_granted = ${granted}, permission_revoked = ${revoked}
        WHERE id = ${userId}
          AND (
            NOT EXISTS (SELECT 1 FROM holders WHERE id = ${userId})
            OR (SELECT count(*) FROM holders) > 1
          )
        RETURNING id
      `
      if (updated.length === 0) throw refuse('last_manage_team_holder', LAST_HOLDER_MESSAGE)
    }

    const row = await fetchUserRow(db, userId)
    if (!row) throw notFoundError(`operator ${userId}`)
    return jsonResponse(toTeamUser(row))
  }
}
