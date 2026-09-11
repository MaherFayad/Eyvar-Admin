#!/usr/bin/env node
/**
 * Reads a frontend fixture module and emits SQL `INSERT` statements from it —
 * the seed `05-backend.md` §9 tests the compiler against ("a small seed
 * loaded from the frontend's fixtures").
 *
 * `src/data/fixtures/measures.ts` → `measures.seed.sql` and
 * `dimensions.seed.sql`, full column set, one `SEEDERS` entry each. Extend by
 * adding another entry; nothing else here changes.
 *
 * Fixtures are TypeScript with no runtime imports beyond their own literals
 * (`import type` only), so this transpiles the one file with esbuild rather
 * than pulling in a bundler for a stub.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'docs', '09-analytics-v2', 'examples')

async function importFixture(relativePath) {
  const source = await readFile(path.join(ROOT, relativePath), 'utf8')
  const { code } = await esbuild.transform(source, { loader: 'ts', format: 'esm', target: 'es2022' })
  return import(`data:text/javascript,${encodeURIComponent(code)}`)
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlNullable(value) {
  return value === null || value === undefined ? 'null' : sqlString(value)
}

function sqlBool(value) {
  return value ? 'true' : 'false'
}

/** JSONB literal. `undefined` (an absent optional field) seeds `null`, never `'null'::jsonb` — the handler tells the two apart. */
function sqlJson(value) {
  return value === undefined ? 'null' : `${sqlString(JSON.stringify(value))}::jsonb`
}

/**
 * `measures` seed — the full column set `0003_catalogue.sql` (WP-6.3) owns,
 * one row per `Measure`, in fixture order (`sort_order`) so
 * `catalogue.measures` can equal `measureFixtures` field for field
 * (AC-1275). WP-6.1's original six-column stub is gone: every field of
 * `Measure` (`src/data/types/measure.ts`) has a column now.
 */
function measuresSeed(measureFixtures) {
  const columns = [
    'key', 'sort_order', 'label_key', 'category',
    'population_resource', 'population_predicate_json', 'population_predicate_key',
    'population_time_field', 'population_value_field', 'coverage_from', 'coverage_to',
    'temporality', 'bucket_aggregate', 'bucket_aggregate_options_json', 'additive',
    'unit', 'currency', 'higher_is_better', 'min_grain',
    'dimensions_json', 'filterable_fields_json',
    'permission_key', 'permission_level', 'caption_key',
    'displayed_as_metric_keys_json', 'supports_performed', 'funnel_capabilities_json',
  ]
  const statements = measureFixtures.map((measure, index) => {
    const values = [
      sqlString(measure.key),
      String(index),
      sqlString(measure.labelKey),
      sqlString(measure.category),
      sqlString(measure.population.resource),
      sqlJson(measure.population.predicate),
      sqlString(measure.population.predicateKey),
      sqlString(measure.population.timeField),
      sqlNullable(measure.population.valueField),
      sqlString(measure.population.coverage.from),
      sqlString(measure.population.coverage.to),
      sqlString(measure.temporality),
      sqlString(measure.bucketAggregate),
      sqlJson(measure.bucketAggregateOptions),
      sqlBool(measure.additive),
      sqlString(measure.unit),
      sqlNullable(measure.currency),
      sqlBool(measure.higherIsBetter),
      sqlString(measure.minGrain),
      sqlJson(measure.dimensions),
      sqlJson(measure.filterableFields),
      measure.permission ? sqlString(measure.permission.key) : 'null',
      measure.permission ? sqlString(measure.permission.level) : 'null',
      sqlNullable(measure.captionKey),
      sqlJson(measure.displayedAsMetricKeys),
      measure.supportsPerformed === undefined ? 'null' : sqlBool(measure.supportsPerformed),
      sqlJson(measure.funnelCapabilities),
    ]
    return `INSERT INTO measures (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (key) DO NOTHING;`
  })
  return statements.join('\n')
}

/** `dimensions` seed — `Dimension` maps onto `0003_catalogue.sql`'s columns with no gap. */
function dimensionsSeed(dimensionFixtures) {
  const columns = ['key', 'sort_order', 'label_key', 'resource', 'field', 'cardinality_hint']
  const statements = dimensionFixtures.map((dimension, index) => {
    const values = [
      sqlString(dimension.key),
      String(index),
      sqlString(dimension.labelKey),
      sqlString(dimension.resource),
      sqlString(dimension.field),
      String(dimension.cardinalityHint),
    ]
    return `INSERT INTO dimensions (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (key) DO NOTHING;`
  })
  return statements.join('\n')
}

const SEEDERS = {
  measures: {
    fixture: 'src/data/fixtures/measures.ts',
    build: (mod) => measuresSeed(mod.measureFixtures),
  },
  dimensions: {
    fixture: 'src/data/fixtures/measures.ts',
    build: (mod) => dimensionsSeed(mod.dimensionFixtures),
  },
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const only = process.argv[2]
  const names = only ? [only] : Object.keys(SEEDERS)

  for (const name of names) {
    const seeder = SEEDERS[name]
    if (!seeder) {
      console.error(`No seeder named "${name}". Known: ${Object.keys(SEEDERS).join(', ')}`)
      process.exitCode = 1
      continue
    }
    const mod = await importFixture(seeder.fixture)
    const sql = seeder.build(mod)
    const outFile = path.join(OUT_DIR, `${name}.seed.sql`)
    await writeFile(outFile, `-- generated by scripts/fixtures-to-seed.mjs from ${seeder.fixture}\n${sql}\n`)
    console.log(`Wrote ${path.relative(ROOT, outFile)}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
