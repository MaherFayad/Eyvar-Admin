/**
 * **T5.12 and T5.1's evidence, for the two queues this pass owns.**
 *
 * Prints, per route and per language: the widest identity line, how many
 * identity cells are clipped (`scrollWidth > clientWidth` must be 0), the
 * identity column's measured width, and the filled badges per row (H7 allows
 * at most two on Assurance).
 *
 *   node scripts/harness/queue-identity.mjs [label]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4347'
const LABEL = process.argv[2] ?? 'now'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const ROUTES = [
  ['mywork', '/operations/my-work'],
  ['assurance', '/operations/assurance'],
  ['assurance-all', '/operations/assurance?view=all'],
  ['assurance-nobackup', '/operations/assurance?view=no-backup-captain'],
]

/* Runs in the page. */
function probe() {
  const rows = [...document.querySelectorAll('tbody tr')].filter(
    (r) => r.querySelectorAll('td').length > 1,
  )

  const clipped = []
  const widest = { text: '', px: 0 }
  let identityWidth = 0
  const badgesPerRow = []

  for (const row of rows) {
    /* The identity is the only cell carrying a named link (`Identity` and
       `SubjectIdentity` both render one); its FIRST line is the identity. */
    const cell = [...row.querySelectorAll('td')].find((td) => td.querySelector('a[aria-label]'))
    if (cell) {
      identityWidth = Math.round(cell.getBoundingClientRect().width)
      const line = cell.querySelector('a[aria-label]')
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
    identityWidth,
    clipped,
    widest,
    maxFilledPerRow: badgesPerRow.length ? Math.max(...badgesPerRow.map((b) => b.length)) : 0,
    /* rows carrying 0, 1, 2, 3 … tone fills. H7's budget is per row. */
    fillHistogram: badgesPerRow.reduce((acc, b) => {
      acc[b.length] = (acc[b.length] ?? 0) + 1
      return acc
    }, {}),
    worstRow: badgesPerRow.slice().sort((a, b) => b.length - a.length)[0] ?? [],
    tableWidth: Math.round(document.querySelector('table')?.getBoundingClientRect().width ?? 0),
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
    const facts = await page.evaluate(probe)
    console.log(`\n== ${name} · ${language} · 1280 ==`)
    console.log(JSON.stringify(facts, null, 2))
    await page.screenshot({ path: `${OUT}/${LABEL}-${name}-${language}.png`, fullPage: false })
  }
}

if (errors.length) console.log('ERRORS', errors)
await ctx.close()
await browser.close()
