/**
 * **T7.1's evidence.** Management › Growth at D2's minimum viewport, all five
 * views, both languages: jsdom does no table layout, so nothing else can say
 * whether a column fits, whether an identity cell truncates, or whether the
 * page overflows sideways.
 *
 * Run a server first: `npx vite --port 4365` (or `vite preview`).
 *
 *   node scripts/harness/growth.mjs [label]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4365'
const LABEL = process.argv[2] ?? 'now'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const measure = () =>
  // eslint-disable-next-line no-undef
  ({
    viewport: { w: window.innerWidth, h: window.innerHeight },
    dir: document.documentElement.dir,
    h1: (document.querySelector('h1')?.textContent ?? '').trim(),
    /* The five-tab strip, wherever it renders: standing alone on the board view
       and inside the table toolbar on the other four. */
    tabs: [...document.querySelectorAll('[role="tab"]')].map((t) => ({
      label: (t.textContent ?? '').trim(),
      selected: t.getAttribute('aria-selected') === 'true',
    })),
    table: (() => {
      const t = document.querySelector('table')
      if (!t) return null
      const scroller = t.closest('[class*=overflow-x]') ?? t.parentElement
      const box = scroller.getBoundingClientRect()
      return {
        headers: [...t.querySelectorAll('thead th')].map((th) => {
          const r = th.getBoundingClientRect()
          return {
            text: (th.textContent ?? '').trim(),
            width: Math.round(r.width),
            /* A column the operator cannot see without scrolling sideways. */
            inBox: r.left >= box.left - 1 && r.right <= box.right + 1,
          }
        }),
        scrollWidth: scroller.scrollWidth,
        clientWidth: scroller.clientWidth,
        /* T7.1's overflow number: 0 means nothing is off the measure. */
        overflowX: Math.max(0, scroller.scrollWidth - scroller.clientWidth),
        rows: t.querySelectorAll('tbody tr').length,
        rowPitch: (() => {
          const r = t.querySelector('tbody tr')
          return r ? Math.round(r.getBoundingClientRect().height) : null
        })(),
        /* T5.1 — an identity cell whose content is wider than its box. */
        identityTruncated: [...t.querySelectorAll('tbody tr td:first-child')].filter(
          (td) => td.scrollWidth > td.clientWidth + 1,
        ).length,
        anyCellTruncated: [...t.querySelectorAll('tbody tr td')].filter(
          (td) => td.scrollWidth > td.clientWidth + 1,
        ).length,
      }
    })(),
    pagination: (() => {
      const el = [...document.querySelectorAll('p, span, div')].find((n) =>
        /Showing|عرض/.test(n.textContent ?? ''),
      )
      return el ? (el.textContent ?? '').trim().slice(0, 60) : null
    })(),
    /* X14 — no em dash reaches the operator, in either language. */
    emDashes: (document.body.innerText.match(/—/g) ?? []).length,
    overflowX: Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
    overflowY: Math.max(
      0,
      document.documentElement.scrollHeight - document.documentElement.clientHeight,
    ),
  })

const browser = await chromium.launch()

for (const [name, url] of [
  ['growth-board', '/management/growth'],
  ['growth-promos', '/management/growth?view=promos'],
  ['growth-referrals', '/management/growth?view=referrals'],
  ['growth-incentives', '/management/growth?view=incentives'],
  ['growth-messages', '/management/growth?view=messages'],
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
    await page.screenshot({ path: `${OUT}/${name}-${lang}-1280-${LABEL}.png` })
    /* The console scrolls inside its own region, so a first shot sees only the
       board; the table gets a second one with the table at the top. */
    if (name !== 'growth-board') {
      await page.evaluate(() => {
        document.querySelector('table')?.scrollIntoView({ block: 'start' })
      })
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${OUT}/${name}-${lang}-1280-table-${LABEL}.png` })
    }
    console.log(`\n=== ${name} ${lang} 1280x800 ${LABEL} ===`)
    console.log(JSON.stringify(facts, null, 2))
    if (errors.length) console.log('ERRORS', errors)
    await ctx.close()
  }
}

await browser.close()
