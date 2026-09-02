import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
p.on('pageerror', e => errs.push(String(e.message).slice(0, 120)))
await p.goto('http://localhost:5227/operations/people', { waitUntil: 'networkidle' })
await p.waitForTimeout(3000)
const txt = (await p.textContent('body')) || ''
console.log('body chars:', txt.length)
console.log('errors:', [...new Set(errs)].slice(0, 3))
console.log(txt.slice(0, 400))
await p.screenshot({ path: '.pw-tmp/app.png' })
await b.close()
