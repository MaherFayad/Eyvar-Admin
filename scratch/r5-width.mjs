/** R5-8: is a breakdown ever wider than half the CONTENT column? Measured. */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:5433'
const BOARDS = [
  ['mgmt-overview', '/management/overview'],
  ['mgmt-performance', '/management/performance'],
  ['mgmt-risk', '/management/risk'],
  ['mgmt-growth', '/management/growth'],
  ['mgmt-zones', '/management/zones'],
  ['ops-overview', '/operations/overview'],
  ['support-overview', '/support/overview'],
  ['admin-overview', '/admin/overview'],
]

const PROBE = () => {
  const px = (n) => Math.round(n * 100) / 100
  const main = document.querySelector('main') ?? document.body
  /* The section grid is the one grid whose children are chart/breakdown cards. */
  const grids = [...main.querySelectorAll('div.grid')]
  const isList = (c) => !!c.querySelector('ul[aria-labelledby]') || /Nothing to rank|Nothing is recorded/i.test(c.textContent ?? '')
  const isChart = (c) => !!c.querySelector('svg.recharts-surface') || /no data found for this date range|Nothing is recorded/i.test(c.textContent ?? '')
  const sectionGrid = grids.find((g) =>
    [...g.children].some((c) => isList(c) || isChart(c)),
  )
  const tileGrid = grids.find((g) => g !== sectionGrid && [...g.children].some((c) => c.querySelector('.text-lg')))

  const w = (el) => (el ? px(el.getBoundingClientRect().width) : null)
  const rowsOf = (g) =>
    g ? [...new Set([...g.children].map((c) => Math.round(c.getBoundingClientRect().top)))].length : 0
  const perRow = (g) => {
    if (!g) return []
    const byTop = new Map()
    for (const c of g.children) {
      const t = Math.round(c.getBoundingClientRect().top)
      byTop.set(t, (byTop.get(t) ?? 0) + 1)
    }
    return [...byTop.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n)
  }

  const contentW = w(sectionGrid ?? tileGrid)
  const cells = sectionGrid
    ? [...sectionGrid.children].map((c) => ({
        kind: isList(c) ? 'breakdown' : isChart(c) ? 'chart' : 'other',
        w: w(c),
      }))
    : []
  return {
    contentW,
    sectionCells: cells,
    sectionRows: perRow(sectionGrid),
    tileRows: perRow(tileGrid),
    tileCount: tileGrid ? tileGrid.children.length : 0,
  }
}

const browser = await chromium.launch()
for (const width of [1280, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 1200 } })
  console.log(`\n=== viewport ${width} ===`)
  for (const [name, route] of BOARDS) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    const r = await page.evaluate(PROBE)
    const half = r.contentW / 2
    const over = r.sectionCells.filter((c) => c.kind === 'breakdown' && c.w > half + 2)
    console.log(
      `${name.padEnd(18)} content=${r.contentW} half=${Math.round(half)}` +
        ` tiles=${r.tileCount} rows=[${r.tileRows.join('+')}]` +
        ` sections=[${r.sectionCells.map((c) => `${c.kind[0]}:${c.w}`).join(' ')}]` +
        ` rows=[${r.sectionRows.join('+')}]` +
        ` OVER-HALF=${over.length}`,
    )
  }
  await page.close()
}
await browser.close()
