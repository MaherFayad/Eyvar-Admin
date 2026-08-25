import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:5199/operations/people'
const width = Number(process.argv[3] ?? 1280)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)

const out = await page.evaluate(() => {
  const box = (el) => (el ? el.getBoundingClientRect().height : null)
  const rows = [...document.querySelectorAll('tbody tr')].slice(0, 6)
  const cells = rows[1] ? [...rows[1].querySelectorAll('td')] : []
  return {
    rowHeights: rows.map((r) => r.getBoundingClientRect().height),
    header: box(document.querySelector('thead tr')),
    cellHeights: cells.map((c) => ({
      h: c.getBoundingClientRect().height,
      pt: getComputedStyle(c).paddingTop,
      pb: getComputedStyle(c).paddingBottom,
      minH: getComputedStyle(c).height,
      inner: c.firstElementChild
        ? c.firstElementChild.getBoundingClientRect().height
        : null,
      deep: c.firstElementChild?.firstElementChild
        ? c.firstElementChild.firstElementChild.getBoundingClientRect().height
        : null,
      text: c.textContent.slice(0, 14),
    })),
    toolbar: box(document.querySelector('[data-slot="table-container"]')?.previousElementSibling),
    badge: box(document.querySelector('tbody [data-slot="badge"]')),
  }
})

console.log(JSON.stringify(out, null, 1))
await browser.close()
