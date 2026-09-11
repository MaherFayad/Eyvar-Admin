/**
 * The `ReportQuery` shape, as Zod — shared by T4/T5/T6/T9, the four tools that
 * take a query. `src/data/types/report.ts` is the authority on the type; this
 * schema exists so a malformed query is refused with the field that is wrong
 * **before** `planQuery`/`resolveReport` ever see it (AC-1240's "refused with
 * the schema error, not executed").
 *
 * **Scope.** The core trend fields (`measures`, `groupBy`, `filters`,
 * `window`, `grain`, `periodComparison`, `chartType`) are validated strictly.
 * The five mode-specific configurations (`formula`, `transform`, `segments`,
 * `comparisonDisplay`, `mode`, `funnel`, `cohort`, `journey`, `table`) are
 * validated loosely — present-or-absent, object-shaped — because their full
 * legality (server support, cardinality, step counts) is `planQuery`'s job
 * (T4), not the wire schema's. A tool that mis-shapes one of these still gets
 * a typed violation back from T4, just not from Zod first.
 */

import { z } from 'zod'

const filterOperator = z.enum(['eq', 'neq', 'in', 'nin', 'gt', 'gte', 'lt', 'lte', 'contains', 'between', 'isNull', 'isNotNull'])

const filterValue = z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.union([z.string(), z.number()]))])

export const filterSpecSchema = z.object({
  field: z.string().min(1),
  op: filterOperator,
  value: filterValue,
})

const reportPreset = z.enum([
  'today',
  'yesterday',
  'last-7d',
  'last-30d',
  'last-90d',
  'last-365d',
  'last-month',
  'last-12-months',
  'last-year',
  'this-quarter',
  'last-quarter',
  'this-year',
  'year-to-date',
])

export const reportWindowSchema = z.union([
  z.object({ kind: z.literal('preset'), preset: reportPreset }),
  z.object({ kind: z.literal('absolute'), from: z.string(), to: z.string() }),
])

export const periodComparisonSchema = z.union([
  z.enum(['none', 'previous-period', 'previous-quarter', 'previous-year']),
  z.object({ kind: z.literal('fixed'), from: z.string(), to: z.string() }),
])

const reportGrain = z.enum(['none', 'hour', 'day', 'week', 'month', 'quarter'])

const chartType = z.enum(['line', 'area', 'bar', 'stacked-bar', 'stacked-100', 'horizontal-bar', 'pie', 'kpi', 'table'])

const measureRefSchema = z.object({
  key: z.string().min(1),
  aggregate: z.enum(['count', 'sum', 'avg', 'end-of-period', 'cumulative-count']).optional(),
})

/** The mode-specific configurations — loosely validated, see the file header. */
const looseObject = z.record(z.string(), z.unknown())

export const reportQuerySchema = z
  .object({
    measures: z.array(measureRefSchema).min(1, 'at least one measure').max(2, 'at most two measures (§6.1)'),
    groupBy: z.array(z.string()).max(2, 'at most two group-by dimensions (G4)').default([]),
    filters: z.array(filterSpecSchema).default([]),
    window: reportWindowSchema,
    grain: reportGrain,
    periodComparison: periodComparisonSchema,
    chartType,
    formula: z.object({ expression: z.string(), label: z.string() }).optional(),
    transform: z
      .object({ cumulative: z.boolean(), rollingAverage: z.number().nullable(), percentOfTotal: z.boolean() })
      .optional(),
    segments: z.array(looseObject).max(4).optional(),
    comparisonDisplay: z.enum(['series', 'difference', 'percent-change']).optional(),
    mode: z.enum(['trend', 'funnel', 'table', 'cohort', 'journey']).optional(),
    funnel: looseObject.optional(),
    cohort: looseObject.optional(),
    journey: looseObject.optional(),
    table: looseObject.optional(),
  })
  .strict()

export type ReportQueryInput = z.infer<typeof reportQuerySchema>
