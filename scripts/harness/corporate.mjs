/**
 * **Corporate accounts, in Chromium.** T4.3, T5.4 and T9.6 all state claims
 * jsdom cannot check: a translated enum, a row pitch, a card height.
 *
 *   node scripts/harness/corporate.mjs after
 *
 * Prints, per language, at 1280: `raw` (index cells still carrying an English
 * enum or a `Day n` literal - must be 0), `pitch` (the distinct row heights of
 * the index table - must be one value), `twoLine` (index rows above two lines -
 * must be 0), and per detail card its height and its count of 12px muted
 * paragraphs (`smallText` - must be 0).
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4346'
const LABEL = process.argv[2] ?? 'after'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

/* Every English value the index used to print raw, plus the `Day` literal X2
   measured. Any of these in an Arabic cell is the defect T4.3 closes. */
const RAW = [
  'Monthly invoice',
  'Prepaid balance',
  'Active',
  'Trial',
  'Pending',
  'Suspended',
  'Day ',
  'of month',
  'Invoice overdue',
]

const browser = await chromium.launch()
const errors = []

async function measure(page, lang) {
  await page.goto(`${BASE}/operations/corporate`, { waitUntil: 'networkidle' })
  await page.waitForSelector('tbody tr', { timeout: 15000 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/corporate-index-${lang}-${LABEL}.png`, fullPage: true })

  const index = await page.evaluate((raws) => {
    const rows = [...document.querySelectorAll('tbody tr')]
    const heights = rows.map((r) => Math.round(r.getBoundingClientRect().height))
    const cells = rows.map((r) => [...r.querySelectorAll('td')].map((c) => c.innerText.trim()))
    const td = document.querySelector('tbody td')
    const lineHeight = parseFloat(getComputedStyle(td).lineHeight)
    /* Lines, per language's own line-height: X8's "rows wrap to two and three
       lines" is a count of lines, and Arabic's line box is taller than Latin's
       so a px threshold would answer a different question in each language. */
    const pad = (el) => {
      const cs = getComputedStyle(el)
      return {
        y: parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom),
        x: parseFloat(cs.paddingInlineStart) + parseFloat(cs.paddingInlineEnd),
      }
    }
    const linesIn = (el) => Math.round((el.scrollHeight - pad(el).y) / lineHeight)
    const cellLines = rows.map((r) =>
      Math.max(...[...r.querySelectorAll('td')].map((c) => linesIn(c))),
    )
    const headers = [...document.querySelectorAll('thead th')]
    /* Per column: how many row cells clip a value, and how much the widest one
       is short by. An element with `truncate` reports the full width it wanted
       in `scrollWidth`, so the shortfall is measured, not estimated. */
    const clipping = headers.map((h, i) => {
      let clipped = 0
      let short = 0
      for (const r of rows) {
        const cell = r.querySelectorAll('td')[i]
        if (!cell) continue
        for (const el of cell.querySelectorAll('*')) {
          const over = el.scrollWidth - el.clientWidth
          if (over > 1) {
            clipped += 1
            short = Math.max(short, over)
            break
          }
        }
      }
      const label = h.querySelector('span') ?? h
      return {
        column: h.innerText.trim().replace(/\s+/g, ' '),
        width: Math.round(h.getBoundingClientRect().width),
        clippedCells: clipped,
        shortBy: Math.round(short),
        headerClipped: label.scrollWidth - label.clientWidth > 1,
      }
    })
    return {
      dir: document.documentElement.dir,
      rows: rows.length,
      lineHeight,
      pitch: [...new Set(heights)].sort((a, b) => a - b),
      maxLines: Math.max(...cellLines),
      overTwoLines: cellLines.filter((n) => n > 2).length,
      /* The identity cell: how wide the company name wants to be, against the
         width the fitter gave it. T5.4 wants the second never smaller. */
      clipped: rows.filter((r) => {
        const el = r.querySelector('td a span')
        return el !== null && el.scrollWidth > el.clientWidth
      }).length,
      widestIdentity: Math.max(
        ...rows.map((r) => r.querySelector('td a span')?.scrollWidth ?? 0),
      ),
      identityWidth: rows[0]?.querySelector('td a span')?.clientWidth ?? 0,
      raw: cells
        .flat()
        .filter((text) => raws.some((s) => text.includes(s)))
        .slice(0, 8),
      clipping,
      sample: cells.slice(0, 3).map((c) => c.join(' | ').replace(/\n/g, ' / ')),
    }
  }, RAW)

  /* The busiest seeded account, so every card has content to be tall with. */
  await page.click('tbody tr:first-child td a')
  await page.waitForSelector('h1', { timeout: 15000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/corporate-detail-${lang}-${LABEL}.png`, fullPage: true })

  const detail = await page.evaluate((raws) => {
    const cards = [...document.querySelectorAll('[data-slot="card"]')]
    return {
      url: location.pathname,
      cards: cards.map((c) => ({
        title: (c.querySelector('[data-slot="card-title"]')?.innerText ?? '?')
          .replace(/\n/g, ' ')
          .slice(0, 40),
        height: Math.round(c.getBoundingClientRect().height),
        /* X15's own measure: a 12px muted paragraph inside a card. */
        /* A card TITLE may be 12px muted (H3's metric label); a paragraph in
           the body may not. */
        smallText: [...c.querySelectorAll('.text-xs.text-muted-foreground')].filter(
          (n) => n.closest('[data-slot="card-title"]') === null,
        ).length,
        /* §1.5 keeps icons off card titles. An `InfoHint` glyph sits inside a
           button, so it is not a title icon. */
        titleIcons: [...c.querySelectorAll('[data-slot="card-title"] svg')].filter(
          (n) => n.closest('button') === null,
        ).length,
      })),
      hints: document.querySelectorAll('[data-slot="card-title"] button').length,
      raw: [...document.querySelectorAll('h1, [data-slot="card"] *')]
        .map((n) => (n.childElementCount === 0 ? n.textContent.trim() : ''))
        .filter((text) => text && raws.some((s) => text.includes(s)))
        .slice(0, 8),
      meta: document.querySelector('header')?.innerText.replace(/\n/g, ' / '),
    }
  }, RAW)

  return { index, detail }
}

for (const lang of ['en', 'ar']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${lang}: ${String(e).slice(0, 300)}`))

  if (lang === 'ar') {
    await page.goto(`${BASE}/operations/corporate`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Account', exact: true }).click()
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await page.waitForTimeout(2000)
  }

  const facts = await measure(page, lang)
  console.log(`\n===== ${lang.toUpperCase()} @1280 (${LABEL}) =====`)
  console.log(JSON.stringify(facts, null, 2))
  await ctx.close()
}

if (errors.length) console.log('ERRORS', errors)
await browser.close()
