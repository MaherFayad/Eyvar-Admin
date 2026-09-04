/** The pie on the BUILDER, where it is the page's own answer (28px rung). */
import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:4399'
const WIDTHS = (process.env.WIDTHS ?? '1280,1440,1920').split(',').map(Number)
const b = await chromium.launch()
for (const width of WIDTHS) {
  const ctx = await b.newContext({ viewport: { width, height: 1200 } })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('  PAGEERROR', String(e).slice(0, 200)))
  await p.goto(`${BASE}/management/reports/RPT-4`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(3000)
  const out = await p.evaluate(() => {
    const px = (el) => Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10
    const card = document.querySelector('[data-slot="card"] .recharts-pie')?.closest('[data-slot="card"]')
      ?? [...document.querySelectorAll('[data-slot="card"]')].find((c) => c.querySelector('.recharts-pie'))
    if (!card) return null
    const t = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60)
    const title = card.querySelector('[data-slot="card-title"]')
    const num = card.querySelector('[data-slot="metric-value"]')
    const prose = card.querySelector('[data-slot="panel-population"]')
    const list = card.querySelector('[data-slot="part-list"]')
    return {
      cardW: Math.round(card.getBoundingClientRect().width),
      title: title ? { t: t(title), px: px(title) } : null,
      numeral: num ? { t: t(num), px: px(num), lh: getComputedStyle(num).lineHeight } : null,
      numeralRowH: num ? Math.round(num.parentElement.getBoundingClientRect().height) : null,
      prose: prose ? { t: t(prose), px: px(prose) } : null,
      listInFooter: list ? list.closest('[data-slot="card-footer"]') !== null : null,
      footers: card.querySelectorAll('[data-slot="card-footer"]').length,
      headerSlots: [...card.querySelector('[data-slot="card-header"]').children].map((n) => n.getAttribute('data-slot') ?? 'headline'),
    }
  })
  console.log(`\n═══ builder ${width} ═══`)
  console.log(JSON.stringify(out, null, 2))
  if (width === 1440 && out) {
    const card = p.locator('[data-slot="card"]').filter({ has: p.locator('.recharts-pie') }).first()
    await card.screenshot({ path: './scratch/shots-dist/after.builder.card.en.png' })
  }
  await ctx.close()
}
await b.close()
