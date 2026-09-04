/**
 * Financials › Overview, rebuilt on the metric-board set (FINANCIALS-UX-PLAN §3.6).
 *
 * jsdom renders no SVG, so the two day-charts, the band's ground and the
 * two-up panel rows are only provable here. Run the dev server first:
 *   npx vite --port 4331
 *   HARNESS_BASE=http://localhost:4331 node scripts/harness/fin-overview.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

const URL = '/financials/overview?from=2026-06-01&to=2026-06-30'

for (const [name, w, scheme] of [
  ['fin-overview-1280', 1280, 'light'],
  ['fin-overview-1440', 1440, 'light'],
  ['fin-overview-1440-dark', 1440, 'dark'],
]) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: 1100 },
    colorScheme: scheme,
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.goto(BASE + URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })

  const facts = await page.evaluate(() => {
    const band = document.querySelector('h1')?.closest('section') ?? null
    const plots = [...document.querySelectorAll('.recharts-surface')]
    return {
      /* Two day-charts, and every plot at or above R4-1's 268px floor. */
      plots: plots.length,
      plotWidths: plots.map((n) => Math.round(n.getBoundingClientRect().width)),
      /* Three leads on the band plus twelve figures under it. */
      numerals: document.querySelectorAll('[data-slot="metric-value"]').length,
      band: band !== null,
      bandGround: band ? getComputedStyle(band).backgroundColor : null,
      /* V-7 — the period control is INSIDE the band, not on a row of its own. */
      periodInBand: band ? band.querySelector('[aria-label="Previous month"]') !== null : false,
      /* V-1 — no figure is a card. Cards are spent on panels only, so a card
         inside a figure grid is the defect. */
      figuresInCards: document.querySelectorAll('ul[data-numeric] [data-slot="card"]').length,
      /* V-4 — a rule opens each section below the chapters. */
      sectionRules: document.querySelectorAll('section.border-t').length,
      /* Nothing may scroll the page sideways. */
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
  console.log(name, JSON.stringify(facts))
  if (errors.length) console.log(name, 'ERRORS', errors)
  await ctx.close()
}

/* Arabic, through the account menu's own radio — the same path an operator
   takes, so a language the shell cannot actually reach fails here. */
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } })
const page = await ctx.newPage()
await page.goto(BASE + URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await page.getByRole('button', { name: 'Account' }).click()
await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
await page.waitForTimeout(2600)
await page.screenshot({ path: `${OUT}/fin-overview-1280-ar.png`, fullPage: true })
console.log(
  'fin-overview-1280-ar',
  JSON.stringify(
    await page.evaluate(() => ({
      dir: document.documentElement.dir,
      plots: document.querySelectorAll('.recharts-surface').length,
      numerals: document.querySelectorAll('[data-slot="metric-value"]').length,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    })),
  ),
)
await ctx.close()
await browser.close()
