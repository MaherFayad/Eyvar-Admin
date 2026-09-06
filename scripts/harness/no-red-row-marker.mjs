/**
 * Proof that the red leading-edge row marker is gone and the critical row still
 * reads. Captures a queue, a Financials ledger, Trips and Support in light,
 * dark and Arabic, and probes each row for a destructive-filled bar.
 *
 *   HARNESS_BASE=http://localhost:4327 node <this>
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = process.env.HARNESS_OUT ?? './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const ROUTES = [
  ['ride-requests', '/operations/ride-requests'],
  ['my-work', '/operations/my-work'],
  ['payouts', '/financials/payouts'],
  ['credit-notes', '/financials/revenue?view=credit-notes'],
  ['refused-postings', '/financials/ledger?view=refused'],
  ['quick-rides', '/operations/quick-rides'],
  ['quick-rides-flagged', '/operations/quick-rides?view=flagged'],
  ['tickets', '/support/tickets'],
  ['safety', '/support/safety'],
  ['disputes', '/support/disputes'],
  ['captain-trips', '/operations/people?entity=DRV-1002&tab=trips'],
  ['inbox', '/support/contact-centre'],
]

async function menu(page, item) {
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitemradio', { name: item }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1200)
}

function probe() {
  const rgb = (c) => (c.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number)
  const isRed = (c) => {
    const [r, g, b] = rgb(c)
    return r !== undefined && r > 90 && r > g * 1.6 && r > b * 1.6
  }
  /* Any element narrow enough to be a 3px rule with a red fill, anywhere on
     the page. The marker was `w-marker` (3px) and `bg-destructive`. */
  const bars = [...document.querySelectorAll('span, div')].filter((el) => {
    const box = el.getBoundingClientRect()
    if (box.width === 0 || box.width > 6 || box.height < 12) return false
    return isRed(getComputedStyle(el).backgroundColor)
  })
  const rows = [...document.querySelectorAll('tbody tr, li[class*="group/row"]')]
  const criticalGround = rows.filter((r) => {
    const [red, green, blue] = rgb(getComputedStyle(r).backgroundColor)
    return red !== undefined && red > green + 4 && red > blue + 4
  })
  const words = /overdue|late|failed|unlinked|متأخر|فشل/i
  return {
    dir: document.documentElement.getAttribute('dir'),
    dark: document.documentElement.classList.contains('dark'),
    rows: rows.length,
    redBars: bars.length,
    redBarClasses: bars.slice(0, 3).map((b) => b.className.toString().slice(0, 80)),
    criticalRows: criticalGround.length,
    /* AC-50: every tinted row must also carry a WORD, so greyscale still reads. */
    criticalRowsWithoutWords: criticalGround.filter((r) => !words.test(r.innerText)).length,
    markerAttr: document.querySelector('[style*="--ev-row-marker-start"]') !== null,
  }
}

const browser = await chromium.launch()
let failures = 0
for (const mode of ['light', 'dark', 'arabic']) {
  for (const [name, url] of ROUTES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
    await page.goto(BASE + url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    if (mode === 'dark') await menu(page, 'Dark')
    if (mode === 'arabic') await menu(page, 'Arabic')
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT}/${mode}-${name}.png` })
    const facts = await page.evaluate(probe)
    const bad = facts.redBars > 0 || facts.markerAttr || errors.length > 0
    if (bad) failures += 1
    console.log(`${mode} ${name}`, JSON.stringify(facts), errors.length ? errors[0] : '', bad ? 'FAIL' : 'ok')
    await ctx.close()
  }
}
await browser.close()
console.log(failures ? `FAILURES ${failures}` : 'clean')
process.exit(failures ? 1 : 0)
