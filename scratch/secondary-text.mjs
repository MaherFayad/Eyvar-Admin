/** Inventory the secondary/explanatory prose on the four profile surfaces. */
import { chromium } from 'playwright'
const b = await chromium.launch()
const grab = async (p) => p.evaluate(() => {
  const out = new Set()
  for (const el of document.querySelectorAll('p, span, dd, div, caption')) {
    if (el.children.length) continue
    const t = el.textContent.trim()
    if (t.length < 18) continue                       // a sentence, not a value
    const s = getComputedStyle(el)
    const muted = /rgb\(1[0-9]{2}|rgb\(9[0-9]|rgb\(1[0-4][0-9]/.test(s.color)
    const small = parseFloat(s.fontSize) <= 13
    if (muted || small || el.tagName === 'CAPTION') out.add(`[${el.tagName}] ${t.slice(0, 110)}`)
  }
  return [...out]
})

for (const [label, url, views] of [
  ['CAPTAIN PAGE', '/entity/DRV-0101', ['documents', 'earnings', 'activity', 'identity']],
  ['RIDER PAGE', '/entity/RDR-4002', ['']],
]) {
  for (const v of views) {
    const p = await b.newPage({ viewport: { width: 1440, height: 1400 } })
    await p.goto(`http://localhost:5199${url}${v ? `?view=${v}` : ''}`, { waitUntil: 'networkidle' })
    await p.waitForTimeout(2200)
    const lines = await grab(p)
    console.log(`\n=== ${label}${v ? ` · ${v}` : ''} — ${lines.length} ===`)
    lines.forEach(l => console.log('  ' + l))
    await p.close()
  }
}
await b.close()
