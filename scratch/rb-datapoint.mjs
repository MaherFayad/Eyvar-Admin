/**
 * Report-canvas evidence run (scratch only; not imported by src).
 *
 *  1. §3.5 partial-bucket mark on a LINE chart — does anything paint?
 *  2. the same on BAR, for contrast.
 *  3. the keyboard focus ring on `.recharts-surface`.
 *  4. §P4 — click a datapoint on the series and report where it went.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:4325'
const OUT = './scratch/shots-partial'
const TAG = process.env.TAG ?? 'run'
mkdirSync(OUT, { recursive: true })

const probe = () => ({
  url: location.pathname,
  surfaces: document.querySelectorAll('.recharts-surface').length,
  surfaceTabIndex: [...document.querySelectorAll('.recharts-surface')].map((s) =>
    s.getAttribute('tabindex'),
  ),
  partialGroups: document.querySelectorAll('.recharts-partial-bucket').length,
  partialPainted: [...document.querySelectorAll('.recharts-partial-bucket')].map((g) => {
    const line = g.tagName === 'line' ? g : g.querySelector('line')
    const r = (line ?? g).getBoundingClientRect()
    return { tag: (line ?? g).tagName, w: Math.round(r.width), h: Math.round(r.height) }
  }),
  referenceAreaShapes: [...document.querySelectorAll('.recharts-reference-area *')].length,
  areas: document.querySelectorAll('.recharts-area-area').length,
  bars: document.querySelectorAll('.recharts-bar-rectangle').length,
})

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(`${BASE}/management/reports/RPT-1`, { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)

console.log('LINE  ', JSON.stringify(await page.evaluate(probe), null, 1))
const surface = page.locator('.recharts-surface').first()
if (await surface.count()) await surface.screenshot({ path: `${OUT}/${TAG}.line.png` })

/* focus ring, by real keyboard */
await page.evaluate(() => document.body.focus())
let hops = 0
for (; hops < 160; hops += 1) {
  await page.keyboard.press('Tab')
  if (await page.evaluate(() => document.activeElement?.classList.contains('recharts-surface'))) break
}
console.log('focus ', hops < 160 ? `.recharts-surface after ${hops + 1} Tabs` : 'never reached')
const wrap = page.locator('.recharts-wrapper').first()
if (await wrap.count()) await wrap.screenshot({ path: `${OUT}/${TAG}.focus.png` })

/* §P4 — the action row under the plot, and the datapoint click */
const action = page.locator('[data-slot="panel-action"] a, a[data-slot="panel-action"]')
console.log('action rows', await action.count())
const related = page.getByText('This measure also appears on')
console.log('related strip', await related.count())

/* click the drawn series */
const before = page.url()
const areaShape = page.locator('.recharts-area-area').first()
if (await areaShape.count()) {
  const box = await areaShape.boundingBox()
  if (box) {
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height - 4)
    await page.waitForTimeout(1200)
  }
}
console.log('after datapoint click:', before, '->', page.url())

/* bar branch */
await page.goBack({ waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(1500)
const barBtn = page.getByRole('button', { name: /^bar$/i }).first()
if (await barBtn.count()) {
  await barBtn.click()
  await page.waitForTimeout(2500)
  console.log('BAR   ', JSON.stringify(await page.evaluate(probe), null, 1))
  const s2 = page.locator('.recharts-surface').first()
  if (await s2.count()) await s2.screenshot({ path: `${OUT}/${TAG}.bar.png` })
} else {
  console.log('BAR   no bar control found')
}

console.log('page errors:', errors.length, errors.slice(0, 4))
await browser.close()
