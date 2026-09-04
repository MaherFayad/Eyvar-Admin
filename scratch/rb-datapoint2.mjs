/** §P4 + §A11 evidence: the action row, the datapoint click, the summary column. */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const BASE = process.env.BASE ?? 'http://localhost:4325'
const OUT = './scratch/shots-partial'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(`${BASE}/management/reports/RPT-1`, { waitUntil: 'networkidle' })
await page.waitForTimeout(3500)

const actions = page.locator('a[data-slot="panel-action"]')
const n = await actions.count()
console.log('panel-action anchors:', n)
for (let i = 0; i < n; i += 1) {
  console.log('  ', JSON.stringify(await actions.nth(i).innerText()), '->', await actions.nth(i).getAttribute('href'))
}
console.log('partial marks:', await page.locator('.recharts-partial-bucket').count())
console.log('summary header:', await page.getByText('Over the window').count())
console.log('summary words:', await page.getByText('total', { exact: true }).count())
console.log('window note:', await page.getByText('Complete buckets only.').count())

/* keyboard: tab to the action anchor and press Enter */
await page.evaluate(() => document.body.focus())
let hops = 0, reached = false
for (; hops < 200; hops += 1) {
  await page.keyboard.press('Tab')
  reached = await page.evaluate(() => document.activeElement?.getAttribute?.('data-slot') === 'panel-action')
  if (reached) break
}
console.log('keyboard: reached action anchor after', hops + 1, 'Tabs =', reached)
if (reached) {
  await page.screenshot({ path: `${OUT}/action.focus.png`, clip: await page.evaluate(() => {
    const r = document.activeElement.getBoundingClientRect()
    return { x: r.x - 12, y: r.y - 12, width: r.width + 24, height: r.height + 24 }
  }) })
  const before = page.url()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1500)
  console.log('keyboard Enter:', before, '->', page.url())
  await page.goBack({ waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
}

/* mouse: click the drawn series */
const area = page.locator('.recharts-area-area').first()
if (await area.count()) {
  const box = await area.boundingBox()
  const before = page.url()
  await page.mouse.click(box.x + box.width * 0.45, box.y + box.height - 6)
  await page.waitForTimeout(1500)
  console.log('mouse click on series:', before, '->', page.url())
  await page.screenshot({ path: `${OUT}/after-click.png`, fullPage: false })
} else {
  console.log('no .recharts-area-area found')
}
console.log('page errors:', errors.length, errors.slice(0, 3))
await browser.close()
