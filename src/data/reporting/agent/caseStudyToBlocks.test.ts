import { describe, expect, it } from 'vitest'
import type { CaseStudy } from '../../types/agent'
import { PAGE_HEADING_MAX, PAGE_TEXT_MD_MAX, type AgentInsightBlock } from '../../types/page'
import { caseStudyToBlocks } from './caseStudyToBlocks'
import { validatePage } from '../pages/validate'
import type { Page } from '../../types/page'

/** A realistic, deliberately-ugly study: two findings, a partial bucket
 *  noted, a blocked series, a long Arabic hypothesis — nothing tidy. */
const study: CaseStudy = {
  title: 'Cancellation rate rose 4.2pp week over week',
  language: 'ar',
  question: 'لماذا ارتفع معدل الإلغاء هذا الأسبوع مقارنة بالأسبوع الماضي؟',
  decision: 'Whether to page the on-call ops lead before the Monday review.',
  headline: { text: 'Cancellations rose, concentrated in Riyadh evenings', confidence: 'medium', confidenceReason: 'one blocked series' },
  baseline: {
    measureKey: 'trips.cancelled',
    window: { kind: 'preset', preset: 'last-7d' },
    grain: 'day',
    level: 812,
    previousPeriodDeltaPct: 4.2,
    trendSlopePerBucket: 3.1,
    runId: 'RUN-baseline-1',
  },
  findings: [
    {
      id: 'F-1',
      text: 'Riyadh evening cancellations are the largest single contributor, and one series was blocked for the comparison window.',
      values: [
        { runId: 'RUN-1', seriesId: 'riyadh-evening', bucket: '2026-06-24', value: 340, unit: 'count', currency: null },
        { runId: 'RUN-1', seriesId: 'riyadh-evening', bucket: '2026-06-25', value: 412, unit: 'count', currency: null },
        { runId: 'RUN-2', seriesId: 'refund-cost', bucket: 'total', value: 918000, unit: 'money', currency: 'SAR' },
      ],
      evidence: ['RUN-1', 'RUN-2', 'RUN-3'],
      chart: { measures: [], groupBy: null, filters: [], window: { kind: 'preset', preset: 'last-7d' }, grain: 'day', periodComparison: 'none' } as never,
    },
    {
      id: 'F-2',
      text: 'A rider with no completed trips this window skews the district split.',
      values: [],
      evidence: [],
      chart: null,
    },
  ],
  contributors: [{ dimension: 'trip.district', group: 'Riyadh', deltaAbs: 210, shareOfChangePct: 62, runId: 'RUN-4' }],
  alternatives: [
    {
      hypothesis: 'العطلة الرسمية في نهاية الأسبوع قد تكون سبب الارتفاع، وليس جودة الخدمة',
      tested: true,
      evidence: ['RUN-5'],
      verdict: 'not-supported',
      text: 'No public holiday fell in this window.',
    },
    {
      hypothesis: 'A tracking gap under-counts last week and over-states the delta',
      tested: true,
      evidence: ['RUN-6'],
      verdict: 'supported',
      text: 'One partial bucket was excluded from the comparison, consistent with a smaller true delta.',
    },
  ],
  dataQuality: {
    gaps: ['2026-06-20'],
    partialBucketsExcluded: true,
    blockedSeries: ['promo-attribution'],
    truncated: false,
    coverageNote: 'Coverage is 30 daily snapshots ending 2026-06-25.',
  },
  recommendations: [
    {
      text: 'Review Riyadh evening dispatch capacity before Monday.',
      ownerRole: 'Ops lead',
      expectedEffect: { measureKey: 'trips.cancelled', direction: 'down', magnitude: 1.5 },
      verifyWith: { reportQuery: null, alertCondition: null },
      reviewBy: '2026-06-29',
    },
  ],
  followUps: ['Check whether the promo-attribution block clears next week.'],
}

const JOB_ID = 'JOB-99'

const pageFor = (blocks: ReturnType<typeof caseStudyToBlocks>): Page => ({
  id: 'PG-1',
  kind: 'case-study',
  title: study.title,
  icon: null,
  description: null,
  ownerId: 'USR-1',
  visibility: 'private',
  tags: [],
  official: false,
  scope: { range: null, filters: [] },
  blocks,
  version: 1,
  publishedAt: null,
  createdAt: '2026-06-25T00:00:00Z',
  updatedAt: '2026-06-25T00:00:00Z',
  updatedBy: 'USR-1',
})

/** The measured numbers a formatted evidence line bolds (`**340 count**`) — bucket dates and run ids carry digits too, so only the bolded value is "a number" for this check. */
function numbersIn(text: string): string[] {
  const matches = text.match(/\*\*(-?\d+(\.\d+)?)/g) ?? []
  return matches.map((m) => m.slice(2))
}

describe('caseStudyToBlocks', () => {
  it('produces a page with no validatePage violations (AC target: validatePage clean for any valid study)', () => {
    const blocks = caseStudyToBlocks(study, JOB_ID)
    expect(validatePage(pageFor(blocks))).toEqual([])
  })

  it('opens with the question as a level-1 heading', () => {
    const [first] = caseStudyToBlocks(study, JOB_ID)
    expect(first).toMatchObject({ type: 'heading', level: 1, text: study.question })
  })

  it('emits one agent-insight evidence block per finding, carrying every evidence run id', () => {
    const blocks = caseStudyToBlocks(study, JOB_ID)
    const f1Evidence = blocks.find(
      (b): b is AgentInsightBlock => b.type === 'agent-insight' && b.findingId === 'F-1',
    )
    expect(f1Evidence).toBeDefined()
    for (const runId of study.findings[0]!.evidence) expect(f1Evidence!.runIds).toContain(runId)
    for (const value of study.findings[0]!.values) expect(f1Evidence!.runIds).toContain(value.runId)
  })

  it('no number without a run: every number in a finding evidence block traces to a value in that finding', () => {
    const blocks = caseStudyToBlocks(study, JOB_ID)
    for (const finding of study.findings) {
      const evidence = blocks.find(
        (b): b is AgentInsightBlock => b.type === 'agent-insight' && b.findingId === finding.id,
      )!
      const knownNumbers = new Set(finding.values.map((v) => String(v.value)))
      for (const n of numbersIn(evidence.md)) expect(knownNumbers.has(n)).toBe(true)
      // and every run id the block cites was actually named by the finding
      const knownRunIds = new Set([...finding.evidence, ...finding.values.map((v) => v.runId)])
      for (const runId of evidence.runIds) expect(knownRunIds.has(runId)).toBe(true)
    }
  })

  it('a finding with no values and no evidence produces an evidence block with no numbers and no run ids', () => {
    const blocks = caseStudyToBlocks(study, JOB_ID)
    const f2Evidence = blocks.find(
      (b): b is AgentInsightBlock => b.type === 'agent-insight' && b.findingId === 'F-2',
    )!
    expect(numbersIn(f2Evidence.md)).toEqual([])
    expect(f2Evidence.runIds).toEqual([])
  })

  it('is impossible by construction to add a value without a runId: CaseStudyFindingValue requires one', () => {
    // @ts-expect-error — `runId` is required; this line does not typecheck, proving the shape cannot exist.
    const invalid: import('../../types/agent').CaseStudyFindingValue = { seriesId: 's', bucket: 'total', value: 1, unit: 'count', currency: null }
    expect(invalid).toBeDefined()
  })

  it('renders each alternative as a closed toggle titled with its hypothesis, holding its evidence', () => {
    const blocks = caseStudyToBlocks(study, JOB_ID)
    const toggles = blocks.filter((b) => b.type === 'toggle')
    expect(toggles).toHaveLength(study.alternatives.length)
    toggles.forEach((toggle, i) => {
      if (toggle.type !== 'toggle') throw new Error('expected a toggle')
      expect(toggle.open).toBe(false)
      expect(toggle.title).toBe(study.alternatives[i]!.hypothesis)
      expect(toggle.blocks).toHaveLength(1)
      const inner = toggle.blocks[0]!
      if (inner.type !== 'agent-insight') throw new Error('expected the toggle to hold an agent-insight block')
      for (const runId of study.alternatives[i]!.evidence) expect(inner.runIds).toContain(runId)
    })
  })

  it('renders one text block per recommendation, naming the owner role and review date', () => {
    const blocks = caseStudyToBlocks(study, JOB_ID)
    const rec = study.recommendations[0]!
    const block = blocks.find((b) => b.type === 'text' && b.md.includes(rec.ownerRole))
    expect(block).toBeDefined()
    if (block?.type !== 'text') throw new Error('expected a text block')
    expect(block.md).toContain(rec.reviewBy)
    expect(block.md).toContain(String(rec.expectedEffect.magnitude))
  })

  it('renders one data-quality callout naming the coverage note, gaps and blocked series', () => {
    const blocks = caseStudyToBlocks(study, JOB_ID)
    const callout = blocks.find((b) => b.type === 'callout')
    expect(callout).toBeDefined()
    if (callout?.type !== 'callout') throw new Error('expected a callout block')
    expect(callout.tone).toBe('neutral')
    expect(callout.md).toContain(study.dataQuality.coverageNote)
    expect(callout.md).toContain(study.dataQuality.gaps[0])
    expect(callout.md).toContain(study.dataQuality.blockedSeries[0])
  })

  it('every block id is unique within the output', () => {
    const blocks = caseStudyToBlocks(study, JOB_ID)
    expect(validatePage(pageFor(blocks)).filter((v) => v.code === 'duplicate-block-id')).toEqual([])
  })

  describe('chartReportIds (T13 charts, AC-1129)', () => {
    const fullMap = { 'F-1': 'RPT-101', 'F-2': 'RPT-102' }

    it('with a full map, emits one report block per finding, each immediately followed by its agent-insight block', () => {
      const blocks = caseStudyToBlocks(study, JOB_ID, fullMap)
      for (const finding of study.findings) {
        const reportIndex = blocks.findIndex((b) => b.type === 'report' && b.id.includes(finding.id))
        expect(reportIndex).toBeGreaterThanOrEqual(0)
        const reportBlock = blocks[reportIndex]!
        if (reportBlock.type !== 'report') throw new Error('expected a report block')
        expect(reportBlock.reportId).toBe(fullMap[finding.id as keyof typeof fullMap])
        const next = blocks[reportIndex + 1]!
        if (next.type !== 'agent-insight') throw new Error('expected the next block to be agent-insight')
        expect(next.findingId).toBe(finding.id)
      }
      expect(validatePage(pageFor(blocks))).toEqual([])
    })

    it('without the map, produces exactly the same output as calling with no third argument at all', () => {
      const withoutArg = caseStudyToBlocks(study, JOB_ID)
      const withUndefined = caseStudyToBlocks(study, JOB_ID, undefined)
      expect(withUndefined).toEqual(withoutArg)
      expect(withoutArg.some((b) => b.type === 'report')).toBe(false)
      expect(validatePage(pageFor(withoutArg))).toEqual([])
    })

    it('a partial map degrades only the findings it lacks, without throwing or dropping them', () => {
      const partialMap = { 'F-1': 'RPT-101' }
      const blocks = caseStudyToBlocks(study, JOB_ID, partialMap)

      const f1Report = blocks.find((b) => b.type === 'report' && b.id.includes('F-1'))
      expect(f1Report).toBeDefined()

      const f2Report = blocks.find((b) => b.type === 'report' && b.id.includes('F-2'))
      expect(f2Report).toBeUndefined()
      // F-2 keeps its text and evidence blocks — the finding is never dropped for lacking a chart.
      expect(blocks.some((b) => b.type === 'text' && b.id === `${JOB_ID}-finding-F-2-text`)).toBe(true)
      expect(blocks.some((b) => b.type === 'agent-insight' && b.findingId === 'F-2')).toBe(true)

      expect(validatePage(pageFor(blocks))).toEqual([])
    })

    it('a blank or unknown reportId in the map is treated as no chart, never throws, never emits an invalid report block', () => {
      const blocks = caseStudyToBlocks(study, JOB_ID, { 'F-1': '', 'NOT-A-FINDING': 'RPT-999' })
      expect(blocks.some((b) => b.type === 'report')).toBe(false)
      expect(validatePage(pageFor(blocks))).toEqual([])
    })
  })

  it('is pure: calling it twice with the same study produces deep-equal output', () => {
    expect(caseStudyToBlocks(study, JOB_ID)).toEqual(caseStudyToBlocks(study, JOB_ID))
  })

  it('validatePage is clean even when the question and a finding are absurdly long (any valid study, not just tidy ones)', () => {
    const hugeStudy: CaseStudy = {
      ...study,
      question: 'س'.repeat(5000),
      findings: [{ ...study.findings[0]!, text: 'x'.repeat(20000) }],
    }
    const blocks = caseStudyToBlocks(hugeStudy, JOB_ID)
    expect(validatePage(pageFor(blocks))).toEqual([])
    const heading = blocks[0]!
    if (heading.type !== 'heading') throw new Error('expected a heading')
    expect(heading.text.length).toBeLessThanOrEqual(PAGE_HEADING_MAX)
    const findingText = blocks.find((b) => b.type === 'text' && b.id.includes('finding'))
    if (findingText?.type !== 'text') throw new Error('expected a text block')
    expect(findingText.md.length).toBeLessThanOrEqual(PAGE_TEXT_MD_MAX)
  })
})
