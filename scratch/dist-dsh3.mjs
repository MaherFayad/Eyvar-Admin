/** DSH-3: the cohort tile's percentages, and what the second half tile draws. */
import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:4399'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 1600 } })
const p = await ctx.newPage()
p.on('pageerror', (e) => console.log('  PAGEERROR', String(e).slice(0, 200)))
await p.goto(`${BASE}/management/reports/dashboards/DSH-3`, { waitUntil: 'networkidle' })
await p.waitForTimeout(3000)
const out = await p.evaluate(() => {
  /* Per LEAF, not per subtree: concatenating `2025-11` with `100%` invents a
     `20251100%` that nothing on screen ever showed. */
  const leaves = (root) =>
    [...root.querySelectorAll('*')]
      .filter((el) => el.children.length === 0)
      .map((el) => (el.textContent ?? '').trim())
  const roots = [...document.querySelectorAll('li')].filter((li) => li.querySelector('[data-slot="card"]'))
  const tiles = roots.filter((li) => !roots.some((o) => o !== li && o.contains(li)))
  return tiles.map((li) => ({
    title: (li.querySelector('[data-slot="card-title"]')?.textContent ?? '').trim().slice(0, 44),
    over100: leaves(li)
      .flatMap((s) => [...s.matchAll(/([\d,]+(?:\.\d+)?)\s*%/g)].map((m) => Number(m[1].replace(/,/g, ''))))
      .filter((n) => n > 100),
    pcts: leaves(li).flatMap((s) => [...s.matchAll(/([\d,]+(?:\.\d+)?)\s*%/g)]).length,
    numerals: [...li.querySelectorAll('[data-slot="metric-value"]')].map((el) => el.textContent),
    body: (li.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 200),
  }))
})
for (const tile of out) {
  console.log(`\n— ${tile.title}`)
  console.log(`   numerals=${JSON.stringify(tile.numerals)}  percentages=${tile.pcts}  over100=${JSON.stringify(tile.over100)}`)
  console.log(`   ${tile.body}`)
}
await p.screenshot({ path: './scratch/shots-dist/after.dsh3.en.1440.png', fullPage: true })
await b.close()
