/**
 * **The type ladder on DSH-1, tile by tile — and on the builder for RPT-4.**
 *
 * DSH-1 position 2 is a LINE report split by district (`PanelCard` small
 * multiples); position 3 is `New subscriptions by plan`, the one query that
 * makes a pie legal (`DistributionCard`). They sit side by side, so whatever
 * they disagree about is on screen at the same instant.
 *
 * Reports, per tile: the tile's own heading, every panel heading inside it, the
 * headline numeral if there is one, and the grey prose — each with the computed
 * px it actually renders at, which is the only number worth arguing about.
 *
 *     node scratch/dist-ladder.mjs            # English, 1280/1440/1920
 *     LANG=ar node scratch/dist-ladder.mjs    # Arabic
 *     PATHNAME=/management/reports/RPT-4 node scratch/dist-ladder.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:4399'
const WIDTHS = (process.env.WIDTHS ?? '1280,1440,1920').split(',').map(Number)
const PATHNAME = process.env.PATHNAME ?? '/management/reports/dashboards/DSH-1'
const LANG = process.env.LANG_ ?? process.env.LANG ?? 'en'

const probe = () => {
  const px = (el) => Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)
  const roots = [...document.querySelectorAll('li')].filter(
    (li) => li.querySelector('[data-slot="card"], [data-slot="panel-frame"]'),
  )
  const tiles = roots.filter((li) => !roots.some((other) => other !== li && other.contains(li)))
  return tiles.map((li) => {
    const titles = [...li.querySelectorAll('[data-slot="card-title"]')]
    const numerals = [...li.querySelectorAll('[data-slot="metric-value"]')]
    const prose = [
      ...li.querySelectorAll('[data-slot="panel-population"], [data-slot="card-description"]'),
    ]
    return {
      width: Math.round(li.getBoundingClientRect().width),
      tileTitle: titles[0] ? { t: text(titles[0]), px: px(titles[0]) } : null,
      panelTitles: titles.slice(1).map((el) => ({ t: text(el), px: px(el) })),
      numerals: numerals.map((el) => ({ t: text(el), px: px(el) })),
      prose: prose.map((el) => ({ t: text(el), px: px(el), slot: el.dataset.slot })),
      pie: li.querySelector('.recharts-pie') !== null,
      lines: li.querySelectorAll('.recharts-line, .recharts-area').length,
    }
  })
}

const browser = await chromium.launch()
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 1400 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('  PAGEERROR', String(e).slice(0, 160)))
  await page.goto(`${BASE}${PATHNAME}`, { waitUntil: 'networkidle' })
  if (LANG === 'ar') {
    await page.evaluate(() => localStorage.setItem('eyvar.language', '"ar"'))
    await page.reload({ waitUntil: 'networkidle' })
  }
  await page.waitForTimeout(2500)
  console.log(`\n═══ ${width} · ${LANG} · ${PATHNAME} ═══`)
  for (const tile of await page.evaluate(probe)) {
    const shape = tile.pie ? 'PIE ' : tile.lines ? 'LINE' : '    '
    console.log(
      `${shape} w=${String(tile.width).padStart(4)}  title=${tile.tileTitle?.px ?? '-'}px "${tile.tileTitle?.t ?? ''}"`,
    )
    for (const p of tile.panelTitles) console.log(`        panelTitle ${p.px}px  "${p.t}"`)
    for (const n of tile.numerals) console.log(`        numeral    ${n.px}px  "${n.t}"`)
    for (const p of tile.prose) console.log(`        prose      ${p.px}px  [${p.slot}] "${p.t}"`)
  }
  await ctx.close()
}
await browser.close()
