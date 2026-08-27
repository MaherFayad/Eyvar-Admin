import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } })
const errors = []
p.on('pageerror', (e) => errors.push(String(e)))
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await p.goto('http://localhost:5199/management/overview', { waitUntil: 'networkidle' })
await p.waitForTimeout(600)
await p.evaluate(() => {
  document.documentElement.setAttribute('dir', 'rtl')
  document.documentElement.setAttribute('lang', 'ar')
})
await p.waitForTimeout(900)
await p.screenshot({ path: './scratch/shots/w4-mgmt-overview-rtl-1280.png', fullPage: true })
const probe = await p.evaluate(() => {
  const plot = document.querySelector('[role="img"][dir]')
  const rail = document.querySelector('nav')
  const tile = document.querySelector('main a[class*="group/tile"]')
  const h1 = document.querySelector('h1')
  const badge = document.querySelector('main [data-slot="badge"]')
  return {
    htmlDir: document.documentElement.dir,
    plotDir: plot?.getAttribute('dir') ?? null,
    plotComputedDir: plot ? getComputedStyle(plot).direction : null,
    h1Size: h1 ? getComputedStyle(h1).fontSize : null,
    railX: rail?.getBoundingClientRect().x ?? null,
    tileTextAlign: tile ? getComputedStyle(tile).textAlign : null,
    badgeText: badge?.textContent ?? null,
    axisTicks: [...document.querySelectorAll('.recharts-cartesian-axis-tick text')].slice(0, 4).map((n) => n.textContent),
  }
})
console.log(JSON.stringify(probe, null, 1))
console.log('errors:', errors.length, errors.slice(0, 3))
await b.close()
