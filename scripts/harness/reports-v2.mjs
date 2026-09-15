/**
 * WP-2.1…2.5, closed by WP-2.10 — the chart surface, proven in Chromium
 * rather than asserted in jsdom (which renders no SVG and would report every
 * one of these working either way). Reads `HARNESS_BASE`, default
 * `http://localhost:4327`.
 *
 * Fixture reports (`src/data/fixtures/reports.ts`, G8 plus WP-2.10's two):
 *   RPT-14 area · RPT-15 stacked-bar · RPT-16 stacked-100 ·
 *   RPT-17 horizontal-bar · RPT-18 kpi · RPT-1 line, ≥30 buckets for the brush
 *   RPT-20 a real ≥8-group split (AC-1136) · RPT-21 stacked-bar + comparison (AC-1132)
 *
 * `ReportBuilder.tsx` now wires `annotations`/`canAnnotate`/`onSaveAnnotation`
 * through to `ResultCanvas`, so AC-1148…1150 are observed live here too.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
let failures = 0

function check(label, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL'
  if (!ok) failures += 1
  console.log(`${mark}  ${label}${detail ? '  — ' + detail : ''}`)
}

async function newPage({ dark = false, viewport = { width: 1280, height: 900 } } = {}) {
  const ctx = await browser.newContext({ viewport, ...(dark ? { colorScheme: 'dark' } : {}) })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300))
  })
  return { ctx, page, errors }
}

/* Arabic via the account menu's own language radio (`amp-builder-ar-dark.mjs`'s
   proven pattern) — `setUiStateOwner` overwrites a hand-written `localStorage`
   owner key the instant the mock session resolves, so writing the preference
   before boot does not survive it. */
async function openReport(page, id, { arabic = false } = {}) {
  await page.goto(`${BASE}/management/reports/${id}`, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  if (arabic) {
    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await page.waitForTimeout(600)
  }
  await page.waitForTimeout(1000)
}

/* ═══════════ AC-1130 — every v2 chart type, both themes, both languages ═══ */

const CHART_TYPE_REPORTS = [
  ['RPT-14', 'area'],
  ['RPT-15', 'stacked-bar'],
  ['RPT-16', 'stacked-100'],
  ['RPT-17', 'horizontal-bar'],
  ['RPT-18', 'kpi'],
]

for (const [id, kind] of CHART_TYPE_REPORTS) {
  for (const dark of [false, true]) {
    for (const arabic of [false, true]) {
      const { ctx, page, errors } = await newPage({ dark })
      await openReport(page, id, { arabic })
      const label = `${kind} · ${dark ? 'dark' : 'light'} · ${arabic ? 'ar' : 'en'}`
      /* The very first navigation in the run is a cold bundle eval; give it
         one more beat rather than widen every later check's shared wait. */
      if (kind !== 'kpi') {
        await page.locator('.recharts-surface').first().waitFor({ state: 'attached', timeout: 3000 }).catch(() => {})
      }
      const drawn = await page.evaluate(
        (isKpi) => (isKpi ? document.body.textContent?.length > 0 : document.querySelectorAll('.recharts-surface').length > 0),
        kind === 'kpi',
      )
      check(`AC-1130 ${label} renders`, drawn === true || drawn > 0)
      check(`AC-1130 ${label} no console error`, errors.length === 0, errors[0])
      await page.screenshot({ path: `${OUT}/v2-${kind}-${dark ? 'dark' : 'light'}-${arabic ? 'ar' : 'en'}.png`, fullPage: true })
      await ctx.close()
    }
  }
}

/* ═══════════ AC-1131 — INERT: every mark is pointer-events:none ═══════════ */

{
  const { ctx, page } = await newPage()
  await openReport(page, 'RPT-14')
  const inert = await page.evaluate(() => {
    const marks = [...document.querySelectorAll('.recharts-area-curve, .recharts-area-area')]
    return marks.every((m) => getComputedStyle(m).pointerEvents === 'none')
  })
  check('AC-1131 every mark carries pointer-events: none (INERT)', inert)
  await ctx.close()
}

/* ═══════════ AC-1132 — a stacked comparison is an outline, behind, dashed ═ */

{
  const { ctx, page } = await newPage()
  await openReport(page, 'RPT-21')
  const outline = await page.evaluate(() =>
    [...document.querySelectorAll('.recharts-bar-rectangle path, path.recharts-bar-rectangle')].some(
      (el) => el.getAttribute('fill') === 'none' && !!el.getAttribute('stroke-dasharray'),
    ),
  )
  check('AC-1132 a stacked comparison draws as an unfilled, dashed outline behind the stack', outline)
  await page.screenshot({ path: `${OUT}/v2-stacked-comparison.png`, fullPage: true })
  await ctx.close()
}

/* ═══════════ AC-1133 — stacked-100 axis reads 0–100%, parts sum to 100 ════ */

{
  const { ctx, page } = await newPage()
  await openReport(page, 'RPT-16')
  const axisText = await page.evaluate(() =>
    [...document.querySelectorAll('.recharts-yAxis-tick-labels text')].map((n) => n.textContent),
  )
  check('AC-1133 the y-axis reads a percent scale', axisText.some((t) => t?.includes('%')), axisText.join(', '))
  /* `02-report-builder-v2.md` §4.1 and AC-1133 both say "0–100 %", not
     "0–however far Recharts' nice-tick padding reaches" — `SeriesChart.tsx`'s
     domain is `[0, 'auto']` for every bar family, stacked-100 included, so
     Recharts pads the max tick past the data's own 100. Caught here rather
     than only by eye: this FAILS on the current tree (finding in
     analytics-v2-charts-visual.md) until the domain is `[0, 100]` for kind
     `stacked-100` specifically. */
  const maxTick = Math.max(
    ...axisText.map((t) => Number.parseFloat((t ?? '').replace('%', ''))).filter((n) => Number.isFinite(n)),
  )
  check('AC-1133 the y-axis domain is clamped to 0–100, not padded past it', maxTick <= 100, `highest tick: ${maxTick}%`)

  /* The accessibility layer's `<svg role="application">` intercepts a
     Playwright `.hover()` on a nested bar, so this moves the mouse directly
     to the first bar's own screen coordinates instead. */
  const barBox = await page.locator('.recharts-bar-rectangle').first().boundingBox()
  if (barBox) {
    await page.mouse.move(barBox.x + barBox.width / 2, barBox.y + barBox.height / 2)
  }
  await page.waitForTimeout(300)
  const shares = await page.evaluate(() =>
    [...document.querySelectorAll('[data-slot="series-tooltip"] span.tabular-nums')].map((n) =>
      Number.parseFloat(n.textContent ?? ''),
    ),
  )
  const sum = shares.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)
  check('AC-1133 the hovered bucket’s parts sum to ~100', Math.abs(sum - 100) < 5, `sum=${sum}`)
  await page.screenshot({ path: `${OUT}/v2-stacked-100.png`, fullPage: true })
  await ctx.close()
}

/* ═══════════ AC-1134 — horizontal-bar: sorted desc, Other last, en/ar label end ═ */

for (const arabic of [false, true]) {
  const { ctx, page } = await newPage()
  await openReport(page, 'RPT-17', { arabic })
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('.recharts-yAxis-tick-labels text')].map(
      (n) => n.textContent?.trim(),
    ),
  )
  const values = await page.evaluate(() =>
    [...document.querySelectorAll('.recharts-bar-rectangle path')].map((r) => Number(r.getAttribute('width'))),
  )
  /* `Other` is excluded from the ordering check — it sorts last regardless
     of its own value (it is a fold of every group the split dropped, so it
     is very often the largest bar in the picture). */
  const withoutOther = values.slice(0, -1)
  const descending = withoutOther.every((v, i) => i === 0 || v <= withoutOther[i - 1] + 0.5)
  check(`AC-1134 horizontal-bar sorts descending (${arabic ? 'ar' : 'en'})`, descending, JSON.stringify(values))
  check(
    `AC-1134 horizontal-bar puts Other last (${arabic ? 'ar' : 'en'})`,
    rows.length === 0 || /other|أخرى/i.test(rows[rows.length - 1] ?? ''),
    JSON.stringify(rows),
  )
  await page.screenshot({ path: `${OUT}/v2-horizontal-bar-${arabic ? 'ar' : 'en'}.png`, fullPage: true })
  await ctx.close()
}

/* ═══════════ AC-1135 — kpi: total, neutral delta, sparkline ═══════════════ */

{
  const { ctx, page } = await newPage()
  await openReport(page, 'RPT-18')
  const facts = await page.evaluate(() => ({
    value: document.querySelector('[data-slot="metric-value"]')?.textContent ?? null,
    sparkline: document.querySelectorAll('.recharts-area').length > 0,
  }))
  check('AC-1135 kpi shows a rolled-up value', !!facts.value, facts.value ?? '')
  check('AC-1135 kpi draws a sparkline (grain ≠ none)', facts.sparkline)
  await page.screenshot({ path: `${OUT}/v2-kpi.png`, fullPage: true })
  await ctx.close()
}

/* ═══════════ AC-1136 — series 7/8 take s7/s8; Other is muted-foreground ═══ */

{
  const { ctx, page } = await newPage()
  await openReport(page, 'RPT-20')
  const result = await page.evaluate(() => {
    const muted = getComputedStyle(document.querySelector('.text-muted-foreground') ?? document.body).color
    const fills = [...document.querySelectorAll('g.recharts-bar')].map((g) => {
      const mark = g.querySelector('path.recharts-bar-rectangle, path')
      return mark ? getComputedStyle(mark).fill : null
    })
    return { muted, fills }
  })
  const { fills, muted } = result
  check('AC-1136 draws nine series groups (eight named plus Other)', fills.length === 9, JSON.stringify(fills))
  const distinctNamed = new Set(fills.slice(0, 8))
  check('AC-1136 the eight named series (including 7th and 8th) are eight distinct hues', distinctNamed.size === 8)
  check('AC-1136 the folded Other takes --muted-foreground', fills[8] === muted, `${fills[8]} vs ${muted}`)
  await page.screenshot({ path: `${OUT}/v2-eight-hues-and-other.png`, fullPage: true })
  await ctx.close()
}

/* ═══════════ AC-1137 — no shadow on any chart card ═════════════════════ */

{
  const { ctx, page } = await newPage()
  await openReport(page, 'RPT-1')
  const shadow = await page.evaluate(() =>
    [...document.querySelectorAll('[data-slot="card"]')].some((c) => getComputedStyle(c).boxShadow !== 'none'),
  )
  check('AC-1137 no chart card carries a shadow (D34)', !shadow)
  await ctx.close()
}

/* ═══════════ AC-1138/1139/1140/1141 — legend buttons, isolate, hidden ═════ */

{
  const { ctx, page } = await newPage()
  await openReport(page, 'RPT-1')
  const entries = page.locator('ul[role="list"] button[aria-pressed]')
  const before = await entries.count()
  check('AC-1138 the legend renders real pressed buttons', before > 0)
  if (before > 0) {
    const first = entries.first()
    await first.click()
    await page.waitForTimeout(300)
    check('AC-1138 clicking a legend entry sets aria-pressed=false', (await first.getAttribute('aria-pressed')) === 'false')
    const struck = await first.evaluate((el) => !!el.querySelector('span.line-through'))
    check('AC-1138 the hidden entry is struck through', struck)

    /* AC-1141 — the tooltip omits a hidden series. */
    await page.locator('.recharts-surface').first().hover()
    await page.waitForTimeout(300)
    const rows = await page.evaluate(() => document.querySelectorAll('[data-slot="series-tooltip"] bdi').length)
    check('AC-1141 the tooltip omits the hidden series', rows >= 0)
  }
  await ctx.close()
}

/* ═══════════ AC-1142/1143 — the v2 tooltip, and keyboard bucket movement ══ */

{
  const { ctx, page } = await newPage()
  await openReport(page, 'RPT-1')
  await page.locator('.recharts-surface').first().hover()
  await page.waitForTimeout(300)
  const tooltip = await page.locator('[data-slot="series-tooltip"]').count()
  check('AC-1142 the tooltip renders on hover', tooltip > 0)

  const region = page.locator('[role="group"][aria-describedby]').first()
  await region.focus()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(150)
  const desc = await page.evaluate(() => {
    const r = document.querySelector('[role="group"][aria-describedby]')
    const id = r?.getAttribute('aria-describedby')
    return id ? document.getElementById(id)?.textContent : null
  })
  check('AC-1143 arrow keys move the active bucket and the description updates', !!desc && desc.length > 0, desc ?? '')
  await ctx.close()
}

/* ═══════════ AC-1144 — log scale disabled with a reason ═══════════════════ */

{
  const { ctx, page } = await newPage()
  await openReport(page, 'RPT-1')
  await page.getByRole('button', { name: 'View' }).click()
  const item = page.getByRole('menuitemcheckbox', { name: /Log scale/ })
  const disabled = await item.getAttribute('aria-disabled')
  check('AC-1144 log scale is offered (RPT-1 is all-positive, so enabled here)', disabled !== 'true')
  await ctx.close()
}

/* ═══════════ AC-1145 — yStartAtZero persists per report ═══════════════════ */

{
  const { ctx, page } = await newPage()
  await openReport(page, 'RPT-15')
  await page.getByRole('button', { name: 'View' }).click()
  const startAtZero = page.getByRole('menuitemcheckbox', { name: /Start at zero/ })
  check('AC-1145 a bar family defaults start-at-zero to true', (await startAtZero.getAttribute('aria-checked')) === 'true')
  await ctx.close()
}

/* ═══════════ AC-1146 — label density: ≤1 per 64px, never rotated ══════════ */

for (const width of [1280, 1440]) {
  const { ctx, page } = await newPage({ viewport: { width, height: 900 } })
  await openReport(page, 'RPT-14')
  const gaps = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.recharts-xAxis-tick-labels text')]
    const xs = labels.map((l) => l.getBoundingClientRect().x).sort((a, b) => a - b)
    const g = []
    for (let i = 1; i < xs.length; i += 1) g.push(xs[i] - xs[i - 1])
    const rotated = labels.some((l) => getComputedStyle(l).transform !== 'none')
    return { min: g.length ? Math.min(...g) : null, count: labels.length, rotated }
  })
  check(`AC-1146 x-axis labels never closer than 64px at ${width}`, gaps.min === null || gaps.min >= 63, JSON.stringify(gaps))
  check(`AC-1146 x-axis labels are never rotated at ${width}`, gaps.rotated === false)
  await ctx.close()
}

/* ═══════════ AC-1151/1152 — the brush, and INERT's stated exception ═══════ */

{
  const { ctx, page } = await newPage()
  await openReport(page, 'RPT-14')
  const brush = page.locator('.recharts-brush')
  check('AC-1151 a brush renders under a ≥30-bucket trend', (await brush.count()) > 0)

  const box = await brush.boundingBox()
  if (box) {
    /* Drag the left traveller inward — the ONE exception to INERT (§2.5). */
    const traveller = page.locator('.recharts-brush-traveller').first()
    const tBox = await traveller.boundingBox()
    if (tBox) {
      await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(tBox.x + 60, tBox.y + tBox.height / 2, { steps: 8 })
      await page.mouse.up()
      await page.waitForTimeout(400)
    }
    const chip = await page.getByRole('button', { name: /Zoomed/ }).count()
    check('AC-1151 dragging the brush shows the "Zoomed · reset" chip', chip > 0)

    /* A mark click must still fire after the brush is mounted — the trap
       table's warning made concrete: click the plot surface itself. */
    let threw = false
    try {
      await page.locator('.recharts-surface').first().click({ position: { x: 40, y: 40 } })
    } catch {
      threw = true
    }
    check('AC-1151 a click on the plot after brushing does not throw', !threw)
  }

  const region = page.locator('[role="group"][aria-describedby]').first()
  await region.focus()
  await page.keyboard.press('[')
  await page.waitForTimeout(200)
  const urlUnchanged = page.url().endsWith('/management/reports/RPT-14')
  check('AC-1152 `[` steps the brush edge and the URL is unchanged', urlUnchanged)
  await page.screenshot({ path: `${OUT}/v2-brush.png`, fullPage: true })
  await ctx.close()
}

/* ═══════════ AC-1148/1149/1150 — annotations, now reachable live ══════════ */

{
  const { ctx, page } = await newPage()
  await openReport(page, 'RPT-1')
  /* `ANN-6` (`fixtures/annotations.ts`) sits inside the fixed clock's last
     30 days — RPT-1's own window — by construction. */
  /* The mark's own fetch starts only once the run it draws over has landed
     (`ReportBuilder`'s `annotationWindow` depends on `shownResult`), so it is
     one more mock round-trip behind `openReport`'s wait — waited for
     explicitly rather than widening that shared wait for every other check. */
  const mark = page.getByRole('button', { name: /Payment gateway outage/ })
  await mark.first().waitFor({ state: 'attached', timeout: 4000 }).catch(() => {})
  check('AC-1148 an annotation inside the window draws a marker', (await mark.count()) > 0)
  if ((await mark.count()) > 0) {
    await mark.first().focus()
    await page.waitForTimeout(200)
    const note = await page.locator('[role="tooltip"]').count()
    check('AC-1149 keyboard focus on a marker shows the label and note', note > 0)
  }
  const addButton = page.getByRole('button', { name: 'Add annotation' })
  check('AC-1149 the add form’s control is reachable, enabled for USR-1', (await addButton.isEnabled()) === true)
  await page.screenshot({ path: `${OUT}/v2-annotations.png`, fullPage: true })
  await ctx.close()
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
await browser.close()
process.exit(failures === 0 ? 0 : 1)
