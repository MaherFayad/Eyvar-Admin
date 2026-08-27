import { chromium } from 'playwright'
const paths = process.argv.slice(2)
const b = await chromium.launch()
const errs = []
for (const spec of paths) {
  const [path, name, w = '1440'] = spec.split('|')
  const p = await b.newPage({ viewport: { width: Number(w), height: 900 } })
  p.on('console', (m) => { if (m.type() === 'error') errs.push(`${path}  ${m.text().slice(0, 300)}`) })
  p.on('pageerror', (e) => errs.push(`${path}  PAGEERROR ${String(e).slice(0, 300)}`))
  await p.goto('http://localhost:5199' + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(900)
  await p.screenshot({ path: `scratch/shots/${name}.png`, fullPage: false })
  await p.close()
}
await b.close()
console.log(errs.length ? errs.join('\n') : 'clean')
