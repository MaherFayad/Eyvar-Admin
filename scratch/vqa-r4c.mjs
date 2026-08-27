import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
const BASE = 'http://localhost:5433'
const browser = await chromium.launch()
const out = {}
async function toArabic(page) {
  await page.getByRole('button', { name: /account|profile|menu/i }).first().click({ timeout: 5000 })
  await page.getByRole('menuitemradio', { name: /عرب|Arabic|AR/i }).first().click({ timeout: 5000 })
  await page.waitForTimeout(700)
}
const CONTRAST = () => {
  const lum = (c) => {
    const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => {
      const s = v / 255
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return Math.round(((x + 0.05) / (y + 0.05)) * 1000) / 1000 }
  const main = document.querySelector('main')
  const cs = (el) => getComputedStyle(el)
  const bar = main.querySelector('.bg-chart-fill')
  const card = bar?.closest('[data-slot="card"]')
  const res = { pairs: {} }
  if (bar && card) {
    res.pairs['chart-fill on card'] = { fg: cs(bar).backgroundColor, bg: cs(card).backgroundColor, ratio: ratio(cs(bar).backgroundColor, cs(card).backgroundColor) }
    res.pairs['chart-fill on page'] = { fg: cs(bar).backgroundColor, bg: cs(main).backgroundColor, ratio: ratio(cs(bar).backgroundColor, cs(main).backgroundColor) }
    res.pairs['card border on card'] = { fg: cs(card).borderTopColor, bg: cs(card).backgroundColor, ratio: ratio(cs(card).borderTopColor, cs(card).backgroundColor) }
  }
  const sample = (sel, name) => {
    const el = main.querySelector(sel); if (!el) return
    let p = el, bg = 'rgba(0, 0, 0, 0)'
    while (p && bg === 'rgba(0, 0, 0, 0)') { bg = cs(p).backgroundColor; p = p.parentElement }
    res.pairs[name] = { fg: cs(el).color, bg, size: cs(el).fontSize, weight: cs(el).fontWeight, ratio: ratio(cs(el).color, bg) }
  }
  sample('ul[aria-labelledby] .text-foreground', 'row label on card')
  sample('ul[aria-labelledby] .text-muted-foreground', 'row sub/secondary on card')
  sample('[data-slot="card-footer"] p', 'cut-off line on card')
  sample('.text-lg', 'tile value on card')
  sample('[data-slot="card"] .text-xs.text-muted-foreground', 'tile label/caption on card')
  sample('[data-slot="alert"]', 'banner text on banner')
  // divider
  const li = main.querySelector('ul[aria-labelledby] > li:nth-child(2)')
  if (li) res.pairs['row divider on card'] = { fg: cs(li).borderTopColor, bg: cs(li.closest('[data-slot="card"]')).backgroundColor, ratio: ratio(cs(li).borderTopColor, cs(li.closest('[data-slot="card"]')).backgroundColor) }
  return res
}
const TRUNC = () => {
  const px = (n) => Math.round(n * 10) / 10
  const main = document.querySelector('main')
  const probe = (el) => {
    const r = document.createRange(); r.selectNodeContents(el)
    const ink = r.getBoundingClientRect(); const box = el.getBoundingClientRect()
    return { text: el.textContent, dir: getComputedStyle(el).direction, align: getComputedStyle(el).textAlign,
      overflow: el.scrollWidth > el.clientWidth + 1, scrollW: el.scrollWidth, clientW: el.clientWidth,
      boxL: px(box.left), boxR: px(box.right), inkL: px(ink.left), inkR: px(ink.right) }
  }
  return {
    dir: document.documentElement.dir,
    rowLabels: [...main.querySelectorAll('ul[aria-labelledby] .truncate')].map(probe),
    tileCaptions: [...main.querySelectorAll('[data-slot="card"] span.truncate')].map(probe),
  }
}
for (const [name, path, lang] of [
  ['admin-en', '/admin/overview', 'en'], ['admin-ar', '/admin/overview', 'ar'],
  ['risk-en', '/management/risk', 'en'], ['risk-ar', '/management/risk', 'ar'],
  ['perf-ar', '/management/performance', 'ar'], ['ops-ar', '/operations/overview', 'ar'],
  ['zones-ar', '/management/zones', 'ar'], ['mgmt-ar', '/management/overview', 'ar'],
]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } })
  const page = await ctx.newPage()
  await page.goto(BASE + path, { waitUntil: 'networkidle' }); await page.waitForSelector('main', { timeout: 15000 }); await page.waitForTimeout(700)
  if (lang === 'ar') { try { await toArabic(page) } catch {} ; await page.waitForTimeout(500) }
  out['contrast:' + name] = await page.evaluate(CONTRAST)
  out['trunc:' + name] = await page.evaluate(TRUNC)
  await ctx.close()
}
// focus rings
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/admin/overview', { waitUntil: 'networkidle' }); await page.waitForSelector('main ul[aria-labelledby]', { timeout: 15000 }); await page.waitForTimeout(600)
  const rows = page.locator('main ul[aria-labelledby] > li a')
  await rows.first().focus()
  out.focusRow = await page.evaluate(() => {
    const el = document.activeElement, cs = getComputedStyle(el)
    return { tag: el.tagName, text: (el.textContent ?? '').slice(0, 40), outline: cs.outlineWidth + ' ' + cs.outlineStyle, boxShadow: cs.boxShadow, radius: cs.borderRadius }
  })
  await rows.first().scrollIntoViewIfNeeded()
  await page.screenshot({ path: './scratch/shots/vqa-focus-row.png', clip: await rows.first().boundingBox().then(b=>({x:b.x-12,y:b.y-12,width:b.width+24,height:b.height+24})) })
  const tile = page.locator('main ul[role="list"] > li a').first()
  await tile.focus()
  out.focusTile = await page.evaluate(() => {
    const el = document.activeElement, cs = getComputedStyle(el)
    return { tag: el.tagName, text: (el.textContent ?? '').slice(0, 40), outline: cs.outlineWidth + ' ' + cs.outlineStyle, boxShadow: cs.boxShadow, radius: cs.borderRadius }
  })
  await page.screenshot({ path: './scratch/shots/vqa-focus-tile.png', clip: await tile.boundingBox().then(b=>({x:b.x-12,y:b.y-12,width:b.width+24,height:b.height+24})) })
  // keyboard reachability: tab order through a list
  await page.keyboard.press('Tab')
  out.tabAfterTile = await page.evaluate(() => (document.activeElement?.textContent ?? '').slice(0, 50))
  await ctx.close()
}
writeFileSync('./scratch/shots/vqa-c.json', JSON.stringify(out, null, 1))
console.log('ok')
await browser.close()
