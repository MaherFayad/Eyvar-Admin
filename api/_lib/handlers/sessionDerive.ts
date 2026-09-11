/**
 * `Session.landingRoute` / `landingWorkspaceId` / `subTabPermissions` /
 * `claimedCount` — `session.ts`'s docblock: "derived server-side and arrive
 * resolved" (§8.2). Shared by `session.current` and every `auth.*` operation
 * that hands back a `Session` (`signIn`'s challenge completion,
 * `reauthenticate`'s resume), so the two can never disagree.
 *
 * Landing comes from `roles.landing_path`/`landing_workspace_id`
 * (`0004_team.sql`, seeded from `fixtures/teamUsers.ts`'s `ROLE_LANDING`).
 * `subTabPermissions` is `ROUTE_TABLE`'s `viewPermission` column, one entry
 * per sub-tab — `clients/routes.ts`'s `subTabViewPermissions()`, reproduced
 * here (the route table is static frontend data, safe to import directly)
 * so the map and the route table cannot disagree (D17). `claimedCount` is a
 * real `count(*)` against `claims`; nothing writes that table yet — see
 * `0004_team.sql`'s comment — so it is honestly zero rather than a guess.
 */
import { ROUTE_TABLE } from '@/data/fixtures/routeTable'
import type { PermissionKey, WorkspaceId } from '@/data/types/navigation'
import type { Database } from '../db'

const DEFAULT_LANDING = { path: '/operations/overview', workspaceId: 'operations' as WorkspaceId }

/** Reproduces `clients/routes.ts`'s `subTabViewPermissions()`. An empty array means ungated; there is no absent-key case here since every row is listed. */
export function subTabViewPermissions(): Record<string, PermissionKey[]> {
  const out: Record<string, PermissionKey[]> = {}
  for (const row of ROUTE_TABLE.subTabs) {
    out[row.subTabId] = row.viewPermission === null ? [] : [row.viewPermission]
  }
  return out
}

export interface ShellFields {
  landingRoute: string
  landingWorkspaceId: WorkspaceId
  subTabPermissions: Record<string, PermissionKey[]>
  claimedCount: number
}

export async function deriveShellFields(db: Database, userId: string, roleId: string): Promise<ShellFields> {
  const roleRows = await db.sql<{ landing_path: string | null; landing_workspace_id: string | null }>`
    SELECT landing_path, landing_workspace_id FROM roles WHERE id = ${roleId}
  `
  const role = roleRows[0]
  const landingRoute = role?.landing_path ?? DEFAULT_LANDING.path
  const landingWorkspaceId = (role?.landing_workspace_id as WorkspaceId | null) ?? DEFAULT_LANDING.workspaceId

  const claimRows = await db.sql<{ count: string | number }>`
    SELECT count(*) FROM claims WHERE owner_id = ${userId} AND state = 'claimed'
  `
  const claimedCount = Number(claimRows[0]?.count ?? 0)

  return { landingRoute, landingWorkspaceId, subTabPermissions: subTabViewPermissions(), claimedCount }
}
