import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', e => console.log('PAGE ERR:', String(e).slice(0,300)))
page.on('requestfailed', r => console.log('REQ FAIL:', r.url().slice(0,120)))
await page.goto('http://localhost:5211/financials/payouts', { waitUntil: 'commit', timeout: 60000 })
for (const s of [1,2,3,5,8,12,20]) {
  await page.waitForTimeout(s*1000 - (s>1 ? 0 : 0))
  const busy = await page.locator('[aria-busy="true"]').count()
  const rows = await page.locator('table tbody tr').count()
  console.log(`t~${s}s  aria-busy=${busy}  rows=${rows}`)
  if (busy === 0 && rows > 0) break
}
console.log('--- any error state? ---')
console.log((await page.evaluate(() => document.body.innerText)).slice(0,400))
await browser.close()
