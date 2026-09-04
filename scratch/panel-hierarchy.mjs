/**
 * **The report canvas's hierarchy, measured in a real browser.**
 *
 * Screenshots the BUILDER panel row and a DASHBOARD tile at 1280 / 1440 / 1920,
 * and reports the numbers the audit asked for: the computed font size of the
 * headline numeral, how many lines of prose sit above it, the y offset at which
 * each panel's numeral starts (a row "reads as a set" only if they agree), and
 * where the panel's action anchor sits.
 *
 *     node scratch/panel-hierarchy.mjs before
 *     node scratch/panel-hierarchy.mjs after
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5199'
const TAG = process.argv[2] ?? 'run'
const OUT = `./scratch/shots-hierarchy`
mkdirSync(OUT, { recursive: true })

const WIDTHS = [1280, 1440, 1920]
const BUILDER = '/management/reports/RPT-1'
const BOARD = '/management/reports/dashboards/DSH-1'

/** Everything about one panel that decides whether a row reads as a set. */
const probe = () => {
  const round = (n) => Math.round(n * 10) / 10
  const cards = [...document.querySelectorAll('[data-slot="card"], [data-slot="panel-frame"]')]
  return cards
    .map((card) => {
      const value = card.querySelector('[data-slot="metric-value"], [data-slot="panel-value"]')
      const title = card.querySelector('[data-slot="card-title"]')
      const desc = card.querySelector('[data-slot="card-description"]')
      const action = card.querySelector('a[data-slot="panel-action"]')
      const foot = card.querySelector('[data-slot="panel-population"]')
      const plot = card.querySelector('.recharts-surface')
      if (!value && !plot) return null
      const box = card.getBoundingClientRect()
      const vb = value?.getBoundingClientRect()
      const cs = value ? getComputedStyle(value) : null
      return {
        title: (title?.textContent ?? '').trim().slice(0, 34),
        cardW: round(box.width),
        cardH: round(box.height),
        valuePx: cs ? cs.fontSize : null,
        valueText: (value?.textContent ?? '').trim(),
        /* Distance from the card's own top to the top of the numeral. Two
           panels in a row agree or they do not. */
        valueFromTop: vb ? round(vb.top - box.top) : null,
        /* How much prose sits ABOVE the numeral. */
        descLines: desc ? desc.innerText.split('\n').filter(Boolean).length : 0,
        descAboveValue: desc && vb ? desc.getBoundingClientRect().top < vb.top : false,
        plotTop: plot ? round(plot.getBoundingClientRect().top - box.top) : null,
        actionFromTop: action ? round(action.getBoundingClientRect().top - box.top) : null,
        populationInFoot: foot ? foot.innerText.split('\n').filter(Boolean).length : 0,
      }
    })
    .filter(Boolean)
}

const browser = await chromium.launch()

for (const [name, path, shot] of [
  ['builder', BUILDER, '[data-slot="card"]'],
  ['tile', BOARD, null],
]) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 1400 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e)))
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    const rows = await page.evaluate(probe)
    console.log(`\n── ${name} @ ${width} ──────────────────────────────────────`)
    for (const r of rows) {
      console.log(
        `${r.title.padEnd(36)} w=${String(r.cardW).padStart(6)} h=${String(r.cardH).padStart(6)} ` +
          `value=${String(r.valuePx).padStart(5)} "${r.valueText}" top=${String(r.valueFromTop).padStart(6)} ` +
          `prose=${r.descLines}${r.descAboveValue ? '↑' : ' '} plotTop=${String(r.plotTop).padStart(6)} ` +
          `action=${String(r.actionFromTop).padStart(6)} foot=${r.populationInFoot}`,
      )
    }
    if (errs.length) console.log('  pageerror:', errs.slice(0, 3))
    await page.screenshot({ path: `${OUT}/${TAG}.${name}.${width}.png`, fullPage: false })
    if (shot) {
      const first = page.locator(shot).first()
      if (await first.count()) {
        await first.screenshot({ path: `${OUT}/${TAG}.${name}.${width}.card.png` }).catch(() => {})
      }
    }
    await ctx.close()
  }
}

await browser.close()
