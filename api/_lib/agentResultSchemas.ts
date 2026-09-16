/**
 * Kind → schema file, mirroring `agent/runner/jobAssembly.ts`'s own map
 * (F-V2-38). Static imports of the five schema files WP-7.3 wrote, not
 * `readFileSync`: `resolveJsonModule` makes Vercel's function tracer embed
 * them, the same way it already does for `@/data/*` imports. */
import type { AgentJobKind } from '@/data/types/agent'
import { validateSchema, type JsonSchema, type SchemaViolation } from './jsonSchema'
import askSchema from '../../agent/schemas/ask.schema.json'
import caseStudySchema from '../../agent/schemas/case-study.schema.json'
import pageSchema from '../../agent/schemas/page.schema.json'
import triageSchema from '../../agent/schemas/triage.schema.json'
import reviewSchema from '../../agent/schemas/review.schema.json'

const SCHEMA_BY_KIND: Record<AgentJobKind, JsonSchema> = {
  ask: askSchema as JsonSchema,
  'case-study': caseStudySchema as JsonSchema,
  'build-page': pageSchema as JsonSchema,
  'triage-alert': triageSchema as JsonSchema,
  'weekly-review': reviewSchema as JsonSchema,
}

/** Every violation, plain-English, prefixed with the JSON pointer that failed — the same shape `validateCaseStudyShape` already produced. */
export function validateAgentResult(kind: AgentJobKind, candidate: unknown): SchemaViolation[] {
  return validateSchema(SCHEMA_BY_KIND[kind], candidate)
}
