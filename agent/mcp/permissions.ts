/**
 * `sample_rows` (T10) names a raw resource, so it has no `Measure.permission`
 * to inherit from. AC-1242 needs a per-resource permission the server
 * doesn't have yet; this interim mapping mirrors the resource's own screen.
 */

import type { PermissionKey } from '../../src/data/types/navigation'

export const RESOURCE_VIEW_PERMISSION: Readonly<Record<string, PermissionKey>> = {
  drivers: 'view_operations',
  riders: 'view_operations',
  subscriptions: 'view_operations',
  trips: 'view_operations',
  'daily-snapshots': 'view_analytics',
}

export function requiredPermissionFor(resource: string): PermissionKey | null {
  return RESOURCE_VIEW_PERMISSION[resource] ?? null
}
