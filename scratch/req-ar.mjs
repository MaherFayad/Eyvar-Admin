/** The ride-request sheet in Arabic — the chrome mirrors, the map does not. */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const OUT = './scratch/shots-req'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto('http://localhost:4325/operations/ride-requests', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.locator('header button').last().click()
await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
await page.waitForTimeout(1200)
await page.goto('http://localhost:4325/operations/ride-requests?entity=REQ-503', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const probe = await page.evaluate(() => {
  const panel = document.querySelector('[role="dialog"]')
  const canvas = document.querySelector('[role="dialog"] [dir="ltr"]')
  return {
    dir: document.documentElement.dir,
    canvasDir: canvas?.getAttribute('dir') ?? null,
    title: panel?.querySelector('h2')?.textContent,
    text: [...(panel?.querySelectorAll('[data-numeric]') ?? [])]
      .slice(0, 4)
      .map((e) => e.textContent?.replace(/\s+/g, ' ').trim()),
    straight: [...(panel?.querySelectorAll('bdi') ?? [])]
      .map((e) => e.textContent?.trim())
      .filter((s) => s && /كم|مستقيم/.test(s))[0] ?? null,
  }
})
console.log(JSON.stringify(probe, null, 1))
console.log('errors', errors.length, errors.slice(0, 3))
await page.screenshot({ path: `${OUT}/ar.png` })
await browser.close()
