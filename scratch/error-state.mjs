import { chromium } from 'playwright'
const base = 'http://localhost:5199'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
await p.goto(`${base}/operations/people`, { waitUntil: 'networkidle' })
await p.waitForTimeout(2000)
const ok = await p.evaluate(async () => {
  const m = await import('/src/data/clients/index.ts')
  m.mockFailures.always('drivers.list')
  return typeof m.mockFailures.always === 'function'
})
console.log('registry reachable:', ok)
/* Client-side navigation away and back forces the read to run again. */
await p.getByRole('tab', { name: 'Riders' }).click()
await p.waitForTimeout(1200)
await p.getByRole('tab', { name: 'Captains' }).click()
await p.waitForTimeout(2000)
await p.screenshot({ path: './scratch/shots/people-error-1280.png' })
await p.close()
await b.close()
console.log('done')
