/**
 * The analyst (WP-7.4, AC-1268) — the index with the composer, a running
 * job's live timeline, and a done job's result plus its Provenance rail, in
 * both languages. jsdom draws none of this: no `role="log"` live region, no
 * `Collapsible` open/close, no RTL mirroring of the main+rail grid.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

async function toArabic(page) {
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await page.waitForTimeout(600)
}

async function shootIndex(name, { arabic = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })

  await page.goto(`${BASE}/management/reports?view=analyst`, { waitUntil: 'networkidle' })
  if (arabic) await toArabic(page)
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/${name}-index.png`, fullPage: true })

  const facts = await page.evaluate(() => ({
    rows: document.querySelectorAll('table tbody tr').length,
    badges: Array.from(document.querySelectorAll('main')).length > 0,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
  console.log(name, 'index', JSON.stringify(facts))
  if (errors.length) console.log(name, 'ERRORS', errors)
  await ctx.close()
}

/** `AGT-2` — the seeded `running` job (`fixtures/agent.ts`), so the timeline
    has live steps without needing a real runner. */
async function shootRunning(name, { arabic = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

  await page.goto(`${BASE}/management/reports/analyst/AGT-2`, { waitUntil: 'networkidle' })
  if (arabic) await toArabic(page)
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/${name}-running.png`, fullPage: true })

  const facts = await page.evaluate(() => {
    const log = document.querySelector('[role="log"]')
    return {
      hasLog: log !== null,
      ariaLive: log?.getAttribute('aria-live') ?? null,
      steps: log ? log.children.length : 0,
    }
  })
  console.log(name, 'running', JSON.stringify(facts))
  if (errors.length) console.log(name, 'ERRORS', errors)
  await ctx.close()
}

/** `AGT-1` — the one seeded `done` job with a real case-study page and a
    saved report (`RPT-5`) behind its one finding's chart, so Provenance has
    something real to list. */
async function shootDone(name, { arabic = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

  await page.goto(`${BASE}/management/reports/analyst/AGT-1`, { waitUntil: 'networkidle' })
  if (arabic) await toArabic(page)
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${name}-done.png`, fullPage: true })

  const openInBuilder = page.getByRole('link', { name: arabic ? 'فتح في المُنشئ' : 'Open in builder' })
  const facts = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
  console.log(name, 'done', JSON.stringify(facts), 'openInBuilder count', await openInBuilder.count())
  if (errors.length) console.log(name, 'ERRORS', errors)
  await ctx.close()
}

await shootIndex('analyst-en')
await shootIndex('analyst-ar', { arabic: true })
await shootRunning('analyst-en')
await shootRunning('analyst-ar', { arabic: true })
await shootDone('analyst-en')
await shootDone('analyst-ar', { arabic: true })

await browser.close()
