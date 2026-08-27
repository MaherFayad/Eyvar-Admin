import { chromium } from 'playwright'
const B = 'http://localhost:5199'
const OUT = 'c:/Users/Admin/Documents/GitHub/Eyvar Admin/scratch/shots'
const b = await chromium.launch()
const errs = []
const page = async (url) => {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  p.on('pageerror', (e) => errs.push(`${url} ${String(e).slice(0, 220)}`))
  await p.goto(B + url, { waitUntil: 'networkidle' })
  await p.waitForTimeout(800)
  return p
}

// 1 — take-over confirmation (AC-203), on a row REQ-503 holds another operator's claim
let p = await page('/operations/assurance')
await p.getByRole('button', { name: 'Take over' }).first().click()
await p.waitForTimeout(500)
await p.screenshot({ path: `${OUT}/w2-flow-takeover.png` })
await p.close()

// 2 — a disposition confirmation with a required rationale (AC-333)
p = await page('/support/fairness')
await p.getByRole('button', { name: 'Overturn' }).first().click()
await p.waitForTimeout(500)
await p.screenshot({ path: `${OUT}/w2-flow-rationale.png` })
// submit must be disabled with an empty reason
const disabled = await p.getByRole('button', { name: 'Overturn', exact: true }).last().isDisabled()
console.log('rationale required, primary disabled with empty reason:', disabled)
await p.close()

// 3 — claim, then the row converts (AC-226 / Q-26) and a decided row stays
p = await page('/support/fairness')
await p.getByRole('button', { name: 'Claim' }).first().click()
await p.waitForTimeout(900)
await p.screenshot({ path: `${OUT}/w2-flow-claimed.png` })
await p.close()

// 4 — AC-41 row-scoped failure: only this row breaks
p = await page('/support/fairness?mockFail=fairness.claim')
await p.getByRole('button', { name: 'Claim' }).first().click()
await p.waitForTimeout(900)
await p.screenshot({ path: `${OUT}/w2-flow-rowerror.png` })
await p.close()

// 5 — the assign picker (AC-247)
p = await page('/operations/requests')
await p.getByRole('button', { name: 'Assign' }).first().click()
await p.waitForTimeout(600)
await p.screenshot({ path: `${OUT}/w2-flow-assign.png` })
await p.close()

await b.close()
console.log(errs.length ? errs.join('\n') : 'no page errors')
