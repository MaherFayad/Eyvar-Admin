import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1400 } })

await p.goto('http://localhost:5199/entity/DRV-0201?view=activity', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
const fig = await p.evaluate(() => {
  const grids = [...document.querySelectorAll('dl,div')].filter(el => {
    const s = getComputedStyle(el)
    return s.display === 'grid' && /Rating|On time/.test(el.innerText)
  })
  return grids.slice(0, 2).map(el => ({
    cols: getComputedStyle(el).gridTemplateColumns,
    text: el.innerText.replace(/\n+/g, ' | ').slice(0, 120),
  }))
})
console.log('FIGURE GRID @1440:'); fig.forEach(g => console.log('  cols:', g.cols, '\n  txt :', g.text))
console.log('\ntables on activity:', await p.locator('table').count())
const head = await p.evaluate(() => {
  const t = document.querySelector('table')
  if (!t) return null
  const sec = t.closest('section') ?? t.parentElement.parentElement.parentElement
  return { around: sec.innerText.split('\n').slice(0, 6).join(' | '),
           headers: [...t.querySelectorAll('th')].map(h => h.textContent.trim()).join(' · '),
           rows: t.querySelectorAll('tbody tr').length }
})
console.log('trips table:', JSON.stringify(head, null, 1))
await p.screenshot({ path: 'scratch/activity-1440.png', clip: { x: 100, y: 120, width: 1340, height: 900 } })
await b.close()
