import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1600 } })

await p.goto('http://localhost:5199/entity/DRV-0201?view=activity', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
console.log('ACTIVITY TAB:', await p.evaluate(() => {
  const heads = [...document.querySelectorAll('h2,h3')].map(h => h.textContent.trim())
  const t = document.querySelector('table')
  const sup = [...document.querySelectorAll('h2,h3')].find(h => /Elsewhere/.test(h.textContent))
  const sec = sup?.closest('section')
  return { headings: heads, tripsTableW: t ? Math.round(t.closest('div.grid')?.getBoundingClientRect().width ?? 0) : null,
           tableW: t ? Math.round(t.getBoundingClientRect().width) : null,
           elsewhereW: sec ? Math.round(sec.getBoundingClientRect().width) : null,
           sameRow: t && sec ? Math.abs(t.closest('section,div').getBoundingClientRect().top - sec.getBoundingClientRect().top) < 40 : null,
           tableScrolls: t ? t.parentElement.scrollWidth > t.parentElement.clientWidth : null }
}))
await p.screenshot({ path: 'scratch/activity-final.png', clip: { x: 110, y: 330, width: 1330, height: 620 } })

await p.goto('http://localhost:5199/entity/DRV-0201?view=earnings', { waitUntil: 'networkidle' })
await p.waitForTimeout(2200)
console.log('\nPAYOUT ALIGNMENT:', await p.evaluate(() => {
  const dt = [...document.querySelectorAll('dt')].find(d => /^Bank$/.test(d.textContent.trim()))
  const dd = dt?.parentElement?.querySelector('dd')
  if (!dt || !dd) return '(not found)'
  const a = dt.getBoundingClientRect(), c = dd.getBoundingClientRect()
  return { sameLine: Math.abs(a.top - c.top) < 4, verticalGap: Math.round(c.top - a.bottom),
           horizontalGap: Math.round(Math.abs(c.left - a.left)) }
}))
await b.close()
