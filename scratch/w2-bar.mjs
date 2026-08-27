import { chromium } from 'playwright'
const BASE = 'http://localhost:5199'
const routes = ['/operations/requests', '/operations/assurance', '/operations/my-work', '/support/safety', '/support/fairness', '/operations/people']
const b = await chromium.launch()
for (const arabic of [false, true]) {
  for (const route of routes) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
    await p.goto(BASE + route, { waitUntil: 'networkidle' })
    await p.waitForTimeout(700)
    if (arabic) {
      await p.getByRole('button', { name: 'Account' }).click(); await p.waitForTimeout(300)
      await p.getByRole('menuitemradio', { name: 'Arabic' }).click()
      await p.waitForFunction(() => document.documentElement.dir === 'rtl', null, { timeout: 5000 })
      await p.keyboard.press('Escape'); await p.waitForTimeout(700)
    }
    const r = await p.evaluate(() => {
      const sort = [...document.querySelectorAll('button')].find((el) => /^Sort/.test(el.textContent.trim()))
      const list = document.querySelector('[data-slot="tabs-list"]')
      const box = sort?.getBoundingClientRect()
      return {
        track: list ? Math.round(list.getBoundingClientRect().width) : null,
        sortL: box ? Math.round(box.left) : null,
        sortR: box ? Math.round(box.right) : null,
      }
    })
    const out = r.sortL === null ? 'no sort control' : (r.sortR > 1280 || r.sortL < 0 ? 'OFF-SCREEN' : 'ok')
    console.log(`${arabic ? 'ar' : 'en'} ${route.padEnd(24)} track=${r.track} sort=[${r.sortL},${r.sortR}] ${out}`)
    await p.close()
  }
}
await b.close()
