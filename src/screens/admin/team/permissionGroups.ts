/**
 * The twenty permission keys grouped by the workspace they gate (D17), so a
 * role or an override reads as five short lists rather than one wall. The
 * view key opens the workspace; the others are its writes.
 */

import type { PermissionKey } from '@/data/types'

export interface PermissionGroup {
  id: string
  titleKey: string
  view: PermissionKey | null
  writes: readonly PermissionKey[]
}

export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  { id: 'management', titleKey: 'workspace.management', view: 'view_analytics', writes: [] },
  {
    id: 'operations',
    titleKey: 'workspace.operations',
    view: 'view_operations',
    writes: ['approve_drivers', 'manage_subscriptions', 'live_ops'],
  },
  {
    id: 'financials',
    titleKey: 'workspace.financials',
    view: 'view_finance',
    writes: ['manage_plans', 'process_payouts', 'release_escrow', 'apply_deductions'],
  },
  { id: 'support', titleKey: 'workspace.support', view: 'view_support', writes: ['manage_tickets', 'contact_users'] },
  {
    id: 'admin',
    titleKey: 'workspace.admin',
    view: 'view_admin',
    writes: ['manage_team', 'manage_ops_policy', 'manage_workspace', 'manage_data_governance', 'manage_security_policy'],
  },
  { id: 'everywhere', titleKey: 'admin.team.permissions.group.everywhere', view: null, writes: ['view_profiles'] },
]

/** Every key of a group, the view key first. */
export function groupKeys(group: PermissionGroup): PermissionKey[] {
  return group.view ? [group.view, ...group.writes] : [...group.writes]
}

export function sameKeySet(a: readonly PermissionKey[], b: readonly PermissionKey[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((key) => set.has(key))
}
