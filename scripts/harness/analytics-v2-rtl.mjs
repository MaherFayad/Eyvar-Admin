/**
 * WP-8.2 (Arabic, audit) — every analytics v2 surface under `dir="rtl"`:
 * the report builder toolbar and title, the funnel/retention/table modes,
 * pages and its twelve block types, alerting (including the history
 * dialog), and the analyst (index + job screen), none of which the sibling
 * `-visual.md` passes (charts/modes/pages/alerts) fully covered — the
 * analyst screens in particular were not in any of their scopes.
 *
 * Audit only. Findings are written by hand to
 * `docs/02-verification/analytics-v2-arabic.md`; this script only proves
 * them and captures evidence screenshots.
 *
 *   npx vite --port 4327  &&  node scripts/harness/analytics-v2-rtl.mjs
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
function note(label, detail = '') {
  console.log(`NOTE  ${label}${detail ? '  — ' + detail : ''}`)
}

const browser = await chromium.launch()

async function newPage({ viewport = { width: 1280, height: 900 } } = {}) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)) })
  return { ctx, page, errors }
}

async function toArabic(page) {
  await page.getByRole('button', { name: 'Account' }).click()
  await page.waitForTimeout(150)
  await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await page.waitForTimeout(600)
}

/* ═══════════════════════ Analyst — index, Arabic ═══════════════════════ */
{
  const { ctx, page, errors } = await newPage()
  await page.goto(`${BASE}/management/reports?view=analyst`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await toArabic(page)
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/rtl-analyst-index-ar.png`, fullPage: true })

  check('no pageerror on analyst index (ar)', errors.length === 0, errors.join(' | '))

  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check('no horizontal overflow at 1280 (analyst index, ar)', overflowX <= 0, `overflowX=${overflowX}`)

  /* `AnalystView.tsx:163` renders `row.requestedBy` (e.g. `USR-7`) as plain
     text, no `<bdi>` — `PagesView.tsx:109`'s identical "owner" column DOES
     wrap the same shape of value in `isolatedRunProps().run`. This checks
     the requestedBy CELL specifically, not just "a bdi somewhere in the
     row" (the question and started-date cells both legitimately have one). */
  const requestedByCellHasBdi = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tbody tr'))
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td, th'))
      const idCell = cells.find((c) => /^USR-\d+$/.test(c.textContent?.trim() ?? ''))
      if (idCell) return { text: idCell.textContent?.trim(), hasBdi: idCell.querySelector('bdi') !== null }
    }
    return null
  })
  note('requestedBy raw-id cell sample', JSON.stringify(requestedByCellHasBdi))
  check(
    'requestedBy raw-id cell is bdi-isolated, matching PagesView.tsx:109\'s identical owner pattern',
    requestedByCellHasBdi !== null && requestedByCellHasBdi.hasBdi,
    JSON.stringify(requestedByCellHasBdi),
  )

  await ctx.close()
}

/* ═══════════════ Analyst — job screen, Arabic question typed while UI is English ═══════════════ */
{
  const { ctx, page, errors } = await newPage()
  await page.goto(`${BASE}/management/reports/analyst/AGT-2`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/rtl-analyst-job-agt2-en-ui.png`, fullPage: true })

  const titleFacts = await page.evaluate(() => {
    const h1 = document.querySelector('h1')
    if (!h1) return null
    const cs = getComputedStyle(h1)
    return {
      text: h1.textContent,
      dir: h1.getAttribute('dir'),
      inheritedDir: h1.closest('[dir]')?.getAttribute('dir') ?? null,
      textAlign: cs.textAlign,
      hasBdi: h1.querySelector('bdi') !== null,
    }
  })
  note('AGT-2 job title (h1) facts, English UI', JSON.stringify(titleFacts))
  check(
    'AGT-2 title (Arabic user question) is isolated (dir=auto or <bdi>) inside the English-dir header',
    titleFacts !== null && (titleFacts.dir === 'auto' || titleFacts.hasBdi),
    JSON.stringify(titleFacts),
  )
  check('no pageerror on AGT-2 job screen (en ui)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

/* ═══════════════ Analyst — job screen, English question, Arabic UI ═══════════════ */
{
  const { ctx, page, errors } = await newPage()
  await page.goto(`${BASE}/management/reports/analyst/AGT-4`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await toArabic(page)
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/rtl-analyst-job-agt4-ar-ui.png`, fullPage: true })

  const titleFacts = await page.evaluate(() => {
    const h1 = document.querySelector('h1')
    if (!h1) return null
    const cs = getComputedStyle(h1)
    return { text: h1.textContent, dir: h1.getAttribute('dir'), textAlign: cs.textAlign, hasBdi: h1.querySelector('bdi') !== null }
  })
  note('AGT-4 job title (h1) facts, Arabic UI', JSON.stringify(titleFacts))
  check(
    'AGT-4 title (English user question) is isolated inside the Arabic-dir header',
    titleFacts !== null && (titleFacts.dir === 'auto' || titleFacts.hasBdi),
    JSON.stringify(titleFacts),
  )

  /* `an.job.meta` = `'طلبها {who} · {time}'` — `who` is a raw id
     (`job.requestedBy`, e.g. `USR-7`) substituted by plain string
     interpolation (`translate.ts`'s `interpolate` has no isolation step),
     so it is unwrapped exactly like the index column above. */
  const metaText = await page.evaluate(() => {
    const h1 = document.querySelector('h1')
    return h1?.parentElement?.querySelector('p')?.textContent ?? null
  })
  note('AGT-4 meta line sample (raw id interpolated, unisolated)', metaText ?? 'not found')
  check('no pageerror on AGT-4 job screen (ar ui)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

/* ═══════════════ Pages — the case-study page (heading/text/agent-insight/report/toggle/callout), Arabic ═══════════════ */
/* Reached through the job screen (AGT-1, done), the real path an operator
   uses — `PAGE-CS-1` is a private, unpublished draft (`pages.ts:110`) and is
   not a route this build makes independently navigable. */
{
  const { ctx, page, errors } = await newPage()
  await page.goto(`${BASE}/management/reports/analyst/AGT-1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await toArabic(page)
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/rtl-pages-case-study-ar.png`, fullPage: true })

  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check('no horizontal overflow at 1280 (AGT-1 result page, ar)', overflowX <= 0, `overflowX=${overflowX}`)
  check('no pageerror on AGT-1 result page (ar)', errors.length === 0, errors.join(' | '))

  /* `BlockFrame` (which carries `data-block-id`) only wraps blocks in EDIT
     mode; `JobScreen.tsx` renders read-only (`editing: false`), so blocks
     render bare — this counts headings instead, a proxy that is present in
     view mode too. */
  const headingCount = await page.locator('h2, h3').count()
  note('AGT-1 result page heading count (view-mode block proxy)', String(headingCount))
  check('AGT-1 result page renders real content in view mode (ar)', headingCount > 0, `headings=${headingCount}`)
  await ctx.close()
}

/* ═══════════════ Pages — insert the remaining block types live, Arabic edit mode ═══════════════ */
{
  const { ctx, page, errors } = await newPage({ viewport: { width: 1280, height: 1300 } })
  await page.goto(`${BASE}/management/reports/pages/DSH-1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await toArabic(page)
  await page.waitForTimeout(600)

  const editButton = page.getByRole('button', { name: 'تعديل' })
  if (await editButton.count()) {
    await editButton.click()
    await page.waitForTimeout(500)

    const typesToAdd = ['divider', 'columns', 'table', 'bookmark', 'alert-status']
    for (const type of typesToAdd) {
      const addButtons = page.getByRole('button', { name: 'إضافة كتلة' })
      if ((await addButtons.count()) === 0) {
        note(`no "Add block" affordance found for ${type}`)
        continue
      }
      try {
        await addButtons.first().click({ force: true, timeout: 5000 })
        await page.waitForTimeout(300)
        const searchBox = page.locator('[cmdk-input]').or(page.getByRole('combobox')).first()
        await searchBox.fill(type, { timeout: 3000 })
        await page.waitForTimeout(250)
        const option = page.getByRole('option').first()
        if (await option.count()) {
          await option.click()
          await page.waitForTimeout(400)
          await page.screenshot({ path: `${OUT}/rtl-pages-block-${type}-ar.png`, fullPage: true })
        } else {
          note(`no option matched "${type}" in the add-block picker`)
          await page.keyboard.press('Escape')
        }
      } catch (e) {
        note(`insertion failed for ${type}`, String(e).split('\n')[0])
        await page.keyboard.press('Escape').catch(() => {})
      }
    }
  } else {
    note('Arabic "Edit" button not found on DSH-1 — cannot add block types live')
  }

  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check('no horizontal overflow at 1280 after inserting blocks (ar)', overflowX <= 0, `overflowX=${overflowX}`)
  check('no pageerror while inserting blocks (ar)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

/* ═══════════════ Alerting — the history dialog, Arabic ═══════════════ */
{
  const { ctx, page, errors } = await newPage()
  await page.goto(`${BASE}/management/reports?view=alerts`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await toArabic(page)
  await page.waitForTimeout(600)

  const firstRowKebab = page.locator('tbody tr').first().locator('button[aria-haspopup="menu"]').last()
  if (await firstRowKebab.count()) {
    await firstRowKebab.click()
    await page.waitForTimeout(250)
    const historyItem = page.getByRole('menuitem', { name: 'سجل الإطلاق' })
    if (await historyItem.count()) {
      await historyItem.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${OUT}/rtl-alert-history-dialog-ar.png`, fullPage: true })

      /* The firing table's own wrapper is `overflow-x: auto` by design (it is
         wider than the dialog on purpose, in English too — confirmed by a
         side-by-side probe, `dialogScrollW`/`dialogClientW` identical in
         both languages) so an internal scrollbar is not itself a defect;
         this only records the fact and the dialog's own `dir`. */
      const dialogFacts = await page.evaluate(() => {
        const dialog = document.querySelector('[role=dialog]')
        if (!dialog) return null
        return {
          dir: dialog.getAttribute('dir') ?? dialog.closest('[dir]')?.getAttribute('dir') ?? null,
          overflowX: dialog.scrollWidth - dialog.clientWidth,
          tabsText: Array.from(dialog.querySelectorAll('[role=tab]')).map((t) => t.textContent),
        }
      })
      note('alert history dialog facts (internal table scroll is by design, both languages)', JSON.stringify(dialogFacts))
      check('history dialog itself renders with dir=rtl', dialogFacts !== null && dialogFacts.dir === 'rtl', JSON.stringify(dialogFacts))
    } else {
      note('History menu item not found in row kebab (ar)')
    }
  } else {
    note('No row kebab found on the alert rules table (ar) — cannot open history dialog')
  }
  check('no pageerror opening alert history dialog (ar)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

/* ═══════════════ Report builder — title/description isolation with an Arabic-named report, English UI ═══════════════ */
{
  const { ctx, page, errors } = await newPage()
  await page.goto(`${BASE}/management/reports/RPT-1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/rtl-builder-rpt1-en.png`, fullPage: true })
  check('no pageerror on RPT-1 (en)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}
{
  const { ctx, page, errors } = await newPage()
  await page.goto(`${BASE}/management/reports/RPT-1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await toArabic(page)
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/rtl-builder-rpt1-ar.png`, fullPage: true })

  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check('no horizontal overflow at 1280 (RPT-1 builder, ar)', overflowX <= 0, `overflowX=${overflowX}`)
  check('no pageerror on RPT-1 (ar)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

console.log(`\n${failures} check(s) failed.`)
await browser.close()
process.exitCode = failures > 0 ? 1 : 0
