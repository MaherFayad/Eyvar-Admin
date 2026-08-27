import { chromium } from 'playwright'
const BASE = 'http://localhost:5433'
const browser = await chromium.launch()
async function toArabic(page) {
  await page.getByRole('button', { name: /account|profile|menu/i }).first().click({ timeout: 5000 })
  await page.getByRole('menuitemradio', { name: /عرب|Arabic|AR/i }).first().click({ timeout: 5000 })
  await page.waitForTimeout(700)
}
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } })
const page = await ctx.newPage()
await page.goto(BASE + '/management/risk', { waitUntil: 'networkidle' })
await page.waitForSelector('main ul[aria-labelledby]'); await page.waitForTimeout(400)
await toArabic(page); await page.waitForTimeout(600)
/* PROBE ONLY — no source change. Force the row-label box narrow, exactly as a
   longer entity name or a narrower column would, and read which end the
   ellipsis lands on for an untranslated Latin name inside an RTL page. */
const res = await page.evaluate(() => {
  const px = (n) => Math.round(n * 10) / 10
  const spans = [...document.querySelectorAll('main ul[aria-labelledby] .truncate')]
  const out = []
  for (const s of spans.slice(0, 4)) {
    s.style.maxWidth = '70px'; s.style.flex = 'none'
    const r = document.createRange(); r.selectNodeContents(s)
    const ink = r.getBoundingClientRect(); const box = s.getBoundingClientRect()
    out.push({ full: s.textContent, dir: getComputedStyle(s).direction,
      boxL: px(box.left), boxR: px(box.right), inkL: px(ink.left), inkR: px(ink.right),
      clippedAt: ink.left < box.left - 1 ? 'INLINE-END (left) - head of the LTR string is cut' :
                 ink.right > box.right + 1 ? 'inline-start (right) - tail cut' : 'no clip' })
  }
  return out
})
console.log(JSON.stringify(res, null, 1))
const card = page.locator('main ul[aria-labelledby]').first().locator('xpath=ancestor::*[@data-slot="card"][1]')
await card.screenshot({ path: './scratch/shots/vqa-trunc-probe-ar.png' })
await ctx.close()

// list close-ups, AR + EN, both widths
for (const w of [1280, 1440]) {
  for (const lang of ['en', 'ar']) {
    for (const [n, p] of [['admin','/admin/overview'],['ops','/operations/overview'],['zones','/management/zones'],['risk','/management/risk'],['support','/support/overview']]) {
      const c = await browser.newContext({ viewport: { width: w, height: 1000 } })
      const pg = await c.newPage()
      await pg.goto(BASE + p, { waitUntil: 'networkidle' }); await pg.waitForTimeout(400)
      if (lang === 'ar') { try { await toArabic(pg) } catch {} ; await pg.waitForTimeout(500) }
      const lists = pg.locator('main ul[aria-labelledby]')
      let target
      if (await lists.count()) target = lists.first().locator('xpath=ancestor::*[@data-slot="card"][1]')
      else target = pg.locator('main [data-slot="card"]').filter({ hasText: 'Nothing to rank' }).first()
      if (await target.count()) {
        await target.scrollIntoViewIfNeeded(); await pg.waitForTimeout(250)
        await target.screenshot({ path: `./scratch/shots/vqa-list-${n}-${lang}-${w}.png` })
      }
      await c.close()
    }
  }
}
console.log('lists done')
await browser.close()
