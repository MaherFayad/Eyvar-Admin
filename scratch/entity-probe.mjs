import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
const errs = []
p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)) })
await p.goto('http://localhost:5310/entity/RDR-4002', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
console.log('h2:', await p.evaluate(() => [...document.querySelectorAll('h2')].map(e=>e.textContent.trim()).slice(0,8)))
console.log('body:', (await p.evaluate(() => document.body.innerText)).slice(0, 200).replace(/\n/g,' | '))
console.log('errors:', errs.slice(0, 3))
await b.close()
