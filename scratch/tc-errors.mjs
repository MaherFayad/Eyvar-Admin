import { chromium } from 'playwright'
const b = await chromium.launch()
for (const view of ['captains', 'applications', 'compliance', 'riders']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  const seen = []
  p.on('pageerror', (e) => seen.push(`PAGEERROR ${e.message.split('\n')[0]}`))
  p.on('console', (m) => m.type() === 'error' && seen.push(`CONSOLE ${m.text().split('\n')[0]}`))
  await p.goto(`http://localhost:5199/operations/people?view=${view}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)
  const rows = await p.locator('tbody tr').count()
  console.log(view, 'rows=', rows, seen.length ? '\n  ' + seen.join('\n  ') : 'clean')
  await p.close()
}
await b.close()
