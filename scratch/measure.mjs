/**
 * Screenshot + measure the shell frame. Used by `02-shell-fixes.md`.
 *
 * Reports the numbers the brief asks for rather than eyeballing them:
 *   - rail / column / content geometry at the 1280 floor
 *   - the y of every horizontal band edge (wordmark, column header, top bar)
 *   - the x of the page `<h1>` on three routes, at two widths
 *   - whether any rail label is actually clipped (scrollWidth > clientWidth)
 *   - the computed nav / canvas / active-pill colours
 */
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const ROUTES = [
  ['/management/performance', 'performance'],
  ['/management/zones', 'zones'],
  ['/operations/overview', 'ops-overview'],
]
const WIDTHS = [1280, 1440]

const browser = await chromium.launch()
const report = []

for (const width of WIDTHS) {
  for (const [path, name] of ROUTES) {
    const page = await browser.newPage({
      viewport: { width, height: 820 },
      deviceScaleFactor: 2,
    })
    await page.goto('http://localhost:5199' + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    await page.screenshot({ path: `./scratch/shots/shell-${name}-${width}.png` })

    const m = await page.evaluate(() => {
      const box = (sel) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
      }
      const navs = Array.from(document.querySelectorAll('nav'))
      const rail = navs[0]
      const column = navs[1]
      const header = document.querySelector('header')
      const h1 = document.querySelector('h1')
      const h2 = document.querySelector('h2')
      const rect = (el) => {
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
      }
      const cs = (el, prop) => (el ? getComputedStyle(el).getPropertyValue(prop) : null)

      // Every rail tile: is truncate actually firing?
      const labels = Array.from(rail?.querySelectorAll('a span') ?? [])
        .filter((s) => s.textContent && s.textContent.trim().length)
        .map((s) => ({
          text: s.textContent.trim(),
          clientWidth: s.clientWidth,
          scrollWidth: s.scrollWidth,
          clipped: s.scrollWidth > s.clientWidth,
        }))

      const activePill = document.querySelector('nav a[aria-current="page"]')
      const firstNavRow = column?.querySelector('a')

      return {
        rail: rect(rail),
        column: rect(column),
        topBar: rect(header),
        main: rect(document.querySelector('main')),
        h1: rect(h1),
        h1Text: h1?.textContent ?? null,
        columnHeading: rect(h2),
        columnHeadingText: h2?.textContent ?? null,
        topBarBottomBorderY: header ? Math.round(header.getBoundingClientRect().bottom) : null,
        columnHeaderBottomY: h2 ? Math.round(h2.parentElement.getBoundingClientRect().bottom) : null,
        railWordmarkBandBottomY: rail
          ? Math.round(rail.firstElementChild.getBoundingClientRect().bottom)
          : null,
        navRowHeight: firstNavRow ? Math.round(firstNavRow.getBoundingClientRect().height) : null,
        navRowPitch:
          column && column.querySelectorAll('a').length > 1
            ? Math.round(
                column.querySelectorAll('a')[1].getBoundingClientRect().top -
                  column.querySelectorAll('a')[0].getBoundingClientRect().top,
              )
            : null,
        colours: {
          navBg: cs(rail, 'background-color'),
          columnBg: cs(column, 'background-color'),
          canvasBg: cs(document.querySelector('main'), 'background-color'),
          topBarBg: cs(header, 'background-color'),
          activePillBg: cs(activePill, 'background-color'),
          railBorderInlineEnd: cs(rail, 'border-inline-end-width'),
          columnBorderInlineEnd: cs(column, 'border-inline-end-width'),
        },
        railLabels: labels,
      }
    })

    report.push({ width, path, ...m })
    await page.close()
  }
}

// RTL pass at 1280, one route.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 2 })
  await page.goto('http://localhost:5199/management/performance', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    document.documentElement.setAttribute('dir', 'rtl')
    document.documentElement.setAttribute('lang', 'ar')
  })
  await page.waitForTimeout(600)
  await page.screenshot({ path: './scratch/shots/shell-rtl-1280.png' })
  const rtl = await page.evaluate(() => {
    const navs = Array.from(document.querySelectorAll('nav'))
    const r = (el) => {
      const b = el.getBoundingClientRect()
      return { x: Math.round(b.x), w: Math.round(b.width) }
    }
    return { rail: r(navs[0]), column: r(navs[1]), main: r(document.querySelector('main')) }
  })
  report.push({ width: 1280, path: '/management/performance (dir=rtl)', ...rtl })
  await page.close()
}

await browser.close()
writeFileSync('./scratch/shots/measurements.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
