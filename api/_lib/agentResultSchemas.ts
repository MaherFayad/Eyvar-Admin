/**
 * Kind → schema file, mirroring `agent/runner/jobAssembly.ts`'s own
 * `SCHEMA_FILE_BY_KIND` map exactly (comment there: "triage and review are
 * literally the case-study shape") — WP-6.2c / F-V2-38. `agent/` is read
 * here, never edited: these are static imports of the same five files that
 * WP-7.3 landed and the runner already sends to the CLI as `--json-schema`,
 * so a schema change on that side needs no change here.
 *
 * Static `import … from '../../agent/schemas/*.json'` rather than
 * `readFileSync` at request time: `resolveJsonModule` (both tsconfigs) makes
 * this a normal module the bundler traces and embeds, so Vercel's function
 * tracer picks it up the same way it already does for every `@/data/*`
 * import that reaches outside `api/`.
 */
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
