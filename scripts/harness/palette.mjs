/**
 * The centred command palette (COMMAND-PALETTE-DISCOVERY.md §3, AC-CP2/CP9):
 * placement at two heights, no vertical jump as the list grows, focus in and
 * focus back, Arabic, dark. jsdom does no layout, so this is the only guard on
 * every number below. Reads HARNESS_BASE.
 *
 *   npx vite --port 4331
 *   node scripts/harness/palette.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4331'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

/** §3 — 640 wide, top edge at 16vh, centred on the viewport. */
const WIDTH = 640
const TOP_FRACTION = 0.16
const TOLERANCE = 1

let failures = 0
const fail = (message) => {
  failures += 1
  console.log('FAIL', message)
}
const near = (actual, expected, label) => {
  const ok = Math.abs(actual - expected) <= TOLERANCE
  console.log(`  ${label.padEnd(34)} ${actual} (want ${expected} ±${TOLERANCE}) ${ok ? 'ok' : 'FAIL'}`)
  if (!ok) failures += 1
  return ok
}

const browser = await chromium.launch()

/** The panel's own box, plus how far each inline edge sits from the viewport. */
async function panelBox(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-slot="dialog-content"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      top: Math.round(r.top),
      width: Math.round(r.width),
      start: Math.round(r.left),
      end: Math.round(window.innerWidth - r.right),
      height: Math.round(r.height),
      viewport: window.innerHeight,
    }
  })
}

const triggerName = /Search or run a command|ابحث أو نفِّذ أمرًا/

async function openWithShortcut(page) {
  await page.keyboard.press('Control+K')
  await page.locator('[data-slot="dialog-content"]').waitFor({ timeout: 4000 })
  await page.waitForTimeout(250)
}

async function focusedIsPaletteInput(page) {
  return page.evaluate(() => {
    const el = document.activeElement
    return el?.tagName === 'INPUT' && el.closest('[data-slot="dialog-content"]') !== null
  })
}

/** One placement pass at one viewport, in one language and one colour scheme. */
async function pass({ label, width, height, arabic = false, dark = false, shot }) {
  console.log(`\n== ${label}`)
  const ctx = await browser.newContext({
    viewport: { width, height },
    colorScheme: dark ? 'dark' : 'light',
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

  await page.goto(`${BASE}/operations/people`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  if (arabic) {
    await page.getByRole('button', { name: /^(Account|الحساب)$/ }).click()
    await page.waitForTimeout(200)
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await page.waitForTimeout(1200)
    const dir = await page.evaluate(() => document.documentElement.dir)
    if (dir !== 'rtl') fail(`${label}: dir is ${dir}, not rtl`)
    else console.log('  dir=rtl                            ok')
  }

  const trigger = page.getByRole('button', { name: triggerName })
  if ((await trigger.count()) === 0) fail(`${label}: no top-bar trigger`)

  await openWithShortcut(page)
  const rest = await panelBox(page)
  if (rest === null) {
    fail(`${label}: Control+K opened no dialog`)
    await ctx.close()
    return
  }

  near(rest.width, WIDTH, 'width')
  near(rest.top, Math.round(height * TOP_FRACTION), 'top edge at 16vh')
  /* Centred is the two inline gaps agreeing, which holds in both directions
     and needs no `left` of its own. */
  near(rest.start, rest.end, 'centred: start gap = end gap')

  if (!(await focusedIsPaletteInput(page))) fail(`${label}: focus is not in the palette's input`)
  else console.log('  focus in the input                 ok')

  if (shot) await page.screenshot({ path: `${OUT}/${shot}-rest.png` })

  /* AC-CP2's second half: a query with many rows must grow the panel DOWNWARD
     and leave the top edge where it was. */
  await page.keyboard.type('a')
  await page.waitForTimeout(900)
  const rows = await page.locator('[cmdk-item]').count()
  const typed = await panelBox(page)
  console.log(`  ${String(rows).padStart(3)} rows after typing, height ${rest.height} -> ${typed.height}`)
  near(typed.top, rest.top, 'top edge did not move')
  near(typed.width, WIDTH, 'width did not move')
  if (typed.height > Math.round(height * 0.6) + TOLERANCE)
    fail(`${label}: panel is ${typed.height}px, past the 60vh cap of ${Math.round(height * 0.6)}`)

  if (shot) await page.screenshot({ path: `${OUT}/${shot}-query.png` })

  /* AC-CP10 — Escape closes and focus goes back to the control that opened it.
     Opened here by the trigger, so that is where it must land. */
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await trigger.click()
  await page.locator('[data-slot="dialog-content"]').waitFor({ timeout: 4000 })
  await page.waitForTimeout(250)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  const back = await page.evaluate(
    () => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName,
  )
  if (!triggerName.test(String(back))) fail(`${label}: focus returned to "${back}", not the trigger`)
  else console.log('  focus returned to the trigger      ok')

  if (errors.length) {
    failures += 1
    console.log('  page errors:', errors)
  }
  await ctx.close()
}

await pass({ label: '1280x720', width: 1280, height: 720, shot: 'palette-720' })
await pass({ label: '1280x900', width: 1280, height: 900, shot: 'palette-900' })
await pass({ label: 'arabic 1280x900', width: 1280, height: 900, arabic: true, shot: 'palette-ar' })
await pass({ label: 'dark 1280x900', width: 1280, height: 900, dark: true, shot: 'palette-dark' })

await browser.close()
console.log(failures === 0 ? '\nPASS' : `\n${failures} failure(s)`)
process.exitCode = failures === 0 ? 0 : 1
