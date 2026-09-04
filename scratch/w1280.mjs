import { chromium } from 'playwright'
const b = await chromium.launch()
for (const w of [1280, 1152]) {
  const p = await b.newPage({ viewport: { width: w, height: 1600 } })
  await p.goto('http://localhost:5199/entity/DRV-0201?view=activity', { waitUntil: 'networkidle' })
  await p.waitForTimeout(3000)
  const h = await p.locator('h2,h3').filter({ hasText: /^Trips$/ }).count()
  console.log(`${w}: Trips headings found = ${h}`, h ? await p.evaluate(() => {
    const el = [...document.querySelectorAll('h2,h3')].find(e => /^Trips$/.test(e.textContent.trim()))
    const bar = el.closest('div'); const inp = document.querySelector('input[placeholder="Search trips"]')
    return { barOverflow: bar.scrollWidth - bar.clientWidth, searchW: Math.round(inp.getBoundingClientRect().width),
             sameLine: Math.abs(el.getBoundingClientRect().top - inp.getBoundingClientRect().top) < 20,
             headingLeft: Math.round(el.getBoundingClientRect().left) }
  }) : '')
  await p.close()
}
await b.close()
