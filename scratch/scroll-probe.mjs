import { chromium } from 'playwright'
const browser = await chromium.launch()
for (const h of [700, 800, 900, 1080]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: h } })
  await page.goto('http://localhost:4325/operations/overview', { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  const out = await page.evaluate(() => {
    const rows = []
    const doc = document.scrollingElement
    if (doc && doc.scrollHeight - doc.clientHeight > 1) {
      rows.push({ tag: 'scrollingElement', over: doc.scrollHeight - doc.clientHeight })
    }
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      const bar =
        cs.overflowY === 'scroll' ||
        (['auto'].includes(cs.overflowY) && el.scrollHeight - el.clientHeight > 1)
      if (bar) rows.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 60),
        over: el.scrollHeight - el.clientHeight,
        overflowY: cs.overflowY,
      })
    }
    return rows
  })
  console.log('h=' + h, JSON.stringify(out))
  await page.close()
}
await browser.close()
