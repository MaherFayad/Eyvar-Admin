/**
 * Support › Tickets at 1280, in English and Arabic (SUPPORT-UX-PLAN.md §5.7,
 * AC-S-05, AC-S-08, AC-S-23). jsdom does no table layout, so this is the only
 * thing that measures row pitch, the tab strip and horizontal overflow.
 *
 *   npx vite --port 4331   (or set HARNESS_BASE)
 *   node scripts/harness/support-tickets.mjs [label]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4331'
const LABEL = process.argv[2] ?? 'now'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const ROUTES = [
  ['tickets-unassigned', '/support/tickets'],
  ['tickets-open', '/support/tickets?view=open'],
  ['tickets-done', '/support/tickets?view=done'],
  ['ticket-detail', '/support/tickets/TKT-502'],
]

/* The account menu carries the language radio group, as `amp-builder-ar-dark` does it. */
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
      if (!table) return { table: false, overflowX, dir, firstTabClipped, text: document.body.innerText.slice(0, 200) }
      const rows = [...table.querySelectorAll('tbody tr')]
      const tops = rows.map((r) => r.getBoundingClientRect().top)
      const pitches = tops.slice(1).map((t, i) => Math.round(t - tops[i]))
      const marker = rows.map((r) => r.hasAttribute('data-row-critical'))
      const firstRowText = rows[0]?.innerText.replace(/\s+/g, ' ').slice(0, 120) ?? null
      const badges = rows.map((r) => r.querySelectorAll('[data-slot="badge"]').length)
      return {
        table: true,
        dir,
        rows: rows.length,
        pitch: [...new Set(pitches)].sort((a, b) => a - b),
        maxPitch: Math.max(0, ...pitches),
        firstRowText,
        markerRows: marker.filter(Boolean).length,
        badgesPerRow: [...new Set(badges)].sort(),
        headerWidths: [...table.querySelectorAll('thead th')].map((th) => Math.round(th.getBoundingClientRect().width)),
        firstTabClipped,
        overflowX,
        banner: document.body.innerText.includes('past a promise') || document.body.innerText.includes('تجاوزت'),
      }
    })
    const bad = []
    if (facts.overflowX > 0) bad.push(`overflowX ${facts.overflowX}`)
    if (facts.firstTabClipped) bad.push('first tab clipped')
    /* R20's pitch, per language: the Arabic ramp's line box is taller (24/32 floor). */
    if (facts.table && facts.maxPitch > (language === 'ar' ? 64 : 56)) bad.push(`pitch ${facts.maxPitch}`)
    if (errors.length) bad.push(`errors ${errors.join(' | ')}`)
    if (bad.length) failures += 1
    console.log(`${name} ${language} ${LABEL}`, JSON.stringify(facts), bad.length ? `FAIL ${bad.join('; ')}` : 'ok')
    await ctx.close()
  }
}
await browser.close()
process.exit(failures ? 1 : 0)
