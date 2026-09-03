import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 2400 } })
await page.goto('http://localhost:4325/operations/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
console.log(await page.evaluate(() => {
  const main = document.querySelector('main') ?? document.body
  return [...main.querySelectorAll('h2')].map((h) => h.textContent.trim()).join('\n')
}))
await browser.close()
