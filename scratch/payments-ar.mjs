import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
await page.goto('http://localhost:5310/operations/people', { waitUntil: 'networkidle' })
await page.locator('header button').last().click()
await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
await page.waitForTimeout(1200)
await page.goto('http://localhost:5310/entity/RDR-4002', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const info = await page.evaluate(() => {
  const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.trim() === 'المدفوعات')
  if (!h) return { err: 'no payments heading', h2: [...document.querySelectorAll('h2')].map(e=>e.textContent) }
  const s = h.closest('section')
  s.scrollIntoView()
  const c = s.querySelector('[data-slot="table-container"]')
  return {
    dir: document.documentElement.dir,
    headers: [...s.querySelectorAll('thead th')].map((th) => th.textContent.trim()),
    amountAlign: getComputedStyle(s.querySelector('tbody td:last-child')).textAlign,
    rows: s.querySelectorAll('tbody tr').length,
    tfoot: s.querySelectorAll('tfoot tr').length,
    over: c ? c.scrollWidth - c.clientWidth : null,
    ref: s.querySelector('tbody a')?.textContent,
    paging: [...s.querySelectorAll('button')].map(b=>b.textContent.trim()).slice(-2),
  }
})
console.log(JSON.stringify(info, null, 1))
const sec = await page.evaluateHandle(() => [...document.querySelectorAll('h2')].find((e)=> e.textContent.trim()==='المدفوعات').closest('section'))
if (sec.asElement()) await sec.asElement().screenshot({ path: './scratch/shots-rider/payments.ar.png' })
await browser.close()
