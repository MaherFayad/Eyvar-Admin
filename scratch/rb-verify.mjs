/** Full §P4 / §3.5 verification on line AND bar, plus the tooltip. */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const BASE = 'http://localhost:4325'
const OUT = './scratch/shots-partial'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

async function open() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e)))
  await page.goto(`${BASE}/management/reports/RPT-1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3500)
  page.__errs = errs
  return page
}

const actionable = () => {
  const card = [...document.querySelectorAll('[data-slot="card"]')]
    .find((c) => c.querySelector('a[data-slot="panel-action"]'))
  const shape = card.querySelector('.recharts-area-area') ?? card.querySelector('.recharts-rectangle')
  const r = shape.getBoundingClientRect()
  return { x: Math.round(r.x + r.width * 0.45), y: Math.round(r.y + r.height * 0.6) }
}

let page = await open()

/* toolbar names, so the bar branch is reachable */
console.log('chart-type controls:', await page.evaluate(() =>
  [...document.querySelectorAll('button')].map((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim()).filter((s) => /line|bar|pie|table/i.test(s))))

/* tooltip still works */
const pt = await page.evaluate(actionable)
await page.mouse.move(pt.x, pt.y)
await page.waitForTimeout(500)
console.log('tooltip on hover:', await page.locator('[data-slot="panel-tooltip"]').count(),
  JSON.stringify((await page.locator('[data-slot="panel-tooltip"]').first().innerText().catch(() => '')).split('\n')))
await page.locator('[data-slot="card"]').filter({ has: page.locator('a[data-slot="panel-action"]') }).first()
  .screenshot({ path: `${OUT}/verify.line.card.png` })

/* LINE: mouse click on the drawn series */
let before = page.url()
await page.mouse.click(pt.x, pt.y)
await page.waitForTimeout(1200)
console.log('LINE mouse click:', before, '->', page.url())
console.log('errors:', page.__errs.slice(0, 3))
await page.close()

/* BAR */
page = await open()
const bar = page.getByRole('button', { name: /^bar$/i }).first()
if (await bar.count()) {
  await bar.click()
  await page.waitForTimeout(3000)
  console.log('BAR partial marks:', await page.locator('.recharts-partial-bucket').count())
  await page.locator('[data-slot="card"]').filter({ has: page.locator('a[data-slot="panel-action"]') }).first()
    .screenshot({ path: `${OUT}/verify.bar.card.png` })
  const bp = await page.evaluate(() => {
    const card = [...document.querySelectorAll('[data-slot="card"]')].find((c) => c.querySelector('a[data-slot="panel-action"]'))
    const rects = [...card.querySelectorAll('.recharts-rectangle')]
    const r = rects[Math.floor(rects.length / 2)].getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height * 0.6) }
  })
  await page.mouse.move(bp.x, bp.y)
  await page.waitForTimeout(400)
  console.log('BAR tooltip:', await page.locator('[data-slot="panel-tooltip"]').count())
  before = page.url()
  await page.mouse.click(bp.x, bp.y)
  await page.waitForTimeout(1200)
  console.log('BAR mouse click:', before, '->', page.url())
} else {
  console.log('no bar control')
}
console.log('errors:', page.__errs.slice(0, 3))
await browser.close()
