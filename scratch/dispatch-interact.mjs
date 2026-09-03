/** The Trips tab, and a selected pending row revealing its action. */
import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto('http://localhost:4325/operations/dispatch', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

await page.getByRole('button', { name: /^REQ-501/ }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: './scratch/shots-board/dispatch.selected.png' })

await page.getByRole('tab', { name: /Trips/ }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: './scratch/shots-board/dispatch.trips.png' })

await page.getByRole('tab', { name: /Fleet/ }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: './scratch/shots-board/dispatch.fleet.png' })
console.log('errors', errors.length, errors[0] ?? '')
await browser.close()
