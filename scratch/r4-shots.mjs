/**
 * R4-4 capture pass — breakdown lists, the notice banner, the caption line and
 * the target tile, at 1280 and 1440, in English and Arabic.
 *
 * Two wave-4 defects were invisible to a source audit and both are live risks
 * for a ranked list: a literal Unicode glyph falling through Inter to an emoji
 * font and painting in colour, and a numeral run reordering under Arabic. A
 * ranked list is numerals beside proper nouns, which is the second one exactly.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:5411'
const OUT = './scratch/shots'
mkdirSync(OUT, { recursive: true })

const BOARDS = [
  ['performance', '/management/performance'],
  ['risk', '/management/risk'],
  ['zones', '/management/zones'],
  ['ops', '/operations/overview'],
  ['support', '/support/overview'],
  ['admin', '/admin/overview'],
]

const problems = []
const browser = await chromium.launch()

async function switchToArabic(page) {
  await page.getByRole('button', { name: /account|profile|menu/i }).first().click({ timeout: 4000 })
  await page.getByRole('menuitemradio', { name: /عرب|Arabic|AR/i }).first().click({ timeout: 4000 })
  await page.waitForTimeout(500)
}

for (const width of [1280, 1440]) {
  for (const lang of ['en', 'ar']) {
    const ctx = await browser.newContext({ viewport: { width, height: 1100 } })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => problems.push(`${lang} ${width} PAGEERROR ${String(e).slice(0, 200)}`))
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`${lang} ${width} CONSOLE ${m.text().slice(0, 200)}`)
    })

    await page.goto(BASE + '/management/performance', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    if (lang === 'ar') {
      try {
        await switchToArabic(page)
      } catch {
        await page.evaluate(() => {
          document.documentElement.setAttribute('dir', 'rtl')
          document.documentElement.setAttribute('lang', 'ar')
        })
        problems.push(`${lang} ${width} FELL BACK to a raw dir flip — the account menu route failed`)
      }
    }

    for (const [name, path] of BOARDS) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
      /* The language lives in React state, not in storage, so a full-page
         `goto` resets it to English. Switch after every navigation or the
         Arabic pass silently captures the English one. */
      if (lang === 'ar') {
        try {
          await switchToArabic(page)
        } catch {
          await page.evaluate(() => {
            document.documentElement.setAttribute('dir', 'rtl')
            document.documentElement.setAttribute('lang', 'ar')
          })
          problems.push(`${lang} ${width} ${name} FELL BACK to a raw dir flip`)
        }
      }
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${OUT}/r4-${name}-${lang}-${width}.png`, fullPage: true })
    }
    await ctx.close()
  }
}

/* The measurement pass, English at 1280, on the two boards that carry every
   slot: the notice banner and a barred list with sub-labels and secondaries. */
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } })
const page = await ctx.newPage()
await page.goto(BASE + '/admin/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const probe = await page.evaluate(() => {
  const list = document.querySelector('main ul[aria-labelledby]')
  const rows = list ? [...list.querySelectorAll(':scope > li')] : []
  const bar = document.querySelector('main .bg-chart-fill')
  const banner = document.querySelector('main [data-slot="alert"]')
  const paint = (el) => (el ? getComputedStyle(el) : null)
  const glyphs = []
  const walk = document.createTreeWalker(document.querySelector('main') ?? document.body, NodeFilter.SHOW_TEXT)
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    for (const ch of n.textContent ?? '') {
      const cp = ch.codePointAt(0)
      /* Anything outside Latin-1 + the marks the product sanctions. A glyph
         Inter does not carry is the wave-4 emoji-fallback defect. */
      if (cp > 0x00ff && !'—–−×•·،؟'.includes(ch) && !(cp >= 0x0600 && cp <= 0x06ff)) {
        glyphs.push(`${ch} U+${cp.toString(16).toUpperCase()}`)
      }
    }
  }
  return {
    banners: document.querySelectorAll('main [data-slot="alert"]').length,
    bannerText: banner?.textContent?.slice(0, 140) ?? null,
    breakdownLists: document.querySelectorAll('main ul[aria-labelledby]').length,
    rowCount: rows.length,
    rowHeights: rows.map((r) => Math.round(r.getBoundingClientRect().height)),
    barFill: paint(bar)?.backgroundColor ?? null,
    barBg: bar?.parentElement ? getComputedStyle(bar.parentElement).backgroundColor : null,
    cardBg: bar?.closest('[data-slot="card"]')
      ? getComputedStyle(bar.closest('[data-slot="card"]')).backgroundColor
      : null,
    captions: [...document.querySelectorAll('main [class*="group/card"] span.truncate')].map((n) =>
      n.textContent,
    ),
    twoFactorLine:
      [...document.querySelectorAll('main li')]
        .map((n) => n.textContent ?? '')
        .find((s) => s.includes('two-factor')) ?? null,
    nonLatinGlyphs: [...new Set(glyphs)],
  }
})
console.log('ADMIN 1280 EN', JSON.stringify(probe, null, 1))

/* The bidi pass. Arabic, 1280, on the two lists that put a proper noun beside a
   percentage and a money figure. */
await page.goto(BASE + '/management/performance', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
try {
  await switchToArabic(page)
} catch {
  await page.evaluate(() => {
    document.documentElement.setAttribute('dir', 'rtl')
    document.documentElement.setAttribute('lang', 'ar')
  })
}
await page.waitForTimeout(700)
const bidi = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('main ul[aria-labelledby] > li')]
  return {
    htmlDir: document.documentElement.dir,
    rows: rows.map((r) => {
      const parts = [...r.querySelectorAll('span')]
        .filter((n) => n.children.length === 0 && (n.textContent ?? '').trim())
        .map((n) => ({
          text: n.textContent,
          x: Math.round(n.getBoundingClientRect().x),
          align: getComputedStyle(n).textAlign,
        }))
      return parts
    }),
    cutOff: document.querySelector('main [data-slot="card-footer"] p')?.textContent ?? null,
  }
})
console.log('PERFORMANCE 1280 AR', JSON.stringify(bidi, null, 1))
await ctx.close()

await browser.close()
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'no console or page errors')
