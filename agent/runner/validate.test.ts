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
  {
    kind: 'run',
    runId: 'RUN-2',
    result: {
      buckets: ['2026-06-24'],
      series: [{ id: 'trips.completed#Al Malaz#current', points: [9] }],
    },
  },
  { kind: 'run', runId: 'RUN-3', result: { buckets: ['2026-06-24'], series: [{ id: 'captains.active#_#current', points: [120] }] } },
]

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
