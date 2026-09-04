import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:5310'
const browser = await chromium.launch()

for (const dir of ['ltr', 'rtl']) {
  for (const vw of [1280, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(BASE + (dir === 'rtl' ? '/ar' : '') + '/operations/people?entity=RDR-4002', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1400)
    for (const tab of ['activity', 'money', 'identity']) {
      const out = await page.evaluate(async ({ W, TAB }) => {
        const panel = document.querySelector('[data-slot="sheet-content"]')
        if (!panel) return { err: 'no panel', dir: document.documentElement.dir }
        panel.style.width = W + 'px'
        panel.style.maxWidth = W + 'px'
        panel.style.marginInline = '0'
        const body = panel.querySelector('.overflow-y-auto')
        const grid = body.firstElementChild
        grid.style.flexDirection = 'column'
        const rail = grid.children[0]
        const tabs = grid.children[1]
        rail.style.width = '100%'
        rail.style.maxWidth = 'none'
        const railInner = rail.firstElementChild
        railInner.style.borderInlineEndWidth = '0'
        railInner.style.borderBottomWidth = '1px'
        const trigger = panel.querySelector(`[role="tab"][value="${TAB}"], [data-slot="tabs-trigger"][id*="${TAB}"]`)
          || [...panel.querySelectorAll('[role="tab"]')].find((t) => (t.getAttribute('id')||'').includes(TAB))
        if (trigger) { trigger.click(); await new Promise((r) => setTimeout(r, 250)) }
        const over = []
        for (const el of panel.querySelectorAll('*')) {
          if (el.classList.contains('sr-only')) continue
          if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0)
            over.push(el.tagName + '.' + (el.className||'').toString().slice(0,34) + ' ' + el.scrollWidth + '>' + el.clientWidth)
        }
        return {
          dir: document.documentElement.dir,
          panelW: Math.round(panel.getBoundingClientRect().width),
          railW: Math.round(rail.getBoundingClientRect().width),
          railH: Math.round(rail.getBoundingClientRect().height),
          tabsW: Math.round(tabs.getBoundingClientRect().width),
          bodyOver: body.scrollWidth - body.clientWidth,
          contentH: Math.round(grid.getBoundingClientRect().height),
          over: over.slice(0, 8),
        }
      }, { W: 480, TAB: tab })
      console.log(dir, vw, tab, JSON.stringify(out))
    }
    await ctx.close()
  }
}
await browser.close()
