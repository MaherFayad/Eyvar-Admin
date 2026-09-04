/**
 * TASK 4 — switching the Question strip must not blank the canvas or lose a
 * pick.
 *
 * What is measured here is the half an operator can see: the owner's complaint
 * was that clicking the strip emptied the canvas and re-fetched it. The canvas
 * is SAMPLED every 60ms from the click onward, so an `unstarted` sentence or a
 * skeleton that shows for two frames is caught rather than missed by a single
 * read after the fact.
 *
 * The request COUNT is asserted in `autorun.test.tsx` through the seam, which
 * is the only place it can be counted honestly: `run` keeps the previous
 * picture up while a re-run is in flight (§8.3 state 2), so a refetch is
 * deliberately invisible in the DOM and no browser probe can see one.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5411'
const OUT = './scratch/shots-mode'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

const CANVAS = 'section[aria-label="Result"]'

/**
 * A canvas FINGERPRINT rather than its text.
 *
 * The text alone cannot tell a trend from a data table on this screen: the
 * builder renders the numbers table under both, the plot is an SVG carrying no
 * text of its own, and PanelCard's sr-only chart-kind label reads "Line chart"
 * for a table panel — a pre-existing quirk in a file this change does not own.
 * So the shape is counted instead: a plot, a table, its cells, and the mode the
 * address says the question is in.
 */
const shape = () =>
  page.evaluate(() => {
    const s = document.querySelector('section[aria-label="Result"]')
    const raw = new URLSearchParams(location.search).get('q')
    let mode = 'trend'
    if (raw) {
      try {
        const json = atob(
          raw.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (raw.length % 4)) % 4),
        )
        mode = JSON.parse(json).mo ?? 'trend'
      } catch {
        mode = '?'
      }
    }
    return {
      mode,
      chars: s ? s.innerText.trim().length : 0,
      plots: s ? s.querySelectorAll('.recharts-surface').length : 0,
      tables: s ? s.querySelectorAll('table').length : 0,
      cells: s ? s.querySelectorAll('tbody td').length : 0,
    }
  })

const lens = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('button[aria-pressed="true"]')].map((b) =>
      (b.getAttribute('aria-label') ?? b.innerText).trim(),
    ),
  )

/** Click a mode, sampling the canvas from the click onward. */
async function switchTo(name, ms = 2600) {
  const button = page.getByRole('button', { name, exact: true }).first()
  await button.scrollIntoViewIfNeeded()
  await page.evaluate(() => {
    window.__s = []
    const tick = () => {
      const s = document.querySelector('section[aria-label="Result"]')
      const t = s ? s.innerText : ''
      window.__s.push({
        empty: t.trim() === '',
        unstarted: /Choose a measure|Finish the question/.test(t),
        skeleton: !!(s && s.querySelector('[data-slot="skeleton"], .animate-pulse')),
      })
      window.__timer = setTimeout(tick, 60)
    }
    tick()
  })
  await button.click()
  await page.waitForTimeout(ms)
  const s = await page.evaluate(() => {
    clearTimeout(window.__timer)
    return window.__s ?? null
  })
  if (s === null) return { LOST_CONTEXT: true }
  /* The first two samples straddle the click, so a state carried over from the
     mode being LEFT is not a state this switch produced. */
  const after = s.slice(2)
  return {
    frames: after.length,
    everEmpty: after.some((x) => x.empty),
    everUnstarted: after.some((x) => x.unstarted),
    everSkeleton: after.some((x) => x.skeleton),
  }
}

await page.goto(`${BASE}/management/reports/RPT-1`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector(CANVAS, { timeout: 25000 })
await page.waitForTimeout(3500)

/* A pick the operator made, on purpose, so a round trip has something to lose. */
await page.getByRole('button', { name: 'Week', exact: true }).first().click()
await page.waitForTimeout(2500)

const trend0 = await shape()
console.log('TREND lens  :', JSON.stringify(await lens()))
console.log('TREND shape :', JSON.stringify(trend0))
await page.screenshot({ path: `${OUT}/1-trend.png` })

console.log('\n→ Data table (never visited) :', JSON.stringify(await switchTo('Data table')))
const table0 = await shape()
console.log('TABLE lens  :', JSON.stringify(await lens()))
console.log('TABLE shape :', JSON.stringify(table0))
console.log('the two modes really differ  :', JSON.stringify(table0) !== JSON.stringify(trend0))
await page.screenshot({ path: `${OUT}/2-table.png` })

console.log('\n→ Trend (cached)             :', JSON.stringify(await switchTo('Trend')))
console.log('TREND lens  :', JSON.stringify(await lens()))
console.log('TREND shape :', JSON.stringify(await shape()))
console.log('restored identically         :', JSON.stringify(await shape()) === JSON.stringify(trend0))
await page.screenshot({ path: `${OUT}/3-trend-again.png` })

console.log('\n→ Data table (cached)        :', JSON.stringify(await switchTo('Data table')))
console.log('restored identically         :', JSON.stringify(await shape()) === JSON.stringify(table0))

const before = await page.evaluate(() => location.search)
console.log('\n→ Funnel (never visited, no rungs) :', JSON.stringify(await switchTo('Funnel')))
console.log('canvas now  :', JSON.stringify(await shape()))
console.log('address unchanged by an unanswerable mode :', before === (await page.evaluate(() => location.search)))
await page.screenshot({ path: `${OUT}/4-funnel.png` })

console.log('\n→ Trend (cached, from an unanswered mode) :', JSON.stringify(await switchTo('Trend')))
console.log('restored identically         :', JSON.stringify(await shape()) === JSON.stringify(trend0))
console.log('TREND lens  :', JSON.stringify(await lens()))
await page.screenshot({ path: `${OUT}/5-trend-third.png` })

await browser.close()
