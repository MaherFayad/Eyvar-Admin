import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4325/operations/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
console.log(await page.evaluate(() => {
  const H = () => document.documentElement.scrollHeight
  const out = ['base ' + H()]
  const band = document.querySelector('section.bg-hero')
  // Hide the band's children one at a time, then pairs, to see what shifts H.
  for (const kid of band.querySelectorAll(':scope > *, :scope > * > *')) {
    const prev = kid.style.display
    kid.style.display = 'none'
    out.push('hide ' + kid.tagName.toLowerCase() + '.' +
      (kid.className || '').toString().slice(0, 40) + ' -> ' + H())
    kid.style.display = prev
  }
  // and what happens if we merely shrink it
  band.style.paddingTop = '0px'; band.style.paddingBottom = '0px'
  out.push('band padding 0 -> ' + H())
  band.style.paddingTop = ''; band.style.paddingBottom = ''
  return out.join('\n')
}))
await browser.close()
