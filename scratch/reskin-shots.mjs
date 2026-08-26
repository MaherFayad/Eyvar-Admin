import { chromium } from 'playwright'
const b = await chromium.launch()
const shots = [
  ['reskin-people-1440', 1440, 900, '/operations/people', 'ltr'],
  ['reskin-people-1280', 1280, 820, '/operations/people', 'ltr'],
  ['reskin-overview-1440', 1440, 900, '/operations/overview', 'ltr'],
  ['reskin-rtl-1280', 1280, 820, '/operations/people', 'rtl'],
]
const errs = []
for (const [name, w, h, path, dir] of shots) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  p.on('pageerror', (e) => errs.push(`${name} PAGEERROR ${String(e).slice(0, 200)}`))
  await p.goto('http://localhost:5199' + path, { waitUntil: 'networkidle' })
  if (dir === 'rtl') {
    const btn = await p.$('button:has-text("العربية"), [aria-label*="Arabic"], [data-testid="lang-toggle"]')
    if (btn) await btn.click()
    else await p.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar' })
  }
  await p.waitForTimeout(1200)
  await p.screenshot({ path: `scratch/shots/${name}.png`, fullPage: false })
  // probe the ladder
  const probe = await p.evaluate(() => {
    const g = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e) : null }
    const main = g('main'); const navs = document.querySelectorAll('nav')
    const h1 = document.querySelector('h1')
    return {
      body: getComputedStyle(document.body).fontFamily.slice(0, 40),
      bodySize: getComputedStyle(document.body).fontSize,
      main: main && main.backgroundColor,
      rail: navs[0] && getComputedStyle(navs[0]).backgroundColor,
      railBorder: navs[0] && getComputedStyle(navs[0]).borderInlineEndColor + ' / ' + getComputedStyle(navs[0]).borderInlineEndWidth,
      col: navs[1] && getComputedStyle(navs[1]).backgroundColor,
      colBorder: navs[1] && getComputedStyle(navs[1]).borderInlineEndWidth,
      header: g('header') && g('header').height + ' ' + g('header').backgroundColor,
      h1: h1 && getComputedStyle(h1).fontSize + ' ' + getComputedStyle(h1).fontFamily.slice(0, 20),
    }
  })
  console.log(name, JSON.stringify(probe))
  await p.close()
}
await b.close()
console.log(errs.length ? errs.join('\n') : 'no page errors')
