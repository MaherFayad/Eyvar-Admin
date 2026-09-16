/**
 * Segments (D42, `02-report-builder-v2.md` §2.5): a population filter applied
 * before bucketing. `Segment` is the saved resource; `SegmentRef` is the
 * pointer a `ReportQuery` carries, a ref not a copy — `MeasureRef`'s rule.
 */

import type { FilterSpec } from './common'
import type { MeasureKey } from './measure'

/**
 * A behavioural filter: *"did this many of this measure in this window"*.
 * Refused by the mock unless the measure is a subject population; the
 * planner refuses with `segment-performed-unsupported` until `Measure.supportsPerformed` allows it.
 */
export interface PerformedSpec {
  measureKey: MeasureKey
  op: 'gte' | 'lte' | 'eq'
  count: number
  window: 'each-bucket' | { rollingDays: number }
}

export type SegmentRef =
  | { kind: 'saved'; id: string }
  | { kind: 'inline'; label: string; filters: FilterSpec[]; performed?: PerformedSpec }

export type SegmentVisibility = 'private' | 'team'

/** A named, reusable population. Legend and tooltip read `name` to word a series `Measure · Segment · Group`. */
export interface Segment {
  id: string
  name: string
  description: string | null
  filters: FilterSpec[]
  performed: PerformedSpec | null
  /** A `TeamUser.id`, taken from the session at create time — same rule as `SavedReport.ownerId`. */
  ownerId: string
  visibility: SegmentVisibility
}
