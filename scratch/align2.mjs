import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1600 } })
await p.goto('http://localhost:5199/entity/DRV-0201?view=activity', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
console.log(await p.evaluate(() => {
  const h = [...document.querySelectorAll('h2,h3')].find(e => /^Trips$/.test(e.textContent.trim()))
  const inp = document.querySelector('input[placeholder*="Search"]')
  const bar = h?.parentElement?.parentElement
  const hr = h.getBoundingClientRect(), ir = inp.getBoundingClientRect()
  return {
    headingTop: Math.round(hr.top), searchTop: Math.round(ir.top),
    onSameLine: Math.abs(hr.top - ir.top) < 20,
    toolbarClasses: bar?.className,
    toolbarBox: bar ? { l: Math.round(bar.getBoundingClientRect().left), w: Math.round(bar.getBoundingClientRect().width) } : null,
    headingWrapperClasses: h.parentElement?.className,
    controlsNaturalWidth: (() => {
      const c = inp.closest('div').parentElement
      const cl = c.cloneNode(true); cl.style.cssText = 'position:absolute;visibility:hidden;width:max-content'
      document.body.append(cl); const w = Math.round(cl.getBoundingClientRect().width); cl.remove(); return w
    })(),
  }
}))
await b.close()
