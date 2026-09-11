// Unit tests for scripts/wp-gate.mjs's `checkFiles`, which is the pure part of the gate
// (06-execution-plan.md §4.1). Git and the manifest file are never touched here: a fake
// file list is passed straight in, so the suite does not depend on the real working tree.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkFiles } from './wp-gate.mjs'

const manifest = {
  id: 'WP-2.2',
  branch: 'analytics-v2',
  allow: [
    'src/components/reports/ResultCanvas.tsx',
    'src/components/reports/SeriesChart.tsx',
    'src/components/reports/useChartView.ts',
    'src/components/reports/*.test.tsx',
    'src/screens/reports/copy.ts',
  ],
  deny: ['src/components/reports/PanelChart.tsx', 'src/styles/globals.css', 'src/components/ui/**'],
}

test('a clean diff passes', () => {
  const offenders = checkFiles(
    ['src/components/reports/ResultCanvas.tsx', 'src/components/reports/SeriesChart.tsx', 'src/screens/reports/copy.ts'],
    manifest,
  )
  assert.deepEqual(offenders, [])
})

test('a file outside allow fails and is named', () => {
  const offenders = checkFiles(['src/screens/reports/ReportBuilder.tsx'], manifest)
  assert.equal(offenders.length, 1)
  assert.match(offenders[0], /src\/screens\/reports\/ReportBuilder\.tsx/)
  assert.match(offenders[0], /outside allow/)
})

test('a file inside deny fails even when an allow glob would match it', () => {
  // src/components/ui/** is denied; nothing in `allow` names it, so this also
  // proves deny is checked even without a competing allow entry.
  const offenders = checkFiles(['src/components/ui/chart.tsx'], manifest)
  assert.equal(offenders.length, 1)
  assert.match(offenders[0], /in deny/)
})

test('deny wins over an allow glob that would otherwise match', () => {
  const denyWins = {
    id: 'WP-x',
    branch: 'analytics-v2',
    allow: ['src/components/reports/**'],
    deny: ['src/components/reports/PanelChart.tsx'],
  }
  const offenders = checkFiles(['src/components/reports/PanelChart.tsx'], denyWins)
  assert.equal(offenders.length, 1)
  assert.match(offenders[0], /in deny/)
})

test('a missing manifest fails', async () => {
  const { execFileSync } = await import('node:child_process')
  assert.throws(() => {
    execFileSync('node', ['scripts/wp-gate.mjs', 'WP-99.99'], { stdio: 'pipe' })
  })
})

test('the handoffs directory is always allowed', () => {
  const offenders = checkFiles(['docs/09-analytics-v2/handoffs/WP-2.2.md'], manifest)
  assert.deepEqual(offenders, [])
})

test('the handoffs directory is allowed even against an empty manifest', () => {
  const offenders = checkFiles(['docs/09-analytics-v2/handoffs/WP-2.2.md'], { id: 'WP-x', branch: 'x', allow: [], deny: [] })
  assert.deepEqual(offenders, [])
})

// A manifest with no blanket `*.test.tsx` entry, so these two cases exercise the
// sibling-file fallback itself rather than a wildcard that happens to also match it.
const noTestGlob = {
  id: 'WP-x',
  branch: 'analytics-v2',
  allow: ['src/data/reporting/formula.ts'],
  deny: ['src/data/reporting/plan.ts'],
}

test("the WP's own test file is allowed when it sits beside an allowed source file", () => {
  const offenders = checkFiles(['src/data/reporting/formula.test.ts'], noTestGlob)
  assert.deepEqual(offenders, [])
})

test('a test file is not allowed when its source is not', () => {
  const offenders = checkFiles(['src/data/reporting/unrelated.test.ts'], noTestGlob)
  assert.equal(offenders.length, 1)
})

test("a test file is not allowed when its source is denied", () => {
  const offenders = checkFiles(['src/data/reporting/plan.test.ts'], noTestGlob)
  assert.equal(offenders.length, 1)
})
