/** Finding P: does the payout gate paint above the tabs, from the record? */
import { chromium } from 'playwright'
const b = await chromium.launch()
for (const [id, bank] of [['DRV-0204', 'Rejected'], ['DRV-0105', 'Pending verification'], ['DRV-0201', 'Verified']]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
  await p.goto(`http://localhost:5199/entity/${id}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2200)
  const r = await p.evaluate(() => {
    const row = document.querySelector('[role="tablist"]')
    if (!row) return { err: 'no tablist' }
    const all = document.body.innerText
    const rowText = row.innerText.replace(/\s+/g, ' ')
    const cut = all.indexOf(row.innerText.split('\n')[0])
    return {
      aboveTabs: all.slice(0, cut > 0 ? cut : 400).replace(/\n+/g, ' | ').trim().slice(0, 380),
      tabs: rowText,
    }
  })
  console.log(`\n${id}  bank=${bank}`)
  console.log('  above :', r.aboveTabs ?? r.err)
  console.log('  tabs  :', r.tabs ?? '')
  await p.close()
}
await b.close()
