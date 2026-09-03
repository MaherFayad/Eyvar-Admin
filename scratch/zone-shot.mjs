/**
 * One board, at real viewport sizes and with no growing of the scroll region —
 * because Market & Zones now sizes its map to the space the console has left,
 * and a 2600px-tall capture surface answers a question nobody asked.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4325'
const OUT = './scratch/shots-board'
mkdirSync(OUT, { recursive: true })

const ROUTE = '/' + (process.argv[2] ?? 'management/zones').replace(/^.*?(?=management|operations|support|finance|admin)/, '')
const NAME = process.argv[3] ?? 'zone'

const browser = await chromium.launch()
for (const [w, h, tag, scheme] of [
  [1440, 900, 'v1440', 'light'],
  [1920, 1080, 'v1920', 'dark'],
  [2560, 1400, 'v2560', 'light'],
  [390, 844, 'v390', 'light'],
]) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    colorScheme: scheme,
    deviceScaleFactor: 1,
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(BASE + ROUTE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/${NAME}.${tag}.png` })
  console.log(`${tag}: errors ${errors.length}`)
  await ctx.close()
}
await browser.close()
