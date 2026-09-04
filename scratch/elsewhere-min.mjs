import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1600 } })
await p.goto('http://localhost:5199/entity/DRV-0201?view=activity', { waitUntil: 'networkidle' })
await p.waitForTimeout(2200)
console.log(await p.evaluate(() => {
  const els = [...document.querySelectorAll('h2,h3')].find(e => /Elsewhere/.test(e.textContent))?.closest('section')
  const clone = els.cloneNode(true)
  const probe = (w) => { clone.style.cssText = `position:absolute;visibility:hidden;width:${w}`; document.body.append(clone)
    const h = Math.round(clone.getBoundingClientRect().height); clone.remove(); return h }
  clone.style.cssText = 'position:absolute;visibility:hidden;width:max-content'
  document.body.append(clone); const max = Math.round(clone.getBoundingClientRect().width); clone.remove()
  clone.style.cssText = 'position:absolute;visibility:hidden;width:min-content'
  document.body.append(clone); const min = Math.round(clone.getBoundingClientRect().width); clone.remove()
  return { current: Math.round(els.getBoundingClientRect().width), maxContent: max, minContent: min,
           heightAt: { '413px': probe('413px'), '340px': probe('340px'), '300px': probe('300px'), '272px': probe('272px') } }
}))
await b.close()
