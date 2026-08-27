import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
await p.goto('http://localhost:5199/management/overview', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
const out = await p.evaluate(() => {
  const svg = document.querySelector('[data-slot="chart"] svg')
  const seen = new Set()
  svg.querySelectorAll('*').forEach((n) => {
    const cs = getComputedStyle(n)
    for (const prop of ['fill', 'stroke', 'color']) {
      const v = cs[prop]
      if (v && v !== 'none' && v !== 'rgba(0, 0, 0, 0)') seen.add(`${prop}: ${v}`)
    }
  })
  const ticks = [...svg.querySelectorAll('.recharts-cartesian-axis-tick text')].map((n) => n.textContent)
  return { painted: [...seen].sort(), ticks: ticks.slice(0, 12) }
})
console.log(JSON.stringify(out, null, 1))
await b.close()
