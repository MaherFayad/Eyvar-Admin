import { chromium } from 'playwright'
const BASE = 'http://localhost:5310'
const browser = await chromium.launch()

for (const lang of ['en', 'ar']) {
  for (const vw of [1280, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: 900 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e)))
    await page.goto(BASE + '/operations/people', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    if (lang === 'ar') {
      await page.locator('header button').last().click()
      await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
      await page.waitForTimeout(1200)
    }
    await page.goto(BASE + '/operations/people?entity=RDR-4002', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    for (const tab of [0, 1, 2]) {
      const triggers = page.locator('[role="tab"]')
      if (await triggers.count() > tab) { await triggers.nth(tab).click(); await page.waitForTimeout(300) }
      const out = await page.evaluate(() => {
        const panel = document.querySelector('[data-slot="sheet-content"]')
        if (!panel) return { err: 'no panel' }
        const body = panel.querySelector('.overflow-y-auto')
        const over = []
        for (const el of panel.querySelectorAll('*')) {
          if (el.classList.contains('sr-only')) continue
          if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0)
            over.push(el.tagName + '.' + (el.className||'').toString().slice(0,40) + ' ' + el.scrollWidth + '>' + el.clientWidth)
        }
        const r = panel.getBoundingClientRect()
        const scrim = document.querySelector('[data-slot="sheet-overlay"]')
        const rail = body.firstElementChild.firstElementChild
        const churn = document.querySelector('[data-churn-risk]')
        return {
          dir: document.documentElement.dir,
          panelW: Math.round(r.width),
          panelX: Math.round(r.x),
          scrim: scrim !== null,
          railW: Math.round(rail.getBoundingClientRect().width),
          railClass: rail.className.slice(0, 70),
          churn: churn ? { level: churn.getAttribute('data-churn-risk'), colour: getComputedStyle(churn).color, text: churn.textContent } : null,
          selected: document.querySelector('[role="tab"][data-state="active"]')?.textContent,
          over: over.slice(0, 6),
        }
      })
      console.log(lang, vw, 'tab' + tab, JSON.stringify(out))
    }
    if (errs.length) console.log('  PAGE ERRORS', errs.slice(0, 2))
    await ctx.close()
  }
}
await browser.close()
