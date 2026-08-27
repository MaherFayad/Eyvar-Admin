import { chromium } from 'playwright'
const b = await chromium.launch()
for (const path of ['/support/fairness', '/operations/assurance', '/operations/requests', '/operations/people?view=captains']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.goto('http://localhost:5199' + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(800)
  const r = await p.evaluate(() => {
    const main = document.querySelector('main')
    const bar = document.querySelector('[role="tablist"], [data-slot="tabs-list"]')?.parentElement
    const sort = [...document.querySelectorAll('button')].find((el) => /^Sort/.test(el.textContent.trim()))
    return {
      main: main?.getBoundingClientRect().right,
      barScroll: bar ? [bar.scrollWidth, bar.clientWidth] : null,
      sortRight: sort ? Math.round(sort.getBoundingClientRect().right) : null,
    }
  })
  console.log(path, JSON.stringify(r))
  await p.close()
}
await b.close()
