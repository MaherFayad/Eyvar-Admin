import { chromium } from 'playwright'
const ROUTES = ['/', '/management/overview', '/exec/overview', '/management/performance',
  '/management/risk', '/management/growth', '/management/zones',
  '/operations/overview', '/support/overview', '/admin/overview', '/support/fairness']
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
for (const route of ROUTES) {
  const msgs = []
  const onErr = (e) => msgs.push('pageerror: ' + String(e))
  const onCon = (m) => { if (m.type() === 'error') msgs.push('console.error: ' + m.text()) }
  p.on('pageerror', onErr); p.on('console', onCon)
  const res = await p.goto('http://localhost:5199' + route, { waitUntil: 'networkidle' })
  await p.waitForTimeout(900)
  const h1 = await p.locator('h1').first().textContent().catch(() => null)
  const overlay = await p.locator('vite-error-overlay').count()
  console.log(`${route.padEnd(26)} ${res.status()}  h1=${JSON.stringify(h1)}  overlay=${overlay}  ${msgs.length ? msgs.join(' | ') : 'no errors'}`)
  p.off('pageerror', onErr); p.off('console', onCon)
}
await b.close()
