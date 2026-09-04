/**
 * The pie tile in Arabic — the ladder, the crops, and a physical-direction
 * sweep over the two tiles that must read as one object.
 *
 *     node scratch/dist-rtl.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:4399'
const OUT = './scratch/shots-dist'
const WIDTHS = (process.env.WIDTHS ?? '1280,1440,1920').split(',').map(Number)
mkdirSync(OUT, { recursive: true })

async function toArabic(page) {
  const avatar = page.locator('header button').last()
  await avatar.click()
  await page.waitForTimeout(400)
  const ar = page
    .locator('[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]')
    .filter({ hasText: /عرب|Arabic|العربية/ })
  if ((await ar.count()) === 0) throw new Error('no Arabic item in the account menu')
  await ar.first().click()
  await page.waitForTimeout(2500)
}

const browser = await chromium.launch()
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 1400 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('  PAGEERROR', String(e).slice(0, 160)))
  await page.goto(`${BASE}/management/reports/dashboards/DSH-1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await toArabic(page)
  console.log(`\n═══ ${width} · ar ═══  dir=${await page.evaluate(() => document.documentElement.dir)}`)

  const out = await page.evaluate(() => {
    const px = (el) => Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10
    const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 34)
    const roots = [...document.querySelectorAll('li')].filter((li) =>
      li.querySelector('[data-slot="card"], [data-slot="panel-frame"]'),
    )
    const tiles = roots.filter((li) => !roots.some((o) => o !== li && o.contains(li)))
    return tiles.map((li) => {
      const titles = [...li.querySelectorAll('[data-slot="card-title"]')]
      const numerals = [...li.querySelectorAll('[data-slot="metric-value"]')]
      const prose = [...li.querySelectorAll('[data-slot="panel-population"]')]
      /* Every class on the tile's subtree that names a physical side. */
      const leaks = []
      for (const node of li.querySelectorAll('*')) {
        const cls = node.getAttribute('class') ?? ''
        if (/(?:^|\s)(?:ml|mr|pl|pr|border-l|border-r|rounded-l|rounded-r|text-left|text-right)-/.test(cls)) {
          leaks.push(`${node.tagName} :: ${cls}`)
        }
      }
      return {
        pie: li.querySelector('.recharts-pie') !== null,
        line: li.querySelectorAll('.recharts-line, .recharts-area').length > 0,
        width: Math.round(li.getBoundingClientRect().width),
        tileTitle: titles[0] ? px(titles[0]) : null,
        panelTitle: titles[1] ? px(titles[1]) : null,
        numeral: numerals[0] ? { t: text(numerals[0]), px: px(numerals[0]) } : null,
        /* The numeral's own box vs its `<bdi>` — a stretched bdi flushes digits
           to its own start, which is the defect `MetricTile` records. */
        numeralBdi: numerals[0]?.firstElementChild?.tagName.toLowerCase() ?? null,
        prose: prose[0] ? px(prose[0]) : null,
        proseText: prose[0] ? text(prose[0]) : null,
        leaks,
      }
    })
  })

  for (const tile of out) {
    if (!tile.pie && !tile.line) continue
    console.log(
      `${tile.pie ? 'PIE ' : 'LINE'} w=${String(tile.width).padStart(4)}  ` +
        `title=${tile.tileTitle}  panelTitle=${tile.panelTitle}  ` +
        `numeral=${tile.numeral ? `${tile.numeral.px}px "${tile.numeral.t}" bdi=${tile.numeralBdi}` : 'none'}  ` +
        `prose=${tile.prose}px`,
    )
    if (tile.proseText) console.log(`        "${tile.proseText}"`)
    console.log(`        physical-direction classes: ${tile.leaks.length ? tile.leaks.join(' | ') : 'none'}`)
  }

  if (width === 1440) {
    const tiles = page.locator('li').filter({ has: page.locator('[data-slot="card"]') })
    const n = await tiles.count()
    for (let i = 0; i < n; i += 1) {
      const li = tiles.nth(i)
      const isPie = (await li.locator('.recharts-pie').count()) > 0
      const isLine = (await li.locator('.recharts-line, .recharts-area').count()) > 0
      if (!isPie && !isLine) continue
      const box = await li.boundingBox()
      if (!box) continue
      await page.screenshot({
        path: `${OUT}/after.tile${i}.${isPie ? 'pie' : 'line'}.ar.png`,
        clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 620) },
      })
    }
  }
  await ctx.close()
}
await browser.close()
