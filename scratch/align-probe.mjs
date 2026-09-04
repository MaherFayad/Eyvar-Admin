import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1600 } })
await p.goto('http://localhost:5199/entity/DRV-0201?view=activity', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
console.log(await p.evaluate(() => {
  const pick = (sel, test) => [...document.querySelectorAll(sel)].find(e => test(e.textContent))
  const rows = []
  const add = (name, el) => { if (el) { const r = el.getBoundingClientRect(); rows.push({ name, left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) }) } }
  add('figure: Rating label', pick('*', t => t.trim() === 'Rating'))
  add('figure grid',  [...document.querySelectorAll('div')].find(e => getComputedStyle(e).display === 'grid' && /Rating/.test(e.innerText) && /On time/.test(e.innerText)))
  add('h "Trips"', pick('h2,h3', t => /^Trips$/.test(t.trim())))
  add('subheading', pick('*', t => /trips completed · Last trip/.test(t) && t.length < 60))
  add('toolbar', document.querySelector('input[type="search"],input[placeholder*="Search"]')?.closest('div')?.parentElement)
  add('search input', document.querySelector('input[placeholder*="Search"]'))
  add('table card', document.querySelector('table')?.closest('div[class*="rounded"],div[class*="border"]'))
  add('table', document.querySelector('table'))
  add('h "Elsewhere"', pick('h2,h3', t => /Elsewhere/.test(t)))
  add('Elsewhere section', pick('h2,h3', t => /Elsewhere/.test(t))?.closest('section'))
  add('pair grid', document.querySelector('table')?.closest('div.grid'))
  return rows
}))
await b.close()
