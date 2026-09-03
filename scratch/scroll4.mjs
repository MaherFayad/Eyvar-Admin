import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4325/operations/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
console.log(await page.evaluate(() => {
  const html = document.documentElement
  const body = document.body
  window.scrollTo(0, 800)
  const moved = window.scrollY
  window.scrollTo(0, 0)
  const span = [...document.body.children].find((e) => e.tagName === 'SPAN')
  const cs = span ? getComputedStyle(span) : null
  return JSON.stringify({
    htmlScroll: html.scrollHeight, htmlClient: html.clientHeight,
    bodyScroll: body.scrollHeight, bodyClient: body.clientHeight,
    bodyOverflowY: getComputedStyle(body).overflowY,
    htmlOverflowY: getComputedStyle(html).overflowY,
    scrolledTo: moved,
    span: span ? { cls: span.className, pos: cs.position, top: cs.top, left: cs.left, text: span.textContent.slice(0, 30) } : null,
  }, null, 1)
}))
await browser.close()
