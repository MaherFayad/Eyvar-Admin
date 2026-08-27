/** visual-qa independent capture + measurement pass for the eight metric boards. */
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const BASE = 'http://localhost:5433'
const OUT = './scratch/shots'
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

const problems = []
const report = {}
const browser = await chromium.launch()

async function toArabic(page) {
  await page.getByRole('button', { name: /account|profile|menu/i }).first().click({ timeout: 5000 })
  await page.getByRole('menuitemradio', { name: /عرب|Arabic|AR/i }).first().click({ timeout: 5000 })
  await page.waitForTimeout(600)
}

const PROBE = () => {
  const main = document.querySelector('main') ?? document.body
  const px = (n) => Math.round(n * 100) / 100
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: px(r.x), y: px(r.y), w: px(r.width), h: px(r.height) } }
  // text ink box, not element box
  const inkRect = (el) => {
    const r = document.createRange(); r.selectNodeContents(el)
    const b = r.getBoundingClientRect()
    return { x: px(b.x), right: px(b.right), w: px(b.width) }
  }
  const lists = [...main.querySelectorAll('ul[aria-labelledby]')].map((ul) => {
    const rows = [...ul.querySelectorAll(':scope > li')]
    const bar = ul.querySelector('.bg-chart-fill')
    return {
      heading: document.getElementById(ul.getAttribute('aria-labelledby'))?.textContent ?? null,
      rowCount: rows.length,
      rowHeights: rows.map((r) => px(r.getBoundingClientRect().height)),
      innerHeights: rows.map((r) => px((r.firstElementChild ?? r).getBoundingClientRect().height)),
      hasBar: !!bar,
      barFill: bar ? getComputedStyle(bar).backgroundColor : null,
      barTrackBg: bar?.parentElement ? getComputedStyle(bar.parentElement).backgroundColor : null,
      barH: bar ? px(bar.getBoundingClientRect().height) : null,
      cardBg: bar ? getComputedStyle(bar.closest('[data-slot="card"]')).backgroundColor : null,
      rowSpans: rows.slice(0, 4).map((r) =>
        [...r.querySelectorAll('span,bdi')]
          .filter((n) => n.children.length === 0 && (n.textContent ?? '').trim())
          .map((n) => ({ t: n.textContent, ...inkRect(n), align: getComputedStyle(n).textAlign, dir: getComputedStyle(n).direction })),
      ),
      linkedRows: rows.filter((r) => r.querySelector('a')).length,
    }
  })
  const emptyList = [...main.querySelectorAll('[data-slot="card"]')]
    .filter((c) => /Nothing to rank/i.test(c.textContent ?? ''))
    .map((c) => ({ text: c.textContent, h: px(c.getBoundingClientRect().height) }))
  const tiles = [...main.querySelectorAll('[data-slot="card"]')]
    .filter((c) => !c.querySelector('ul[aria-labelledby]') && !c.querySelector('svg.recharts-surface') && c.querySelector('.text-lg'))
    .map((c) => {
      const val = c.querySelector('.text-lg')
      const spans = [...c.querySelectorAll('span')].filter((n) => n.children.length === 0 && (n.textContent ?? '').trim())
      return {
        value: val?.textContent ?? null,
        valueInk: val ? inkRect(val) : null,
        box: rect(c),
        lines: spans.map((n) => ({ t: n.textContent.slice(0, 60), ...inkRect(n), h: px(n.getBoundingClientRect().height) })),
      }
    })
  return {
    dir: document.documentElement.dir,
    lang: document.documentElement.lang,
    h1: main.querySelector('h1')?.textContent ?? null,
    banners: [...main.querySelectorAll('[data-slot="alert"]')].map((b) => ({
      text: (b.textContent ?? '').slice(0, 160),
      bg: getComputedStyle(b).backgroundColor,
      color: getComputedStyle(b).color,
      border: getComputedStyle(b).borderColor,
      radius: getComputedStyle(b).borderRadius,
    })),
    illustration: !!main.querySelector('svg[data-slot="empty-illustration"], [data-empty-kind="first-run"]'),
    emptyStateText: main.querySelector('[data-slot="empty-state"]')?.textContent ?? null,
    charts: main.querySelectorAll('.recharts-surface').length,
    chartNoData: [...main.querySelectorAll('[data-slot="card"]')].filter((c) => /No data|no data/.test(c.textContent ?? '')).length,
    tileCount: tiles.length,
    tiles,
    emDashTiles: tiles.filter((t) => (t.value ?? '').includes('—')).length,
    lists,
    emptyList,
    mainW: px(main.getBoundingClientRect().width),
  }
}

for (const width of [1280, 1440]) {
  for (const lang of ['en', 'ar']) {
    const ctx = await browser.newContext({ viewport: { width, height: 1200 }, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => problems.push(`${lang} ${width} PAGEERROR ${String(e).slice(0, 300)}`))
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`${lang} ${width} CONSOLE ${m.text().slice(0, 300)}`) })
    for (const [name, path] of BOARDS) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      if (lang === 'ar') {
        try { await toArabic(page) } catch (e) { problems.push(`${lang} ${width} ${name} AR SWITCH FAILED ${String(e).slice(0,120)}`) }
      }
      await page.waitForTimeout(500)
      const key = `${name}-${lang}-${width}`
      report[key] = await page.evaluate(PROBE)
      await page.screenshot({ path: `${OUT}/vqa-${key}.png`, fullPage: true })
    }
    await ctx.close()
  }
}

writeFileSync('./scratch/shots/vqa-report.json', JSON.stringify(report, null, 1))
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'no console or page errors')
await browser.close()
