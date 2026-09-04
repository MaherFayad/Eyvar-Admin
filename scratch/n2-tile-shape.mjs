/**
 * N-2 — does a pinned report render the shape its builder renders?
 *
 * Reads the DOM of `/management/reports/RPT-7` (the builder) and of tile 3 on
 * `/management/reports/dashboards/DSH-3` (the same report, pinned) and prints
 * the table header row of each. Two different header rows is the defect.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5411'
const OUT = './scratch/shots-n2'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1400 } })
const errs = []
page.on('pageerror', (e) => errs.push(String(e)))

const tables = () =>
  [...document.querySelectorAll('table')].map((t) => ({
    head: [...t.querySelectorAll('thead th')].map((c) => c.innerText.trim()),
    firstRow: [...(t.querySelector('tbody tr')?.querySelectorAll('th,td') ?? [])].map((c) =>
      c.innerText.trim(),
    ),
    rows: t.querySelectorAll('tbody tr').length,
  }))

await page.goto(`${BASE}/management/reports/RPT-7`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)
 await page.waitForSelector('table', { timeout: 20000 }).catch(() => {})
 await page.waitForTimeout(1500)
console.log('=== BUILDER /management/reports/RPT-7 ===')
console.log(JSON.stringify(await page.evaluate(tables), null, 1))
await page.screenshot({ path: `${OUT}/builder-rpt7.png`, fullPage: false })

await page.goto(`${BASE}/management/reports/dashboards/DSH-3`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
console.log('=== BOARD /management/reports/dashboards/DSH-3 ===')
const tiles = await page.evaluate(() =>
  [...document.querySelectorAll('li')]
    .filter((li) => li.querySelector('[data-slot="card"]'))
    .map((li) => {
      const t = li.querySelector('table')
      return {
        title: li.querySelector('[data-slot="card-title"]')?.innerText.trim(),
        head: t ? [...t.querySelectorAll('thead th')].map((c) => c.innerText.trim()) : null,
        firstRow: t
          ? [...(t.querySelector('tbody tr')?.querySelectorAll('th,td') ?? [])].map((c) =>
              c.innerText.trim(),
            )
          : null,
        rows: t ? t.querySelectorAll('tbody tr').length : 0,
      }
    }),
)
console.log(JSON.stringify(tiles, null, 1))
await page.screenshot({ path: `${OUT}/board-dsh3.png`, fullPage: true })

/* The same thing under Arabic, because a matrix in a tile is the widest of the
   three mode shapes and RTL is where a column budget fails first. */
await page.goto(`${BASE}/management/reports/dashboards/DSH-3?lang=ar`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
await page.evaluate(() => {
  document.documentElement.setAttribute('dir', 'rtl')
  document.documentElement.setAttribute('lang', 'ar')
})
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/board-dsh3-rtl.png`, fullPage: true })

console.log('page errors:', errs.slice(0, 5))
await browser.close()
