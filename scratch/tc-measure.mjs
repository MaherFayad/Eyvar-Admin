/* Fix-list item 9 — re-measure `scrollWidth === clientWidth` on all four
   People views at the 1280 floor. Run against `vite preview` on :5199. */
import { chromium } from 'playwright'

const b = await chromium.launch()
const views = ['captains', 'applications', 'compliance', 'riders']
const out = []

for (const view of views) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.goto(`http://localhost:5199/operations/people?view=${view}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2200)
  const m = await p.evaluate(() => {
    const c = document.querySelector('[data-slot=table-container]')
    const head = document.querySelector('thead th:nth-child(2)')
    const row = document.querySelector('tbody tr:nth-child(2)')
    const styles = getComputedStyle(document.documentElement)
    return {
      scrollWidth: c?.scrollWidth ?? null,
      clientWidth: c?.clientWidth ?? null,
      headH: head ? Math.round(head.getBoundingClientRect().height * 10) / 10 : null,
      rowH: row ? Math.round(row.getBoundingClientRect().height * 10) / 10 : null,
      rowHTok: styles.getPropertyValue('--ev-row-h').trim(),
      headTok: styles.getPropertyValue('--ev-row-h-head').trim(),
      hairline2: styles.getPropertyValue('--ev-hairline2').trim(),
      pagePad: styles.getPropertyValue('--ev-page-pad').trim(),
    }
  })
  out.push({ view, ...m, clips: m.scrollWidth > (m.clientWidth ?? 0) })
  await p.close()
}
await b.close()
console.table(out)
