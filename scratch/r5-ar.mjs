/**
 * R5 under `dir="rtl"`.
 *
 * **What this is evidence OF, stated so it is not over-read.** The `ar`
 * dictionary is `{}`, so what renders is ENGLISH copy laid out right-to-left.
 * That is precisely the condition that exposes a stretched isolate, a physical
 * inset, or a numeral run reordering - and it is NOT evidence that Arabic copy
 * is correct. Trailing periods jumping to the visual start are an artefact of
 * the empty dictionary and are already logged elsewhere.
 *
 * The language store is in-memory, so a full page load resets it. Routes are
 * therefore reached by CLIENT-SIDE navigation after the switch, not by goto.
 */
import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:5433'

const PROBE = () => {
  const px = (n) => Math.round(n * 100) / 100
  const main = document.querySelector('main') ?? document.body
  const grids = [...main.querySelectorAll('div.grid')]
  const isList = (c) => !!c.querySelector('ul[aria-labelledby]') || /Nothing to rank|Nothing is recorded/i.test(c.textContent ?? '')
  const isChart = (c) => !!c.querySelector('svg.recharts-surface') || /no data found|Nothing is recorded/i.test(c.textContent ?? '')
  const sg = grids.find((g) => [...g.children].some((c) => isList(c) || isChart(c)))
  const gb = sg?.getBoundingClientRect()
  const c0 = sg?.children[0]?.getBoundingClientRect()
  const fill = main.querySelector('.bg-chart-series')
  const track = fill?.parentElement?.getBoundingClientRect()
  const fb = fill?.getBoundingClientRect()
  return {
    dir: document.documentElement.dir,
    cells: sg ? [...sg.children].map((c) => px(c.getBoundingClientRect().width)) : [],
    /* the grid mirrors: cell 1 sits at the INLINE-start, i.e. the right edge */
    firstCellAtInlineStart: gb && c0 ? Math.abs(c0.right - gb.right) < 2 : null,
    /* the bar grows from the inline-start, so from the RIGHT under rtl */
    barFromInlineStart: track && fb ? Math.abs(fb.right - track.right) < 2 : null,
    labels: [...main.querySelectorAll('ul[aria-labelledby] span.flex-1')].slice(0, 4).map((n) => ({
      text: n.textContent, dir: n.getAttribute('dir'), computed: getComputedStyle(n).direction,
      clipped: n.scrollWidth > n.clientWidth + 1,
    })),
    subLabels: [...main.querySelectorAll('ul[aria-labelledby] span.truncate.text-xs')].slice(0, 3).map((n) => ({
      text: n.textContent, isolate: n.firstElementChild?.tagName ?? null,
    })),
    /* a tile whose VALUE is the em dash - state D */
    absentTiles: [...main.querySelectorAll('[data-slot="card"]')]
      .filter((c) => c.querySelector('.text-lg'))
      .map((c) => [...c.querySelectorAll('span')].filter((n) => !n.children.length && n.textContent.trim()).map((n) => n.textContent))
      .filter((t) => t[0] === '\u2014'),
    /* the value run must NOT flush opposite to its own label - the stretched-isolate defect */
    tileValueVsLabel: [...main.querySelectorAll('[data-slot="card"] .text-lg')].slice(0, 3).map((v) => {
      const card = v.closest('[data-slot="card"]').getBoundingClientRect()
      const r = document.createRange(); r.selectNodeContents(v)
      const b = r.getBoundingClientRect()
      return { text: v.textContent, fromCardInlineStart: px(card.right - b.right) }
    }),
  }
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } })
await page.goto(`${BASE}/management/overview`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Account' }).click({ timeout: 8000 })
await page.waitForTimeout(300)
await page.getByRole('menuitemradio', { name: 'Arabic' }).click({ timeout: 8000 })
await page.waitForFunction(() => document.documentElement.dir === 'rtl', null, { timeout: 5000 })
await page.keyboard.press('Escape')
await page.waitForTimeout(700)
console.log('dir after switch:', await page.evaluate(() => document.documentElement.dir))

const ROUTES = [
  ['Risk & Signals', '/management/risk'],
  ['Market & Zones', '/management/zones'],
  ['Overview', '/operations/overview'],
  ['Overview', '/support/overview'],
  ['Overview', '/admin/overview'],
]
for (const [, route] of ROUTES) {
  /* client-side navigation, so the in-memory language survives */
  await page.evaluate((r) => window.history.pushState({}, '', r), route)
  await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')))
  await page.waitForTimeout(700)
  const r = await page.evaluate(PROBE)
  console.log(`\n--- ${route}  dir=${r.dir} cells=[${r.cells.join(',')}] firstCellAtInlineStart=${r.firstCellAtInlineStart} barFromInlineStart=${r.barFromInlineStart}`)
  for (const l of r.labels) console.log('   label   ', JSON.stringify(l))
  for (const l of r.subLabels) console.log('   sublabel', JSON.stringify(l))
  for (const t of r.absentTiles) console.log('   absent  ', JSON.stringify(t))
  for (const v of r.tileValueVsLabel) console.log('   value   ', JSON.stringify(v))
  await page.screenshot({ path: `./scratch/shots/r5-ar-${route.replace(/\//g, '-')}-1280.png`, fullPage: true })
}
await browser.close()
