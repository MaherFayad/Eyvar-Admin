import { chromium } from 'playwright'
const b = await chromium.launch()
for (const w of [1440, 1344, 1280]) {
  const p = await b.newPage({ viewport: { width: w, height: 1500 } })
  await p.goto('http://localhost:5199/entity/DRV-0201?view=earnings', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2200)
  console.log(`${w}px ->`, await p.evaluate(() => {
    const heads = [...document.querySelectorAll('h2,h3')]
    const ded = heads.find(h => /Deductions/.test(h.textContent))
    const pay = heads.find(h => /Payout account/.test(h.textContent))
    if (!ded || !pay) return '(not found)'
    const grid = ded.closest('div.grid') ?? ded.parentElement.parentElement
    const dd = [...document.querySelectorAll('dt')].find(d => /^Bank$/.test(d.textContent.trim()))
    const val = dd?.parentElement?.querySelector('dd')
    return { cols: getComputedStyle(grid).gridTemplateColumns,
             sameRow: Math.abs(ded.getBoundingClientRect().top - pay.getBoundingClientRect().top) < 4,
             labelToValueGap: dd && val ? Math.round(val.getBoundingClientRect().left - dd.getBoundingClientRect().right) : null }
  }))
  await p.close()
}
await b.close()
