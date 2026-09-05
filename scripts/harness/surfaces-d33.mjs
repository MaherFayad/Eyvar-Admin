/**
 * D33 / D33a / D34 surface proof. Captures every surface class the rulings
 * touch, at 1280x800, in light and dark: the page, a card, a table, an
 * anchored dropdown, a modal dialog, the command palette, a sheet and a
 * metric board.
 *
 *   npx vite --port 4371
 *   node scripts/harness/surfaces-d33.mjs [label]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4371'
const LABEL = process.argv[2] ?? 'after'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

async function setTheme(page, name) {
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitemradio', { name }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
}

/* Each case: [name, path, action]. The action leaves the surface open. */
const CASES = [
  ['workspace-settings', '/admin/workspace', null],
  ['sla-tier-defaults', '/admin/policy', async (p) => {
    const tab = p.getByRole('tab', { name: /SLA/i }).first()
    if (await tab.count()) await tab.click()
    await p.waitForTimeout(400)
  }],
  ['index-table', '/operations/subscriptions', null],
  ['metric-board', '/management/overview', null],
  ['contact-centre-CNV-102', '/support/contact-centre/CNV-102', null],
  ['palette', '/operations/subscriptions', async (p) => {
    await p.keyboard.press('Control+k')
    await p.waitForTimeout(500)
  }],
  ['dropdown', '/operations/subscriptions', async (p) => {
    await p.getByRole('button', { name: 'Account' }).click()
    await p.waitForTimeout(400)
  }],
  ['dialog', '/admin/workspace', async (p) => {
    const b = p.getByRole('button', { name: /Edit|Change|Manage/ }).first()
    if (await b.count()) { await b.click(); await p.waitForTimeout(600) }
  }],
  ['sheet', '/operations/subscriptions', async (p) => {
    const row = p.getByRole('row').nth(1)
    if (await row.count()) { await row.click(); await p.waitForTimeout(800) }
  }],
]

const browser = await chromium.launch()
for (const theme of ['Light', 'Dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/operations/subscriptions', { waitUntil: 'networkidle' })
  await setTheme(page, theme)
  for (const [name, path, action] of CASES) {
    try {
      await page.goto(BASE + path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(700)
      if (action) await action(page)
      const file = `${OUT}/${name}-${theme.toLowerCase()}-${LABEL}.png`
      await page.screenshot({ path: file })
      console.log('ok  ', file)
    } catch (e) {
      console.log('FAIL', name, theme, String(e).split('\n')[0])
    }
  }
  await ctx.close()
}
await browser.close()
