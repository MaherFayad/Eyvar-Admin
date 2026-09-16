/**
 * `Session.landingRoute`/`landingWorkspaceId`/`subTabPermissions`/
 * `claimedCount`, derived server-side (§8.2) so every op returning a
 * `Session` agrees. `subTabPermissions` reproduces `routes.ts`'s own lookup
 * so the two cannot disagree (D17); `claimedCount` is honestly `0` — nothing writes `claims` yet. */
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
