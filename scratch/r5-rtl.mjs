/** Tile-grid row shape at both widths, plus an RTL pass over the section grid. */
import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:5433'
const BOARDS = [
  ['mgmt-overview','/management/overview'],['mgmt-performance','/management/performance'],
  ['mgmt-risk','/management/risk'],['mgmt-growth','/management/growth'],
  ['mgmt-zones','/management/zones'],['ops-overview','/operations/overview'],
  ['support-overview','/support/overview'],['admin-overview','/admin/overview'],
]
const PROBE = () => {
  const px = (n) => Math.round(n * 100) / 100
  const main = document.querySelector('main') ?? document.body
  const grids = [...main.querySelectorAll('div.grid')]
  const isList = (c) => !!c.querySelector('ul[aria-labelledby]') || /Nothing to rank/i.test(c.textContent ?? '')
  const isChart = (c) => !!c.querySelector('svg.recharts-surface') || /no data found/i.test(c.textContent ?? '')
  const sectionGrid = grids.find((g) => [...g.children].some((c) => isList(c) || isChart(c)))
  const tileGrid = [...main.querySelectorAll('ul[role="list"].grid')].find((g) => g.querySelector('.text-lg'))
  const perRow = (g) => {
    if (!g) return []
    const m = new Map()
    for (const c of g.children) { const t = Math.round(c.getBoundingClientRect().top); m.set(t, (m.get(t) ?? 0) + 1) }
    return [...m.entries()].sort((a,b)=>a[0]-b[0]).map(([,n])=>n)
  }
  const firstCell = sectionGrid?.children[0]
  const gridBox = sectionGrid?.getBoundingClientRect()
  const cellBox = firstCell?.getBoundingClientRect()
  return {
    dir: document.documentElement.dir,
    tileRows: perRow(tileGrid),
    tileCount: tileGrid ? tileGrid.children.length : 0,
    sectionRows: perRow(sectionGrid),
    /* under rtl the FIRST cell must sit at the inline-start, i.e. the right edge */
    firstCellAtInlineStart: gridBox && cellBox
      ? (document.documentElement.dir === 'rtl'
          ? Math.abs(cellBox.right - gridBox.right) < 2
          : Math.abs(cellBox.left - gridBox.left) < 2)
      : null,
    /* a row label under rtl: entity boxes must carry dir=auto */
    entityLabelDirs: [...main.querySelectorAll('ul[aria-labelledby] span.flex-1')]
      .slice(0, 6).map((n) => ({ t: n.textContent, dir: n.getAttribute('dir'), computed: getComputedStyle(n).direction, x: px(n.getBoundingClientRect().x) })),
    barGrowsFromInlineStart: (() => {
      const f = main.querySelector('.bg-chart-series')
      if (!f) return null
      const track = f.parentElement.getBoundingClientRect(); const fill = f.getBoundingClientRect()
      return document.documentElement.dir === 'rtl'
        ? Math.abs(fill.right - track.right) < 2 : Math.abs(fill.left - track.left) < 2
    })(),
  }
}
const browser = await chromium.launch()
for (const [width, lang] of [[1280,'en'],[1440,'en'],[1280,'ar']]) {
  const page = await browser.newPage({ viewport: { width, height: 1200 } })
  await page.goto(`${BASE}/management/overview`, { waitUntil: 'networkidle' })
  if (lang === 'ar') {
    await page.evaluate(() => localStorage.setItem('ui.language', JSON.stringify('ar')))
    await page.reload({ waitUntil: 'networkidle' })
  }
  console.log(`\n=== ${width} ${lang} ===`)
  for (const [name, route] of BOARDS) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(250)
    const r = await page.evaluate(PROBE)
    console.log(`${name.padEnd(18)} dir=${r.dir} tiles=${r.tileCount} tileRows=[${r.tileRows.join('+')}] sectionRows=[${r.sectionRows.join('+')}] firstCellAtStart=${r.firstCellAtInlineStart} barFromStart=${r.barGrowsFromInlineStart}`)
    if (lang === 'ar' && r.entityLabelDirs.length) console.log('   labels:', JSON.stringify(r.entityLabelDirs.slice(0,3)))
  }
  await page.close()
}
await browser.close()
