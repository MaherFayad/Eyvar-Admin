/**
 * WP-3.5 — F-V2-47 proof: an operator reaches `ResultTableColumns` from the
 * blank builder — pick a measure, `Chart type -> Data table`, tick it on in
 * the rail's new `Columns` control — with no server change. Chromium, not
 * jsdom, for AC-1177's contained scroll.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
let failures = 0
function check(label, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL'
  if (!ok) failures += 1
  console.log(`${mark}  ${label}${detail ? '  — ' + detail : ''}`)
}

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)) })

await page.goto(`${BASE}/management/reports`, { waitUntil: 'load' })
await page.waitForTimeout(1000)
await page.getByRole('link', { name: 'New report' }).click().catch(() => page.getByRole('button', { name: 'New report' }).click())
await page.waitForTimeout(1000)

// 1. Pick a measure.
await page.getByLabel('Measure', { exact: true }).click()
await page.getByRole('option').first().click()
await page.waitForTimeout(600)

// 2. Switch to the "Data table" chart type (ChartToolbar's one menu, R7 collapse).
await page.getByLabel('Chart type', { exact: true }).click()
await page.waitForTimeout(300)
await page.getByRole('option', { name: 'Data table' }).click()
await page.waitForTimeout(600)

// 3. Tick the measure on as a column.
const columnsGroup = page.getByRole('group', { name: 'Columns' })
check('the columns editor renders for `mode: table`', await columnsGroup.count() > 0)
const checkbox = columnsGroup.getByRole('checkbox').first()
await checkbox.click()
await page.waitForTimeout(900)

// 4. `ResultTableColumns` drew — its own scrolling container, per AC-1177.
const scrollport = page.locator('[data-slot="table-container"].overflow-x-auto')
check('a scroll-contained table renders after ticking a column', await scrollport.count() > 0)

const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth)
const viewportWidth = 1280
check(
  'AC-1177 — the page itself never scrolls horizontally at 1280',
  bodyScrollWidth <= viewportWidth + 1,
  `body scrollWidth=${bodyScrollWidth}`,
)

check('no console/page errors', errors.length === 0, errors.join(' | '))

await page.screenshot({ path: `${OUT}/wp35-table-columns.png` })

await browser.close()
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
