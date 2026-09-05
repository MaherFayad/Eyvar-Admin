/**
 * **Wave 2 People evidence.** jsdom does no table layout, so the three numbers
 * below can only be measured in a browser.
 *
 *   `blankSlaOwner`  T3.1 — empty `SLA` / `Owner` cells on the DEFAULT
 *                    Applications view. Must be 0: the default scope holds no
 *                    decided row, so nothing states not-applicable twice.
 *   `clippedExpiry`  T5.1 — Compliance `Next expiry` cells whose text is wider
 *                    than the column. Must be 0 at 1280 in both languages.
 *   `emDashes`       X14 — em dashes in the rendered page.
 *
 * Run the dev server on 4348 first: `npx vite --port 4348`.
 *
 *   node scripts/harness/people.mjs [label]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4348'
const LABEL = process.argv[2] ?? 'now'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const ROUTES = [
  ['applications', '/operations/people?view=applications'],
  ['compliance', '/operations/people?view=compliance'],
  ['applicant', '/operations/people/applications/APP-2205'],
]

/** Header label pairs, so a column is found by what the operator reads. */
const HEADERS = {
  en: { sla: 'SLA', owner: 'Owner', expiry: 'Next expiry' },
  ar: { sla: 'SLA', owner: 'المسؤول', expiry: 'أقرب انتهاء' },
}

async function measure(page, labels) {
  return page.evaluate((labels) => {
    const table = document.querySelector('table')
    const text = document.body.innerText
    const emDashes = (text.match(/—/g) ?? []).length
    if (!table) return { table: false, emDashes }

    const heads = [...table.querySelectorAll('thead th')]
    const at = (label) => heads.findIndex((th) => (th.innerText ?? '').trim().includes(label))
    const rows = [...table.querySelectorAll('tbody tr')]
    const cellsAt = (i) =>
      i < 0 ? [] : rows.map((r) => r.querySelectorAll('td')[i]).filter(Boolean)

    /* A cell is blank when it renders no text at all. */
    const blank = (cells) => cells.filter((td) => (td.innerText ?? '').trim() === '').length
    /* Clipped when the deepest text node is wider than the box that holds it. */
    const clipped = (cells) =>
      cells.filter((td) =>
        [td, ...td.querySelectorAll('*')].some((n) => n.scrollWidth > n.clientWidth + 1),
      ).length

    const sla = cellsAt(at(labels.sla))
    const owner = cellsAt(at(labels.owner))
    const expiry = cellsAt(at(labels.expiry))

    return {
      table: true,
      rows: rows.length,
      emDashes,
      blankSlaOwner: blank(sla) + blank(owner),
      expiryCells: expiry.length,
      expiryWidth: expiry[0] ? Math.round(expiry[0].getBoundingClientRect().width) : null,
      clippedExpiry: clipped(expiry),
      /* What the column would have to be: the widest text node plus the
         padding the cell already spends. */
      expiryNeeds: Math.max(
        0,
        ...expiry.map((td) => {
          const pad = td.getBoundingClientRect().width - td.clientWidth + 1
          const inner = Math.max(
            td.scrollWidth,
            ...[...td.querySelectorAll('*')].map((n) => n.scrollWidth),
          )
          return Math.ceil(inner + pad)
        }),
      ),
      firstRowStatus: rows[0]?.innerText?.replace(/\n/g, ' · ').slice(0, 90) ?? null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  }, labels)
}

const browser = await chromium.launch()
for (const language of ['en', 'ar']) {
  for (const [name, url] of ROUTES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))

    await page.goto(BASE + url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    if (language === 'ar') {
      await page.getByRole('button', { name: 'Account' }).click()
      await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
      await page.waitForTimeout(2600)
    }

    await page.screenshot({ path: `${OUT}/people-${name}-${language}-${LABEL}.png`, fullPage: true })
    const facts = await measure(page, HEADERS[language])
    console.log(`${name} ${language} ${LABEL}`, JSON.stringify(facts))
    if (errors.length) console.log(name, language, 'ERRORS', errors)
    await ctx.close()
  }
}
await browser.close()
