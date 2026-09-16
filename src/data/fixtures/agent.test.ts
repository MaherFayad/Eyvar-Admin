/**
 * "No number without a run": `AGT-1`'s findings and contributors must equal
 * what the cited run actually returns from the real resolver, not a
 * typed-in total (AC-1258).
 */
import { describe, expect, it } from 'vitest'
import { DONE_JOB_CASE_STUDY } from './agent'
import { getRun } from '../clients/runs'
import type { ReportResult, ReportSeries } from '../types/report'

/** The stored run's own recomputable aggregate for one series at one bucket
 *  — `'total'` sums every usable (non-null, non-partial) point, an `IsoDate`
 *  reads that bucket's point directly. Mirrors what the runner recomputes
 *  (`01-analyst-agent.md` §7: "total, mean, last, changePct"). */
function valueAt(result: ReportResult, seriesId: string, bucket: string): number | null {
  const series = result.series.find((s) => s.id === seriesId)
  if (!series) return null
  if (bucket === 'total') {
    const usable = series.points.filter((p, i) => p !== null && !series.partialBucketIndexes.includes(i)) as number[]
    return usable.length === 0 ? null : usable.reduce((sum, v) => sum + v, 0)
  }
  const index = result.buckets.indexOf(bucket)
  if (index === -1) return null
  return series.points[index] ?? null
}

/** Sum of a role's usable totals across every current/comparison series pair
 *  for one measure — the same arithmetic `reports.ts`'s `contribution()`
 *  applies over two recorded runs, applied here over one run's two roles. */
function roleTotal(result: ReportResult, role: ReportSeries['role']): number {
  return result.series
    .filter((s) => s.role === role)
    .reduce((sum, s) => {
      const usable = s.points.filter((p, i) => p !== null && !s.partialBucketIndexes.includes(i)) as number[]
      return sum + usable.reduce((a, b) => a + b, 0)
    }, 0)
}

describe('no number without a run', () => {
  it("every finding value AGT-1's case study cites equals what its run actually returns", async () => {
    for (const finding of DONE_JOB_CASE_STUDY.findings) {
      for (const value of finding.values) {
        const run = await getRun(value.runId)
        const actual = valueAt(run.data.result, value.seriesId, value.bucket)
        expect(actual, `${finding.id}: ${value.seriesId} @ ${value.bucket} (${value.runId})`).toBe(value.value)
      }
    }
  })

  it('every contributor deltaAbs and shareOfChangePct recomputes from its cited run', async () => {
    for (const contributor of DONE_JOB_CASE_STUDY.contributors) {
      const run = await getRun(contributor.runId)
      const result = run.data.result
      const measureKey = result.query.measures[0]!.key
      const currentId = `${measureKey}#${contributor.group}#current`
      const comparisonId = `${measureKey}#${contributor.group}#comparison`
      const currentTotal = valueAt(result, currentId, 'total') ?? 0
      const comparisonTotal = valueAt(result, comparisonId, 'total') ?? 0
      const deltaAbs = currentTotal - comparisonTotal
      const totalDelta = roleTotal(result, 'current') - roleTotal(result, 'comparison')
      const shareOfChangePct = (deltaAbs / totalDelta) * 100

      expect(deltaAbs, `${contributor.group} deltaAbs (${contributor.runId})`).toBe(contributor.deltaAbs)
      expect(shareOfChangePct, `${contributor.group} shareOfChangePct (${contributor.runId})`).toBeCloseTo(
        contributor.shareOfChangePct,
        1,
      )
    }
  })

  it('every finding names a real seeded pickup — no group named that the resolver never returns', async () => {
    const pickupRun = await getRun('RUN-2')
    const seededGroups = new Set(
      pickupRun.data.result.series.filter((s) => s.role === 'current').map((s) => s.groupValue),
    )
    for (const contributor of DONE_JOB_CASE_STUDY.contributors) {
      expect(seededGroups.has(contributor.group), contributor.group).toBe(true)
    }
  })
})
