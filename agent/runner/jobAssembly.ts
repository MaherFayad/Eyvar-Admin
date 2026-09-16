/**
 * Turns a claimed job into what the spawn needs: the prompt-version string
 * (AC-1252), the schema file for `--json-schema`, and the filled-in job
 * prompt (§6) — `agent/prompts/kinds/<kind>.md` is already the whole template, so this only substitutes `{{placeholders}}`.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export type AgentJobKind = 'ask' | 'case-study' | 'build-page' | 'triage-alert' | 'weekly-review'

/** Kind → template filename. 1:1 with `AgentJobKind`. */
const KIND_FILES: readonly AgentJobKind[] = ['ask', 'case-study', 'build-page', 'triage-alert', 'weekly-review']

export function kindTemplatePath(kind: AgentJobKind, promptsDir: string): string {
  return resolve(promptsDir, 'kinds', `${kind}.md`)
}

/** §7: "the answer, page, triage and review schemas are subsets or arrangements of the same parts" — triage and review are literally the case-study shape. */
const SCHEMA_FILE_BY_KIND: Record<AgentJobKind, string> = {
  ask: 'ask.schema.json',
  'case-study': 'case-study.schema.json',
  'build-page': 'page.schema.json',
  'triage-alert': 'triage.schema.json',
  'weekly-review': 'review.schema.json',
}

export function schemaPathForKind(kind: AgentJobKind, schemasDir: string): string {
  return resolve(schemasDir, SCHEMA_FILE_BY_KIND[kind])
}

/** Reads the schema file's raw content — `--json-schema` takes the JSON Schema itself, not a path (`code.claude.com/docs/en/headless`). */
export function readJsonSchema(kind: AgentJobKind, schemasDir: string): string {
  return readFileSync(schemaPathForKind(kind, schemasDir), 'utf8')
}

const VERSION_LINE = /<!--\s*analyst-prompt-version:\s*([^\s—-]+)/

/** AC-1252: "the version string is written into every job's events." Missing or malformed is recorded as a fact, never silently dropped. */
export function extractPromptVersion(firstLine: string | null | undefined): string {
  if (!firstLine) return 'unknown (no first line)'
  const match = VERSION_LINE.exec(firstLine)
  if (!match) return `unknown (malformed version comment: ${JSON.stringify(firstLine.slice(0, 120))})`
  return match[1]!
}

/** Reads just the first line of `agent/prompts/analyst.md` — the version comment §3.1 documents as living there. */
export function readPromptVersion(analystPromptPath: string): string {
  let firstLine: string | null = null
  try {
    const content = readFileSync(analystPromptPath, 'utf8')
    firstLine = content.split('\n', 1)[0] ?? null
  } catch {
    firstLine = null
  }
  return extractPromptVersion(firstLine)
}

export interface JobPromptData {
  kind: AgentJobKind
  question: string
  language: 'ar' | 'en'
  today: string // "2026-06-25", Asia/Riyadh — the template appends "(Asia/Riyadh)" itself
  dataCoverageFrom: string
  dataCoverageTo: string
  /** The job's context objects, already fetched, serialised by the caller (job_context's own shape). */
  contextObjectsJson: string
}

/** The prompt's own stated ceiling (`agent/prompts/kinds/*.md`: "at most 40 tool calls") — a runner-side ceiling, if one exists, must agree with this rather than cut the model off at a number it was never told. */
export const JOB_TOOL_CALL_BUDGET = 40

const PLACEHOLDERS: Record<string, keyof JobPromptData> = {
  question: 'question',
  language: 'language',
  today: 'today',
  dataCoverageFrom: 'dataCoverageFrom',
  dataCoverageTo: 'dataCoverageTo',
  contextObjectsJson: 'contextObjectsJson',
}

/** Fills `{{name}}` placeholders in a kind template from the job's own data. Substitution, never composition — the template already carries the full `# Job` / `# Output` structure. */
export function fillJobPrompt(kindTemplate: string, job: JobPromptData): string {
  return kindTemplate.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => {
    const key = PLACEHOLDERS[name]
    if (!key) return whole // an unknown placeholder is left as-is rather than silently blanked
    return String(job[key])
  })
}

/** Reads the kind template from disk and fills it — the one call site normally used. */
export function buildJobPrompt(kind: AgentJobKind, promptsDir: string, job: JobPromptData): string {
  const template = readFileSync(kindTemplatePath(kind, promptsDir), 'utf8')
  return fillJobPrompt(template, job)
}

export { KIND_FILES }
