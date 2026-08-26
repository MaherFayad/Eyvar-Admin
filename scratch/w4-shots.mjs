import { chromium } from 'playwright'

const ROUTES = [
  ['management/overview', 'mgmt-overview'],
  ['management/performance', 'mgmt-performance'],
  ['management/risk', 'mgmt-risk'],
  ['management/growth', 'mgmt-growth'],
  ['management/zones', 'mgmt-zones'],
  ['operations/overview', 'ops-overview'],
  ['support/overview', 'support-overview'],
  ['admin/overview', 'admin-overview'],
]

const b = await chromium.launch()
for (const width of [1280, 1440]) {
  const p = await b.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 })
  const errors = []
  p.on('pageerror', (e) => errors.push(String(e)))
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  for (const [route, name] of ROUTES) {
    await p.goto(`http://localhost:5199/${route}`, { waitUntil: 'networkidle' })
    await p.waitForTimeout(1200)
    await p.screenshot({ path: `./scratch/shots/w4-${name}-${width}.png`, fullPage: true })
  }
  console.log(width, 'errors:', errors.length, errors.slice(0, 5))
  await p.close()
}
await b.close()
console.log('done')
