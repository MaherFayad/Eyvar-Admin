/** The cohort tile, in Arabic, on a board — one frame, mirrored chrome. */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5411'
const OUT = './scratch/shots-n2'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1400 } })
await page.goto(`${BASE}/management/reports/dashboards/DSH-3`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('table', { timeout: 25000 })

await page.locator('header button').last().click()
await page.waitForTimeout(400)
const ar = page
  .locator('[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]')
  .filter({ hasText: /عرب|Arabic|العربية/ })
if (await ar.count()) await ar.first().click()
else console.log('NO ARABIC ITEM')
await page.waitForTimeout(2500)
await page.waitForSelector('table', { timeout: 25000 })
await page.waitForTimeout(1000)

console.log('dir =', await page.evaluate(() => document.documentElement.getAttribute('dir')))
console.log(
  JSON.stringify(
    await page.evaluate(() =>
      [...document.querySelectorAll('li')]
        .filter((li) => li.querySelector('[data-slot="card"]'))
        .map((li) => ({
          title: li.querySelector('[data-slot="card-title"]')?.innerText.trim(),
          cards: li.querySelectorAll('[data-slot="card"]').length,
          head: li.querySelector('table')
            ? [...li.querySelectorAll('table thead th')].map((c) => c.innerText.trim())
            : null,
          /* The first header cell's box: in Arabic it must sit at the RIGHT. */
          firstHeadRight: li.querySelector('table thead th')
            ? Math.round(li.querySelector('table thead th').getBoundingClientRect().right)
            : null,
          tableRight: li.querySelector('table')
            ? Math.round(li.querySelector('table').getBoundingClientRect().right)
            : null,
        })),
    ),
    null,
    1,
  ),
)

/* No physical-direction utility may have arrived with the new branch. */
console.log(
  'physical utilities in the board subtree:',
  await page.evaluate(() => {
    const bad = /(^|\s)(ml-|mr-|pl-|pr-|left-|right-|border-l|border-r|text-left|text-right|float-)/
    return [...document.querySelectorAll('main *')]
      .map((el) => el.getAttribute('class') ?? '')
      .filter((c) => bad.test(c))
      .slice(0, 10)
  }),
)

const tile = page.locator('li').filter({ has: page.locator('table') }).last()
await tile.screenshot({ path: `${OUT}/tile-cohort-rtl.png` })
await browser.close()
