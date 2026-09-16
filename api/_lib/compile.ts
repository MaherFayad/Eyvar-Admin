/**
 * The measure compiler (05-backend.md §6): resolves a measure's population
 * into `CoreRow[]` via parameterised SQL, then runs the *same*
 * `resolveTrendLeg`/`resolveFormulaLeg` the mock runs — never a second SQL
 * implementation — so server and mock cannot drift (AC-1276). */

import { toMeasure, toDimension } from './handlers/catalogue'
import type { Database } from './db'
import type { CoreMeasureRows, CoreRow } from '@/data/reporting/resolve/core'
import type { FilterSpec, IsoDate } from '@/data/types/common'
import type { BucketAggregate, Dimension, Measure } from '@/data/types/measure'
import type { Catalogue } from '@/data/reporting/plan'
import { subjectKindOf, type SubjectKind } from '@/data/reporting/subjects'
import { localDayOf } from '@/data/reporting/buckets'

/** §6's cap: a leg over this many matching rows is truncated, never silently short. */
export const DEFAULT_ROW_CAP = 50_000

/* ─────────────────────── catalogue reads ────────────────────────────────── */

/** The whole catalogue, shaped for `planQuery` — same rows `catalogue.measures`/`catalogue.dimensions` serve. */
export async function loadCatalogue(db: Database): Promise<Catalogue> {
  const [measureRows, dimensionRows] = await Promise.all([
    db.sql<Parameters<typeof toMeasure>[0]>`SELECT * FROM measures ORDER BY sort_order`,
    db.sql<Parameters<typeof toDimension>[0]>`SELECT * FROM dimensions ORDER BY sort_order`,
  ])
  return { measures: measureRows.map(toMeasure), dimensions: dimensionRows.map(toDimension) }
}

interface MeasureSourceRow {
  resource: string
  table_name: string
  time_column: string | null
  subject_column: string | null
  live_to_bounds_json: unknown
  supports_stock: boolean
  field_columns_json: unknown
  /** WP-6.4c, `0010_subject_modes.sql`. Which column is this table's real primary key — `resolveJourney`'s `rowId` identity, never a sort key (see that migration's header). Defaults to `'id'`. */
  row_id_column: string
}

/** One upper bound on a stock row's liveness window (`0008_live_window.sql`). `exclusive` shifts the bound back one calendar day — the mock's `day < localDayOf(cancelledAt)`, not `day <= `. */
interface LiveToBound {
  field: string
  exclusive?: boolean
}

/** A field's real column, and whether reading it needs the Riyadh-local-day conversion (`0005_runs.sql`'s `field_columns_json`). */
interface ResolvedField {
  column: string
  localDay: boolean
}

type FieldColumnEntry = string | { column: string; localDay?: boolean }

async function loadMeasureSource(db: Database, resource: string): Promise<MeasureSourceRow | null> {
  const rows = await db.sql<MeasureSourceRow>`SELECT * FROM measure_sources WHERE resource = ${resource}`
  return rows[0] ?? null
}

function parseFieldColumns(json: unknown): Record<string, FieldColumnEntry> {
  if (json === null || json === undefined) return {}
  const parsed = typeof json === 'string' ? (JSON.parse(json) as unknown) : json
  return (parsed ?? {}) as Record<string, FieldColumnEntry>
}

function parseLiveToBounds(json: unknown): LiveToBound[] {
  if (json === null || json === undefined) return []
  const parsed = typeof json === 'string' ? (JSON.parse(json) as unknown) : json
  return Array.isArray(parsed) ? (parsed as LiveToBound[]) : []
}

/* ──────────────────────────── safe SQL building ─────────────────────────── */

/** Postgres identifiers only — letters, digits, `_` and `.` (the dotted catalogue field names double as column names, quoted whole). Refuses anything else rather than guessing. */
export const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_.]*$/

/** Exported for `handlers/agent.ts`'s `sample_rows` (D44) — the same identifier-safety rule, not a second copy of it. */
export function quoteIdent(name: string): string {
  if (!SAFE_IDENTIFIER.test(name)) {
    throw new Error(`compile.ts: refusing to build SQL from an unsafe identifier "${name}"`)
  }
  return `"${name.replace(/"/g, '""')}"`
}

/**
 * Builds a parameterised query the same shape a tagged template produces,
 * for a `WHERE` with an unknown number of conditions — `db.sql` accepts only
 * a real tagged template, so no value ever reaches the SQL text itself.
 * Exported so `handlers/agent.ts`'s `sample_rows` (D44) reuses this builder. */
export class SqlBuilder {
  private parts: string[] = ['']
  private params: unknown[] = []

  text(fragment: string): this {
    this.parts[this.parts.length - 1] += fragment
    return this
  }

  param(value: unknown): this {
    this.params.push(value)
    this.parts.push('')
    return this
  }

  async run<T>(db: Database): Promise<T[]> {
    const strings = Object.assign([...this.parts], { raw: [...this.parts] }) as unknown as TemplateStringsArray
    return db.sql<T>(strings, ...this.params)
  }
}

/* ──────────────────────────── column resolution ─────────────────────────── */

/** Resolves a catalogue field name to a real column, checked against the table's actual columns — an unresolvable field never reaches a query as an identifier. */
async function resolveColumn(
  db: Database,
  table: string,
  fieldColumns: Record<string, FieldColumnEntry>,
  field: string,
): Promise<ResolvedField | null> {
  const entry = fieldColumns[field]
  const candidate: ResolvedField = entry
    ? typeof entry === 'string'
      ? { column: entry, localDay: false }
      : { column: entry.column, localDay: Boolean(entry.localDay) }
    : { column: field, localDay: false }
  if (!SAFE_IDENTIFIER.test(candidate.column)) return null
  const exists = await db.sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = ${table} AND column_name = ${candidate.column}
    ) AS exists
  `
  return exists[0]?.exists ? candidate : null
}

/** The Riyadh-local calendar day of a full IsoDateTime column, as `to_char(...)` text — never a `::date`, which every driver here parses back into a JS `Date` (`0003_catalogue.sql`'s own warning). Mirrors `buckets.ts`'s `localDayOf`: shift +3h, read the UTC calendar date. */
function localDayExpr(columnSql: string): string {
  return `to_char((${columnSql}::timestamptz + interval '3 hours') AT TIME ZONE 'UTC', 'YYYY-MM-DD')`
}

function timeExprSql(resolved: ResolvedField): string {
  const col = quoteIdent(resolved.column)
  return resolved.localDay ? localDayExpr(col) : `${col}::text`
}

/** One resolved `LiveToBound` as SQL text: the field's own date expression, or one calendar day earlier when `exclusive` (`0008_live_window.sql`). */
function liveToBoundSql(resolved: ResolvedField, exclusive: boolean): string {
  const dateExpr = timeExprSql(resolved)
  return exclusive ? `to_char((${dateExpr})::date - interval '1 day', 'YYYY-MM-DD')` : dateExpr
}

/**
 * An unresolvable bound is dropped, never forced-empty. Combined with SQL
 * `LEAST(...)`, which ignores a NULL argument, so an unresolved or
 * never-cancelled bound simply does not constrain the window.
 */
async function liveToExprSql(
  db: Database,
  table: string,
  fieldColumns: Record<string, FieldColumnEntry>,
  bounds: readonly LiveToBound[],
): Promise<string> {
  const exprs: string[] = []
  for (const bound of bounds) {
    const resolved = await resolveColumn(db, table, fieldColumns, bound.field)
    if (!resolved) continue
    exprs.push(liveToBoundSql(resolved, Boolean(bound.exclusive)))
  }
  return exprs.length > 0 ? `LEAST(${exprs.join(', ')})` : 'NULL'
}

/* ─────────────────────────────── filters ─────────────────────────────────── */

/** `matchesFilter` (`src/data/mock/query.ts`), as SQL. `numeric()`'s date-or-number coercion is mirrored: a numeric-looking value casts the column to `double precision`; otherwise it stays text, which sorts ISO dates chronologically same as lexicographically. */
function appendFilterSql(sb: SqlBuilder, columnSql: string, filter: FilterSpec): void {
  const { op, value } = filter
  const looksNumeric = typeof value === 'number'
  const numericCol = `(${columnSql})::double precision`
  switch (op) {
    case 'eq':
      sb.text(`${columnSql} = `).param(value)
      return
    case 'neq':
      sb.text(`${columnSql} <> `).param(value)
      return
    case 'in':
      sb.text(`${columnSql} = ANY(`).param(value).text(')')
      return
    case 'nin':
      sb.text(`NOT (${columnSql} = ANY(`).param(value).text('))')
      return
    case 'gt':
      sb.text(`${looksNumeric ? numericCol : columnSql} > `).param(value)
      return
    case 'gte':
      sb.text(`${looksNumeric ? numericCol : columnSql} >= `).param(value)
      return
    case 'lt':
      sb.text(`${looksNumeric ? numericCol : columnSql} < `).param(value)
      return
    case 'lte':
      sb.text(`${looksNumeric ? numericCol : columnSql} <= `).param(value)
      return
    case 'between': {
      const bounds = Array.isArray(value) ? value : [null, null]
      const useNumeric = typeof bounds[0] === 'number'
      const col = useNumeric ? numericCol : columnSql
      sb.text(`${col} BETWEEN `).param(bounds[0]).text(' AND ').param(bounds[1])
      return
    }
    case 'contains':
      sb.text(`${columnSql} ILIKE '%' || `).param(String(value)).text(` || '%'`)
      return
    case 'isNull':
      sb.text(`${columnSql} IS NULL`)
      return
    case 'isNotNull':
      sb.text(`${columnSql} IS NOT NULL`)
      return
  }
}

/* ────────────────────────── grouping ceilings ────────────────────────────── */

/** How many split levels this resource can actually answer — `effectiveLevels` in `resolveReport.ts`, generalised off `SOURCES[resource].fields` onto real columns. */
async function effectiveLevels(
  db: Database,
  table: string,
  fieldColumns: Record<string, FieldColumnEntry>,
  groupBy: readonly string[],
): Promise<{ levels: 0 | 1 | 2; columns: (ResolvedField | null)[] }> {
  const level0 = groupBy[0] ? await resolveColumn(db, table, fieldColumns, groupBy[0]) : null
  if (!level0) return { levels: 0, columns: [null, null] }
  const level1 = groupBy[1] ? await resolveColumn(db, table, fieldColumns, groupBy[1]) : null
  return { levels: level1 ? 2 : 1, columns: [level0, level1] }
}

/* ────────────────────────────── the fetch ────────────────────────────────── */

export interface FetchRowsOptions {
  /** Population predicate, query filters and segment filters — all AND'ed, exactly as `matchesAll` chains three passes in the mock. */
  filters: readonly FilterSpec[]
  /** Already sliced to `REPORT_GROUP_BY_MAX`. */
  groupBy: readonly string[]
  /** `null` = no `performed` segment in play. An empty set is a real, deliberate "nobody". */
  subjectAllow: readonly string[] | null
  rowCap?: number
}

export interface FetchedRows {
  rows: CoreMeasureRows
  groupLevels: 0 | 1 | 2
  /** A server-side row cap was hit — §6's row cap, `truncatedAtRows` on the wire (AC-1277). */
  truncated: boolean
}

interface RawRow {
  date: string | null
  value: string | number | null
  live_from: string | null
  live_to: string | null
  group0: string | null
  group1: string | null
}

/**
 * Rows ready for `resolveTrendLeg`/`resolveFormulaLeg`. Throws only when the
 * catalogue itself is broken — no `measure_sources` row for the population
 * (R5-15's server-side belt). A query-shaped failure (an unresolvable filter
 * field) degrades to zero rows instead, matching `matchesAll`'s behaviour. */
export async function fetchMeasureRows(
  db: Database,
  measure: Measure,
  bucketAggregate: BucketAggregate,
  opts: FetchRowsOptions,
): Promise<FetchedRows> {
  const source = await loadMeasureSource(db, measure.population.resource)
  if (!source) {
    throw new Error(
      `Measure "${measure.key}" declares population "${measure.population.resource}", which no measure_sources row reads. ` +
        'A population that cannot be read is a measure that should not be in the catalogue (R5-15).',
    )
  }
  const table = quoteIdent(source.table_name)
  const fieldColumns = parseFieldColumns(source.field_columns_json)

  const timeField = await resolveColumn(db, source.table_name, fieldColumns, measure.population.timeField)
  const valueField = measure.population.valueField
    ? await resolveColumn(db, source.table_name, fieldColumns, measure.population.valueField)
    : null
  const { levels: groupLevels, columns: groupColumns } = await effectiveLevels(
    db,
    source.table_name,
    fieldColumns,
    opts.groupBy,
  )

  const emptyResult: FetchedRows = {
    groupLevels,
    truncated: false,
    rows: {
      key: measure.key,
      unit: measure.unit,
      currency: measure.currency,
      temporality: measure.temporality,
      additive: measure.additive,
      bucketAggregate,
      coverage: measure.population.coverage,
      supportsStock: source.supports_stock,
      rows: [],
    },
  }

  /* The population's own time field is required — a measure declaring one
     `measure_sources` cannot resolve is a catalogue defect (throw, above);
     one it resolves is used unconditionally, so a `null` here only happens
     when the *column itself* went missing after the catalogue was seeded. */
  if (!timeField) return emptyResult

  const dateExpr = timeExprSql(timeField)
  const valueExpr = valueField ? `(${quoteIdent(valueField.column)})::double precision` : '1'
  const liveFromExpr = source.supports_stock ? `${quoteIdent(source.time_column ?? timeField.column)}::text` : 'NULL'
  const liveToExpr = source.supports_stock
    ? await liveToExprSql(db, source.table_name, fieldColumns, parseLiveToBounds(source.live_to_bounds_json))
    : 'NULL'
  const group0Expr = groupColumns[0] ? `COALESCE((${quoteIdent(groupColumns[0].column)})::text, '')` : 'NULL'
  const group1Expr = groupColumns[1] ? `COALESCE((${quoteIdent(groupColumns[1].column)})::text, '')` : 'NULL'

  const sb = new SqlBuilder()
  sb.text(
    `SELECT ${dateExpr} AS date, ${valueExpr} AS value, ${liveFromExpr} AS live_from, ${liveToExpr} AS live_to, ` +
      `${group0Expr} AS group0, ${group1Expr} AS group1 FROM ${table} WHERE TRUE`,
  )

  let forceEmpty = false
  for (const filter of opts.filters) {
    const resolved = await resolveColumn(db, source.table_name, fieldColumns, filter.field)
    if (!resolved) {
      forceEmpty = true
      break
    }
    sb.text(' AND (')
    appendFilterSql(sb, quoteIdent(resolved.column), filter)
    sb.text(')')
  }

  if (opts.subjectAllow !== null) {
    if (!source.subject_column) {
      forceEmpty = true
    } else {
      sb.text(` AND ${quoteIdent(source.subject_column)} = ANY(`).param([...opts.subjectAllow]).text(')')
    }
  }

  if (forceEmpty) return emptyResult

  const rowCap = opts.rowCap ?? DEFAULT_ROW_CAP
  sb.text(' LIMIT ').param(rowCap + 1)

  const raw = await sb.run<RawRow>(db)
  const truncated = raw.length > rowCap
  const capped = truncated ? raw.slice(0, rowCap) : raw

  const rows: CoreRow[] = capped.map((r) => {
    const liveFrom = r.live_from
    const liveTo = r.live_to
    return {
      date: (r.date as IsoDate | null) ?? null,
      value: Number(r.value ?? 0),
      liveAt: source.supports_stock
        ? (day: IsoDate) => liveFrom !== null && liveFrom <= day && (liveTo === null || day <= liveTo)
        : null,
      groupKeys: [groupLevels >= 1 ? (r.group0 ?? '') : null, groupLevels >= 2 ? (r.group1 ?? '') : null],
    }
  })

  return {
    groupLevels,
    truncated,
    rows: { ...emptyResult.rows, rows },
  }
}

/* ─────────────────────────── segments: `performed` ───────────────────────── */

/**
 * `subjectsMeetingPerformed`, over SQL rows: subject ids whose row count
 * within `window` meets `spec.op`. `'each-bucket'` vs `{rollingDays}` is not
 * bucket-accurate here either — the mock's own simplification (F-V2-19),
 * carried through rather than invented differently. */
export async function subjectsMeetingPerformed(
  db: Database,
  performedMeasure: Measure,
  spec: { op: 'gte' | 'lte' | 'eq'; count: number },
  window: { from: IsoDate; to: IsoDate },
): Promise<Set<string>> {
  const source = await loadMeasureSource(db, performedMeasure.population.resource)
  const allow = new Set<string>()
  if (!source || !source.subject_column) return allow

  const fieldColumns = parseFieldColumns(source.field_columns_json)
  const timeField = await resolveColumn(db, source.table_name, fieldColumns, performedMeasure.population.timeField)
  if (!timeField) return allow

  const table = quoteIdent(source.table_name)
  const dateExpr = timeExprSql(timeField)
  const subjectExpr = quoteIdent(source.subject_column)

  const sb = new SqlBuilder()
  sb.text(`SELECT ${subjectExpr} AS subject_id, COUNT(*) AS n FROM ${table} WHERE TRUE`)
  let forceEmpty = false
  for (const filter of performedMeasure.population.predicate) {
    const resolved = await resolveColumn(db, source.table_name, fieldColumns, filter.field)
    if (!resolved) {
      forceEmpty = true
      break
    }
    sb.text(' AND (')
    appendFilterSql(sb, quoteIdent(resolved.column), filter)
    sb.text(')')
  }
  if (forceEmpty) return allow
  sb.text(` AND ${dateExpr} >= `).param(window.from).text(` AND ${dateExpr} <= `).param(window.to)
  sb.text(` GROUP BY ${subjectExpr}`)

  const rows = await sb.run<{ subject_id: string; n: string | number }>(db)
  for (const row of rows) {
    const n = Number(row.n)
    const meets = spec.op === 'gte' ? n >= spec.count : spec.op === 'lte' ? n <= spec.count : n === spec.count
    if (meets) allow.add(row.subject_id)
  }
  return allow
}

/* ────────────────── subject events: funnel, cohort, journey ──────────────── */

export interface SubjectEvent {
  subjectId: string
  date: IsoDate
  /** `"${resource}#${primary key}"` — a stable identity for "the same physical row", never a sort key (`0010_subject_modes.sql`). */
  rowId: string
  /** `null` unless a caller asks for `holdConstant`'s dimension and it exists on this table — see `fetchSubjectEvents`'s `dimension` param. */
  dimValue: string | null
}

export interface SubjectEventSet {
  /** `null` when the store names nobody — `RowSource.subject === null` in the mock. */
  kind: SubjectKind | null
  events: SubjectEvent[]
  truncated: boolean
}

/**
 * `eventsOf`, over SQL rows: population `predicate` and `filters` are ANDed
 * by the same rule `appendFilterSql` applies to the trend/formula path
 * (AC-814). Sorted `date, subjectId, rowId` to match the mock's own
 * determinism, though no caller's output depends on the `rowId` tie-break. */
export async function fetchSubjectEvents(
  db: Database,
  measure: Measure,
  filters: readonly FilterSpec[],
  window: { from: IsoDate; to: IsoDate },
  rowCap: number = DEFAULT_ROW_CAP,
  dimension: Dimension | null = null,
): Promise<SubjectEventSet> {
  const source = await loadMeasureSource(db, measure.population.resource)
  if (!source) {
    throw new Error(
      `Measure "${measure.key}" declares population "${measure.population.resource}", which no measure_sources row reads (R5-15).`,
    )
  }
  const kind = subjectKindOf(measure.population.resource)
  if (kind === null || !source.subject_column) return { kind: null, events: [], truncated: false }

  const fieldColumns = parseFieldColumns(source.field_columns_json)
  const timeField = await resolveColumn(db, source.table_name, fieldColumns, measure.population.timeField)
  if (!timeField) return { kind, events: [], truncated: false }

  const rowIdField = await resolveColumn(db, source.table_name, fieldColumns, source.row_id_column)
  if (!rowIdField) return { kind, events: [], truncated: false }

  /* `dimension.key`, not `dimension.field` — the catalogue's namespaced key
     (`"trip.pickup"`) is the real column name, never `Dimension.field`'s
     bare JS property (`pickup`). Only meaningful when the held dimension's
     field lives on this same table; see `holdConstant` in `reportsFunnel.ts`. */
  const dimField =
    dimension && dimension.resource === measure.population.resource
      ? await resolveColumn(db, source.table_name, fieldColumns, dimension.key)
      : null

  const table = quoteIdent(source.table_name)
  const dateExpr = timeExprSql(timeField)
  const subjectExpr = quoteIdent(source.subject_column)
  const rowIdExpr = quoteIdent(rowIdField.column)
  const dimExpr = dimField ? `(${quoteIdent(dimField.column)})::text` : 'NULL'

  const sb = new SqlBuilder()
  sb.text(
    `SELECT ${subjectExpr} AS subject_id, ${dateExpr} AS date, (${rowIdExpr})::text AS row_id, ${dimExpr} AS dim_value ` +
      `FROM ${table} WHERE TRUE`,
  )

  let forceEmpty = false
  for (const filter of [...measure.population.predicate, ...filters]) {
    const resolved = await resolveColumn(db, source.table_name, fieldColumns, filter.field)
    if (!resolved) {
      forceEmpty = true
      break
    }
    sb.text(' AND (')
    appendFilterSql(sb, quoteIdent(resolved.column), filter)
    sb.text(')')
  }
  if (forceEmpty) return { kind, events: [], truncated: false }

  sb.text(` AND ${dateExpr} >= `).param(window.from).text(` AND ${dateExpr} <= `).param(window.to)
  sb.text(' LIMIT ').param(rowCap + 1)

  const raw = await sb.run<{ subject_id: string | null; date: string; row_id: string; dim_value: string | null }>(db)
  const truncated = raw.length > rowCap
  const capped = truncated ? raw.slice(0, rowCap) : raw

  const events: SubjectEvent[] = []
  for (const r of capped) {
    if (!r.subject_id) continue
    events.push({
      subjectId: r.subject_id,
      date: r.date as IsoDate,
      rowId: `${measure.population.resource}#${r.row_id}`,
      dimValue: r.dim_value,
    })
  }
  events.sort(
    (a, b) => a.date.localeCompare(b.date) || a.subjectId.localeCompare(b.subjectId) || a.rowId.localeCompare(b.rowId),
  )

  return { kind, events, truncated }
}

/**
 * `lastActiveOf`: "when was this subject last seen," read off the store as a
 * deliberate exception, not derived from any measure. A rider's own
 * `lastTripAt`; a driver's latest `trips.endedAt`. Whole-index, not
 * per-subject, so `resolveCohort` makes one query per kind. */
export async function fetchLastActiveIndex(db: Database, kind: SubjectKind): Promise<Map<string, IsoDate>> {
  const out = new Map<string, IsoDate>()
  if (kind === 'rider') {
    const source = await loadMeasureSource(db, 'riders')
    if (!source) return out
    const table = quoteIdent(source.table_name)
    const sb = new SqlBuilder().text(`SELECT id, "lastTripAt" FROM ${table} WHERE "lastTripAt" IS NOT NULL`)
    const rows = await sb.run<{ id: string; lastTripAt: string | null }>(db)
    for (const row of rows) {
      if (row.lastTripAt) out.set(row.id, localDayOf(row.lastTripAt))
    }
    return out
  }

  const source = await loadMeasureSource(db, 'trips')
  if (!source) return out
  const table = quoteIdent(source.table_name)
  const sb = new SqlBuilder().text(
    `SELECT "driverId", MAX("endedAt") AS last_ended FROM ${table} WHERE "driverId" IS NOT NULL AND "endedAt" IS NOT NULL GROUP BY "driverId"`,
  )
  const rows = await sb.run<{ driverId: string; last_ended: string | null }>(db)
  for (const row of rows) {
    if (row.last_ended) out.set(row.driverId, localDayOf(row.last_ended))
  }
  return out
}

export type { Dimension, Measure }
