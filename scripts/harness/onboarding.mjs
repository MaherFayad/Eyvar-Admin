/**
 * The onboarding layer (ONBOARDING-UX-PLAN.md §4.6): auto-open after a user
 * switch, the checklist for each role at 1280, every illustration's rendered
 * size inside its budget, the menu path, and Arabic. Reads HARNESS_BASE.
 *
 *   npx vite --port 4327
 *   node scripts/harness/onboarding.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

/* The seeded operators, one per role. The Owner is the signed-in default, so
   she comes last: her sighting is stamped on first load and the menu path is
   what her pass proves. */
const USERS = [
  ['ops-manager', 'Yousef Al-Balawi'],
  ['finance', 'Fahad Al-Dosari'],
  ['support', 'Lina Al-Otaibi'],
  ['owner', 'Sarah Al-Rashid'],
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
let failures = 0
const fail = (message) => {
  failures += 1
  console.log('FAIL', message)
}

const dialog = () => page.locator('[role="dialog"]')

async function measureArt(label, measured = new Set()) {
  const arts = await page.evaluate(() =>
    [...document.querySelectorAll('[role="dialog"] [data-illustration]')].map((el) => {
      const r = el.getBoundingClientRect()
      return { key: el.dataset.illustration, w: Math.round(r.width), h: Math.round(r.height) }
    }),
  )
  let counted = 0
  for (const a of arts) {
    if (measured.has(a.key)) continue
    measured.add(a.key)
    counted += 1
    /* Three budgets: a step's art, the intro card's role art, the completed state. */
    const [maxW, maxH] =
      a.key === 'complete' ? [160, 120] : a.key.startsWith('role.') ? [144, 96] : [96, 72]
    const ok = a.w > 0 && a.h > 0 && a.w <= maxW && a.h <= maxH
    console.log(`  ${label.padEnd(12)} ${a.key.padEnd(24)} ${a.w}×${a.h} ${ok ? 'ok' : 'FAIL'}`)
    if (!ok) failures += 1
  }
  return counted
}

async function openAccountMenu() {
  await page.getByRole('button', { name: /^(Account|الحساب)$/ }).click()
  await page.waitForTimeout(200)
}

async function switchTo(name) {
  await openAccountMenu()
  await page.getByRole('menuitem', { name: /Switch user|تبديل المستخدم/ }).hover()
  await page.waitForTimeout(300)
  await page.getByRole('menuitemradio', { name: new RegExp(name) }).click()
  /* The layer waits for the landing screen's skeleton to clear, so give it
     the screen's own load time rather than a fixed pause. */
  await dialog().first().waitFor({ timeout: 8000 }).catch(() => undefined)
  await page.waitForTimeout(400)
}

async function walkSteps(label) {
  const triggers = dialog().locator('button[aria-expanded]')
  const n = await triggers.count()
  let seen = 0
  const measured = new Set()
  for (let i = 0; i < n; i += 1) {
    const trigger = triggers.nth(i)
    if (await trigger.isDisabled()) continue
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
      await trigger.click()
      await page.waitForTimeout(250)
    }
    seen += await measureArt(label, measured)
  }
  return { rows: n, arts: seen }
}

await page.goto(`${BASE}/operations/overview`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)

for (const [slug, name] of USERS) {
  console.log(`\n== ${slug}`)
  await switchTo(name)
  if (slug !== 'owner') {
    /* The welcome comes first: five slides, then Start opens the layer. */
    if ((await dialog().count()) === 0) fail(`${slug}: the welcome did not open after the switch`)
    if ((await dialog().getByText(/Welcome to Eyvar Admin/).count()) === 0) fail(`${slug}: the dialog is not the welcome`)
    await page.screenshot({ path: `${OUT}/welcome-${slug}.png` })
    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('button', { name: 'Next' }).click()
      await page.waitForTimeout(150)
    }
    await page.getByRole('button', { name: 'Start the checklist' }).click()
    await page.waitForTimeout(600)
    if ((await dialog().count()) === 0) fail(`${slug}: Start did not open the layer`)
    if (!page.url().includes('onboarding=')) fail(`${slug}: URL carries no onboarding param`)
  } else {
    /* Her first sighting happens here if the page did not load on her landing
       route; either way the menu path is what this pass proves. */
    if ((await dialog().count()) !== 0) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
    await openAccountMenu()
    await page.getByRole('menuitem', { name: /Getting started/ }).click()
    await page.waitForTimeout(600)
    if ((await dialog().count()) === 0) fail('owner: the menu entry did not open the layer')
  }
  await page.screenshot({ path: `${OUT}/onboarding-${slug}.png` })
  const { rows, arts } = await walkSteps(slug)
  console.log(`  ${rows} rows, ${arts} illustrations measured`)
  if (arts === 0) fail(`${slug}: no illustration rendered`)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  /* With the layer closed the beacon sits at the bottom inline-end corner. */
  const beacon = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="onboarding-beacon"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { right: Math.round(innerWidth - r.right), bottom: Math.round(innerHeight - r.bottom), w: Math.round(r.width) }
  })
  if (beacon === null) fail(`${slug}: no beacon after closing the layer`)
  else {
    console.log(`  beacon ${beacon.w}px wide, ${beacon.right}px from the end edge, ${beacon.bottom}px from the bottom`)
    if (beacon.right !== 16 || beacon.bottom !== 16) fail(`${slug}: beacon is not 16px from the corner`)
  }
  await page.screenshot({ path: `${OUT}/beacon-${slug}.png` })
}

console.log('\n== arabic')
await openAccountMenu()
await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
await page.waitForTimeout(1500)
await openAccountMenu()
await page.getByRole('menuitem', { name: /البدء/ }).click()
await page.waitForTimeout(600)
if ((await dialog().count()) === 0) fail('arabic: the layer did not open')
const dir = await page.evaluate(() => document.documentElement.dir)
if (dir !== 'rtl') fail(`arabic: dir is ${dir}`)
const placed = await page.evaluate(() => {
  const art = document.querySelector('[role="dialog"] [data-illustration]')
  const text = art?.previousElementSibling ?? art?.parentElement?.firstElementChild
  if (!art || !text) return null
  return art.getBoundingClientRect().left < text.getBoundingClientRect().left
})
if (placed !== true) fail('arabic: the intro art is not at inline-end')
await page.screenshot({ path: `${OUT}/onboarding-ar.png` })
await walkSteps('arabic')
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
const beaconAr = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="onboarding-beacon"]')
  return el ? Math.round(el.getBoundingClientRect().left) : null
})
if (beaconAr !== 16) fail(`arabic: beacon should sit 16px from the left edge, got ${beaconAr}`)
await page.screenshot({ path: `${OUT}/beacon-ar.png` })

await browser.close()
if (errors.length) {
  failures += 1
  console.log('page errors:', errors)
}
console.log(failures === 0 ? '\nPASS' : `\n${failures} failure(s)`)
process.exitCode = failures === 0 ? 0 : 1
