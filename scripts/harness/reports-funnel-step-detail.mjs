/**
 * WP-3.5b — AC-1170 proof: a funnel step's median-to-next and its real
 * drop-off group table, drawn from `ReportResult.funnelStepDetail` — never
 * the old "needs server" sentence. Also proves F-V2-50 (the steps group is
 * labelled "Steps" without renaming the `Add a step` button) and checks the
 * group table's column order mirrors under `dir="rtl"` (§9.1).
 *
 * Opens the saved funnel `RPT-6` directly rather than building one from a
 * blank report: the mode switcher (`ModeField`) is not wired into
 * `ReportsScreen.tsx` yet (WP-7.4, a different agent's file), but a query
 * already in `mode: 'funnel'` renders `ReportModePanel` regardless.
 *
 *   npx vite --port 4327  &&  node scripts/harness/reports-funnel-step-detail.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

let failures = 0
function check(label, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL'
  if (!ok) failures += 1
  console.log(`${mark}  ${label}${detail ? '  — ' + detail : ''}`)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)) })

await page.goto(`${BASE}/management/reports/RPT-6`, { waitUntil: 'load' })
await page.waitForTimeout(1800)

// 1. F-V2-50 — the steps region is a named `role="group"`, and the button
//    inside it keeps its own visible text as its accessible name.
const stepsGroup = page.getByRole('group', { name: 'Steps' })
check('F-V2-50 — the steps region is a group named "Steps"', await stepsGroup.count() === 1)
const addStep = stepsGroup.getByRole('button', { name: 'Add a step' })
check('F-V2-50 — `Add a step` is reachable by its own visible text, not "Steps"', await addStep.count() === 1)

// 2. Trim RPT-6 to two rungs the fixtures actually convert on: drop the third
//    rung and the "quick rides only" filter narrowing the second.
await page.getByRole('button', { name: 'Remove step 3' }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'Remove the Trip kind filter from step 2' }).click()
await page.waitForTimeout(400)

// 3. Split drop-off by rider city, so AC-1170's group table has something to draw.
await page.getByLabel('Split drop-off by').click()
await page.waitForTimeout(300)
await page.getByRole('option', { name: 'Rider city' }).click()
await page.waitForTimeout(400)

// 4. A generous window, so the two rungs have real conversions to measure.
await page.getByLabel('Date range').click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'Last 365 days' }).click()
await page.waitForTimeout(400)

await page.getByRole('button', { name: 'Refresh' }).click()
await page.waitForTimeout(1800)

// 5. The cascade renders both rungs as buttons (a split is set).
const step1 = page.getByRole('button', { name: /Step 1/ })
const step2 = page.getByRole('button', { name: /Step 2/ })
check('rung 1 renders as a button', await step1.count() === 1)
check('rung 2 renders as a button', await step2.count() === 1)

const bodyText = await page.evaluate(() => document.body.innerText)
check(
  'AC-1170 — the median-to-next slot renders (a real reading or a stated "no reading", never silence)',
  /days to the next step\.|No reading for the next step\./.test(bodyText),
)
check(
  'the deleted "needs server" sentence never renders',
  !/does not do yet/.test(bodyText),
)

// 6. Rung 1 has no previous rung to drop from — the empty sentence, never a blank box.
await step1.click()
await page.waitForTimeout(500)
const rung1Region = page.getByRole('region', { name: 'Drop-off by group' })
check(
  'rung 1 — no previous rung, so the empty sentence renders, not an empty table',
  (await rung1Region.getByText('Nobody dropped off at this step.').count()) === 1,
)
await step1.click()
await page.waitForTimeout(300)

// 7. Rung 2 draws the real group table — a header row and at least one data row.
await step2.click()
await page.waitForTimeout(500)
const rung2Region = page.getByRole('region', { name: 'Drop-off by group' })
const table = rung2Region.getByRole('table')
check('rung 2 — a real `<table>` renders in place of the old placeholder', await table.count() === 1)
const headers = table.getByRole('columnheader')
check('the table has the Group and People columns', await headers.count() === 2)
const rows = table.getByRole('row')
const rowCount = await rows.count()
check('at least one group row renders, beyond the header', rowCount > 1, `rows=${rowCount}`)

await page.screenshot({ path: `${OUT}/wp35b-funnel-step-detail-en.png` })

/* Closed before the language switch — `openId` is component state, not URL
   state, and survives the switch (no remount), so an open toggle here would
   close under its Arabic click below instead of opening. */
await step2.click()
await page.waitForTimeout(300)

// 8. §9.1 — the same table under `dir="rtl"`: the column order is DOM order,
//    unchanged; only the visual position mirrors, so Group sits to the RIGHT
//    of People instead of the left.
await page.getByRole('button', { name: 'Account' }).click()
await page.waitForTimeout(300)
await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
await page.waitForTimeout(2000)

const dir = await page.evaluate(() => document.documentElement.dir)
check('the page switched to `dir="rtl"`', dir === 'rtl')

const step2Ar = page.getByRole('button', { name: 'الخطوة 2 · الرحلات المكتملة' })
check('rung 2 is reachable by its Arabic label', await step2Ar.count() === 1)
await step2Ar.click()
await page.waitForTimeout(500)

const arRegion = page.getByRole('region', { name: 'التسرّب حسب المجموعة' })
const arTable = arRegion.getByRole('table')
check('the group table still renders in Arabic', await arTable.count() === 1)
const arHeaders = arTable.getByRole('columnheader')
const groupBox = await arHeaders.nth(0).boundingBox()
const countBox = await arHeaders.nth(1).boundingBox()
check(
  'RTL — Group (logical start) sits to the right of People (logical end), the DOM order unchanged',
  Boolean(groupBox && countBox && groupBox.x > countBox.x),
  `group.x=${groupBox?.x} count.x=${countBox?.x}`,
)

const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth)
check('no horizontal overflow at 1280 in Arabic', bodyScrollWidth <= 1281, `body scrollWidth=${bodyScrollWidth}`)

await page.screenshot({ path: `${OUT}/wp35b-funnel-step-detail-ar.png` })

check('no console/page errors', errors.length === 0, errors.join(' | '))

await browser.close()
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
