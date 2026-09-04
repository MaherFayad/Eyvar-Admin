/**
 * Financials › Revenue & Refunds, `Revenue by plan`.
 *
 * jsdom draws no SVG and lays out no table, so the sparklines, the composed
 * plot, the composition bar and the 280px list column are only provable here.
 * FINANCIALS-UX-PLAN §4.7: 1280 and 1440, en and ar; four sparklines, one
 * composed plot, one composition bar; `overflowX === 0`; the list is 280px;
 * the detail plot clears R4-1's 268px floor.
 *
 * The second pass measures the two things the owner reviewed and rejected: the
 * view row must be at the SAME top and the SAME height on all five views, and
 * the period control must sit on the title row rather than on one of its own.
 * Both skins, because the review is in dark.
 *
 *   npx vite --port 4336
 *   HARNESS_BASE=http://localhost:4336 node scripts/harness/fin-revenue.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

/* Arabic is reached the way an operator reaches it — the account menu's radio —
   because a forced `dir` on the DOM is not the language switch the product
   ships. `amp-builder-ar-dark.mjs` established the route. */
async function switchToArabic(page) {
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await page.waitForTimeout(1200)
}

for (const [name, url, w, arabic] of [
  ['fin-revenue-1280', '/financials/revenue?view=by-plan', 1280, false],
  ['fin-revenue-1440', '/financials/revenue?view=by-plan', 1440, false],
  ['fin-revenue-table-1280', '/financials/revenue?view=by-plan&mode=table', 1280, false],
  ['fin-revenue-quick-1440', '/financials/revenue?view=by-plan&plan=quick-ride', 1440, false],
  ['fin-revenue-ar-1280', '/financials/revenue?view=by-plan', 1280, true],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 1100 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.goto(BASE + url, { waitUntil: 'networkidle' })
  if (arabic) {
    await switchToArabic(page)
    await page.goto(BASE + url, { waitUntil: 'networkidle' })
  }
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })

  const facts = await page.evaluate(() => {
    const plots = [...document.querySelectorAll('.recharts-surface')]
    const list = document.querySelector('ul[aria-label]')
    const detail = document.querySelector('section[aria-labelledby]')
    return {
      dir: document.documentElement.dir,
      /* Four rows, four sparklines, plus the detail's composed plot. */
      plots: plots.length,
      bars: document.querySelectorAll('.recharts-bar-rectangle').length,
      lines: document.querySelectorAll('.recharts-line').length,
      /* The composition bar is one hidden stadium over a legend of three. */
      compositionSegments: document.querySelectorAll(
        '[aria-hidden="true"].rounded-full > span',
      ).length,
      selectedRows: document.querySelectorAll('[aria-current="true"]').length,
      listWidth: list ? Math.round(list.getBoundingClientRect().width) : null,
      detailWidth: detail ? Math.round(detail.getBoundingClientRect().width) : null,
      /* R4-1 — every plot at or above the 268px floor. */
      plotWidths: plots.map((node) => Math.round(node.getBoundingClientRect().width)),
      /* Nothing may scroll the page sideways. */
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      /* V-11 — the total is a footer row of the table, not a card below it. */
      footerRows: document.querySelectorAll('tfoot tr').length,
      columnHeaders: [...document.querySelectorAll('th')].map((n) => n.textContent?.trim()),
      /* V-12 — the column budget. A table that scrolls sideways on its DEFAULT
         column set, or whose headers wrap, has more columns than the width. */
      tableOverflowX: (() => {
        const box = document.querySelector('table')?.parentElement
        return box ? box.scrollWidth - box.clientWidth : null
      })(),
      headerHeights: [...document.querySelectorAll('th')].map((n) =>
        Math.round(n.getBoundingClientRect().height),
      ),
      numerals: document.querySelectorAll('[data-slot="metric-value"]').length,
    }
  })
  console.log(name, JSON.stringify(facts))
  if (errors.length) console.log(name, 'ERRORS', errors)
  await ctx.close()
}

/* ── the view row and the period control, on all five views ─────────────── */

const VIEWS = ['by-plan', 'refunds', 'refunds-ledger', 'credit-notes', 'margin']

for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 1100 },
    colorScheme: scheme,
  })
  const page = await ctx.newPage()
  const measured = []

  for (const view of VIEWS) {
    await page.goto(`${BASE}/financials/revenue?view=${view}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1800)
    const facts = await page.evaluate(() => {
      const box = (node) => {
        if (!node) return null
        const rect = node.getBoundingClientRect()
        return {
          top: Math.round(rect.top + window.scrollY),
          height: Math.round(rect.height),
        }
      }
      const row = document.querySelector('[data-slot="view-row"]')
      const h1 = document.querySelector('h1')
      /* The period control is the cluster its stepper sits in. */
      const period = document.querySelector('[aria-label="Previous month"]')?.parentElement
      const tabs = row ? [...row.querySelectorAll('[role="tab"]')] : []
      return {
        viewRow: box(row),
        h1: box(h1),
        period: box(period),
        /* One strip of five, whichever view is mounted; the by-plan row adds
           the two `Charts | Table` triggers at its inline-end. */
        tabsInRow: tabs.length,
        /* D12 — the stadium, from the same component the toolbar renders. */
        tabRadius: tabs[0] ? getComputedStyle(tabs[0]).borderRadius : null,
        /* Nothing below the row may raise a second strip. */
        tabsBelowRow: [...document.querySelectorAll('[role="tab"]')].filter(
          (tab) => !row?.contains(tab),
        ).length,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
    })
    measured.push([view, facts])
    console.log(`view-row-${scheme}`, view, JSON.stringify(facts))
  }

  const tops = [...new Set(measured.map(([, f]) => f.viewRow?.top))]
  const heights = [...new Set(measured.map(([, f]) => f.viewRow?.height))]
  console.log(
    `view-row-${scheme}`,
    JSON.stringify({
      sameTop: tops.length === 1 && tops[0] !== undefined,
      tops,
      sameHeight: heights.length === 1 && heights[0] !== undefined,
      heights,
      periodOnTitleRow: measured.every(
        ([, f]) =>
          f.period && f.h1 && f.period.top >= f.h1.top && f.period.top <= f.h1.top + f.h1.height,
      ),
      secondStrip: measured.some(([, f]) => f.tabsBelowRow > 0),
    }),
  )
  await ctx.close()
}

await browser.close()
