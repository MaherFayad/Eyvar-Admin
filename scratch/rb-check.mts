import { disableMockLatency, mockFailures } from '../src/data/config'
import { runReport, exportReport, useTruncatedReports, resetReports } from '../src/data/clients/reports'
import { listMeasures, planReportQuery } from '../src/data/clients/catalogue'
import { evaluateAlertRule, listAlertRules } from '../src/data/clients/alerts'
import { measureFixtures, dimensionFixtures } from '../src/data/fixtures/measures'
import { switchMockUser, resetMockSession } from '../src/data/clients/session'
import { serialiseReportQuery, deserialiseReportQuery } from '../src/data/reporting/serialise'
import { knownOperations } from '../src/data/config'
import type { ReportQuery } from '../src/data/types/report'

disableMockLatency()
const CAT = { measures: measureFixtures, dimensions: dimensionFixtures }
const TODAY = '2026-06-25'
const q = (o: Partial<ReportQuery>): ReportQuery => ({
  measures: [], groupBy: null, filters: [],
  window: { kind: 'preset', preset: 'last-30d' }, grain: 'day',
  periodComparison: 'none', chartType: 'line', ...o,
})

// 1 — the owner's headline example
const owner = q({ measures: [{ key: 'captains.registered' }, { key: 'riders.registered' }] })
const r1 = await runReport(owner, { today: TODAY })
if (r1.status !== 'ok') throw new Error('owner example refused: ' + JSON.stringify(r1))
console.log('1 owner example: panels=%d series=%d buckets=%d',
  r1.result.panels.length, r1.result.series.length, r1.result.buckets.length)
console.log('   captains last=%o riders last=%o',
  r1.result.series[0]!.points.at(-1), r1.result.series[1]!.points.at(-1))
console.log('   panelIds distinct =', new Set(r1.result.series.map(s => s.panelId)).size)

// 2 — stock vs flow refusal
const mixed = q({ measures: [{ key: 'captains.registered' }, { key: 'subscriptions.started' }] })
const r2 = await runReport(mixed, { today: TODAY })
console.log('2 mixed temporality ->', r2.status, r2.status === 'invalid-query' ? r2.violations[0]!.code : '')

// 3 — gaps outside coverage
const rev = q({ measures: [{ key: 'revenue.total' }], window: { kind: 'preset', preset: 'last-90d' }, periodComparison: 'previous-period' })
const r3 = await runReport(rev, { today: TODAY })
if (r3.status !== 'ok') throw new Error('rev refused')
const pts = r3.result.series[0]!.points
console.log('3 90d revenue: buckets=%d nulls=%d warnings=%o', pts.length, pts.filter(p => p === null).length, r3.result.warnings)
console.log('   series roles =', r3.result.series.map(s => s.role), 'panels =', r3.result.panels.length)

// 4 — group fold
const fold = q({ measures: [{ key: 'trips.completed' }], groupBy: 'trip.pickup', grain: 'week' })
const r4 = await runReport(fold, { today: TODAY })
if (r4.status !== 'ok') throw new Error('fold refused')
console.log('4 fold: series=%d folded=%o other=%s', r4.result.series.length, r4.result.foldedGroupCount,
  r4.result.series.at(-1)!.groupValue)

// 5 — stock invariance across grains (AC-820)
const day = await runReport(q({ measures: [{ key: 'captains.registered' }] }), { today: TODAY })
const month = await runReport(q({ measures: [{ key: 'captains.registered' }], grain: 'month' }), { today: TODAY })
if (day.status !== 'ok' || month.status !== 'ok') throw new Error('x')
console.log('5 stock day last=%o month last=%o (must match)', day.result.series[0]!.points.at(-1), month.result.series[0]!.points.at(-1))

// 6 — flow additivity week == sum of days (AC-821)
const dflow = await runReport(q({ measures: [{ key: 'subscriptions.started' }] }), { today: TODAY })
const wflow = await runReport(q({ measures: [{ key: 'subscriptions.started' }], grain: 'week' }), { today: TODAY })
if (dflow.status !== 'ok' || wflow.status !== 'ok') throw new Error('x')
const dsum = dflow.result.series[0]!.points.reduce((a: number, b) => a + (b ?? 0), 0)
const wsum = wflow.result.series[0]!.points.reduce((a: number, b) => a + (b ?? 0), 0)
console.log('6 flow day-sum=%d week-sum=%d (must match)', dsum, wsum)

// 7 — permission redaction
await switchMockUser('USR-3')
const r7 = await runReport(q({ measures: [{ key: 'revenue.total' }] }), { today: TODAY })
if (r7.status !== 'ok') throw new Error('x')
console.log('7 blocked=%o points=%d', r7.result.series[0]!.blocked, r7.result.series[0]!.points.length)
resetMockSession()

// 8 — chart legality
const plan = planReportQuery(q({ measures: [{ key: 'subscriptions.started' }], groupBy: 'subscription.plan', grain: 'none', chartType: 'pie' }), CAT, TODAY)
console.log('8 pie legal =', plan.chartTypes.find(c => c.value === 'pie')!.legal, 'effective =', plan.effectiveChartType)
const plan2 = planReportQuery(q({ measures: [{ key: 'trips.cancellationRate' }], groupBy: null, grain: 'none', chartType: 'pie' }), CAT, TODAY)
console.log('   pie on percent =', plan2.chartTypes.find(c => c.value === 'pie')!.legal, '->', plan2.effectiveChartType, plan2.chartTypes.find(c => c.value === 'pie')!.reasonKey)
const plan3 = planReportQuery(q({ measures: [{ key: 'revenue.total' }], window: { kind: 'preset', preset: 'last-year' }, grain: 'hour' }), CAT, TODAY)
console.log('   hour grain =', plan3.grains.find(g => g.value === 'hour'), 'buckets =', plan3.bucketCount)

// 9 — URL round trip
const round = deserialiseReportQuery(serialiseReportQuery(owner))
console.log('9 url lossless =', JSON.stringify(round) === JSON.stringify(owner))

// 10 — truncation
useTruncatedReports(40)
const r10 = await runReport(q({ measures: [{ key: 'trips.completed' }] }), { today: TODAY })
if (r10.status !== 'ok') throw new Error('x')
console.log('10 truncated=%o at=%o', r10.result.truncated, r10.result.truncatedAtRows)
resetReports()

// 11 — CSV money in SAR
const csv = await exportReport(q({ measures: [{ key: 'revenue.total' }], window: { kind: 'preset', preset: 'last-7d' } }), { reportName: 'x', today: TODAY })
console.log('11 csv rows=%d sample=%o', csv.rows.length, csv.rows.at(-1))

// 12 — alert test-run
const rules = await listAlertRules()
const ev = await evaluateAlertRule('ALR-1', { today: TODAY })
console.log('12 rules=%d evaluate=%o', rules.total, ev)

// 13 — failure injection
mockFailures.always('reports.run')
await runReport(owner, { today: TODAY }).then(() => console.log('13 FAIL: did not throw')).catch(e => console.log('13 injected ->', e.name, e.status))
mockFailures.clear()

// 14 — operation registry
const measures = await listMeasures()
console.log('14 measures=%d ops=%o', measures.total, knownOperations().filter(o => /^(catalogue|reports|dashboards|alerts)\./.test(o)))
