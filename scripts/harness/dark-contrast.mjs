/**
 * The dark theme's contrast probe (CONTACT-CENTRE-REDESIGN-PLAN.md §3, AC-CC-01).
 * Switches the account menu's theme to Dark, captures the three routes the
 * plan's screenshots came from, and measures every rendered text node against
 * the ground it actually sits on. Fails on any ratio under 4.5 (3.0 at 18px+).
 *
 *   npx vite --port 4334   (or set HARNESS_BASE)
 *   node scripts/harness/dark-contrast.mjs [label]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4334'
const LABEL = process.argv[2] ?? 'now'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const ROUTES = [
  ['contact-centre-detail', '/support/contact-centre/CNV-102'],
  ['safety-detail', '/support/safety/INC-013'],
  ['pricing-rate-card', '/financials/pricing?view=rate-card'],
]

/* The account menu carries the theme radio group, beside the language one. */
async function switchToDark(page) {
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitemradio', { name: 'Dark' }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(800)
}

function probe() {
  const canvas = document.createElement('canvas').getContext('2d')
  const parse = (css) => {
    let m = css.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/)
    if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]]
    m = css.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/)
    if (m) return [+m[1] * 255, +m[2] * 255, +m[3] * 255, m[4] === undefined ? 1 : +m[4]]
    canvas.fillStyle = '#000'
    canvas.fillStyle = css
    const n = canvas.fillStyle
    if (n.startsWith('#')) return [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16), 1]
    m = n.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/)
    return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null
  }
  const over = (top, under) => {
    const a = top[3]
    return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1]
  }
  const lum = ([r, g, b]) => {
    const f = (c) => {
      c /= 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a, b) => {
    const x = lum(a)
    const y = lum(b)
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
  }
  const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

  const bodyBg = parse(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255, 1]
  /* The ground under an element: the nearest painted background-color, with a
     translucent layer composited over the one beneath it. A gradient or an
     image is a ground this probe cannot read, so it is reported, not judged. */
  const groundOf = (el) => {
    const layers = []
    let unknown = false
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.backgroundImage !== 'none') unknown = true
      const bg = parse(cs.backgroundColor)
      if (bg && bg[3] > 0) {
        layers.push(bg)
        if (bg[3] >= 1) break
      }
    }
    let ground = bodyBg
    for (const layer of layers.reverse()) ground = over(layer, ground)
    return { ground, unknown }
  }
  const skipped = { disabled: 0, hidden: 0, unknownGround: 0 }
  const rows = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.replace(/\s+/g, ' ').trim()
    if (!text) continue
    const el = node.parentElement
    if (!el || el.closest('script, style, svg, noscript, template')) continue
    let opacity = 1
    let disabled = false
    let hidden = false
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.display === 'none' || cs.visibility === 'hidden') hidden = true
      opacity *= Number(cs.opacity)
      if (n.hasAttribute('disabled') || n.getAttribute('aria-disabled') === 'true' || n.hasAttribute('data-disabled')) disabled = true
    }
    if (hidden || opacity === 0) {
      skipped.hidden += 1
      continue
    }
    const range = document.createRange()
    range.selectNodeContents(node)
    const rect = range.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) {
      skipped.hidden += 1
      continue
    }
    if (disabled) {
      skipped.disabled += 1
      continue
    }
    const cs = getComputedStyle(el)
    const { ground, unknown } = groundOf(el)
    if (unknown) {
      skipped.unknownGround += 1
      continue
    }
    let fg = parse(cs.color)
    if (!fg) continue
    if (opacity < 1) fg = [fg[0], fg[1], fg[2], fg[3] * opacity]
    const ink = fg[3] < 1 ? over(fg, ground) : fg
    const size = parseFloat(cs.fontSize)
    const r = ratio(ink, ground)
    rows.push({
      text: text.slice(0, 40),
      fg: hex(ink),
      bg: hex(ground),
      size,
      weight: cs.fontWeight,
      ratio: Math.round(r * 1000) / 1000,
      floor: size >= 18 ? 3 : 4.5,
      inViewport: rect.bottom > 0 && rect.top < innerHeight,
    })
  }
  return { rows, skipped, dark: document.documentElement.classList.contains('dark') }
}

const browser = await chromium.launch()
let failures = 0
for (const [name, url] of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.goto(BASE + url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await switchToDark(page)
  await page.screenshot({ path: `${OUT}/dark-${name}-${LABEL}.png`, fullPage: false })

  const { rows, skipped, dark } = await page.evaluate(probe)
  const fails = rows.filter((r) => r.ratio < r.floor)
  /* One line per distinct ink/ground/size, so a repeated cell reads once. */
  const groups = new Map()
  for (const f of fails) {
    const key = `${f.fg} on ${f.bg} @${f.size}px/${f.weight}`
    const g = groups.get(key) ?? { key, ratio: f.ratio, count: 0, sample: f.text }
    g.count += 1
    groups.set(key, g)
  }
  const minRatio = rows.length ? Math.min(...rows.map((r) => r.ratio)) : null
  const summary = {
    dark,
    nodes: rows.length,
    fails: fails.length,
    minRatio,
    under12px: rows.filter((r) => r.size < 12).length,
    skipped,
    errors,
  }
  console.log(`${name} ${LABEL}`, JSON.stringify(summary), fails.length || !dark || errors.length ? 'FAIL' : 'ok')
  for (const g of [...groups.values()].sort((a, b) => a.ratio - b.ratio)) {
    console.log(`  ${g.ratio.toFixed(2)}  ${g.key}  x${g.count}  "${g.sample}"`)
  }
  /* AC-CC-03: what is still under 12px, so the two allowed cases can be
     checked by eye rather than assumed. One line per distinct text. */
  const small = new Map()
  for (const r of rows.filter((r) => r.size < 12)) small.set(r.text, (small.get(r.text) ?? 0) + 1)
  if (small.size) console.log(`  under 12px: ${[...small].map(([t, n]) => `"${t}"${n > 1 ? ` x${n}` : ''}`).join(', ')}`)
  if (fails.length || !dark || errors.length) failures += 1
  await ctx.close()
}
await browser.close()
process.exit(failures ? 1 : 0)
