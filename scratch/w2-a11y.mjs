import { chromium } from 'playwright'
const B = 'http://localhost:5199'
const routes = ['/operations/requests', '/operations/assurance', '/operations/my-work?view=everything', '/support/safety', '/support/fairness', '/support/fairness?view=captain-economics']
const EMOJI = /\p{Extended_Pictographic}/u
const b = await chromium.launch()
for (const route of routes) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.goto(B + route, { waitUntil: 'networkidle' })
  await p.waitForTimeout(800)
  const emoji = await p.evaluate(() => /\p{Extended_Pictographic}/u.test(document.body.textContent ?? ''))
  // walk the first 30 tab stops and confirm each has a visible focus indicator
  let noRing = []
  for (let i = 0; i < 30; i++) {
    await p.keyboard.press('Tab')
    const r = await p.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const s = getComputedStyle(el)
      const ring = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0
      const shadow = s.boxShadow !== 'none'
      return { tag: el.tagName, label: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 24), ok: ring || shadow }
    })
    if (r && !r.ok) noRing.push(`${r.tag}:${r.label}`)
  }
  console.log(`${route.padEnd(46)} emoji=${emoji}  focusless=${noRing.length ? noRing.join(', ') : 'none'}`)
  await p.close()
}
await b.close()
