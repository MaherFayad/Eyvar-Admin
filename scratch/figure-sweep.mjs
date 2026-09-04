import { chromium } from 'playwright'
const b = await chromium.launch()
for (const w of [1440, 1344, 1280]) {
  const p = await b.newPage({ viewport: { width: w, height: 1200 } })
  await p.goto('http://localhost:5199/entity/DRV-0201?view=earnings', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1800)
  const r = await p.evaluate(() => {
    for (const el of document.querySelectorAll('div,dl')) {
      if (getComputedStyle(el).display !== 'grid') continue
      if (!/this month/.test(el.innerText)) continue
      const cols = getComputedStyle(el).gridTemplateColumns.split(' ')
      const money = [...el.children].find(c => /this month/.test(c.innerText))
      return { box: Math.round(el.getBoundingClientRect().width), tracks: cols.length,
               track: cols[0], moneyLines: money ? money.querySelectorAll('*').length : 0,
               moneyH: money ? Math.round(money.getBoundingClientRect().height) : 0 }
    }
    return null
  })
  console.log(`${w}px ->`, JSON.stringify(r))
  await p.close()
}
/* The sheet: open a captain from the people index. */
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
await p.goto('http://localhost:5199/operations/people?view=captains', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
await p.locator('table tbody tr').first().click()
await p.waitForTimeout(2000)
const tabs = p.locator('[role="tablist"]')
console.log('\nsheet tablists:', await tabs.count())
if (await tabs.count()) {
  const earn = p.locator('[role="tab"]').filter({ hasText: /Earnings|المستحقات/ }).first()
  if (await earn.count()) { await earn.click(); await p.waitForTimeout(1200) }
  console.log('sheet figures:', await p.evaluate(() => {
    for (const el of document.querySelectorAll('div,dl')) {
      if (getComputedStyle(el).display !== 'grid') continue
      if (!/this month|this period/.test(el.innerText)) continue
      const cols = getComputedStyle(el).gridTemplateColumns.split(' ')
      return { box: Math.round(el.getBoundingClientRect().width), tracks: cols.length, track: cols[0] }
    }
    return '(no figure grid found in sheet)'
  }))
}
await b.close()
