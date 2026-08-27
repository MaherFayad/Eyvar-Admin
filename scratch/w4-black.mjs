import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
await p.goto('http://localhost:5199/management/overview', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
console.log(await p.evaluate(() => {
  const svg = document.querySelector('[data-slot="chart"] svg')
  const hits = []
  svg.querySelectorAll('*').forEach((n) => {
    if (getComputedStyle(n).fill === 'rgb(0, 0, 0)') {
      hits.push({ tag: n.tagName, cls: n.getAttribute('class'), parent: n.parentElement?.tagName, rendered: n.getBoundingClientRect().width })
    }
  })
  return JSON.stringify(hits.slice(0, 8), null, 1)
}))
await b.close()
