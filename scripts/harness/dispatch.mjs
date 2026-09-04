/**
 * **Live Dispatch's evidence** — T2.2, T1.3 and T4.2, measured in Chromium
 * because jsdom draws no map and lays out no floating panel.
 *
 * Prints, at 1280 x 800 (D2's minimum viewport):
 *   feed / rail   the panels' bounding boxes. Both must sit inside the first
 *                 viewport: X1 measured the feed stacked below a 4:3 map with
 *                 `Assign captain` off the fold.
 *   offFrame      captains the declared `MAP_BOUNDS` leaves outside the frame.
 *                 `Fit to fleet` must take it to 0.
 *   enums         raw `instant` / `subscription` / `Economy` in the feed (X2).
 *   meta          the header's freshness line, sampled twice so the tick shows.
 *
 * `node scripts/harness/dispatch.mjs [en|ar] [label]`
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4345'
const OUT = './scripts/harness/shots'
const LANG = process.argv[2] === 'ar' ? 'ar' : 'en'
const LABEL = process.argv[3] ?? 'now'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))

await page.goto(`${BASE}/operations/dispatch`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

if (LANG === 'ar') {
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await page.waitForTimeout(2600)
}

/** The four numbers, read off the live DOM. */
const probe = () =>
  page.evaluate(() => {
    const box = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        top: Math.round(r.top),
        start: Math.round(r.left),
        w: Math.round(r.width),
        h: Math.round(r.height),
        bottom: Math.round(r.bottom),
      }
    }
    const tabs = document.querySelector('[role="tablist"]')
    const feed = tabs?.closest('div.rounded-xl') ?? null
    const rail = document.querySelector('#dispatch-layer-trips')?.closest('[data-slot="card"]') ?? null
    const map = document.querySelector('#dispatch-map-heading')?.parentElement ?? null

    /* The caption the map prints when a mark falls outside the frame. */
    const caption = [...document.querySelectorAll('span')]
      .map((s) => s.textContent?.trim() ?? '')
      .find((t) => /outside|خارج/.test(t)) ?? ''

    const feedText = feed?.innerText ?? ''
    const ENUMS = ['instant', 'subscription', 'scheduled', 'Economy', 'Comfort', 'XL']
    return {
      dir: document.documentElement.dir,
      feed: box(feed),
      rail: box(rail),
      map: box(map),
      caption,
      rawEnums: ENUMS.filter((e) => feedText.includes(e)),
      meta: document.querySelector('header,[data-slot="page-header"]')?.innerText?.split('\n').find((l) => /ago|منذ|as of|حتى/.test(l)) ?? '',
      fitButton: [...document.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') || b.innerText.trim()).filter(Boolean),
    }
  })

const before = await probe()
await page.screenshot({ path: `${OUT}/dispatch-${LANG}-${LABEL}.png` })

/* T2.2 — the control, then the same measurement again. */
let after = null
const fit = page.getByRole('button', { name: LANG === 'ar' ? /الأسطول/ : /Fit to fleet/i })
if (await fit.count()) {
  await fit.first().click()
  await page.waitForTimeout(400)
  after = await probe()
  await page.screenshot({ path: `${OUT}/dispatch-${LANG}-${LABEL}-fitted.png` })
}

/* T1.3 — two readings 30 s apart. The printed age must differ. */
const metaAt = async () =>
  page.evaluate(() => {
    const el = [...document.querySelectorAll('span')].find((s) =>
      /ago|منذ/.test(s.textContent ?? ''),
    )
    return el?.textContent?.trim() ?? ''
  })
const metaT0 = await metaAt()
await page.waitForTimeout(30_000)
const metaT30 = await metaAt()

console.log(
  JSON.stringify(
    { lang: LANG, viewport: '1280x800', before, after, metaT0, metaT30, errors },
    null,
    2,
  ),
)
console.log('feed inside first viewport:', before.feed !== null && before.feed.bottom <= 800 && before.feed.top < 800)
console.log('rail inside first viewport:', before.rail !== null && before.rail.top < 800)
console.log('raw enums in the feed:', before.rawEnums.length)
console.log('meta at t0 / t+30s:', metaT0, '/', metaT30)

await browser.close()
