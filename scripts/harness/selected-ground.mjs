/**
 * The selected state, measured: D33's ground on a metric tile and on the Market
 * & Zones strip, the step it makes against what it sits on, the step hover
 * makes, and the proof that moving the selection moves no neighbour. jsdom
 * paints no grounds and lays out no grid, so this is the only thing that checks
 * any of it. Run `npx vite --port 4327` first.
 *
 *   node scripts/harness/selected-ground.mjs [theme] [lang] [port]
 *
 * Prints one JSON block and exits non-zero if a ground goes the wrong way, if
 * hover outranks selection, or if a rect moves when the selection moves.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const THEME = process.argv[2] ?? 'light'
const LANG = process.argv[3] ?? 'en'
const BASE = `http://localhost:${process.argv[4] ?? 4327}`
const OUT = './scripts/harness/shots'
const TAG = `${THEME}-${LANG}`
mkdirSync(OUT, { recursive: true })

/* Injected once per page: luminance, contrast, and the nearest painted ground
   above a node — a tile's own ground is transparent until it is selected. */
const helpers = () => {
  window.__lum = (css) => {
    const h = css.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
    const m = h
      ? [null, parseInt(h[1], 16), parseInt(h[2], 16), parseInt(h[3], 16)]
      : css.match(/([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
    const [r, g, b] = [+m[1], +m[2], +m[3]].map((c) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  window.__step = (a, b) => {
    const [la, lb] = [window.__lum(a), window.__lum(b)]
    const ratio = +(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(3))
    return { ratio, direction: la < lb ? 'darker' : la > lb ? 'lighter' : 'same' }
  }
  window.__hex = (css) => {
    const m = css.match(/([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
    return '#' + [m[1], m[2], m[3]].map((c) => (+c).toString(16).padStart(2, '0')).join('')
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
  window.__rect = (n) => {
    if (!n) return null
    const b = n.getBoundingClientRect()
    return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) }
  }
}

/* Every tile in the band's radiogroup: the boxes that must not move, and the
   ground of whichever one is checked. */
const bandProbe = () => {
  const group = document.querySelector('[role="radiogroup"]')
  return group
    ? [...group.children].map((cell) => {
        const radio = cell.querySelector('[role="radio"]')
        const tile = radio ? radio.parentElement : cell.firstElementChild
        return {
          cell: window.__rect(cell),
          value: window.__rect(cell.querySelector('[data-slot="metric-value"]')),
          eyebrow: window.__rect(cell.querySelector('span.uppercase')),
          checked: radio ? radio.getAttribute('aria-checked') : null,
          ground: window.__hex(getComputedStyle(tile).backgroundColor),
          under: window.__hex(window.__under(tile)),
          padding: getComputedStyle(tile).padding,
          ring: radio ? getComputedStyle(radio).boxShadow : null,
        }
      })
    : []
}

/* The zones strip: five cells, two of them toggles. */
const stripProbe = () => {
  const ul = document.querySelector('ul[data-numeric][role="list"]')
  if (!ul) return []
  return [...ul.children].map((li) => {
    const btn = li.querySelector('button')
    return {
      cell: window.__rect(li),
      label: window.__rect(li.querySelector('span.uppercase')),
      numeral: window.__rect(li.querySelector('bdi')),
      pressed: btn ? btn.getAttribute('aria-pressed') : null,
      ground: btn ? window.__hex(getComputedStyle(btn).backgroundColor) : null,
      ring: btn ? getComputedStyle(btn).boxShadow : null,
    }
  })
}

/* Title, subtitle, switcher, strip — the header must not move when the surface
   does, and the switcher reads after the thing it changes. */
const headerProbe = () => {
  const h1 = document.querySelector('h1')
  const list = document.querySelector('[role="tablist"]')
  const active = [...document.querySelectorAll('[role="tab"]')].find(
    (t) => t.getAttribute('aria-selected') === 'true',
  )
  const under = h1 ? window.__under(h1) : 'rgb(255,255,255)'
  return {
    h1: window.__rect(h1),
    subtitle: window.__rect(h1 ? h1.parentElement.querySelector('span.max-w-prose') : null),
    tablist: window.__rect(list),
    strip: window.__rect(document.querySelector('ul[data-numeric][role="list"]')),
    active: active ? active.textContent.trim() : null,
    activeInk: active ? window.__step(getComputedStyle(active).color, under).ratio : null,
    underlineInk: active
      ? window.__step(getComputedStyle(active, '::after').backgroundColor, under).ratio
      : null,
    order:
      h1 && list
        ? h1.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING
          ? 'switcher after title'
          : 'switcher before title'
        : null,
  }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const failures = []

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
const out = { theme: THEME, lang: LANG }
/* Recorded rather than assumed: a theme that failed to switch has produced a
   green run over the wrong palette before. */
const themeInForce = () =>
  page.evaluate(() => ({
    dark: document.documentElement.classList.contains('dark'),
    dir: document.documentElement.getAttribute('dir'),
  }))

async function menu(name) {
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitemradio', { name }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
}

/* ── the board's hero band: two charted leads, one of them chosen ───────── */
await page.goto(`${BASE}/management/performance`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
if (THEME === 'dark') await menu('Dark')
if (LANG === 'ar') await menu('Arabic')
await page.waitForTimeout(1000)
await page.evaluate(helpers)

const radios = page.locator('[role="radio"]')
await radios.nth(0).click()
await page.waitForTimeout(900)
const bandFirst = await page.evaluate(bandProbe)
await page.screenshot({ path: `${OUT}/selected-band-${TAG}-first.png`, clip: { x: 0, y: 0, width: 1280, height: 420 } })
await radios.nth(1).click()
await page.waitForTimeout(900)
const bandSecond = await page.evaluate(bandProbe)
await page.screenshot({ path: `${OUT}/selected-band-${TAG}-second.png`, clip: { x: 0, y: 0, width: 1280, height: 420 } })

const chosen = bandFirst.find((t) => t.checked === 'true')
out.band = {
  ground: chosen.ground,
  under: chosen.under,
  step: await page.evaluate(([a, b]) => window.__step(a, b), [chosen.ground, chosen.under]),
  padding: chosen.padding,
  ringOnSelection: chosen.ring,
  noShift: {
    cells: bandFirst.every((t, i) => same(t.cell, bandSecond[i].cell)),
    values: bandFirst.every((t, i) => same(t.value, bandSecond[i].value)),
    eyebrows: bandFirst.every((t, i) => same(t.eyebrow, bandSecond[i].eyebrow)),
  },
}
if (out.band.step.ratio < 1.25) failures.push(`band step is only ${out.band.step.ratio}`)
if (Object.values(out.band.noShift).some((v) => !v)) failures.push('a band rect moved with the selection')

/* ── a page-context tile. No shipped screen selects one, so the ground is
      forced on with the class the component would emit. ─────────────────── */
const chapterTile = () =>
  [...document.querySelectorAll('ul[data-numeric][role="list"]')].find(
    (u) => u.getBoundingClientRect().top > 0,
  ).children[0].firstElementChild
await page.evaluate(() => {
  const pane = [...document.querySelectorAll('*')].find(
    (n) => n.scrollHeight > n.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(n).overflowY),
  )
  if (pane) pane.scrollTop = pane.clientHeight * 0.85
})
await page.waitForTimeout(600)
/* The class and the read are separate evaluates ON PURPOSE: a chapter below
   the fold is inside a subtree whose style recalc is skipped, so a background
   set and read in one tick comes back transparent. */
await page.evaluate((find) => {
  const tile = new Function('return ' + find)()()
  window.__under0 = window.__hex(window.__under(tile))
  tile.classList.add('bg-selected')
}, chapterTile.toString())
await page.waitForTimeout(600)
out.pageTile = await page.evaluate((find) => {
  const tile = new Function('return ' + find)()()
  const ground = window.__hex(getComputedStyle(tile).backgroundColor)
  return {
    ground,
    under: window.__under0,
    step: window.__step(ground, window.__under0),
    padding: getComputedStyle(tile).padding,
    synthesised: true,
  }
}, chapterTile.toString())
if (out.pageTile.step.ratio < 1.25) failures.push(`page step is only ${out.pageTile.step.ratio}`)
await page.screenshot({ path: `${OUT}/selected-page-${TAG}.png`, clip: { x: 0, y: 0, width: 1280, height: 800 } })

/* ── Market & Zones: the strip, its hover step, and the switcher ────────── */
await page.goto(`${BASE}/management/zones`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1600)
await page.evaluate(helpers)
const none = await page.evaluate(stripProbe)
await page.screenshot({ path: `${OUT}/selected-strip-${TAG}-none.png`, clip: { x: 0, y: 0, width: 1280, height: 460 } })

const toggles = page.locator('ul[data-numeric] button[aria-pressed]')
await toggles.nth(0).click()
await page.waitForTimeout(1000)
const first = await page.evaluate(stripProbe)
await page.screenshot({ path: `${OUT}/selected-strip-${TAG}-first.png`, clip: { x: 0, y: 0, width: 1280, height: 460 } })
await toggles.nth(0).click()
await page.waitForTimeout(600)
await toggles.nth(1).click()
await page.waitForTimeout(1000)
const second = await page.evaluate(stripProbe)
await page.screenshot({ path: `${OUT}/selected-strip-${TAG}-second.png`, clip: { x: 0, y: 0, width: 1280, height: 460 } })

/* Hover the tile that is NOT pressed, so hover and selection are measured
   against the same strip ground in the same frame. */
await toggles.nth(0).hover()
await page.waitForTimeout(500)
const hovered = await page.evaluate(() => {
  const btn = document.querySelector('ul[data-numeric] button[aria-pressed="false"]')
  const ground = window.__hex(getComputedStyle(btn).backgroundColor)
  /* The strip paints its own card ground, so that — not the page under it —
     is what a cell's ground is measured against. */
  const under = window.__hex(getComputedStyle(btn.closest('ul')).backgroundColor)
  return { ground, under, step: window.__step(ground, under) }
})
await page.screenshot({ path: `${OUT}/selected-strip-${TAG}-hover.png`, clip: { x: 0, y: 0, width: 1280, height: 460 } })

const pressed = second.find((c) => c.pressed === 'true')
out.strip = {
  selected: {
    ground: pressed.ground,
    under: hovered.under,
    step: await page.evaluate(([a, b]) => window.__step(a, b), [pressed.ground, hovered.under]),
    ring: pressed.ring,
  },
  hover: hovered,
  noShift: {
    cells: none.every((c, i) => same(c.cell, first[i].cell) && same(c.cell, second[i].cell)),
    labels: none.every((c, i) => same(c.label, first[i].label) && same(c.label, second[i].label)),
    numerals: none.every((c, i) => same(c.numeral, first[i].numeral) && same(c.numeral, second[i].numeral)),
  },
}
if (out.strip.selected.step.ratio < 1.25) failures.push(`strip step is only ${out.strip.selected.step.ratio}`)
if (out.strip.selected.step.ratio <= out.strip.hover.step.ratio) failures.push('hover outranks selection on the strip')
if (Object.values(out.strip.noShift).some((v) => !v)) failures.push('a strip rect moved with the selection')

await toggles.nth(1).click()
await page.waitForTimeout(800)
const headerMap = await page.evaluate(headerProbe)
await page.screenshot({ path: `${OUT}/selected-header-${TAG}-map.png`, clip: { x: 0, y: 0, width: 1280, height: 300 } })
await page.getByRole('tab', { name: LANG === 'ar' ? 'جدول' : 'Table' }).click()
await page.waitForTimeout(1400)
const headerTable = await page.evaluate(headerProbe)
await page.screenshot({ path: `${OUT}/selected-header-${TAG}-table.png`, clip: { x: 0, y: 0, width: 1280, height: 300 } })
out.header = {
  map: headerMap,
  table: headerTable,
  noShift:
    same(headerMap.h1, headerTable.h1) &&
    same(headerMap.subtitle, headerTable.subtitle) &&
    headerMap.tablist.y === headerTable.tablist.y &&
    same(headerMap.strip, headerTable.strip),
}
if (!out.header.noShift) failures.push('the header moved between Map and Table')
if (headerMap.order !== 'switcher after title') failures.push('the switcher is not below the title')

/* ── the shared primitives that carry the same selection ────────────────
      `table`, `tabs` and `toggle` all paint a chosen thing, and the bar D33
      sets for all three is the same: selection is a bigger step than hover on
      the ground the control sits on. Measured as a ladder rather than in situ
      because the default tab variant and the toggle group render on no screen
      this session can reach; the segmented pill IS measured, because five call
      sites override the base and that drift is worth seeing. ────────────── */
await page.goto(`${BASE}/financials/revenue`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1600)
await page.evaluate(helpers)
out.controls = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement)
  const v = (n) => cs.getPropertyValue(n).trim()
  const on = (ground) => ({
    ground: v(ground),
    selected: window.__step(v('--selected'), v(ground)),
    hover: window.__step(v('--accent'), v(ground)),
  })
  const list = document.querySelector('[role="tablist"][data-variant="segmented"]')
  const active = list ? list.querySelector('[role="tab"][aria-selected="true"]') : null
  return {
    onCard: on('--card'),
    onMuted: on('--muted'),
    segmentedInSitu: active
      ? {
          pill: window.__hex(getComputedStyle(active).backgroundColor),
          track: window.__hex(getComputedStyle(list).backgroundColor),
          step: window.__step(
            getComputedStyle(active).backgroundColor,
            getComputedStyle(list).backgroundColor,
          ),
          note: 'five call sites override the base with data-active:bg-card',
        }
      : null,
  }
})
await page.screenshot({ path: `${OUT}/selected-tab-${TAG}.png`, clip: { x: 0, y: 0, width: 1280, height: 420 } })
for (const g of ['onCard', 'onMuted']) {
  if (out.controls[g].selected.ratio <= out.controls[g].hover.ratio) {
    failures.push(`hover outranks selection ${g}`)
  }
}

/* ── the trend chart's tooltip, which recesses too (D33) ───────────────
      Hovered rather than asserted from the class: a floating layer that reads
      LIGHTER than the card it covers is the inversion this whole round is
      about, and only a rendered one can be measured. ────────────────────── */
await page.goto(`${BASE}/management/performance`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1600)
await page.evaluate(helpers)
const plot = page.locator('.recharts-surface').first()
if (await plot.count()) {
  await plot.scrollIntoViewIfNeeded()
  const box = await plot.boundingBox()
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await page.waitForTimeout(700)
  out.tooltip = await page.evaluate(() => {
    const tip = document.querySelector('.recharts-tooltip-wrapper div[dir]')
    if (!tip) return { rendered: false }
    const ground = window.__hex(getComputedStyle(tip).backgroundColor)
    /* On a board the chart has no card, so what the tooltip covers is the
       page itself — read it rather than assumed. */
    const over = window.__hex(window.__under(tip))
    const token = getComputedStyle(document.documentElement).getPropertyValue('--popover').trim()
    return { rendered: true, ground, over, token, step: window.__step(ground, over) }
  })
  if (out.tooltip.rendered) {
    await page.screenshot({ path: `${OUT}/selected-tooltip-${TAG}.png`, clip: { x: 0, y: 0, width: 1280, height: 800 } })
    /* What a COMPONENT owns is which token it asks for; which tier that token
       sits on is the token layer's. So this fails on the wrong token, and only
       reports the step — read it: in light `--popover` is D33a's covering
       tier, so every popover, dropdown and this tooltip float LIGHTER there. */
    if (out.tooltip.ground.toLowerCase() !== out.tooltip.token.toLowerCase()) {
      failures.push(`the tooltip is ${out.tooltip.ground}, not --popover ${out.tooltip.token}`)
    }
  }
}

out.inForce = await themeInForce()
if (out.inForce.dark !== (THEME === 'dark')) failures.push('the theme is not the one asked for')
if ((out.inForce.dir === 'rtl') !== (LANG === 'ar')) failures.push('the direction is not the one asked for')
out.errors = errors
out.failures = failures
console.log(JSON.stringify(out, null, 1))
console.log(`${TAG}`, failures.length || errors.length ? `FAIL ${failures.join('; ')}` : 'ok')
await browser.close()
process.exit(failures.length || errors.length ? 1 : 0)
