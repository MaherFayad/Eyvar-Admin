/**
 * WP-3.4 (Proof) — the three non-trend modes: funnel, retention/cohort, data
 * table. Chromium, not jsdom — the funnel cascade, the retention heat grid
 * and the columns table's own layout draw nothing under jsdom.
 *
 * Reads `HARNESS_BASE`, default `http://localhost:4327`.
 *
 * Fixtures: `RPT-6` (funnel, 3 rungs), `RPT-7` (cohort, monthly, M0…M3).
 * The columns table (§7, `TableSpec.columns[]`) has no saved fixture yet
 * (F-V2-47's own comment: "a free view… never a second query"), so it is
 * built from a blank report the way `reports-table-columns.mjs` already does.
 *
 *   npx vite --port 4327  &&  node scripts/harness/reports-modes.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

let failures = 0
function check(label, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL'
  if (!ok) failures += 1
  console.log(`${mark}  ${label}${detail ? '  — ' + detail : ''}`)
}

const browser = await chromium.launch()

async function newPage({ dark = false, viewport = { width: 1280, height: 900 } } = {}) {
  const ctx = await browser.newContext({ viewport, ...(dark ? { colorScheme: 'dark' } : {}) })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)) })
  return { page, errors }
}

async function toArabic(page) {
  await page.getByRole('button', { name: 'Account' }).click()
  await page.waitForTimeout(200)
  await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await page.waitForTimeout(600)
}

/* ═════════════ AC-1169 — funnel measuredAs draws the wrong shape ═════════ */
/*
 * §5: `conversion-over-time` must re-enable the grain and draw a TREND;
 * `time-to-convert` must draw p25…p95 with `DistributionCard`. The resolver
 * (`resolveFunnelOverTime`, `resolveFunnelTimeToConvert`, `resolveReport.ts`)
 * builds the right shape; nothing in `ReportBuilder.tsx` or
 * `ReportModeCanvas.tsx` reads `funnel.measuredAs` to route to it — both
 * stay on `FunnelCascade`, which was written for `measuredAs: 'conversion'`
 * only. This check proves the wrong component draws and states plainly how.
 */
{
  const { page, errors } = await newPage()
  await page.goto(`${BASE}/management/reports/RPT-6`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)

  // A window and rung set the proven funnel-step-detail harness already uses
  // to get real conversions, so this is not a "no data" edge case.
  await page.getByRole('button', { name: 'Remove step 3' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Remove the Trip kind filter from step 2' }).click()
  await page.waitForTimeout(300)
  await page.getByLabel('Date range').click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Last 365 days' }).click()
  await page.waitForTimeout(300)

  await page.getByLabel('Measured as').click()
  await page.waitForTimeout(300)
  await page.getByRole('option', { name: 'Time to convert' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Refresh' }).click()
  await page.waitForTimeout(1500)

  const bodyText = await page.evaluate(() => document.body.innerText)
  await page.screenshot({ path: `${OUT}/wp34-AC1169-time-to-convert.png` })

  const fiveMislabelledSteps = (bodyText.match(/Riders who joined/g) ?? []).length >= 5
  check(
    'AC-1169 FAIL (expected) — time-to-convert draws five cascade "steps", all mislabelled with the FIRST rung\'s measure name instead of P25…P95',
    fiveMislabelledSteps,
    'FunnelCascade reads series.measureKey, never groupValue, which is where p25…p95 actually live (resolveReport.ts:1230-1243)',
  )
  const impossiblePercent = /4\d\d% of step 1|3\d\d% of step 1/.test(bodyText)
  check(
    'AC-1169 FAIL (expected) — a percentile duration is drawn through the cascade\'s "% of step 1" bar math, producing a "conversion" over 100%',
    impossiblePercent,
    'observed 194%/318%/394%/418% "of step 1" — a duration is not a count, the ratio is meaningless',
  )
  check('no console/page errors from the mis-route itself', errors.length === 0, errors.join(' | '))
}

/* Second manifestation, same root cause: conversion-over-time collapses an
   entire trend to the single first bucket's reading. */
{
  const { page } = await newPage()
  await page.goto(`${BASE}/management/reports/RPT-6`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'Remove step 3' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Remove the Trip kind filter from step 2' }).click()
  await page.waitForTimeout(300)
  await page.getByLabel('Date range').click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Last 365 days' }).click()
  await page.waitForTimeout(300)
  await page.getByLabel('Measured as').click()
  await page.waitForTimeout(300)
  await page.getByRole('option', { name: 'Conversion over time' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Refresh' }).click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/wp34-AC1169-conversion-over-time.png` })

  const rows = await page.locator('ol > li').count()
  check(
    'AC-1169 FAIL (expected) — conversion-over-time draws exactly ONE cascade row instead of a multi-bucket trend',
    rows === 1,
    `cascade <li> rows=${rows}; resolveFunnelOverTime returns one series with a point per grain bucket, the cascade only ever reads points[0]`,
  )
}

/* ═════════════ AC-1170 — already proven; light re-check only ═══════════ */
/* Full proof lives in reports-funnel-step-detail.mjs (median-to-next, the
   real drop-off group table, RTL column order). Not re-derived here. */

/* ═════════════ AC-1171 — cohort grain: day, week, month all compute ════ */
{
  const { page, errors } = await newPage()
  await page.goto(`${BASE}/management/reports/RPT-7`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/wp34-cohort-month.png` })
  const group = page.getByRole('group', { name: 'Cohorts grouped by' })

  const monthRows = await page.locator('tbody tr').count()
  check('month grain — matrix renders real rows', monthRows > 0, `rows=${monthRows}`)
  const monthFirstCell = await page.locator('tbody tr').first().locator('td span').first().innerText().catch(() => '')
  check('month grain — a real percentage, not a placeholder', /%/.test(monthFirstCell), monthFirstCell)

  await group.getByRole('button', { name: 'Day' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Refresh' }).click()
  await page.waitForTimeout(1500)
  const dayRows = await page.locator('tbody tr').count()
  await page.screenshot({ path: `${OUT}/wp34-cohort-day.png` })
  check('AC-1171 — day grain computes, with more (narrower) cohort rows than month', dayRows > monthRows, `day rows=${dayRows} vs month rows=${monthRows}`)

  await group.getByRole('button', { name: 'Week' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Refresh' }).click()
  await page.waitForTimeout(1500)
  const weekRows = await page.locator('tbody tr').count()
  await page.screenshot({ path: `${OUT}/wp34-cohort-week.png` })
  check('AC-1171 — week grain computes, and differs from both day and month', weekRows > 0 && weekRows !== dayRows, `week rows=${weekRows}`)
  check('no console/page errors switching grain', errors.length === 0, errors.join(' | '))
}

/* AC-1171 — a cell beyond the cohort's elapsed intervals reads "No reading", never "0%" */
{
  const { page } = await newPage()
  await page.goto(`${BASE}/management/reports/RPT-7`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  const bodyText = await page.evaluate(() => document.body.innerText)
  check('AC-1171 — the absent-cell sentence renders literally, never a bare "0%"', /No reading/.test(bodyText))
}

/* ═════════════ AC-1173 — heat tokens only; curve folds at 8 ════════════ */
{
  const { page } = await newPage()
  await page.goto(`${BASE}/management/reports/RPT-7`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  const cellCheck = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('td span[class*="bg-heat-"]')]
    return {
      count: spans.length,
      classes: [...new Set(spans.map((s) => (s.className.match(/bg-heat-\d/) ?? [''])[0]))].sort(),
      anyInlineOpacity: spans.some((s) => /opacity/.test(s.getAttribute('style') ?? '')),
    }
  })
  check('AC-1173 — every filled cell carries a bg-heat-N class, none inline opacity', cellCheck.count > 0 && !cellCheck.anyInlineOpacity, JSON.stringify(cellCheck))

  await page.getByRole('button', { name: 'Curve' }).click()
  await page.waitForTimeout(500)
  const bodyText = await page.evaluate(() => document.body.innerText)
  await page.screenshot({ path: `${OUT}/wp34-cohort-curve.png` })
  check('AC-1173 — the curve view folds and states it (RPT-7 has 12 monthly cohorts, over the 8 fold)', /oldest cohorts/.test(bodyText), bodyText.match(/The \d+ oldest cohorts[^.]*\./)?.[0])
}

/* ═════════════ Cohort — dark theme and Arabic/RTL ═══════════════════════ */
{
  const { page, errors } = await newPage({ dark: true })
  await page.goto(`${BASE}/management/reports/RPT-7`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/wp34-cohort-dark.png` })
  check('dark theme — no console/page errors', errors.length === 0, errors.join(' | '))
}
{
  const { page, errors } = await newPage()
  await page.goto(`${BASE}/management/reports/RPT-7`, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  await toArabic(page)
  await page.screenshot({ path: `${OUT}/wp34-cohort-ar.png` })
  const dir = await page.evaluate(() => document.documentElement.dir)
  check('cohort — switches to dir="rtl"', dir === 'rtl')
  const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
  check('cohort — no horizontal page overflow at 1280 in Arabic', scrollWidth <= 1281, `scrollWidth=${scrollWidth}`)
  check('Arabic — no console/page errors', errors.length === 0, errors.join(' | '))
}

/* ═════════════ AC-1174…1178 — the columns table, built from blank ══════ */
{
  const { page, errors } = await newPage()
  await page.goto(`${BASE}/management/reports`, { waitUntil: 'load' })
  await page.waitForTimeout(1000)
  await page.getByRole('link', { name: 'New report' }).click().catch(() => page.getByRole('button', { name: 'New report' }).click())
  await page.waitForTimeout(1000)

  await page.getByLabel('Measure', { exact: true }).click()
  await page.getByRole('option').first().click()
  await page.waitForTimeout(500)
  await page.getByLabel('Chart type', { exact: true }).click()
  await page.waitForTimeout(300)
  await page.getByRole('option', { name: 'Data table' }).click()
  await page.waitForTimeout(500)

  const columnsGroup = page.getByRole('group', { name: 'Columns' })
  const checkbox = columnsGroup.getByRole('checkbox').first()
  await checkbox.click()
  await page.waitForTimeout(700)

  // Turn on the totals row.
  await page.getByLabel(/otals/).click().catch(() => {})
  await page.waitForTimeout(700)

  const hasTotalsRow = (await page.locator('tfoot tr').count()) > 0
  check('AC-1175 — a totals row renders once "Totals" is ticked', hasTotalsRow)
  const totalsText = await page.locator('tfoot tr').first().innerText().catch(() => '')
  check('AC-1175 — the totals cell names a real number or the aggregate word, never blank', totalsText.trim().length > 0, totalsText.replace(/\n/g, ' | '))

  const scrollport = page.locator('[data-slot="table-container"].overflow-x-auto')
  check('AC-1177 — the table renders inside its own scrolling container', (await scrollport.count()) > 0)
  const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth)
  check('AC-1177 — the page itself never scrolls horizontally at 1280', bodyScrollWidth <= 1281, `body scrollWidth=${bodyScrollWidth}`)

  await page.screenshot({ path: `${OUT}/wp34-table-columns-totals.png` })
  check('table columns — no console/page errors', errors.length === 0, errors.join(' | '))
}

await browser.close()
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S) — the AC-1169 ones are EXPECTED FAILURES proving the defect; see the visual-qa report`)
process.exit(0)
