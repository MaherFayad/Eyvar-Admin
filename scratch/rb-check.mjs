import { chromium } from 'playwright'
const OUT = './scratch/shots'
const q = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')

const CAPTAINS_VS_RIDERS = q({
  m: ['captains.registered', 'riders.registered'], g: null, f: [],
  w: { kind: 'preset', preset: 'last-30d' }, gr: 'day', c: 'none', ct: 'line',
})
const SPLIT = q({
  m: ['trips.completed'], g: 'trip.pickup', f: [],
  w: { kind: 'preset', preset: 'last-30d' }, gr: 'week', c: 'none', ct: 'line',
})
const PIE = q({
  m: ['subscriptions.started'], g: 'subscription.plan', f: [],
  w: { kind: 'preset', preset: 'last-30d' }, gr: 'none', c: 'none', ct: 'pie',
})
const REVENUE90 = q({
  m: ['revenue.total'], g: null, f: [],
  w: { kind: 'preset', preset: 'last-90d' }, gr: 'day', c: 'previous-period', ct: 'line',
})

const ROUTES = [
  ['/management/reports', 'rb-library'],
  ['/management/reports?view=dashboards', 'rb-dashboards'],
  ['/management/reports?view=alerts', 'rb-alerts'],
  ['/management/reports?q=', 'rb-unstarted'],
  [`/management/reports?q=${CAPTAINS_VS_RIDERS}`, 'rb-owner-question'],
  [`/management/reports?q=${SPLIT}`, 'rb-split'],
  [`/management/reports?q=${PIE}`, 'rb-pie'],
  [`/management/reports?q=${REVENUE90}`, 'rb-gaps'],
  ['/management/reports/dashboards/DSH-1', 'rb-dashboard'],
  ['/management/reports/dashboards/DSH-3', 'rb-dashboard-missing'],
]

const b = await chromium.launch()
const errors = []
for (const [lang, width] of [['en', 1440], ['ar', 1280]]) {
  const p = await b.newPage({ viewport: { width, height: 1100 }, deviceScaleFactor: 1 })
  p.on('pageerror', (e) => errors.push(`${lang} pageerror ${e}`))
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`${lang} console ${m.text()}`) })
  for (const [route, name] of ROUTES) {
    if (lang === 'ar' && !['rb-owner-question', 'rb-library', 'rb-alerts'].includes(name)) continue
    await p.goto(`http://localhost:5199${route}`, { waitUntil: 'networkidle' })
    if (lang === 'ar') {
      await p.evaluate(() => {
        document.documentElement.setAttribute('dir', 'rtl')
        document.documentElement.setAttribute('lang', 'ar')
      })
      await p.waitForTimeout(400)
    }
    await p.waitForTimeout(1400)
    await p.screenshot({ path: `${OUT}/${name}-${lang}-${width}.png`, fullPage: true })
  }
  await p.close()
}
await b.close()
console.log('errors:', errors.length)
errors.slice(0, 12).forEach((e) => console.log(' ', e))
