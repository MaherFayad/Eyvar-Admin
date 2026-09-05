/**
 * **Live Dispatch's evidence** — T2.2, T1.3 and T4.2, measured in Chromium
 * because jsdom draws no map and floats no panel over one.
 *
 * At 1280 x 800, D2's minimum viewport, it prints:
 *   feed / rail   the two panels' boxes. X1 measured the feed stacked BELOW a
 *                 4:3 map with `Dispatch captain` under the fold; both must now
 *                 sit inside the first viewport.
 *   offFrame      marks the frame does not reach, and `occluded`, marks a
 *                 floating panel covers. Both must be 0 after `Fit to fleet`.
 *   wireEnums     `instant` / `subscription` off the wire, in either language.
 *   latinLabels   `Economy` / `Comfort` in the Arabic feed (X2). 0 in `ar`.
 *   age           the meta line, sampled 30 s apart: T1.3's tick.
 *
 * ```
 * npx vite --port 4344
 * node scripts/harness/dispatch.mjs en
 * node scripts/harness/dispatch.mjs ar
 * ```
 *
 * `HARNESS_BASE` overrides the origin, because vite walks up from a port that
 * is already taken and parallel worktrees take several.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4344'
const OUT = './scripts/harness/shots'
const LANG = process.argv[2] === 'ar' ? 'ar' : 'en'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))

await page.goto(`${BASE}/operations/dispatch`, { waitUntil: 'networkidle' })
await page.waitForSelector('#dispatch-map-heading')
await page.waitForTimeout(1200)

if (LANG === 'ar') {
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await page.waitForTimeout(2600)
}

/** Everything read off the live DOM, in one pass. */
const probe = () =>
  page.evaluate(() => {
    const box = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        left: Math.round(r.left),
        width: Math.round(r.width),
        height: Math.round(r.height),
      }
    }

    /* `FeedPanel` is the panel div wrapping `Tabs` wrapping `TabsList`, and
       `MapRail`'s layer card is the one holding the trips switch. Structural,
       so neither depends on a class name that a restyle would move. */
    const tabs = document.querySelector('[role="tablist"]')
    const feed = tabs?.parentElement?.parentElement ?? null
    const rail =
      document.getElementById('dispatch-layer-trips')?.closest('[data-slot="card"]') ?? null
    /* The canvas is the one element pinned `dir="ltr"` (§9.1). */
    const canvas = document.querySelector('#dispatch-map-heading')?.parentElement
      ?.querySelector('[dir="ltr"]') ?? null

    /* T2.2 — every mark the board drew, against the canvas it drew in. The
       pins are real buttons; the destinations, the waiting rings and the
       captain dots are SVG. `Basemap` paints with `<img>`, so nothing here
       counts a tile. */
    let offFrame = 0
    let occluded = 0
    let marks = 0
    const covers = [feed, rail].filter(Boolean).map((el) => el.getBoundingClientRect())
    if (canvas) {
      const frame = canvas.getBoundingClientRect()
      const drawn = [
        ...canvas.querySelectorAll('svg circle, svg rect'),
        ...canvas.querySelectorAll('ul[role="list"] > li > button'),
      ]
      marks = drawn.length
      for (const mark of drawn) {
        const r = mark.getBoundingClientRect()
        const x = r.left + r.width / 2
        const y = r.top + r.height / 2
        if (x < frame.left || x > frame.right || y < frame.top || y > frame.bottom) offFrame += 1
        /* A mark inside the frame but under a floating panel is one an
           operator cannot see either. Counted apart, because the two have
           different corrections. */
        else if (covers.some((c) => x >= c.left && x <= c.right && y >= c.top && y <= c.bottom)) {
          occluded += 1
        }
      }
    }

    /* T4.2 — what X2 caught in the feed. `wire` is the raw enum, wrong in
       either language because English renders `Instant`. `latin` is the
       English label, which is the defect only in Arabic. */
    const feedText = feed?.innerText ?? ''
    const WIRE = ['instant', 'subscription']
    const LATIN = ['Economy', 'Comfort', 'Quick ride', 'Subscription', 'Instant']
    const captions = [...(canvas?.querySelectorAll('span') ?? [])]
      .map((s) => s.textContent?.trim() ?? '')
      .filter((text) => /outside|خارج|no place|بلا موقع/.test(text))

    return {
      dir: document.documentElement.dir,
      feed: box(feed),
      rail: box(rail),
      canvas: box(canvas),
      marks,
      offFrame,
      occluded,
      captions,
      wireEnums: WIRE.filter((slug) => feedText.includes(slug)),
      latinLabels: LATIN.filter((label) => feedText.includes(label)),
      /* T9.10 / T9.11 — a control whose whole content is a font glyph. */
      glyphButtons: [...document.querySelectorAll('button')].filter((b) =>
        /^[‹›←→↑↓⋯✓]+$/.test(b.textContent?.trim() ?? 'x'),
      ).length,
    }
  })

/** The meta line's own text — T1.3's age. */
const age = () =>
  page.evaluate(() => {
    const line = [...document.querySelectorAll('span')]
      .map((s) => s.textContent?.trim() ?? '')
      /* `dispatch.meta` in either language. `ثانية` rather than `منذ`, which
         an intervention's elapsed line also carries. */
      .find((text) => /ago|ثانية/.test(text))
    return line ?? ''
  })

const before = await probe()
const ageT0 = await age()
await page.screenshot({ path: `${OUT}/dispatch-${LANG}-1280.png` })

/* T2.2 — the control, then the same measurement again. */
const fit = page.getByRole('button', { name: LANG === 'ar' ? /ملاءمة/ : /Fit to fleet/i })
await fit.first().click()
await page.waitForTimeout(500)
const after = await probe()
await page.screenshot({ path: `${OUT}/dispatch-${LANG}-1280-fitted.png` })

/* T1.3 — the board re-reads on the shell's clock; the printed age must move. */
await page.waitForTimeout(30_000)
const ageT30 = await age()

console.log(JSON.stringify({ lang: LANG, viewport: '1280x800', before, after }, null, 2))
console.log('--- ' + LANG + ' @ 1280x800 ---')
console.log('feed inside first viewport:', before.feed !== null && before.feed.bottom <= 800)
console.log('rail inside first viewport:', before.rail !== null && before.rail.bottom <= 800)
console.log('marks drawn:', before.marks)
console.log('occluded by a panel before / after:', before.occluded, '/', after.occluded)
console.log('offFrame before / after Fit to fleet:', before.offFrame, '/', after.offFrame)
console.log('captions before / after:', JSON.stringify(before.captions), JSON.stringify(after.captions))
console.log('wire enums in the feed (0 in both):', JSON.stringify(before.wireEnums))
console.log('English labels in the feed (0 in ar):', JSON.stringify(before.latinLabels))
console.log('glyph-only buttons:', before.glyphButtons)
console.log('age at t0 / t+30s:', JSON.stringify(ageT0), '/', JSON.stringify(ageT30))
console.log('page errors:', errors.length, JSON.stringify(errors))

await browser.close()
