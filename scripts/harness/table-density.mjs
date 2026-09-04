/**
 * Row pitch and rows-per-viewport for the index tables the table layer owns.
 *
 * jsdom does no table layout, so a green suite says nothing about either
 * number. This is the only thing that measures them. Run the dev server on
 * 4332 first: `npx vite --port 4332`.
 *
 *   node scripts/harness/table-density.mjs [label]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4332'
const LABEL = process.argv[2] ?? 'now'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const ROUTES = [
  ['trips', '/operations/quick-rides'],
  ['subscriptions', '/operations/subscriptions'],
  ['assurance-absences', '/operations/assurance?view=absences'],
]

const browser = await chromium.launch()
for (const [name, url] of ROUTES) {
  for (const width of [1280, 1152]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
    await page.goto(BASE + url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${OUT}/${name}-${width}-${LABEL}.png` })

    const facts = await page.evaluate(() => {
      const table = document.querySelector('table')
      if (!table) return { table: false, emptyText: document.body.innerText.slice(0, 160) }
      const rows = [...table.querySelectorAll('tbody tr')]
      const tops = rows.map((r) => r.getBoundingClientRect().top)
      const pitches = tops.slice(1).map((t, i) => Math.round(t - tops[i]))
      const first = rows[0]?.getBoundingClientRect()
      const inViewport = rows.filter((r) => {
        const b = r.getBoundingClientRect()
        return b.top >= 0 && b.bottom <= window.innerHeight
      }).length
      /* Every identity cell that is clipped at this width. Must be 0. */
      const truncated = [...table.querySelectorAll('tbody tr > td:nth-child(2) *')].filter(
        (n) => n.scrollWidth > n.clientWidth + 1,
      ).length
      const headers = [...table.querySelectorAll('thead th')].map((th) =>
        Math.round(th.getBoundingClientRect().width),
      )
      return {
        table: true,
        rows: rows.length,
        rowsFullyInViewport: inViewport,
        firstRowTop: first ? Math.round(first.top) : null,
        pitch: [...new Set(pitches)].sort((a, b) => a - b),
        truncatedIdentityNodes: truncated,
        headerWidths: headers,
        avatarsInBody: table.querySelectorAll('tbody [data-slot="avatar"]').length,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
    })
    console.log(`${name} ${width} ${LABEL}`, JSON.stringify(facts))
    if (errors.length) console.log(name, width, 'ERRORS', errors)
    await ctx.close()
  }
}
await browser.close()
