import { chromium } from 'playwright'
const BASE = 'http://127.0.0.1:4331'
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
await page.goto(BASE + '/admin/team?view=roles', { waitUntil: 'load', timeout: 120_000 })
await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 60_000 })
await page.waitForTimeout(2000)
await page.keyboard.press('Escape')
await page.screenshot({ path: './scripts/harness/shots/team-roles-holders.png', fullPage: true })
const box = await page.locator('#admin-holders-key').boundingBox()
const card = await page.locator('#admin-holders-key').locator('xpath=ancestor::*[contains(@class,"rounded")][1]').boundingBox()
console.log('trigger', JSON.stringify(box), 'card', JSON.stringify(card), 'errors', JSON.stringify(errors))
await browser.close()
