import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))
p.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()))
await p.goto('http://localhost:5199/operations/people', { waitUntil: 'networkidle' })
await p.waitForTimeout(2200)

const geom = await p.evaluate(() => {
  const th = document.querySelector('thead th:nth-child(2)')
  const td = document.querySelector('tbody tr:nth-child(3) td:nth-child(2)')
  const cont = document.querySelector('[data-slot=table-container]')
  const tbl = cont?.querySelector('table')
  return {
    thH: th?.getBoundingClientRect().height,
    tdH: td?.getBoundingClientRect().height,
    rowH: document.querySelector('tbody tr:nth-child(3)')?.getBoundingClientRect().height,
    scrollWidth: cont?.scrollWidth,
    clientWidth: cont?.clientWidth,
    tableWidth: tbl?.getBoundingClientRect().width,
    firstColW: th?.getBoundingClientRect().width,
    headerButtons: document.querySelectorAll('thead button[aria-haspopup=menu]').length,
    thCount: document.querySelectorAll('thead th').length,
    stickyTh: getComputedStyle(document.querySelector('thead th:nth-child(2)')).position,
    tdSticky: getComputedStyle(td).position,
    tdInsetStart: getComputedStyle(td).insetInlineStart,
  }
})
console.log(JSON.stringify(geom, null, 1))

await p.getByRole('button', { name: /Column options for Status/ }).click()
await p.waitForTimeout(400)
console.log('menu items:', await p.locator('[role=menuitem],[role=menuitemradio]').allInnerTexts())
await p.getByRole('menuitem', { name: 'Filter…' }).click()
await p.waitForTimeout(600)
console.log('popover html:', (await p.locator('[data-slot=popover-content]').first().innerHTML()).slice(0, 900))
await b.close()
