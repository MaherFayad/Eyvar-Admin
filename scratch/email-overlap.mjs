import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1100 } })
await p.goto('http://localhost:5199/entity/DRV-0201?view=identity', { waitUntil: 'networkidle' })
await p.waitForTimeout(2000)
const r = await p.evaluate(() => {
  const dds = [...document.querySelectorAll('dd')]
  return dds.map((dd) => {
    const cell = dd.parentElement
    const cr = cell.getBoundingClientRect()
    const dr = dd.getBoundingClientRect()
    const s = getComputedStyle(dd)
    return {
      label: cell.querySelector('dt')?.textContent.trim().slice(0, 12),
      text: dd.textContent.trim().slice(0, 34),
      cellW: Math.round(cr.width),
      ddW: Math.round(dr.width),
      scrollW: dd.scrollWidth,
      overflowBy: Math.round(dr.right - cr.right),
      overflowWrap: s.overflowWrap, wordBreak: s.wordBreak, minWidth: s.minWidth,
    }
  }).filter(x => x.label)
})
console.table(r)
await b.close()
