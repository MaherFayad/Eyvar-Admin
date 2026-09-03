import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4325/operations/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
console.log(await page.evaluate(() => {
  const out = []
  const walk = (el, depth) => {
    if (depth > 5) return
    for (const kid of el.children) {
      const r = kid.getBoundingClientRect()
      const cs = getComputedStyle(kid)
      out.push('  '.repeat(depth) + [kid.tagName.toLowerCase(),
        (kid.className || '').toString().slice(0, 48),
        'top=' + Math.round(r.top), 'h=' + Math.round(r.height),
        'sh=' + kid.scrollHeight, 'oy=' + cs.overflowY].join(' | '))
      if (r.height > 900 || kid.scrollHeight > 900) walk(kid, depth + 1)
    }
  }
  walk(document.body, 0)
  return out.slice(0, 30).join('\n')
}))
await browser.close()
