/**
 * The rider wallet ledger drill-in, measured and captured. jsdom lays out no
 * table and paints no ink, so AC-RW-08, -09, -17, -18 and -20 are only ever
 * checked here.
 *
 *   npx vite --port 4327
 *   HARNESS_BASE=http://localhost:4327 node scripts/harness/fin-wallet-ledger.mjs [theme] [lang] [tag]
 *
 * Prints one JSON block. Exits non-zero if the page scrolls sideways at 1280,
 * if the header block runs wider than the table it heads, if `Balance` and
 * `Pending` stop being peer figures, if a tone lands on money, or if the
 * Arabic header still carries an English run.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const THEME = process.argv[2] ?? 'light'
const LANG = process.argv[3] ?? 'en'
const TAG_SUFFIX = process.argv[4] ?? ''
const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
const TAG = `wallet-ledger-${THEME}-${LANG}${TAG_SUFFIX ? `-${TAG_SUFFIX}` : ''}`
const ROUTE = '/financials/rider-wallets'
/* Nora Al-Harbi: 20.00 balance against 120.00 pending, which is the rider the
   spec's §6 argument turns on. */
const RIDER = 'RDR-1041'
mkdirSync(OUT, { recursive: true })

const helpers = () => {
  window.__box = (n) => {
    if (!n) return null
    const b = n.getBoundingClientRect()
    return {
      x: Math.round(b.x),
      y: Math.round(b.y + window.scrollY),
      w: Math.round(b.width),
      h: Math.round(b.height),
    }
  }
  /* The inline-start edge, so one number reads the same in both directions. */
  window.__start = (n) => {
    if (!n) return null
    const b = n.getBoundingClientRect()
    return Math.round(document.dir === 'rtl' ? window.innerWidth - b.right : b.left)
  }
  window.__hex = (css) => {
    const m = css.match(/([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
    if (/rgba\([^)]*,\s*0\s*\)/.test(css)) return 'transparent'
    return m ? '#' + [m[1], m[2], m[3]].map((c) => (+c).toString(16).padStart(2, '0')).join('') : css
  }
  window.__runs = (root) =>
    [...root.querySelectorAll('*')]
      .filter((n) => n.children.length === 0 && n.textContent.trim() !== '')
      .map((n) => n.textContent.trim())
}

/* Everything above the first table row, plus the two figures and the line
   under them. One probe, because the spec's whole claim is about how those
   pieces sit relative to each other. */
const headerProbe = () => {
  const main = document.querySelector('main') ?? document.body
  const h1 = main.querySelector('h1')
  const titleRow = h1?.parentElement?.parentElement ?? null
  const back = titleRow?.querySelector('button') ?? null
  const backIsFirst = back
    ? [
        ...main.querySelectorAll(
          'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])',
        ),
      ].filter((n) => !n.closest('.sr-only'))[0] === back
    : null
  const meta = titleRow?.parentElement?.querySelector(':scope > p') ?? null
  const block = main.querySelector('[data-slot="ledger-header"]')
  const figures = block
    ? [...block.querySelectorAll('[data-slot="metric-value"]')].map((v) => v.closest('div'))
    : []
  const table = main.querySelector('table')
  const firstRow = table?.querySelector('tbody tr')
  const search = main.querySelector('input[type="search"],input[role="searchbox"]') ??
    main.querySelector('input')
  const sentence = block?.querySelector('p') ?? null

  const figureOf = (node) => {
    if (!node) return null
    const label = node.querySelector('span')
    const value = node.querySelector('[data-slot="metric-value"]')
    const cs = getComputedStyle(value)
    return {
      label: label?.textContent.trim() ?? null,
      labelSize: label ? parseFloat(getComputedStyle(label).fontSize) : null,
      text: node.textContent.trim(),
      fontSize: parseFloat(cs.fontSize),
      fontWeight: cs.fontWeight,
      colour: window.__hex(cs.color),
      badges: node.querySelectorAll('[data-slot="badge"]').length,
      start: window.__start(node),
      box: window.__box(node),
    }
  }

  return {
    dir: document.dir,
    lang: document.documentElement.getAttribute('lang'),
    /* AC-RW-01 / -02 / -19 — one control, in slot 1, naming its destination. */
    back: back
      ? {
          tag: back.tagName,
          label: back.getAttribute('aria-label'),
          /* O10 — the icon is picked by `dir` in code, never rotated in CSS. */
          iconPath: back.querySelector('svg path,svg line,svg polyline')?.getAttribute('d') ?? null,
          transform: getComputedStyle(back.querySelector('svg')).transform,
          firstFocusable: backIsFirst,
          box: window.__box(back),
          start: window.__start(back),
        }
      : null,
    backControls: [...main.querySelectorAll('button[aria-label]')].filter((b) =>
      /^(Back|العودة)/.test(b.getAttribute('aria-label') ?? ''),
    ).length,
    /* AC-RW-04 / -05 — the record in the title, its id in the meta. */
    title: h1 ? { text: h1.textContent.trim(), box: window.__box(h1), start: window.__start(h1) } : null,
    titleSize: h1 ? parseFloat(getComputedStyle(h1).fontSize) : null,
    meta: meta ? { text: meta.textContent.trim(), box: window.__box(meta), start: window.__start(meta) } : null,
    /* AC-RW-06 — the row that held the old text link is not in the document. */
    viewRow: window.__box(document.querySelector('[data-slot="view-row"]')),
    /* AC-RW-07 — no subject heading on a party ledger. */
    h2s: [...main.querySelectorAll('h2')].map((h) => h.textContent.trim()),
    /* AC-RW-08 — two peer figures, in order, 32px apart. */
    block: window.__box(block),
    blockStart: window.__start(block),
    figures: figures.map(figureOf),
    figureGap: block ? getComputedStyle(block.querySelector('div')).columnGap : null,
    /* AC-RW-10 — one line, however many sentences. */
    sentence: sentence
      ? {
          text: sentence.textContent.trim(),
          runs: window.__runs(sentence),
          fontSize: parseFloat(getComputedStyle(sentence).fontSize),
          colour: window.__hex(getComputedStyle(sentence).color),
          lines: Math.round(
            sentence.getBoundingClientRect().height /
              parseFloat(getComputedStyle(sentence).lineHeight),
          ),
          start: window.__start(sentence),
        }
      : null,
    /* AC-RW-17 — every run in the header block, so an English literal in an
       Arabic page is visible rather than argued about. */
    headerRuns: block ? window.__runs(block) : [],
    titleRuns: h1 ? [h1.textContent.trim(), meta?.textContent.trim() ?? ''] : [],
    /* AC-RW-18 — the block never runs wider than the ledger it heads. */
    tableWidth: table ? Math.round(table.getBoundingClientRect().width) : null,
    tableStart: window.__start(table),
    /* The measure the owner's brief is about: what is spent above row one. */
    toolbarY: window.__box(search)?.y ?? null,
    toolbarStart: window.__start(search),
    firstRowY: window.__box(firstRow)?.y ?? null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    /* Every distinct inline-start edge above the table. The title's ink is
       indented by the arrow beside it, exactly as the house detail header
       indents it, so it is recorded apart from the column under it. */
    inlineStarts: [
      ...new Set(
        [window.__start(meta), window.__start(block), window.__start(sentence)].filter(
          (x) => x !== null,
        ),
      ),
    ],
    titleInk: window.__start(h1),
    /* AC-RW-09 — a pending posting has no running balance. */
    pendingRow: (() => {
      const row = [...(table?.querySelectorAll('tbody tr') ?? [])].find((tr) =>
        tr.textContent.includes('AUTH-6120'),
      )
      if (!row) return null
      const cells = [...row.querySelectorAll('td')]
      return {
        balanceCell: cells[cells.length - 1]?.textContent.trim() ?? null,
        badgeTones: [...row.querySelectorAll('[data-slot="badge"]')].map((b) => b.dataset.tone),
      }
    })(),
    /* R-RW-4 / D34 — no card, no border and no shadow around the header. */
    blockChrome: block
      ? {
          background: window.__hex(getComputedStyle(block).backgroundColor),
          border: getComputedStyle(block).borderTopWidth,
          shadow: getComputedStyle(block).boxShadow,
          cards: block.querySelectorAll('[data-slot="card"]').length,
        }
      : null,
  }
}

const failures = []
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
const page = await ctx.newPage()
/* `clock.ts`: fixtures, tests and Playwright pass `fixedClock`. */
await page.clock.install({ time: new Date('2026-06-25T09:14:00+03:00') })
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

async function menu(name) {
  await page.getByRole('button', { name: /Account|الحساب/ }).click()
  await page.getByRole('menuitemradio', { name }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
}

async function shot(name, full = false) {
  await page.screenshot({ path: `${OUT}/${TAG}-${name}.png`, fullPage: full })
  return `${OUT}/${TAG}-${name}.png`
}

async function probe(path, wait = 1400) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(wait)
  await page.evaluate(helpers)
  return page.evaluate(headerProbe)
}

const out = { theme: THEME, lang: LANG, base: BASE, shots: [] }

await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
if (THEME === 'dark') await menu('Dark')
if (LANG === 'ar') await menu('Arabic')
await page.waitForTimeout(900)
out.themeInForce = await page.evaluate(() => ({
  dark: document.documentElement.classList.contains('dark'),
  dir: document.documentElement.getAttribute('dir'),
  lang: document.documentElement.getAttribute('lang'),
}))

/* ── the index behind it, which must NOT gain an arrow ───────────────────── */
out.index = await probe(`${ROUTE}?view=all-wallets`)
out.shots.push(await shot('index'))

/* ── the drill-in, content ───────────────────────────────────────────────── */
out.content = await probe(`${ROUTE}?rider=${RIDER}`)
out.shots.push(await shot('content'))
out.shots.push(await shot('content-full', true))

/* ── a negative balance, and a wallet with nothing pending ───────────────── */
out.negative = await probe(`${ROUTE}?rider=RDR-4001`)
out.shots.push(await shot('negative'))

/* ── first run ───────────────────────────────────────────────────────────── */
out.firstRun = await probe(`${ROUTE}?rider=RDR-2055`)
out.shots.push(await shot('first-run'))

/* ── the read failure, through the mock's own lever ──────────────────────── */
out.error = await probe(`${ROUTE}?rider=${RIDER}&mockFail=wallets.ledger`)
out.error.alerts = await page.evaluate(() =>
  [...document.querySelectorAll('[role="alert"]')].map((n) => n.textContent.trim().slice(0, 90)),
)
out.shots.push(await shot('error'))

/* ── AC-RW-07's other half: a PLATFORM ledger keeps its subject heading ──── */
out.platformLedger = await probe('/financials/revenue?view=refunds-ledger')
out.shots.push(await shot('revenue-refunds-ledger'))

/* ── AC-RW-20 — the two sibling drill-ins, reported rather than assumed ──── */
out.payouts = await probe('/financials/payouts?captain=DRV-0105')
out.shots.push(await shot('payouts'))
out.cash = await probe('/financials/cash?captain=DRV-0103')
out.shots.push(await shot('cash'))

/* ── assertions ─────────────────────────────────────────────────────────── */
const c = out.content
if (!c.block) failures.push('content: no ledger header block rendered')
if (c.overflowX !== 0) failures.push(`content: ${c.overflowX}px of horizontal overflow (AC-RW-18)`)
if (c.backControls !== 1) failures.push(`content: ${c.backControls} back control(s), not 1 (AC-RW-01)`)
if (out.index.backControls !== 0) {
  failures.push(`index: ${out.index.backControls} back control(s) on an index route (AC-RW-01)`)
}
if (out.index.viewRow === null) failures.push('index: the view row is gone (AC-RW-06)')
if (c.viewRow !== null) failures.push('content: a view row survives on the drill-in (AC-RW-06)')
if (c.h2s.length !== 0) failures.push(`content: ${c.h2s.length} subject heading(s) (AC-RW-07)`)
/* The other half of AC-RW-07: `showSubject` defaults to true, so the platform
   ledger — whose page title is the sub-tab — still names its book. */
if (out.platformLedger.h2s.length === 0) {
  failures.push('revenue: the platform ledger lost its subject heading (AC-RW-07)')
}
if (c.back && c.back.firstFocusable !== true) {
  failures.push('content: the arrow is not the first focusable thing in the region (AC-RW-19)')
}
/* AC-RW-08 — two peers, Balance first, at one rank. */
if (c.figures.length !== 2) {
  failures.push(`content: ${c.figures.length} figure(s), expected Balance and Pending (AC-RW-08)`)
} else {
  const [balance, pending] = c.figures
  if (balance.fontSize !== pending.fontSize || balance.fontWeight !== pending.fontWeight) {
    failures.push(
      `content: the figures are not peers — ${balance.fontSize}/${balance.fontWeight} vs ${pending.fontSize}/${pending.fontWeight} (AC-RW-08)`,
    )
  }
  if (pending.start <= balance.start) failures.push('content: Pending is not after Balance (AC-RW-08)')
  const gap = pending.start - balance.start - balance.box.w
  if (Math.abs(gap - 32) > 1) failures.push(`content: the figures are ${gap}px apart, not 32 (AC-RW-08)`)
  for (const figure of c.figures) {
    if (figure.badges !== 0) failures.push(`content: a badge on ${figure.label} (AC-RW-09 / R7)`)
  }
  if (balance.colour !== pending.colour) {
    failures.push(`content: a tone on money — ${balance.colour} vs ${pending.colour} (AC-RW-09)`)
  }
}
if (c.pendingRow && c.pendingRow.balanceCell !== '—') {
  failures.push(`content: the pending row's balance is "${c.pendingRow.balanceCell}", not an em dash (AC-RW-09)`)
}
/* AC-RW-10 — one line, and the two sentences are two runs. */
if (c.sentence && c.sentence.lines !== 1) {
  failures.push(`content: the explanatory line wraps to ${c.sentence.lines} lines (AC-RW-10)`)
}
if (c.sentence && c.sentence.runs.length !== 2) {
  failures.push(`content: ${c.sentence.runs.length} run(s) on the explanatory line, expected 2 (AC-443)`)
}
/* AC-RW-18 — the block never runs wider than the ledger it heads. `tableCeiling`
   is 1232 for these six columns, so at 1280 the region caps both and the two
   land within a border of each other. */
if (c.block && c.tableWidth && c.block.w > c.tableWidth + 4) {
  failures.push(`content: the header block is ${c.block.w}px over a ${c.tableWidth}px table (AC-RW-18)`)
}
/* One inline-start edge for the whole column under the title. */
if (c.inlineStarts.length !== 1) {
  failures.push(`content: ${c.inlineStarts.length} inline-start edges above the table — ${c.inlineStarts.join(',')}`)
}
/* R-RW-4 / D34 — content, not a surface. */
if (c.blockChrome && (c.blockChrome.cards !== 0 || c.blockChrome.shadow !== 'none')) {
  failures.push('content: the header block is carded or casts a shadow (R-RW-4 / D34)')
}
/* AC-RW-11 — the sign is typographic and raises no banner. */
const negativeFigure = out.negative.figures[0]
if (negativeFigure && !negativeFigure.text.includes('−')) {
  failures.push(`negative: the balance reads "${negativeFigure.text}", not U+2212 (AC-RW-11)`)
}
if (out.negative.figures.length !== 1) {
  failures.push(`negative: ${out.negative.figures.length} figure(s) — Pending renders at zero (AC-RW-08)`)
}
/* AC-RW-14 — the figure block survives the first-run state. */
if (out.firstRun.figures.length !== 1) {
  failures.push(`first-run: ${out.firstRun.figures.length} figure(s), expected the balance alone (AC-RW-14)`)
}
if (out.firstRun.backControls !== 1) {
  failures.push(`first-run: ${out.firstRun.backControls} arrow(s) (AC-RW-14)`)
}
/* AC-RW-13 — the arrow outlives the read. */
if (out.error.backControls !== 1) failures.push('error: the back arrow did not survive the failure (AC-RW-13)')
if (out.error.title && out.error.title.text !== RIDER) {
  failures.push(`error: the title is "${out.error.title.text}", not the id (AC-RW-04)`)
}
/* AC-RW-17 — nothing the PRODUCT writes into the header block is Latin. The
   currency code is Latin by glossary R4, and the title and meta are data — a
   rider's name and id — which R4 also leaves alone. F-1's `Rider wallet
   balances` was neither, and this is the check that would have caught it. */
if (LANG === 'ar') {
  if (out.themeInForce.dir !== 'rtl') failures.push('the document is not rtl')
  const latin = c.headerRuns.filter(
    (run) => /[A-Za-z]/.test(run) && !/^(SAR|[\d.,−\s]+)$/.test(run),
  )
  if (latin.length > 0) failures.push(`ar: Latin run(s) in the header block — ${latin.join(' | ')}`)
}
if (errors.length > 0) failures.push(`page errors: ${errors.join(' | ')}`)

out.failures = failures
out.pageErrors = errors
console.log(JSON.stringify(out, null, 2))
await browser.close()
if (failures.length > 0) process.exit(1)
