/** Where every page's h1 actually sits, and how big it actually is. */
import { chromium } from 'playwright'
const BASE = 'http://localhost:4325'
const ROUTES = [
  '/management/overview', '/management/performance', '/management/risk',
  '/management/growth', '/management/zones', '/management/reports',
  '/operations/overview', '/support/fairness', '/finance/overview',
  '/admin/users',
]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) if (el.scrollTop) el.scrollTop = 0
  })
  await page.waitForTimeout(150)
  const out = await page.evaluate(() => {
    const main = document.querySelector('main') ?? document.body
    const h1 = main.querySelector('h1')
    if (!h1) return { none: true }
    const cs = getComputedStyle(h1)
    const r = h1.getBoundingClientRect()
    // the top of the scrolling content region
    const region = [...document.querySelectorAll('div,main,section')]
      .filter((el) => el.scrollHeight - el.clientHeight > 4).at(-1) ?? main
    return {
      text: h1.textContent.trim().slice(0, 22),
      size: cs.fontSize, weight: cs.fontWeight, lh: cs.lineHeight,
      fromRegion: Math.round(r.top - region.getBoundingClientRect().top),
      viewportTop: Math.round(r.top),
      x: Math.round(r.left),
    }
  })
  console.log(route.padEnd(24), JSON.stringify(out))
}
await browser.close()
