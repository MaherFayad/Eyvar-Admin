/**
 * **The alignment audit, across every width the product claims.**
 *
 * One viewport proves nothing: the band is capped at the measure and padded by
 * a token that changes under the compact hook, the chapter grid is three across
 * above 768 and one below, and the page block centres itself past 1440. Every
 * one of those is a chance for the band's tracks and the page's tracks to stop
 * being the same tracks.
 *
 * What it asserts, per route per width:
 *   1. every SECTION-LEVEL element starts on one vertical line — the band's
 *      `h1`, each chapter heading, the chart section's heading;
 *   2. the band's three lead columns land on the chapter grid's three columns;
 *   3. nothing overflows the viewport horizontally.
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:4325'
const ROUTES = [
  '/management/overview',
  '/management/performance',
  '/management/risk',
  '/management/growth',
  '/operations/overview',
  '/support/overview',
  '/admin/overview',
  /* Market & Zones has a different anatomy — a bar, a strip and a full-bleed
     map — and the strip's first numeral must land on the bar's title. It has
     no chapter grid, so only rule 1 and rule 3 apply to it. */
  '/management/zones',
]
const WIDTHS = [390, 640, 768, 1024, 1280, 1344, 1440, 1728, 2400]

const PROBE = `(() => {
  const dir = getComputedStyle(document.documentElement).direction
  /* The inline-START edge, so the numbers mean the same thing in both
     directions: in RTL that is the RIGHT edge, measured from the right. */
  const startOf = (el) => {
    const r = el.getBoundingClientRect()
    return Math.round(dir === 'rtl' ? window.innerWidth - r.right : r.left)
  }
  /* Scoped to the page's own region. An unscoped h2 query picks up the
     sub-nav's section label, which is shell chrome and is not on the page's
     inline-start line by design. */
  const main = document.querySelector('main') || document.body
  const band = main.querySelector('section.bg-hero')
  const h1 = main.querySelector('h1')
  const headings = [...main.querySelectorAll('h2')].filter((h) => !h.closest('.bg-hero'))
  const leadCells = band ? [...band.querySelectorAll('ul > li')] : []
  /* The first figure of each chapter row, which is what a chapter's columns
     are. \`data-numeric\` is on every figure grid and on nothing else. */
  const grids = [...main.querySelectorAll('[data-numeric]')].filter((g) => !g.closest('.bg-hero'))
  const firstGridCells = grids.length ? [...grids[0].children] : []
  /* Only the FIRST panel of the chart row: the others are later columns of a
     grid and are not meant to be on the start line.
   *
     A panel inside an aside is EXCLUDED, and that is a real exemption rather
     than a way to make the audit pass. Market and Zones floats its zone panel
     ON the map, absolutely positioned at the inline end over a full-bleed
     canvas, so it is deliberately not in the page's column and asserting that
     it is would be asserting the opposite of the design. Everything else this
     query finds is a chart or a list in the page's own grid, where the rule
     holds.

     No backticks in this comment: PROBE is a template literal, so one would
     end the string. */
  const allPanels = [...main.querySelectorAll('[data-slot="card-title"]')]
    .filter((el) => !el.closest('aside'))
    .map(startOf)
  const panelTitles = allPanels.length ? [Math.min(...allPanels)] : []

  return {
    dir,
    h1: h1 ? startOf(h1) : null,
    headings: headings.map((h) => ({ t: h.textContent.slice(0, 18), x: startOf(h) })),
    leads: leadCells.map(startOf),
    cols: firstGridCells.map(startOf),
    panels: panelTitles,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }
})()`

const browser = await chromium.launch()
const problems = []

/* **Both directions.** Every class in this work is logical, which is a claim
   that has to be measured rather than asserted: `startOf` reads the RIGHT edge
   under `dir="rtl"`, so a rule that mirrored correctly gives identical numbers
   in both passes and one that did not shows up as a mismatch. */
for (const lang of ['en', 'ar']) {
const ctx = await browser.newContext()
const page = await ctx.newPage()
if (lang === 'ar') {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(BASE + ROUTES[0], { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitemradio', { name: /Arabic|عرب/i }).click()
  await page.waitForFunction(() => document.documentElement.dir === 'rtl', null, { timeout: 8000 })
  await page.keyboard.press('Escape')
}

for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 900 })
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    const g = await page.evaluate(PROBE)
    const tag = `${lang} ${width} ${route}`
    if (lang === 'ar' && g.dir !== 'rtl') throw new Error(`${tag}: not rtl`)

    if (g.overflow > 1) problems.push(`${tag}: horizontal overflow ${g.overflow}px`)

    /* 1 — one inline-start line for every section-level element. */
    const starts = [g.h1, ...g.headings.map((h) => h.x), ...g.panels].filter((x) => x !== null)
    const off = starts.filter((x) => Math.abs(x - g.h1) > 1)
    if (off.length) problems.push(`${tag}: h1 at ${g.h1}, but ${off.length} section start(s) at ${[...new Set(off)].join(',')}`)

    /* 2 — the band's columns are the chapter grid's columns. Only above the
       compact hook, where both are three across; below it both are one. */
    if (g.leads.length === 3 && g.cols.length >= 2 && width >= 768) {
      for (let i = 0; i < Math.min(g.leads.length, g.cols.length); i++) {
        if (Math.abs(g.leads[i] - g.cols[i]) > 1)
          problems.push(`${tag}: band col ${i + 1} at ${g.leads[i]}, chapter col ${i + 1} at ${g.cols[i]}`)
      }
    }
  }
}
await ctx.close()
}

console.log(`checked 2 languages x ${WIDTHS.length} widths x ${ROUTES.length} routes = ${WIDTHS.length * ROUTES.length}`)
console.log(`problems: ${problems.length}`)
for (const p of problems.slice(0, 40)) console.log('  ' + p)
await browser.close()
