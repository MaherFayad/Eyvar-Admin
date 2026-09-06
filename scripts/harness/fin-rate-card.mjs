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
  const headers = table ? [...table.querySelectorAll('thead tr:first-child th')] : []
  /* Ink, not box: a `<th>` box starts at the table's edge and its INK starts a
     cell padding in, which is what has to line up with the pane's other runs. */
  const inkStart = (node) => {
    const range = document.createRange()
    range.selectNodeContents(node)
    const box = range.getBoundingClientRect()
    return Math.round(document.dir === 'rtl' ? box.right : box.left)
  }
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
    /* AC-RC-32 — the type ramp as rendered, in (px, weight, colour) triples.
       Revision 1 spent two sizes on seven levels of meaning (F1). */
    typeRamp: (() => {
      const runs = [...card.querySelectorAll('*')]
        .filter((n) => n.children.length === 0 && n.textContent.trim() !== '')
        .filter((n) => !n.closest('.sr-only'))
        .map((n) => {
          const cs = getComputedStyle(n)
          return parseFloat(cs.fontSize) + '/' + cs.fontWeight + '/' + window.__hex(cs.color)
        })
      const tally = {}
      for (const run of runs) tally[run] = (tally[run] ?? 0) + 1
      return {
        triples: tally,
        sizes: [...new Set(runs.map((r) => +r.split('/')[0]))].sort((a, b) => a - b),
        elements: runs.length,
      }
    })(),
    /* F2 — what is spent before the first price, and the whole view's height. */
    firstPriceY: (() => {
      const cell = table?.querySelector('tbody tr td:nth-child(2)')
      return cell ? Math.round(cell.getBoundingClientRect().top + window.scrollY) : null
    })(),
    viewScrollHeight: document.querySelector('main')?.scrollHeight ?? null,
    /* F5 / F8 — the header strip: widths, wrapped labels, and one unit run. */
    matrix: table
      ? {
          width: +table.getBoundingClientRect().width.toFixed(1),
          headRungs: table.querySelectorAll('thead tr').length,
          headHeight: +table.querySelector('thead').getBoundingClientRect().height.toFixed(1),
          labelRungHeight: +table
            .querySelector('thead tr')
            .getBoundingClientRect()
            .height.toFixed(1),
          bodyRowHeight: +table.querySelector('tbody tr').getBoundingClientRect().height.toFixed(1),
          sarRuns: (table.querySelector('thead').textContent.match(/SAR/g) ?? []).length,
          columns: [...table.querySelectorAll('thead tr:first-child th')].map((th) => {
            const line = parseFloat(getComputedStyle(th).lineHeight)
            const range = document.createRange()
            range.selectNodeContents(th)
            return {
              label: th.textContent.trim(),
              width: +th.getBoundingClientRect().width.toFixed(1),
              ink: +range.getBoundingClientRect().width.toFixed(1),
              lines: Math.max(1, Math.round(range.getBoundingClientRect().height / line)),
            }
          }),
        }
      : null,
    /* F6 — the pane's reading edge: the first ink run of each band, which the
       table used to hang 12px outside on both edges. */
    paneInkStarts: pane
      ? [...pane.children]
          .filter((band) => !band.classList.contains('sr-only'))
          .map((band) => {
            const first = [...band.querySelectorAll('*')].find(
              (n) =>
                n.children.length === 0 &&
                n.textContent.trim() !== '' &&
                !n.closest('.sr-only'),
            )
            return first ? inkStart(first) : null
          })
          .filter((x) => x !== null)
      : null,
    /* F4 — the rail is the stretched side; the footer terminates the runway. */
    railFooter: (() => {
      const footer = rail.nextElementSibling
      if (!footer) return null
      const box = footer.getBoundingClientRect()
      const last = rail.lastElementChild?.getBoundingClientRect()
      return {
        text: footer.textContent.trim(),
        runway: last ? Math.round(box.top - last.bottom) : null,
        borderTop: getComputedStyle(footer).borderTopWidth,
        uppercase: getComputedStyle(footer).textTransform,
      }
    })(),
    /* AC-RC-45 — every gap and block inset inside the block is 4, 8, 12 or 24. */
    offScaleSpacing: [...card.querySelectorAll('*')]
      .flatMap((n) => {
        const cs = getComputedStyle(n)
        return [cs.rowGap, cs.columnGap, cs.paddingTop, cs.paddingBottom]
          .map((v) => parseFloat(v))
          .filter((v) => v > 0 && ![4, 8, 12, 24].includes(v))
          .map((v) => v + 'px on ' + n.tagName.toLowerCase() + ' ' + String(n.className).slice(0, 46))
      })
      .slice(0, 12),
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
    /* D35b / D35a — one card, one `Suspend surge`, and the band's alignment
       and rhythm, which are the two things jsdom cannot see. */
    surgeCard: (() => {
      const host = cards.find((c) => c.querySelector('[role="radiogroup"]'))
      if (!host) return null
      const title = host.querySelector('[data-slot="card-title"]')
      const button = [...host.querySelectorAll('button')].find(
        (b) => !b.closest('[role="radiogroup"]'),
      )
      const described = button?.getAttribute('aria-describedby')
      const refusal = described ? document.getElementById(described) : null
      const box = button?.getBoundingClientRect()
      const chips = host.querySelector('[role="radiogroup"]')?.getBoundingClientRect()
      const label = [...host.querySelectorAll('span[id]')].find(
        (n) => n.id === host.querySelector('[role="radiogroup"]')?.getAttribute('aria-labelledby'),
      )
      const edge = (b) => (b ? Math.round(document.dir === 'rtl' ? b.right : b.left) : null)
      const table = host.querySelector('table')
      const bandRule = host.querySelector('[role="radiogroup"]')?.closest('.border-t')
      return {
        title: title?.textContent.trim() ?? null,
        titleSize: title ? parseFloat(getComputedStyle(title).fontSize) : null,
        headings: [...host.querySelectorAll('h1,h2,h3,h4')].map((h) => h.textContent.trim()),
        /* Whole runs, not substrings: the card's description legitimately names
           the act in prose. D35b is about a TITLE and a CONTROL. */
        suspendRuns: [...host.querySelectorAll('*')].filter(
          (n) =>
            n.children.length === 0 &&
            /^(Suspend surge|إيقاف تسعير الذروة)$/.test(n.textContent.trim()),
        ).length,
        labelSize: label ? parseFloat(getComputedStyle(label).fontSize) : null,
        chipsEdge: edge(chips),
        buttonBoxEdge: edge(box),
        labelEdge: edge(label?.getBoundingClientRect()),
        refusalEdge: edge(refusal?.getBoundingClientRect()),
        buttonBorder: button ? getComputedStyle(button).borderTopWidth : null,
        buttonBorderColour: button ? window.__hex(getComputedStyle(button).borderTopColor) : null,
        buttonHeight: box ? Math.round(box.height) : null,
        chipsToButton: box && chips ? Math.round(box.top - chips.bottom) : null,
        buttonToRefusal:
          refusal && box ? Math.round(refusal.getBoundingClientRect().top - box.bottom) : null,
        tableToBand:
          table && bandRule
            ? Math.round(bandRule.getBoundingClientRect().top - table.getBoundingClientRect().bottom)
            : null,
        bandRuleChannel: bandRule
          ? {
              borderTop: getComputedStyle(bandRule).borderTopWidth,
              paddingTop: getComputedStyle(bandRule).paddingTop,
            }
          : null,
      }
    })(),
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
  message: document.querySelector('[role="alert"]')?.textContent.trim().slice(0, 80) ?? null,
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
  if (probe.uppercase.length > 0) {
    failures.push(state + ': ' + probe.uppercase.length + ' uppercase run(s) (D18, AC-RC-40)')
  }
  /* AC-RC-32 — the ramp is spent. Two sizes for seven meanings is F1, and the
     one that was missing is the card-title rung. */
  if (!probe.typeRamp.sizes.includes(16)) {
    failures.push(state + ': no 16px rung — the pane has no typographic top (F1)')
  }
  if (probe.typeRamp.sizes.length < 3) {
    failures.push(state + ': only ' + probe.typeRamp.sizes.length + ' type sizes (AC-RC-32)')
  }
  if (probe.typeRamp.sizes.some((px) => px === 20 || px === 28)) {
    failures.push(state + ': a ' + probe.typeRamp.sizes.join('/') + ' run — no rung is 20 or 28')
  }
  /* AC-RC-45 — 4 / 8 / 12 / 24, and nothing else. */
  if (probe.offScaleSpacing.length > 0) {
    failures.push(state + ': off-scale spacing — ' + probe.offScaleSpacing[0] + ' (AC-RC-45)')
  }
  /* F6 — the table hung 12px outside every other run in the pane. */
  if (probe.paneInkStarts && new Set(probe.paneInkStarts).size !== 1) {
    failures.push(state + ': the pane bands start at ' + probe.paneInkStarts.join(',') + ' (F6)')
  }
  /* The unit rung: `SAR` once in the head, never in a cell (F8). */
  if (probe.matrix && probe.matrix.sarRuns !== 1) {
    failures.push(state + ': ' + probe.matrix.sarRuns + ' SAR runs in the table head')
  }
  if (probe.matrix && probe.matrix.bodyRowHeight < 36) {
    failures.push(state + ': body row is ' + probe.matrix.bodyRowHeight + 'px, under --ev-row-h')
  }
  /* AC-RC-39 — the counts are the rail's footer, terminated by a hairline. */
  if (!probe.railFooter || probe.railFooter.borderTop === '0px') {
    failures.push(state + ': the rail has no terminated footer (AC-RC-39)')
  }
}
/* AC-RC-46 / 47 / 48 — one `Surge` card, and the band's alignment and rhythm. */
const band = out.surge.surgeCard
if (!band) {
  failures.push('no Surge card found')
} else {
  if (band.suspendRuns !== 1) {
    failures.push('"Suspend surge" appears ' + band.suspendRuns + ' times in one card (D35b)')
  }
  if (band.headings.length !== 1) {
    failures.push('the Surge card carries ' + band.headings.length + ' headings (AC-RC-48)')
  }
  if (band.titleSize !== 16) failures.push('the Surge title is ' + band.titleSize + 'px, not 16')
  if (band.labelSize !== 14) failures.push('the District label is ' + band.labelSize + 'px, not 14')
  for (const [what, edge] of [
    ['the label', band.labelEdge],
    ['the button box', band.buttonBoxEdge],
    ['the refusal', band.refusalEdge],
  ]) {
    if (edge !== null && edge !== band.chipsEdge) {
      failures.push(what + ' starts at ' + edge + ', the chips at ' + band.chipsEdge)
    }
  }
  if (band.chipsToButton !== 24) {
    failures.push('chips to button is ' + band.chipsToButton + 'px, not the 24 a subject costs')
  }
  if (band.buttonToRefusal !== null && band.buttonToRefusal !== 4) {
    failures.push('button to refusal is ' + band.buttonToRefusal + 'px, not 4')
  }
  /* §4.2 — the rule is CENTRED in a 24px channel: 12 above, 12 under it. */
  if (band.tableToBand !== 12 || band.bandRuleChannel?.paddingTop !== '12px') {
    failures.push(
      'the band rule channel is ' + band.tableToBand + ' + rule + ' +
        (band.bandRuleChannel?.paddingTop ?? 'NO RULE FOUND') + ', not 12 + rule + 12',
    )
  }
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
