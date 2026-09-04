import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
await page.goto('http://localhost:5310/entity/RDR-4002', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
const box = await page.evaluate(() => {
  const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.trim() === 'Payments')
  const s = h.closest('section')
  s.scrollIntoView()
  return null
})
await page.waitForTimeout(400)
const section = page.locator('section').filter({ has: page.getByText('Payments', { exact: true }) }).last()
await section.screenshot({ path: './scratch/shots-rider/payments.png' })
const info = await page.evaluate(() => {
  const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.trim() === 'Payments')
  const s = h.closest('section')
  const t = s.querySelector('table')
  return {
    headers: [...s.querySelectorAll('thead th')].map((th) => th.textContent.trim()),
    rows: s.querySelectorAll('tbody tr').length,
    tfoot: s.querySelectorAll('tfoot tr').length,
    buttons: [...s.querySelectorAll('button')].map((b) => b.textContent.trim()).slice(0, 10),
    showing: s.querySelector('span.text-xs')?.textContent,
    tableW: t ? Math.round(t.getBoundingClientRect().width) : null,
    scroller: (() => { const c = s.querySelector('[data-slot="table-container"]'); return c ? { scroll: c.scrollWidth, client: c.clientWidth } : null })(),
  }
})
console.log(JSON.stringify(info, null, 1))
await browser.close()
