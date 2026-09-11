/**
 * `catalogue.ts`'s `listMeasures`/`listDimensions` docblocks (`GET
 * /catalogue/measures`, `GET /catalogue/dimensions`, both `Paginated<T>`),
 * plus `GET /catalogue/glossary` (`01-analyst-agent.md` T3) — WP-6.3.
 *
 * `0003_catalogue.sql` holds one column per `Measure`/`Dimension` field, in
 * fixture order (`sort_order`), so `toMeasure`/`toDimension` below are the
 * only place the shape is reassembled — no query re-derives it. AC-1275
 * (`api/v1/catalogue.test.ts`) is what proves the reassembly is exact.
 *
 * Filtering mirrors the mock branch of `listMeasures` exactly (`category`
 * then `pairableWith`, `pairableWith`'s `first` measure looked up in the
 * *unfiltered* catalogue, same as the mock) plus an additive `q` filter the
 * mock branch declares in its docblock but never applies — supporting it
 * here does not change any existing behaviour, only extends what an
 * unfiltered caller already got.
 */
import type {
  BucketAggregate,
  Dimension,
  DimensionRef,
  Measure,
  MeasureGrain,
  Temporality,
} from '@/data/types/measure'
import { pairableWith } from '@/data/types/measure'
import type { CurrencyCode, FilterSpec } from '@/data/types/common'
import type { MetricCategory, MetricUnit } from '@/data/types/metrics'
import type { PermissionKey, PermissionLevel } from '@/data/types/navigation'
import { unauthorizedError } from '../errors'
import { jsonResponse, paginated, resolveOffsetPage } from '../envelope'
import { buildGlossaryMarkdown } from '../glossary'
import type { RequestContext } from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'

/* ─────────────────────────── row shapes ─────────────────────────────── */

interface MeasureRow {
  key: string
  sort_order: number
  label_key: string
  category: string
  population_resource: string
  population_predicate_json: unknown
  population_predicate_key: string
  population_time_field: string
  population_value_field: string | null
  coverage_from: string
  coverage_to: string
  temporality: string
  bucket_aggregate: string
  bucket_aggregate_options_json: unknown
  additive: boolean
  unit: string
  currency: string | null
  higher_is_better: boolean
  min_grain: string
  dimensions_json: unknown
  filterable_fields_json: unknown
  permission_key: string | null
  permission_level: string | null
  caption_key: string | null
  displayed_as_metric_keys_json: unknown
  supports_performed: boolean | null
  funnel_capabilities_json: unknown
}

interface DimensionRow {
  key: string
  sort_order: number
  label_key: string
  resource: string
  field: string
  cardinality_hint: number
}

/**
 * Every JSONB column above comes back already parsed from the Neon HTTP
 * driver and `pg`; PGlite's `.query()` (the test harness, `api/_test/db.ts`)
 * also parses jsonb columns. This still tolerates a string, defensively —
 * cheaper than a driver-specific regression finding out the hard way.
 */
function parseJsonColumn<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return JSON.parse(value) as T
  return value as T
}

function toMeasure(row: MeasureRow): Measure {
  const measure: Measure = {
    key: row.key,
    labelKey: row.label_key,
    category: row.category as MetricCategory,
    population: {
      resource: row.population_resource,
      predicate: parseJsonColumn<FilterSpec[]>(row.population_predicate_json) ?? [],
      predicateKey: row.population_predicate_key,
      timeField: row.population_time_field,
      valueField: row.population_value_field,
      coverage: { from: row.coverage_from, to: row.coverage_to },
    },
    temporality: row.temporality as Temporality,
    bucketAggregate: row.bucket_aggregate as BucketAggregate,
    additive: row.additive,
    unit: row.unit as MetricUnit,
    currency: row.currency as CurrencyCode | null,
    higherIsBetter: row.higher_is_better,
    minGrain: row.min_grain as MeasureGrain,
    dimensions: parseJsonColumn<DimensionRef[]>(row.dimensions_json) ?? [],
    filterableFields: parseJsonColumn<string[]>(row.filterable_fields_json) ?? [],
    permission: row.permission_key
      ? { key: row.permission_key as PermissionKey, level: row.permission_level as PermissionLevel }
      : null,
    captionKey: row.caption_key,
    displayedAsMetricKeys: parseJsonColumn<string[]>(row.displayed_as_metric_keys_json) ?? [],
  }

  /* Optional `Measure` fields: present on the object only when the row has
     them, so a measure that omits one in the fixture (all fourteen do,
     today) reconstructs with the key absent rather than `undefined` — the
     two read alike under `toEqual` but only one is honest under
     `toStrictEqual`, and AC-1275 should hold either way. */
  const bucketAggregateOptions = parseJsonColumn<BucketAggregate[]>(row.bucket_aggregate_options_json)
  if (bucketAggregateOptions !== null) measure.bucketAggregateOptions = bucketAggregateOptions

  if (row.supports_performed !== null) measure.supportsPerformed = row.supports_performed

  const funnelCapabilities = parseJsonColumn<{ sequential: boolean; holdConstant: boolean }>(
    row.funnel_capabilities_json,
  )
  if (funnelCapabilities !== null) measure.funnelCapabilities = funnelCapabilities

  return measure
}

function toDimension(row: DimensionRow): Dimension {
  return {
    key: row.key,
    labelKey: row.label_key,
    resource: row.resource,
    field: row.field,
    cardinalityHint: row.cardinality_hint,
  }
}

/* ─────────────────────────── handlers ────────────────────────────────── */

/**
 * GET /api/v1/catalogue/measures
 *   params: q · category · pairableWith · page · pageSize
 *   -> Paginated<Measure>
 */
export function createListMeasuresHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    if (!ctx.operator) throw unauthorizedError()

    const rows = await db.sql<MeasureRow>`SELECT * FROM measures ORDER BY sort_order`
    const all = rows.map(toMeasure)

    const url = new URL(req.url)
    const category = url.searchParams.get('category')
    const pairableWithKey = url.searchParams.get('pairableWith')
    const q = url.searchParams.get('q')

    let filtered = category ? all.filter((m) => m.category === category) : all.slice()

    if (pairableWithKey) {
      /* `first` is looked up against the whole catalogue, matching the mock
         branch of `listMeasures` — a category filter narrows the *result*,
         not which measure "first" refers to. */
      const first = all.find((m) => m.key === pairableWithKey)
      filtered = first ? pairableWith(first, filtered) : []
    }

    if (q) {
      const needle = q.toLowerCase()
      filtered = filtered.filter(
        (m) => m.key.toLowerCase().includes(needle) || m.labelKey.toLowerCase().includes(needle),
      )
    }

    const { page, pageSize, offset, limit } = resolveOffsetPage({
      page: numberParam(url, 'page'),
      pageSize: numberParam(url, 'pageSize'),
    })
    const items = filtered.slice(offset, offset + limit)
    return jsonResponse(paginated(items, filtered.length, page, pageSize))
  }
}

/**
 * GET /api/v1/catalogue/dimensions
 *   params: page · pageSize
 *   -> Paginated<Dimension>
 */
export function createListDimensionsHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    if (!ctx.operator) throw unauthorizedError()

    const rows = await db.sql<DimensionRow>`SELECT * FROM dimensions ORDER BY sort_order`
    const all = rows.map(toDimension)

    const url = new URL(req.url)
    const { page, pageSize, offset, limit } = resolveOffsetPage({
      page: numberParam(url, 'page'),
      pageSize: numberParam(url, 'pageSize'),
    })
    const items = all.slice(offset, offset + limit)
    return jsonResponse(paginated(items, all.length, page, pageSize))
  }
}

/**
 * GET /api/v1/catalogue/glossary
 *   params: term?
 *   -> text/markdown (bare, not an envelope — `01-analyst-agent.md` T3: "server-side markdown")
 *
 * `term` narrows to measures whose key, label key or category contains it
 * (case-insensitive); absent returns the whole glossary, business rules
 * first. Generated from the catalogue on every call — nothing here is
 * hand-written per measure, so it cannot drift from `0003_catalogue.sql`.
 */
export function createGetGlossaryHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    if (!ctx.operator) throw unauthorizedError()

    const rows = await db.sql<MeasureRow>`SELECT * FROM measures ORDER BY sort_order`
    const measures = rows.map(toMeasure)

    const url = new URL(req.url)
    const term = url.searchParams.get('term')
    const markdown = buildGlossaryMarkdown(measures, term)

    return new Response(markdown, { status: 200, headers: { 'content-type': 'text/markdown; charset=utf-8' } })
  }
}

function numberParam(url: URL, name: string): number | undefined {
  const raw = url.searchParams.get(name)
  if (raw === null) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}
