import { chromium } from 'playwright'
const b = await chromium.launch()
for (const w of [1344, 1280]) {
  const p = await b.newPage({ viewport: { width: w, height: 1600 } })
  await p.goto('http://localhost:5199/entity/DRV-0201?view=activity', { waitUntil: 'networkidle' })
  await p.waitForTimeout(3500)
  console.log(w, await p.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find(e => /^Trips$/.test(e.textContent.trim()))
    const sub = h.nextElementSibling
    const inp = document.querySelector('input[placeholder="Search trips"]')
    const bar = h.closest('div').parentElement
    return { subText: sub?.textContent, clipped: sub ? sub.scrollWidth > sub.clientWidth + 1 : null,
             subLines: sub ? Math.round(sub.getBoundingClientRect().height / 16) : null,
             barOverflow: bar.scrollWidth - bar.clientWidth,
             sameLine: Math.abs(h.getBoundingClientRect().top - inp.getBoundingClientRect().top) < 24,
             headingLeft: Math.round(h.getBoundingClientRect().left) }
  }))
  await p.close()
}
await b.close()
