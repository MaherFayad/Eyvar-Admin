import { chromium } from 'playwright'
const BASE = 'http://localhost:4325'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
await page.goto(`${BASE}/management/reports`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.locator('header button').last().click()
await page.getByRole('menuitemradio', { name: /arabic|العربية/i }).click()
await page.waitForTimeout(1500)
await page.goto(`${BASE}/management/reports/RPT-1`, { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)

const info = await page.evaluate(() => {
  const card = [...document.querySelectorAll('[data-slot="card"]')].find((c) => c.querySelector('a[data-slot="panel-action"]'))
  const a = card?.querySelector('a[data-slot="panel-action"]')
  const plot = card?.querySelector('[role="img"]')
  const table = document.querySelector('table')
  const heads = table ? [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim()) : []
  return {
    dir: document.documentElement.dir,
    action: a?.innerText,
    actionSvgClass: a?.querySelector('svg')?.getAttribute('class'),
    plotDir: plot?.getAttribute('dir'),
    partial: document.querySelectorAll('.recharts-partial-bucket').length,
    headFirst: heads[0], headLast: heads[heads.length - 1],
    lastCellAlign: table ? getComputedStyle(table.querySelector('tbody td:last-child')).textAlign : null,
  }
})
console.log(JSON.stringify(info, null, 1))
const card = page.locator('[data-slot="card"]').filter({ has: page.locator('a[data-slot="panel-action"]') }).first()
await card.scrollIntoViewIfNeeded()
await card.screenshot({ path: './scratch/shots-partial/ar.card.png' })
const tbl = page.locator('table').first()
await tbl.scrollIntoViewIfNeeded()
await tbl.screenshot({ path: './scratch/shots-partial/ar.table.png' })
await browser.close()
