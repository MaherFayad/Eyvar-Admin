import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
p.on('pageerror', e => errs.push(String(e).slice(0,120)))
p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,120)) })
await p.goto('http://localhost:5199/operations/overview', { waitUntil: 'networkidle' })
await p.waitForTimeout(900)
const r = await p.evaluate(() => {
  const banners = [...document.querySelectorAll('[data-slot="banner"],[role="status"],[role="alert"]')]
  return { banners: banners.map(el => el.textContent.trim().slice(0,90)),
           h1: document.querySelector('h1')?.textContent?.trim() }
})
console.log('h1:', r.h1)
console.log('banners rendered:', r.banners.length)
r.banners.forEach(b => console.log('  •', b))
console.log('errors:', errs.length ? errs : 'none')
await b.close()
