/**
 * WP-4.7, AC-1217 — printing a page. jsdom applies no `@media print` and
 * lays out no CSS grid, so this is the only proof that a printed page is one
 * column, that the scope bar and edit chrome are gone, and that the `asOf`
 * line survives under each report block. `DSH-1` migrates with a `columns`
 * block (two half tiles paired, `03-pages-and-dashboards.md §2`) plus a
 * `full` report, so it exercises the one-column collapse and carries three
 * `asOf` lines. Runs at English and `dir="rtl"` Arabic (RTL columns mirror
 * order, not the print rule itself).
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
const PAGE_ID = 'DSH-1'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

let failed = false
function check(name, condition, detail) {
  const mark = condition ? 'OK' : 'FAIL'
  console.log(`  [${mark}] ${name}${detail ? ' — ' + detail : ''}`)
  if (!condition) failed = true
}

async function run(label, { arabic = false, asOfPattern = /Computed \S/g } = {}) {
  console.log(`\n${label}`)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

  await page.goto(`${BASE}/management/reports/pages/${PAGE_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  if (arabic) {
    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await page.waitForTimeout(600)
  }

  /* View mode (the print flow: an operator prints a page, not a half-edited
     one) — confirm we did not land in edit mode by accident. */
  const editLabel = arabic ? 'تعديل' : 'Edit'
  check('opened in view mode', await page.getByRole('button', { name: editLabel }).count() === 1)

  /* Same media environment `page.pdf()` renders under — this reads the live
     DOM, `page.pdf()` below produces the actual file. */
  await page.emulateMedia({ media: 'print' })
  await page.waitForTimeout(200)

  const facts = await page.evaluate((patternSource) => {
    const root = document.querySelector('[data-pages-block-tree]')
    const grid = root?.querySelector('.grid-cols-12') ?? null
    const columnEls = grid ? [...grid.children] : []
    const columnBoxes = columnEls.map((el) => el.getBoundingClientRect())
    const bodyText = document.body.innerText
    const asOfCount = (bodyText.match(new RegExp(patternSource, 'g')) ?? []).length

    return {
      hasBlockTreeRoot: root !== null,
      gridDisplay: grid ? getComputedStyle(grid).display : null,
      columnCount: columnEls.length,
      /* One column: every column's own box spans (roughly) the same
         inline extent and stacks below the previous one — never
         side by side. */
      columnLefts: columnBoxes.map((b) => Math.round(b.left)),
      columnWidths: columnBoxes.map((b) => Math.round(b.width)),
      stacked: columnBoxes.every(
        (b, i) => i === 0 || b.top >= columnBoxes[i - 1].bottom - 1,
      ),
      asOfCount,
      scopeBarVisible: (() => {
        const bar = document.querySelector('[data-pages-scope-bar]')
        return bar !== null && bar.getClientRects().length > 0
      })(),
    }
  }, asOfPattern.source)

  check('the page carries the print scope hook', facts.hasBlockTreeRoot)
  check('the columns block collapses to block layout', facts.gridDisplay === 'block', `display=${facts.gridDisplay}`)
  check(
    'the two columns stack rather than sit side by side',
    facts.stacked && new Set(facts.columnLefts).size === 1,
    JSON.stringify({ lefts: facts.columnLefts, widths: facts.columnWidths }),
  )
  check('the asOf line survives under each report block', facts.asOfCount >= 3, `count=${facts.asOfCount}`)
  check('the scope bar does not print', !facts.scopeBarVisible)

  /* The real artifact — the proof jsdom cannot give at all. */
  const pdfPath = `${OUT}/${label}.pdf`
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true })
  console.log('  wrote', pdfPath)

  if (errors.length) console.log('  ERRORS', errors)
  await ctx.close()
}

await run('pages-print-en')
await run('pages-print-ar', { arabic: true, asOfPattern: /احتُسب \S/g })

await browser.close()
if (failed) {
  console.log('\nFAILED')
  process.exit(1)
}
console.log('\nOK')
