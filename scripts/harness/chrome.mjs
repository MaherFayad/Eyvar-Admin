/**
 * **T9.16 — the chrome numbers, per route.** X14 (em dashes), X15 (explanatory
 * 12px text left inline), X16 and X17 (a font glyph where an icon belongs, and
 * two *Back* controls) and X19 (a table row that has become a paragraph) are
 * all counts, and none survives jsdom: `innerText`, visibility and a row's
 * height are layout.
 *
 *   npx vite build && npx vite preview --port 4362
 *   HARNESS_BASE=http://localhost:4362 node scripts/harness/chrome.mjs [label]
 *
 * Every Management and Operations route from `ops-routes.routes.mjs`, both
 * languages, at 1280 x 800. Prints a table and writes `.tmp/chrome-<label>.json`,
 * which carries the samples the table has no room for: the lines holding an em
 * dash, the 12px sentences, and the tallest row's own text.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { ROUTES } from './ops-routes.routes.mjs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const LABEL = process.argv[2] ?? 'now'
const TMP = './.tmp'
const SHOTS = './scripts/harness/shots'
mkdirSync(TMP, { recursive: true })
mkdirSync(SHOTS, { recursive: true })

function probe() {
  const EM = '—'
  const visible = (el) =>
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== 'hidden' &&
    !el.classList.contains('sr-only') &&
    el.closest('.sr-only') === null

  /* `innerText` and not `textContent`: X14 counts what an operator READS, and
     `textContent` would add every screen-reader clause and every hidden tab. */
  const text = document.body.innerText
  const emDashes = text.split(EM).length - 1
  const emDashLines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes(EM))
    .slice(0, 12)

  /* X15's measure. A card TITLE may be 12px muted (H3's metric label); a
     paragraph in a card body or inside a cell may not. The exclusion is
     `corporate.mjs`'s, so the two harnesses count the same thing. */
  const small = [...document.querySelectorAll('.text-xs.text-muted-foreground')].filter(
    (n) => visible(n) && n.closest('[data-slot="card-title"]') === null,
  )
  const smallInCards = small.filter((n) => n.closest('[data-slot="card"]') !== null)
  /* `td` and `th` are counted apart. A column header IS 12px muted by design
     (§8.3.1) and X15 is about explanatory sentences, so folding the two would
     report a defect on every table that has headers. */
  const smallInCells = small.filter((n) => n.closest('td') !== null)
  const smallInHeaders = small.filter((n) => n.closest('th') !== null)

  /* X16 — a control whose whole visible content is one non-alphanumeric glyph
     drawn in the text font: the back arrow, the pager and feed chevrons, the
     sort arrows, the row menu, the check. An icon button carries an `svg` and
     no text, so it never matches. */
  const buttons = [...document.querySelectorAll('button')]
  const glyphButtons = buttons
    .filter((b) => visible(b))
    .map((b) => (b.textContent ?? '').trim())
    .filter((t) => t.length > 0 && t.length <= 2 && !/[\p{L}\p{N}]/u.test(t))

  /* X16's second half: `PageHeader` and `TopBar` each drew one on a detail
     page. Two is the defect, and the accessible name is all they share. */
  const nameOf = (b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim()
  const backControls = buttons.filter((b) => visible(b) && /^(Back|رجوع)$/.test(nameOf(b)))

  /* X17 — lucide tags its own output `lucide lucide-<name>`. Every other `svg`
     is a chart or a map, so the count is only meaningful beside the glyphs it
     is supposed to have replaced. */
  const svgs = [...document.querySelectorAll('svg')]
  const lucide = svgs.filter((s) => (s.getAttribute('class') ?? '').includes('lucide'))

  const rows = [...document.querySelectorAll('tbody tr')]
  const heights = rows.map((r) => Math.round(r.getBoundingClientRect().height))
  const tallest = heights.length ? Math.max(...heights) : 0
  const tallestRow = rows[heights.indexOf(tallest)]

  return {
    dir: document.documentElement.dir,
    emDashes,
    emDashLines,
    smallInCards: smallInCards.length,
    smallInCells: smallInCells.length,
    smallInHeaders: smallInHeaders.length,
    smallTotal: small.length,
    /* Samples come from the cards and the cells, never the headers, so each
       one names a sentence a fix would move behind an `InfoHint`. */
    smallSamples: [...smallInCards, ...smallInCells]
      .slice(0, 8)
      .map((n) => n.innerText.replace(/\s+/g, ' ').slice(0, 70)),
    glyphButtons: glyphButtons.length,
    glyphSamples: [...new Set(glyphButtons)],
    backControls: backControls.length,
    backNames: backControls.map(nameOf),
    lucideSvgs: lucide.length,
    allSvgs: svgs.length,
    rows: rows.length,
    tallestRow: tallest,
    medianRow: heights.length
      ? [...heights].sort((a, b) => a - b)[Math.floor(heights.length / 2)]
      : 0,
    tallestRowText: tallestRow ? (tallestRow.innerText ?? '').replace(/\s+/g, ' ').slice(0, 90) : null,
  }
}

const browser = await chromium.launch()
const results = []
const shots = []
const pageErrors = []

for (const lang of ['en', 'ar']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => pageErrors.push(`${lang}: ${String(e).slice(0, 200)}`))

  await page.goto(`${BASE}/operations/overview`, { waitUntil: 'networkidle' })
  if (lang === 'ar') {
    await page.getByRole('button', { name: 'Account', exact: true }).click()
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await page.waitForTimeout(1500)
  }

  for (const route of ROUTES) {
    await page.goto(BASE + route.path, { waitUntil: 'networkidle' })
    await page.waitForSelector('h1', { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(700)
    const facts = await page.evaluate(probe)
    results.push({ route: route.id, lang, ...facts })

    if (
      facts.emDashes > 0 ||
      facts.glyphButtons > 0 ||
      facts.backControls > 1 ||
      facts.smallInCards > 0 ||
      facts.smallInCells > 0
    ) {
      const path = `${SHOTS}/chrome-${route.id}-${lang}-${LABEL}.png`
      await page.screenshot({ path, fullPage: false })
      shots.push(path)
    }
  }
  await ctx.close()
}
await browser.close()

const pad = (s, n) => String(s).padEnd(n).slice(0, n)
const cols = [
  ['route', 24],
  ['lang', 4],
  ['emDash', 6],
  ['xsCard', 6],
  ['xsCell', 6],
  ['xsHead', 6],
  ['xsAll', 5],
  ['glyphBtn', 8],
  ['back', 4],
  ['lucide', 6],
  ['svgAll', 6],
  ['rows', 4],
  ['medRow', 6],
  ['tallRow', 7],
]
console.log(cols.map(([n, w]) => pad(n, w)).join(' '))
console.log(cols.map(([, w]) => '-'.repeat(w)).join(' '))
for (const r of results) {
  console.log(
    [
      pad(r.route, 24),
      pad(r.lang, 4),
      pad(r.emDashes, 6),
      pad(r.smallInCards, 6),
      pad(r.smallInCells, 6),
      pad(r.smallInHeaders, 6),
      pad(r.smallTotal, 5),
      pad(r.glyphButtons, 8),
      pad(r.backControls, 4),
      pad(r.lucideSvgs, 6),
      pad(r.allSvgs, 6),
      pad(r.rows, 4),
      pad(r.medianRow, 6),
      pad(r.tallestRow, 7),
    ].join(' '),
  )
}

const sum = (k) => results.reduce((a, r) => a + r[k], 0)
console.log(
  `\ntotals across ${results.length} route-language pairs: ` +
    `emDash ${sum('emDashes')} · xs-in-card ${sum('smallInCards')} · ` +
    `xs-in-cell ${sum('smallInCells')} · glyph buttons ${sum('glyphButtons')} · ` +
    `routes drawing two Back controls ${results.filter((r) => r.backControls > 1).length}`,
)

const out = `${TMP}/chrome-${LABEL}.json`
writeFileSync(out, JSON.stringify({ base: BASE, label: LABEL, results, shots }, null, 2))
console.log(`JSON: ${out}`)
if (shots.length) console.log(`shots:\n${shots.join('\n')}`)
if (pageErrors.length) console.log(`\npage errors:\n${pageErrors.join('\n')}`)
