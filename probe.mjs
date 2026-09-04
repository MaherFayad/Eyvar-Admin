import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
await page.goto('http://localhost:4342/management/zones', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const facts = await page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { top: Math.round(b.top), h: Math.round(b.height), cls: el.className.slice(0, 90) }
  }
  const section = document.querySelector('section[aria-labelledby="zones-map-heading"]')
  // walk up from the section to the scroll region
  const chain = []
  let n = section
  while (n && n !== document.documentElement) {
    const b = n.getBoundingClientRect()
    const s = getComputedStyle(n)
    chain.push({
      tag: n.tagName.toLowerCase(),
      cls: String(n.className).slice(0, 80),
      top: Math.round(b.top),
      h: Math.round(b.height),
      overflowY: s.overflowY,
      display: s.display,
    })
    n = n.parentElement
  }
  return {
    header: box('header'),
    band: box('[class*="hero"], h1')?.top,
    h1: box('h1'),
    strip: box('ul[data-numeric]'),
    section: box('section[aria-labelledby="zones-map-heading"]'),
    chain,
  }
})
console.log(JSON.stringify(facts, null, 2))
await browser.close()
