import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
await p.goto('http://localhost:5199/entity/DRV-0204', { waitUntil: 'networkidle' })
await p.waitForTimeout(2200)
console.log(await p.evaluate(() => {
  const h = [...document.querySelectorAll('h2,h3')].find(e => /standing/i.test(e.textContent))
  return h ? h.closest('section,div').innerText.replace(/\n+/g, ' | ') : '(no standing block)'
}))
await b.close()
