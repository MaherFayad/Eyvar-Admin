import { chromium } from 'playwright'
const b = await chromium.launch()
for (const r of process.argv.slice(2)) {
  const [path, name, w] = r.split('::')
  const p = await b.newPage({ viewport: { width: Number(w||1280), height: 820 }, deviceScaleFactor: 2 })
  await p.goto('http://localhost:5199' + path, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  await p.screenshot({ path: `./scratch/shots/${name}.png` })
  await p.close()
}
await b.close(); console.log('done')
