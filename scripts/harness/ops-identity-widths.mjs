/**
 * **T5.1's instrument, for Requests, Subscriptions and Trips.** jsdom does no
 * table layout, so the only thing that can say whether an identity truncates at
 * 1280 is a browser. It prints, per route and language: `truncated`, the count
 * of clipped nodes in the identity columns; `need`, what every column would
 * have to be for nothing in it to clip; `overflowX`, because a budget that fits
 * by pushing the page sideways has not fit; and `rowHeights`, because one that
 * fits by growing the row has not either.
 *
 * **What it measured, 2026-09-05.** `truncated: 0` is not reachable at 1280 by
 * moving width between the declared columns. Summed `need` plus the declared
 * lanes, against §7.3's Arabic inner width of **870**:
 *
 * ```
 *   ride-requests           917    subscriptions        1131
 *   subscription-requests   941    quick-rides          1401
 *   subscription-trips      953
 * ```
 *
 * The three names driving it are fixtures of 40, 46 and 51 characters, and
 * `RiderBand` records that the patronymic chain is the identifying half rather
 * than decoration. So the remedies are fewer default columns (§7.4) or shorter
 * values, not a `minWidth`; both sit outside the screens. What this branch did
 * take is the one clip that was a SHAPE defect: the `Offered` decision cell
 * stacked, and its column went from `need 200` to no overflow at all.
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
  /* `?view=all` is the only view holding DECIDED rows, so it is the only one
     that measures the decision badge against the column that carries it. */
  ['requests-all', '/operations/ride-requests?view=all', ['Ride', 'Decision', 'الرحلة', 'القرار']],
  ['sub-requests', '/operations/subscription-requests', ['Ride', 'Decision', 'الرحلة', 'القرار']],
  ['subscriptions', '/operations/subscriptions', ['Rider', 'Captain', 'الراكب', 'الكابتن']],
  ['quick-rides', '/operations/quick-rides', ['Rider', 'Captain', 'الراكب', 'الكابتن']],
  ['sub-trips', '/operations/subscription-trips', ['Rider', 'Captain', 'الراكب', 'الكابتن']],
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
    /* What each column would have to be for nothing in it to clip: the width it
       rendered at plus the widest overflow any row reports. T5.1 is a budget,
       and a budget needs the demand of every column, not only the watched ones. */
    const demand = {}
    for (const column of columns) demand[column.header || '(lane)'] = [column.width]
    for (const row of rows) {
      for (const column of columns) {
        const cell = row.cells[column.index]
        if (!cell) continue
        const key = column.header || '(lane)'
        for (const node of cell.querySelectorAll('*')) {
          /* `sr-only` is 1px wide by design; it is not a truncation. */
          if (node.clientWidth <= 2 || node.clientHeight <= 2) continue
          const over = node.scrollWidth - node.clientWidth
          if (over <= 1) continue
          demand[key].push(column.width + over)
          if (labels.some((l) => column.header.includes(l)))
            clipped.push({ header: column.header, text: (node.textContent ?? '').slice(0, 48) })
        }
      }
    }
    const need = {}
    for (const [key, list] of Object.entries(demand))
      need[key] = [...new Set(list)].sort((a, b) => b - a).slice(0, 5)
    return {
      table: true,
      dir: document.documentElement.dir,
      rows: rows.length,
      columns: columns.filter((c) => c.width > 0),
      watched: watchedColumns.map((c) => `${c.header}=${c.width}`),
      truncated: clipped.length,
      /* A width budget that buys itself room by growing the row has not fit
         either, so the pitch is reported beside the truncation count. */
      rowHeights: [...new Set(rows.map((r) => Math.round(r.getBoundingClientRect().height)))].sort(
        (a, b) => b - a,
      ),
      need,
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
