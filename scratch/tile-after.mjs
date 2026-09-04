import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1300 } })
for (const id of ['DRV-0101', 'DRV-0201']) {
  await p.goto(`http://localhost:5199/entity/${id}?view=documents`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2200)
  const r = await p.evaluate(() => {
    const tile = [...document.querySelectorAll('*')].find(e =>
      /payable to this captain/.test(e.textContent) && e.children.length && e.textContent.length < 400)
    if (!tile) return null
    return { lines: tile.innerText.split('\n').map(s => s.trim()).filter(Boolean) }
  })
  console.log(`\n${id}:`)
  r ? r.lines.forEach(l => console.log('   ' + l)) : console.log('   (tile not found)')
}
await p.goto('http://localhost:5199/entity/DRV-0101?view=documents', { waitUntil: 'networkidle' })
await p.waitForTimeout(2000)
console.log('\nfocusable elements in the summary strip:', await p.evaluate(() => {
  const strip = [...document.querySelectorAll('*')].find(e => /payable to this captain/.test(e.textContent)
    && /Standing/.test(e.textContent) && e.textContent.length < 900)
  return strip ? strip.querySelectorAll('button,a,[tabindex]:not([tabindex="-1"])').length : 'strip not found'
}))
await b.close()
