/**
 * Two audits over the redesigned boards: text contrast and horizontal overflow,
 * in both themes and in both languages.
 *
 * **Contrast composites over the ancestor chain rather than over white.** An
 * earlier pass of this audit reported 17 phantom failures in dark because it
 * assumed a transparent background meant paper; the band is the one surface in
 * the product where that assumption is catastrophically wrong.
 *
 * **The theme is set through `colorScheme`, and asserted.** Seeding
 * `localStorage` does not apply it — an earlier pass tested light twice and the
 * only tell was two identical node counts.
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:4325'
const ROUTES = [
  '/management/overview',
  '/management/performance',
  '/management/risk',
  '/management/growth',
  '/management/zones',
  '/operations/overview',
  '/support/overview',
  '/support/fairness',
  '/admin/overview',
]
const WIDTHS = [390, 768, 1280, 1440, 2400]

const AUDIT = `(() => {
  const parse = (c) => {
    const m = c.match(/rgba?\\(([^)]+)\\)/)
    if (!m) return null
    const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number)
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
  }
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  })
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
  }
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
    return (x + 0.05) / (y + 0.05)
  }
  /* Walk the ancestors front to back and composite onto the first OPAQUE
     layer. Compositing over white is what produced the phantom failures. */
  const ground = (el) => {
    const stack = []
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor)
      if (!c || c.a === 0) continue
      stack.push(c)
      if (c.a === 1) break
    }
    if (stack.length === 0) return { r: 255, g: 255, b: 255, a: 1 }
    let base = stack.pop()
    while (stack.length) base = over(stack.pop(), base)
    return base
  }

  const bad = []
  let checked = 0
  for (const el of document.querySelectorAll('*')) {
    if (el.closest('[aria-hidden="true"]')) continue
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim())
      .join(' ')
    if (!text) continue
    const s = getComputedStyle(el)
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const fg = parse(s.color)
    if (!fg) continue
    checked++
    const size = parseFloat(s.fontSize)
    const bold = Number(s.fontWeight) >= 700
    const large = size >= 24 || (size >= 18.66 && bold)
    const need = large ? 3 : 4.5
    const got = ratio(over(fg, ground(el)), ground(el))
    if (got < need - 0.01) bad.push({ text: text.slice(0, 44), size, got: +got.toFixed(2), need })
  }

  const doc = document.documentElement
  const overflow = doc.scrollWidth - doc.clientWidth
  const wide = []
  if (overflow > 1) {
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.right > doc.clientWidth + 1 || r.left < -1) {
        wide.push({ tag: el.tagName, cls: String(el.className).slice(0, 70), right: Math.round(r.right) })
      }
    }
  }
  return { checked, bad, overflow, wide: wide.slice(0, 5) }
})()`

const browser = await chromium.launch()
let totalChecked = 0
const failures = []

for (const [scheme, lang, dir] of [
  ['light', 'en', 'ltr'],
  ['dark', 'en', 'ltr'],
  ['light', 'ar', 'rtl'],
]) {
  const ctx = await browser.newContext({ colorScheme: scheme })
  const page = await ctx.newPage()
  /* **Switched through the UI, not seeded into storage.** The language store is
     namespaced by operator id, so a `localStorage` key written before sign-in
     lands in a namespace nothing reads — an earlier pass of this audit did
     exactly that and tested English twice under an `ar` label. The assertion at
     the foot of the loop is what caught it and it stays. */
  if (lang === 'ar') {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(BASE + ROUTES[0], { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByRole('menuitemradio', { name: /Arabic|عرب/i }).click()
    await page.waitForFunction(() => document.documentElement.dir === 'rtl', null, { timeout: 8000 })
    await page.keyboard.press('Escape')
  }
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      const got = await page.evaluate(AUDIT)
      totalChecked += got.checked
      if (got.bad.length)
        failures.push({ kind: 'contrast', scheme, lang, width, route, items: got.bad.slice(0, 4) })
      if (got.overflow > 1)
        failures.push({ kind: 'overflow', scheme, lang, width, route, by: got.overflow, wide: got.wide })
    }
  }
  const applied = await page.evaluate(() => ({
    cls: document.documentElement.className,
    dir: document.documentElement.dir,
    lang: document.documentElement.lang,
  }))
  if (scheme === 'dark' && !/dark/.test(applied.cls))
    throw new Error(`dark not applied: ${JSON.stringify(applied)}`)
  if (dir === 'rtl' && applied.dir !== 'rtl')
    throw new Error(`rtl not applied: ${JSON.stringify(applied)}`)
  console.log(`${scheme}/${lang}: root="${applied.cls}" dir="${applied.dir}" lang="${applied.lang}"`)
  await ctx.close()
}

console.log(`\nnodes with text checked: ${totalChecked}`)
console.log(`failures: ${failures.length}`)
for (const f of failures.slice(0, 25)) console.log(JSON.stringify(f))
await browser.close()
