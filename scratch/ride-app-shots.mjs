import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const OUT = './scratch/shots-ride'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE ?? 'http://localhost:5310'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 240))
})

const shots = [
  ['ride-sheet', '/operations/quick-rides?entity=TRP-7742'],
  ['ride-sheet-sub', '/operations/subscription-trips?entity=TRP-7741'],
  ['ride-page', '/entity/TRP-7742'],
  ['applications-queue', '/operations/people?view=applications'],
  ['application-page', '/operations/people/applications/APP-2205'],
]

for (const [name, path] of shots) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: name.includes('page') })
  console.log('shot', name)
}
await ctx.close()
await browser.close()
console.log('ok')
