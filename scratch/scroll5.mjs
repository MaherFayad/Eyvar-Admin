import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4325/operations/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
console.log(await page.evaluate(() => {
  const out = []
  const before = document.documentElement.scrollHeight
  const span = [...document.body.children].find((e) => e.tagName === 'SPAN')
  if (span) {
    span.style.display = 'none'
    out.push('hiding the -20000 span: ' + before + ' -> ' + document.documentElement.scrollHeight)
    span.style.display = ''
  }
  // which un-clipped element reaches furthest down?
  const clipped = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflow
      if (o !== 'visible') return true
    }
    return false
  }
  let worst = null
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect()
    if (r.height === 0 && r.width === 0) continue
    if (clipped(el)) continue
    if (!worst || r.bottom > worst.b) worst = { b: r.bottom, el }
  }
  out.push('deepest un-clipped bottom: ' + Math.round(worst.b) + ' ' +
    worst.el.tagName + ' ' + (worst.el.className || '').toString().slice(0, 70))
  return out.join('\n')
}))
await browser.close()
