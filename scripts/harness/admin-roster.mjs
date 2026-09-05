/**
 * Team & Access roster on `DataTable` (ADMIN-WORKSPACE-PLAN T7.1, T2.6).
 *
 * Prints, in English and Arabic at 1280: the column headers, how many identity
 * cells clip, the horizontal overflow, the tallest row, whether every row has
 * its kebab, and the Limits pane's per-role cap fields. Navigates in-app so the
 * mock session survives (see `admin-access.mjs`).
 *
 *   npx vite --port 4327
 *   node scripts/harness/admin-roster.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

const nav = async (path) => {
  await page.evaluate((p) => {
    history.pushState({}, '', p)
    dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForTimeout(1800)
}

const rosterFacts = () =>
  page.evaluate(() => {
    const table = document.querySelector('table')
    const rows = [...document.querySelectorAll('tbody tr')]
    const headers = [...document.querySelectorAll('thead th')].map((th) => th.textContent?.trim()).filter(Boolean)
    const identity = rows.map((r) => r.querySelector('td:nth-child(2) button'))
    return {
      headers,
      colWidths: [...document.querySelectorAll('thead th')].map((th) => Math.round(th.getBoundingClientRect().width)),
      rows: rows.length,
      identityClipped: identity.filter((b) => b && b.scrollWidth > b.clientWidth + 1).length,
      kebabs: rows.filter((r) => r.querySelector('button[aria-label*="actions"], button[aria-label*="إجراءات"]')).length,
      tallestRow: rows.length ? Math.max(...rows.map((r) => Math.round(r.getBoundingClientRect().height))) : null,
      tableWidth: table ? Math.round(table.getBoundingClientRect().width) : null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      search: !!document.querySelector('input[type=search], input[placeholder]'),
      roleDefaultLines: (document.body.innerText.match(/Role default|افتراضي الدور/g) ?? []).length,
    }
  })

const limitsFacts = () =>
  page.evaluate(() => ({
    capFields: [...document.querySelectorAll('input[id^="limits-cap-"]')].map((i) => [i.id, i.value]),
  }))

await page.goto(BASE + '/admin/overview', { waitUntil: 'load', timeout: 120_000 })
await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 60_000 })
await page.waitForTimeout(1500)

await nav('/admin/team')
console.log('roster-en', JSON.stringify(await rosterFacts()))
await page.screenshot({ path: `${OUT}/admin-roster-en.png` })

await nav('/admin/policy?view=limits')
console.log('limits-en', JSON.stringify(await limitsFacts()))
await page.screenshot({ path: `${OUT}/admin-limits-en.png` })

/* Arabic through the account menu's own radio. */
await page.getByRole('button', { name: 'Account', exact: true }).click()
await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
await page.waitForTimeout(2000)
await nav('/admin/team')
console.log('roster-ar', JSON.stringify({ dir: await page.evaluate(() => document.documentElement.dir), ...(await rosterFacts()) }))
await page.screenshot({ path: `${OUT}/admin-roster-ar.png` })

if (errors.length) console.log('ERRORS', errors)
await browser.close()
