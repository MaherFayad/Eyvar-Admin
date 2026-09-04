/** Manual activation: arrow moves focus only; Enter commits and pushes once. */
import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
await p.goto('http://localhost:5199/entity/DRV-0201', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
const state = () => p.evaluate(() => ({
  url: location.pathname + location.search,
  history: history.length,
  focused: document.activeElement?.getAttribute('role') === 'tab'
    ? document.activeElement.textContent.trim().slice(0, 20) : '(not a tab)',
  selected: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.trim().slice(0, 20),
  panel: document.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby') ? 'present' : 'MISSING',
}))
await p.locator('[role="tab"]').first().focus()
console.log('focused first :', await state())
for (let i = 0; i < 3; i += 1) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150) }
console.log('after 3 Right :', await state())
await p.keyboard.press('Enter'); await p.waitForTimeout(400)
console.log('after Enter   :', await state())
await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(150)
await p.keyboard.press(' '); await p.waitForTimeout(400)
console.log('Left + Space  :', await state())
console.log('\nHome/End:')
await p.keyboard.press('Home'); await p.waitForTimeout(150)
console.log('  Home ->', (await state()).focused)
await p.keyboard.press('End'); await p.waitForTimeout(150)
console.log('  End  ->', (await state()).focused)
await b.close()
