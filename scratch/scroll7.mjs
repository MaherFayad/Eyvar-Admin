import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4325/operations/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
console.log(await page.evaluate(() => {
  const out = []
  const H = () => document.documentElement.scrollHeight
  const band = document.querySelector('section.bg-hero')
  out.push('base ' + H())
  const kids = [...band.querySelectorAll('*')]
  // find the single descendant whose removal fixes it
  for (const el of kids) {
    const prev = el.style.display
    el.style.display = 'none'
    const now = H()
    el.style.display = prev
    if (now < 1000) {
      const cs = getComputedStyle(el)
      out.push('CULPRIT ' + el.tagName.toLowerCase() + ' | ' +
        (el.className || '').toString().slice(0, 80) + ' | pos=' + cs.position +
        ' | h=' + Math.round(el.getBoundingClientRect().height) +
        ' | lh=' + cs.lineHeight + ' | text=' + (el.textContent || '').slice(0, 40))
      break
    }
  }
  out.push('band children count ' + kids.length)
  return out.join('\n')
}))
await browser.close()
