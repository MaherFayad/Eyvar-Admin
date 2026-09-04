/** The two new builder states, in Arabic: the local refusal and a mode restore. */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5411'
const OUT = './scratch/shots-n4'
mkdirSync(OUT, { recursive: true })

const encode = (q) =>
  Buffer.from(JSON.stringify(q))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const base = {
  m: ['captains.registered'],
  g: null,
  f: [],
  w: { kind: 'preset', preset: 'last-30d' },
  gr: 'day',
  c: 'none',
  ct: 'line',
}
const INVERTED = encode({ ...base, w: { kind: 'absolute', from: '2026-06-25', to: '2026-06-01' } })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

await page.goto(`${BASE}/management/reports?q=${INVERTED}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
await page.locator('header button').last().click()
await page.waitForTimeout(400)
const ar = page
  .locator('[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]')
  .filter({ hasText: /عرب|Arabic|العربية/ })
if (await ar.count()) await ar.first().click()
await page.waitForTimeout(3000)

console.log('dir =', await page.evaluate(() => document.documentElement.getAttribute('dir')))
console.log(
  'canvas =',
  JSON.stringify(
    await page.evaluate(() => {
      const s = [...document.querySelectorAll('section')].find((n) =>
        (n.getAttribute('aria-label') ?? '').length > 0 && n.querySelector('[role="alert"]'),
      )
      return s ? s.innerText.trim().split('\n').filter(Boolean).slice(0, 4) : null
    }),
  ),
)
console.log(
  'physical utilities on this screen:',
  await page.evaluate(() => {
    const bad = /(^|\s)(ml-|mr-|pl-|pr-|border-l|border-r|text-left|text-right|float-)/
    return [...document.querySelectorAll('main *')]
      .map((el) => el.getAttribute('class') ?? '')
      .filter((c) => bad.test(c))
      .slice(0, 8)
  }),
)
await page.screenshot({ path: `${OUT}/ar-refusal.png` })
await browser.close()
