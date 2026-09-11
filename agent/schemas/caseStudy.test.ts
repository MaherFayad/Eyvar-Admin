/**
 * `agent/schemas/case-study.schema.json` — WP-7.3, `01-analyst-agent.md` §7–§8,
 * AC-1251. The schema must be strict enough that a plausible-sounding but
 * unevidenced study cannot pass it: fewer than two alternatives fails, a
 * number with no `runId` fails, and the seeded `done` job's real result
 * (`src/data/fixtures/agent.ts`) validates clean.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import { DONE_JOB_CASE_STUDY, DONE_JOB_ID } from '../../src/data/fixtures/agent'
import { caseStudyToBlocks } from '../../src/data/reporting/agent/caseStudyToBlocks'
import { validatePage } from '../../src/data/reporting/pages/validate'
import type { CaseStudy } from '../../src/data/types/agent'
import type { Page } from '../../src/data/types/page'

function loadSchema(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(__dirname, name), 'utf8')) as Record<string, unknown>
}

function compile(name: string) {
  const ajv = new Ajv2020({ strict: true, allErrors: true })
  return ajv.compile(loadSchema(name))
}

/** Every field `validatePage` reads (`blocks`) plus the ones `Page`'s type requires for a well-formed fixture. */
function pageFor(blocks: ReturnType<typeof caseStudyToBlocks>): Page {
  return {
    id: 'PG-schema-test',
    kind: 'case-study',
    title: DONE_JOB_CASE_STUDY.title,
    icon: null,
    description: null,
    ownerId: 'USR-7',
    visibility: 'private',
    tags: ['analyst'],
    official: false,
    scope: { range: null, filters: [] },
    blocks,
    version: 1,
    publishedAt: null,
    createdAt: '2026-06-25T00:00:00+03:00',
    updatedAt: '2026-06-25T00:00:00+03:00',
    updatedBy: 'USR-7',
  }
}

describe('case-study.schema.json', () => {
  const validate = compile('case-study.schema.json')

  it('accepts the seeded `done` job\'s real result (AC-1251)', () => {
    const ok = validate(DONE_JOB_CASE_STUDY)
    expect(validate.errors ?? []).toEqual([])
    expect(ok).toBe(true)
  })

  it('rejects a study with only one alternative (AC-1251, §7 step 6)', () => {
    const oneAlternative: CaseStudy = {
      ...DONE_JOB_CASE_STUDY,
      alternatives: [DONE_JOB_CASE_STUDY.alternatives[0]!],
    }
    expect(validate(oneAlternative)).toBe(false)
    const paths = (validate.errors ?? []).map((e) => e.instancePath + ' ' + e.keyword)
    expect(paths.some((p) => p.includes('alternatives'))).toBe(true)
  })

  it('rejects a study missing dataQuality (AC-1251)', () => {
    const { dataQuality: _dataQuality, ...withoutDataQuality } = DONE_JOB_CASE_STUDY
    expect(validate(withoutDataQuality)).toBe(false)
    const missing = (validate.errors ?? []).some((e) => e.keyword === 'required' && String(e.message).includes('dataQuality'))
    expect(missing).toBe(true)
  })

  it('rejects a finding whose value carries no runId ("no number without a run", §7)', () => {
    const noRunId: CaseStudy = {
      ...DONE_JOB_CASE_STUDY,
      findings: [
        {
          ...DONE_JOB_CASE_STUDY.findings[0]!,
          values: [
            // @ts-expect-error — deliberately malformed for the schema test: runId omitted.
            { seriesId: 's', bucket: 'total', value: 1, unit: 'count', currency: null },
          ],
        },
        ...DONE_JOB_CASE_STUDY.findings.slice(1),
      ],
    }
    expect(validate(noRunId)).toBe(false)
    const missing = (validate.errors ?? []).some((e) => e.keyword === 'required' && String(e.message).includes('runId'))
    expect(missing).toBe(true)
  })

  it('rejects a finding value whose runId is an empty string (a number with no real run)', () => {
    const emptyRunId: CaseStudy = {
      ...DONE_JOB_CASE_STUDY,
      findings: [
        { ...DONE_JOB_CASE_STUDY.findings[0]!, values: [{ ...DONE_JOB_CASE_STUDY.findings[0]!.values[0]!, runId: '' }] },
        ...DONE_JOB_CASE_STUDY.findings.slice(1),
      ],
    }
    expect(validate(emptyRunId)).toBe(false)
  })

  it('rejects a study where an alternative is not actually tested', () => {
    const untested = {
      ...DONE_JOB_CASE_STUDY,
      alternatives: [{ ...DONE_JOB_CASE_STUDY.alternatives[0]!, tested: false }, DONE_JOB_CASE_STUDY.alternatives[1]!],
    }
    expect(validate(untested)).toBe(false)
  })

  it('rejects an unknown top-level property (no silent drift from the CaseStudy type)', () => {
    const withExtra = { ...DONE_JOB_CASE_STUDY, notARealField: true }
    expect(validate(withExtra)).toBe(false)
  })

  it('`caseStudyToBlocks` on the seeded study passes `validatePage` with no violations (AC-1129 pattern, applied to the schema-validated fixture)', () => {
    const blocks = caseStudyToBlocks(DONE_JOB_CASE_STUDY, DONE_JOB_ID)
    expect(validatePage(pageFor(blocks))).toEqual([])
  })
})

describe('the other job-kind schemas parse and the case-study content is reused where §7/§8 say it is', () => {
  it('ask.schema.json is a valid JSON Schema and accepts a minimal, evidenced answer', () => {
    const validate = compile('ask.schema.json')
    const answer = {
      title: 'Why did new subscriptions dip this week?',
      language: 'ar' as const,
      question: 'لماذا انخفض عدد الاشتراكات الجديدة هذا الأسبوع؟',
      answer: { text: 'New subscriptions fell 8% week over week.', confidence: 'medium' as const, confidenceReason: 'One week of data.' },
      findings: [DONE_JOB_CASE_STUDY.findings[0]!],
      alternatives: [],
      dataQuality: DONE_JOB_CASE_STUDY.dataQuality,
      followUps: [],
    }
    expect(validate(answer)).toBe(true)
  })

  it('triage.schema.json and review.schema.json accept the same seeded CaseStudy (§7/§8: triage-alert and weekly-review output a case study)', () => {
    for (const name of ['triage.schema.json', 'review.schema.json']) {
      const validate = compile(name)
      expect(validate(DONE_JOB_CASE_STUDY)).toBe(true)
    }
  })

  it('page.schema.json accepts the blocks `caseStudyToBlocks` produces for the build-page kind', () => {
    const validate = compile('page.schema.json')
    const blocks = caseStudyToBlocks(DONE_JOB_CASE_STUDY, DONE_JOB_ID)
    expect(validate(blocks)).toBe(true)
  })
})
