/**
 * Admin workspace, per role and per pane (ADMIN-WORKSPACE-PLAN T9.2).
 *
 * Switches roles through the account menu and then navigates IN-APP: a
 * `page.goto` reloads the bundle and resets the mock session to the Owner,
 * which is how a first audit captured the Owner's screens under a Support
 * label. Prints, per role, the rail tiles, the Admin rows and the forbidden
 * state on `/admin/team`; and per Admin sub-tab, the pane strip, the first
 * viewport's `h2`, page height, tallest row and small-grey-text count at 1280,
 * in English and Arabic.
 *
 *   npx vite --port 4327
 *   node scripts/harness/admin-access.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const ADMIN = [
  '/admin/overview',
  '/admin/workspace',
  '/admin/team',
  '/admin/team?view=roles',
  '/admin/team?view=overrides',
  '/admin/team?view=sessions',
  '/admin/team?view=security',
  '/admin/policy',
  '/admin/policy?view=sla',
  '/admin/policy?view=reasons',
  '/admin/communications?view=outbox',
  '/admin/communications?view=templates',
  '/admin/data',
  '/admin/activity',
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

/* In-app navigation: React Router listens to popstate. */
const nav = async (path) => {
  await page.evaluate((p) => {
    history.pushState({}, '', p)
    dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForTimeout(1600)
}
const become = async (name) => {
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByText('Switch user').hover()
  await page.waitForTimeout(400)
  await page.getByRole('menuitemradio', { name }).click()
  await page.waitForTimeout(2500)
  /* The onboarding layer may auto-open for a fresh operator; Escape closes it. */
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
}
const facts = () =>
  page.evaluate(() => {
    const rows = [...document.querySelectorAll('tbody tr')]
    return {
      h1: document.querySelector('h1')?.textContent?.trim() ?? null,
      panes: [...document.querySelectorAll('[role=tab]')].map((t) => t.textContent?.trim()),
      pageHeight: document.documentElement.scrollHeight,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      tallestRow: rows.length ? Math.max(...rows.map((r) => Math.round(r.getBoundingClientRect().height))) : null,
      smallGrey: document.querySelectorAll('.text-xs.text-muted-foreground').length,
      emDashes: (document.body.innerText.match(/—/g) ?? []).length,
    }
  })

await page.goto(BASE + '/admin/overview', { waitUntil: 'load', timeout: 120_000 })
await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 60_000 })
await page.waitForTimeout(1500)

/* Per sub-tab and pane, as the Owner, in English. */
for (const path of ADMIN) {
  await nav(path)
  const f = await facts()
  console.log('owner', path, JSON.stringify(f))
  await page.screenshot({ path: `${OUT}/admin-${path.replace(/[\/?=]/g, '_')}.png`, fullPage: false })
}

/* Per role: what the rail and Admin show, and what `/admin/team` says. */
for (const [label, name] of [
  ['support', /Lina/],
  ['ops-manager', /Yousef/],
  ['dispatcher', /Tariq/],
  ['trust-safety', /Hind/],
  ['finance', /Fahad Al-Dosari/],
]) {
  await nav('/operations/my-work')
  await become(name)
  const rail = await page.evaluate(() =>
    [...document.querySelectorAll('nav a')].map((a) => a.textContent?.trim()).filter(Boolean),
  )
  await nav('/admin/team')
  const team = await page.evaluate(() => document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 160))
  console.log(label, JSON.stringify({ rail, team }))
  await page.screenshot({ path: `${OUT}/admin-team-as-${label}.png` })
}

/* Arabic, through the account menu's own radio, as the Owner again. */
await nav('/operations/my-work')
await become(/Sarah/)
await page.getByRole('button', { name: 'Account', exact: true }).click()
await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
await page.waitForTimeout(2000)
for (const path of ['/admin/team', '/admin/team?view=roles', '/admin/policy?view=reasons']) {
  await nav(path)
  const f = await facts()
  console.log('owner-ar', path, JSON.stringify({ dir: await page.evaluate(() => document.documentElement.dir), ...f }))
  await page.screenshot({ path: `${OUT}/admin-ar-${path.replace(/[\/?=]/g, '_')}.png` })
}

if (errors.length) console.log('ERRORS', errors)
await browser.close()
