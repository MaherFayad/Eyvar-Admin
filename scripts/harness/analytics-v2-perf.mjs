/**
 * WP-8.4 performance measurement harness — analytics v2.
 *
 * Run against a `vite preview` of a production build (the honest number for
 * bundle-dependent timings — jsdom has no layout and mock mode has no real
 * HTTP, so "no refetch" is measured the way `amp-interact.mjs` established:
 * sampling `result.asOf` / DOM state across a transition, never Playwright's
 * network log, which only ever sees Vite/static-asset requests in mock mode.
 *
 * Usage: HARNESS_BASE=http://localhost:4362 node analytics-v2-perf.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.HARNESS_BASE || 'http://localhost:4362'
const results = {}

const browser = await chromium.launch()

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const longTasks = []
  await page.exposeFunction('__reportLongTask', (d) => longTasks.push(d))
  await page.addInitScript(() => {
    try {
      const obs = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.__reportLongTask({ name: e.name, duration: e.duration, start: e.startTime })
        }
      })
      obs.observe({ entryTypes: ['longtask'] })
    } catch {}
    // Count setInterval calls with ~2000ms delay (the analyst job poll) without
    // touching any src file — pure black-box instrumentation from the harness.
    window.__intervalLog = []
    const realSetInterval = window.setInterval.bind(window)
    window.setInterval = (fn, delay, ...rest) => {
      window.__intervalLog.push({ delay, t: performance.now() })
      return realSetInterval(fn, delay, ...rest)
    }
  })
  return { ctx, page, longTasks }
}

/* ── 1 · legend toggle and chart-type change issue no request ──────────── */
{
  const { page, longTasks } = await newPage()
  await page.goto(`${BASE}/management/reports/RPT-20`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const asOf = () => page.evaluate(() => document.querySelector('[role="group"] p')?.textContent?.trim() ?? null)
  const before = await asOf()

  // legend toggle: click the first legend entry button (ResultCanvas.tsx SeriesLegend, `ul[role="list"] button[aria-pressed]`)
  const legendBtn = page.locator('ul[role="list"] button[aria-pressed]').first()
  const legendCount = await legendBtn.count()
  let legendResult = 'no legend button found'
  if (legendCount > 0) {
    await legendBtn.click()
    await page.waitForTimeout(600)
    legendResult = (await asOf()) === before ? 'PASS no request (asOf unchanged)' : 'FAIL asOf changed'
  }

  // chart type change (reuse RPT-1-style control name 'Chart type')
  let chartTypeResult = 'control not found'
  const combo = page.getByRole('combobox', { name: 'Chart type' })
  if ((await combo.count()) > 0) {
    await combo.click()
    const opts = page.getByRole('option')
    const n = await opts.count()
    if (n > 1) {
      await opts.nth(1).click()
      await page.waitForTimeout(600)
      chartTypeResult = (await asOf()) === before ? 'PASS no request (asOf unchanged)' : 'FAIL asOf changed'
    }
  }
  results.legendToggle = legendResult
  results.chartTypeChange = chartTypeResult
  results.rpt20LongTasksDuringToggle = longTasks.filter((t) => t.duration > 50)
  await page.close()
}

/* ── 2 · analyst job polling stops when done ────────────────────────────── */
{
  const { page } = await newPage()
  await page.goto(`${BASE}/management/reports/analyst/AGT-1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const doneIntervals = await page.evaluate(() => window.__intervalLog.filter((i) => i.delay === 2000).length)
  await page.waitForTimeout(5000)
  const doneIntervalsAfter = await page.evaluate(() => window.__intervalLog.filter((i) => i.delay === 2000).length)
  results.analystDoneJobPolling = {
    jobState: 'done (AGT-1)',
    pollIntervalsCreatedAtLoad: doneIntervals,
    pollIntervalsCreatedAfter5s: doneIntervalsAfter,
    verdict: doneIntervalsAfter === 0 ? 'PASS no poll timer created' : 'FAIL a 2s poll timer was created for a done job',
  }
  await page.close()
}
{
  const { page } = await newPage()
  await page.goto(`${BASE}/management/reports/analyst/AGT-2`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const running = await page.evaluate(() => window.__intervalLog.filter((i) => i.delay === 2000).length)
  results.analystRunningJobPolling = {
    jobState: 'running (AGT-2)',
    pollIntervalsCreated: running,
    verdict: running >= 1 ? 'PASS poll timer created for a running job (control case)' : 'UNEXPECTED no poll timer for a running job',
  }
  await page.close()
}

/* ── 3 · render cost at real density ────────────────────────────────────── */
async function timeToMeaningfulRender(url, readySelector, label, sampleMs = 6000) {
  const { page, longTasks } = await newPage()
  const t0 = Date.now()
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' })
  let readyAt = null
  const deadline = Date.now() + sampleMs
  while (Date.now() < deadline) {
    const count = await page.locator(readySelector).count().catch(() => 0)
    if (count > 0 && readyAt === null) {
      readyAt = Date.now() - t0
      break
    }
    await page.waitForTimeout(50)
  }
  const domNodes = await page.evaluate(() => document.querySelectorAll('*').length)
  results[label] = {
    url,
    timeToMeaningfulRenderMs: readyAt,
    domNodeCount: domNodes,
    longTasksOver50ms: longTasks.filter((t) => t.duration > 50).length,
  }
  await page.close()
}

await timeToMeaningfulRender('/management/reports/RPT-20', '.recharts-surface', 'render_report8series')
await timeToMeaningfulRender('/management/reports/pages/DSH-1', '[data-slot="card"]', 'render_page_3blocks')
await timeToMeaningfulRender('/management/reports', 'table', 'render_reportsLibrary')
await timeToMeaningfulRender('/management/reports?view=alerts', 'table', 'render_alertsRulesTable_start')

/* Alerts table: measure the FULL settle time (every row's sparkline resolved) */
{
  const { page, longTasks } = await newPage()
  const t0 = Date.now()
  await page.goto(`${BASE}/management/reports?view=alerts`, { waitUntil: 'domcontentloaded' })
  let rowCount = 0
  let sparklineSettleMs = null
  let lastSparkCount = 0
  const trajectory = []
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => ({
      rows: document.querySelectorAll('table tbody tr').length,
      sparks: document.querySelectorAll('.recharts-surface').length,
      skeletons: document.querySelectorAll('[data-slot="skeleton"]').length,
    }))
    rowCount = state.rows
    lastSparkCount = state.sparks
    trajectory.push({ tMs: Date.now() - t0, ...state })
    if (state.sparks >= state.rows && state.rows > 0 && sparklineSettleMs === null) {
      sparklineSettleMs = Date.now() - t0
      break
    }
    await page.waitForTimeout(150)
  }
  results.render_alertsRulesTable_allSparklinesSettled = {
    ruleRowCount: rowCount,
    finalSparkCount: lastSparkCount,
    settleMs: sparklineSettleMs,
    longTasksOver50ms: longTasks.filter((t) => t.duration > 50).length,
    trajectorySample: [trajectory[0], trajectory[Math.floor(trajectory.length / 2)], trajectory[trajectory.length - 1]],
    note: 'AlertsView.tsx fires getReport+runReport per visible row (F-V2-60); this is wall-clock cost, not a literal request count (mock mode has no HTTP)',
  }
  await page.close()
}

/* ── 4 · long tasks during ordinary interactions ────────────────────────── */
{
  const { page, longTasks } = await newPage()
  await page.goto(`${BASE}/management/reports/RPT-20`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  longTasks.length = 0
  // open the overflow/toolbar menu
  const menuBtn = page.getByRole('button', { name: /more|overflow|⋯|View/i }).first()
  if ((await menuBtn.count()) > 0) {
    await menuBtn.click()
    await page.waitForTimeout(300)
  }
  results.longTask_openMenu = [...longTasks]
  longTasks.length = 0

  // brush drag, if present
  const brush = page.locator('.recharts-brush').first()
  if ((await brush.count()) > 0) {
    const box = await brush.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2, { steps: 10 })
      await page.mouse.up()
      await page.waitForTimeout(300)
    }
  }
  results.longTask_brushDrag = [...longTasks]
  longTasks.length = 0

  // formula field typing, if reachable
  const formulaField = page.getByRole('textbox', { name: /formula/i })
  if ((await formulaField.count()) > 0) {
    await formulaField.click()
    await formulaField.type('revenue.total / trips.completed', { delay: 20 })
    await page.waitForTimeout(300)
  }
  results.longTask_formulaTyping = [...longTasks]
  await page.close()
}

console.log(JSON.stringify(results, null, 2))
await browser.close()
