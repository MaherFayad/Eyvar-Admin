/**
 * **T5.1 and T5.12's evidence for My Work and Trip Assurance.**
 *
 * Per route and per language at 1280: every column's rendered width against the
 * widest thing in it, how many identity lines are clipped (`scrollWidth >
 * clientWidth`), and the filled badges per row (H7 allows at most two).
 *
 *   node scripts/harness/queue-identity.mjs [label]      # HARNESS_BASE=…
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4347'
const LABEL = process.argv[2] ?? 'now'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const ROUTES = [
  ['mywork', '/operations/my-work'],
  ['mywork-all', '/operations/my-work?view=everything'],
  ['assurance', '/operations/assurance'],
  ['assurance-all', '/operations/assurance?view=all'],
  ['assurance-absences', '/operations/assurance?view=absences'],
]

/* Runs in the page. */
function probe() {
  const rows = [...document.querySelectorAll('tbody tr')].filter(
    (r) => r.querySelectorAll('td').length > 1,
  )
  const heads = [...document.querySelectorAll('thead th')]

  /* Per column: the rendered width, and the widest laid-out content in it. A
     cell's content is its deepest inline boxes, so `scrollWidth` on the cell
     itself would report the clipped width rather than the wanted one. */
  const columns = heads.map((th, index) => {
    let widest = 0
    let widestText = ''
    let clips = 0
    for (const row of rows) {
      const cell = row.querySelectorAll('td')[index]
      if (!cell) continue
      /* The `td` is excluded on purpose: `table-fixed` gives it the declared
         width, so its own `scrollWidth` reports the box rather than the
         content. Only the inline boxes inside it know how wide they want. */
      let rowClips = false
      for (const node of cell.querySelectorAll('span, a, button')) {
        if (node.scrollWidth > node.clientWidth + 1 && node.clientWidth > 0) rowClips = true
        if (node.scrollWidth > widest) {
          widest = node.scrollWidth
          widestText = node.innerText.trim().split('\n')[0].slice(0, 60)
        }
      }
      if (rowClips) clips += 1
    }
    return {
      header: th.innerText.trim().slice(0, 18),
      width: Math.round(th.getBoundingClientRect().width),
      widest,
      widestText,
      clips,
    }
  })

  /* The identity is the only cell carrying a named link; its FIRST line is the
     identity itself (`Identity` and `SubjectIdentity` both render one). */
  const clipped = []
  const widest = { text: '', px: 0 }
  const badgesPerRow = []

  for (const row of rows) {
    const line = row.querySelector('td a[aria-label]')
    if (line) {
      if (line.scrollWidth > line.clientWidth + 1) {
        clipped.push({
          text: line.innerText.trim().slice(0, 70),
          scroll: line.scrollWidth,
          client: line.clientWidth,
        })
      }
      if (line.scrollWidth > widest.px) {
        widest.px = line.scrollWidth
        widest.text = line.innerText.trim().slice(0, 70)
      }
    }
    /* H7 counts tone FILLS: a `[data-slot=badge]` whose tone actually paints.
       An outline or ghost treatment is not a fill. */
    const filled = []
    for (const el of row.querySelectorAll('td [data-slot="badge"]')) {
      const bg = getComputedStyle(el).backgroundColor
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        filled.push(`${el.getAttribute('data-tone')}:${el.innerText.trim().slice(0, 22)}`)
      }
    }
    badgesPerRow.push(filled)
  }

  return {
    rows: rows.length,
    tableWidth: Math.round(document.querySelector('table')?.getBoundingClientRect().width ?? 0),
    columns,
    clippedCount: clipped.length,
    clipped: clipped.slice(0, 6),
    widest,
    maxFilledPerRow: badgesPerRow.length ? Math.max(...badgesPerRow.map((b) => b.length)) : 0,
    /* Rows carrying 0, 1, 2, 3 … tone fills. H7's budget is per row. */
    fillHistogram: badgesPerRow.reduce((acc, b) => {
      acc[b.length] = (acc[b.length] ?? 0) + 1
      return acc
    }, {}),
    worstRow: badgesPerRow.slice().sort((a, b) => b.length - a.length)[0] ?? [],
    dir: document.documentElement.dir,
  }
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))

for (const language of ['en', 'ar']) {
  if (language === 'ar') {
    await page.goto(`${BASE}/operations/my-work`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await page.waitForTimeout(2000)
  }
  for (const [name, route] of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1400)
    const f = await page.evaluate(probe)
    console.log(`\n== ${name} · ${language} · 1280 · table ${f.tableWidth} · ${f.rows} rows ==`)
    for (const c of f.columns) {
      console.log(
        `   ${c.header.padEnd(18)} w=${String(c.width).padStart(4)}  widest=${String(c.widest).padStart(4)}  clipped=${String(c.clips).padStart(2)}/${f.rows}  ${c.widestText}`,
      )
    }
    console.log(`   identity clipped ${f.clippedCount}/${f.rows}, widest ${f.widest.px}px "${f.widest.text}"`)
    for (const c of f.clipped) console.log(`     clip ${c.scroll}>${c.client} ${c.text}`)
    console.log(`   fills/row max ${f.maxFilledPerRow} ${JSON.stringify(f.fillHistogram)} worst ${JSON.stringify(f.worstRow)}`)
    await page.screenshot({ path: `${OUT}/${LABEL}-${name}-${language}.png`, fullPage: false })
  }
}

if (errors.length) console.log('ERRORS', errors)
await ctx.close()
await browser.close()
