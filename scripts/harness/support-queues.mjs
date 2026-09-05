/**
 * The other Support surfaces at 1280, in English and Arabic (SUPPORT-UX-PLAN.md
 * §8): Disputes and its detail, Safety, Fairness, the contact centre. Measures
 * row pitch, the tab strip, horizontal overflow and the R5a marker.
 *
 *   npx vite --port 4331   (or set HARNESS_BASE)
 *   node scripts/harness/support-queues.mjs [label]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4331'
const LABEL = process.argv[2] ?? 'now'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const ROUTES = [
  ['overview', '/support/overview'],
  ['disputes', '/support/disputes'],
  ['lost-found', '/support/disputes?view=lost-and-found'],
  ['dispute-detail', '/support/disputes/DSP-101'],
  ['safety', '/support/safety'],
  ['fairness', '/support/fairness'],
  ['contact-centre', '/support/contact-centre'],
  /* The three-pane inbox (design 12); scripts/harness/support-inbox.mjs is the deep probe. */
  ['contact-centre-thread', '/support/contact-centre/CNV-102'],
]

async function switchToArabic(page) {
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await page.waitForTimeout(1500)
}

const browser = await chromium.launch()
let failures = 0
for (const language of ['en', 'ar']) {
  for (const [name, url] of ROUTES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
    await page.goto(BASE + url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    if (language === 'ar') await switchToArabic(page)
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT}/${name}-${language}-${LABEL}.png`, fullPage: false })

    const facts = await page.evaluate(() => {
      const table = document.querySelector('table')
      const overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth
      const dir = document.documentElement.getAttribute('dir')
      const tabs = [...document.querySelectorAll('[role="tab"]')]
      const firstTab = tabs[0]?.getBoundingClientRect() ?? null
      const strip = tabs[0]?.parentElement?.getBoundingClientRect() ?? null
      const firstTabClipped =
        firstTab && strip ? firstTab.left < strip.left - 1 || firstTab.right > strip.right + 1 : null
      const availability = [...document.querySelectorAll('header button')].find((b) =>
        /^(Availability|التوفّر)/.test(b.getAttribute('aria-label') ?? ''),
      )
      const desk = document.querySelector('[data-slot="card"]')
      if (!table)
        return {
          table: false,
          overflowX,
          dir,
          firstTabClipped,
          availability: availability?.textContent?.trim() ?? null,
          deskDashes: desk ? (desk.textContent?.match(/—/g) ?? []).length : null,
          text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 160),
        }
      const rows = [...table.querySelectorAll('tbody tr')]
      const tops = rows.map((r) => r.getBoundingClientRect().top)
      const pitches = tops.slice(1).map((t, i) => Math.round(t - tops[i]))
      const dashes = [...table.querySelectorAll('tbody td')].filter((td) => td.innerText.trim() === '—').length
      return {
        table: true,
        dir,
        rows: rows.length,
        maxPitch: Math.max(0, ...pitches),
        markerRows: rows.filter((r) => r.hasAttribute('data-row-critical')).length,
        badgesPerRow: [...new Set(rows.map((r) => r.querySelectorAll('[data-slot="badge"]').length))].sort(),
        dashCells: dashes,
        headerWidths: [...table.querySelectorAll('thead th')].map((th) => Math.round(th.getBoundingClientRect().width)),
        firstTabClipped,
        overflowX,
      }
    })
    const bad = []
    if (facts.overflowX > 0) bad.push(`overflowX ${facts.overflowX}`)
    if (facts.firstTabClipped) bad.push('first tab clipped')
    if (facts.table && facts.maxPitch > (language === 'ar' ? 68 : 56)) bad.push(`pitch ${facts.maxPitch}`)
    if (errors.length) bad.push(`errors ${errors.join(' | ')}`)
    if (bad.length) failures += 1
    console.log(`${name} ${language} ${LABEL}`, JSON.stringify(facts), bad.length ? `FAIL ${bad.join('; ')}` : 'ok')
    await ctx.close()
  }
}
await browser.close()
process.exit(failures ? 1 : 0)
