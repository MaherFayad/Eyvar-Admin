import { chromium } from 'playwright'
const browser = await chromium.launch()
for (const vh of [800, 900, 1080]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: vh } })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5310/operations/people?entity=RDR-4002', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const out = await page.evaluate(() => {
    const panel = document.querySelector('[data-slot="sheet-content"]')
    const body = panel.querySelector('.overflow-y-auto')
    const rail = body.firstElementChild.firstElementChild
    const tablist = panel.querySelector('[role="tablist"]')
    const one = {
      viewportH: window.innerHeight,
      bodyH: Math.round(body.clientHeight),
      contentH: body.scrollHeight,
      railH: Math.round(rail.getBoundingClientRect().height),
      tabsTop: Math.round(tablist.getBoundingClientRect().top),
      tabsVisible: tablist.getBoundingClientRect().bottom <= window.innerHeight,
    }
    // two-across probe
    rail.style.display = 'grid'
    rail.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))'
    const two = {
      railH: Math.round(rail.getBoundingClientRect().height),
      tabsTop: Math.round(tablist.getBoundingClientRect().top),
      tabsVisible: tablist.getBoundingClientRect().bottom <= window.innerHeight,
    }
    rail.style.display = ''
    rail.style.gridTemplateColumns = ''
    return { one, two }
  })
  console.log(vh, JSON.stringify(out))
  await ctx.close()
}
await browser.close()
