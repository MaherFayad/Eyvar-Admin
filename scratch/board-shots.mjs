/**
 * Capture pass for the board redesign — the band, the chapters, the chart row,
 * at desktop and at 390, in both themes.
 *
 * The shell scrolls an inner region rather than the document, so `fullPage`
 * captures one viewport and stops. What is captured instead is the SCROLLING
 * ELEMENT itself, which Playwright grows the surface to fit.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4325'
const OUT = './scratch/shots-board'
mkdirSync(OUT, { recursive: true })

const ROUTES = process.argv[2]
  ? [[process.argv[2].replace(/\//g, '-').replace(/^-/, ''), process.argv[2]]]
  : [
      ['mgmt-overview', '/management/overview'],
      ['mgmt-performance', '/management/performance'],
      ['mgmt-risk', '/management/risk'],
      ['mgmt-growth', '/management/growth'],
      ['mgmt-zones', '/management/zones'],
      ['ops-overview', '/operations/overview'],
      ['fairness', '/support/fairness'],
    ]

const browser = await chromium.launch()

for (const [w, h, tag, scheme] of [
  [1440, 2600, 'w1440', 'light'],
  [1440, 2600, 'w1440-dark', 'dark'],
  [390, 2400, 'w390', 'light'],
]) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    colorScheme: scheme,
    deviceScaleFactor: 1,
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))

  for (const [name, route] of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    /* The tallest element whose own scrollHeight exceeds its clientHeight is
       the shell's content region. Tag it so the screenshot can address it. */
    const found = await page.evaluate(() => {
      const all = [...document.querySelectorAll('div,main,section')]
      const scrollers = all.filter((el) => el.scrollHeight - el.clientHeight > 8)
      const target = scrollers.at(-1)
      if (!target) return false
      target.setAttribute('data-shot', '')
      return true
    })
    if (found) {
      /* The region is the scroller, so it clips its own overflow. Let it grow
         to its content for the duration of the shot. */
      await page.evaluate(() => {
        const el = document.querySelector('[data-shot]')
        el.style.height = `${el.scrollHeight}px`
        el.style.maxHeight = 'none'
        el.style.overflow = 'visible'
      })
      await page.waitForTimeout(250)
    }
    await page.screenshot({ path: `${OUT}/${name}.${tag}.png`, fullPage: true })
  }

  const cls = await page.evaluate(() => document.documentElement.className)
  if (scheme === 'dark' && !/dark/.test(cls))
    throw new Error(`dark theme did not apply; root className = ${JSON.stringify(cls)}`)

  console.log(`${tag}: captured ${ROUTES.length}, root="${cls}", console errors: ${errors.length}`)
  for (const e of errors.slice(0, 6)) console.log('   !', e)
  await ctx.close()
}

await browser.close()
