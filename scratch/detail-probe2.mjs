import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto('http://localhost:4325/operations/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
console.log(await page.evaluate(() => {
  const out = []
  const main = document.querySelector('main')
  const section = [...main.querySelectorAll('section')].find((s) => s.className.includes('border-t'))
  out.push('detail section cols: ' + (section ? getComputedStyle(section).gridTemplateColumns : 'none'))
  if (section) {
    for (const kid of section.children) {
      const r = kid.getBoundingClientRect()
      out.push('  panel x=' + Math.round(r.x) + ' w=' + Math.round(r.width) + ' y=' + Math.round(r.y) +
        ' : ' + kid.textContent.trim().slice(0, 30))
    }
    const li = section.querySelectorAll('li')
    out.push('rows: ' + li.length)
    if (li[0]) out.push('row0 bars: ' + li[0].querySelectorAll('span.h-1').length + ' text: ' + li[0].textContent.trim())
    const svg = section.querySelector('svg')
    out.push('svg text: ' + JSON.stringify([...svg.querySelectorAll('text')].map((t) => t.textContent)))
    const panels = [...section.children].map((k) => Math.round(k.getBoundingClientRect().height))
    out.push('panel heights: ' + JSON.stringify(panels))
    const area = section.querySelector('.recharts-area-area')
    out.push('area left inset: ' + Math.round(area.getBoundingClientRect().x - section.children[0].getBoundingClientRect().x))
  }
  return out.join('\n')
}))
await browser.close()
