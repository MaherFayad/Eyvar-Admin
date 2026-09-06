/**
 * D35a's proof: a disabled control keeps its BOX. Walks the routes that render
 * a disabled button at rest, records every one's edge, fill, ground and
 * geometry, then flips a live button of each variant to `disabled` and back so
 * `ghost` and `link` are measured too. jsdom paints no border, so this is the
 * only thing that checks any of it. Run `npx vite --port 4327` first.
 *
 *   node scripts/harness/disabled-box.mjs [theme] [tag] [port]
 *
 * Prints one JSON block. Fails if a boxed variant's disabled edge is unpainted,
 * if an unboxed one grew an edge, if a disabled control keeps a fill or changes
 * its geometry, or if any of them grows a shadow (D34).
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const THEME = process.argv[2] ?? 'light'
const TAG = process.argv[3] ?? 'after'
const BASE = `http://localhost:${process.argv[4] ?? 4327}`
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const BOXED = ['default', 'secondary', 'destructive']
const VARIANTS = [...BOXED, 'ghost', 'link']
const ROUTES = [
  ['admin-team', '/admin/team'],
  ['admin-policy', '/admin/policy'],
  ['admin-data', '/admin/data'],
  ['admin-comms', '/admin/communications'],
  ['operations-people', '/operations/people'],
  ['support-tickets', '/support/tickets'],
  /* The only `link` button reachable without opening a layer: the filtered
     activity log's `Show everyone`. Any actor id renders it. */
  ['admin-activity-actor', '/admin/activity?actor=OP-1001'],
]

const helpers = () => {
  window.__rgb = (css) => {
    const m = String(css).match(/([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?/)
    return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null
  }
  window.__hex = (css) => {
    const c = window.__rgb(css)
    return c ? '#' + c.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('') : null
  }
  window.__painted = (css) => {
    const c = window.__rgb(css)
    return c !== null && c[3] > 0.01
  }
  /* Tailwind's shadow stack is five fully transparent layers when nothing is
     set, so `!== 'none'` is not the test — a PAINTED layer is. */
  window.__shadow = (css) => {
    if (!css || css === 'none') return null
    return String(css).split(/,(?![^(]*\))/).some((l) => window.__painted(l)) ? css : null
  }
  window.__lum = (css) => {
    const [r, g, b] = window.__rgb(css).slice(0, 3).map((c) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  window.__ratio = (a, b) => {
    if (!window.__painted(a) || !window.__painted(b)) return null
    const [la, lb] = [window.__lum(a), window.__lum(b)]
    return +(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(3))
  }
  /* A button's own ground is transparent until something paints it, so the
     ground is the nearest painted ancestor, not the parent. */
  window.__under = (n) => {
    let x = n.parentElement
    while (x) {
      const bg = getComputedStyle(x).backgroundColor
      if (window.__painted(bg)) return bg
      x = x.parentElement
    }
    return getComputedStyle(document.body).backgroundColor
  }
  /* The owner's symptom: a control whose edge is unpainted still spends its
     padding, so its LABEL starts inset while the lines stacked above and below
     start at the container's reading edge. What matters is the leftmost PAINTED
     ink, which is the edge when there is one and the first glyph when there is
     not. LTR only — run this harness in English. */
  window.__indent = (b) => {
    const parent = b.parentElement
    if (!parent) return null
    const box = b.getBoundingClientRect()
    const range = document.createRange()
    range.selectNodeContents(b)
    const label = range.getBoundingClientRect()
    const cs = getComputedStyle(b)
    /* A FILL paints the box edge too, so an enabled primary is flush even with
       no border. Only a control with neither starts its ink at the label. */
    const boxPainted = window.__painted(cs.borderTopColor) || window.__painted(cs.backgroundColor)
    const stacked = [...parent.children]
      .filter((n) => n !== b && n.getBoundingClientRect().width > 0)
      .map((n) => n.getBoundingClientRect())
      .filter((q) => q.bottom <= box.top + 1 || q.top >= box.bottom - 1)
    const flush = stacked.length ? Math.min(...stacked.map((q) => q.left)) : null
    const ink = boxPainted ? box.left : label.left
    return {
      boxPainted,
      boxStart: +box.left.toFixed(1),
      labelStart: +label.left.toFixed(1),
      inkStart: +ink.toFixed(1),
      stackedSiblings: stacked.length,
      flushStart: flush === null ? null : +flush.toFixed(1),
      labelIndent: flush === null ? null : +(label.left - flush).toFixed(1),
      inkIndent: flush === null ? null : +(ink - flush).toFixed(1),
    }
  }
  window.__read = (b) => {
    const s = getComputedStyle(b)
    const ground = window.__under(b)
    const box = b.getBoundingClientRect()
    return {
      label: (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 34),
      variant: b.getAttribute('data-variant'),
      size: b.getAttribute('data-size'),
      h: +box.height.toFixed(1),
      radius: s.borderRadius,
      padInline: `${s.paddingInlineStart}/${s.paddingInlineEnd}`,
      fill: window.__painted(s.backgroundColor) ? window.__hex(s.backgroundColor) : null,
      edge: window.__painted(s.borderTopColor) ? window.__hex(s.borderTopColor) : null,
      edgeWidth: s.borderTopWidth,
      ground: window.__hex(ground),
      edgeOnGround: window.__ratio(s.borderTopColor, ground),
      inkOnGround: window.__ratio(s.color, ground),
      shadow: window.__shadow(s.boxShadow),
      indent: window.__indent(b),
    }
  }
  /* No shipped screen outside Financials stacks a button between two flush
     lines, so the ARRANGEMENT is built here — from a CLONE of a live button, so
     every class, token and computed style is the real one. React never sees the
     clone, and `disabled` on it triggers the real `:disabled` rules. */
  window.__stack = (variant) => {
    const src = [...document.querySelectorAll(`button[data-slot="button"][data-variant="${variant}"]`)].find(
      (n) => !n.disabled && n.getBoundingClientRect().height > 0,
    )
    if (!src) return null
    document.getElementById('__d35a-stack')?.remove()
    const host = document.createElement('div')
    host.id = '__d35a-stack'
    host.className = 'flex flex-col items-start gap-1.5 p-4'
    const above = document.createElement('span')
    above.className = 'text-xs font-medium text-muted-foreground'
    above.textContent = 'District'
    const below = document.createElement('span')
    below.className = 'text-xs text-muted-foreground'
    below.textContent = 'Choose a district.'
    const btn = src.cloneNode(true)
    btn.id = '__d35a-clone'
    host.append(above, btn, below)
    const card = document.querySelector('[data-slot="card-content"]') ?? document.body
    card.prepend(host)
    return true
  }
  /* Prefer a button that is STACKED with flush siblings, because that is where
     the owner's indentation symptom is visible at all. */
  window.__mark = (variant) => {
    const live = [...document.querySelectorAll(`button[data-slot="button"][data-variant="${variant}"]`)].filter(
      (n) => !n.disabled && n.getBoundingClientRect().height > 0,
    )
    const b = live.find((n) => (window.__indent(n)?.stackedSiblings ?? 0) > 0) ?? live[0]
    if (!b) return null
    b.setAttribute('data-d35a', '')
    return window.__read(b)
  }
}

const failures = []
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 180)))
const out = { theme: THEME, tag: TAG, routes: {}, variants: {} }

async function menu(name) {
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitemradio', { name }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
}

/* Flip a live button and read it AFTER the colour transition has landed. Read
   in the same tick and `transition-colors` hands back the start value, which
   reports every disabled button as still filled. */
async function sample(variant, route) {
  const on = await page.evaluate((v) => window.__mark(v), variant)
  if (on === null) return null
  await page.evaluate(() => {
    document.querySelector('[data-d35a]').disabled = true
  })
  await page.waitForTimeout(600)
  const off = await page.evaluate(() => window.__read(document.querySelector('[data-d35a]')))
  const box = await page.locator('[data-d35a]').boundingBox()
  if (box) {
    await page.screenshot({
      path: `${OUT}/d35a-${TAG}-${THEME}-variant-${variant}.png`,
      clip: {
        x: Math.max(0, box.x - 24),
        y: Math.max(0, box.y - 16),
        width: Math.min(520, 1280 - Math.max(0, box.x - 24)),
        height: Math.min(72, 800 - Math.max(0, box.y - 16)),
      },
    })
  }
  await page.evaluate(() => {
    const b = document.querySelector('[data-d35a]')
    b.disabled = false
    b.removeAttribute('data-d35a')
  })
  return { route, on, off }
}

await page.goto(`${BASE}/admin/team`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1600)
if (THEME === 'dark') await menu('Dark')
await page.waitForTimeout(700)

for (const [name, route] of ROUTES) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.evaluate(helpers)

  const found = await page.evaluate(() =>
    [...document.querySelectorAll('button[data-slot="button"][disabled]')]
      .filter((b) => b.getBoundingClientRect().height > 0)
      .map(window.__read),
  )
  out.routes[name] = found
  if (found.length) {
    await page.locator('button[data-slot="button"][disabled]').first().scrollIntoViewIfNeeded().catch(() => {})
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/d35a-${TAG}-${THEME}-${name}.png` })
  }
  for (const b of found) {
    if (b.fill !== null) failures.push(`${name}: disabled ${b.variant} keeps a fill ${b.fill}`)
    if (b.shadow) failures.push(`${name}: disabled ${b.variant} carries a shadow`)
    if (BOXED.includes(b.variant) && b.edge === null) {
      failures.push(`${name}: disabled ${b.variant} "${b.label}" has no edge`)
    }
  }

  /* Keep looking past the first hit until a STACKED example turns up: without
     flush siblings there is nothing to measure the indentation against. */
  for (const variant of VARIANTS) {
    if ((out.variants[variant]?.off.indent?.stackedSiblings ?? 0) > 0) continue
    const pair = await sample(variant, name)
    if (pair && (!out.variants[variant] || (pair.off.indent?.stackedSiblings ?? 0) > 0)) {
      out.variants[variant] = pair
    }
  }
}

/* The owner's symptom, measured: a label / control / refusal stack, on a real
   card, with the control enabled and then disabled. */
await page.goto(`${BASE}/admin/team`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.evaluate(helpers)
out.stack = {}
for (const variant of ['default', 'secondary']) {
  const built = await page.evaluate((v) => window.__stack(v), variant)
  if (!built) continue
  await page.waitForTimeout(400)
  const on = await page.evaluate(() => window.__read(document.getElementById('__d35a-clone')))
  await page.evaluate(() => {
    document.getElementById('__d35a-clone').disabled = true
  })
  await page.waitForTimeout(600)
  const off = await page.evaluate(() => window.__read(document.getElementById('__d35a-clone')))
  const box = await page.locator('#__d35a-stack').boundingBox()
  if (box) {
    await page.screenshot({
      path: `${OUT}/d35a-${TAG}-${THEME}-stack-${variant}.png`,
      clip: { x: Math.max(0, box.x - 12), y: Math.max(0, box.y - 8), width: 320, height: Math.min(140, box.height + 16) },
    })
  }
  out.stack[variant] = { on: on.indent, off: off.indent }
  await page.evaluate(() => document.getElementById('__d35a-stack')?.remove())
  if (off.indent.stackedSiblings !== 2) failures.push(`${variant}: the stack probe did not build`)
}

/* `destructive` is R5a use #1 only, so it exists only inside a confirmation:
   Sessions & devices → `End session` swaps the row's secondary for it. */
if (!out.variants.destructive) {
  await page.goto(`${BASE}/admin/team`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.getByRole('tab', { name: /session/i }).first().click().catch(() => {})
  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: /^End session$/ }).first().click().catch(() => {})
  await page.waitForTimeout(1200)
  await page.evaluate(helpers)
  const pair = await sample('destructive', 'admin-team/sessions')
  if (pair) out.variants.destructive = pair
}

for (const [variant, pair] of Object.entries(out.variants)) {
  const boxed = BOXED.includes(variant)
  if (pair.off.fill !== null) failures.push(`${variant}: disabled keeps a fill`)
  if (pair.off.shadow) failures.push(`${variant}: disabled grew a shadow (D34)`)
  if (boxed && pair.off.edge === null) failures.push(`${variant}: disabled has no edge`)
  if (!boxed && pair.off.edge !== null) failures.push(`${variant}: an unboxed variant grew an edge`)
  if (pair.on.h !== pair.off.h) failures.push(`${variant}: disabled changed height`)
  if (pair.on.padInline !== pair.off.padInline) failures.push(`${variant}: disabled changed padding`)
  if (pair.on.radius !== pair.off.radius) failures.push(`${variant}: disabled changed radius`)
  /* The owner's symptom: with the edge back, the control's leftmost ink is its
     box again, not its label 11px inside it. */
  if (boxed && pair.off.indent.inkStart !== pair.off.indent.boxStart) {
    failures.push(`${variant}: disabled ink starts inside the box`)
  }
}
for (const variant of VARIANTS) {
  if (!out.variants[variant]) failures.push(`no live ${variant} button found on any swept route`)
}

out.inForce = await page.evaluate(() => ({ dark: document.documentElement.classList.contains('dark') }))
if (out.inForce.dark !== (THEME === 'dark')) failures.push('the theme is not the one asked for')
out.errors = errors
out.failures = failures
console.log(JSON.stringify(out, null, 1))
console.log(`${TAG}/${THEME}`, failures.length ? `FAIL ${failures.join('; ')}` : 'ok')
await browser.close()
process.exit(failures.length ? 1 : 0)
