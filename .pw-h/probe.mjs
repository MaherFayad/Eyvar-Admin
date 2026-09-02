import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1512, height: 900 } })
const errs = []
p.on('pageerror', e => errs.push(String(e.message).slice(0,160)))
await p.goto('http://localhost:5235/', { waitUntil: 'networkidle', timeout: 60000 })
await p.waitForTimeout(2500)
console.log('URL after load:', p.url())
console.log('errors:', [...new Set(errs)].slice(0,3))
console.log((await p.evaluate(()=>document.body.innerText)).slice(0,600))
await b.close()
