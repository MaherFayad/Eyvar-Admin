/**
 * T9.13, T9.14 and T9.15's evidence, in Chromium: jsdom does no table layout,
 * so a row's height is only measurable here. Per view it prints every row
 * height (Alerts must be ≤ 56), how many rows wrap past one line, em dashes in
 * `innerText`, and horizontal overflow. Both languages, 1280 × 800 (D2's floor).
 *
 *   npx vite --port 4343 &&  node scripts/harness/reports-chrome.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:4343'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const VIEWS = [
  ['library', '/management/reports?view=reports'],
  ['dashboards', '/management/reports?view=dashboards'],
  ['alerts', '/management/reports?view=alerts'],
]

/** One line of a P1 row is 20px of text inside 12px of padding: 56 is two. */
const ONE_LINE_MAX = 56

const browser = await chromium.launch()

for (const lang of ['en', 'ar']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

  await page.goto(`${BASE}${VIEWS[0][1]}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  if (lang === 'ar') {
    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await page.waitForTimeout(2000)
  }

  for (const [name, url] of VIEWS) {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1800)
    await page.screenshot({ path: `${OUT}/reports-${name}-${lang}.png`, fullPage: true })

    const facts = await page.evaluate((oneLineMax) => {
      const rows = [...document.querySelectorAll('tbody tr')]
      const heights = rows.map((r) => Math.round(r.getBoundingClientRect().height))
      const text = document.body.innerText
      return {
        dir: document.documentElement.dir,
        rows: rows.length,
        heights,
        tallest: heights.length ? Math.max(...heights) : 0,
        overOneLine: heights.filter((h) => h > oneLineMax).length,
        emDashes: (text.match(/—/g) ?? []).length,
        /* A cell that WRAPS, which is the defect: a declared second line is
           not one. Anything taller than its own line box is wrapped. */
        wrappedCells: rows.reduce((count, row) => {
          const wrapped = [...row.querySelectorAll('td > * , td')].filter((node) => {
            const lh = parseFloat(getComputedStyle(node).lineHeight)
            return (
              node.childElementCount === 0 &&
              node.textContent.trim() !== '' &&
              Number.isFinite(lh) &&
              node.getBoundingClientRect().height > lh * 1.5
            )
          })
          return count + (wrapped.length > 0 ? 1 : 0)
        }, 0),
        /* T5.10 — a cell CSS is clipping is a cell cut mid-word with no
           ellipsis, whatever the code cut on a word boundary first. */
        clippedCells: rows.reduce(
          (count, row) =>
            count +
            [...row.querySelectorAll('td .truncate')].filter(
              (node) => node.scrollWidth - node.clientWidth > 1,
            ).length,
          0,
        ),
        overflowX:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
    }, ONE_LINE_MAX)

    console.log(`${name}/${lang}`, JSON.stringify(facts))
  }

  if (errors.length) console.log(lang, 'ERRORS', errors)
  await ctx.close()
}

await browser.close()
