import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1600 } })
await p.goto('http://localhost:5199/entity/DRV-0201?view=activity', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
console.log(await p.evaluate(() => {
  const L = (e) => e ? Math.round(e.getBoundingClientRect().left) : null
  const T = (e) => e ? Math.round(e.getBoundingClientRect().top) : null
  const h = [...document.querySelectorAll('h2,h3')].find(e => /^Trips$/.test(e.textContent.trim()))
  const inp = document.querySelector('input[placeholder="Search trips"]')
  const toolbar = h.closest('div.flex.min-h-14') ?? h.parentElement.parentElement
  const th = document.querySelector('table thead th')
  const els = [...document.querySelectorAll('h2,h3')].find(e => /Elsewhere/.test(e.textContent))
  const elsRow = els?.closest('section')?.querySelector('dt, dl > div')
  return {
    'figures left': L([...document.querySelectorAll('div')].find(e => getComputedStyle(e).display==='grid' && /Rating/.test(e.innerText))),
    'Trips heading left': L(h),
    'table card left': L(document.querySelector('table')?.closest('div[class*=rounded]')),
    'th content left': th ? Math.round(th.getBoundingClientRect().left + parseFloat(getComputedStyle(th).paddingLeft)) : null,
    'Elsewhere heading left': L(els),
    'Elsewhere first row left': L(elsRow),
    '--- toolbar wrap ---': '',
    'heading top': T(h), 'search top': T(inp),
    'same line?': Math.abs(T(h) - T(inp)) < 20,
    'toolbar width': toolbar ? Math.round(toolbar.getBoundingClientRect().width) : null,
    'toolbar scrollWidth': toolbar?.scrollWidth,
    'heading block width': Math.round(h.parentElement.getBoundingClientRect().width),
    'controls block width': inp ? Math.round(inp.closest('div').parentElement.getBoundingClientRect().width) : null,
  }
}))
await b.close()
