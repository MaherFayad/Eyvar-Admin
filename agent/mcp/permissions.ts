/**
 * `sample_rows` (T10) names a raw resource, not a measure, so it has no
 * `Measure.permission` to inherit a refusal from. AC-1242 wants "refuses an
 * operator without `view` on the resource"; the real answer is
 * `measure_sources.pii_columns`/a per-resource permission column on the
 * server (`05-backend.md`), which does not exist yet (flagged in the WP
 * report). Until then this is the mock's stand-in: the same workspace-read
 * key `06-report-builder.md` already gates the resource's own screen with
 * (`view_operations` for the four operational resources, `view_analytics`
 * for the daily rollup). It is an interim mapping, not a ruling.
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
