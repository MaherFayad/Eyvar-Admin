import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await p.goto('http://localhost:5199/operations/people?view=compliance', { waitUntil: 'networkidle' })
await p.waitForTimeout(2200)
await p.screenshot({ path: './scratch/shots/tc-footer-1440.png', fullPage: false })
const m = await p.evaluate(() => {
  const foot = [...document.querySelectorAll('div')].find((d) => d.textContent?.startsWith('Showing 1'))
  const r = foot?.getBoundingClientRect()
  return r ? { y: Math.round(r.y), h: Math.round(r.height), inViewport: r.bottom <= window.innerHeight } : null
})
console.log('footer', JSON.stringify(m))
await b.close()
