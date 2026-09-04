/**
 * Arrow keys move SELECTION, not just focus (Radix's automatic activation).
 * The captain page pushes `?view=` on every selection. So: does arrowing
 * across the row push one history entry per keypress, and what does Back do?
 */
import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
await p.goto('http://localhost:5199/entity/DRV-0201', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)

const url = () => p.evaluate(() => location.pathname + location.search)
const depth = () => p.evaluate(() => history.length)

console.log('landed        :', await url(), ' history.length:', await depth())
const base = await depth()

await p.locator('[role="tab"]').first().focus()
for (const key of ['ArrowRight', 'ArrowRight', 'ArrowRight']) {
  await p.keyboard.press(key)
  await p.waitForTimeout(250)
  console.log(`${key} ->`, await url(), ' history.length:', await depth(), `(+${(await depth()) - base})`)
}

console.log('\nBack x1       :')
await p.goBack(); await p.waitForTimeout(300)
console.log('  url:', await url())
const selected = await p.evaluate(() =>
  document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.trim())
console.log('  selected tab:', selected)

console.log('\nHow many Backs to leave the captain page?')
let n = 0
for (let i = 0; i < 8; i += 1) {
  await p.goBack(); await p.waitForTimeout(250); n += 1
  const u = await url()
  if (!u.startsWith('/entity/')) { console.log(`  ${n} Back presses -> ${u}`); break }
  console.log(`  after ${n}: ${u}`)
}
await b.close()
