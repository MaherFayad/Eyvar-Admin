import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:5310'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
await page.goto(BASE + '/operations/people?entity=RDR-4002', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)

for (const w of [480, 560, 640, 672, 720, 768, 800, 880, 960]) {
  const out = await page.evaluate((W) => {
    const panel = document.querySelector('[data-slot="sheet-content"]')
    panel.style.width = W + 'px'
    panel.style.maxWidth = W + 'px'
    panel.style.marginInline = '0'
    const body = panel.querySelector('.overflow-y-auto')
    const grid = body.firstElementChild
    const rail = grid.children[0]
    const tabs = grid.children[1]
    const rr = rail.getBoundingClientRect()
    const tr = tabs.getBoundingClientRect()
    // does anything overflow its box horizontally?
    const over = []
    for (const el of panel.querySelectorAll('*')) {
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
        over.push((el.tagName + '.' + (el.className || '').toString().slice(0, 28)) + ' ' + el.scrollWidth + '>' + el.clientWidth)
      }
    }
    // how tall is the rail vs the tabs (wrapping shows up as height)
    const railWallet = rail.querySelector('section')
    const churn = [...rail.querySelectorAll('section')].pop()
    return {
      W,
      rail: Math.round(rr.width),
      railScroll: rail.scrollWidth,
      railH: Math.round(rr.height),
      tabs: Math.round(tr.width),
      tabsScroll: tabs.scrollWidth,
      bodyOver: body.scrollWidth - body.clientWidth,
      walletH: Math.round(railWallet.getBoundingClientRect().height),
      churnH: Math.round(churn.getBoundingClientRect().height),
      over: over.slice(0, 6),
    }
  }, w)
  console.log(JSON.stringify(out))
}
await browser.close()
