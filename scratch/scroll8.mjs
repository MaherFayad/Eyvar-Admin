import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4325/operations/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
console.log(await page.evaluate(() => {
  const v = document.querySelector('[data-radix-scroll-area-viewport]')
  const cs = getComputedStyle(v)
  const m = document.querySelector('main')
  return JSON.stringify({
    viewportScrollbarWidth: cs.scrollbarWidth,
    viewportOverflowY: cs.overflowY,
    viewportBarPx: v.offsetWidth - v.clientWidth,
    mainBarPx: m.offsetWidth - m.clientWidth,
    docBarPx: document.documentElement.offsetWidth - document.documentElement.clientWidth,
  })
}))
await browser.close()
