/**
 * The rate-card master-detail block, measured and captured. jsdom lays out no
 * columns and paints no grounds, so the 300px rail, the `bg-selected` step, D34
 * and the R4 column edges are only ever checked here.
 *
 *   npx vite build && npx vite preview --port 4381
 *   HARNESS_BASE=http://localhost:4381 node scripts/harness/fin-rate-card.mjs [theme] [lang]
 *
 * Prints one JSON block. Exits non-zero if the rail is not the token width, if
 * the selection does not step clear of the card, if anything casts a shadow, or
 * if a numeric column stops end-aligning.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const THEME = process.argv[2] ?? 'light'
const LANG = process.argv[3] ?? 'en'
const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4381'
const OUT = './scripts/harness/shots'
const TAG = `rate-card-${THEME}-${LANG}`
const ROUTE = '/financials/pricing?view=rate-card'
mkdirSync(OUT, { recursive: true })

const helpers = () => {
  window.__lum = (css) => {
    const m = css.match(/([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
    const [r, g, b] = [+m[1], +m[2], +m[3]].map((c) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  window.__step = (a, b) => {
    const [la, lb] = [window.__lum(a), window.__lum(b)]
    return +(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(3))
  }
  window.__under = (n) => {
    let x = n.parentElement
    while (x) {
      const bg = getComputedStyle(x).backgroundColor
      if (bg && bg !== 'rgba(0, 0, 0, 0)') return bg
      x = x.parentElement
    }
    return 'rgb(255, 255, 255)'
  }
  window.__hex = (css) => {
    const m = css.match(/([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
    return '#' + [m[1], m[2], m[3]].map((c) => (+c).toString(16).padStart(2, '0')).join('')
  }
}

/* The block: one card, a rail column, a pane, and the grounds under both. */
const blockProbe = () => {
  const rail = document.querySelector('ol[aria-labelledby]')
  if (!rail) return null
  const card = rail.closest('[data-slot="card"]')
  const column = rail.parentElement
  const selected = rail.querySelector('[aria-current="page"]')
  const marker = selected?.closest('li')?.querySelector('span[aria-hidden="true"]')
  const pane = card.querySelector('section[aria-labelledby]')
  const cardBg = getComputedStyle(card).backgroundColor
  const pageBg = window.__under(card)
  const rows = [...rail.querySelectorAll('li')].map((li) => li.getBoundingClientRect().height)
  const table = pane?.querySelector('table')
  const headers = table ? [...table.querySelectorAll('th')] : []
  return {
    cardsInsideTheCard: card.querySelectorAll('[data-slot="card"]').length,
    railWidth: +column.getBoundingClientRect().width.toFixed(1),
    railDividerInline: getComputedStyle(column).borderInlineEndWidth,
    railDividerPhysical: {
      left: getComputedStyle(column).borderLeftWidth,
      right: getComputedStyle(column).borderRightWidth,
    },
    rowHeights: [...new Set(rows.map((h) => +h.toFixed(1)))],
    paneStartsAfterRail:
      pane && column
        ? document.dir === 'rtl'
          ? pane.getBoundingClientRect().right <= column.getBoundingClientRect().left + 1
          : pane.getBoundingClientRect().left >= column.getBoundingClientRect().right - 1
        : null,
    card: window.__hex(cardBg),
    page: window.__hex(pageBg),
    cardRecessStep: window.__step(cardBg, pageBg),
    selectedGround: window.__hex(getComputedStyle(selected).backgroundColor),
    selectedStep: window.__step(
      getComputedStyle(selected).backgroundColor,
      getComputedStyle(card).backgroundColor,
    ),
    markerWidth: marker ? getComputedStyle(marker).width : null,
    markerInlineStart: marker ? getComputedStyle(marker).insetInlineStart : null,
    markerColour: marker ? window.__hex(getComputedStyle(marker).backgroundColor) : null,
    /* A shadow whose every colour is fully transparent is the ring's own
       placeholder slot, not paint. D34 is about what draws. */
    shadows: [...card.querySelectorAll('*')]
      .map((n) => getComputedStyle(n).boxShadow)
      .filter((s) => s && s !== 'none' && !/^(rgba\(0, 0, 0, 0\)[^,]*,?\s*)+$/.test(s)).length,
    /* R4 — the numeric columns end-align, and the rule does not flip. */
    columnAlign: headers.map((th) => ({
      label: th.textContent.trim(),
      align: getComputedStyle(th).textAlign,
    })),
    /* X-RC-2 — the machine identifier is the only monospace run. */
    monoRuns: [...card.querySelectorAll('*')]
      .filter((n) => /mono|Cascadia|Segoe UI Mono/.test(getComputedStyle(n).fontFamily))
      .filter((n) => n.children.length === 0)
      .map((n) => n.textContent.trim()),
    /* D18 — one licensed uppercase run on the page, and it is the caption rung. */
    /* Counted at the OUTERMOST element only: `text-transform` inherits, so a
       run with child spans would otherwise read as several runs. */
    uppercase: [...document.querySelectorAll('main *')]
      .filter((n) => getComputedStyle(n).textTransform === 'uppercase')
      .filter((n) => !(n.parentElement && getComputedStyle(n.parentElement).textTransform === 'uppercase'))
      .map((n) => n.textContent.trim().slice(0, 60)),
    smallestReadableFont: Math.min(
      ...[...card.querySelectorAll('*')]
        .filter((n) => n.children.length === 0 && n.textContent.trim() !== '')
        .map((n) => parseFloat(getComputedStyle(n).fontSize)),
    ),
  }
}

const surgeProbe = () => {
  const cards = [...document.querySelectorAll('[data-slot="card"]')]
  const group = document.querySelector('[role="radiogroup"]')
  const filled = [...document.querySelectorAll('main button')].filter((b) =>
    /(^|\s)bg-primary(\s|$)/.test(b.className),
  )
  return {
    cardCount: cards.length,
    districtChips: group ? group.querySelectorAll('[role="radio"]').length : 0,
    filledButtons: filled.map((b) => b.textContent.trim()),
    suspensionRows: document.querySelectorAll('table tbody tr').length,
    badgeTones: [...new Set([...document.querySelectorAll('[data-slot="badge"]')].map((b) => b.dataset.tone))],
  }
}

const failures = []
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
/* `clock.ts`: *"fixtures, tests and Playwright pass `fixedClock`"*. Without
   this the host clock is months past every fixture and AC-409's countdown, and
   the `In force` state with it, is unreachable. */
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

const out = { theme: THEME, lang: LANG, base: BASE, shots: [] }

await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
if (THEME === 'dark') await menu('Dark')
if (LANG === 'ar') await menu(LANG === 'ar' ? 'Arabic' : 'English')
await page.waitForTimeout(1000)
await page.evaluate(helpers)
out.themeInForce = await page.evaluate(() => ({
  dark: document.documentElement.classList.contains('dark'),
  dir: document.documentElement.getAttribute('dir'),
  lang: document.documentElement.getAttribute('lang'),
}))

/* ── the live card selected, which is where an operator lands ───────────── */
out.live = await page.evaluate(blockProbe)
out.shots.push(await shot('live'))

/* ── a draft selected: the one control the pane ever carries ────────────── */
await page.goto(`${BASE}${ROUTE}&card=RC-2026-08-01`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.evaluate(helpers)
out.draft = await page.evaluate(blockProbe)
out.shots.push(await shot('draft'))

await page.goto(`${BASE}${ROUTE}&card=RC-2026-09-01`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
out.shots.push(await shot('draft-unmodelled'))

/* ── the surge row and the suspensions table ────────────────────────────── */
await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.evaluate(helpers)
out.surge = await page.evaluate(surgeProbe)
out.shots.push(await shot('page', true))

/* ── the error state, through the mock's own lever ──────────────────────── */
await page.goto(`${BASE}${ROUTE}&mockFail=pricing.rateCards`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1400)
out.error = await page.evaluate(() => ({
  railGone: document.querySelector('ol[aria-labelledby]') === null,
  alerts: [...document.querySelectorAll('[role="alert"]')].map((n) => n.textContent.trim().slice(0, 80)),
  surgeStillRendered: [...document.querySelectorAll('h2')].map((h) => h.textContent.trim()),
}))
out.shots.push(await shot('error'))

/* ── assertions ─────────────────────────────────────────────────────────── */
for (const [state, probe] of [['live', out.live], ['draft', out.draft]]) {
  if (!probe) {
    failures.push(`${state}: no rail rendered`)
    continue
  }
  if (Math.round(probe.railWidth) !== 300) failures.push(`${state}: rail is ${probe.railWidth}px, not 300`)
  if (probe.cardsInsideTheCard !== 0) failures.push(`${state}: a card inside the card (D33)`)
  if (probe.shadows !== 0) failures.push(`${state}: ${probe.shadows} shadow(s) inside the block (D34)`)
  if (probe.selectedStep < 1.25) failures.push(`${state}: selected step is only ${probe.selectedStep}`)
  if (probe.paneStartsAfterRail !== true) failures.push(`${state}: the pane is not inline-after the rail`)
  if (probe.smallestReadableFont < 12) failures.push(`${state}: ${probe.smallestReadableFont}px text`)
  const [first, ...rest] = probe.columnAlign
  if (first && first.align !== 'start') failures.push(`${state}: the class column is ${first.align}`)
  for (const column of rest) {
    if (column.align !== 'end') failures.push(`${state}: ${column.label} is ${column.align}, not end`)
  }
  if (probe.monoRuns.some((run) => /\d+\.\d{2}/.test(run))) {
    failures.push(`${state}: money in a monospace face (X-RC-2)`)
  }
  if (probe.uppercase.length > 1) failures.push(`${state}: ${probe.uppercase.length} uppercase runs (D18)`)
}
if (out.surge.filledButtons.length !== 1) {
  failures.push(`${out.surge.filledButtons.length} filled buttons on the view (R3)`)
}
if (out.surge.badgeTones.includes('critical')) failures.push('a red badge (R7)')
if (!out.error.railGone) failures.push('the failed read did not collapse the block')

out.pageErrors = errors
out.failures = failures
console.log(JSON.stringify(out, null, 2))
await browser.close()
process.exit(failures.length === 0 && errors.length === 0 ? 0 : 1)
