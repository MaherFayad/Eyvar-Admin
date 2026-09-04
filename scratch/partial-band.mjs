/**
 * C-1a / H-1 evidence run.
 *
 * (a) Loads a saved LINE report whose last bucket is partial and reports whether
 *     any shape was painted inside `.recharts-reference-area`.
 * (b) Switches the same report to BAR and reports the same thing, for contrast.
 * (c) Tabs — with the real keyboard, so `:focus-visible` applies — until focus
 *     lands on `.recharts-surface`, and shoots it.
 *
 * Scratch only — not shipped, not imported by src.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:4325'
const OUT = './scratch/shots-partial'
const TAG = process.env.TAG ?? 'before'
mkdirSync(OUT, { recursive: true })

const probe = () =>
  // eslint-disable-next-line no-undef
  ({
    referenceAreaGroups: document.querySelectorAll('.recharts-reference-area').length,
    referenceAreaShapes: [
      ...document.querySelectorAll('.recharts-reference-area *'),
    ].map((r) => ({ tag: r.tagName, w: Math.round(r.getBoundingClientRect().width) })),
    referenceLines: [...document.querySelectorAll('.recharts-reference-line')].length,
    partialMarks: document.querySelectorAll('[data-slot="partial-bucket"]').length,
    surfaceTabIndex: [...document.querySelectorAll('.recharts-surface')].map((s) =>
      s.getAttribute('tabindex'),
    ),
  })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(`${BASE}/management/reports/RPT-1`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

console.log('LINE  ', JSON.stringify(await page.evaluate(probe)))
await page.locator('.recharts-surface').first().screenshot({ path: `${OUT}/${TAG}.line.png` })

/* Keyboard focus, for real, so `:focus-visible` is in play. */
await page.evaluate(() => document.body.focus())
let hops = 0
for (; hops < 120; hops += 1) {
  await page.keyboard.press('Tab')
  const onSurface = await page.evaluate(() =>
    document.activeElement?.classList.contains('recharts-surface'),
  )
  if (onSurface) break
}
console.log('focus  ', hops < 120 ? `reached .recharts-surface after ${hops + 1} Tabs` : 'never reached')
await page.waitForTimeout(150)
await page
  .locator('.recharts-surface')
  .first()
  .screenshot({ path: `${OUT}/${TAG}.focus.png` })

/* The bar branch of the same report — a band scale, where the band does draw. */
await page.getByRole('button', { name: /^bar$/i }).first().click()
await page.waitForTimeout(2000)
console.log('BAR   ', JSON.stringify(await page.evaluate(probe)))
await page.locator('.recharts-surface').first().screenshot({ path: `${OUT}/${TAG}.bar.png` })

console.log('page errors:', errors.length, errors.slice(0, 4))
await browser.close()
