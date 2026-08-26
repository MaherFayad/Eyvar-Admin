import { chromium } from 'playwright'
const BASE = 'http://localhost:5233'
const OUT = 'c:/Users/Admin/Documents/GitHub/Eyvar Admin/scratch/shots'
const b = await chromium.launch()
const out = []
const log = (...a) => out.push(a.join(' '))

async function open(path, w, arabic = true, h = 900) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.goto(BASE + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(800)
  if (arabic) {
    await p.getByRole('button', { name: 'Account' }).click()
    await p.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await p.waitForTimeout(700)
    await p.keyboard.press('Escape')
    await p.waitForTimeout(200)
  }
  return p
}

/* ── H. the REAL search field box (the bordered wrapper, not the input) ── */
for (const [lang, ar] of [['LTR', false], ['RTL', true]]) {
  for (const W of [1280, 1440]) {
    const p = await open('/operations/people', W, ar)
    const m = await p.evaluate(() => {
      const inp = document.querySelector('header input[type="search"]')
      const wrap = inp?.parentElement
      const chip = document.querySelector('header a[aria-label*="Work assigned"]')
      const bell = document.querySelector('header button[aria-label="Notifications"]')
      const rect = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), end: Math.round(r.right) } }
      return { field: rect(wrap), chip: rect(chip), bell: rect(bell), fieldCls: wrap?.className.slice(0, 60) }
    })
    let v = 'n/a'
    if (m.field && m.chip) {
      const ov = Math.min(m.chip.end, m.field.end) - Math.max(m.chip.x, m.field.x)
      v = ov > 0 ? `*** OVERLAP ${Math.round(ov)}px ***` : `clear by ${Math.round(-ov)}px`
    }
    log(`## H. SEARCH FIELD ${lang} @${W}: field ${JSON.stringify(m.field)} chip ${JSON.stringify(m.chip)} -> ${v}`)
    await p.close()
  }
}

/* ── I. the clipped column, LTR vs RTL, at 1280 ─────────────────────── */
for (const [lang, ar] of [['LTR', false], ['RTL', true]]) {
  const p = await open('/operations/people', 1280, ar)
  const m = await p.evaluate(() => {
    const sc = [...document.querySelectorAll('main div')].find((d) => d.scrollWidth > d.clientWidth + 4)
    const scR = sc.getBoundingClientRect()
    const row = document.querySelector('main tbody tr')
    const cells = [...row.querySelectorAll('td')].map((td) => {
      const r = td.getBoundingClientRect()
      const clippedStart = r.left < scR.left - 0.5
      const clippedEnd = r.right > scR.right + 0.5
      return {
        txt: td.innerText.replace(/\s+/g, ' ').trim().slice(0, 14),
        align: getComputedStyle(td).textAlign,
        visible: !(r.right <= scR.left || r.left >= scR.right),
        partial: (clippedStart || clippedEnd) && !(r.right <= scR.left || r.left >= scR.right),
      }
    })
    return { scroller: { l: Math.round(scR.left), r: Math.round(scR.right), cw: sc.clientWidth, sw: sc.scrollWidth }, cells }
  })
  log(`\n## I. CLIPPING ${lang} @1280`)
  log('   scroller:', JSON.stringify(m.scroller))
  log('   partially clipped cells:', JSON.stringify(m.cells.filter((c) => c.partial)))
  log('   fully hidden cells     :', JSON.stringify(m.cells.filter((c) => !c.visible).map((c) => c.txt)))
  await p.close()
}

/* ── J. subtitle / count bidi ────────────────────────────────────────── */
for (const [lang, ar] of [['LTR', false], ['RTL', true]]) {
  const p = await open('/operations/people', 1440, ar)
  const m = await p.evaluate(() => {
    const h1 = document.querySelector('main h1')
    const header = h1?.closest('header, div')?.parentElement
    const texts = [...(header?.querySelectorAll('p, span') ?? [])]
      .map((e) => ({ t: e.innerText.replace(/\s+/g, ' ').trim(), bdi: !!e.querySelector('bdi'), dir: getComputedStyle(e).direction, ui: e.getAttribute('dir') }))
      .filter((e) => e.t && e.t.length < 40)
    const kbd = document.querySelector('header .shrink-0:last-child, header kbd')
    return { texts: texts.slice(0, 6), kbd: kbd ? { t: kbd.innerText, dir: getComputedStyle(kbd).direction, uni: getComputedStyle(kbd).unicodeBidi, tag: kbd.tagName } : null }
  })
  log(`\n## J. HEADER COPY ${lang}`)
  log('   ', JSON.stringify(m))
  await p.close()
}

/* ── K. drawer edge (AC-72) ──────────────────────────────────────────── */
for (const [lang, ar] of [['LTR', false], ['RTL', true]]) {
  const p = await open('/operations/people', 1440, ar)
  await p.locator('main tbody tr td').nth(1).click().catch(() => {})
  await p.waitForTimeout(1200)
  let m = await p.evaluate(() => {
    const d = document.querySelector('[role="dialog"]')
    if (!d) return null
    const r = d.getBoundingClientRect()
    return { x: Math.round(r.x), w: Math.round(r.width), end: Math.round(r.right), vw: innerWidth }
  })
  if (!m) {
    await p.goto(BASE + '/operations/people?entity=DRV-0201', { waitUntil: 'networkidle' })
    await p.waitForTimeout(1200)
    m = await p.evaluate(() => {
      const d = document.querySelector('[role="dialog"]')
      if (!d) return null
      const r = d.getBoundingClientRect()
      return { x: Math.round(r.x), w: Math.round(r.width), end: Math.round(r.right), vw: innerWidth }
    })
  }
  log(`\n## K. SHELL LAYER ${lang} @1440:`, JSON.stringify(m), m ? (m.x <= 1 ? '-> enters from PHYSICAL LEFT' : m.end >= m.vw - 1 ? '-> enters from PHYSICAL RIGHT' : '-> floating') : '')
  if (m) await p.screenshot({ path: `${OUT}/${ar ? 'ar' : 'en'}-profile-layer-1440.png` })
  await p.close()
}

/* ── L. toast fill, LTR vs RTL ───────────────────────────────────────── */
{
  const p = await open('/operations/people', 1440, false)
  await p.evaluate(() => { window.__t = true })
  await p.getByRole('button', { name: 'Account' }).click()
  await p.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await p.waitForTimeout(1500)
  const m = await p.evaluate(() => {
    const el = document.querySelector('[data-sonner-toast]')
    const cs = getComputedStyle(el)
    return { cls: el.className, bg: cs.backgroundColor, color: cs.color, border: cs.border, dataStyled: el.getAttribute('data-styled') }
  })
  log('\n## L. TOAST COMPUTED STYLE:', JSON.stringify(m))
  await p.close()
}

/* ── M. row marker / selection marker edge ───────────────────────────── */
{
  const p = await open('/operations/people', 1440)
  const m = await p.evaluate(() => {
    const found = []
    for (const el of document.querySelectorAll('main *')) {
      for (const pe of ['::before', '::after']) {
        const cs = getComputedStyle(el, pe)
        if (cs.content !== 'none' && cs.position === 'absolute' && parseFloat(cs.width) <= 5 && parseFloat(cs.width) > 0) {
          found.push({ tag: el.tagName, cls: el.className.slice(0, 50), pe, iis: cs.insetInlineStart, left: cs.left, right: cs.right, w: cs.width, bg: cs.backgroundColor })
        }
      }
    }
    return found.slice(0, 6)
  })
  log('\n## M. 3px MARKERS in <main> (RTL):', JSON.stringify(m))
  const nav = await p.evaluate(() => {
    const found = []
    for (const el of document.querySelectorAll('nav *')) {
      for (const pe of ['::before', '::after']) {
        const cs = getComputedStyle(el, pe)
        if (cs.content !== 'none' && cs.position === 'absolute' && parseFloat(cs.width) <= 5 && parseFloat(cs.width) > 0) {
          found.push({ cls: el.className.slice(0, 40), pe, iis: cs.insetInlineStart, left: cs.left, right: cs.right, w: cs.width })
        }
      }
    }
    return found.slice(0, 4)
  })
  log('   markers in <nav> (RTL):', JSON.stringify(nav))
  await p.close()
}

await b.close()
console.log(out.join('\n'))
