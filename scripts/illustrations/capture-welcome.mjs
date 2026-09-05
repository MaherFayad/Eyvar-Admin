/**
 * Captures the three system screenshots the welcome dialog shows (My Work,
 * the activity log, the command palette), in English and Arabic, cropped to
 * the content region at 1280. Writes `public/onboarding/<name>.<lang>.png`.
 *
 *   npx vite --port 4327
 *   node scripts/illustrations/capture-welcome.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './public/onboarding'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

async function shot(name, lang) {
  const main = page.locator('main')
  const box = await main.boundingBox()
  await page.screenshot({
    path: `${OUT}/${name}.${lang}.png`,
    clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 560) },
  })
  console.log(`${name}.${lang}.png`)
}

async function settle(ms = 1500) {
  await page.waitForTimeout(ms)
}

async function capture(lang) {
  await page.goto(`${BASE}/operations/my-work`, { waitUntil: 'networkidle' })
  await settle()
  /* The auto-opened checklist would cover the screen; close it. */
  await page.keyboard.press('Escape')
  await settle(400)
  await shot('mywork', lang)

  await page.goto(`${BASE}/admin/activity`, { waitUntil: 'networkidle' })
  await settle()
  await page.keyboard.press('Escape')
  await settle(400)
  await shot('activity', lang)

  await page.goto(`${BASE}/operations/overview`, { waitUntil: 'networkidle' })
  await settle()
  await page.keyboard.press('Escape')
  await settle(400)
  await page.keyboard.press('Control+k')
  await settle(700)
  await page.screenshot({ path: `${OUT}/palette.${lang}.png`, clip: { x: 300, y: 0, width: 980, height: 560 } })
  console.log(`palette.${lang}.png`)
  await page.keyboard.press('Escape')
}

await capture('en')
await page.getByRole('button', { name: /Account/ }).click()
await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
await settle()
await capture('ar')
await browser.close()
