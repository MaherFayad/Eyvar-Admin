import { chromium } from 'playwright'
const browser = await chromium.launch()
for (const [tag, scheme] of [['light','light'],['dark','dark']]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: scheme })
  await page.goto('http://localhost:4325/operations/overview', { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  const main = await page.$('main')
  await main.evaluate((el) => { el.scrollTop = el.scrollHeight })
  await page.waitForTimeout(600)
  await page.screenshot({ path: `./scratch/shots-board/_detail-${tag}.png` })
  await page.close()
}
console.log('ok')
await browser.close()
