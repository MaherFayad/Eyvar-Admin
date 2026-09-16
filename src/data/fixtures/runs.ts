/**
 * The three queries `AGT-1` cites (AC-1258). `clients/runs.ts` runs each for
 * real on read, never a typed-in total. `pickupDistrictSplit` is the query
 * F2 describes; its real result disagrees with F2's prose (the seeded
 * `trips` fixture cannot reach `Al Malaz: 9` at day grain, and `Al Olaya`
 * is not a seeded pickup) — reported to `agent.ts`'s owner, not patched here.
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
  periodComparison: 'none',
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
