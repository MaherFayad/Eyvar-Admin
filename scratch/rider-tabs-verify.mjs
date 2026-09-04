import { chromium } from 'playwright'
const BASE = 'http://localhost:5310'
const browser = await chromium.launch()
for (const lang of ['en', 'ar']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/operations/people', { waitUntil: 'networkidle' })
  if (lang === 'ar') {
    await page.locator('header button').last().click()
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await page.waitForTimeout(1200)
  }
  await page.goto(BASE + '/operations/people?entity=RDR-4002', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const dialog = page.getByRole('dialog')
  const tabs = dialog.locator('[role="tab"]')
  const n = await tabs.count()
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click()
    await page.waitForTimeout(350)
    const out = await page.evaluate(() => {
      const panel = document.querySelector('[data-slot="sheet-content"]')
      const over = []
      for (const el of panel.querySelectorAll('*')) {
        if (el.classList.contains('sr-only')) continue
        if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0)
          over.push(el.tagName + '.' + (el.className||'').toString().slice(0,44) + ' ' + el.scrollWidth + '>' + el.clientWidth)
      }
      return { tab: panel.querySelector('[role="tab"][data-state="active"]')?.textContent, over: over.slice(0,6), h: Math.round(panel.scrollHeight) }
    })
    console.log(lang, JSON.stringify(out))
  }
  // keyboard: Tab must LEAVE the drawer (no trap)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  console.log(lang, 'escape closed:', await page.getByRole('dialog').count() === 0)
  await ctx.close()
}
await browser.close()
