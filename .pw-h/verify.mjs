import { chromium } from 'playwright'
const b = await chromium.launch()

async function shot(dir, out) {
  const p = await b.newPage({ viewport: { width: 1512, height: 900 } })
  const errs = []
  p.on('pageerror', e => errs.push(String(e.message).slice(0,160)))
  await p.goto('http://localhost:5235/management/overview', { waitUntil:'networkidle', timeout:60000 })
  await p.waitForTimeout(1200)
  if (dir === 'rtl') {
    await p.evaluate(() => { document.documentElement.setAttribute('dir','rtl'); document.documentElement.setAttribute('lang','ar') })
    await p.waitForTimeout(600)
  }
  const measure = await p.evaluate(() => {
    const pick = (el, keys) => { const c = getComputedStyle(el); const o = {}; for (const k of keys) o[k]=c[k]; return o }
    const KEYS = ['fontSize','lineHeight','fontWeight','color','fontVariantNumeric','fontFamily']
    const out = {}

    const v = document.querySelector('[data-slot="metric-value"]')
    out.metricValue = v ? { text: v.innerText.trim().slice(0,24), ...pick(v, KEYS) } : null

    // the label directly under the value, inside the same tile
    const lbl = v ? v.parentElement.querySelector('span:not([data-slot])+span') : null
    out.metricLabel = lbl ? { text: lbl.innerText.trim().slice(0,28), ...pick(lbl, KEYS) } : null

    // does the size step resolve, or is it falling back?
    const cs = getComputedStyle(document.documentElement)
    out.tokens = { '--text-kpi': cs.getPropertyValue('--text-kpi').trim(),
                   '--text-kpi--line-height': cs.getPropertyValue('--text-kpi--line-height').trim(),
                   '--text-lg': cs.getPropertyValue('--text-lg').trim(),
                   '--text-xl': cs.getPropertyValue('--text-xl').trim() }

    // every tile numeral on the board, to prove the whole row moved
    out.allValues = [...document.querySelectorAll('[data-slot="metric-value"]')]
      .map(e => { const c = getComputedStyle(e); return `${c.fontSize}/${c.lineHeight} w${c.fontWeight} ${c.fontVariantNumeric}` })

    // the page title, to prove --text-xl did NOT move with it
    const h1 = document.querySelector('h1')
    out.pageTitle = h1 ? { text: h1.innerText.trim().slice(0,24), ...pick(h1, KEYS) } : null

    // data-numeric consumers
    out.dataNumericCount = document.querySelectorAll('[data-numeric]').length
    const dn = document.querySelector('[data-numeric]')
    out.dataNumeric = dn ? { tag: dn.tagName, fontVariantNumeric: getComputedStyle(dn).fontVariantNumeric } : null
    return out
  })
  console.log('\n===== dir=' + dir + ' =====')
  console.log(JSON.stringify(measure, null, 2))
  if (errs.length) console.log('PAGE ERRORS', [...new Set(errs)].slice(0,4))
  await p.screenshot({ path: out, fullPage: false })
  await p.close()
}

await shot('ltr', '.pw-h/overview-ltr.png')
await shot('rtl', '.pw-h/overview-rtl.png')
await b.close()
