import { chromium } from 'playwright'
const BASE = 'http://localhost:4327'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1300 } })
const page = await ctx.newPage()
await page.goto(BASE + '/management/reports/dashboards/DSH-3', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
/* The account menu carries the language toggle. */
const avatar = page.locator('header button').last()
await avatar.click()
await page.waitForTimeout(500)
const items = await page.locator('[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]').allTextContents()
console.log('menu:', items)
const ar = page.locator('[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]').filter({ hasText: /عرب|Arabic|العربية/ })
if (await ar.count()) { await ar.first().click() } else { console.log('no arabic item found') }
await page.waitForTimeout(2500)
console.log('dir =', await page.evaluate(() => document.documentElement.getAttribute('dir')))
await page.screenshot({ path: 'scratch/shots-dash/dsh3-rtl.png', fullPage: true })
/* Physical-direction sweep over the board's own subtree. */
const leaks = await page.evaluate(() => {
  const bad = []
  const root = document.querySelector('main') ?? document.body
  for (const node of root.querySelectorAll('*')) {
    const cls = node.getAttribute('class') ?? ''
    if (/(?:^|\s)(?:ml|mr|pl|pr|border-l|border-r|rounded-l|rounded-r|text-left|text-right)-/.test(cls)) {
      bad.push(node.tagName + ' :: ' + cls)
    }
  }
  return bad.slice(0, 20)
})
console.log('physical-direction leaks:', leaks.length ? leaks : 'none')
await browser.close()
