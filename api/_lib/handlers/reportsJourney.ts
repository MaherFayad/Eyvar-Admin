/**
 * `mode: 'journey'` — WP-6.4c. `resolveJourney`/`journeyVocabulary`
 * (`src/data/mock/resolveReport.ts`), ported onto `fetchSubjectEvents`
 * (`../compile.ts`) instead of fixture arrays. AC-1276 (RPT-8) is the proof.
 */
import { fetchSubjectEvents, type SubjectEvent } from '../compile'
import type { Database } from '../db'
import { OTHER } from '@/data/reporting/resolve/core'
import { MAX_GROUPS, MAX_JOURNEY_DEPTH } from '@/data/reporting/plan'
import { subjectKindOf, type SubjectKind } from '@/data/reporting/subjects'
import type { IsoDate } from '@/data/types/common'
import type { Measure } from '@/data/types/measure'
import type { PermissionKey } from '@/data/types/navigation'
import type { ReportPanel, ReportQuery, ReportResult, ReportSeries } from '@/data/types/report'
import { blockedFor, emptyModeResult, redactedSeries } from './reportsSubjectShared'

/** `NO_PATH` (`resolveReport.ts`), re-declared: not exported there (`AGENT-BRIEF.md`: "touch only `api/**`"), and the value is the whole of the contract — a literal, not a computation that could drift. */
export const NO_PATH = '__none__'

export interface JourneyCtx {
  permissions: readonly PermissionKey[]
  asOf: string
  rowCap: number
}

function journeyPanel(panelId: string, seriesIds: string[], measureLabelKey: string): ReportPanel {
  return {
    panelId,
    titleKey: 'rb.panel.journey',
    titleParams: { measure: measureLabelKey },
    unit: 'count',
    currency: null,
    seriesIds,
  }
}

/**
 * `journeyVocabulary`: one measure per (store, date field, predicate),
 * preferring a flow — over the WHOLE catalogue, not just the measures a
 * query names, matching the mock's `Object.values(measuresByKey)`.
 */
function journeyVocabulary(
  kind: SubjectKind,
  allMeasures: readonly Measure[],
  permissions: readonly PermissionKey[],
): Measure[] {
  const groups = new Map<string, Measure>()
  for (const measure of allMeasures) {
    const { resource, timeField, predicate } = measure.population
    if (subjectKindOf(resource) !== kind) continue
    if (blockedFor(measure, permissions)) continue
    const key = `${resource}|${timeField}|${JSON.stringify(predicate)}`
    const held = groups.get(key)
    if (!held) groups.set(key, measure)
    else if (held.temporality !== 'flow' && measure.temporality === 'flow') groups.set(key, measure)
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export async function resolveJourney(
  db: Database,
  original: ReportQuery,
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: JourneyCtx,
  byKey: ReadonlyMap<string, Measure>,
  allMeasures: readonly Measure[],
): Promise<ReportResult> {
  const spec = query.journey
  const root = spec?.rootMeasureKey ? (byKey.get(spec.rootMeasureKey) ?? null) : null
  if (!spec || !root) return emptyModeResult(original, ctx.asOf)

  const panelId = 'p:journey'
  const kind = subjectKindOf(root.population.resource)
  const blocked = blockedFor(root, ctx.permissions)
  if (blocked || kind === null) {
    return {
      ...emptyModeResult(original, ctx.asOf),
      panels: [journeyPanel(panelId, blocked ? [`${root.key}#${NO_PATH}#current`] : [], root.labelKey)],
      series: blocked ? [redactedSeries(root, NO_PATH, panelId, blocked)] : [],
    }
  }

  const rootSet = await fetchSubjectEvents(db, root, query.filters, window, ctx.rowCap)
  const rootEvent = new Map<string, SubjectEvent>()
  for (const event of rootSet.events) {
    const held = rootEvent.get(event.subjectId)
    if (!held || event.date < held.date) rootEvent.set(event.subjectId, event)
  }

  /* The query's filters narrow who ENTERS the journey. They are not applied
     to the following steps — a filter on `rider.city` is not a field on the
     trips store, so applying it would reject every trip for a reason no
     operator could see. */
  const vocabulary = journeyVocabulary(kind, allMeasures, ctx.permissions)
  const vocabSets = await Promise.all(vocabulary.map((m) => fetchSubjectEvents(db, m, [], window, ctx.rowCap)))

  const timeline = new Map<string, Array<SubjectEvent & { measureKey: string }>>()
  let truncated = rootSet.truncated
  vocabulary.forEach((measure, i) => {
    const set = vocabSets[i]!
    truncated = truncated || set.truncated
    for (const event of set.events) {
      const stamped = { ...event, measureKey: measure.key }
      const held = timeline.get(event.subjectId)
      if (held) held.push(stamped)
      else timeline.set(event.subjectId, [stamped])
    }
  })

  const depth = Math.max(1, Math.min(spec.depth, MAX_JOURNEY_DEPTH))
  const counts = new Map<string, number>()
  rootEvent.forEach((start, subjectId) => {
    const after = (timeline.get(subjectId) ?? [])
      .filter((e) => e.rowId !== start.rowId && e.date >= start.date)
      .sort(
        (a, b) => a.date.localeCompare(b.date) || a.measureKey.localeCompare(b.measureKey) || a.rowId.localeCompare(b.rowId),
      )
      .slice(0, depth)
    const path = after.length === 0 ? NO_PATH : after.map((e) => e.measureKey).join('>')
    counts.set(path, (counts.get(path) ?? 0) + 1)
  })

  /* §7.4's fold, on paths rather than on groups — silently dropping the tail
     is what this is here to prevent. */
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const kept = ranked.slice(0, MAX_GROUPS)
  const foldedPaths = ranked.slice(MAX_GROUPS)
  const rows: [string, number][] =
    foldedPaths.length === 0 ? kept : [...kept, [OTHER, foldedPaths.reduce((sum, [, n]) => sum + n, 0)]]

  const series: ReportSeries[] = rows.map(([path, subjects]) => ({
    id: `${root.key}#${path}#current`,
    measureKey: root.key,
    groupValue: path,
    role: 'current',
    panelId,
    unit: 'count',
    currency: null,
    temporality: root.temporality,
    points: [subjects],
    partialBucketIndexes: [],
    blocked: null,
    failed: null,
  }))

  return {
    query: original,
    asOf: ctx.asOf,
    buckets: [window.from],
    panels: [journeyPanel(panelId, series.map((s) => s.id), root.labelKey)],
    series,
    truncated,
    truncatedAtRows: truncated ? ctx.rowCap : null,
    warnings: [],
    foldedGroupCount: foldedPaths.length === 0 ? null : foldedPaths.length,
  }
}
