/**
 * Can the Performance figures go three-across? The ruling said two, on a
 * measurement taken against a MONEY figure. Measure the actual rows.
 */
import { chromium } from 'playwright'
const b = await chromium.launch()
for (const [w, lang] of [[1440, 'en'], [1344, 'en'], [1440, 'ar'], [1344, 'ar']]) {
  const p = await b.newPage({ viewport: { width: w, height: 1100 } })
  await p.goto(`http://localhost:5199/entity/DRV-0201?view=activity`, { waitUntil: 'networkidle' })
  if (lang === 'ar') {
    await p.evaluate(() => {
      const btn = [...document.querySelectorAll('button,a')].find(e => /عرب|Arabic|AR/i.test(e.textContent))
      if (btn) btn.click()
    })
    await p.waitForTimeout(800)
  }
  await p.waitForTimeout(1500)
  const r = await p.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('*')) {
      const s = getComputedStyle(el)
      if (s.display !== 'grid') continue
      const cols = s.gridTemplateColumns.split(' ').filter(Boolean)
      const txt = el.innerText.replace(/\n+/g, ' | ').slice(0, 90)
      if (/Rating|On time|Trips|Earnings|التقييم|الرحلات/.test(txt))
        out.push({ cols: cols.length, widths: cols.map(c => Math.round(parseFloat(c))).join(' / '), boxW: Math.round(el.getBoundingClientRect().width), txt })
    }
    return out
  })
  console.log(`\n--- ${w}px  ${lang}  dir=${await p.evaluate(() => document.documentElement.dir)} ---`)
  for (const g of r) console.log(`  ${g.cols} cols  box=${g.boxW}  [${g.widths}]  ${g.txt}`)
  await p.close()
}
await b.close()
