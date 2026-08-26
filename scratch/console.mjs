import { chromium } from 'playwright'
const b = await chromium.launch()
const errs = []
for (const path of ['/', '/management/performance', '/management/zones', '/operations/overview', '/operations/people', '/financials/revenue', '/admin/team', '/support/tickets', '/nonsense/route', '/operations/people?entity=RDR-1041']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 820 } })
  p.on('console', (m) => { if (m.type() === 'error') errs.push(`${path}  ${m.text().slice(0, 200)}`) })
  p.on('pageerror', (e) => errs.push(`${path}  PAGEERROR ${String(e).slice(0, 200)}`))
  await p.goto('http://localhost:5199' + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(800)
  await p.close()
}
await b.close()
console.log(errs.length ? errs.join('\n') : 'no console errors on 10 routes')
