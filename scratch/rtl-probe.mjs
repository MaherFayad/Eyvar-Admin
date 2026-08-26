import { chromium } from 'playwright'

const BASE = 'http://localhost:5233'
const OUT = 'c:/Users/Admin/Documents/GitHub/Eyvar Admin/scratch/shots'
const b = await chromium.launch()
const out = []
const log = (...a) => out.push(a.join(' '))

async function open(path, w, { arabic = true, h = 900 } = {}) {
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

const box = async (loc) => {
  try { return await loc.first().boundingBox() } catch { return null }
}
const r = (n) => (n === null || n === undefined ? 'n/a' : Math.round(n))
const fmt = (bb) => (bb ? `x=${r(bb.x)} w=${r(bb.width)} end=${r(bb.x + bb.width)}` : 'n/a')

/* ── A. top bar geometry at 1280: the Mine-chip / search overlap ─────── */
for (const [lang, arabic] of [['LTR', false], ['RTL', true]]) {
  for (const W of [1280, 1440]) {
    const p = await open('/operations/people', W, { arabic })
    const chip = await box(p.getByRole('link', { name: /Work assigned to you/ }))
    const search = await box(p.locator('header input, header [cmdk-input], header button:has-text("Search")'))
    const searchBox = await box(p.locator('header').locator('input').first())
    const onCall = await box(p.getByRole('link', { name: /On call/ }))
    const field = searchBox ?? search
    let verdict = 'n/a'
    if (chip && field) {
      const overlap = Math.min(chip.x + chip.width, field.x + field.width) - Math.max(chip.x, field.x)
      verdict = overlap > 0 ? `OVERLAP ${r(overlap)}px` : `clear by ${r(-overlap)}px`
    }
    log(`\n## A. TOP BAR ${lang} @${W}`)
    log('   Mine chip  :', fmt(chip))
    log('   search field:', fmt(field))
    log('   On call    :', fmt(onCall))
    log('   -> ', verdict)
    if (field) log(`   field centre=${r(field.x + field.width / 2)} viewport centre=${W / 2}`)
    await p.close()
  }
}

/* ── B. table overflow: is the clipped end REACHABLE by scrolling? ───── */
for (const [lang, arabic] of [['LTR', false], ['RTL', true]]) {
  const p = await open('/operations/people', 1280, { arabic })
  const info = await p.evaluate(() => {
    const el = document.querySelector('main table')?.closest('[style*="overflow"], div')
    const scroller = [...document.querySelectorAll('main div')].find(
      (d) => d.scrollWidth > d.clientWidth + 4,
    )
    if (!scroller) return { found: false }
    const before = scroller.scrollLeft
    scroller.scrollLeft = -99999
    const min = scroller.scrollLeft
    scroller.scrollLeft = 99999
    const max = scroller.scrollLeft
    scroller.scrollLeft = before
    return {
      found: true,
      cls: scroller.className.slice(0, 90),
      scrollWidth: scroller.scrollWidth,
      clientWidth: scroller.clientWidth,
      initial: before,
      min,
      max,
      hasHorizontalBar: getComputedStyle(scroller).overflowX,
      _unused: !!el,
    }
  })
  log(`\n## B. TABLE OVERFLOW ${lang} @1280`)
  log('   ', JSON.stringify(info))
  const headers = await p.locator('main thead th').allInnerTexts()
  log('   header cells:', JSON.stringify(headers.map((h) => h.replace(/\s+/g, ' ').trim())))
  await p.close()
}

/* ── C. bidi: strings that reorder ───────────────────────────────────── */
{
  const p = await open('/operations/people', 1440)
  const grab = async (sel) => (await p.locator(sel).first().innerText().catch(() => '(none)')).replace(/\n/g, ' | ')
  log('\n## C. BIDI / STRING ORDER (RTL)')
  log('   page subtitle       :', JSON.stringify(await grab('main h1 + *, main [data-slot="page-subtitle"], main h1 ~ p')))
  log('   header h1           :', JSON.stringify(await grab('main h1')))
  const bdi = await p.evaluate(() => document.querySelectorAll('bdi').length)
  log('   <bdi> elements in DOM:', bdi)
  const cell = await p.evaluate(() => {
    const tds = [...document.querySelectorAll('main tbody tr:first-child td')]
    return tds.map((td) => ({
      txt: td.innerText.replace(/\s+/g, ' ').trim().slice(0, 40),
      align: getComputedStyle(td).textAlign,
      bdi: td.querySelector('bdi') ? 'bdi' : '-',
    }))
  })
  log('   first row cells     :', JSON.stringify(cell))
  const shortcut = await grab('header kbd, header [class*="shortcut"]')
  log('   search shortcut     :', JSON.stringify(shortcut))
  await p.close()
}

/* ── D. Radix overlay geometry — the completely unassessed part ──────── */
{
  const p = await open('/operations/people', 1440)
  const vw = 1440

  /* D1 — account dropdown alignment */
  await p.getByRole('button', { name: 'Account' }).click()
  await p.waitForTimeout(350)
  const trig = await box(p.getByRole('button', { name: 'Account' }))
  const menu = await box(p.getByRole('menu'))
  log('\n## D. RADIX OVERLAYS (RTL @1440)')
  log('   D1 account menu — trigger', fmt(trig), '| menu', fmt(menu))
  if (trig && menu) {
    log(`      align: menu.x-trigger.x=${r(menu.x - trig.x)}  menuEnd-triggerEnd=${r(menu.x + menu.width - (trig.x + trig.width))}`)
    log(`      offscreen-left=${menu.x < 0}  offscreen-right=${menu.x + menu.width > vw}`)
  }
  await p.screenshot({ path: `${OUT}/ar-account-menu-1440.png` })
  await p.keyboard.press('Escape')
  await p.waitForTimeout(250)

  /* D2 — notification bell popover */
  await p.getByRole('button', { name: /Notifications/ }).click()
  await p.waitForTimeout(400)
  const bellTrig = await box(p.getByRole('button', { name: /Notifications/ }))
  const pop = await box(p.locator('[data-slot="popover-content"], [role="dialog"]'))
  log('   D2 bell popover — trigger', fmt(bellTrig), '| popover', fmt(pop))
  if (pop) log(`      offscreen-left=${pop.x < 0}  offscreen-right=${pop.x + pop.width > vw}  clipped=${pop.x < 0 || pop.x + pop.width > vw}`)
  await p.screenshot({ path: `${OUT}/ar-bell-popover-1440.png` })
  await p.keyboard.press('Escape')
  await p.waitForTimeout(250)

  /* D3 — row kebab dropdown, near the inline-END edge of the table */
  const kebabs = p.locator('main tbody button:has-text("⋯")')
  const n = await kebabs.count()
  if (n) {
    await kebabs.first().click()
    await p.waitForTimeout(350)
    const kt = await box(kebabs.first())
    const km = await box(p.getByRole('menu'))
    log('   D3 row kebab — trigger', fmt(kt), '| menu', fmt(km))
    if (km) log(`      offscreen-left=${km.x < 0}  offscreen-right=${km.x + km.width > vw}`)
    await p.screenshot({ path: `${OUT}/ar-row-kebab-1440.png` })
    await p.keyboard.press('Escape')
    await p.waitForTimeout(250)
  } else log('   D3 row kebab — no ⋯ trigger found')

  /* D4 — Columns / Filter popovers */
  for (const name of ['Columns', 'Filter']) {
    const t2 = p.getByRole('button', { name: new RegExp(`^${name}`) })
    if (await t2.count()) {
      await t2.first().click()
      await p.waitForTimeout(400)
      const tb = await box(t2)
      const pb = await box(p.locator('[data-slot="popover-content"], [role="dialog"]:visible'))
      log(`   D4 ${name} popover — trigger`, fmt(tb), '| popover', fmt(pb))
      if (pb) log(`      offscreen-left=${pb.x < 0}  offscreen-right=${pb.x + pb.width > vw}`)
      await p.screenshot({ path: `${OUT}/ar-${name.toLowerCase()}-popover-1440.png` })
      await p.keyboard.press('Escape')
      await p.waitForTimeout(300)
    }
  }
  await p.close()
}

/* ── E. shell layer (drawer) — which edge does it enter from? AC-72 ──── */
{
  const p = await open('/operations/people?entity=DRV-0201', 1440)
  await p.waitForTimeout(900)
  const dlg = await box(p.getByRole('dialog'))
  log('\n## E. SHELL LAYER (RTL @1440) — AC-72 expects the MIRRORED edge')
  log('   drawer:', fmt(dlg), dlg ? `| touches-left=${dlg.x <= 1} touches-right=${r(dlg.x + dlg.width) >= 1439}` : '')
  await p.screenshot({ path: `${OUT}/ar-profile-layer-1440.png` })
  await p.close()
}

/* ── F. arrow-key direction inside a Radix menu, and the row marker ──── */
{
  const p = await open('/operations/people', 1440)
  await p.getByRole('button', { name: 'Account' }).click()
  await p.waitForTimeout(350)
  const seq = []
  for (let i = 0; i < 3; i++) {
    await p.keyboard.press('ArrowDown')
    await p.waitForTimeout(120)
    seq.push(await p.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 24)))
  }
  log('\n## F. KEYBOARD (RTL)')
  log('   account menu ArrowDown x3 ->', JSON.stringify(seq))
  await p.keyboard.press('Escape')

  /* Sub-tab column: Home/End and arrow traversal */
  await p.locator('nav a').first().focus()
  const tabSeq = []
  for (let i = 0; i < 3; i++) {
    await p.keyboard.press('Tab')
    await p.waitForTimeout(80)
    tabSeq.push(await p.evaluate(() => document.activeElement?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 22)))
  }
  log('   Tab x3 from first rail link ->', JSON.stringify(tabSeq))

  /* the row marker's edge */
  const marker = await p.evaluate(() => {
    const row = document.querySelector('main tbody tr')
    if (!row) return null
    const cs = getComputedStyle(row, '::before')
    return { content: cs.content, insetInlineStart: cs.insetInlineStart, left: cs.left, right: cs.right, width: cs.width, bg: cs.backgroundColor }
  })
  log('   row ::before marker:', JSON.stringify(marker))
  await p.close()
}

/* ── G. the toast: fill, position, close-button side ─────────────────── */
{
  const p = await open('/operations/people', 1440, { arabic: false })
  await p.getByRole('button', { name: 'Account' }).click()
  await p.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await p.waitForTimeout(1400)
  const t = await p.evaluate(() => {
    const el = document.querySelector('[data-sonner-toast]')
    if (!el) return null
    const cs = getComputedStyle(el)
    const bb = el.getBoundingClientRect()
    const close = el.querySelector('[data-close-button]')
    return {
      bg: cs.backgroundColor,
      color: cs.color,
      opacity: cs.opacity,
      x: Math.round(bb.x), w: Math.round(bb.width), centre: Math.round(bb.x + bb.width / 2),
      dir: cs.direction,
      closeX: close ? Math.round(close.getBoundingClientRect().x) : null,
      text: el.innerText.replace(/\s+/g, ' ').trim(),
    }
  })
  log('\n## G. TOAST (after a real switch, RTL @1440, viewport centre 720)')
  log('   ', JSON.stringify(t))
  await p.screenshot({ path: `${OUT}/ar-toast-1440.png` })
  await p.close()
}

await b.close()
console.log(out.join('\n'))
