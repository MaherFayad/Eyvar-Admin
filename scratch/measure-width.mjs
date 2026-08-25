import { chromium } from 'playwright'

const views = ['', '?view=applications', '?view=compliance', '?view=riders']
const widths = [1280, 1440]
const browser = await chromium.launch()

for (const w of widths) {
  for (const v of views) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } })
    await page.goto('http://localhost:5199/operations/people' + v, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    const r = await page.evaluate(() => {
      const c = document.querySelector('[data-slot="table-container"]')
      const heads = [...document.querySelectorAll('thead th')].map((th) => ({
        t: th.textContent.trim().slice(0, 12),
        w: Math.round(th.getBoundingClientRect().width),
      }))
      return c
        ? { scroll: c.scrollWidth, client: c.clientWidth, heads }
        : { scroll: 0, client: 0, heads }
    })
    console.log(w, v || '(captains)', 'scroll', r.scroll, 'client', r.client, 'over', r.scroll - r.client)
    if (r.scroll > r.client) console.log('   ', r.heads.map((h) => `${h.t}:${h.w}`).join(' '))
    await page.close()
  }
}
await browser.close()
