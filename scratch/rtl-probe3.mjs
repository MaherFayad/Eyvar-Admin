import { chromium } from 'playwright'
const BASE = 'http://localhost:5233'
const b = await chromium.launch()
const out = []
const log = (...a) => out.push(a.join(' '))

async function open(path, w, arabic = true) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } })
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

/* ── N. horizontal roving focus: does ArrowRight move to the VISUAL right? ── */
for (const [lang, ar] of [['LTR', false], ['RTL', true]]) {
  const p = await open('/operations/people', 1440, ar)
  const start = p.getByRole('button', { name: 'Captains' })
  const has = await start.count()
  if (!has) { log(`## N. ${lang}: no view-switcher buttons found`); await p.close(); continue }
  await start.first().focus()
  const read = () => p.evaluate(() => {
    const el = document.activeElement
    return el ? `${el.textContent.replace(/\s+/g, ' ').trim().slice(0, 18)}@${Math.round(el.getBoundingClientRect().x)}` : 'none'
  })
  const seq = [await read()]
  for (let i = 0; i < 2; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(140); seq.push(await read()) }
  const seqL = []
  await start.first().focus()
  for (let i = 0; i < 2; i++) { await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(140); seqL.push(await read()) }
  log(`\n## N. VIEW SWITCHER ARROWS ${lang}`)
  log('   ArrowRight x2:', JSON.stringify(seq))
  log('   ArrowLeft  x2:', JSON.stringify(seqL))
  await p.close()
}

/* ── O. rail / sub-tab roving arrows ─────────────────────────────────── */
for (const [lang, ar] of [['LTR', false], ['RTL', true]]) {
  const p = await open('/operations/people', 1440, ar)
  const link = p.getByRole('link', { name: /^Ops\b/ })
  if (await link.count()) {
    await link.first().focus()
    const read = () => p.evaluate(() => {
      const el = document.activeElement
      return el ? `${el.textContent.replace(/\s+/g, ' ').trim().slice(0, 14)}@y${Math.round(el.getBoundingClientRect().y)}` : 'none'
    })
    const down = [await read()]
    for (let i = 0; i < 2; i++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(130); down.push(await read()) }
    log(`\n## O. RAIL ARROWS ${lang}: ArrowDown x2 ->`, JSON.stringify(down))
  }
  await p.close()
}

/* ── P. markers, LTR — are they simply not present anywhere? ─────────── */
for (const [lang, ar] of [['LTR', false], ['RTL', true]]) {
  for (const route of ['/operations/people', '/operations/overview', '/management/overview']) {
    const p = await open(route, 1440, ar)
    const m = await p.evaluate(() => {
      let n = 0; const ex = []
      for (const el of document.querySelectorAll('body *')) {
        for (const pe of ['::before', '::after']) {
          const cs = getComputedStyle(el, pe)
          const w = parseFloat(cs.width)
          if (cs.content !== 'none' && cs.position === 'absolute' && w > 0 && w <= 5) {
            n++
            if (ex.length < 3) ex.push({ cls: el.className.toString().slice(0, 44), pe, iis: cs.insetInlineStart, l: cs.left, r: cs.right, w: cs.width })
          }
        }
      }
      return { n, ex }
    })
    log(`## P. MARKERS ${lang} ${route}: count=${m.n}`, m.n ? JSON.stringify(m.ex) : '')
    await p.close()
  }
}

/* ── Q. any element still using a PHYSICAL offset that breaks in RTL ── */
{
  const p = await open('/operations/people', 1440)
  const m = await p.evaluate(() => {
    const bad = []
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el)
      if (cs.position === 'absolute' || cs.position === 'fixed' || cs.position === 'sticky') {
        const hasPhysical = (cs.left !== 'auto' && cs.right === 'auto') || (cs.right !== 'auto' && cs.left === 'auto')
        if (hasPhysical && cs.insetInlineStart === 'auto' && cs.insetInlineEnd === 'auto') {
          bad.push({ cls: el.className.toString().slice(0, 50), l: cs.left, r: cs.right, pos: cs.position })
        }
      }
    }
    return bad.slice(0, 10)
  })
  log('\n## Q. absolutely-positioned elements with a physical-only offset (RTL):', m.length, JSON.stringify(m))
  await p.close()
}

await b.close()
console.log(out.join('\n'))
