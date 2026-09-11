/**
 * The glossary generator `06-execution-plan.md`'s WP-6.3 row names, backing
 * `GET /api/v1/catalogue/glossary` (`01-analyst-agent.md` T3): "definitions
 * of business terms, measures' captions, the Riyadh/Sunday rules, the money
 * rule, coverage caveats."
 *
 * **One rule this file exists to keep: no hand-written sentence per
 * measure.** A hand-written description drifts the moment someone edits
 * `src/data/fixtures/measures.ts` and forgets the prose that described it —
 * exactly the seed-shaped-predicate failure `measure.ts`'s file header
 * names for `population`. Every per-measure line below is a template filled
 * from `Measure`'s own fields (population, temporality, aggregate, unit,
 * coverage, grain, permission); only the *business rules* section is fixed
 * prose, because those rules do not vary per measure and are cited from
 * `05-backend.md` rather than invented here.
 */
import type { Measure } from '@/data/types/measure'

const BUSINESS_RULES = `## Business rules

- **The Riyadh/Sunday week.** Buckets are computed in \`Asia/Riyadh\`. A
  \`week\` bucket starts on Sunday, not Monday (D45) — a report that looks
  one day off against a UTC-Monday tool is not wrong, it is on a different
  calendar (\`05-backend.md\` §6, step 2).
- **The money rule.** Every money field is an integer count of halalas on
  the wire. A decimal SAR value appears only in a CSV export or a PNG
  caption, never in a JSON payload (\`AGENT-BRIEF.md\`, "the traps").
- **A gap is null, never zero.** A bucket outside a measure's declared
  coverage, or a bucket a query never reached, comes back \`null\`. A \`0\`
  means the store was asked and answered zero; \`null\` means it was not
  asked, or cannot answer honestly for that bucket.
- **A partial bucket is marked, not hidden.** The bucket in progress when a
  report runs is drawn and flagged, and excluded from every comparison and
  alert evaluation — its total is not yet the whole story.
- **Coverage is declared, not derived.** Each measure's \`coverage\` window
  is a fact about the store behind it, stated once rather than inferred
  from the earliest or latest row present — a store with a hole in the
  middle and a store that ends early are different facts that \`max(date)\`
  cannot tell apart.
`

function populationSentence(measure: Measure): string {
  const { resource, predicateKey, timeField } = measure.population
  const scope = measure.population.predicate.length === 0 ? 'every row' : `rows matching \`${predicateKey}\``
  return `Counts ${scope} of \`${resource}\`, bucketed by \`${timeField}\`.`
}

function temporalitySentence(measure: Measure): string {
  return measure.temporality === 'stock'
    ? 'A **stock**: how many exist as of an instant. Changing the grain changes the sampling density, never the values.'
    : 'A **flow**: how many happened within the bucket. Changing the grain changes every value.'
}

function aggregateSentence(measure: Measure): string {
  const options = measure.bucketAggregateOptions?.filter((a) => a !== measure.bucketAggregate) ?? []
  const also = options.length > 0 ? ` Also legal: ${options.map((a) => `\`${a}\``).join(', ')}.` : ''
  return `Aggregated per bucket as \`${measure.bucketAggregate}\`, ${measure.additive ? 'and may be summed across buckets and groups' : 'and may **not** be summed across buckets or groups'}.${also}`
}

function unitSentence(measure: Measure): string {
  const unit = measure.unit === 'money' && measure.currency ? `money (${measure.currency}, halalas on the wire)` : measure.unit
  return `Unit: ${unit}. ${measure.higherIsBetter ? 'A higher value is the better outcome.' : 'A lower value is the better outcome.'}`
}

function splitSentence(measure: Measure): string {
  if (measure.dimensions.length === 0) return 'Not splittable by any dimension.'
  return `Splittable by: ${measure.dimensions.map((d) => `\`${d.key}\``).join(', ')}.`
}

function coverageSentence(measure: Measure): string {
  return `Data available \`${measure.population.coverage.from}\` to \`${measure.population.coverage.to}\`; outside that window every point is \`null\`.`
}

function permissionSentence(measure: Measure): string {
  if (!measure.permission) return 'No permission gates this measure.'
  return `Requires \`${measure.permission.key}\` (${measure.permission.level}).`
}

/** One measure's entry, entirely template-filled from `measure`'s own fields. */
export function buildMeasureGlossaryEntry(measure: Measure): string {
  const lines = [
    `### ${measure.key}`,
    '',
    `- Label key: \`${measure.labelKey}\``,
    `- Category: ${measure.category}`,
    `- ${populationSentence(measure)}`,
    `- ${temporalitySentence(measure)}`,
    `- ${aggregateSentence(measure)}`,
    `- ${unitSentence(measure)}`,
    `- Minimum grain: \`${measure.minGrain}\``,
    `- ${splitSentence(measure)}`,
    `- ${coverageSentence(measure)}`,
    `- ${permissionSentence(measure)}`,
  ]
  if (measure.captionKey) lines.push(`- Caption key: \`${measure.captionKey}\``)
  if (measure.displayedAsMetricKeys.length > 0) {
    lines.push(`- Shown on: ${measure.displayedAsMetricKeys.map((k) => `\`${k}\``).join(', ')}`)
  }
  return lines.join('\n')
}

/**
 * The full glossary, or the subset matching `term` (case-insensitive
 * substring of key, label key or category) when given. Business rules
 * always come first — an agent reading only the head of the document still
 * gets the rules that govern every number.
 */
export function buildGlossaryMarkdown(measures: readonly Measure[], term?: string | null): string {
  const matches = term
    ? measures.filter((m) => {
        const needle = term.toLowerCase()
        return (
          m.key.toLowerCase().includes(needle) ||
          m.labelKey.toLowerCase().includes(needle) ||
          m.category.toLowerCase().includes(needle)
        )
      })
    : measures

  const entries = matches.map(buildMeasureGlossaryEntry).join('\n\n')
  const measuresSection = matches.length > 0 ? entries : '_No measure matches this term._'

  return `# Analytics glossary\n\n${BUSINESS_RULES}\n## Measures\n\n${measuresSection}\n`
}
