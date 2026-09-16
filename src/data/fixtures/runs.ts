/**
 * The three queries `AGT-1` cites (AC-1258, "no number without a run"), run
 * for real on read. `pickupDistrictSplit` carries `periodComparison` so
 * `agent.ts` gets a real per-district `deltaAbs`; its window reaches before
 * the fixture's earliest row, which `agent.ts`'s `dataQuality.gaps` names.
 */

import type { ReportQuery } from '../types/report'
import { cancellationTrend } from './reports'
import { DONE_JOB_ID } from './agent'

const pickupDistrictSplit: ReportQuery = {
  measures: [{ key: 'trips.completed' }],
  groupBy: ['trip.pickup'],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'previous-period',
  chartType: 'line',
}

/** The alternative's own check (`agent.ts`): registered captains filtered to
 * `active`, the stock a "count on a day" reads as — no measure named
 * `drivers.active`/`captains.active` exists in the catalogue (T1's own rule:
 * never a key T1 would not return). */
const activeCaptainCount: ReportQuery = {
  measures: [{ key: 'captains.registered' }],
  groupBy: [],
  filters: [{ field: 'driver.status', op: 'eq', value: 'active' }],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

export interface AgentSeedRunQuery {
  id: string
  query: ReportQuery
  jobId: string
}

export const AGENT_SEEDED_RUN_QUERIES: AgentSeedRunQuery[] = [
  { id: 'RUN-1', query: cancellationTrend, jobId: DONE_JOB_ID },
  { id: 'RUN-2', query: pickupDistrictSplit, jobId: DONE_JOB_ID },
  { id: 'RUN-3', query: activeCaptainCount, jobId: DONE_JOB_ID },
]
