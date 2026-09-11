/**
 * `ReportQuery` ⇄ URL, the storage adapter §9.2 assigns it while Q1 is open
 * (AC-853). One opaque `q` param, base64url of JSON, not one param per
 * control. v2 writes `v: 2` and is lossless up to `normaliseReportQuery`
 * (AC-1102); a URL with no `v` key is v1 and migrates through that same
 * function (AC-1100/1101), so there is one migration path, not two.
 */

import {
  DEFAULT_COMPARISON_DISPLAY,
  DEFAULT_REPORT_MODE,
  DEFAULT_REPORT_TRANSFORM,
  normaliseReportQuery,
  reportMode,
} from '../types/report'
import type {
  ComparisonDisplay,
  CohortGrain,
  CohortMethod,
  CohortSpec,
  CohortSpecV1,
  FunnelMeasuredAs,
  FunnelMode,
  FunnelSpec,
  FunnelSpecV1,
  FunnelStep,
  JourneySpec,
  MeasureRef,
  ReportFormula,
  ReportMode,
  ReportQuery,
  ReportQueryInput,
  ReportTransform,
  TableColumn,
  TableSpec,
} from '../types/report'
import type { BucketAggregate, DimensionKey } from '../types/measure'
import type { PerformedSpec, SegmentRef } from '../types/segment'

/** The single search param. `q` is short because it is typed into chat windows. */
export const REPORT_QUERY_PARAM = 'q'

/* Base64url, hand-rolled over `btoa`/`atob` so this file works in a browser, in
   Vitest and in a bare Node script without pulling in a Buffer polyfill. */

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/* ─────────────────────── wire shapes, v1 and v2 ─────────────────────────── */

type WireFilter = [string, string, unknown]
type WireMeasure = string | [string, BucketAggregate]

type WireConversionWindow = { v: number; u: 'hour' | 'day' | 'week' }
/** v1: `w` was the bare day count. */
type WireFunnelV1 = { s: Array<[string, WireFilter[]]>; w: number | null }
/** v2: `w` is the unit-carrying window; the rest are omitted at their default. */
type WireFunnelV2 = {
  s: Array<[string, WireFilter[]]>
  w: WireConversionWindow | null
  md?: FunnelMode
  hc?: DimensionKey
  ex?: string[]
  ma?: FunnelMeasuredAs
  gb?: DimensionKey
}

/** v1: `r` was the single return measure or `null`. */
type WireCohortV1 = { a: string | null; r: string | null; g: string; h: number }
/** v2: `r` is the OR-combined array; `m`/`b` are omitted at their default. */
type WireCohortV2 = {
  a: string | null
  r: string[]
  g: string
  h: number
  m?: CohortMethod
  b?: [number, number][]
}

type WireJourney = { r: string | null; d: number }

type WireFormula = { e: string; l: string }
type WireTransform = { c: boolean; r: number | null; p: boolean }

type WirePerformed = { mk: string; op: PerformedSpec['op']; c: number; w: 'each' | { r: number } }
type WireSegment =
  | { k: 's'; id: string }
  | { k: 'i'; l: string; f: WireFilter[]; p?: WirePerformed }

type WireTableColumn =
  | { k: 'm'; r: WireMeasure; f?: WireFilter[]; l?: string }
  | { k: 'f'; e: string; l: string }
type WireTable = {
  c: WireTableColumn[]
  r: string[]
  t: boolean
  fm: { c: number; b: TableSpec['format'][number]['bands'] }[]
}

/* Each configuration gets short keys for the same reason `q` is short: these
   strings are typed into chat windows. Steps carry their own filters as the
   same `[field, op, value]` triples the query-level filters use — one filter
   encoding in the product, as there is one filter model (AC-814). */

function encodeFilter(f: { field: string; op: string; value: unknown }): WireFilter {
  return [f.field, f.op, f.value]
}

function decodeFilter([field, op, value]: WireFilter): ReportQuery['filters'][number] {
  return {
    field,
    op: op as ReportQuery['filters'][number]['op'],
    value: value as ReportQuery['filters'][number]['value'],
  }
}

function encodeMeasure(ref: MeasureRef): WireMeasure {
  return ref.aggregate ? [ref.key, ref.aggregate] : ref.key
}

function decodeMeasure(entry: WireMeasure): MeasureRef {
  return Array.isArray(entry) ? { key: entry[0], aggregate: entry[1] } : { key: entry }
}

function encodeFunnel(funnel: FunnelSpec): WireFunnelV2 {
  const wire: WireFunnelV2 = {
    s: funnel.steps.map((step) => [step.measureKey, step.filters.map(encodeFilter)]),
    w: funnel.conversionWindow
      ? { v: funnel.conversionWindow.value, u: funnel.conversionWindow.unit }
      : null,
  }
  if (funnel.mode !== 'ordered') wire.md = funnel.mode
  if (funnel.holdConstant !== null) wire.hc = funnel.holdConstant
  if (funnel.exclude.length > 0) wire.ex = funnel.exclude
  if (funnel.measuredAs !== 'conversion') wire.ma = funnel.measuredAs
  if (funnel.groupBy !== null) wire.gb = funnel.groupBy
  return wire
}

/**
 * Reads either wire shape and hands back the matching `ReportQueryInput`
 * shape untouched — `normaliseReportQuery` is the one place that migrates
 * v1's `conversionWindowDays` into `conversionWindow`, so this function does
 * not repeat that decision.
 */
function decodeFunnel(
  raw: WireFunnelV1 | WireFunnelV2 | undefined,
  isV2: boolean,
): FunnelSpec | FunnelSpecV1 | undefined {
  if (!raw || !Array.isArray(raw.s)) return undefined
  const steps: FunnelStep[] = raw.s.map(([measureKey, filters]) => ({
    measureKey,
    filters: (filters ?? []).map(decodeFilter),
  }))
  if (!isV2) {
    const v1 = raw as WireFunnelV1
    return { steps, conversionWindowDays: v1.w ?? null }
  }
  const v2 = raw as WireFunnelV2
  return {
    steps,
    conversionWindow: v2.w ? { value: v2.w.v, unit: v2.w.u } : null,
    mode: v2.md ?? 'ordered',
    holdConstant: v2.hc ?? null,
    exclude: v2.ex ?? [],
    measuredAs: v2.ma ?? 'conversion',
    groupBy: v2.gb ?? null,
  }
}

function encodeCohort(cohort: CohortSpec): WireCohortV2 {
  const wire: WireCohortV2 = {
    a: cohort.anchorMeasureKey,
    r: cohort.returnMeasureKeys,
    g: cohort.cohortGrain,
    h: cohort.horizon,
  }
  if (cohort.method !== 'rolling') wire.m = cohort.method
  if (cohort.brackets !== null) wire.b = cohort.brackets
  return wire
}

/** Same rule as `decodeFunnel`: hands back a shape, migrates nothing. */
function decodeCohort(
  raw: WireCohortV1 | WireCohortV2 | undefined,
  isV2: boolean,
): CohortSpec | CohortSpecV1 | undefined {
  if (!raw) return undefined
  if (!isV2) {
    const v1 = raw as WireCohortV1
    return {
      anchorMeasureKey: v1.a ?? null,
      returnMeasureKey: v1.r ?? null,
      cohortGrain: v1.g as CohortGrain,
      horizon: v1.h,
    }
  }
  const v2 = raw as WireCohortV2
  return {
    anchorMeasureKey: v2.a ?? null,
    returnMeasureKeys: v2.r ?? [],
    cohortGrain: v2.g as CohortGrain,
    method: v2.m ?? 'rolling',
    brackets: v2.b ?? null,
    horizon: v2.h,
  }
}

function encodeJourney(journey: JourneySpec): WireJourney {
  return { r: journey.rootMeasureKey, d: journey.depth }
}

function decodeJourney(raw: WireJourney | undefined): JourneySpec | undefined {
  if (!raw) return undefined
  return { rootMeasureKey: raw.r ?? null, depth: raw.d }
}

function encodeFormula(formula: ReportFormula): WireFormula {
  return { e: formula.expression, l: formula.label }
}

function decodeFormula(raw: WireFormula): ReportFormula {
  return { expression: raw.e, label: raw.l }
}

function isDefaultTransform(t: ReportTransform): boolean {
  return (
    t.cumulative === DEFAULT_REPORT_TRANSFORM.cumulative &&
    t.rollingAverage === DEFAULT_REPORT_TRANSFORM.rollingAverage &&
    t.percentOfTotal === DEFAULT_REPORT_TRANSFORM.percentOfTotal
  )
}

function encodeTransform(t: ReportTransform): WireTransform {
  return { c: t.cumulative, r: t.rollingAverage, p: t.percentOfTotal }
}

function decodeTransform(raw: WireTransform): ReportTransform {
  return { cumulative: raw.c, rollingAverage: raw.r, percentOfTotal: raw.p }
}

function encodePerformed(p: PerformedSpec): WirePerformed {
  return {
    mk: p.measureKey,
    op: p.op,
    c: p.count,
    w: p.window === 'each-bucket' ? 'each' : { r: p.window.rollingDays },
  }
}

function decodePerformed(raw: WirePerformed): PerformedSpec {
  return {
    measureKey: raw.mk,
    op: raw.op,
    count: raw.c,
    window: raw.w === 'each' ? 'each-bucket' : { rollingDays: raw.w.r },
  }
}

function encodeSegment(seg: SegmentRef): WireSegment {
  if (seg.kind === 'saved') return { k: 's', id: seg.id }
  const wire: WireSegment = { k: 'i', l: seg.label, f: seg.filters.map(encodeFilter) }
  if (seg.performed) wire.p = encodePerformed(seg.performed)
  return wire
}

function decodeSegment(raw: WireSegment): SegmentRef {
  if (raw.k === 's') return { kind: 'saved', id: raw.id }
  const seg: SegmentRef = { kind: 'inline', label: raw.l, filters: (raw.f ?? []).map(decodeFilter) }
  if (raw.p) seg.performed = decodePerformed(raw.p)
  return seg
}

function encodeTableColumn(col: TableColumn): WireTableColumn {
  if (col.kind === 'formula') return { k: 'f', e: col.expression, l: col.label }
  const wire: WireTableColumn = { k: 'm', r: encodeMeasure(col.ref) }
  if (col.filters && col.filters.length > 0) wire.f = col.filters.map(encodeFilter)
  if (col.label) wire.l = col.label
  return wire
}

function decodeTableColumn(raw: WireTableColumn): TableColumn {
  if (raw.k === 'f') return { kind: 'formula', expression: raw.e, label: raw.l }
  const col: TableColumn = { kind: 'measure', ref: decodeMeasure(raw.r) }
  if (raw.f) col.filters = raw.f.map(decodeFilter)
  if (raw.l) col.label = raw.l
  return col
}

function encodeTable(table: TableSpec): WireTable {
  return {
    c: table.columns.map(encodeTableColumn),
    r: table.rows,
    t: table.totals,
    fm: table.format.map((f) => ({ c: f.column, b: f.bands })),
  }
}

function decodeTable(raw: WireTable | undefined): TableSpec | undefined {
  if (!raw || !Array.isArray(raw.c)) return undefined
  return {
    columns: raw.c.map(decodeTableColumn),
    rows: (raw.r ?? []) as TableSpec['rows'],
    totals: raw.t ?? false,
    format: (raw.fm ?? []).map((f) => ({ column: f.c, bands: f.b })),
  }
}

/**
 * Keys in a fixed order (§9.2: one question, one link). `v: 2` first, then
 * the seven keys every v1 URL carried, then `mo`/`fn`/`co`/`jo` and the five
 * v2 keys — each written only when it differs from its default, so a plain
 * query serialises to `v` plus the v1 set and nothing more (AC-1102).
 */
export function serialiseReportQuery(query: ReportQuery): string {
  /* A public entry point: a stored saved report or a test may still hold a
     v1 shape (`groupBy` a bare dimension or `null`, a funnel with no
     `exclude`). `deserialiseReportQuery` already normalises on the way in;
     this is the same defence on the way out (AC-1100). */
  query = normaliseReportQuery(query)

  const ordered: Record<string, unknown> = {
    v: 2,
    m: query.measures.map(encodeMeasure),
    g: query.groupBy,
    f: query.filters.map(encodeFilter),
    w: query.window,
    gr: query.grain,
    c: query.periodComparison,
    ct: query.chartType,
  }

  const mode = reportMode(query)
  if (mode !== DEFAULT_REPORT_MODE) ordered.mo = mode
  if (query.funnel) ordered.fn = encodeFunnel(query.funnel)
  if (query.cohort) ordered.co = encodeCohort(query.cohort)
  if (query.journey) ordered.jo = encodeJourney(query.journey)

  if (query.formula) ordered.fo = encodeFormula(query.formula)
  if (query.transform && !isDefaultTransform(query.transform)) ordered.tr = encodeTransform(query.transform)
  if (query.segments && query.segments.length > 0) ordered.sg = query.segments.map(encodeSegment)
  if (query.comparisonDisplay && query.comparisonDisplay !== DEFAULT_COMPARISON_DISPLAY) {
    ordered.cd = query.comparisonDisplay
  }
  if (query.table) ordered.tb = encodeTable(query.table)

  return toBase64Url(JSON.stringify(ordered))
}

interface WireQuery {
  v?: number
  m: WireMeasure[]
  g: string | string[] | null
  f: WireFilter[]
  w: ReportQuery['window']
  gr: ReportQuery['grain']
  c: ReportQuery['periodComparison']
  ct: ReportQuery['chartType']
  mo?: ReportMode
  fn?: WireFunnelV1 | WireFunnelV2
  co?: WireCohortV1 | WireCohortV2
  jo?: WireJourney
  fo?: WireFormula
  tr?: WireTransform
  sg?: WireSegment[]
  cd?: ComparisonDisplay
  tb?: WireTable
}

/**
 * Restore. Returns `null` on anything unparseable — a domain outcome the
 * panel renders as "this link is not a report", never a thrown exception
 * (§8.3 state 2). A v1 URL (no `v` key) decodes into the same
 * `ReportQueryInput` shape `normaliseReportQuery` already migrates, so the
 * migration rules live in exactly one function (AC-1100/1101).
 */
export function deserialiseReportQuery(encoded: string): ReportQuery | null {
  try {
    const raw = JSON.parse(fromBase64Url(encoded)) as WireQuery
    if (!Array.isArray(raw.m)) return null

    const isV2 = raw.v === 2

    const input: ReportQueryInput = {
      measures: raw.m.map(decodeMeasure),
      groupBy: raw.g ?? null,
      filters: (raw.f ?? []).map(decodeFilter),
      window: raw.w,
      grain: raw.gr,
      periodComparison: raw.c,
      chartType: raw.ct,
      mode: raw.mo,
    }

    const funnel = decodeFunnel(raw.fn, isV2)
    if (funnel) input.funnel = funnel
    const cohort = decodeCohort(raw.co, isV2)
    if (cohort) input.cohort = cohort
    const journey = decodeJourney(raw.jo)
    if (journey) input.journey = journey

    /* v1 never carried these five keys, so there is nothing to migrate — an
       absent key already means "default" on both sides of the wire. */
    if (isV2) {
      if (raw.fo) input.formula = decodeFormula(raw.fo)
      if (raw.tr) input.transform = decodeTransform(raw.tr)
      if (raw.sg) input.segments = raw.sg.map(decodeSegment)
      if (raw.cd) input.comparisonDisplay = raw.cd
      if (raw.tb) input.table = decodeTable(raw.tb)
    }

    return normaliseReportQuery(input)
  } catch {
    return null
  }
}

/** `/management/reports?q=…` — the link an alert notification routes to (§12.5). */
export function reportQueryPath(query: ReportQuery, basePath = '/management/reports'): string {
  return `${basePath}?${REPORT_QUERY_PARAM}=${serialiseReportQuery(query)}`
}
