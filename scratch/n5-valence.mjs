/**
 * N-5 — is valence on a metric tile carried by anything but hue?
 *
 * `MetricTile.tsx:93-96` and `:112-113` claim a valence WORD renders beside the
 * chip. `MetricDelta`'s own doc claims an `sr-only` clause. Both cannot be
 * checked by reading the file, which is how they came to disagree, so this
 * reads the rendered tile:
 *
 *   - the delta run's VISIBLE text (what a sighted reader gets)
 *   - the delta run's `sr-only` text (what a screen reader gets)
 *   - the computed colour of the run
 *   - the accessible name of the control the delta sits inside, computed by
 *     Chromium itself, so "is the clause reachable" is answered by the browser
 *     rather than by reading the ARIA spec
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5411'
const OUT = './scratch/shots-n5'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
await page.goto(`${BASE}/management/risk`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)

const deltas = await page.evaluate(() => {
  /* The delta run is the only element carrying `tabular-nums` next to a caret,
     so it is found by structure rather than by a class string. */
  const runs = [...document.querySelectorAll('span')].filter(
    (s) => s.querySelector('bdi') && s.querySelector('svg') && s.querySelector('.sr-only'),
  )
  return runs.slice(0, 12).map((run) => {
    const srOnly = [...run.querySelectorAll('.sr-only')].map((n) => n.textContent.trim())
    const visible = (() => {
      const clone = run.cloneNode(true)
      clone.querySelectorAll('.sr-only').forEach((n) => n.remove())
      return clone.textContent.replace(/\s+/g, ' ').trim()
    })()
    const owner = run.closest('[role="radio"], a, button')
    return {
      visible,
      srOnly,
      colour: getComputedStyle(run).color,
      caret: run.querySelector('svg')?.getAttribute('class'),
      caretAriaHidden: run.querySelector('svg')?.getAttribute('aria-hidden'),
      ownerRole: owner ? owner.getAttribute('role') ?? owner.tagName.toLowerCase() : null,
      ownerHasAriaLabel: owner ? owner.hasAttribute('aria-label') : null,
    }
  })
})
console.log('deltas found:', deltas.length)
console.log(JSON.stringify(deltas, null, 1))

/* Chromium's own accessible-name computation on the first two tiles, so the
   sr-only clause is proved REACHABLE rather than merely present. */
const radios = page.getByRole('radio')
const n = Math.min(await radios.count(), 4)
for (let i = 0; i < n; i += 1) {
  const el = radios.nth(i)
  const name = await el.evaluate((node) => node.textContent.replace(/\s+/g, ' ').trim())
  const snap = await el.ariaSnapshot().catch(() => '(no snapshot)')
  console.log(`\nradio ${i} accessible content: ${JSON.stringify(name)}`)
  console.log(`radio ${i} aria snapshot:\n${snap}`)
}

await page.screenshot({ path: `${OUT}/board-risk.png`, fullPage: false })

/* The greyscale question, asked directly: with hue removed, does anything on
   the tile still say which way is good news? */
await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' })
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/board-risk-greyscale.png`, fullPage: false })

await browser.close()
