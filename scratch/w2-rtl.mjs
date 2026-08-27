import { chromium } from 'playwright'
const BASE = 'http://localhost:5199'
const OUT = 'c:/Users/Admin/Documents/GitHub/Eyvar Admin/scratch/shots'
const b = await chromium.launch()
const errs = []
const shots = [
  ['/operations/requests', 'w2-ar-requests'],
  ['/operations/assurance', 'w2-ar-assurance'],
  ['/operations/my-work?view=everything', 'w2-ar-mywork'],
  ['/support/safety', 'w2-ar-safety'],
  ['/support/fairness', 'w2-ar-fairness'],
]
for (const [route, name] of shots) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  p.on('pageerror', (e) => errs.push(`${route} ${String(e).slice(0, 200)}`))
  await p.goto(BASE + route, { waitUntil: 'networkidle' })
  await p.waitForTimeout(900)
  await p.getByRole('button', { name: 'Account' }).click()
  await p.waitForTimeout(400)
  await p.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await p.waitForFunction(() => document.documentElement.dir === 'rtl', null, { timeout: 5000 })
  await p.keyboard.press('Escape')
  await p.mouse.move(2, 898)
  await p.waitForTimeout(6500)
  await p.screenshot({ path: `${OUT}/${name}-1280.png` })
  await p.close()
}
await b.close()
console.log(errs.length ? errs.join('\n') : 'clean')
