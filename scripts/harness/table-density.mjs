/**
 * Row pitch and rows-per-viewport for the index tables the table layer owns,
 * plus (WP-3.1/3.2/3.3) the report builder's funnel cascade, retention
 * matrix and data table — jsdom draws no table layout and no SVG, so a green
 * suite proves nothing about a column's real width or a heat cell's colour.
 *
 * Run the dev server first: `npx vite --port 4327` (or point `HARNESS_BASE`
 * at a `vite preview` instance if 4327 is already held).
 *
 *   node scripts/harness/table-density.mjs [label]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4332'
const REPORTS_BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
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

/* ═══════════ WP-3.1/3.2/3.3 — funnel, retention matrix, data table ═══════ */

/**
 * `RPT-6` (funnel), `RPT-7` (monthly cohorts), `RPT-9` (data table) — the
 * exact fixtures `resolveReport.mode.test.ts` and `cohortHeadline.test.tsx`
 * already pin, so what this captures is what the unit suite already proved
 * resolves, not a hand-built query nobody else asserts on.
 */
const REPORT_ROUTES = [
  ['rpt-funnel', '/management/reports/RPT-6'],
  ['rpt-retention', '/management/reports/RPT-7'],
  ['rpt-data-table', '/management/reports/RPT-9'],
]

const reportsBrowser = await chromium.launch()

async function shootReport(name, url, { arabic = false, dark = false }) {
  const ctx = await reportsBrowser.newContext({
    viewport: { width: 1280, height: 900 },
    ...(dark ? { colorScheme: 'dark' } : {}),
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.goto(REPORTS_BASE + url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  if (arabic) {
    /* The account menu carries the language radio group — same control
       `amp-builder-ar-dark.mjs` drives. */
    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await page.waitForTimeout(900)
  }
  await page.waitForTimeout(1200)
  const tag = `${name}-${arabic ? 'ar' : 'en'}-${dark ? 'dark' : 'light'}`
  await page.screenshot({ path: `${OUT}/${tag}-${LABEL}.png`, fullPage: true })

  const facts = await page.evaluate(() => {
    const table = document.querySelector('table')
    const cohortHeat = [...document.querySelectorAll('td span[class*="bg-heat-"]')]
    const cohortHeatClasses = [
      ...new Set(cohortHeat.flatMap((n) => [...n.classList].filter((c) => c.startsWith('bg-heat-')))),
    ]
    /* Every heat cell's own inline `style` must be empty — the strength is
       carried by the token class, not an arbitrary opacity (AC-1173). */
    const heatInlineStyles = cohortHeat.filter((n) => n.getAttribute('style')).length
    const funnelStep = document.querySelector('ol li')
    return {
      dir: document.documentElement.dir,
      table: Boolean(table),
      tableContainer: Boolean(document.querySelector('[data-slot="table-container"]')),
      /* Nothing on the page may scroll sideways even when the table itself does. */
      pageOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      tableContainerOverflowX: (() => {
        const c = document.querySelector('[data-slot="table-container"]')
        return c ? c.scrollWidth - c.clientWidth : null
      })(),
      headerWidths: table
        ? [...table.querySelectorAll('thead th')].map((th) => Math.round(th.getBoundingClientRect().width))
        : [],
      cohortHeatClasses,
      heatInlineStyles,
      funnelStepIsButton: funnelStep ? Boolean(funnelStep.querySelector('button[aria-expanded]')) : null,
    }
  })
  console.log(tag, JSON.stringify(facts))
  if (errors.length) console.log(tag, 'ERRORS', errors)
  await ctx.close()
}

for (const [name, url] of REPORT_ROUTES) {
  for (const arabic of [false, true]) {
    for (const dark of [false, true]) {
      await shootReport(name, url, { arabic, dark })
    }
  }
}
await reportsBrowser.close()
