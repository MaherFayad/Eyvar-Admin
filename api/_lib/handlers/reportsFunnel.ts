/**
 * `mode: 'funnel'`: ports `resolveFunnel` et al. line-for-line onto
 * `fetchSubjectEvents` (AC-1276, RPT-6). `sequential` and `holdConstant`
 * have no mock to port from — they are this file's own design (F-V2-63),
 * refused server-side unless `funnelCapabilities` allows them:
 *
 * **`sequential`**: stricter than `ordered`. A rung `i` match is legal only
 * when no OTHER rung of this funnel recorded an event for the subject
 * strictly between the previous rung's matched date and this candidate's —
 * answerable from the funnel's own rungs, without a full event stream.
 *
 * **`holdConstant`**: names a `Dimension`. A rung whose table carries that
 * field must match the entry (rung 0) event's value; a rung whose table
 * lacks the field is unconstrained. A **user**-adjacent property held fixed
 * across stores, not an event property no later rung could carry.
 */
import { fetchMeasureRows, fetchSubjectEvents, type SubjectEvent } from '../compile'
import type { Database } from '../db'
import { resolveTrendLeg } from '@/data/reporting/resolve/core'
import { addDays, bucketEndExclusive, bucketStarts, daysInclusive, partialBucketIndexes } from '@/data/reporting/buckets'
import { percentile } from '@/data/reporting/distribution'
import { subjectKindOf } from '@/data/reporting/subjects'
import { dropoffByGroup, medianDaysToNextStep } from '@/data/reporting/funnelSteps'
import { DEFAULT_COMPARISON_DISPLAY, DEFAULT_REPORT_TRANSFORM } from '@/data/types/report'
import type { FilterSpec, IsoDate } from '@/data/types/common'
import type { Dimension, Measure } from '@/data/types/measure'
import type { PermissionKey } from '@/data/types/navigation'
import type {
  FunnelMode,
  FunnelStep,
  FunnelStepDetail,
  ReportPanel,
  ReportQuery,
  ReportResult,
  ReportSeries,
  ReportWarning,
} from '@/data/types/report'
import {
  blockedFor,
  conversionWindowDays,
  earliestEventPerSubject,
  emptyModeResult,
  groupBySubject,
  redactedSeries,
} from './reportsSubjectShared'

export interface FunnelCtx {
  permissions: readonly PermissionKey[]
  today: IsoDate
  asOf: string
  rowCap: number
}

interface Rung {
  step: FunnelStep
  measure: Measure
}

/** `funnelRungs` (`resolveReport.ts`): every step whose measure resolves, paired with it — an unresolved rung dropped, not thrown. */
function funnelRungs(steps: readonly FunnelStep[], byKey: ReadonlyMap<string, Measure>): Rung[] {
  return steps
    .map((step) => ({ step, measure: byKey.get(step.measureKey) }))
    .filter((r): r is Rung => Boolean(r.measure))
}

/** §13.1 — the first rung this viewer may not read, if any. */
function firstBlockedRung(rungs: readonly Rung[], permissions: readonly PermissionKey[]): PermissionKey | null {
  for (const rung of rungs) {
    const blocked = blockedFor(rung.measure, permissions)
    if (blocked) return blocked
  }
  return null
}

/** Whether every named rung's population names the same kind of subject — `follow` in the mock, computed the same two ways it is: over already-resolved `Rung[]`. */
function computeFollow(rungs: readonly Rung[]): boolean {
  const kinds = rungs.map((r) => subjectKindOf(r.measure.population.resource))
  const first = kinds[0] ?? null
  return first !== null && kinds.every((k) => k === first)
}

/** The cascade's own `follow`, computed over every STEP (not `funnelRungs`' filtered list) — an unresolved measure disables following exactly as the mock's inline `kinds` map does, by contributing `null`. */
function computeFollowForSteps(steps: readonly FunnelStep[], byKey: ReadonlyMap<string, Measure>): boolean {
  const kinds = steps.map((step) => {
    const measure = byKey.get(step.measureKey)
    return measure ? subjectKindOf(measure.population.resource) : null
  })
  const first = kinds[0] ?? null
  return first !== null && kinds.every((k) => k === first)
}

/** `eventsOf(...).total` (`resolveReport.ts`) — the counted-funnel fallback's own aggregate, over the whole window as one bucket. Calls the SAME trend leg the trend/formula path calls (`resolveTrendLeg` at `grain: 'none'`), never a second copy of `valueForBucket`'s arithmetic. */
async function totalOverWindow(
  db: Database,
  measure: Measure,
  filters: readonly FilterSpec[],
  window: { from: IsoDate; to: IsoDate },
  rowCap: number,
): Promise<{ total: number | null; truncated: boolean }> {
  const fetched = await fetchMeasureRows(db, measure, measure.bucketAggregate, {
    filters: [...measure.population.predicate, ...filters],
    groupBy: [],
    subjectAllow: null,
    rowCap,
  })
  const leg = resolveTrendLeg({
    measure: fetched.rows,
    groupLevels: 0,
    transform: DEFAULT_REPORT_TRANSFORM,
    comparisonDisplay: DEFAULT_COMPARISON_DISPLAY,
    window,
    comparisonWindow: null,
    grain: 'none',
    today: window.to,
  })
  return { total: leg.groups[0]?.current.points[0] ?? null, truncated: fetched.truncated }
}

/**
 * `computeFunnelCore`: who reached each rung, and when. `follow` is a
 * **parameter**, not recomputed here — the cascade calls this over a rung
 * *prefix* stopped at the first blocked rung, but `follow` must be the
 * whole funnel's own fact, never the prefix's. */
async function computeFunnelCore(
  db: Database,
  rungs: readonly Rung[],
  follow: boolean,
  queryFilters: readonly FilterSpec[],
  window: { from: IsoDate; to: IsoDate },
  mode: FunnelMode,
  windowDays: number | null,
  entryWindow: { from: IsoDate; to: IsoDate },
  holdConstant: Dimension | null,
  rowCap: number,
): Promise<{ reachedByRung: Map<string, IsoDate>[]; truncated: boolean }> {
  if (!follow || rungs.length === 0) return { reachedByRung: [], truncated: false }

  const eventSets = await Promise.all(
    rungs.map((r) =>
      fetchSubjectEvents(db, r.measure, [...queryFilters, ...(r.step.filters ?? [])], window, rowCap, holdConstant),
    ),
  )
  const truncated = eventSets.some((s) => s.truncated)

  const enteredEvents = earliestEventPerSubject(eventSets[0]!.events)
  const entered = new Map<string, IsoDate>()
  const entryDim = new Map<string, string | null>()
  enteredEvents.forEach((event, id) => {
    entered.set(id, event.date)
    entryDim.set(id, event.dimValue)
  })

  const boundedEntered = new Map([...entered].filter(([, date]) => date >= entryWindow.from && date <= entryWindow.to))
  const reachedByRung: Map<string, IsoDate>[] = [boundedEntered]
  const bySubjectByRung = eventSets.map((s) => groupBySubject(s.events))

  let carried = boundedEntered
  for (let i = 1; i < rungs.length; i += 1) {
    const bySubject = bySubjectByRung[i]!
    const next = new Map<string, IsoDate>()
    carried.forEach((previousDate, id) => {
      const startedOn = entered.get(id)!
      const deadline = windowDays === null ? window.to : addDays(startedOn, windowDays)
      const earliestLegal = mode === 'unordered' ? startedOn : previousDate
      let candidates: SubjectEvent[] = (bySubject.get(id) ?? []).filter(
        (e) => e.date >= earliestLegal && e.date <= deadline,
      )

      if (holdConstant) {
        const base = entryDim.get(id) ?? null
        /* No baseline on the entry rung → nothing to hold constant, on any
           rung (see this file's header). A rung whose own table cannot
           answer the dimension records `dimValue: null` and is never
           filtered out by it. */
        if (base !== null) candidates = candidates.filter((e) => e.dimValue === null || e.dimValue === base)
      }

      if (mode === 'sequential') {
        candidates = candidates.filter((candidate) => {
          for (let j = 0; j < rungs.length; j += 1) {
            if (j === i) continue
            const otherEvents = bySubjectByRung[j]!.get(id) ?? []
            if (otherEvents.some((e) => e.date > previousDate && e.date < candidate.date)) return false
          }
          return true
        })
      }

      /* `bySubject.get(id)` is already date-ascending (`fetchSubjectEvents`'s
         own sort) and filtering preserves order, so the first surviving
         candidate is the earliest — `.find()`'s result in the mock. */
      const match = candidates[0]
      if (match) next.set(id, match.date)
    })
    reachedByRung.push(next)
    carried = next
  }

  return { reachedByRung, truncated }
}

/**
 * `subjectGroupsOf`, over SQL (AC-1170): entry rung's own drop-off group
 * value per subject, bounded by the same `rowCap`. Keeps the earliest-dated
 * row, unlike the mock's first-in-array — the two agree only for a
 * subject-stable dimension, the only shape `dropoffByGroup` needs. */
async function computeFunnelGroupOf(
  db: Database,
  entry: { step: FunnelStep; measure: Measure },
  groupByDim: Dimension,
  queryFilters: readonly FilterSpec[],
  window: { from: IsoDate; to: IsoDate },
  rowCap: number,
): Promise<Map<string, string | null>> {
  const set = await fetchSubjectEvents(
    db,
    entry.measure,
    [...queryFilters, ...(entry.step.filters ?? [])],
    window,
    rowCap,
    groupByDim,
  )
  const groups = new Map<string, string | null>()
  earliestEventPerSubject(set.events).forEach((event, id) => groups.set(id, event.dimValue))
  return groups
}

/** §5. `measuredAs` picks the shape; all three read the funnel the same way. */
export async function resolveFunnel(
  db: Database,
  original: ReportQuery,
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: FunnelCtx,
  byKey: ReadonlyMap<string, Measure>,
  dimByKey: ReadonlyMap<string, Dimension>,
): Promise<ReportResult> {
  const steps = query.funnel?.steps ?? []
  if (steps.length === 0) return emptyModeResult(original, ctx.asOf)

  const measuredAs = query.funnel?.measuredAs ?? 'conversion'
  if (measuredAs === 'conversion-over-time') return resolveFunnelOverTime(db, original, query, window, ctx, byKey, dimByKey)
  if (measuredAs === 'time-to-convert') return resolveFunnelTimeToConvert(db, original, query, window, ctx, byKey, dimByKey)
  return resolveFunnelConversion(db, original, query, window, ctx, byKey, dimByKey)
}

async function resolveFunnelConversion(
  db: Database,
  original: ReportQuery,
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: FunnelCtx,
  byKey: ReadonlyMap<string, Measure>,
  dimByKey: ReadonlyMap<string, Dimension>,
): Promise<ReportResult> {
  const steps = query.funnel?.steps ?? []
  const warnings = new Set<ReportWarning>()
  const panelId = 'p:funnel'
  const series: ReportSeries[] = []
  let truncated = false

  const rungs = steps.map((step) => ({ step, measure: byKey.get(step.measureKey) ?? null }))
  const follow = computeFollowForSteps(steps, byKey)
  if (!follow) warnings.add('funnel-counted-not-followed')

  const funnelMode = query.funnel?.mode ?? 'ordered'
  const windowDays = conversionWindowDays(query.funnel?.conversionWindow ?? null)
  const holdConstant = query.funnel?.holdConstant ? (dimByKey.get(query.funnel.holdConstant) ?? null) : null
  const groupByKey = query.funnel?.groupBy ?? null
  const groupByDim = groupByKey ? (dimByKey.get(groupByKey) ?? null) : null

  /* The chain actually computed: resolved measures, stopping BEFORE the
     first blocked one — an unresolved measure is invisible to it (mirrors
     the mock's `reached` simply carrying past a `return` on `!measure`). */
  const chain: { index: number; step: FunnelStep; measure: Measure }[] = []
  for (let i = 0; i < rungs.length; i += 1) {
    const { step, measure } = rungs[i]!
    if (!measure) continue
    if (blockedFor(measure, ctx.permissions)) break
    chain.push({ index: i, step, measure })
  }

  let reachedByRung: Map<string, IsoDate>[] = []
  /* AC-1170's `groupOf`: the entry rung's own group value per subject,
     matching `resolveReport.ts`'s `groupOf` — set once, off `chain[0]`, only
     when the funnel is followed (`chain[0]` is then always step 0: `follow`
     requires `kinds[0] !== null`, which requires step 0's measure resolved). */
  let groupOf: ((subjectId: string) => string | null) | null = null
  if (follow && chain.length > 0) {
    const core = await computeFunnelCore(
      db,
      chain.map((c) => ({ step: c.step, measure: c.measure })),
      true,
      query.filters,
      window,
      funnelMode,
      windowDays,
      window,
      holdConstant,
      ctx.rowCap,
    )
    reachedByRung = core.reachedByRung
    truncated = truncated || core.truncated

    if (groupByDim) {
      const groups = await computeFunnelGroupOf(db, chain[0]!, groupByDim, query.filters, window, ctx.rowCap)
      groupOf = (id) => groups.get(id) ?? null
    }
  }

  const totals: (number | null)[] = []
  if (!follow) {
    for (const c of chain) {
      const { total, truncated: t } = await totalOverWindow(
        db,
        c.measure,
        [...query.filters, ...(c.step.filters ?? [])],
        window,
        ctx.rowCap,
      )
      totals.push(total)
      truncated = truncated || t
    }
  }

  let blockedFrom = false
  let chainPos = 0
  for (let index = 0; index < rungs.length; index += 1) {
    const { measure } = rungs[index]!
    const groupValue = String(index + 1)
    if (!measure) continue

    const blocked = blockedFor(measure, ctx.permissions)
    if (blocked || blockedFrom) {
      blockedFrom = true
      series.push(redactedSeries(measure, groupValue, panelId, blocked ?? (measure.permission?.key ?? 'view_finance')))
      continue
    }

    const count = follow ? (reachedByRung[chainPos]?.size ?? 0) : (totals[chainPos] ?? null)
    chainPos += 1

    series.push({
      id: `${measure.key}#${groupValue}#current`,
      measureKey: measure.key,
      groupValue,
      role: 'current',
      panelId,
      unit: follow ? 'count' : measure.unit,
      currency: follow ? null : measure.currency,
      temporality: measure.temporality,
      points: [count],
      partialBucketIndexes: [],
      blocked: null,
      failed: null,
    })
  }

  const firstMeasure = rungs[0]?.measure ?? null
  const panel: ReportPanel = {
    panelId,
    titleKey: 'rb.panel.funnel',
    titleParams: { measure: firstMeasure?.labelKey ?? 'rb.canvas.heading' },
    unit: follow ? 'count' : (firstMeasure?.unit ?? 'count'),
    currency: follow ? null : (firstMeasure?.currency ?? null),
    seriesIds: series.map((s) => s.id),
  }

  /* WP-3.5b/AC-1170's per-rung detail, read off `reachedByRung` — the run
     already in hand, never a second query (matches `resolveReport.ts`'s
     `detailSeriesIds` walking the same non-blocked, resolved chain `series`
     gains above). `current`/`next`/`previous` are `null`, never `0`, for a
     counted (not followed) funnel and at either edge of the chain. */
  const funnelStepDetail: FunnelStepDetail[] = chain.map((c, i) => {
    const current = follow ? (reachedByRung[i] ?? null) : null
    const next = follow ? (reachedByRung[i + 1] ?? null) : null
    const previous = follow && i > 0 ? (reachedByRung[i - 1] ?? null) : null
    return {
      seriesId: `${c.measure.key}#${c.index + 1}#current`,
      medianDaysToNext: current && next ? medianDaysToNextStep(current, next) : null,
      dropoffGroups: groupOf && previous && current ? dropoffByGroup(previous, current, groupOf) : null,
    }
  })

  return {
    query: original,
    asOf: ctx.asOf,
    buckets: [window.from],
    panels: [panel],
    series,
    truncated,
    truncatedAtRows: truncated ? ctx.rowCap : null,
    warnings: [...warnings],
    foldedGroupCount: null,
    funnelStepDetail,
  }
}

async function resolveFunnelOverTime(
  db: Database,
  original: ReportQuery,
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: FunnelCtx,
  byKey: ReadonlyMap<string, Measure>,
  dimByKey: ReadonlyMap<string, Dimension>,
): Promise<ReportResult> {
  const steps = query.funnel?.steps ?? []
  const rungs = funnelRungs(steps, byKey)
  if (rungs.length === 0) return emptyModeResult(original, ctx.asOf)

  const blocked = firstBlockedRung(rungs, ctx.permissions)
  const panelId = 'p:funnel-trend'
  const buckets = bucketStarts(window.from, window.to, query.grain)
  const firstMeasure = rungs[0]!.measure

  if (blocked) {
    return {
      ...emptyModeResult(original, ctx.asOf),
      buckets,
      panels: [
        {
          panelId,
          titleKey: 'rb.panel.funnel',
          titleParams: { measure: firstMeasure.labelKey },
          unit: 'percent',
          currency: null,
          seriesIds: [`${firstMeasure.key}#_#current`],
        },
      ],
      series: [redactedSeries(firstMeasure, '_', panelId, blocked)],
    }
  }

  const funnelMode = query.funnel?.mode ?? 'ordered'
  const windowDays = conversionWindowDays(query.funnel?.conversionWindow ?? null)
  const holdConstant = query.funnel?.holdConstant ? (dimByKey.get(query.funnel.holdConstant) ?? null) : null
  const follow = computeFollow(rungs)

  const points: (number | null)[] = []
  for (const bucketStart of buckets) {
    if (!follow) {
      points.push(null)
      continue
    }
    const entryGrain = query.grain === 'none' || query.grain === 'hour' ? 'day' : query.grain
    const entryTo = addDays(bucketEndExclusive(bucketStart, entryGrain), -1)
    const core = await computeFunnelCore(
      db,
      rungs,
      true,
      query.filters,
      window,
      funnelMode,
      windowDays,
      { from: bucketStart, to: entryTo },
      holdConstant,
      ctx.rowCap,
    )
    const enteredCount = core.reachedByRung[0]?.size ?? 0
    const lastCount = core.reachedByRung[core.reachedByRung.length - 1]?.size ?? 0
    points.push(enteredCount === 0 ? null : Math.round((lastCount / enteredCount) * 1000) / 10)
  }

  const lastMeasure = rungs[rungs.length - 1]!.measure
  const seriesId = `${lastMeasure.key}#_#current`
  return {
    query: original,
    asOf: ctx.asOf,
    buckets,
    panels: [
      { panelId, titleKey: 'rb.panel.funnel', titleParams: { measure: firstMeasure.labelKey }, unit: 'percent', currency: null, seriesIds: [seriesId] },
    ],
    series: [
      {
        id: seriesId,
        measureKey: lastMeasure.key,
        groupValue: null,
        role: 'current',
        panelId,
        unit: 'percent',
        currency: null,
        temporality: lastMeasure.temporality,
        points,
        partialBucketIndexes: partialBucketIndexes(buckets, query.grain, window, ctx.today),
        blocked: null,
        failed: null,
      },
    ],
    /* Matches the mock exactly (`resolveReport.ts`'s `resolveFunnelOverTime`):
       neither `truncated` nor `funnel-counted-not-followed` is threaded
       through here, in either implementation — a stated, existing mock
       behaviour this port carries rather than "fixes" out from under AC-1276. */
    truncated: false,
    truncatedAtRows: null,
    warnings: [],
    foldedGroupCount: null,
  }
}

async function resolveFunnelTimeToConvert(
  db: Database,
  original: ReportQuery,
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: FunnelCtx,
  byKey: ReadonlyMap<string, Measure>,
  dimByKey: ReadonlyMap<string, Dimension>,
): Promise<ReportResult> {
  const steps = query.funnel?.steps ?? []
  const rungs = funnelRungs(steps, byKey)
  if (rungs.length === 0) return emptyModeResult(original, ctx.asOf)

  const blocked = firstBlockedRung(rungs, ctx.permissions)
  const firstMeasure = rungs[0]!.measure
  if (blocked) {
    const panelId = 'p:funnel-ttc'
    return {
      ...emptyModeResult(original, ctx.asOf),
      panels: [
        {
          panelId,
          titleKey: 'rb.panel.funnel',
          titleParams: { measure: firstMeasure.labelKey },
          unit: 'minutes',
          currency: null,
          seriesIds: [`${firstMeasure.key}#_#current`],
        },
      ],
      series: [redactedSeries(firstMeasure, '_', panelId, blocked)],
    }
  }

  const funnelMode = query.funnel?.mode ?? 'ordered'
  const windowDays = conversionWindowDays(query.funnel?.conversionWindow ?? null)
  const holdConstant = query.funnel?.holdConstant ? (dimByKey.get(query.funnel.holdConstant) ?? null) : null
  const follow = computeFollow(rungs)
  const core = await computeFunnelCore(db, rungs, follow, query.filters, window, funnelMode, windowDays, window, holdConstant, ctx.rowCap)

  const minutes: number[] = []
  if (follow) {
    const entered = core.reachedByRung[0] ?? new Map<string, IsoDate>()
    const converted = core.reachedByRung[core.reachedByRung.length - 1] ?? new Map<string, IsoDate>()
    converted.forEach((reachedDate, id) => {
      const startedOn = entered.get(id)
      if (!startedOn) return
      minutes.push((daysInclusive(startedOn, reachedDate) - 1) * 1440)
    })
  }

  const PERCENTILES = [25, 50, 75, 90, 95] as const
  const panels: ReportPanel[] = []
  const series: ReportSeries[] = []
  for (const p of PERCENTILES) {
    const panelId = `p:funnel-ttc-p${p}`
    const seriesId = `${firstMeasure.key}#p${p}#current`
    panels.push({
      panelId,
      titleKey: 'rb.funnel.timeToConvert.percentile',
      titleParams: { percentile: p },
      unit: 'minutes',
      currency: null,
      seriesIds: [seriesId],
    })
    series.push({
      id: seriesId,
      measureKey: firstMeasure.key,
      groupValue: `p${p}`,
      role: 'current',
      panelId,
      unit: 'minutes',
      currency: null,
      temporality: firstMeasure.temporality,
      points: [percentile(minutes, p)],
      partialBucketIndexes: [],
      blocked: null,
      failed: null,
    })
  }

  return {
    query: original,
    asOf: ctx.asOf,
    buckets: [window.from],
    panels,
    series,
    truncated: core.truncated,
    truncatedAtRows: core.truncated ? ctx.rowCap : null,
    warnings: follow ? [] : ['funnel-counted-not-followed'],
    foldedGroupCount: null,
  }
}
