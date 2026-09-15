/**
 * F-V2-83 — the row-action-menu → `ConfirmDialog` race, in a real browser.
 *
 * jsdom cannot settle Radix's portal-unmount ordering (the very thing this
 * defect races on), so a green Vitest run does not prove this fixed. This
 * opens Captains' row kebab and picks the destructive `Suspend captain`
 * repeatedly — pointer, then keyboard only — and asserts the dialog actually
 * mounts, that focus moves into it, and that it comes back to the kebab (and
 * the scroll lock lifts) on dismiss. Every round dismisses with `Escape`
 * rather than confirming, so the same row stays eligible for the next round.
 *
 *   npx vite --port 4327
 *   node scripts/harness/row-action-dialog.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const ROUTE = '/operations/people?view=captains'
const CAPTAIN_NAME = 'Ahmed Salem'
const CAPTAIN_ID = 'DRV-0101'
const KEBAB_LABEL = `More actions for ${CAPTAIN_ID}`
const ROUNDS = 15

let failures = 0
const fail = (message) => {
  failures += 1
  console.log('FAIL', message)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
page.on('pageerror', (e) => fail(`page error: ${e}`))

await page.goto(BASE + ROUTE, { waitUntil: 'load', timeout: 60_000 })
await page.getByRole('table').waitFor({ timeout: 30_000 })
await page.getByRole('textbox', { name: 'Search captains' }).fill(CAPTAIN_NAME)
const row = page.locator('tbody tr', { hasText: CAPTAIN_NAME }).first()
await row.waitFor()
const kebab = row.getByRole('button', { name: KEBAB_LABEL })

const isScrollLocked = () => page.evaluate(() => document.body.hasAttribute('data-scroll-locked'))

const focusIsInDialog = () =>
  page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]')
    return dlg !== null && dlg.contains(document.activeElement)
  })

const focusIsOnKebab = (label) =>
  page.evaluate((l) => document.activeElement?.getAttribute('aria-label') === l, label)

/** Radix moves focus to the menu's first item in its own effect, after mount — poll rather than assume it has landed. */
async function waitForMenuFocus(timeout = 1000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await page.evaluate(() => document.activeElement?.getAttribute('role') === 'menuitem')) return true
    await page.waitForTimeout(20)
  }
  return false
}

/** Typeahead first (this menu's items have distinct first letters), then arrow-hunt as a fallback. */
async function keyboardSelectMenuItem(name, maxSteps = 10) {
  await waitForMenuFocus()
  await page.keyboard.press(name[0].toLowerCase())
  await page.waitForTimeout(50)
  for (let step = 0; step < maxSteps; step += 1) {
    const onTarget = await page.evaluate((n) => {
      const el = document.activeElement
      return el?.getAttribute('role') === 'menuitem' && (el.textContent ?? '').trim().startsWith(n)
    }, name)
    if (onTarget) {
      await page.keyboard.press('Enter')
      return true
    }
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(20)
  }
  /* Diagnostic only, not a second assertion: says WHY the item was unreachable
     (absent vs. disabled) instead of leaving a bare "could not reach". */
  const items = await page.evaluate(() =>
    [...document.querySelectorAll('[role="menuitem"]')].map((el) => ({
      text: (el.textContent ?? '').trim(),
      disabled: el.getAttribute('aria-disabled') === 'true',
    })),
  )
  console.log('  menu items at failure:', JSON.stringify(items))
  return false
}

/** Closes whatever menu or dialog is open, so one round's failure cannot wedge the next. */
async function resetToClosed() {
  await page.keyboard.press('Escape').catch(() => {})
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(150)
}

/** Open → select → dialog mounts and traps focus → dismiss → focus and scroll lock return. */
async function round(i, { openAndSelect }) {
  const opened = await openAndSelect().catch((e) => {
    fail(`round ${i}: opening the menu threw — ${e}`)
    return false
  })
  if (!opened) {
    fail(`round ${i}: could not reach "Suspend captain" from the kebab`)
    await resetToClosed()
    return
  }

  const dialog = page.getByRole('dialog')
  const appeared = await dialog
    .waitFor({ timeout: 1500 })
    .then(() => true)
    .catch(() => false)
  if (!appeared) {
    fail(`round ${i}: dialog never mounted (role="dialog" absent)`)
    await resetToClosed()
    return
  }
  const title = await dialog.getByText('Suspend 1 captain?').count()
  if (title === 0) fail(`round ${i}: a dialog mounted, but not the suspend confirmation`)

  if (!(await focusIsInDialog())) fail(`round ${i}: focus did not move into the dialog`)

  await page.keyboard.press('Escape')
  const gone = await dialog
    .waitFor({ state: 'detached', timeout: 1500 })
    .then(() => true)
    .catch(() => false)
  if (!gone) {
    fail(`round ${i}: dialog did not dismiss on Escape`)
    await resetToClosed()
    return
  }

  if (!(await focusIsOnKebab(KEBAB_LABEL))) fail(`round ${i}: focus did not return to the kebab`)
  if (await isScrollLocked()) fail(`round ${i}: scroll lock still held after dismiss`)
}

console.log(`pointer — ${ROUNDS} rounds`)
for (let i = 1; i <= ROUNDS; i += 1) {
  await round(`pointer ${i}`, {
    openAndSelect: async () => {
      await kebab.click({ timeout: 5000 })
      const item = page.getByRole('menuitem', { name: 'Suspend captain' })
      const present = await item
        .waitFor({ timeout: 1500 })
        .then(() => true)
        .catch(() => false)
      if (!present) return false
      await item.click()
      return true
    },
  })
}

console.log(`keyboard only — ${ROUNDS} rounds`)
for (let i = 1; i <= ROUNDS; i += 1) {
  await round(`keyboard ${i}`, {
    openAndSelect: async () => {
      await kebab.focus({ timeout: 5000 })
      await page.keyboard.press('Enter')
      await page.waitForSelector('[role="menu"]', { timeout: 1500 }).catch(() => {})
      return keyboardSelectMenuItem('Suspend captain')
    },
  })
}

console.log(
  failures === 0
    ? `PASS — ${ROUNDS * 2} rounds, 0 failures`
    : `FAIL — ${failures} failure(s) across ${ROUNDS * 2} rounds`,
)
await browser.close()
process.exit(failures === 0 ? 0 : 1)
