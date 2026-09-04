/**
 * The ride-request sheet, opened from the queue row, at the four viewports the
 * console is aligned at — plus Arabic, which is where the map's `dir="ltr"`
 * pin and the mirrored route arrow have to hold together.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4325'
const OUT = './scratch/shots-req'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()

for (const [w, h, tag, scheme, lang] of [
  [1440, 900, 'v1440', 'light', 'en'],
  [1920, 1080, 'v1920', 'dark', 'en'],
  [390, 844, 'v390', 'light', 'en'],
  [1440, 900, 'v1440-ar', 'light', 'ar'],
]) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    colorScheme: scheme,
    deviceScaleFactor: 1,
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

  if (lang === 'ar') {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('eyvar.language', 'ar')
      } catch {
        /* private window */
      }
    })
  }

  /* REQ-503 — breached by two minutes, held by another operator, KAFD to the
     airport. The row that exercises the countdown, the owner block and the
     longest route on the queue. */
  await page.goto(`${BASE}/operations/ride-requests?entity=REQ-503`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(1400)

  const probe = await page.evaluate(() => {
    const panel = document.querySelector('[role="dialog"]')
    const box = panel?.getBoundingClientRect()
    const overflowing = []
    if (panel) {
      for (const el of panel.querySelectorAll('*')) {
        if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
          const style = getComputedStyle(el)
          if (style.overflowX === 'visible') {
            overflowing.push(
              `${el.tagName}.${String(el.className).slice(0, 60)} ${el.scrollWidth}>${el.clientWidth}`,
            )
          }
        }
      }
    }
    const map = document.querySelector('svg[role="img"]')?.getBoundingClientRect()
    const tiles = document.querySelectorAll('img[src*="tile.openstreetmap"]').length
    return {
      panel: box ? { w: Math.round(box.width), h: Math.round(box.height) } : null,
      title: document.querySelector('[role="dialog"] h2, [role="dialog"] [id*="title"]')?.textContent,
      map: map ? { w: Math.round(map.width), h: Math.round(map.height) } : null,
      tiles,
      floats: [...document.querySelectorAll('[role="dialog"] [data-numeric]')]
        .slice(0, 4)
        .map((el) => el.textContent?.replace(/\s+/g, ' ').trim()),
      overflowing: overflowing.slice(0, 8),
    }
  })

  console.log(tag, JSON.stringify(probe, null, 1))
  if (errors.length) console.log(tag, 'CONSOLE', errors.slice(0, 5))

  await page.screenshot({ path: `${OUT}/${tag}.png` })
  await ctx.close()
}

await browser.close()
