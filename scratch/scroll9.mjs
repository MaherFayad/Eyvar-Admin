import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
for (const r of ['/management/overview', '/management/performance', '/management/risk', '/support/fairness']) {
  await page.goto('http://localhost:4325' + r, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  console.log(r, await page.evaluate(() => {
    const h = document.documentElement
    window.scrollTo(0, 900); const y = window.scrollY; window.scrollTo(0, 0)
    return `htmlScroll=${h.scrollHeight} client=${h.clientHeight} scrollY=${y} mainSH=${document.querySelector('main')?.scrollHeight}`
  }))
}
await browser.close()
