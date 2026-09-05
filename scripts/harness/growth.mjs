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

const measure = () => {
  /* +2, not +1: a checkbox control reports a one-pixel overshoot on its own
     root and would otherwise count as a clipped cell in every row. */
  const isClipped = (cell) =>
    [cell, ...cell.querySelectorAll('*')].some(
      (el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2,
    )
  const clipped = (table, selector) =>
    [...table.querySelectorAll(selector)].filter(isClipped).length
  // eslint-disable-next-line no-undef
  return {
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
        /* T5.1 — a cell whose content is wider than its box. The comparison is
           on the TRUNCATING element, not on the `td`: `truncate` sits on an
           inner span, so a `td` measurement reports zero on a clipped name. */
        /* The identity is the first column with a header, which is not cell 0
           on a table that carries a selection column. */
        identityTruncated: (() => {
          const heads = [...t.querySelectorAll('thead th')]
          const index = heads.findIndex((th) => (th.textContent ?? '').trim() !== '')
          if (index < 0) return 0
          return [...t.querySelectorAll('tbody tr')].filter((row) =>
            row.children[index] ? isClipped(row.children[index]) : false,
          ).length
        })(),
        anyCellTruncated: clipped(t, 'tbody tr td'),
        clippedByColumn: (() => {
          const heads = [...t.querySelectorAll('thead th')].map((th) =>
            (th.textContent ?? '').trim(),
          )
          const counts = {}
          for (const row of t.querySelectorAll('tbody tr')) {
            ;[...row.children].forEach((cell, i) => {
              /* A column with no header is chrome - the selection box, the
                 action lane - and has no text to clip. */
              const name = heads[i]
              if (!name) return
              if (isClipped(cell)) counts[name] = (counts[name] ?? 0) + 1
            })
          }
          return counts
        })(),
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
    /* The strip and the table must be reachable without scrolling two
       viewports, which is what put `views` above the board's evidence. */
    stripTop: (() => {
      const el = document.querySelector('[role="tab"]')
      return el ? Math.round(el.getBoundingClientRect().top) : null
    })(),
    tableTop: (() => {
      const el = document.querySelector('table')
      return el ? Math.round(el.getBoundingClientRect().top) : null
    })(),
  }
}

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
