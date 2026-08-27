import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.goto('http://localhost:5199' + process.argv[2], { waitUntil: 'networkidle' })
await p.waitForTimeout(900)
const rows = await p.$$eval('tbody tr', (trs) =>
  trs.slice(0, 12).map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim().slice(0, 34)).join(' | ')),
)
console.log(rows.join('\n'))
await b.close()
