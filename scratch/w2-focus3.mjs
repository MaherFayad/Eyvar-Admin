import { chromium } from 'playwright'
const b = await chromium.launch()
for (const route of ['/support/fairness', '/operations/people?view=applications', '/operations/requests']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.goto('http://localhost:5199' + route, { waitUntil: 'networkidle' })
  await p.waitForTimeout(900)
  const r = await p.evaluate(() =>
    [...document.querySelectorAll('span[tabindex]')].map((el) => ({
      attrs: [...el.attributes].map((a) => `${a.name}=${a.value}`).join(' '),
      parent: el.parentElement?.tagName + '.' + String(el.parentElement?.className ?? '').split(' ')[0],
    })),
  )
  console.log(route, JSON.stringify(r))
  await p.close()
}
await b.close()
