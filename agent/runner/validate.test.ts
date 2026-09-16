/**
 * §7 / AC-1246 — the five scenarios the WP names explicitly: a passing
 * study, a number that does not match its run, a run id from another job,
 * fewer than two alternatives, and a PII leak. The passing fixture reuses
 * `DONE_JOB_CASE_STUDY` (`src/data/fixtures/agent.ts`) rather than a
 * hand-rolled one, so the "happy path" test is checked against the same
 * study the rest of the product already treats as the reference `done` job.
 */

import { describe, expect, it } from 'vitest'
import { DONE_JOB_CASE_STUDY } from '../../src/data/fixtures/agent'
import { validate, type ToolLogEntry } from './validate.js'

/** The tool log a spawn that actually produced `DONE_JOB_CASE_STUDY` would have built — RUN-1/RUN-2 carry full results (`run_report`), RUN-3 is cited only as evidence for an alternative (also `run_report` in the fixture's own story, given full data here too). */
const PASSING_TOOL_LOG: ToolLogEntry[] = [
  {
    kind: 'run',
    runId: 'RUN-1',
    result: {
      buckets: ['2026-06-22', '2026-06-23', '2026-06-24'],
      series: [{ id: 'trips.cancellationRate#_#current', points: [5, 6, 7] }],
    },
  },
  /* RUN-2's real result, as the resolver returns it. The last bucket is partial:
     KAFD's points sum to 8 and the study quotes 7, because a partial bucket is
     excluded from every total. */
  {
    kind: 'run',
    runId: 'RUN-2',
    result: {
      buckets: ["2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30", "2026-05-31", "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05", "2026-06-06", "2026-06-07", "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12", "2026-06-13", "2026-06-14", "2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-19", "2026-06-20", "2026-06-21", "2026-06-22", "2026-06-23", "2026-06-24", "2026-06-25"],
      series: [
        { id: 'trips.completed#Al Malqa#current', points: [0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], partialBucketIndexes: [29] },
        { id: 'trips.completed#KAFD#current', points: [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1], partialBucketIndexes: [29] },
      ],
    },
  },
  { kind: 'run', runId: 'RUN-3', result: { buckets: ['2026-06-24'], series: [{ id: 'captains.active#_#current', points: [120] }] } },
]

describe('validate — a total excludes the partial bucket', () => {
  it('recomputes a total over complete buckets only, as the study states it', () => {
    const log: ToolLogEntry[] = [
      ...PASSING_TOOL_LOG,
      {
        kind: 'run',
        runId: 'RUN-X',
        result: {
          buckets: ['d1', 'd2', 'd3'],
          series: [{ id: 's', points: [1000, 1000, 400], partialBucketIndexes: [2] }],
        },
      },
    ]
    const study = {
      ...DONE_JOB_CASE_STUDY,
      findings: [
        {
          ...DONE_JOB_CASE_STUDY.findings[0]!,
          evidence: ['RUN-X'],
          values: [{ runId: 'RUN-X', seriesId: 's', bucket: 'total', value: 2000, unit: 'count', currency: null }],
        },
      ],
      contributors: [],
    }
    expect(validate(study, log).ok).toBe(true)
    /* 2,400 would include the partial bucket — outside rounding, so refused. */
    const withPartial = {
      ...study,
      findings: [{ ...study.findings[0]!, values: [{ ...study.findings[0]!.values[0]!, value: 2400 }] }],
    }
    expect(validate(withPartial, log).ok).toBe(false)
  })
})

describe('validate — a passing study', () => {
  it('accepts DONE_JOB_CASE_STUDY against a tool log that backs every cited runId and value', () => {
    const result = validate(DONE_JOB_CASE_STUDY, PASSING_TOOL_LOG)
    expect(result.ok).toBe(true)
  })
})

describe('validate — AC-1246: a value that does not match its run', () => {
  it('rejects with category "evidence" when the claimed number diverges from the stored run', () => {
    const study = {
      ...DONE_JOB_CASE_STUDY,
      findings: [
        {
          ...DONE_JOB_CASE_STUDY.findings[0]!,
          values: [{ runId: 'RUN-1', seriesId: 'trips.cancellationRate#_#current', bucket: '2026-06-24', value: 42, unit: 'percent', currency: null }],
        },
        DONE_JOB_CASE_STUDY.findings[1]!,
      ],
    }
    const result = validate(study, PASSING_TOOL_LOG)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.category).toBe('evidence')
      expect(result.violations.some((v) => v.includes('RUN-1') && v.includes('claims 42'))).toBe(true)
    }
  })
})

describe('validate — AC-1246: a run id from another job', () => {
  it('rejects citing a runId this job never produced, the same as one that does not exist at all', () => {
    const study = {
      ...DONE_JOB_CASE_STUDY,
      baseline: { ...DONE_JOB_CASE_STUDY.baseline, runId: 'RUN-FROM-JOB-AGT-99' },
    }
    const result = validate(study, PASSING_TOOL_LOG)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.category).toBe('evidence')
      expect(result.violations.some((v) => v.includes('RUN-FROM-JOB-AGT-99'))).toBe(true)
    }
  })
})

describe('validate — AC-1246: fewer than two alternatives', () => {
  it('fails schema validation, not evidence, when alternatives has fewer than two entries', () => {
    const study = { ...DONE_JOB_CASE_STUDY, alternatives: [DONE_JOB_CASE_STUDY.alternatives[0]!] }
    const result = validate(study, PASSING_TOOL_LOG)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.category).toBe('schema')
      expect(result.violations.some((v) => v.includes('alternatives'))).toBe(true)
    }
  })

  it('also fails schema validation when dataQuality is missing', () => {
    const { dataQuality: _omit, ...rest } = DONE_JOB_CASE_STUDY
    const result = validate(rest, PASSING_TOOL_LOG)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.category).toBe('schema')
      expect(result.violations.some((v) => v.includes('dataQuality'))).toBe(true)
    }
  })
})

describe('validate — AC-1246: a PII leak', () => {
  it('rejects an unmasked phone number anywhere in the output', () => {
    const study = { ...DONE_JOB_CASE_STUDY, decision: 'Call the rider directly at 0501234567 to confirm.' }
    const result = validate(study, PASSING_TOOL_LOG)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.category).toBe('schema')
      expect(result.violations.some((v) => v.includes('phone'))).toBe(true)
    }
  })

  it('rejects an unmasked email address anywhere in the output', () => {
    const study = { ...DONE_JOB_CASE_STUDY, headline: { ...DONE_JOB_CASE_STUDY.headline, confidenceReason: 'Confirmed with rider@example.com directly.' } }
    const result = validate(study, PASSING_TOOL_LOG)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.category).toBe('schema')
      expect(result.violations.some((v) => v.includes('email'))).toBe(true)
    }
  })

  it('does not flag a masked phone or an ISO date as a leak', () => {
    const study = { ...DONE_JOB_CASE_STUDY, followUps: ['Contact ••34 if the rate holds.', 'Recheck on 2026-06-28.'] }
    const result = validate(study, PASSING_TOOL_LOG)
    expect(result.ok).toBe(true)
  })
})

describe('validate — run-ref entries (T6/T9) are citable but not recomputable', () => {
  it('accepts a citation of a run-ref runId without attempting to recompute its values', () => {
    const study = {
      ...DONE_JOB_CASE_STUDY,
      contributors: [{ dimension: 'trip.pickup' as const, group: 'Al Malaz', deltaAbs: 4, shareOfChangePct: 42, runId: 'RUN-COMPARE-1' }],
    }
    const toolLog: ToolLogEntry[] = [...PASSING_TOOL_LOG, { kind: 'run-ref', runId: 'RUN-COMPARE-1' }]
    const result = validate(study, toolLog)
    expect(result.ok).toBe(true)
  })
})
