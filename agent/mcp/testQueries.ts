/** Shared `ReportQuery` fixtures for the T4…T9 tool tests. */

export const tripsCompletedTrend = {
  measures: [{ key: 'trips.completed' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
} as const

/** `trip.kind` is a dimension `trips.completed` actually declares (§4.1 F-3) — `driver.city` is not. */
export const tripsCompletedByKind = {
  measures: [{ key: 'trips.completed' }],
  groupBy: ['trip.kind'],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'bar',
} as const

/** Schema-legal but semantically illegal — an inverted window, `window-inverted`. */
export const invalidQuery = {
  measures: [{ key: 'trips.completed' }],
  groupBy: [],
  filters: [],
  window: { kind: 'absolute', from: '2026-06-25', to: '2026-06-01' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
} as const

/** Schema-legal, catalogue-illegal — survives a window override (T6/T9 replace `query.window` with their own windowA/windowB). */
export const queryWithUnknownMeasure = {
  measures: [{ key: 'not.a.real.measure' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
} as const
