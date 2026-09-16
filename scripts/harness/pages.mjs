/**
 * A page in view and edit mode, the add-block picker, a columns block at
 * each width, and the stack below `wide:` — the shapes jsdom cannot prove
 * (no SVG, no real CSS grid layout). D39/D46, WP-4.2…4.5.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

let failed = false
function check(name, condition, detail) {
  const mark = condition ? 'OK' : 'FAIL'
  console.log(`  [${mark}] ${name}${detail !== undefined ? ' — ' + detail : ''}`)
  if (!condition) failed = true
}

/* `DSH-1` is the fixture `dashboardToPage` keeps its id for — the same one
   `amp-dash.mjs` shoots at `/dashboards/DSH-1`, now migrated to a page. */
async function findAPageId() {
  return 'DSH-1'
}

async function shoot(name, { arabic = false, dark = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    ...(dark ? { colorScheme: 'dark' } : {}),
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

  const pageId = await findAPageId(page)
  if (!pageId) {
    console.log(name, 'NO PAGE FOUND — cannot proceed')
    await ctx.close()
    return
  }

  await page.goto(`${BASE}/management/reports/pages/${pageId}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  if (arabic) {
    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await page.waitForTimeout(800)
  }

  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/${name}-view.png`, fullPage: true })

  /* Edit mode. */
  const editLabel = arabic ? 'تعديل' : 'Edit'
  const editButton = page.getByRole('button', { name: editLabel })
  if (await editButton.count()) {
    await editButton.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${OUT}/${name}-edit.png`, fullPage: true })

    /* The add-block picker, opened from the first insertion affordance. */
    const addLabel = arabic ? 'إضافة كتلة' : 'Add block'
    const addButtons = page.getByRole('button', { name: addLabel })
    if (await addButtons.count()) {
      await addButtons.first().click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${OUT}/${name}-picker.png` })
      await page.keyboard.press('Escape')
    }
  }

  const facts = await page.evaluate(() => ({
    blockFrames: document.querySelectorAll('[data-block-id]').length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
  console.log(name, JSON.stringify(facts))
  if (errors.length) console.log(name, 'ERRORS', errors)
  await ctx.close()
}

async function shootColumnsAtWidths() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
  const page = await ctx.newPage()
  const pageId = await findAPageId(page)
  if (!pageId) {
    await ctx.close()
    return
  }
  await page.goto(`${BASE}/management/reports/pages/${pageId}`, { waitUntil: 'networkidle' })
  const editButton = page.getByRole('button', { name: 'Edit' })
  if (await editButton.count()) await editButton.click()
  await page.waitForTimeout(500)

  /* Insert a columns block via the first affordance, then step through each
     width option so R15's segmented control is captured at all six. */
  const addButtons = page.getByRole('button', { name: 'Add block' })
  if (await addButtons.count()) {
    await addButtons.first().click()
    await page.waitForTimeout(300)
    const columnsItem = page.getByText('Columns', { exact: true })
    if (await columnsItem.count()) {
      await columnsItem.first().click()
      await page.waitForTimeout(400)
      /* Only the FIRST column's control — the second column's own budget is
         what leaves some of these disabled while it still holds its
         6-twelfth default, which is the overflow rule working, not a bug. */
      for (const label of ['¼', '⅓', '½', '⅔', '¾', 'Full']) {
        const trigger = page.getByRole('tab', { name: label }).first()
        if ((await trigger.count()) && (await trigger.isEnabled())) {
          await trigger.click()
          await page.waitForTimeout(200)
          const file = { '¼': 'quarter', '⅓': 'third', '½': 'half', '⅔': 'two-thirds', '¾': 'three-quarters', Full: 'full' }[label]
          await page.screenshot({ path: `${OUT}/columns-width-${file}.png` })
        } else {
          console.log('columns width', label, 'disabled at this point — overflow rule, not attempted')
        }
      }
    }
  }
  await ctx.close()
}

/**
 * O1 rules `wide:` inclusive from 1280px, so 1280 is the two-up (side by
 * side) case and 1279 is the real stack. The old `columns-1280-stacked.png`
 * named the wrong one — the file below shows what it actually captures, and
 * `columns-1279-stacked` is the first committed proof of the real stack,
 * backed by a geometry check rather than a screenshot alone.
 */
async function shootStacking() {
  for (const [name, width] of [
    ['columns-1344-wide', 1344],
    ['columns-1280-two-up', 1280],
    ['columns-1279-stacked', 1279],
  ]) {
    const ctx = await browser.newContext({ viewport: { width, height: 1100 } })
    const page = await ctx.newPage()
    const pageId = await findAPageId(page)
    if (pageId) {
      await page.goto(`${BASE}/management/reports/pages/${pageId}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(800)
      await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })

      if (width === 1280 || width === 1279) {
        const rects = await page.evaluate(() => {
          const group = document.querySelector('[role="group"].grid-cols-12')
          if (!group || group.children.length < 2) return null
          return [...group.children].map((c) => {
            const r = c.getBoundingClientRect()
            return { top: Math.round(r.top), left: Math.round(r.left) }
          })
        })
        const stacked = rects !== null && rects[1].top > rects[0].top
        const expectStacked = width === 1279
        check(
          `${name} — DSH-1's columns block ${expectStacked ? 'stacks' : 'sits side by side'} at ${width}px`,
          rects !== null && stacked === expectStacked,
          JSON.stringify(rects),
        )
      }
    } else {
      check(`${name} — DSH-1 found`, false)
    }
    await ctx.close()
  }
}

await shoot('page-en-light')
await shoot('page-en-dark', { dark: true })
await shoot('page-ar-light', { arabic: true })
await shootColumnsAtWidths()
await shootStacking()

await browser.close()
if (failed) {
  console.log('\nFAILED — see [FAIL] lines above')
  process.exit(1)
}
console.log('\nOK')
