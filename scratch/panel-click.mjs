/**
 * §P4 still works after the anchor moved to the card foot — `scratch/rb-verify.mjs`'s
 * check, re-pointed and reduced to the one thing this change could break: the
 * plot's click delegates to an anchor that is no longer its sibling.
 *
 *     node scratch/panel-click.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:5199'
const browser = await chromium.launch()

for (const [kind, press] of [['line', true], ['bar', true]]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e)))
  await page.goto(`${BASE}/management/reports/RPT-1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  if (kind === 'bar') {
    await page.getByRole('button', { name: /^bar$/i }).first().click()
    await page.waitForTimeout(2500)
  }

  const where = await page.evaluate(() => {
    const card = [...document.querySelectorAll('[data-slot="card"]')].find((c) =>
      c.querySelector('a[data-slot="panel-action"]'),
    )
    if (!card) return null
    const anchor = card.querySelector('a[data-slot="panel-action"]')
    const footer = anchor.closest('[data-slot="card-footer"]')
    const shape =
      card.querySelector('.recharts-area-area') ?? card.querySelector('.recharts-rectangle')
    const r = shape.getBoundingClientRect()
    return {
      href: anchor.getAttribute('href'),
      inFooter: footer !== null,
      /* Does the anchor sit in the SAME row as the legend, or below it? */
      footerRows: footer
        ? [...footer.children].map((n) => Math.round(n.getBoundingClientRect().top)).join(',')
        : null,
      x: Math.round(r.x + r.width * 0.45),
      y: Math.round(r.y + r.height * 0.6),
    }
  })
  if (where === null) {
    console.log(`${kind}: NO ACTIONABLE PANEL`)
    await ctx.close()
    continue
  }

  /* The tooltip is axis-shared and must be unaffected by the move. */
  await page.mouse.move(where.x, where.y)
  await page.waitForTimeout(400)
  const tip = await page.locator('[data-slot="panel-tooltip"]').count()
  const tipText = tip
    ? (await page.locator('[data-slot="panel-tooltip"]').first().innerText()).split('\n')
    : []

  const before = page.url()
  if (press) await page.mouse.click(where.x, where.y)
  await page.waitForTimeout(1200)
  console.log(
    `${kind}: href=${where.href} inFooter=${where.inFooter} footerTops=[${where.footerRows}] ` +
      `tooltip=${tip} ${JSON.stringify(tipText.slice(-1))}\n   ${before}\n-> ${page.url()}`,
  )

  /* And the keyboard route: the anchor is focusable and Enter follows it. */
  await page.goto(`${BASE}/management/reports/RPT-1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const anchor = page.locator('a[data-slot="panel-action"]').first()
  await anchor.focus()
  const ring = await anchor.evaluate((el) => document.activeElement === el)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1000)
  console.log(`${kind}: keyboard focus=${ring} -> ${page.url()}`)
  if (errs.length) console.log('   pageerror:', errs.slice(0, 3))
  await ctx.close()
}
await browser.close()
