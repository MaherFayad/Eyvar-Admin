/** How many card frames does the cohort tile draw? Counted, then photographed. */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5411'
const OUT = './scratch/shots-n2'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1400 } })
await page.goto(`${BASE}/management/reports/dashboards/DSH-3`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('table', { timeout: 25000 })
await page.waitForTimeout(1500)

console.log(
  JSON.stringify(
    await page.evaluate(() =>
      [...document.querySelectorAll('li')]
        .filter((li) => li.querySelector('[data-slot="card"]'))
        .map((li) => ({
          title: li.querySelector('[data-slot="card-title"]')?.innerText.trim(),
          cards: li.querySelectorAll('[data-slot="card"]').length,
          panelFrames: li.querySelectorAll('[data-slot="panel-frame"]').length,
          borders: [...li.querySelectorAll('[data-slot="card"]')].map((c) =>
            getComputedStyle(c).borderTopWidth,
          ),
        })),
    ),
    null,
    1,
  ),
)

const tile = page.locator('li', { hasText: 'Rider retention by joining month' }).last()
await tile.screenshot({ path: `${OUT}/tile-cohort.png` })
await browser.close()
