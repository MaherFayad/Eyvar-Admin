/** Live Dispatch in Arabic — the chrome mirrors, the geography does not. */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const OUT = './scratch/shots-board'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto('http://localhost:4325/operations/dispatch', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
// The account menu carries the language radio group (AccountMenu.tsx:277).
await page.locator('header button').last().click()
await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT}/dispatch.ar.png` })
console.log('dir=', await page.evaluate(() => document.documentElement.dir), 'errors', errors.length, errors[0] ?? '')
await browser.close()
