/**
 * A minimal JSON Schema (draft 2020-12) interpreter — WP-6.2c / F-V2-38: the
 * server validates an agent job's result against the same files WP-7.3
 * wrote (`agent/schemas/*.json`), not a second, hand-rolled shape checker
 * that can drift from them. Covers exactly the keyword set those five files
 * use — `type`, `properties`/`required`/`additionalProperties`, `items`,
 * `minItems`/`maxItems`, `minLength`/`maxLength`, `minimum`/`maximum`,
 * `enum`, `const`, `oneOf`, `pattern` — and nothing else (no `$ref`,
 * `anyOf`/`allOf`, `patternProperties`): a general-purpose validator is not
 * this WP's brief, and adding `ajv` would be a root `package.json` change
 * outside `api/**`'s file set. If a future schema needs a keyword this file
 * does not implement, `validateSchema` throws rather than silently passing.
 */

export type JsonSchema = Record<string, unknown>

export interface SchemaViolation {
  path: string
  message: string
}

const SUPPORTED_KEYWORDS = new Set([
  '$id',
  '$schema',
  'title',
  'description',
  'type',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'minItems',
  'maxItems',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'enum',
  'const',
  'oneOf',
  'pattern',
])

function assertSupported(schema: JsonSchema): void {
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED_KEYWORDS.has(key)) {
      throw new Error(`jsonSchema.ts: unsupported keyword "${key}" — extend the interpreter before using it in a result schema`)
    }
  }
}

function typeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function matchesType(value: unknown, type: string): boolean {
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value)
  return typeOf(value) === type
}

/** Pure — never throws on a bad `value` (only on a schema this file cannot interpret). Returns every violation, not just the first. */
export function validateSchema(schema: JsonSchema, value: unknown, path = '$'): SchemaViolation[] {
  assertSupported(schema)
  const violations: SchemaViolation[] = []

  if ('const' in schema) {
    if (value !== schema.const) violations.push({ path, message: `must equal ${JSON.stringify(schema.const)}` })
    return violations
  }

  if ('enum' in schema) {
    const allowed = schema.enum as unknown[]
    if (!allowed.some((a) => a === value)) violations.push({ path, message: `must be one of ${JSON.stringify(allowed)}` })
    return violations
  }

  if ('oneOf' in schema) {
    const branches = schema.oneOf as JsonSchema[]
    const perBranch = branches.map((b) => validateSchema(b, value, path))
    const matching = perBranch.filter((v) => v.length === 0)
    if (matching.length === 1) return []
    if (matching.length === 0) {
      const closest = perBranch.reduce((best, v) => (v.length < best.length ? v : best), perBranch[0] ?? [])
      violations.push({ path, message: `matches none of ${branches.length} alternatives` })
      violations.push(...closest.map((v) => ({ path: v.path, message: `(oneOf) ${v.message}` })))
    } else {
      violations.push({ path, message: `matches ${matching.length} alternatives, expected exactly one` })
    }
    return violations
  }

  const type = schema.type as string | undefined
  if (type !== undefined && !matchesType(value, type)) {
    violations.push({ path, message: `must be of type ${type}, got ${typeOf(value)}` })
    return violations
  }

  if (type === 'string' && typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      violations.push({ path, message: `must have length >= ${schema.minLength}` })
    }
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
      violations.push({ path, message: `must have length <= ${schema.maxLength}` })
    }
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern).test(value)) {
      violations.push({ path, message: `must match pattern ${schema.pattern}` })
    }
  }

  if ((type === 'number' || type === 'integer') && typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) violations.push({ path, message: `must be >= ${schema.minimum}` })
    if (typeof schema.maximum === 'number' && value > schema.maximum) violations.push({ path, message: `must be <= ${schema.maximum}` })
  }

  if (type === 'array' && Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      violations.push({ path, message: `must have at least ${schema.minItems} item(s)` })
    }
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) {
      violations.push({ path, message: `must have at most ${schema.maxItems} item(s)` })
    }
    if (schema.items) {
      value.forEach((item, i) => violations.push(...validateSchema(schema.items as JsonSchema, item, `${path}[${i}]`)))
    }
  }

  if (type === 'object' && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    const properties = (schema.properties as Record<string, JsonSchema> | undefined) ?? {}
    const required = (schema.required as string[] | undefined) ?? []
    for (const key of required) {
      if (!(key in obj)) violations.push({ path: `${path}.${key}`, message: 'is required' })
    }
    for (const [key, propSchema] of Object.entries(properties)) {
      if (key in obj) violations.push(...validateSchema(propSchema, obj[key], `${path}.${key}`))
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(obj)) {
        if (!(key in properties)) violations.push({ path: `${path}.${key}`, message: 'is not an allowed property' })
      }
    }
  }

  return violations
}
