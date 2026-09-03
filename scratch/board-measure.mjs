import { chromium } from 'playwright'

const BASE = 'http://localhost:4325'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
await page.goto(BASE + '/management/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)

const out = await page.evaluate(() => {
  const g = (el) => {
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return {
      text: (el.textContent || '').slice(0, 34),
      size: s.fontSize,
      weight: s.fontWeight,
      color: s.color,
      bg: s.backgroundColor,
      family: s.fontFamily.split(',')[0],
      tracking: s.letterSpacing,
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
    }
  }
  const band = document.querySelector('section')
  const h1 = document.querySelector('h1')
  const values = [...document.querySelectorAll('[data-slot="metric-value"]')].slice(0, 6)
  const eyebrows = [...document.querySelectorAll('section ul li span')].slice(0, 3)
  const h2 = [...document.querySelectorAll('h2')].slice(0, 3)
  return {
    band: g(band),
    h1: g(h1),
    values: values.map(g),
    eyebrows: eyebrows.map(g),
    h2: h2.map(g),
  }
})
console.log(JSON.stringify(out, null, 1))
await browser.close()
