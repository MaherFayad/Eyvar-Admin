/**
 * **T8.2 — every Management and Operations route, measured.** The 17 sub-tabs
 * of `routeTable.ts` plus the six `?view=` variants and the three level-3
 * details, at 1280 x 800 (D2's minimum) and 1440 x 900, in both languages.
 * The list lives in `ops-routes.routes.mjs`, which `chrome.mjs` shares.
 *
 *   npx vite build && npx vite preview --port 4362
 *   HARNESS_BASE=http://localhost:4362 node scripts/harness/ops-routes.mjs [label]
 *
 * Per route it prints `h1`, banner count, `role=alert` count, the document's
 * and `<main>`'s horizontal overflow, the document's `scrollHeight` and how far
 * the WINDOW actually scrolls (D-19: `<main>` scrolls, the window does not),
 * the number of table cells whose content is clipped, and — for the two maps
 * and every `DetailPage` — whether the panel or rail is inside the first
 * viewport (X1).
 *
 * Exits non-zero on any horizontal overflow, or a map panel or detail rail
 * below the fold at 1280. A window that scrolls is a warning, not a failure:
 * the plan's exit rule names overflow and the panels only.
 *
 * **Caveat, from `corporate.mjs`:** `scrollWidth` reads equal to `clientWidth`
 * inside an `@container` cell, so a value clipped there is invisible to the
 * truncation count and has to be read off the capture.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { ROUTES } from './ops-routes.routes.mjs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const LABEL = process.argv[2] ?? 'now'
const SHOTS = './scripts/harness/shots'
const TMP = './.tmp'
mkdirSync(SHOTS, { recursive: true })
mkdirSync(TMP, { recursive: true })

/* Runs in the page. Structural selectors only: a restyle moves class names,
   and neither map nor the detail shell carries a `data-` marker of its own. */
function probe(wantPanels) {
  const box = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      width: Math.round(r.width),
      height: Math.round(r.height),
      inFirstViewport: r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight,
    }
  }

  /* A grid child STRETCHES to its row, so the rail's own box is as tall as the
     main column beside it and its `bottom` says nothing about the rail. X1
     asks whether the rail's CARDS are beside main and above the fold, so the
     box is taken from the first and last card instead. */
  const contentBox = (el) => {
    const kids = el ? [...el.children].filter((c) => c.getBoundingClientRect().height > 0) : []
    if (!el || kids.length === 0) return box(el)
    const top = Math.min(...kids.map((c) => c.getBoundingClientRect().top))
    const bottom = Math.max(...kids.map((c) => c.getBoundingClientRect().bottom))
    return {
      top: Math.round(top),
      bottom: Math.round(bottom),
      width: Math.round(el.getBoundingClientRect().width),
      height: Math.round(bottom - top),
      inFirstViewport: top >= 0 && bottom <= window.innerHeight,
    }
  }

  const finders = {
    /* `ZonesMapView`'s inspector: the one `aside` on the map surface. */
    zonesInspector: () => document.querySelector('main aside'),
    /* `FeedPanel` is the div wrapping `Tabs` wrapping `TabsList`. */
    dispatchFeed: () => document.querySelector('[role="tablist"]')?.parentElement?.parentElement,
    /* `MapRail`'s layer card, found through the switch it owns. */
    dispatchRail: () =>
      document.getElementById('dispatch-layer-trips')?.closest('[data-slot="card"]'),
    /* `DetailPage`'s grid is the only `wide:grid-cols-detail`; child 2 is the
       rail (`PageShell.tsx:349`). */
    detailRail: () => document.querySelector('[class*="grid-cols-detail"]')?.children[1],
  }

  const main = document.querySelector('main')
  const doc = document.documentElement
  const rows = [...document.querySelectorAll('tbody tr')]

  /* A cell clips when something inside it wants more inline space than it has.
     `scrollWidth` is the width it wanted, so the shortfall is measured. */
  const clips = (cell) => {
    for (const el of [cell, ...cell.querySelectorAll('*')]) {
      if (el.scrollWidth - el.clientWidth > 1) return true
    }
    return false
  }
  let truncatedCells = 0
  let truncatedIdentity = 0
  for (const r of rows) {
    const cells = [...r.querySelectorAll('td')]
    for (const c of cells) if (clips(c)) truncatedCells += 1
    if (cells[0] && clips(cells[0])) truncatedIdentity += 1
  }

  const panels = {}
  for (const name of wantPanels) {
    const el = finders[name]?.() ?? null
    panels[name] = name === 'detailRail' ? contentBox(el) : box(el)
    if (panels[name] !== null && name === 'detailRail') {
      /* X1's actual claim is that the rail RESTACKS below the breakpoint. One
         track in the computed grid is that, and it is a different defect from
         a rail that is merely tall. */
      const grid = document.querySelector('[class*="grid-cols-detail"]')
      panels[name].stacked =
        grid !== null && getComputedStyle(grid).gridTemplateColumns.split(' ').length < 2
    }
  }

  /* `overflow: hidden` on `html` hides the scrollbar but does NOT stop a
     programmatic or focus-driven scroll, so "does the window scroll" is asked
     by scrolling it, not by comparing two heights. */
  const beforeY = window.scrollY
  window.scrollTo(0, 5000)
  const windowScrollBy = Math.round(window.scrollY)
  window.scrollTo(0, beforeY)

  return {
    windowScrollBy,
    dir: doc.dir,
    url: location.pathname + location.search,
    h1: (document.querySelector('h1')?.innerText ?? '(none)').replace(/\s+/g, ' ').trim(),
    banners: document.querySelectorAll('[data-slot="alert"]').length,
    alerts: document.querySelectorAll('[role="alert"]').length,
    docOverflowX: doc.scrollWidth - doc.clientWidth,
    mainOverflowX: main ? main.scrollWidth - main.clientWidth : null,
    docScrollHeight: doc.scrollHeight,
    viewportHeight: window.innerHeight,
    /* D-19: the block sizes to the region and `<main>` scrolls it. A window
       that moves takes the top bar and the nav column with it. */
    windowScrolls: windowScrollBy > 0,
    mainScrollHeight: main ? main.scrollHeight : null,
    tableRows: rows.length,
    truncatedCells,
    truncatedIdentity,
    panels,
  }
}

const browser = await chromium.launch()
const results = []
const failures = []
const warnings = []
const shots = []
const pageErrors = []

for (const lang of ['en', 'ar']) {
  for (const vp of [
    { w: 1280, h: 800 },
    { w: 1440, h: 900 },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => pageErrors.push(`${lang} ${vp.w}: ${String(e).slice(0, 200)}`))

    await page.goto(`${BASE}/operations/overview`, { waitUntil: 'networkidle' })
    if (lang === 'ar') {
      await page.getByRole('button', { name: 'Account', exact: true }).click()
      await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
      await page.waitForTimeout(1500)
    }

    for (const route of ROUTES) {
      await page.goto(BASE + route.path, { waitUntil: 'networkidle' })
      await page.waitForSelector('h1', { timeout: 20000 }).catch(() => {})
      await page.waitForTimeout(700)

      const facts = await page.evaluate(probe, route.panels ?? [])
      results.push({ route: route.id, shape: route.shape, lang, vp: `${vp.w}x${vp.h}`, ...facts })

      const offFold = Object.entries(facts.panels).filter(
        ([, b]) => b !== null && !b.inFirstViewport,
      )
      const bad =
        facts.docOverflowX !== 0 ||
        (facts.mainOverflowX ?? 0) !== 0 ||
        facts.windowScrolls ||
        facts.truncatedCells > 0 ||
        offFold.length > 0

      if (facts.docOverflowX !== 0 || (facts.mainOverflowX ?? 0) !== 0) {
        failures.push(
          `${route.id} ${lang} ${vp.w}: overflowX doc=${facts.docOverflowX} main=${facts.mainOverflowX}`,
        )
      }
      if (vp.w === 1280 && offFold.length > 0) {
        for (const [name, b] of offFold) {
          failures.push(
            `${route.id} ${lang} 1280: ${name} top=${b.top} bottom=${b.bottom} > ${vp.h}` +
              (b.stacked ? ' (RESTACKED, one grid track)' : ''),
          )
        }
      }
      if (facts.windowScrolls) {
        warnings.push(
          `${route.id} ${lang} ${vp.w}: the WINDOW scrolls ${facts.windowScrollBy}px ` +
            `(docScrollHeight ${facts.docScrollHeight} vs viewport ${facts.viewportHeight})`,
        )
      }

      if (bad) {
        const path = `${SHOTS}/route-${route.id}-${lang}-${vp.w}-${LABEL}.png`
        await page.screenshot({ path, fullPage: false })
        shots.push(path)
      }
    }
    await ctx.close()
  }
}
await browser.close()

const pad = (s, n) => String(s).padEnd(n).slice(0, n)
const cols = [
  ['route', 24],
  ['lang', 4],
  ['vp', 9],
  ['h1', 26],
  ['ban', 3],
  ['alrt', 4],
  ['docX', 4],
  ['mainX', 5],
  ['docH', 5],
  ['winPx', 5],
  ['rows', 4],
  ['clip', 4],
  ['ident', 5],
  ['panels', 46],
]
console.log(cols.map(([n, w]) => pad(n, w)).join(' '))
console.log(cols.map(([, w]) => '-'.repeat(w)).join(' '))
for (const r of results) {
  const panels =
    Object.entries(r.panels)
      .map(([n, b]) =>
        b === null
          ? `${n}:absent`
          : `${n}:${b.inFirstViewport ? 'in' : 'OUT@' + b.bottom}${b.stacked ? '/stacked' : ''}`,
      )
      .join(' ') || '-'
  console.log(
    [
      pad(r.route, 24),
      pad(r.lang, 4),
      pad(r.vp, 9),
      pad(r.h1, 26),
      pad(r.banners, 3),
      pad(r.alerts, 4),
      pad(r.docOverflowX, 4),
      pad(r.mainOverflowX, 5),
      pad(r.docScrollHeight, 5),
      pad(r.windowScrollBy, 5),
      pad(r.tableRows, 4),
      pad(r.truncatedCells, 4),
      pad(r.truncatedIdentity, 5),
      pad(panels, 46),
    ].join(' '),
  )
}

const out = `${TMP}/ops-routes-${LABEL}.json`
writeFileSync(
  out,
  JSON.stringify({ base: BASE, label: LABEL, results, failures, warnings, shots }, null, 2),
)
console.log(`\nJSON: ${out}`)
if (shots.length) console.log(`shots:\n${shots.join('\n')}`)
if (pageErrors.length) console.log(`\npage errors:\n${pageErrors.join('\n')}`)
if (warnings.length) console.log(`\nWARN (${warnings.length}):\n${warnings.join('\n')}`)
if (failures.length) {
  console.log(`\nFAIL (${failures.length}):\n${failures.join('\n')}`)
  process.exitCode = 1
} else {
  console.log('\nPASS: no overflow, every panel and rail inside the first viewport at 1280.')
}
