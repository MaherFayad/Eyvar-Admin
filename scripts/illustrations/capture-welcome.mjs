/**
 * Captures the two system screenshots the welcome dialog shows (My Work and
 * the command palette), in English and Arabic and in both colour themes, as
 * 3:2 crops of the content region at 1280. Writes
 * `public/onboarding/<name>.<lang>.<theme>.png`.
 *
 *   npx vite --port 4327
 *   node scripts/illustrations/capture-welcome.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './public/onboarding'
const W = 840
const H = 560
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()

/* The crop hugs the content's start edge: the left in English, the right in Arabic. */
async function shot(page, name, lang, theme) {
  const box = await page.locator('main').boundingBox()
  const x = lang === 'ar' ? box.x + box.width - W : box.x
  await page.screenshot({ path: `${OUT}/${name}.${lang}.${theme}.png`, clip: { x, y: box.y, width: W, height: H } })
  console.log(`${name}.${lang}.${theme}.png`)
}

async function capture(page, lang, theme) {
  await page.goto(`${BASE}/operations/my-work`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  /* The welcome or the checklist would cover the screen; close it. */
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await shot(page, 'mywork', lang, theme)

  await page.goto(`${BASE}/operations/overview`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(700)
  const palette = await page.getByRole('dialog').boundingBox()
  const x = Math.max(0, Math.min(1280 - W, palette.x + palette.width / 2 - W / 2))
  await page.screenshot({ path: `${OUT}/palette.${lang}.${theme}.png`, clip: { x, y: 0, width: W, height: H } })
  console.log(`palette.${lang}.${theme}.png`)
  await page.keyboard.press('Escape')
}

/* The theme setting defaults to `system`, so the emulated colour scheme decides it. */
for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: theme,
  })
  const page = await ctx.newPage()
  await capture(page, 'en', theme)
  await page.getByRole('button', { name: /^(Account|الحساب)$/ }).click()
  await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await page.waitForTimeout(1500)
  await capture(page, 'ar', theme)
  await ctx.close()
}
await browser.close()
