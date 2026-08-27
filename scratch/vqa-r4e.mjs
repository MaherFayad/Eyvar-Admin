import { chromium } from 'playwright'
const BASE = 'http://localhost:5433'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } })
const page = await ctx.newPage()
for (const p of ['/operations/overview', '/admin/overview', '/management/risk']) {
  await page.goto(BASE + p, { waitUntil: 'networkidle' })
  await page.waitForSelector('main ul[aria-labelledby]'); await page.waitForTimeout(500)
  const r = await page.evaluate(() => {
    const px = (n) => Math.round(n * 10) / 10
    return [...document.querySelectorAll('main ul[aria-labelledby]')].map((ul) => ({
      heading: document.getElementById(ul.getAttribute('aria-labelledby'))?.textContent,
      rows: [...ul.querySelectorAll(':scope > li')].map((li) => {
        const fill = li.querySelector('.bg-chart-fill')
        const track = fill?.parentElement
        const cells = [...li.querySelectorAll('span.tabular-nums, span.text-end')]
        return {
          label: li.querySelector('.truncate')?.textContent,
          nums: [...li.querySelectorAll('bdi')].map((b) => b.textContent),
          fillW: fill ? px(fill.getBoundingClientRect().width) : null,
          trackW: track ? px(track.getBoundingClientRect().width) : null,
          frac: fill && track ? Math.round((fill.getBoundingClientRect().width / track.getBoundingClientRect().width) * 1000) / 1000 : null,
          fillH: fill ? px(fill.getBoundingClientRect().height) : null,
        }
      }),
    }))
  })
  console.log('==', p); console.log(JSON.stringify(r, null, 1))
}
await ctx.close(); await browser.close()
