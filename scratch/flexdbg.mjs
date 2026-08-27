import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.goto('http://localhost:5199/operations/assurance', { waitUntil: 'networkidle' })
await p.waitForTimeout(700)
const r = await p.evaluate(() => {
  const list = document.querySelector('[data-slot="tabs-list"]')
  const tabsRoot = list?.closest('[data-slot="tabs"]') ?? list?.parentElement
  const row = tabsRoot?.parentElement
  const cluster = row ? [...row.children].find(c => c !== tabsRoot) : null
  const g = (el) => { if(!el) return null; const s = getComputedStyle(el)
    return { w: Math.round(el.getBoundingClientRect().width), shrink: s.flexShrink, grow: s.flexGrow,
             basis: s.flexBasis, minW: s.minWidth, overflowX: s.overflowX } }
  return { rowW: row ? Math.round(row.getBoundingClientRect().width) : null,
           tabsRoot: g(tabsRoot), list: g(list), cluster: g(cluster),
           listScroll: list ? [list.scrollWidth, list.clientWidth] : null }
})
console.log(JSON.stringify(r, null, 1))
await b.close()
