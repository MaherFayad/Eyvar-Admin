import { chromium } from 'playwright'

const BASE = 'http://localhost:5233'
const OUT = 'c:/Users/Admin/Documents/GitHub/Eyvar Admin/scratch/shots'

const b = await chromium.launch()

async function probe(url, label, shot) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))
  await p.goto(BASE + url, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)
  const main = await p.locator('main').innerText().catch(() => '')
  const headings = await p.locator('main h1, main h2, main h3, main p').allInnerTexts()
  if (shot) await p.screenshot({ path: `${OUT}/${shot}`, fullPage: false })
  console.log(`\n### ${label}  ${url}`)
  console.log('  pageerrors:', errs.length ? errs : 'none')
  console.log('  main text (first 400):', JSON.stringify(main.slice(0, 400)))
  console.log('  buttons in main:', JSON.stringify(await p.locator('main button').allInnerTexts()))
  await p.close()
  return { main, headings }
}

await probe('/operations/people', 'BASELINE — no mockFail')
await probe('/operations/people?mockFail=drivers.list', 'INJECTED — drivers.list', 'rtl-mockfail-drivers-1440.png')
await probe('/operations/people?mockFail=applicants.list', 'INJECTED — applicants.list')
await probe('/operations/people?mockFail=session.current', 'INJECTED — session.current')

await b.close()
