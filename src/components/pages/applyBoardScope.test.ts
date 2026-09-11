/**
 * `applyBoardScope`/`boardFilterFields` — ported from `dashboard.depth.test.tsx`
 * §1 (D39). The function itself did not move or change; only its caller did
 * (`useResolvedReport.ts`, AC-1187), so the guarantee survives verbatim.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { EYVAR_TODAY, disableMockLatency, getReport, listDimensions, listMeasures, resetDataLayer } from '@/data/clients'
import { applyBoardScope, boardFilterFields } from '@/data/clients/dashboards'
import type { ReportQuery } from '@/data/types'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

async function catalogue() {
  const [measures, dimensions] = await Promise.all([listMeasures({ pageSize: 100 }), listDimensions({ pageSize: 100 })])
  return { measures: measures.items, dimensions: dimensions.items }
}

describe('applyBoardScope refuses rather than distorts', () => {
  it('applies a filter the report can take, and names the one it cannot', async () => {
    const cat = await catalogue()
    const trips = (await getReport('RPT-2')).data.query
    const both = (await getReport('RPT-1')).data.query

    const scope = { range: null, filters: [{ field: 'trip.kind', op: 'eq' as const, value: 'quick' }] }

    const onTrips = applyBoardScope(trips, scope, cat, EYVAR_TODAY)
    expect(onTrips.appliedFilterFields).toEqual(['trip.kind'])
    expect(onTrips.refusedFilterFields).toEqual([])
    expect(onTrips.query.filters).toContainEqual({ field: 'trip.kind', op: 'eq', value: 'quick' })

    const onBoth = applyBoardScope(both, scope, cat, EYVAR_TODAY)
    expect(onBoth.appliedFilterFields).toEqual([])
    expect(onBoth.refusedFilterFields).toEqual(['trip.kind'])
    expect(onBoth.query.filters).toEqual(both.filters)
  })

  it('replaces the report’s own filter on the same field rather than joining it', async () => {
    const cat = await catalogue()
    const base = (await getReport('RPT-2')).data.query
    const withOwn: ReportQuery = { ...base, filters: [{ field: 'trip.kind', op: 'eq', value: 'scheduled' }] }

    const scoped = applyBoardScope(
      withOwn,
      { range: null, filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }] },
      cat,
      EYVAR_TODAY,
    )

    expect(scoped.query.filters).toEqual([{ field: 'trip.kind', op: 'eq', value: 'quick' }])
  })

  it('applies a range that introduces no new violation', async () => {
    const cat = await catalogue()
    const trend = (await getReport('RPT-2')).data.query
    expect(trend.window).toEqual({ kind: 'preset', preset: 'last-30d' })

    const scoped = applyBoardScope(trend, { range: { kind: 'preset', preset: 'last-7d' }, filters: [] }, cat, EYVAR_TODAY)

    expect(scoped.rangeRefused).toBe(false)
    expect(scoped.query.window).toEqual({ kind: 'preset', preset: 'last-7d' })
  })

  it('refuses a range the report cannot answer at, and keeps the saved window', async () => {
    const cat = await catalogue()
    const cohort = (await getReport('RPT-7')).data.query
    expect(cohort.window).toEqual({ kind: 'preset', preset: 'last-365d' })

    const scoped = applyBoardScope(cohort, { range: { kind: 'preset', preset: 'last-7d' }, filters: [] }, cat, EYVAR_TODAY)

    expect(scoped.rangeRefused).toBe(true)
    expect(scoped.query.window).toEqual({ kind: 'preset', preset: 'last-365d' })
  })

  it('does not blame the board for a violation the report already carried', async () => {
    const cat = await catalogue()
    const cohort = (await getReport('RPT-7')).data.query
    const alreadyBroken: ReportQuery = { ...cohort, window: { kind: 'preset', preset: 'last-30d' } }

    const scoped = applyBoardScope(alreadyBroken, { range: { kind: 'preset', preset: 'last-7d' }, filters: [] }, cat, EYVAR_TODAY)

    expect(scoped.rangeRefused).toBe(false)
    expect(scoped.query.window).toEqual({ kind: 'preset', preset: 'last-7d' })
  })

  it('offers only filter fields the catalogue really names', async () => {
    const cat = await catalogue()
    const fields = boardFilterFields(cat.measures, cat.dimensions)

    expect(fields.length, 'the catalogue declares filterable fields').toBeGreaterThan(0)
    for (const key of fields) {
      expect(cat.dimensions.some((dimension) => dimension.key === key), key).toBe(true)
    }
    const declared = new Set(cat.measures.flatMap((measure) => measure.filterableFields))
    for (const key of fields) expect(declared.has(key)).toBe(true)
  })
})
