/** The feed panel, dark, with a row selected — the surface the owner marked up. */
import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: 'dark',
  deviceScaleFactor: 2,
})
const page = await ctx.newPage()
await page.goto('http://localhost:4325/operations/dispatch', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.getByRole('button', { name: /^SREQ-001/ }).click()
await page.waitForTimeout(400)
const panel = page.locator('div.rounded-xl.border.bg-card.shadow-2').first()
await panel.screenshot({ path: './scratch/shots-board/dispatch.panel-dark.png' })
console.log('done')
await browser.close()
