import { chromium } from 'playwright'
const BASE = 'http://localhost:5199'
const routes = [
  '/operations/requests',
  '/operations/assurance',
  '/operations/assurance?view=no-backup-captain',
  '/operations/assurance?view=awaiting-confirmation',
  '/operations/assurance?view=absences',
  '/operations/my-work?view=everything',
  '/support/safety',
  '/support/fairness',
  '/support/fairness?view=rating-disputes',
  '/support/fairness?view=rider-reports',
]
const b = await chromium.launch()
for (const arabic of [false, true]) {
  for (const route of routes) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
    await p.goto(BASE + route, { waitUntil: 'networkidle' })
    await p.waitForTimeout(700)
    if (arabic) {
      await p.getByRole('button', { name: 'Account' }).click()
      await p.waitForTimeout(300)
      await p.getByRole('menuitemradio', { name: 'Arabic' }).click()
      await p.waitForFunction(() => document.documentElement.dir === 'rtl', null, { timeout: 5000 })
      await p.keyboard.press('Escape')
      await p.waitForTimeout(700)
    }
    const r = await p.evaluate(() => {
      const sc = document.querySelector('[data-slot="table-container"]') ?? document.querySelector('table')?.parentElement
      const bar = document.querySelector('[data-slot="tabs-list"]')?.closest('div.flex.h-14')
      const rect = bar ? [...bar.children].map((c) => c.getBoundingClientRect()) : []
      const l = Math.min(...rect.map((x) => x.left), Infinity)
      const rr = Math.max(...rect.map((x) => x.right), -Infinity)
      return {
        tbl: sc ? [sc.scrollWidth, sc.clientWidth] : null,
        barW: bar ? Math.round(rr - l) : null,
        barAvail: bar ? Math.round(bar.clientWidth) : null,
      }
    })
    const over = r.tbl && r.tbl[0] > r.tbl[1] + 1
    const barOver = r.barW !== null && r.barW > r.barAvail + 1
    console.log(`${arabic ? 'ar' : 'en'} ${route.padEnd(48)} table=${r.tbl}${over ? '  TABLE-OVERFLOW' : ''} bar=${r.barW}/${r.barAvail}${barOver ? '  BAR-OVERFLOW' : ''}`)
    await p.close()
  }
}
await b.close()
