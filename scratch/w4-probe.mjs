import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
await p.goto('http://localhost:5199/management/risk', { waitUntil: 'networkidle' })
await p.waitForTimeout(900)
const out = await p.evaluate(() => {
  const res = []
  document.querySelectorAll('main a').forEach((a) => {
    const cs = getComputedStyle(a)
    res.push({ text: (a.textContent || '').slice(0, 40), color: cs.color, tag: a.tagName })
    a.querySelectorAll('span').forEach((s) => {
      const c = getComputedStyle(s)
      if (c.color !== cs.color) res.push({ text: '  span: ' + (s.textContent || '').slice(0, 40), color: c.color })
    })
  })
  return res
})
console.log(JSON.stringify(out, null, 1))
await b.close()
