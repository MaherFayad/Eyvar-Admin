/**
 * The analyst (WP-7.4, AC-1268; extended WP-7.7 — dark theme, every job
 * state, a computed-colour red scan and the entry-point prefill check) — the
 * index with the composer, a running job's live timeline, and a done job's
 * result plus its Provenance rail, in both languages and both themes. jsdom
 * draws none of this: no `role="log"` live region, no `Collapsible`
 * open/close, no RTL mirroring of the main+rail grid, no computed colour.
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

async function toDark(page) {
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitemradio', { name: 'Dark' }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
}

/** Every element's resolved colour, walked the same way `alerts-v2-proof.mjs`'s
    Check 4 does — a saturated red channel dominant over green and blue is the
    R7 violation this harness exists to catch, never a class-name grep. */
async function scanForRed(page) {
  return page.evaluate(() => {
    const bad = []
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      for (const prop of ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke']) {
        const v = cs[prop]
        const m = v && v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (m) {
          const [r, g, b] = m.slice(1).map(Number)
          if (r > 150 && r - g > 60 && r - b > 60) bad.push(`${el.tagName}.${el.className}:${prop}=${v}`)
        }
      }
    }
    return bad.slice(0, 10)
  })
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

/** Every non-`done`/`running` seeded state (`fixtures/agent.ts`): queued,
    deferred, and the three `failed:*` reasons — the state badge's tone and
    the "why" sentence, never a red pixel, in both themes. */
async function shootState(jobId, label, { dark = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

  await page.goto(`${BASE}/management/reports/analyst/${jobId}`, { waitUntil: 'networkidle' })
  if (dark) await toDark(page)
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/analyst-state-${label}.png`, fullPage: true })

  const badge = await page.locator('[data-slot="badge"], .rounded-full', { hasText: /./ }).first().textContent().catch(() => null)
  const red = await scanForRed(page)
  console.log('state', jobId, label, 'badgeText', badge, 'redHits', red.length, red)
  if (errors.length) console.log('state', jobId, label, 'ERRORS', errors)
  await ctx.close()
}

/** F-V2-90 — does Provenance list *every* run the study's own evidence cites,
    or only the runs that happen to back a rendered chart? Reads the
    finding-evidence prose (which names every `runId` in text, per
    `caseStudyToBlocks`'s `formatValueLine`) and the Provenance rail
    independently, then diffs them. */
async function checkProvenanceCompleteness() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/management/reports/analyst/AGT-1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  const facts = await page.evaluate(() => {
    const bodyText = document.querySelector('main')?.textContent ?? ''
    const citedRunIds = Array.from(new Set(Array.from(bodyText.matchAll(/\bRUN-\d+\b/g)).map((m) => m[0])))
    const provenanceHeading = Array.from(document.querySelectorAll('h2')).find((h) => h.textContent === 'Provenance')
    const rail = provenanceHeading?.closest('div')
    const provenanceEntries = rail ? rail.querySelectorAll('a').length : 0
    const provenanceText = rail?.textContent ?? ''
    const runIdsShownInProvenance = citedRunIds.filter((id) => provenanceText.includes(id))
    return { citedRunIds, provenanceEntries, runIdsShownInProvenance }
  })
  console.log('provenance-completeness', JSON.stringify(facts))
  await ctx.close()
}

/** AC-1262 — the alert-history entry point (`AlertFeedView.tsx:244`) carries
    `firingId` on the URL. Does the composer that lands actually attach it? */
async function checkEntryPointPrefill() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/management/reports?view=analyst&firingId=AFR-1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const facts = await page.evaluate(() => ({
    chips: document.querySelectorAll('.rounded-control').length,
    questionValue: document.querySelector('textarea')?.value ?? null,
  }))
  console.log('entry-point-prefill firingId=AFR-1', JSON.stringify(facts))
  await ctx.close()
}

await shootIndex('analyst-en')
await shootIndex('analyst-ar', { arabic: true })
await shootRunning('analyst-en')
await shootRunning('analyst-ar', { arabic: true })
await shootDone('analyst-en')
await shootDone('analyst-ar', { arabic: true })

await shootState('AGT-7', 'queued')
await shootState('AGT-3', 'deferred')
await shootState('AGT-4', 'failed-evidence')
await shootState('AGT-5', 'failed-timeout')
await shootState('AGT-6', 'failed-schema')
await shootState('AGT-1', 'done-dark', { dark: true })
await shootState('AGT-2', 'running-dark', { dark: true })

await checkProvenanceCompleteness()
await checkEntryPointPrefill()

await browser.close()
