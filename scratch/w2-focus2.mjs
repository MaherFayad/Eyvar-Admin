import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.goto('http://localhost:5199/operations/people', { waitUntil: 'networkidle' })
await p.waitForTimeout(900)
for (let i = 0; i < 30; i++) {
  await p.keyboard.press('Tab')
  const r = await p.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const s = getComputedStyle(el)
    const ok = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none'
    let path = []
    let n = el
    while (n && n !== document.body && path.length < 5) { path.push(n.tagName + (n.className && typeof n.className === 'string' ? '.' + n.className.split(' ').slice(0,2).join('.') : '')); n = n.parentElement }
    return { ok, ti: el.getAttribute('tabindex'), path: path.join(' < ') }
  })
  if (r && !r.ok) console.log(i, JSON.stringify(r))
}
await b.close()
