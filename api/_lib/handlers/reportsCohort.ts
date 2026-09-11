/**
 * `mode: 'cohort'` — WP-6.4c. `resolveCohort` (`src/data/mock/resolveReport.ts`),
 * ported onto `fetchSubjectEvents`/`fetchLastActiveIndex` (`../compile.ts`)
 * instead of fixture arrays. The maths does not move here either — this file
 * calls the SAME `buildCohortMatrix` (`@/data/reporting/cohorts`) the mock
 * calls, already grain-generic (`rolling`/`nday`/`bracket`, G11) and already
 * tested; this function's only job is turning a query into that function's
 * three arguments and its output into a `ReportResult`, exactly as the
 * mock's own docblock states. AC-1276 (RPT-7) is the proof.
 */
import { fetchLastActiveIndex, fetchSubjectEvents } from '../compile'
import type { Database } from '../db'
import { buildCohortMatrix } from '@/data/reporting/cohorts'
import { cohortIntervals } from '@/data/reporting/plan'
import type { IsoDate } from '@/data/types/common'
import type { Measure } from '@/data/types/measure'
import type { PermissionKey } from '@/data/types/navigation'
import type { ReportPanel, ReportQuery, ReportResult, ReportSeries } from '@/data/types/report'
import { blockedFor, earliestPerSubject, emptyModeResult, latestPerSubject, mergeLatest, redactedSeries } from './reportsSubjectShared'

export interface CohortCtx {
  permissions: readonly PermissionKey[]
  today: IsoDate
  asOf: string
  rowCap: number
}

function cohortPanel(panelId: string, seriesIds: string[], measureLabelKey: string): ReportPanel {
  return {
    panelId,
    titleKey: 'rb.panel.cohort',
    titleParams: { measure: measureLabelKey },
    unit: 'percent',
    currency: null,
    seriesIds,
  }
}

export async function resolveCohort(
  db: Database,
  original: ReportQuery,
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: CohortCtx,
  byKey: ReadonlyMap<string, Measure>,
): Promise<ReportResult> {
  const spec = query.cohort
  const anchor = spec?.anchorMeasureKey ? (byKey.get(spec.anchorMeasureKey) ?? null) : null
  if (!spec || !anchor) return emptyModeResult(original, ctx.asOf)

  const panelId = 'p:cohort'
  const intervals =
    spec.method === 'bracket' && spec.brackets
      ? spec.brackets.map(([lo, hi]) => `${lo}-${hi}`)
      : cohortIntervals(spec.horizon)

  const blocked = blockedFor(anchor, ctx.permissions)
  if (blocked) {
    return {
      ...emptyModeResult(original, ctx.asOf),
      panels: [cohortPanel(panelId, intervals.map((i) => `${anchor.key}#${i}#current`), anchor.labelKey)],
      series: intervals.map((interval) => redactedSeries(anchor, interval, panelId, blocked)),
    }
  }

  const anchorSet = await fetchSubjectEvents(db, anchor, query.filters, window, ctx.rowCap)
  const joined = earliestPerSubject(anchorSet.events)

  /* §6: OR-combined — the merge keeps each subject's LATEST qualifying date.
     A blocked return measure is left out rather than leaking a number through it. */
  const returnMeasures = (spec.returnMeasureKeys ?? [])
    .map((k) => byKey.get(k))
    .filter((m): m is Measure => Boolean(m && !blockedFor(m, ctx.permissions)))

  let returned: Map<string, IsoDate> | null = null
  if (returnMeasures.length > 0) {
    const sets = await Promise.all(returnMeasures.map((m) => fetchSubjectEvents(db, m, query.filters, window, ctx.rowCap)))
    returned = mergeLatest(sets.map((s) => latestPerSubject(s.events)))
  }

  const kind = anchorSet.kind
  /* Only fetched when `returned` is not already answering "still here" —
     `lastActiveOf`'s own index is read once per kind, never per subject. */
  const lastActiveIndex = !returned && kind ? await fetchLastActiveIndex(db, kind) : null

  const entities = [...joined.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([subjectId, joinedAt]) => ({
      joinedAt,
      lastActiveAt: returned ? (returned.get(subjectId) ?? null) : (lastActiveIndex?.get(subjectId) ?? null),
    }))

  const matrix = buildCohortMatrix(entities, (e) => e.joinedAt, (e) => e.lastActiveAt, ctx.today, intervals, {
    grain: spec.cohortGrain,
    method: spec.method,
    brackets: spec.brackets,
  })

  const buckets = matrix.rows.map((row) => row.cohortStart)

  const series: ReportSeries[] = intervals.map((interval) => ({
    id: `${anchor.key}#${interval}#current`,
    measureKey: anchor.key,
    groupValue: interval,
    role: 'current',
    panelId,
    unit: 'percent',
    currency: null,
    temporality: anchor.temporality,
    points: matrix.rows.map((row) => row.retentionByInterval[interval] ?? null),
    partialBucketIndexes: [],
    blocked: null,
    failed: null,
  }))

  return {
    query: original,
    asOf: ctx.asOf,
    buckets,
    panels: [cohortPanel(panelId, series.map((s) => s.id), anchor.labelKey)],
    series,
    truncated: anchorSet.truncated,
    truncatedAtRows: anchorSet.truncated ? ctx.rowCap : null,
    warnings: [],
    foldedGroupCount: null,
    cohortSizes: matrix.rows.map((row) => row.size),
  }
}
