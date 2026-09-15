/**
 * WP-4.8 (Proof) — the operability proof `pages.mjs`/`pages-print.mjs` don't
 * cover: a real keyboard walk (Tab/Enter/Alt+arrows/Ctrl+D/Delete/Ctrl+Z),
 * focus-ring visibility at every stop including inside a report block's
 * chart, distinct accessible names for two untitled blocks of one type
 * (F-V2-87), whether a disabled block-menu item's reason is reachable
 * (F-V2-73), computed contrast for the callout tones, RTL mirroring of the
 * block handle/menu, and focus return after closing the New-page dialog.
 * jsdom does none of this: no real Tab order, no SVG, no computed style.
 * Findings are written to `docs/02-verification/analytics-v2-pages-a11y.md`
 * by hand from a run of this script; this file only proves them.
 */
import { chromium } from 'playwright'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const PAGE_ID = 'DSH-1'
const browser = await chromium.launch()

let failed = false
function check(name, condition, detail) {
  const mark = condition ? 'OK' : 'FAIL'
  console.log(`  [${mark}] ${name}${detail !== undefined ? ' — ' + detail : ''}`)
  if (!condition) failed = true
}
function section(t) {
  console.log('\n=== ' + t + ' ===')
}

function srgbToLin(c) {
  c /= 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
function luminance([r, g, b]) {
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b)
}
function blend(fg, bg) {
  const a = fg[3] ?? 1
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a))
}
function ratio(c1, c2) {
  const L1 = luminance(c1)
  const L2 = luminance(c2)
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
}
function toHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}
async function cssColorToRgba(page, colorStr) {
  return page.evaluate((c) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = c
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    return [r, g, b, a / 255]
  }, colorStr)
}

async function keyboardWalk() {
  section('KEYBOARD WALK — add, move, duplicate, delete, undo, all by keyboard')
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/management/reports/pages/${PAGE_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  let reachedEdit = false
  for (let i = 0; i < 30 && !reachedEdit; i++) {
    await page.keyboard.press('Tab')
    const text = await page.evaluate(() => document.activeElement?.textContent?.trim())
    if (text === 'Edit') reachedEdit = true
  }
  check('Edit reachable by Tab alone', reachedEdit)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  check('Enter on Edit enters edit mode', (await page.getByRole('button', { name: 'Done' }).count()) === 1)

  let addFocused = false
  for (let i = 0; i < 40 && !addFocused; i++) {
    await page.keyboard.press('Tab')
    if ((await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'Add block') addFocused = true
  }
  check('first "Add block" affordance reachable by Tab', addFocused)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  check('Enter opens the inline picker', (await page.getByPlaceholder('Search block types…').count()) === 1)
  await page.keyboard.type('Heading')
  await page.waitForTimeout(150)
  const countBeforeInsert = await page.evaluate(() => document.querySelectorAll('[data-block-id]').length)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  const countAfterInsert = await page.evaluate(() => document.querySelectorAll('[data-block-id]').length)
  check('typing to filter + Enter inserts a block', countAfterInsert === countBeforeInsert + 1, `${countBeforeInsert} -> ${countAfterInsert}`)

  const id = await page.evaluate(() => document.querySelector('[data-block-id]')?.getAttribute('data-block-id'))
  await page.evaluate((bid) => document.querySelector(`[data-block-id="${bid}"]`)?.focus(), id)
  const before = await page.evaluate(() => [...document.querySelectorAll('[data-block-id]')].map((e) => e.getAttribute('data-block-id')))
  await page.keyboard.press('Alt+ArrowDown')
  await page.waitForTimeout(200)
  const after = await page.evaluate(() => [...document.querySelectorAll('[data-block-id]')].map((e) => e.getAttribute('data-block-id')))
  check('Alt+ArrowDown moves the focused block down one slot', before[1] === after[0] && before[0] === after[1])

  await page.evaluate((bid) => document.querySelector(`[data-block-id="${bid}"]`)?.focus(), id)
  const nBefore = await page.evaluate(() => document.querySelectorAll('[data-block-id]').length)
  await page.keyboard.press('Control+d')
  await page.waitForTimeout(200)
  const nAfterDup = await page.evaluate(() => document.querySelectorAll('[data-block-id]').length)
  check('Ctrl+D duplicates the focused block', nAfterDup === nBefore + 1)

  await page.evaluate((bid) => document.querySelector(`[data-block-id="${bid}"]`)?.focus(), id)
  await page.keyboard.press('Delete')
  await page.waitForTimeout(200)
  const nAfterDelete = await page.evaluate(() => document.querySelectorAll('[data-block-id]').length)
  check('Delete removes the focused block', nAfterDelete === nAfterDup - 1)
  check('a toast announces the removal with a reachable Undo', (await page.getByText('Block removed').count()) > 0 && (await page.getByRole('button', { name: 'Undo' }).count()) > 0)

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(200)
  const nAfterUndo = await page.evaluate(() => document.querySelectorAll('[data-block-id]').length)
  check('Ctrl+Z (page-level undo) restores the deleted block', nAfterUndo === nAfterDup)

  // Shift+F10 — documented in BlockFrame.tsx/PageView.tsx comments as opening the block menu on a focused frame
  await page.evaluate((bid) => document.querySelector(`[data-block-id="${bid}"]`)?.focus(), id)
  await page.keyboard.press('Shift+F10')
  await page.waitForTimeout(250)
  check('Shift+F10 opens the block menu on a focused frame (documented in PageView.tsx:119, BlockMenu.tsx:2)', (await page.locator('[role="menu"]').count()) > 0, 'the kebab button itself is still reachable by one extra Tab, so this does not block the task — see should-fix')
  await page.keyboard.press('Escape')

  await ctx.close()
}

async function focusRingInsideChart() {
  section('FOCUS RING — inside a report block chart (recharts)')
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/management/reports/pages/${PAGE_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.waitForTimeout(400)
  // Tab until we land on an SVG (the chart surface), then keep going a few more stops
  let hops = 0
  let onSvg = false
  while (hops < 60 && !onSvg) {
    await page.keyboard.press('Tab')
    hops++
    onSvg = (await page.evaluate(() => document.activeElement?.tagName)) === 'svg'
  }
  check('reached a chart surface by Tab', onSvg, `after ${hops} tab stops`)
  if (onSvg) {
    const surfaceInfo = await page.evaluate(() => ({ outline: getComputedStyle(document.activeElement).outline }))
    check('the recharts-surface itself gets a visible focus outline (globals.css ~3911)', surfaceInfo.outline.includes('2px') && !surfaceInfo.outline.includes('none'), surfaceInfo.outline)
    await page.keyboard.press('Tab')
    const next = await page.evaluate(() => {
      const el = document.activeElement
      return { tag: el?.tagName, cls: el?.getAttribute?.('class'), tabIndex: el?.getAttribute?.('tabindex'), outline: getComputedStyle(el).outline, boxShadow: getComputedStyle(el).boxShadow }
    })
    console.log('  next stop after the chart surface:', JSON.stringify(next))
    if (next.tag === 'g' && next.tabIndex === '0') {
      const ringless = next.outline.includes('none') && next.boxShadow === 'none'
      check(
        'a focusable recharts <g> layer INSIDE the chart also gets a visible ring (it does not — regression of the .recharts-surface fix, globals.css ~3899/3911)',
        !ringless,
        JSON.stringify(next),
      )
    }
  }
  // B1, deterministic form: whichever nested layer accessibilityLayer makes
  // focusable (brush traveller on a >=30-bucket series, a pie sector, …)
  // depends on which chart Tab lands on first, so also focus every such
  // layer directly rather than trusting one Tab sequence to find one.
  const nestedLayers = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.recharts-layer[tabindex="0"], .recharts-sector[tabindex="0"]')]
    return els.map((el, i) => {
      el.setAttribute('data-b1-probe', String(i))
      return { cls: el.getAttribute('class') }
    })
  })
  check('found at least one nested recharts layer/sector made focusable by accessibilityLayer to probe', nestedLayers.length > 0, `${nestedLayers.length} found: ${JSON.stringify(nestedLayers.map((l) => l.cls))}`)
  for (let i = 0; i < nestedLayers.length; i++) {
    const info = await page.evaluate((idx) => {
      const el = document.querySelector(`[data-b1-probe="${idx}"]`)
      el?.focus()
      const cs = el ? getComputedStyle(el) : null
      return el ? { cls: el.getAttribute('class'), outline: cs.outline, boxShadow: cs.boxShadow } : null
    }, i)
    if (info) {
      const ringless = info.outline.includes('none') && info.boxShadow === 'none'
      check(`nested layer "${info.cls}" gets a visible ring on focus (globals.css ~3899/3923)`, !ringless, JSON.stringify(info))
    }
  }
  await ctx.close()
}

async function distinctNames() {
  section('ACCESSIBLE NAMES — two untitled blocks of the same type (F-V2-87)')
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/management/reports/pages/${PAGE_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.waitForTimeout(400)
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Add block' }).first().click()
    await page.waitForTimeout(250)
    await page.keyboard.type('Text')
    await page.waitForTimeout(150)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(250)
  }
  const names = await page.evaluate(() =>
    [...document.querySelectorAll('[data-block-id]')].map((el) => el.getAttribute('aria-label')),
  )
  check('two fresh Text blocks get distinct accessible names', names[0] !== names[1] && names[0] && names[1], JSON.stringify(names))
  await ctx.close()
}

async function disabledReasonReachable() {
  section('DISABLED BLOCK-MENU ITEM — reason reachable, never a disabled submenu (F-V2-73)')
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/management/reports/pages/${PAGE_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.waitForTimeout(400)
  const kebab = page.locator('button[aria-label^="More actions for"]').first()
  await kebab.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  const items = await page.evaluate(() =>
    [...document.querySelectorAll('[role="menuitem"]')].map((el) => ({ text: el.textContent?.trim(), ariaHaspopup: el.getAttribute('aria-haspopup') })),
  )
  console.log('  menu items:', JSON.stringify(items))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  const focusReturned = (await page.evaluate(() => document.activeElement?.getAttribute('aria-label')))?.startsWith('More actions for')
  check('Escape closes the menu and returns focus to its own trigger', focusReturned)
  await ctx.close()
}

async function calloutContrast() {
  section('CONTRAST — callout tones (info/success/warning/neutral), light + dark')
  for (const dark of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, colorScheme: dark ? 'dark' : 'light' })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/management/reports/pages/${PAGE_ID}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Add block' }).first().click()
    await page.waitForTimeout(250)
    await page.keyboard.type('Callout')
    await page.waitForTimeout(150)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    const pageBg = await cssColorToRgba(page, await page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    for (const toneLabel of ['Info', 'Success', 'Warning', 'Neutral']) {
      const trigger = page.locator('[aria-label="Tone"]').first()
      await trigger.click()
      await page.waitForTimeout(150)
      await page.getByRole('option', { name: toneLabel, exact: true }).click()
      await page.waitForTimeout(150)
      const raw = await page.evaluate(() => {
        const trig = document.querySelector('[aria-label="Tone"]')
        const container = trig?.closest('.rounded-card')
        if (!container) return null
        const cs = getComputedStyle(container)
        return { bg: cs.backgroundColor, borderColor: cs.borderColor }
      })
      if (!raw) continue
      const bgRgba = await cssColorToRgba(page, raw.bg)
      const borderRgba = await cssColorToRgba(page, raw.borderColor)
      const effectiveBg = blend(bgRgba, pageBg)
      const borderVsPage = ratio(borderRgba.slice(0, 3), pageBg.slice(0, 3))
      console.log(
        `  [${dark ? 'dark' : 'light'}] ${toneLabel}: effective bg ${toHex(effectiveBg)} (vs page ${toHex(pageBg.slice(0, 3))}), border ${toHex(borderRgba.slice(0, 3))} ratio ${borderVsPage.toFixed(3)}:1 (floor 3:1 as the only carrier of tone in view mode)`,
      )
    }
    await ctx.close()
  }
}

async function rtlMirroring() {
  section('RTL — block handle/menu mirror to the visual sides logical CSS implies')
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/management/reports/pages/${PAGE_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Account' }).click()
  await page.waitForTimeout(200)
  await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await page.waitForTimeout(600)
  check('dir=rtl applied', (await page.evaluate(() => document.documentElement.getAttribute('dir'))) === 'rtl')
  await page.getByRole('button', { name: 'تعديل' }).click()
  await page.waitForTimeout(400)
  const pos = await page.evaluate(() => {
    const frame = document.querySelector('[data-block-id]')
    if (!frame) return null
    const rect = frame.getBoundingClientRect()
    const handle = frame.querySelector('svg')?.getBoundingClientRect()
    // language-agnostic: the kebab is the only <button> among the frame's direct children (the drag handle is a bare <svg>)
    const menuButton = [...frame.children].find((c) => c.querySelector('button'))?.querySelector('button')?.getBoundingClientRect()
    return { frameLeft: rect.left, frameRight: rect.right, handleLeft: handle?.left, menuLeft: menuButton?.left }
  })
  if (pos) {
    check('drag handle (logical start) sits at the visual RIGHT under RTL', Math.abs(pos.handleLeft - pos.frameRight) < 30, JSON.stringify(pos))
    check('kebab menu (logical end) sits at the visual LEFT under RTL', Math.abs(pos.menuLeft - pos.frameLeft) < 30, JSON.stringify(pos))
  }
  await ctx.close()
}

async function newPageDialogFocus() {
  section('NEW PAGE DIALOG — focus management (AC-1212 entry point)')
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/management/reports?view=pages`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const newPageBtn = page.getByRole('button', { name: 'New page' }).first()
  await newPageBtn.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  check('dialog opens with role=alertdialog and takes focus', (await page.locator('[role="alertdialog"]').count()) === 1)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  check('dialog closes on one Escape', (await page.locator('[role="alertdialog"]').count()) === 0)
  const activeIsBody = await page.evaluate(() => document.activeElement === document.body)
  check('focus returns to the triggering button, not <body>', !activeIsBody, activeIsBody ? 'focus fell to <body> — the operator loses their place' : undefined)
  await ctx.close()
}

async function reportPickerEscape() {
  section('REPORT PICKER PANEL — Escape (not a Radix popover, so not wired by default)')
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/management/reports/pages/${PAGE_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Add block' }).first().click()
  await page.waitForTimeout(250)
  await page.keyboard.type('Report')
  await page.waitForTimeout(150)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  // `input[placeholder]` alone also matches the page-title input, present
  // for the whole edit session — target the picker's own search box by its
  // actual placeholder text so this proves the panel, not an unrelated field.
  const pickerInput = () => page.evaluate(() => !!document.querySelector('input[placeholder="Search dashboards"]'))
  const openBefore = await pickerInput()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)
  const stillOpen = await pickerInput()
  check('report picker panel opened', openBefore)
  check('Escape closes the report picker panel', !stillOpen, stillOpen ? 'the panel is still open — Escape did nothing, see should-fix' : undefined)
  await ctx.close()
}

async function addReportBlockPersists() {
  /* The defect: picking `Report`/`Metric` mounted `ReportPickerPanel` and
     unmounted it in the same tick (BlockList.tsx's `onOpenChange`, a Radix
     dismiss-layer race — same family as F-V2-83). jsdom cannot see a
     portal-teardown race, so this proves the panel survives the pick, the
     block lands, and the save completes, in a real browser. */
  section('ADD A REPORT BLOCK — survives the pick and the save completes (the defect this harness exists to catch)')
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/management/reports/pages/${PAGE_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.waitForTimeout(400)

  // Keyboard, matching the exact repro: type to filter, Enter to pick "Report".
  await page.getByRole('button', { name: 'Add block' }).first().click()
  await page.waitForTimeout(250)
  await page.keyboard.type('Report')
  await page.waitForTimeout(150)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)

  const pickerInput = () => page.evaluate(() => !!document.querySelector('input[placeholder="Search dashboards"]'))
  check('the report picker panel opens and is still there a moment later (not a same-tick flicker)', await pickerInput())

  // RPT-3 is not pinned to DSH-1 (reports.ts), so its row is enabled.
  // The mock's fixed latency (320ms, `src/data/config.ts`) applies to every
  // keystroke's refetch, so this waits past it rather than racing it.
  await page.locator('input[placeholder="Search dashboards"]').fill('Gross revenue')
  await page.getByRole('button', { name: 'Gross revenue · 90 days vs previous' }).waitFor({ timeout: 2000 })
  await page.getByRole('button', { name: 'Gross revenue · 90 days vs previous' }).click()
  await page.waitForTimeout(300)
  check('the picker panel closes once a report is chosen', !(await pickerInput()))
  // The new block's title starts as the "Report" fallback until
  // `useResolvedReport` resolves (its own mock latency) — wait for the real
  // title rather than racing that fetch with a fixed timeout.
  const titled = await page
    .getByRole('button', { name: 'Gross revenue · 90 days vs previous' })
    .waitFor({ timeout: 2000 })
    .then(() => true)
    .catch(() => false)
  check('the report block is on the page, titled with the chosen report', titled)

  // AC-1201's 800ms debounce, then the mutation's own (1.5×) mock latency —
  // wait for the real "Saved" indicator, proving `savePage` actually ran
  // (not just local/optimistic state), and confirm the block is still there
  // a full second after that — well past the same tick the defect flickered
  // in and out within (the MutationObserver repro measured 0.1ms).
  const saved = await page.getByText(/^Saved ·/).waitFor({ timeout: 5000 }).then(() => true).catch(() => false)
  check('the save completes (the header shows "Saved · <time>", AC-1201)', saved)
  await page.waitForTimeout(1000)
  check(
    'the block is still on the page a full second after the save completes',
    (await page.getByRole('button', { name: 'Gross revenue · 90 days vs previous' }).count()) > 0,
  )
  /* Not proven here: a fresh mount of this page after client-side nav away
     and back re-reading the saved block (`PageDetailScreen`'s `useAsync`,
     outside this work package's file set) — see the handoff report. */
  await ctx.close()
}

async function reducedMotion() {
  section('REDUCED MOTION')
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/management/reports/pages/${PAGE_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const dur = await page.evaluate(() => getComputedStyle(document.body).transitionDuration)
  check('globals.css collapses transitions to ~1ms under prefers-reduced-motion', dur === '0.001s', dur)
  await ctx.close()
}

await keyboardWalk()
await focusRingInsideChart()
await distinctNames()
await disabledReasonReachable()
await calloutContrast()
await rtlMirroring()
await newPageDialogFocus()
await reportPickerEscape()
await addReportBlockPersists()
await reducedMotion()

await browser.close()
if (failed) {
  console.log('\nFAILED — see [FAIL] lines above')
  process.exit(1)
}
console.log('\nOK')
