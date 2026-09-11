#!/usr/bin/env node
/**
 * Reads a frontend fixture module and emits SQL `INSERT` statements from it —
 * the seed `05-backend.md` §9 tests the compiler against ("a small seed
 * loaded from the frontend's fixtures").
 *
 * `src/data/fixtures/measures.ts` → `measures.seed.sql` and
 * `dimensions.seed.sql`, full column set, one `SEEDERS` entry each. WP-6.4
 * added five more — `drivers`, `riders`, `subscriptions`, `trips`,
 * `dailySnapshots` — the operational population `api/_lib/compile.ts` reads
 * through `measure_sources` (`0005_runs.sql`), so the compiler's equality
 * test (AC-1276) runs against the same rows the mock resolver does. Extend by
 * adding another `SEEDERS` entry; nothing else here changes.
 *
 * `measures.ts` has no runtime imports beyond its own literals, but the
 * operational fixtures do (`fixtures/cycle.ts`, `mock/clock.ts`, and — for
 * `subscriptions`/`trips` — each other), so `importFixture` **bundles** the
 * entry file with esbuild rather than transpiling it alone; a single-file
 * transpile cannot resolve a relative import at all once it is loaded from a
 * `data:` URL with no filesystem context.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'docs', '09-analytics-v2', 'examples')

async function importFixture(relativePath) {
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, relativePath)],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2022',
    platform: 'neutral',
  })
  const code = result.outputFiles[0].text
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

/**
 * A generic row-INSERT builder for the `fixture_*` operational tables
 * `0005_runs.sql` creates — one row per fixture record, `sqlValue` picking
 * the literal for each declared column off the record. `ON CONFLICT
 * (id) DO NOTHING` matches `measuresSeed`/`dimensionsSeed`: re-running the
 * script is idempotent, never a second copy.
 */
function tableSeed(tableName, columns, rows, sqlValue) {
  const quotedColumns = columns.map((c) => `"${c}"`).join(', ')
  const statements = rows.map((row) => {
    const values = columns.map((c) => sqlValue(row, c)).join(', ')
    return `INSERT INTO ${tableName} (${quotedColumns}) VALUES (${values}) ON CONFLICT (id) DO NOTHING;`
  })
  return statements.join('\n')
}

/** `Driver` → `fixture_drivers` (`0005_runs.sql`). `driver.*` columns hold the namespaced dimension/filter fields verbatim. */
function driversSeed(drivers) {
  const columns = ['id', 'joinedAt', 'driver.city', 'driver.vehicleClass', 'driver.status']
  const get = { id: (d) => d.id, joinedAt: (d) => d.joinedAt, 'driver.city': (d) => d.city, 'driver.vehicleClass': (d) => d.vehicleClass, 'driver.status': (d) => d.status }
  return tableSeed('fixture_drivers', columns, drivers, (row, c) => sqlString(get[c](row)))
}

/** `Rider` → `fixture_riders`. */
function ridersSeed(riders) {
  const columns = ['id', 'joinedAt', 'rider.city', 'rider.status']
  const get = { id: (r) => r.id, joinedAt: (r) => r.joinedAt, 'rider.city': (r) => r.city, 'rider.status': (r) => r.status }
  return tableSeed('fixture_riders', columns, riders, (row, c) => sqlString(get[c](row)))
}

/** `Subscription` → `fixture_subscriptions`. `cancelledAt` is the one nullable column. */
function subscriptionsSeed(subscriptions) {
  const columns = [
    'id', 'riderId', 'startedOn', 'endsOn', 'cancelledAt',
    'subscription.plan', 'subscription.vehicleClass', 'subscription.status', 'paidHalalas',
  ]
  const get = {
    id: (s) => s.id, riderId: (s) => s.riderId, startedOn: (s) => s.startedOn, endsOn: (s) => s.endsOn,
    'subscription.plan': (s) => s.planKey, 'subscription.vehicleClass': (s) => s.vehicleClass,
    'subscription.status': (s) => s.status, paidHalalas: (s) => s.paidHalalas,
  }
  return tableSeed('fixture_subscriptions', columns, subscriptions, (row, c) => {
    if (c === 'cancelledAt') return sqlNullable(row.cancelledAt)
    if (c === 'paidHalalas') return String(get[c](row))
    return sqlString(get[c](row))
  })
}

/** `Trip` → `fixture_trips`. `endedAt` and `pickup` are nullable (in progress / cancelled before pickup). */
function tripsSeed(trips) {
  const columns = ['id', 'riderId', 'endedAt', 'trip.kind', 'trip.status', 'trip.pickup', 'fareHalalas']
  const get = {
    id: (t) => t.id, riderId: (t) => t.riderId, 'trip.kind': (t) => t.kind, 'trip.status': (t) => t.status,
    fareHalalas: (t) => t.fareHalalas,
  }
  return tableSeed('fixture_trips', columns, trips, (row, c) => {
    if (c === 'endedAt') return sqlNullable(row.endedAt)
    if (c === 'trip.pickup') return sqlNullable(row.pickup)
    if (c === 'fareHalalas') return String(get[c](row))
    return sqlString(get[c](row))
  })
}

/** `DailySnapshot` → `daily_snapshots` (`0005_runs.sql`), snake_case per the real operational table's own column names. */
function dailySnapshotsSeed(snapshots) {
  const columns = [
    'day', 'riders', 'drivers', 'active_subscriptions', 'quick_rides',
    'cancel_rate_pct', 'total_revenue_halalas', 'quick_ride_revenue_halalas', 'sub_revenue_halalas',
  ]
  const quotedColumns = columns.join(', ')
  const statements = snapshots.map((s) => {
    const values = [
      sqlString(s.date), String(s.riders), String(s.drivers), String(s.activeSubs), String(s.quickRides),
      String(s.cancelRatePct), String(s.totalRevenueHalalas), String(s.quickRideRevenueHalalas), String(s.subRevenueHalalas),
    ].join(', ')
    return `INSERT INTO daily_snapshots (${quotedColumns}) VALUES (${values}) ON CONFLICT (day) DO NOTHING;`
  })
  return statements.join('\n')
}

/**
 * `Segment` → `segments` (`0006_pages.sql`, WP-6.4b Gap 2) — so a saved
 * report naming `{ kind: 'saved' }` resolves against real rows the same way
 * the mock's `resolveSegment` does. `owner_id` is a real `FOREIGN KEY` to
 * `users(id)`; the fixtures' `USR-*` ids are not seeded users anywhere else
 * in this suite, so this seeder inserts one placeholder user per referenced
 * owner first (`ON CONFLICT (id) DO NOTHING`, safe to re-run or to collide
 * with a real team seed landing the same ids later).
 */
function segmentsSeed(segments) {
  const ownerIds = [...new Set(segments.map((s) => s.ownerId))]
  const userStatements = ownerIds.map((id) => {
    const values = [
      sqlString(id),
      sqlString(`${id.toLowerCase()}@fixture.eyvar.test`),
      sqlString(id),
      sqlString(id),
      sqlString('fixture-placeholder-not-a-real-hash'),
      sqlString('Owner'),
    ].join(', ')
    return `INSERT INTO users (id, email, name_en, name_ar, password_hash, role_id) VALUES (${values}) ON CONFLICT (id) DO NOTHING;`
  })

  const columns = ['id', 'name', 'description', 'filters_json', 'performed_json', 'owner_id', 'visibility']
  const segmentStatements = segments.map((s) => {
    const values = [
      sqlString(s.id),
      sqlString(s.name),
      sqlNullable(s.description),
      sqlJson(s.filters),
      s.performed === null ? 'null' : sqlJson(s.performed),
      sqlString(s.ownerId),
      sqlString(s.visibility),
    ]
    return `INSERT INTO segments (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;`
  })

  return [...userStatements, ...segmentStatements].join('\n')
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
  drivers: {
    fixture: 'src/data/fixtures/drivers.ts',
    build: (mod) => driversSeed(mod.allDriverFixtures),
  },
  riders: {
    fixture: 'src/data/fixtures/riders.ts',
    build: (mod) => ridersSeed(mod.riderFixtures),
  },
  subscriptions: {
    fixture: 'src/data/fixtures/subscriptions.ts',
    build: (mod) => subscriptionsSeed(mod.allSubscriptionFixtures),
  },
  trips: {
    fixture: 'src/data/fixtures/trips.ts',
    build: (mod) => tripsSeed(mod.allTripFixtures),
  },
  dailySnapshots: {
    fixture: 'src/data/fixtures/dailySnapshots.ts',
    build: (mod) => dailySnapshotsSeed(mod.dailySnapshotFixtures),
  },
  segments: {
    fixture: 'src/data/fixtures/segments.ts',
    build: (mod) => segmentsSeed(mod.segmentFixtures),
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
