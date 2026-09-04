/** The pie on the builder, in Arabic — rung, line box, isolation, mirroring. */
import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:4399'
const b = await chromium.launch()
for (const width of [1280, 1440, 1920]) {
  const ctx = await b.newContext({ viewport: { width, height: 1200 } })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('  PAGEERROR', String(e).slice(0, 200)))
  /* Switch language on a plain page first — the preference persists — then
     open the builder, so the toggle is never racing the report's own run. */
  await p.goto(`${BASE}/management/reports/dashboards/DSH-1`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  const avatar = p.locator('header button').last()
  await avatar.click(); await p.waitForTimeout(500)
  const ar = p.locator('[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]').filter({ hasText: /عرب|Arabic|العربية/ })
  console.log('  arabic item found:', await ar.count())
  if (await ar.count()) await ar.first().click()
  await p.waitForTimeout(2000)
  await p.goto(`${BASE}/management/reports/RPT-4`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(6000)
  const out = await p.evaluate(() => {
    const card = [...document.querySelectorAll('[data-slot="card"]')].find((c) => c.querySelector('.recharts-pie'))
    if (!card) return null
    const px = (el) => Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10
    const num = card.querySelector('[data-slot="metric-value"]')
    const title = card.querySelector('[data-slot="card-title"]')
    const prose = card.querySelector('[data-slot="panel-population"]')
    const list = card.querySelector('[data-slot="part-list"]')
    const leaks = []
    for (const n of card.querySelectorAll('*')) {
      const c = n.getAttribute('class') ?? ''
      if (/(?:^|\s)(?:ml|mr|pl|pr|border-l|border-r|rounded-l|rounded-r|text-left|text-right)-/.test(c)) leaks.push(n.tagName + ' :: ' + c)
    }
    const cardBox = card.getBoundingClientRect()
    const numBox = num.getBoundingClientRect()
    return {
      dir: document.documentElement.dir,
      titlePx: px(title), numPx: px(num), prosePx: px(prose),
      numText: num.textContent, bdi: num.firstElementChild?.tagName.toLowerCase(),
      rowH: Math.round(num.parentElement.getBoundingClientRect().height),
      /* Inline-start distance: under rtl the numeral must hug the card's RIGHT. */
      startGap: Math.round(cardBox.right - numBox.right),
      figureDir: card.querySelector('[role="img"]')?.getAttribute('dir'),
      listDir: list?.getAttribute('dir') ?? null,
      leaks,
    }
  })
  console.log(`\n═══ builder ${width} · ar ═══`); console.log(JSON.stringify(out))
  if (width === 1440 && out) {
    await p.locator('[data-slot="card"]').filter({ has: p.locator('.recharts-pie') }).first()
      .screenshot({ path: './scratch/shots-dist/after.builder.card.ar.png' })
  }
  await ctx.close()
}
await b.close()
