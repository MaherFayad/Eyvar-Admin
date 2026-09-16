/**
 * §7's enforcement (AC-1246, AC-1247): "an agent that can assert an unbacked number is worse than no agent." Runs before `/result` is posted; the backend re-validates independently, but this file decides whether a retry happens.
 * `'schema'` failures (malformed shape) are not retryable; `'evidence'` failures (a bad runId or a number that doesn't match) get exactly one retry (AC-1247), then `failed:evidence`.
 */

export interface ToolLogResult {
  buckets: readonly string[]
  series: readonly { id: string; points: readonly (number | null)[]; partialBucketIndexes?: readonly number[] }[]
}

/**
 * A run this job actually produced. `'run'` carries the full result
 * (`run_report`, T5), recomputable; `'run-ref'` (T6/T9) returns only
 * deltas — citable but not recomputable, left to the backend's check.
 */
export type ToolLogEntry = { kind: 'run'; runId: string; result: ToolLogResult } | { kind: 'run-ref'; runId: string }

export interface CaseStudyLike {
  title: unknown
  language: unknown
  question: unknown
  decision: unknown
  headline: { text: unknown; confidence: unknown; confidenceReason: unknown } | undefined
  baseline: { measureKey: unknown; runId: unknown; level: unknown } | undefined
  findings: readonly {
    id: unknown
    text: unknown
    values: readonly { runId: unknown; seriesId: unknown; bucket: unknown; value: unknown }[] | undefined
    evidence: readonly unknown[] | undefined
  }[] | undefined
  contributors: readonly { runId: unknown }[] | undefined
  alternatives: readonly { hypothesis: unknown; tested: unknown; evidence: readonly unknown[] | undefined; verdict: unknown }[] | undefined
  dataQuality: { partialBucketsExcluded: unknown; gaps: unknown; blockedSeries: unknown } | undefined
  recommendations: readonly unknown[] | undefined
  followUps: readonly unknown[] | undefined
}

export type ValidateResult =
  | { ok: true; study: CaseStudyLike }
  | { ok: false; category: 'schema' | 'evidence'; violations: string[] }

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

/** Structural shape — mirrors the backend's own `validateCaseStudyShape` (never imported: this workspace has no dependency on `api/**`). */
function checkShape(raw: unknown): { study: CaseStudyLike | null; violations: string[] } {
  const violations: string[] = []
  if (!raw || typeof raw !== 'object') return { study: null, violations: ['result is not an object'] }
  const s = raw as Record<string, unknown> & Partial<CaseStudyLike>

  if (!isNonEmptyString(s.title)) violations.push('title is required')
  if (s.language !== 'ar' && s.language !== 'en') violations.push('language must be "ar" or "en"')
  if (!isNonEmptyString(s.question)) violations.push('question is required')
  if (!isNonEmptyString(s.decision)) violations.push('decision is required')

  const headline = s.headline as CaseStudyLike['headline']
  if (!headline || !isNonEmptyString(headline.text as string) || !['high', 'medium', 'low'].includes(headline.confidence as string)) {
    violations.push('headline is invalid')
  }

  const baseline = s.baseline as CaseStudyLike['baseline']
  if (!baseline || !isNonEmptyString(baseline.measureKey as string) || !isNonEmptyString(baseline.runId as string) || typeof baseline.level !== 'number') {
    violations.push('baseline is invalid')
  }

  const findings = Array.isArray(s.findings) ? s.findings : null
  if (!findings) {
    violations.push('findings must be an array')
  } else {
    findings.forEach((f, i) => {
      if (!isNonEmptyString(f?.id) || !isNonEmptyString(f?.text)) violations.push(`findings[${i}] is invalid`)
      if (!Array.isArray(f?.values)) violations.push(`findings[${i}].values must be an array`)
      if (!Array.isArray(f?.evidence)) violations.push(`findings[${i}].evidence must be an array`)
    })
  }

  const alternatives = Array.isArray(s.alternatives) ? s.alternatives : []
  // §7 method step 6 / "fails schema validation": fewer than two alternatives.
  if (alternatives.length < 2) violations.push('alternatives must have at least two entries')
  alternatives.forEach((a, i) => {
    if (!isNonEmptyString(a?.hypothesis) || a?.tested !== true || !['supported', 'not-supported', 'inconclusive'].includes(a?.verdict as string)) {
      violations.push(`alternatives[${i}] is invalid`)
    }
  })

  const dataQuality = s.dataQuality as CaseStudyLike['dataQuality']
  if (!dataQuality || dataQuality.partialBucketsExcluded !== true || !Array.isArray(dataQuality.gaps) || !Array.isArray(dataQuality.blockedSeries)) {
    violations.push('dataQuality is invalid or missing')
  }

  if (!Array.isArray(s.contributors)) violations.push('contributors must be an array')
  if (!Array.isArray(s.recommendations)) violations.push('recommendations must be an array')
  if (!Array.isArray(s.followUps)) violations.push('followUps must be an array')

  if (violations.length > 0) return { study: null, violations }
  return { study: s as CaseStudyLike, violations: [] }
}

/**
 * "Any string that looks like an unmasked phone or email fails the job"
 * (§7). A masked value (D44: `••<last 2>` for a phone, `x••••@domain` for
 * an email) never matches — the bullet is not a valid digit or local-part.
 */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
/** A digit run with plausible phone punctuation. Counted by digit, not span length, below — an ISO date (`2026-06-24`, 8 digits) must not trip this; a real phone number (Saudi mobile: 10 digits, +966: 12) must. */
const PHONE_CANDIDATE = /\+?\d[\d\s().-]{6,}\d/g
const MIN_PHONE_DIGITS = 9

function looksLikeUnmaskedPhone(value: string): boolean {
  for (const match of value.matchAll(PHONE_CANDIDATE)) {
    if (match[0].replace(/\D/g, '').length >= MIN_PHONE_DIGITS) return true
  }
  return false
}

function findPiiLeaks(value: unknown, path: string, found: string[]): void {
  if (typeof value === 'string') {
    if (EMAIL_PATTERN.test(value)) found.push(`${path}: looks like an unmasked email`)
    if (looksLikeUnmaskedPhone(value)) found.push(`${path}: looks like an unmasked phone number`)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => findPiiLeaks(v, `${path}[${i}]`, found))
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) findPiiLeaks(v, path ? `${path}.${key}` : key, found)
  }
}

/** Every runId a study cites, from every place §7's schema allows one. */
function citedRunIds(study: CaseStudyLike): string[] {
  const ids = new Set<string>()
  if (isNonEmptyString(study.baseline?.runId)) ids.add(study.baseline!.runId as string)
  for (const finding of study.findings ?? []) {
    for (const id of finding.evidence ?? []) if (isNonEmptyString(id)) ids.add(id as string)
    for (const value of finding.values ?? []) if (isNonEmptyString(value.runId)) ids.add(value.runId as string)
  }
  for (const contributor of study.contributors ?? []) if (isNonEmptyString(contributor.runId)) ids.add(contributor.runId as string)
  for (const alternative of study.alternatives ?? []) {
    for (const id of alternative.evidence ?? []) if (isNonEmptyString(id)) ids.add(id as string)
  }
  return Array.from(ids)
}

/** Mirrors `api/_lib/handlers/agent.ts#recomputeValue` exactly: `'total'` sums the series' complete buckets — a partial bucket is excluded from every total — else it looks up the bucket. `null` means "could not be recomputed", itself a mismatch. */
function recomputeValue(result: ToolLogResult, seriesId: unknown, bucket: unknown): number | null {
  const series = result.series.find((s) => s.id === seriesId)
  if (!series) return null
  if (bucket === 'total') {
    const partial = new Set(series.partialBucketIndexes ?? [])
    return series.points.reduce<number>((sum, p, i) => (partial.has(i) ? sum : sum + (p ?? 0)), 0)
  }
  const index = result.buckets.indexOf(String(bucket))
  if (index === -1) return null
  return series.points[index] ?? null
}

/** "Within rounding" (§7): at least 1 unit or 0.5% of the recomputed magnitude, whichever is larger — mirrors the backend's own tolerance. */
function withinRounding(recomputed: number, claimed: number): boolean {
  const tolerance = Math.max(1, Math.abs(recomputed) * 0.005)
  return Math.abs(recomputed - claimed) <= tolerance
}

function checkEvidence(study: CaseStudyLike, toolLog: readonly ToolLogEntry[]): string[] {
  const violations: string[] = []
  const byId = new Map<string, ToolLogEntry>(toolLog.map((e) => [e.runId, e]))

  for (const id of citedRunIds(study)) {
    if (!byId.has(id)) violations.push(`runId "${id}" does not appear in this job's tool log`)
  }

  for (const finding of study.findings ?? []) {
    for (const value of finding.values ?? []) {
      const entry = value.runId && isNonEmptyString(value.runId) ? byId.get(value.runId as string) : undefined
      if (!entry) continue // already reported above as a missing runId
      if (entry.kind === 'run-ref') continue // no raw result to recompute against (T6/T9) — left to the backend's own check
      const recomputed = recomputeValue(entry.result, value.seriesId, value.bucket)
      const claimed = typeof value.value === 'number' ? value.value : NaN
      if (recomputed === null || Number.isNaN(claimed) || !withinRounding(recomputed, claimed)) {
        violations.push(
          `finding "${String(finding.id)}" value for run "${String(value.runId)}" (${String(value.seriesId)} · ${String(value.bucket)}) claims ${String(value.value)}, the run recorded ${recomputed ?? 'nothing'}`,
        )
      }
    }
  }

  return violations
}

export function validate(candidate: unknown, toolLog: readonly ToolLogEntry[]): ValidateResult {
  const { study, violations: shapeViolations } = checkShape(candidate)

  const piiViolations: string[] = []
  findPiiLeaks(candidate, '', piiViolations)

  const schemaViolations = [...shapeViolations, ...piiViolations]
  if (!study || schemaViolations.length > 0) {
    return { ok: false, category: 'schema', violations: schemaViolations.length > 0 ? schemaViolations : ['result does not match the case-study shape'] }
  }

  const evidenceViolations = checkEvidence(study, toolLog)
  if (evidenceViolations.length > 0) return { ok: false, category: 'evidence', violations: evidenceViolations }

  return { ok: true, study }
}
