import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:5310'
const URL = BASE + '/operations/people?entity=RDR-4002'
const browser = await chromium.launch()

for (const vw of [1280, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const out = await page.evaluate(() => {
    const panel = document.querySelector('[data-slot="sheet-content"]')
    if (!panel) return { error: 'no sheet', html: document.body.innerText.slice(0, 300) }
    const body = panel.querySelector('.overflow-y-auto')
    const grid = body?.firstElementChild
    const rail = grid?.children?.[0]
    const tabs = grid?.children?.[1]
    const r = (el) => (el ? Math.round(el.getBoundingClientRect().width) : null)
    // intrinsic minimum content widths
    const probe = (el) => {
      if (!el) return null
      const prev = el.style.cssText
      el.style.width = 'min-content'
      el.style.maxWidth = 'none'
      el.style.flex = '0 0 auto'
      const w = Math.round(el.getBoundingClientRect().width)
      el.style.cssText = prev
      return w
    }
    const probeFit = (el) => {
      if (!el) return null
      const prev = el.style.cssText
      el.style.width = 'max-content'
      el.style.maxWidth = 'none'
      el.style.flex = '0 0 auto'
      const w = Math.round(el.getBoundingClientRect().width)
      el.style.cssText = prev
      return w
    }
    return {
      panel: r(panel),
      body: r(body),
      rail: r(rail),
      tabs: r(tabs),
      railMin: probe(rail),
      railMax: probeFit(rail),
      tabsMin: probe(tabs),
      tabsMax: probeFit(tabs),
      bodyScrollW: body?.scrollWidth,
      bodyClientW: body?.clientWidth,
    }
  })
  console.log(vw, JSON.stringify(out))
  await ctx.close()
}
await browser.close()
