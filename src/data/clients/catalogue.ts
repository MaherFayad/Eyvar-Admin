/**
 * The measure catalogue, behind the seam.
 *
 * This is the client D13 said had to exist before the panel did: *"an explorer
 * needs a query model — dimensions, measures, filters, grain, comparison —
 * resolved against a catalogue, and that is a different data contract, not a
 * new screen over the existing one."*
 *
 * **The catalogue is data, not a menu.** A screen asks what can be measured and
 * what it can be split by; it never holds a list. That is the difference
 * between a report builder and nine more fixed boards.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { measureFixtures, dimensionFixtures } from '../fixtures/measures'
import { mock } from '../mock/delay'
import { paginate } from '../mock/query'
import { planQuery, type Catalogue } from '../reporting/plan'
import type { Paginated, QueryParams } from '../types/common'
import type { Dimension, Measure } from '../types/measure'
import { pairableWith, pairRefusal } from '../types/measure'
import type { QueryPlan, ReportQuery } from '../types/report'
import { http } from './http'

export const CATALOGUE_OPERATIONS = {
  measures: 'catalogue.measures',
  dimensions: 'catalogue.dimensions',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(CATALOGUE_OPERATIONS))

export interface MeasureQuery extends QueryParams {
  /** §3.7's metrics-library grouping, so the picker can filter by category. */
  category?: string
  /** Only measures that may be paired with this one (§6.2). Powers the second-measure picker. */
  pairableWithKey?: string
}

/**
 * GET /api/v1/catalogue/measures
 *   params: q · category · pairableWith · page · pageSize
 *   -> Paginated<Measure>
 *
 * Paginated even though there are fourteen. A screen written against a bare
 * array has to be rewritten the first time a tenant catalogues ninety measures,
 * and this is the one endpoint in the module whose length is a function of how
 * much the business decides to measure.
 *
 * **`pairableWith` is a server-side filter, not a client-side one.** §6.2's rule
 * is *a refusal, not a warning*, and a refusal implemented in a component is a
 * refusal a hand-edited URL walks straight past. The same predicate runs in
 * `planQuery`, so the picker and the run agree by construction (AC-822 … AC-825).
 */
export async function listMeasures(
  params: MeasureQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Measure>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Measure>>('/catalogue/measures', { ...params, signal }, { signal })
  }
  return mock(CATALOGUE_OPERATIONS.measures, signal, () => {
    let rows = measureFixtures.slice()
    if (params.category) rows = rows.filter((m) => m.category === params.category)
    if (params.pairableWithKey) {
      const first = measureFixtures.find((m) => m.key === params.pairableWithKey)
      /* An unknown first measure narrows to nothing rather than to everything.
         Failing open on a refusal is how a refusal stops being one. */
      rows = first ? pairableWith(first, rows) : []
    }
    return paginate(rows, params)
  })
}

/**
 * GET /api/v1/catalogue/dimensions
 *   params: page · pageSize
 *   -> Paginated<Dimension>
 */
export async function listDimensions(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Dimension>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Dimension>>('/catalogue/dimensions', { ...params, signal }, { signal })
  }
  return mock(CATALOGUE_OPERATIONS.dimensions, signal, () => paginate(dimensionFixtures, params))
}

/* ───────────────────── the planner, synchronously ──────────────────────── */

/**
 * Everything the panel needs to **disable a control in place with a reason**,
 * computed from a catalogue it already holds — §3.5, §6.2, §7.
 *
 * Synchronous and pure, and it must stay that way. AC-809 requires that
 * changing a control issues no request; AC-817 requires that an over-long grain
 * is disabled **before** the query runs. A rule that needs a round trip cannot
 * satisfy either.
 *
 * The same function runs inside `reports.run`, so the greyed-out option and the
 * refused query give the same reason. One rule, one implementation.
 */
export function planReportQuery(
  query: ReportQuery,
  catalogue: { measures: readonly Measure[]; dimensions: readonly Dimension[] },
  today: string,
): QueryPlan {
  return planQuery(query, catalogue as Catalogue, today)
}

/**
 * Why these two measures may not share a query, or `null` when they may.
 *
 * Exported so the picker can *state* the refusal rather than silently omitting
 * the option: §6.2's escape from a nonsensical pairing is that *the UI does not
 * offer it*, and R4-1 §1.3 gives the sentence for an empty second-measure list
 * — `No measure shares this one's unit and period type.`
 */
export { pairRefusal, pairableWith }
