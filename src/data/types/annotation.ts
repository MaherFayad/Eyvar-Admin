/**
 * Annotations (D42, `02-report-builder-v2.md` §4.5): a marked date on a
 * trend chart. Context, not query state — never serialised into `ReportQuery`.
 * Write needs `manage_analytics`, not yet in `PermissionKey` (D17); flagged for the navigation owner, not minted here.
 */

import type { IsoDate, IsoDateTime } from './common'

export type AnnotationKind = 'launch' | 'price' | 'incident' | 'campaign' | 'other'

export interface Annotation {
  id: string
  date: IsoDate
  label: string
  note: string
  kind: AnnotationKind
  /** A `TeamUser.id`. */
  createdBy: string
  createdAt: IsoDateTime
}
