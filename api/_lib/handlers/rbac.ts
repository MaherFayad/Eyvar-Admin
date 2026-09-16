/**
 * `rbac.*` (F-V2-21): role CRUD and `holdersOf`, mirroring
 * `src/data/clients/rbac.ts` field for field. Unlike `team.ts`'s per-user
 * atomic lock, an F-016 role edit checks the holder count before and after
 * in two round trips, not a multi-row `FOR UPDATE` — no test exercises that race. */
import type { PermissionKey } from '@/data/types/navigation'
import { ROLE_NAMES, isBuiltInRole, type RoleId } from '@/data/types/session'
import type { Role, RbacGuardCode, PermissionHolder } from '@/data/types/rbac'
import { HttpError, notFoundError } from '../errors'
import { jsonResponse } from '../envelope'
import { requirePermission, type RequestContext } from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'
import { fetchAllUserRows, toTeamUser } from './team'
import { recordAudit } from '../audit'

const WRITE_PERMISSION: PermissionKey = 'manage_team'
const READ_PERMISSION: PermissionKey = 'manage_team'

/** A refusal named as the rule it protects — `RbacGuardCode` as the wire `code`, matching `handlers/team.ts`'s own `refuse` (CONTRACT.md §11). `conflictError` was not used here: it hardcodes the top-level `code` to `'conflict'`, which would hide the guard code the client switches on. */
function refuse(code: RbacGuardCode, message: string): HttpError {
  return new HttpError(409, code, message, [{ field: 'role', code, message }], { kind: 'conflict', retryable: false })
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

interface RoleRow {
  id: string
  built_in: boolean
  based_on: string | null
  created_at: string | null
  created_by: string | null
}

async function holderCountOf(db: Database, roleId: string): Promise<number> {
  const rows = await db.sql<{ count: string }>`SELECT count(*)::text AS count FROM users WHERE role_id = ${roleId}`
  return Number(rows[0]?.count ?? '0')
}

async function toRole(db: Database, row: RoleRow, permissions: PermissionKey[]): Promise<Role> {
  return {
    name: row.id as RoleId,
    builtIn: row.built_in,
    // `based_on` is only ever written from a value `isBuiltInRole` already accepted (`createCreateRoleHandler`).
    basedOn: row.based_on as Role['basedOn'],
    permissions,
    holders: await holderCountOf(db, row.id),
    createdAt: row.created_at as Role['createdAt'],
    createdBy: row.created_by,
  }
}

async function permissionsOf(db: Database, roleId: string): Promise<PermissionKey[]> {
  const rows = await db.sql<{ permission_key: string }>`SELECT permission_key FROM role_permissions WHERE role_id = ${roleId} ORDER BY permission_key`
  return rows.map((r) => r.permission_key as PermissionKey)
}

/** GET /api/v1/rbac/roles -> { items: Role[] }. Built-ins in `ROLE_NAMES` order, then custom roles by creation. */
export function createListRolesHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, READ_PERMISSION)
    const rows = await db.sql<RoleRow>`SELECT id, built_in, based_on, created_at, created_by FROM roles ORDER BY built_in DESC, created_at ASC NULLS FIRST`
    const order = new Map<string, number>(ROLE_NAMES.map((name, i) => [name, i]))
    const sorted = rows.sort((a, b) => {
      const ai = order.get(a.id) ?? Number.MAX_SAFE_INTEGER
      const bi = order.get(b.id) ?? Number.MAX_SAFE_INTEGER
      return ai - bi
    })
    const items = await Promise.all(sorted.map(async (row) => toRole(db, row, await permissionsOf(db, row.id))))
    return jsonResponse({ items })
  }
}

/** POST /api/v1/rbac/roles  body: { name, basedOn, permissions }  -> Role, 201 */
export function createCreateRoleHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const body = await parseJsonBody(req)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) throw refuse('role_name_empty', 'A role needs a name')

    const existing = await db.sql<{ id: string }>`SELECT id FROM roles WHERE lower(id) = ${name.toLowerCase()}`
    if (existing.length > 0) throw refuse('role_name_taken', `A role named ${name} already exists`)

    const basedOn = typeof body.basedOn === 'string' && isBuiltInRole(body.basedOn) ? body.basedOn : null
    const permissions = Array.isArray(body.permissions)
      ? Array.from(new Set(body.permissions.filter((p): p is string => typeof p === 'string')))
      : []

    await db.sql`INSERT INTO roles (id, name, built_in, based_on, created_at, created_by) VALUES (${name}, ${name}, false, ${basedOn}, now(), ${operator.userId})`
    for (const key of permissions) {
      await db.sql`INSERT INTO role_permissions (role_id, permission_key) VALUES (${name}, ${key}) ON CONFLICT DO NOTHING`
    }
    const row = (await db.sql<RoleRow>`SELECT id, built_in, based_on, created_at, created_by FROM roles WHERE id = ${name}`)[0]!
    await recordAudit(db, { userId: operator.userId, action: 'role.create', entityType: 'role', entityId: name, summary: { basedOn, permissions: permissions.length } })
    return jsonResponse(await toRole(db, row, permissions as PermissionKey[]), 201)
  }
}

/** PUT /api/v1/rbac/roles/:name  body: { permissions }  -> Role. Custom roles only — a built-in is fixed. */
export function createUpdateRoleHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const name = ctx.params.name ?? ''
    if (isBuiltInRole(name)) throw refuse('role_built_in', `${name} is a built-in role and cannot be edited`)

    const rows = await db.sql<RoleRow>`SELECT id, built_in, based_on, created_at, created_by FROM roles WHERE id = ${name}`
    const row = rows[0]
    if (!row) throw notFoundError(`role ${name}`)

    const body = await parseJsonBody(req)
    const next = Array.isArray(body.permissions)
      ? Array.from(new Set(body.permissions.filter((p): p is string => typeof p === 'string')))
      : []

    // F-016: would this edit drop `manage_team` from every active holder of this role, roster-wide, to zero? See the file header.
    if (!next.includes('manage_team')) {
      const holderRows = await db.sql<{ id: string; permission_granted: string[]; permission_revoked: string[] }>`
        SELECT id, permission_granted, permission_revoked FROM users WHERE role_id = ${name} AND status = 'Active'
      `
      const wouldLose = holderRows.filter(
        (u) => !u.permission_granted.includes('manage_team') && !u.permission_revoked.includes('manage_team'),
      )
      if (wouldLose.length > 0) {
        const wouldRemainRows = await db.sql<{ count: string }>`
          SELECT count(*)::text AS count FROM users u
          WHERE u.status = 'Active' AND u.role_id <> ${name}
            AND (
              'manage_team' = ANY(COALESCE((SELECT array_agg(rp.permission_key) FROM role_permissions rp WHERE rp.role_id = u.role_id), ARRAY[]::text[]))
              OR 'manage_team' = ANY(u.permission_granted)
            )
            AND NOT ('manage_team' = ANY(u.permission_revoked))
        `
        const wouldRemainElsewhere = Number(wouldRemainRows[0]?.count ?? '0')
        const overriddenOnThisRole = holderRows.some((u) => u.permission_granted.includes('manage_team'))
        if (wouldRemainElsewhere === 0 && !overriddenOnThisRole) {
          throw refuse(
            'role_has_holders',
            'Refused: this edit would leave nobody holding `manage_team` (F-016). Grant it to at least one active operator elsewhere first.',
          )
        }
      }
    }

    await db.sql`DELETE FROM role_permissions WHERE role_id = ${name}`
    for (const key of next) {
      await db.sql`INSERT INTO role_permissions (role_id, permission_key) VALUES (${name}, ${key}) ON CONFLICT DO NOTHING`
    }
    await recordAudit(db, { userId: operator.userId, action: 'role.update', entityType: 'role', entityId: name, summary: { permissions: next.length } })
    return jsonResponse(await toRole(db, row, next as PermissionKey[]))
  }
}

/** DELETE /api/v1/rbac/roles/:name -> { deleted: true }. Refused while the role has holders. */
export function createDeleteRoleHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const name = ctx.params.name ?? ''
    if (isBuiltInRole(name)) throw refuse('role_built_in', `${name} is a built-in role and cannot be deleted`)
    const rows = await db.sql<{ id: string }>`SELECT id FROM roles WHERE id = ${name}`
    if (rows.length === 0) throw notFoundError(`role ${name}`)
    const holders = await holderCountOf(db, name)
    if (holders > 0) throw refuse('role_has_holders', `${holders} operators still hold ${name}`)
    await db.sql`DELETE FROM roles WHERE id = ${name}`
    await recordAudit(db, { userId: operator.userId, action: 'role.delete', entityType: 'role', entityId: name })
    return jsonResponse({ deleted: true })
  }
}

/** GET /api/v1/rbac/holders/:key -> { items: PermissionHolder[] }. Who holds a permission, and how (T8.2). */
export function createHoldersOfHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, READ_PERMISSION)
    const key = ctx.params.key as PermissionKey
    const rows = await fetchAllUserRows(db)
    const baselineCache = new Map<string, string[]>()
    const items: PermissionHolder[] = []
    for (const row of rows) {
      const user = toTeamUser(row)
      if (!user.permissions.includes(key)) continue
      let baseline = baselineCache.get(row.role_id)
      if (!baseline) {
        baseline = await permissionsOf(db, row.role_id)
        baselineCache.set(row.role_id, baseline)
      }
      items.push({ user, via: baseline.includes(key) ? 'baseline' : 'granted' })
    }
    return jsonResponse({ items })
  }
}
