/**
 * **T5.1's evidence, for Requests, Subscriptions and Trips.** jsdom does no
 * table layout, so the only thing that can say whether an identity truncates at
 * 1280 is a browser. `truncated` must be 0 in both languages, and `overflowX`
 * must be 0: a column budget that fits by pushing the page sideways has not fit.
 *
 * Run the dev server first (`npx vite --port 4345`); `HARNESS_BASE` overrides
 * the origin when that port is taken.
 *
 *   node scripts/harness/ops-identity-widths.mjs [label]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4345'
const LABEL = process.argv[2] ?? 'now'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

/** Route, and the header labels whose cells must not clip. */
const ROUTES = [
  ['requests', '/operations/ride-requests', ['Ride', 'Decision', 'الرحلة', 'القرار']],
  ['subscriptions', '/operations/subscriptions', ['Rider', 'Captain', 'الراكب', 'الكابتن']],
  ['trips', '/operations/quick-rides', ['Rider', 'Captain', 'الراكب', 'الكابتن']],
]

async function measure(page, watched) {
  return page.evaluate((labels) => {
    const table = document.querySelector('table')
    if (!table) return { table: false, text: document.body.innerText.slice(0, 200) }
    const headers = [...table.querySelectorAll('thead th')]
    const columns = headers.map((th, index) => ({
      index,
      header: (th.textContent ?? '').trim(),
      width: Math.round(th.getBoundingClientRect().width),
    }))
    const watchedColumns = columns.filter((c) => labels.some((l) => c.header.includes(l)))
    const rows = [...table.querySelectorAll('tbody tr')]
    /* Every node inside a watched cell that is cut. `+1` absorbs sub-pixel
       rounding, which reports a clip on a cell that renders whole. */
    const clipped = []
    for (const row of rows) {
      for (const column of watchedColumns) {
        const cell = row.cells[column.index]
        if (!cell) continue
        for (const node of cell.querySelectorAll('*')) {
          /* `sr-only` is 1px wide by design; it is not a truncation. */
          if (node.clientWidth <= 2 || node.clientHeight <= 2) continue
          if (node.scrollWidth > node.clientWidth + 1) {
            clipped.push({ header: column.header, text: (node.textContent ?? '').slice(0, 48) })
          }
        }
      }
    }
    return {
      table: true,
      dir: document.documentElement.dir,
      rows: rows.length,
      columns: columns.filter((c) => c.width > 0),
      watched: watchedColumns.map((c) => `${c.header}=${c.width}`),
      truncated: clipped.length,
      clipped: clipped.slice(0, 6),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  }, watched)
}

const browser = await chromium.launch()
for (const [name, url, watched] of ROUTES) {
  for (const language of ['en', 'ar']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
    await page.goto(BASE + url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1400)
    if (language === 'ar') {
      await page.getByRole('button', { name: 'Account' }).click()
      await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
      await page.waitForTimeout(2600)
    }
    await page.screenshot({ path: `${OUT}/${name}-${language}-1280-${LABEL}.png` })
    const facts = await measure(page, watched)
    console.log(`${name} ${language} 1280 ${LABEL}`, JSON.stringify(facts))
    if (errors.length) console.log(name, language, 'ERRORS', errors)
    await ctx.close()
  }
}
await browser.close()
