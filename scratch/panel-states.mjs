/**
 * The panel's other bodies, and Arabic — rendered, not reasoned about.
 *
 * RPT-3 is the money report over a mostly-gap 90-day window with a series a
 * Support operator may not see, so it exercises the money split, the gap
 * sentence and the blocked body at once. `?failSeries=` gives the failed one.
 *
 *     node scratch/panel-states.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5199'
const OUT = './scratch/shots-hierarchy'
mkdirSync(OUT, { recursive: true })

const CASES = [
  ['money', '/management/reports/RPT-3', 1440, false],
  ['money-ar', '/management/reports/RPT-3', 1440, true],
  ['builder-ar', '/management/reports/RPT-1', 1440, true],
  ['fold', '/management/reports/RPT-2', 1440, false],
  ['failed', '/management/reports/RPT-1?failSeries=riders.registered', 1440, false],
  ['nodata', '/management/reports/RPT-3?q=', 1440, false],
  ['tile-ar', '/management/reports/dashboards/DSH-1', 1440, true],
]

const probe = () => {
  const round = (n) => Math.round(n * 10) / 10
  return [...document.querySelectorAll('[data-slot="card"], [data-slot="panel-frame"]')]
    .map((card) => {
      const value = card.querySelector('[data-slot="metric-value"]')
      const foot = card.querySelector('[data-slot="panel-population"]')
      const action = card.querySelector('a[data-slot="panel-action"]')
      const plot = card.querySelector('.recharts-surface')
      const title = card.querySelector('[data-slot="card-title"]')
      if (!title) return null
      const box = card.getBoundingClientRect()
      const vb = value?.getBoundingClientRect()
      return {
        title: (title.textContent ?? '').trim().slice(0, 30),
        w: round(box.width),
        value: value ? getComputedStyle(value).fontSize + ' "' + value.textContent.trim() + '"' : '—',
        valueTop: vb ? round(vb.top - box.top) : null,
        /* Does the quantity row wrap? Compare the numeral's line box to its
           parent's height. */
        rowH: value ? round(value.parentElement.getBoundingClientRect().height) : null,
        plot: plot ? 'yes' : 'no',
        foot: foot ? (foot.textContent ?? '').trim().slice(0, 68) : null,
        action: action ? round(action.getBoundingClientRect().top - box.top) : null,
      }
    })
    .filter(Boolean)
}

const browser = await chromium.launch()
for (const [name, path, width, arabic] of CASES) {
  const ctx = await browser.newContext({ viewport: { width, height: 1400 } })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e)))
  if (arabic) {
    /* Switch on a page whose header ends in the avatar, then navigate — the
       choice is persisted, so the builder gets it without a menu it does not
       put in the same place. `scratch/dash-rtl.mjs`'s route, reused. */
    await page.goto(BASE + '/management/reports/dashboards/DSH-1', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.locator('header button').last().click()
    await page.waitForTimeout(400)
    const ar = page
      .locator('[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]')
      .filter({ hasText: /عرب|Arabic|العربية/ })
    if (await ar.count()) await ar.first().click()
    else console.log('  !! no arabic menu item')
    await page.waitForTimeout(1500)
  }
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3200)
  console.log(`\n── ${name} (${path}) ─────────────────────────`)
  console.log('dir=', await page.evaluate(() => document.documentElement.dir))
  for (const r of await page.evaluate(probe)) {
    console.log(
      `${r.title.padEnd(32)} w=${String(r.w).padStart(5)} ${String(r.value).padEnd(22)} ` +
        `top=${String(r.valueTop).padStart(5)} rowH=${String(r.rowH).padStart(5)} plot=${r.plot} ` +
        `action=${String(r.action).padStart(5)}\n    foot: ${r.foot}`,
    )
  }
  if (errs.length) console.log('  pageerror:', errs.slice(0, 3))
  await page.screenshot({ path: `${OUT}/state.${name}.png` })
  await ctx.close()
}
await browser.close()
