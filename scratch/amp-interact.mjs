/**
 * The three things the owner asked for, measured in a real browser rather than
 * asserted in jsdom — which renders no SVG and would report all three working
 * either way.
 *
 *  1. changing the chart type costs **no run** and does not blank the canvas
 *  2. changing the mode and coming back costs **no run**
 *  3. a comparison draws a dashed line per series and fills the deltas in
 *
 * **Network request counting cannot answer this and is deliberately not used.**
 * `DATA_SOURCE` is `mock` in dev, so a run resolves in-process and issues no
 * HTTP at all; every request Playwright sees is Vite serving a module. The
 * observable signal for *a run happened* is the freshness stamp — `run` sets
 * `result.asOf` from the resolver — plus the skeleton the loading state draws.
 * So this samples both, at 80ms, across every transition.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4327'
const OUT = './scratch/shots-amp'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

const state = () =>
  page.evaluate(() => {
    const marks =
      document.querySelectorAll('.recharts-curve').length +
      document.querySelectorAll('.recharts-rectangle').length
    const curves = [...document.querySelectorAll('.recharts-curve')]
    return {
      plots: document.querySelectorAll('.recharts-surface').length,
      marks,
      dashed: curves.filter((n) => getComputedStyle(n).strokeDasharray !== 'none').length,
      numerals: [...document.querySelectorAll('[data-slot="metric-value"]')].map(
        (n) => n.textContent,
      ),
      deltas: [...document.querySelectorAll('[data-slot="metric-value"]')].map((n) =>
        n.parentElement?.textContent?.replace(/\s+/g, ' ').trim(),
      ),
      /* `Computed 25 Jun 09:14` — changes only when a run lands. */
      asOf: document.querySelector('[role="group"] p')?.textContent?.trim() ?? null,
      shape: document.querySelector('#rb-viz')?.textContent?.trim(),
    }
  })

/** Sample hard across a transition: any blank, skeleton or empty canvas shows. */
async function watch(action, ms = 1800) {
  const seen = []
  const stop = Date.now() + ms
  const task = action()
  while (Date.now() < stop) {
    seen.push(
      await page.evaluate(() => ({
        skeleton: document.querySelectorAll('[data-slot="skeleton"]').length,
        plots: document.querySelectorAll('.recharts-surface').length,
        unstarted: document.body.textContent?.includes('Nothing has been asked yet') ? 1 : 0,
      })),
    )
    await page.waitForTimeout(80)
  }
  await task
  return {
    everySkeleton: seen.reduce((n, s) => n + (s.skeleton > 0 ? 1 : 0), 0),
    everyBlank: seen.reduce((n, s) => n + (s.plots === 0 ? 1 : 0), 0),
    everyUnstarted: seen.reduce((n, s) => n + s.unstarted, 0),
    samples: seen.length,
  }
}

async function pick(control, option) {
  await page.getByRole('combobox', { name: control }).click()
  await page.getByRole('option', { name: new RegExp('^' + option) }).click()
}

await page.goto(BASE + '/management/reports/RPT-1', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const seeded = await state()
console.log('seeded         ', JSON.stringify(seeded))

/* ── 1 · a chart type is a lens, not a question ─────────────────────────── */
const barWatch = await watch(() => pick('Chart type', 'Bar chart'))
const bar = await state()
console.log('Line → Bar     ', JSON.stringify(bar))
console.log('  during:      ', JSON.stringify(barWatch))
console.log('  asOf same?   ', bar.asOf === seeded.asOf, '| numbers same?',
  JSON.stringify(bar.numerals) === JSON.stringify(seeded.numerals))
await page.screenshot({ path: `${OUT}/interact-bar.png`, fullPage: true })

/* ── 2 · a mode round trip restores rather than re-asks ─────────────────── */
await watch(() => pick('Chart type', 'Retention'), 2400)
const backWatch = await watch(() => pick('Chart type', 'Bar chart'), 2400)
const back = await state()
console.log('Retention→Bar  ', JSON.stringify(back))
console.log('  during:      ', JSON.stringify(backWatch))
console.log('  asOf same?   ', back.asOf === seeded.asOf)

/* ── 3 · the comparison ─────────────────────────────────────────────────── */
await pick('Chart type', 'Line chart')
await page.waitForTimeout(1400)
await pick('Compare to', 'Previous period')
await page.waitForTimeout(2400)
console.log('with compare   ', JSON.stringify(await state()))
await page.screenshot({ path: `${OUT}/interact-compare.png`, fullPage: true })

console.log('page errors:', errors.length, errors.slice(0, 3))
await browser.close()
