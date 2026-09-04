import { chromium } from 'playwright'
const BASE = 'http://localhost:4325'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
await page.goto(`${BASE}/management/reports/RPT-1`, { waitUntil: 'networkidle' })
await page.waitForTimeout(3500)

const info = await page.evaluate(() => {
  window.__log = []
  const tag = (t) => t?.getAttribute?.('class') ?? t?.tagName ?? String(t)
  for (const type of ['mousedown', 'mouseup', 'click']) {
    document.addEventListener(type, (e) => window.__log.push(`${type}:${tag(e.target)}`), true)
  }
  const card = [...document.querySelectorAll('[data-slot="card"]')]
    .find((c) => c.querySelector('a[data-slot="panel-action"]'))
  const wrapper = card.querySelector('.recharts-wrapper')
  const wk = Object.keys(wrapper).find((k) => k.startsWith('__reactProps$'))
  const r = card.querySelector('.recharts-area-area').getBoundingClientRect()
  const wr = wrapper.getBoundingClientRect()
  return {
    wrapperOnClick: typeof wrapper[wk]?.onClick,
    wrapperCursor: getComputedStyle(wrapper).cursor,
    onArea: { x: Math.round(r.x + r.width * 0.45), y: Math.round(r.y + r.height - 6) },
    headroom: { x: Math.round(wr.x + wr.width * 0.6), y: Math.round(wr.y + 14) },
  }
})
console.log(info)

for (const [name, pt] of [['on the drawn series', info.onArea], ['in the headroom above it', info.headroom]]) {
  await page.evaluate(() => { window.__log = [] })
  await page.mouse.move(pt.x, pt.y)
  await page.waitForTimeout(350)
  const before = page.url()
  await page.mouse.click(pt.x, pt.y)
  await page.waitForTimeout(1200)
  console.log(name, '->', page.url() === before ? 'NO NAV' : page.url())
  console.log('   ', await page.evaluate(() => window.__log))
  if (page.url() !== before) { await page.goBack({ waitUntil: 'networkidle' }); await page.waitForTimeout(3000) }
}
await browser.close()
