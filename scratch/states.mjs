import { chromium } from 'playwright'

const base = 'http://localhost:5199'
const browser = await chromium.launch()

async function page(w = 1280) {
  const p = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2 })
  return p
}

/* 1. Card-scoped error — induced from the URL, no source edit (AC-36). */
{
  const p = await page()
  await p.goto(`${base}/operations/people?mockFail=drivers.list`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)
  await p.screenshot({ path: './scratch/shots/people-error-1280.png' })
  await p.close()
}

/* 2. `no-match` empty — a query that matches nothing (AC-37). */
{
  const p = await page()
  await p.goto(`${base}/operations/people`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)
  await p.getByRole('button', { name: 'Search this view' }).click()
  await p.getByRole('textbox', { name: 'Search captains' }).fill('zzzzzz')
  await p.waitForTimeout(1500)
  await p.screenshot({ path: './scratch/shots/people-nomatch-1280.png' })
  await p.close()
}

/* 3. Selection replaces the header row and floats the bulk bar (AC-46). */
{
  const p = await page()
  await p.goto(`${base}/operations/people`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)
  const boxes = p.getByRole('checkbox', { name: 'Select row' })
  await boxes.nth(0).click()
  await boxes.nth(1).click()
  await boxes.nth(2).click()
  await p.waitForTimeout(400)
  await p.screenshot({ path: './scratch/shots/people-selection-1280.png' })
  /* …and the destructive confirmation it opens. */
  await p.getByRole('button', { name: 'Suspend', exact: true }).click()
  await p.waitForTimeout(500)
  await p.screenshot({ path: './scratch/shots/people-confirm-1280.png' })
  await p.close()
}

/* 4. Sort popover — the control §9.1 says the header is not. */
{
  const p = await page()
  await p.goto(`${base}/operations/people`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)
  await p.getByRole('button', { name: 'Sort' }).click()
  await p.waitForTimeout(400)
  await p.screenshot({ path: './scratch/shots/people-sort-1280.png' })
  await p.close()
}

/* 5. Arabic — dir=rtl on the document element, same route, same view. */
{
  const p = await page()
  await p.goto(`${base}/operations/people`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)
  await p.evaluate(() => {
    document.documentElement.setAttribute('dir', 'rtl')
    document.documentElement.setAttribute('lang', 'ar')
  })
  await p.waitForTimeout(600)
  await p.screenshot({ path: './scratch/shots/people-rtl-1280.png' })
  await p.close()
}

await browser.close()
console.log('done')
