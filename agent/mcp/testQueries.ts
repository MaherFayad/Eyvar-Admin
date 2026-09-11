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

export const tripsCompletedByCity = {
  measures: [{ key: 'trips.completed' }],
  groupBy: ['driver.city'],
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
