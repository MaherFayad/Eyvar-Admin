import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4325/operations/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
console.log(await page.evaluate(() => {
  const out = []
  const H = () => document.documentElement.scrollHeight
  out.push('base ' + H())
  // bisect: hide each element in turn (breadth-first), keep the one that drops it
  let node = document.body
  for (let depth = 0; depth < 12; depth++) {
    let found = null
    for (const kid of node.children) {
      const prev = kid.style.display
      kid.style.display = 'none'
      const now = H()
      kid.style.display = prev
      if (now < 1000) { found = kid; break }
    }
    if (!found) break
    out.push('  '.repeat(depth) + found.tagName.toLowerCase() + ' | ' +
      (found.className || '').toString().slice(0, 70) + ' | h=' +
      Math.round(found.getBoundingClientRect().height) + ' | ' +
      getComputedStyle(found).position + ' | minH=' + getComputedStyle(found).minHeight)
    node = found
  }
  return out.join('\n')
}))
await browser.close()
