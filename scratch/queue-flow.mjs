import { chromium } from 'playwright'
const base = 'http://localhost:5199'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await p.goto(`${base}/operations/people?view=applications`, { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
/* APP-2205 has 3 of 5 documents verified: approve throws 422 (AC-41). */
const row = p.locator('tbody tr', { hasText: 'APP-2205' })
await row.getByRole('button', { name: 'Approve' }).click()
await p.waitForTimeout(1500)
await p.screenshot({ path: './scratch/shots/people-rowerror-1440.png' })
/* And a claim, which succeeds. */
const row2 = p.locator('tbody tr', { hasText: 'APP-2202' })
await row2.getByRole('button', { name: 'Claim' }).click()
await p.waitForTimeout(1500)
await p.screenshot({ path: './scratch/shots/people-claim-1440.png' })
await p.close()
await b.close()
console.log('done')
