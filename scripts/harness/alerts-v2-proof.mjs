/**
 * WP-5.7 proof: independent verification the qa/visual/a11y verdicts cite.
 * `alerts-v2.mjs` already proves the preview renders; this checks its CONTENT
 * against ground truth read from the report builder's own data table (a
 * different code path than `evaluate()`), and drives the three new-entry-point
 * loops end to end, including the unsaved-report save-then-prefill path the
 * WP-5.5 author flagged as untested. `node scripts/harness/alerts-v2-proof.mjs`
 * against `npx vite --port 4327`.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

function stubPointerCaptureInit(page) {
  return page.addInitScript(() => {
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = () => false
      Element.prototype.setPointerCapture = () => {}
      Element.prototype.releasePointerCapture = () => {}
    }
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {}
    }
  })
}

/* ── Check 1 — AC-1226 ground truth: read RPT-3's own data table (a
   different render path than the alert evaluator) for the last 60 COMPLETE
   `revenue.total#_#current` buckets, and independently count how many are
   below SAR 400 — ALR-2's condition, `lt 40000` halalas. Then open ALR-2's
   composer and compare that count against the preview's own stated count
   (`rb.alert.preview.summary`) AND the number of drawn marks. ──────────── */
async function checkPreviewAgainstGroundTruth() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  await stubPointerCaptureInit(ctx)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))

  await page.goto(BASE + '/management/reports/RPT-3', { waitUntil: 'networkidle' })
  await page.waitForSelector('table')
  await page.waitForTimeout(1200)
  const table = page.locator('table').first()
  const headers = await table.locator('thead tr').first().locator('th').allTextContents()
  const rows = await table.locator('tbody tr').all()
  const currentRow = await rows[0].locator('th,td').allTextContents()
  const dateHeaders = headers.slice(1, -1)
  const values = currentRow.slice(1, -1)
  const parsed = dateHeaders.map((h, i) => {
    const incomplete = h.includes('Incomplete')
    const raw = values[i]
    const value = raw === '—' ? null : Number(raw.replace(/[^0-9.]/g, ''))
    return { date: h.replace('Incomplete', ''), incomplete, value }
  })
  const complete = parsed.filter((p) => !p.incomplete)
  const last60 = complete.slice(-60)
  const groundTruthFires = last60.filter((p) => p.value !== null && p.value < 400).length
  const partialDates = parsed.filter((p) => p.incomplete).map((p) => p.date)

  console.log('CHECK 1 — ground truth from data table:')
  console.log('  complete buckets available (of last 60):', last60.length)
  console.log('  buckets below SAR 400 (should fire):', groundTruthFires)
  console.log('  partial bucket(s) seen in the table (must be excluded from evaluation):', partialDates)

  // Now open the same report's alerts and edit ALR-2, the rule with this
  // exact condition (`lt`, 40 000 halalas = SAR 400, grain day).
  await page.goto(BASE + '/management/reports?view=alerts', { waitUntil: 'networkidle' })
  await page.waitForSelector('table')
  await page.waitForTimeout(1000)
  await page.getByText('Gross revenue below SAR 400 a day', { exact: true }).click()
  await page.waitForLoadState('networkidle')

  let summaryText = null
  for (let attempt = 0; attempt < 6; attempt += 1) {
    summaryText = await page.locator('text=/of the last \\d+ buckets would have fired/').first().textContent().catch(() => null)
    if (summaryText) break
    await page.waitForTimeout(1000)
  }
  console.log('CHECK 1 — preview sr-only summary text:', summaryText)

  const charts = page.locator('[data-chart]')
  const chartCount = await charts.count()
  const preview = charts.nth(chartCount - 1)
  const markCount = await preview.locator('circle[fill="var(--color-warning-graphic)"]').count()
  console.log('CHECK 1 — drawn amber marks in the preview chart:', markCount)

  await page.screenshot({ path: `${OUT}/proof-composer-alr2.png`, fullPage: true })

  const summaryCount = summaryText ? Number(summaryText.match(/^(\d+)/)?.[1]) : null
  const match = summaryCount === groundTruthFires && markCount === groundTruthFires
  console.log(
    match
      ? 'CHECK 1 — PASS: ground truth, preview summary and drawn marks all agree at'
      : 'CHECK 1 — MISMATCH (BLOCKING if real): ground truth=' + groundTruthFires + ' summary=' + summaryCount + ' marks=' + markCount,
    match ? groundTruthFires : '',
  )
  if (errors.length) console.log('CHECK 1 — console/page errors:', errors)
  await ctx.close()
  return { groundTruthFires, summaryCount, markCount, match, errors }
}

/* ── Check 2 — G15 entry points end to end. ─────────────────────────────── */
async function checkEntryPoints() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  await stubPointerCaptureInit(ctx)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))

  // 2a — the builder toolbar bell on a SAVED report opens the composer
  // directly, prefilled with the current series.
  await page.goto(BASE + '/management/reports/RPT-3', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const bell = page.getByRole('button', { name: 'Create alert from this chart' })
  await bell.click()
  await page.waitForTimeout(800)
  const panelAfterSavedBell = await page.getByRole('heading', { name: /Would this have fired|New alert|Edit alert/i }).count()
  const nameFieldSaved = await page.locator('#rb-alert-save-name').count()
  console.log('CHECK 2a — saved-report bell: composer heading present =', panelAfterSavedBell > 0, ' unsaved name-prompt shown (should be false) =', nameFieldSaved > 0)
  await page.screenshot({ path: `${OUT}/proof-entry-saved-bell.png`, fullPage: true })

  // 2b — THE FLAGGED LOOP: the bell on an UNSAVED report first asks for a
  // name inline, saves, then opens the composer prefilled with the series
  // (04-alerting-v2.md §4 "From a chart").
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  await stubPointerCaptureInit(ctx2)
  const page2 = await ctx2.newPage()
  const errors2 = []
  page2.on('pageerror', (e) => errors2.push(String(e).slice(0, 300)))
  await page2.goto(BASE + '/management/reports', { waitUntil: 'networkidle' })
  await page2.waitForTimeout(800)
  // `/management/reports` with no `q=` is the LIBRARY, not the builder
  // (ReportsScreen.tsx: "An empty `?q=` is `New report`", a q param
  // present-but-empty — not the same as absent). `New report` gets there.
  await page2.getByRole('link', { name: 'New report' }).or(page2.getByRole('button', { name: 'New report' })).click()
  await page2.waitForLoadState('networkidle')
  await page2.waitForTimeout(800)
  // Pick a measure so the report is not `unstarted` (the bell is disabled
  // until a measure is chosen — AC-1161). `rb-measure` is a Radix `Select`
  // combobox, not a search field (QueryPanel.tsx:267).
  await page2.locator('#rb-measure').click()
  await page2.waitForTimeout(400)
  await page2.getByRole('option', { name: /revenue/i }).first().click()
  await page2.waitForTimeout(1200)
  await page2.screenshot({ path: `${OUT}/proof-entry-unsaved-before-bell.png`, fullPage: true })

  const bell2 = page2.getByRole('button', { name: 'Create alert from this chart' })
  const bellDisabled = await bell2.isDisabled().catch(() => true)
  console.log('CHECK 2b — unsaved report, bell disabled after picking a measure? (should be false):', bellDisabled)
  if (!bellDisabled) {
    await bell2.click()
    await page2.waitForTimeout(500)
    const nameField = page2.locator('#rb-alert-save-name')
    const nameFieldShown = await nameField.count()
    console.log('CHECK 2b — inline name prompt shown on unsaved report:', nameFieldShown > 0)
    if (nameFieldShown > 0) {
      const dialogRoleCount = await page2.locator('[role="dialog"]').count()
      console.log('CHECK 2b — dialog role present while name prompt is open (should be 0, no-dialog ruling):', dialogRoleCount)
      await nameField.fill('WP-5.7 proof alert report')
      await page2.screenshot({ path: `${OUT}/proof-entry-unsaved-name-prompt.png`, fullPage: true })
      const confirm = page2.getByRole('button', { name: /Save|Confirm/i }).last()
      await confirm.click()
      await page2.waitForLoadState('networkidle')
      await page2.waitForTimeout(1500)
      const urlAfterSave = page2.url()
      console.log('CHECK 2b — URL after save (should be a report id, no lingering openAlert param):', urlAfterSave)
      const composerOpenAfterSave = await page2.getByRole('heading', { name: /Would this have fired|New alert|Edit alert/i }).count()
      console.log('CHECK 2b — composer opened automatically after save (heading found):', composerOpenAfterSave > 0)
      // Give the series list (its own `runReport` round trip) time to resolve
      // past the skeleton before judging what "prefilled" produced.
      await page2.waitForTimeout(2500)
      const seriesPressed = await page2.locator('[aria-pressed="true"]').allTextContents()
      console.log('CHECK 2b — series selection after the round trip settles (aria-pressed=true chips):', JSON.stringify(seriesPressed))
      await page2.screenshot({ path: `${OUT}/proof-entry-unsaved-after-save.png`, fullPage: true })
      // A reload/back must not reopen the composer a second time (the
      // one-shot `openAlert` param strip).
      await page2.reload({ waitUntil: 'networkidle' })
      await page2.waitForTimeout(1000)
      const urlAfterReload = page2.url()
      const stillHasOpenAlertParam = urlAfterReload.includes('openAlert=')
      console.log('CHECK 2b — URL still carries openAlert= after the effect ran (should be false):', stillHasOpenAlertParam)
    }
  }
  if (errors2.length) console.log('CHECK 2b — console/page errors:', errors2)

  // 2c — a page block's menu `Create alert…` (PAGE-TPL-2's `tpl2-r1` block,
  // report RPT-3 — the same report Check 1 used, so its own copy can be
  // spot-checked against what the builder's bell produced).
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  await stubPointerCaptureInit(ctx3)
  const page3 = await ctx3.newPage()
  const errors3 = []
  page3.on('pageerror', (e) => errors3.push(String(e).slice(0, 300)))
  await page3.goto(BASE + '/management/reports/pages/PAGE-TPL-2', { waitUntil: 'networkidle' })
  await page3.waitForTimeout(1200)
  // Block menus render only in edit mode (`pg.edit.enter` = "Edit", AC-1195).
  await page3.getByRole('button', { name: 'Edit' }).click()
  await page3.waitForTimeout(500)
  const blockMenuButtons = await page3.getByRole('button', { name: /More actions for/i }).all()
  console.log('CHECK 2c — page loaded, candidate block-menu buttons:', blockMenuButtons.length)
  let foundCreateAlert = false
  for (const btn of blockMenuButtons) {
    await btn.click()
    await page3.waitForTimeout(300)
    const item = page3.getByRole('menuitem', { name: /Create alert/i })
    if (await item.count()) {
      foundCreateAlert = true
      const disabled = await item.getAttribute('aria-disabled')
      console.log('CHECK 2c — Create alert… menu item found, aria-disabled=', disabled)
      await item.click()
      await page3.waitForTimeout(1000)
      const heading = await page3.getByRole('heading', { name: /New alert rule|Would this have fired/i }).count()
      console.log('CHECK 2c — composer opened from page block menu:', heading > 0)
      // Give the same round trip the builder-bell path needed (~2.5s there)
      // before judging whether the series preselected.
      await page3.waitForTimeout(3000)
      const seriesFieldText = await page3.locator('#rb-alert-series, [id*="series" i]').first().textContent().catch(() => null)
      console.log('CHECK 2c — Series field text after settling (3s):', seriesFieldText)
      await page3.screenshot({ path: `${OUT}/proof-entry-page-block-menu.png`, fullPage: true })
      break
    }
    await page3.keyboard.press('Escape')
  }
  console.log('CHECK 2c — Create alert… entry point found on a page block:', foundCreateAlert)
  if (errors3.length) console.log('CHECK 2c — console/page errors:', errors3)

  await ctx.close()
  await ctx2.close()
  await ctx3.close()
  return { errors, errors2, errors3 }
}

/* ── Check 3 — state 23, `no-baseline`: a refusal shown IN PLACE with a
   reason, never silence and never a crash (ALR-9, seeded with 7 usable
   points against a 28-point default lookback). ─────────────────────────── */
async function checkNoBaselineRefusal() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  await stubPointerCaptureInit(ctx)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
  await page.goto(BASE + '/management/reports?view=alerts', { waitUntil: 'networkidle' })
  await page.waitForSelector('table')
  await page.waitForTimeout(1000)
  await page.getByText('New subscriptions outside their usual band', { exact: true }).click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2500)
  const refusalText = await page.getByText(/Needs \d+ complete buckets|no-baseline/i).first().textContent().catch(() => null)
  const markCount = (await page.locator('[data-chart] circle[fill="var(--color-warning-graphic)"]').count().catch(() => 0))
  console.log('CHECK 3 — no-baseline refusal sentence shown:', refusalText)
  console.log('CHECK 3 — marks drawn while refused (should be 0):', markCount)
  await page.screenshot({ path: `${OUT}/proof-no-baseline.png`, fullPage: true })
  if (errors.length) console.log('CHECK 3 — console/page errors:', errors)
  await ctx.close()
  return { refusalText, markCount, errors }
}

/* ── Check 4 — R7: no red anywhere on the alerts surfaces (rules table,
   firings feed, the seeded `firing`/`error`/`suspended` rows). Reads the
   COMPUTED colour so a token swap that still resolves to a red hue is
   caught, not just a class-name grep. ─────────────────────────────────── */
async function scanForRed(page) {
  return page.evaluate(() => {
    function parseRgb(str) {
      const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
      if (!m) return null
      return [Number(m[1]), Number(m[2]), Number(m[3])]
    }
    const offenders = []
    document.querySelectorAll('*').forEach((el) => {
      const style = getComputedStyle(el)
      for (const prop of ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke']) {
        const raw = style[prop]
        if (!raw) continue
        const rgb = parseRgb(raw)
        if (!rgb) continue
        const [r, g, b] = rgb
        // A strong, saturated red: red channel clearly dominant and high.
        if (r > 150 && r - g > 60 && r - b > 60) {
          offenders.push({ tag: el.tagName, prop, raw, text: (el.textContent || '').slice(0, 40) })
        }
      }
    })
    return offenders.slice(0, 20)
  })
}

async function checkNoRedBadge() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  await stubPointerCaptureInit(ctx)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
  await page.goto(BASE + '/management/reports?view=alerts', { waitUntil: 'networkidle' })
  await page.waitForSelector('table')
  await page.waitForTimeout(1500)
  const rulesTabRed = await scanForRed(page)
  console.log('CHECK 4 — saturated-red computed colour on the Rules tab (incl. seeded `firing` row ALR-1):', JSON.stringify(rulesTabRed))
  await page.screenshot({ path: `${OUT}/proof-rules-tab.png`, fullPage: true })

  await page.getByRole('tab', { name: 'Firings' }).click().catch(() => {})
  await page.waitForTimeout(1000)
  const firingsTabRed = await scanForRed(page)
  console.log('CHECK 4 — saturated-red computed colour on the Firings tab:', JSON.stringify(firingsTabRed))
  await page.screenshot({ path: `${OUT}/proof-firings-tab.png`, fullPage: true })

  if (errors.length) console.log('CHECK 4 — console/page errors:', errors)
  await ctx.close()
  return { rulesTabRed, firingsTabRed, errors }
}

/* ── Check 5 — keyboard: Escape closes the composer and returns focus to the
   bell that opened it (no dialog role means no Radix focus-trap-and-restore
   for free — this has to be proven, not assumed). ──────────────────────── */
async function checkEscapeReturnsFocus() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  await stubPointerCaptureInit(ctx)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
  await page.goto(BASE + '/management/reports/RPT-3', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const bell = page.getByRole('button', { name: 'Create alert from this chart' })
  await bell.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)
  const nameInput = page.getByLabel('Name', { exact: true })
  const composerOpen = await nameInput.count()
  console.log('CHECK 5 — Enter on the focused bell opens the composer, Name field count:', composerOpen)
  await page.screenshot({ path: `${OUT}/proof-keyboard-open.png`, fullPage: true })
  // Move focus INTO the panel first — a realistic keyboard path tabs in
  // before pressing Escape, rather than leaving focus on the trigger.
  await nameInput.first().focus()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  const stillOpen = await nameInput.count()
  const activeElementDescription = await page.evaluate(() => {
    const el = document.activeElement
    return el ? { tag: el.tagName, ariaLabel: el.getAttribute('aria-label'), id: el.id, text: el.textContent?.slice(0, 40) } : null
  })
  console.log('CHECK 5 — Escape closes the composer (Name field count, 0 = closed):', stillOpen)
  console.log('CHECK 5 — active element after Escape:', JSON.stringify(activeElementDescription))
  await page.screenshot({ path: `${OUT}/proof-keyboard-after-escape.png`, fullPage: true })
  const focusedIsBell = activeElementDescription?.ariaLabel === 'Create alert from this chart'

  // How many Tab stops actually separate the Name field from the visible
  // Cancel button, since Escape does not work — the real cost of that gap.
  const cancelLabel = await page.getByRole('button', { name: /^Cancel$/i }).textContent().catch(() => null)
  let tabsToCancel = 0
  if (cancelLabel) {
    for (let i = 0; i < 60; i += 1) {
      const isCancel = await page.evaluate(() => document.activeElement?.textContent?.trim() === 'Cancel')
      if (isCancel) break
      await page.keyboard.press('Tab')
      tabsToCancel += 1
    }
  }
  console.log('CHECK 5 — Tab presses from the Name field to reach the Cancel button:', tabsToCancel)
  if (errors.length) console.log('CHECK 5 — console/page errors:', errors)
  await ctx.close()
  return { composerOpen: composerOpen > 0, closedOnEscape: stillOpen === 0, focusedIsBell, tabsToCancel, errors }
}

const r1 = await checkPreviewAgainstGroundTruth()
const r2 = await checkEntryPoints()
const r3 = await checkNoBaselineRefusal()
const r4 = await checkNoRedBadge()
const r5 = await checkEscapeReturnsFocus()

console.log('\n=== SUMMARY ===')
console.log(JSON.stringify({ preview: r1, entryPoints: r2, noBaseline: r3, redScan: r4, keyboard: r5 }, null, 2))

await browser.close()
