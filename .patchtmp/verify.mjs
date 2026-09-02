import { chromium } from 'playwright'
const BASE = 'http://localhost:5211'
const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', e => console.log('PAGE ERR:', String(e).slice(0,200)))

/* Counts every insertion of an aria-busy skeleton container, so even a
   one-frame flash is caught. Survives client-side navigation. */
await page.addInitScript(`
  window.__sk = 0;
  window.__resetSk = () => { window.__sk = 0 };
  const hit = (n) => n.nodeType === 1 &&
    ((n.matches && n.matches('[aria-busy="true"]')) ||
     (n.querySelector && !!n.querySelector('[aria-busy="true"]')));
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (hit(n)) window.__sk++ })
    .observe(document, { childList: true, subtree: true });
`)

const settle = async () => {
  await page.waitForFunction(() => document.querySelectorAll('table tbody tr').length > 0, { timeout: 20000 })
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), { timeout: 20000 })
}
const snap = async (label) => ({
  label,
  skeletons: await page.evaluate(() => window.__sk),
  rows: await page.locator('table tbody tr').count(),
  firstCell: (await page.locator('table tbody tr').first().innerText()).split(/\s+/).join(' ').trim().slice(0, 55),
})
const subTab = async (path, label) => {
  await page.evaluate(() => window.__resetSk())
  await page.locator(`a[href="${path}"]`).first().click()
  await page.waitForFunction(p => location.pathname === p, path, { timeout: 20000 })
  await settle()
  return snap(label)
}

const A = '/financials/payouts', B = '/financials/revenue'
await page.goto(BASE + A, { waitUntil: 'commit', timeout: 60000 })
await settle()
const a1 = await snap('A cold (payouts)')
const b1 = await subTab(B, 'B 1st visit (revenue), cold')
const a2 = await subTab(A, 'A 2nd visit (payouts), WARM')
const b2 = await subTab(B, 'B 2nd visit (revenue), WARM')

for (const s of [a1, b1, a2, b2])
  console.log(`${s.label.padEnd(34)} skeletons=${s.skeletons}  rows=${s.rows}  first=${JSON.stringify(s.firstCell)}`)

console.log('\n=== ASSERTIONS ===')
const checks = [
  ['cold 1st load of A repaints a skeleton', a1.skeletons > 0],
  ['cold 1st visit to B repaints a skeleton', b1.skeletons > 0],
  ['2nd visit to A repaints NO skeleton', a2.skeletons === 0],
  ['2nd visit to B repaints NO skeleton', b2.skeletons === 0],
  ['A shows the same rows on both visits', a1.firstCell === a2.firstCell && a1.rows === a2.rows],
  ['B shows the same rows on both visits', b1.firstCell === b2.firstCell && b1.rows === b2.rows],
  ['B shows ITS OWN rows, not A\u2019s', b2.firstCell !== a2.firstCell],
]
for (const [n, ok] of checks) console.log((ok ? 'PASS  ' : 'FAIL  ') + n)
console.log(checks.every(([, ok]) => ok) ? '\nALL PASS' : '\nSOME FAILED')
await browser.close()
