import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4325/operations/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
console.log(await page.evaluate(() => {
  const out = []
  const doc = document.scrollingElement
  out.push('doc scrollHeight ' + doc.scrollHeight + ' client ' + doc.clientHeight)
  // what sticks out past the viewport?
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect()
    if (r.bottom > doc.clientHeight + 2 && r.height > 0) {
      const cs = getComputedStyle(el)
      out.push(
        [el.tagName.toLowerCase(), (el.className || '').toString().slice(0, 55),
         'bottom=' + Math.round(r.bottom), 'h=' + Math.round(r.height),
         'pos=' + cs.position, 'minH=' + cs.minHeight].join(' | '),
      )
      if (out.length > 14) break
    }
  }
  const bar = [...document.querySelectorAll('*')].find(
    (e) => getComputedStyle(e).overflowY === 'scroll',
  )
  out.push('--- always-scroll element ---')
  out.push(bar ? bar.outerHTML.slice(0, 300) : 'none')
  out.push('parent: ' + (bar?.parentElement?.className || '').toString().slice(0, 120))
  return out.join('\n')
}))
await browser.close()
