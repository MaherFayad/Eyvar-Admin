/**
 * **T2.1, T2.3, T5.8 and T7.3's evidence.** Market & Zones at D2's minimum
 * viewport, measured in the DOM: jsdom does no layout, so nothing else can say
 * whether the inspector floats, how many list rows an operator can see, or how
 * big the legend's text is.
 *
 * Run the dev server first: `npx vite --port 4342`.
 *
 *   node scripts/harness/zones.mjs [label]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4342'
const LABEL = process.argv[2] ?? 'now'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const measure = () =>
  // eslint-disable-next-line no-undef
  ({
    viewport: { w: window.innerWidth, h: window.innerHeight },
    dir: document.documentElement.dir,
    aside: (() => {
      const el = document.querySelector('aside')
      if (!el) return null
      const b = el.getBoundingClientRect()
      return {
        top: Math.round(b.top),
        bottom: Math.round(b.bottom),
        width: Math.round(b.width),
        position: getComputedStyle(el).position,
      }
    })(),
    /* Both inspector actions. `inViewport` is T2.1's assertion. */
    actions: [...document.querySelectorAll('aside button')]
      .filter((b) => /Steer|Queue|توجيه|جدولة/.test(b.textContent ?? ''))
      .map((b) => {
        const r = b.getBoundingClientRect()
        return {
          label: (b.textContent ?? '').trim().slice(0, 30),
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          inViewport: r.top >= 0 && r.bottom <= window.innerHeight,
        }
      }),
    /* T2.1: how many zone rows are fully visible without scrolling. */
    listRows: (() => {
      const list = document.querySelector('[aria-labelledby="zones-map-list-heading"]')
      if (!list) return null
      const rows = [...list.querySelectorAll('li')]
      return {
        total: rows.length,
        rowHeight: rows[0] ? Math.round(rows[0].getBoundingClientRect().height) : null,
        fullyVisible: rows.filter((r) => {
          const b = r.getBoundingClientRect()
          return b.top >= 0 && b.bottom <= window.innerHeight && b.height > 0
        }).length,
      }
    })(),
    inspectorHeight: (() => {
      const el = document.querySelector('aside > div')
      return el ? Math.round(el.getBoundingClientRect().height) : null
    })(),
    map: (() => {
      const el = document.querySelector('figure [dir="ltr"]')
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { top: Math.round(b.top), height: Math.round(b.height), width: Math.round(b.width) }
    })(),
    /* T2.3: the readings strip. `columns` must be 5 at 1280. */
    strip: (() => {
      const el = document.querySelector('ul[data-numeric]')
      if (!el) return null
      return {
        columns: getComputedStyle(el).gridTemplateColumns.split(' ').length,
        height: Math.round(el.getBoundingClientRect().height),
      }
    })(),
    /* T5.8: the legend and attribution. */
    caption: (() => {
      const el = document.querySelector('figcaption')
      if (!el) return null
      const s = getComputedStyle(el)
      return {
        fontSize: s.fontSize,
        backgroundImage: s.backgroundImage,
        backgroundColor: s.backgroundColor,
        color: s.color,
      }
    })(),
    /* T7.3: the view switch and the table. */
    viewSwitch: [...document.querySelectorAll('[role="tab"], [role="radio"]')]
      .map((b) => (b.textContent ?? '').trim())
      .filter(Boolean),
    table: (() => {
      const t = document.querySelector('table')
      if (!t) return null
      return {
        headers: [...t.querySelectorAll('thead th')].map((th) => (th.textContent ?? '').trim()),
        rows: t.querySelectorAll('tbody tr').length,
      }
    })(),
    board: [...document.querySelectorAll('h2, h3')]
      .map((h) => (h.textContent ?? '').trim())
      .filter(Boolean)
      .slice(0, 14),
    overflowY: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    emDashes: (document.body.innerText.match(/—/g) ?? []).length,
  })

const browser = await chromium.launch()

for (const [name, url] of [
  ['zones-map', '/management/zones'],
  ['zones-table', '/management/zones?view=table'],
]) {
  for (const lang of ['en', 'ar']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
    await page.goto(BASE + url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    if (lang === 'ar') {
      await page.getByRole('button', { name: 'Account' }).click()
      await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
      await page.waitForTimeout(2600)
    }
    const facts = await page.evaluate(measure)
    await page.screenshot({ path: `${OUT}/${name}-${lang}-1280-${LABEL}.png`, fullPage: name === 'zones-table' })
    console.log(`\n=== ${name} ${lang} 1280x800 ${LABEL} ===`)
    console.log(JSON.stringify(facts, null, 2))
    if (errors.length) console.log('ERRORS', errors)
    await ctx.close()
  }
}

await browser.close()
