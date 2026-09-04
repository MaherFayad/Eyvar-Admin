/**
 * **T4.1's evidence.** The `Item` column of Operations › My Work in Arabic,
 * checked in the DOM rather than by eye: X2 measured `suspension-appeal — Reem
 * Al-Otaibi` and `Economy · 0 documents outstanding` reaching an Arabic table.
 *
 * `assembled` must be 0. It counts cells still carrying an English template or
 * a bare enum slug from `clients/myWork.ts`. What legitimately remains Latin is
 * printed separately as `verbatim`: a person's name, a place, a ticket subject.
 * Those are the record's own words (glossary R4), not this layer's.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4333'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))

await page.goto(`${BASE}/operations/my-work`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.getByRole('button', { name: 'Account' }).click()
await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
await page.waitForTimeout(2600)

await page.screenshot({ path: `${OUT}/mywork-ar.png`, fullPage: true })

const facts = await page.evaluate(() => {
  /* Column 0 is the selection checkbox; column 1 is `item`, the identity. */
  const cells = [...document.querySelectorAll('tbody tr')]
    .map((r) => r.querySelectorAll('td')[1]?.innerText?.trim() ?? '')
    .filter(Boolean)

  /* Everything `clients/myWork.ts` used to build itself, plus the four enum
     families it used to print as slugs. Any of these in a cell is the defect. */
  const ASSEMBLED = [
    'Captain application',
    'Ride request',
    'Subscription request',
    'Leg uncovered',
    'Unconfirmed leg',
    'documents outstanding',
    'no captain found',
    'Raised automatically',
    'Reporter ',
    'departs ',
    'suspension-appeal',
    'rating-dispute',
    'rider-report',
    'unsafe-driving',
    'no-drivers',
    'Economy',
    'Comfort',
    'Against ',
  ]

  const assembled = []
  const verbatim = []
  for (const text of cells) {
    const hits = ASSEMBLED.filter((s) => text.includes(s))
    if (hits.length > 0) assembled.push({ text, hits })
    else if (/[A-Za-z]{3,}/.test(text)) verbatim.push(text.split('\n')[0])
  }

  return {
    dir: document.documentElement.dir,
    lang: document.documentElement.lang,
    rows: cells.length,
    assembled,
    verbatim,
    sample: cells.slice(0, 5).map((c) => c.replace(/\n/g, ' / ')),
  }
})

console.log(JSON.stringify(facts, null, 2))
console.log('assembled English or enum slugs in the Item column:', facts.assembled.length)
if (errors.length) console.log('ERRORS', errors)
await ctx.close()
await browser.close()
