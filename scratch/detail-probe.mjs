import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto('http://localhost:4325/operations/overview', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
console.log(await page.evaluate(() => {
  const out = []
  const main = document.querySelector('main')
  const heads = [...main.querySelectorAll('h2,h3')].map((h) => h.textContent.trim())
  out.push('headings: ' + JSON.stringify(heads))
  const chart = [...main.querySelectorAll('*')].find((e) => e.textContent.trim().startsWith('Trips completed') && e.querySelector('svg'))
  const list = [...main.querySelectorAll('*')].find((e) => e.textContent.trim().startsWith('All 5 queues'))
  const cr = chart?.getBoundingClientRect()
  const lr = list?.getBoundingClientRect()
  out.push('chart box: ' + (cr ? `x=${Math.round(cr.x)} w=${Math.round(cr.width)} y=${Math.round(cr.y)}` : 'none'))
  out.push('list box:  ' + (lr ? `x=${Math.round(lr.x)} w=${Math.round(lr.width)} y=${Math.round(lr.y)}` : 'none'))
  out.push('side by side: ' + (cr && lr && Math.abs(cr.y - lr.y) < 40))
  // recharts internals
  const svg = chart?.querySelector('svg')
  const texts = svg ? [...svg.querySelectorAll('text')].map((t) => t.textContent) : []
  out.push('svg text: ' + JSON.stringify(texts))
  const plot = svg?.querySelector('.recharts-area-area')
  out.push('area x: ' + (plot ? Math.round(plot.getBoundingClientRect().x - cr.x) : 'n/a'))
  // bars in the list
  const bars = list ? list.querySelectorAll('span[aria-hidden="true"].block') : []
  out.push('bars: ' + bars.length)
  return out.join('\n')
}))
await browser.close()
