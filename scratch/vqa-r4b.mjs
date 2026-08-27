import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
const BASE = 'http://localhost:5433'
const out = {}
const browser = await chromium.launch()
async function toArabic(page) {
  await page.getByRole('button', { name: /account|profile|menu/i }).first().click({ timeout: 5000 })
  await page.getByRole('menuitemradio', { name: /عرب|Arabic|AR/i }).first().click({ timeout: 5000 })
  await page.waitForTimeout(700)
}

const TILEPROBE = () => {
  const px = (n) => Math.round(n * 100) / 100
  const main = document.querySelector('main')
  const ul = main.querySelector('ul[role="list"]')
  const items = ul ? [...ul.children] : []
  return {
    gridCols: ul ? getComputedStyle(ul).gridTemplateColumns : null,
    align: ul ? getComputedStyle(ul).alignItems : null,
    items: items.map((li) => {
      const card = li.querySelector('[data-slot="card"]')
      const a = li.querySelector('a')
      const cr = card.getBoundingClientRect(), lr = li.getBoundingClientRect()
      const label = card.querySelectorAll('span')
      return {
        liTop: px(lr.top), liH: px(lr.height),
        cardTop: px(cr.top), cardH: px(cr.height), cardBottom: px(cr.bottom),
        gapBelow: px(lr.bottom - cr.bottom),
        linked: !!a,
        border: getComputedStyle(card).borderColor + ' ' + getComputedStyle(card).borderTopWidth,
        cardBg: getComputedStyle(card).backgroundColor,
        pageBg: getComputedStyle(main).backgroundColor,
        text: (card.textContent ?? '').slice(0, 70),
      }
    }),
  }
}

// 1. tile grid raggedness, EN + AR, both widths
for (const w of [1280, 1440]) {
  for (const lang of ['en', 'ar']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 1200 } })
    const page = await ctx.newPage()
    for (const [n, p] of [['mgmt-overview','/management/overview'],['admin','/admin/overview'],['support','/support/overview'],['ops','/operations/overview'],['risk','/management/risk'],['growth','/management/growth'],['zones','/management/zones'],['perf','/management/performance']]) {
      await page.goto(BASE + p, { waitUntil: 'networkidle' })
      await page.waitForTimeout(400)
      if (lang === 'ar') { try { await toArabic(page) } catch {} ; await page.waitForTimeout(400) }
      out[`grid:${n}:${lang}:${w}`] = await page.evaluate(TILEPROBE)
    }
    await ctx.close()
  }
}
writeFileSync('./scratch/shots/vqa-grid.json', JSON.stringify(out, null, 1))
console.log('grid done')
await browser.close()
