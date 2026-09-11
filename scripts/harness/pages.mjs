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

async function findAPageId(page) {
  await page.goto(BASE + '/management/reports?view=pages', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const href = await page.getAttribute('table a[href*="/management/reports/pages/"], a[href*="/management/reports/pages/"]', 'href')
  if (href) return href.split('/').pop()
  return null
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

  if (arabic) {
    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await page.waitForTimeout(600)
  }

  await page.goto(`${BASE}/management/reports/pages/${pageId}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
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
      for (const label of ['¼', '⅓', '½', '⅔', '¾', 'Full']) {
        const trigger = page.getByRole('tab', { name: label })
        if (await trigger.count()) {
          await trigger.first().click()
          await page.waitForTimeout(200)
          await page.screenshot({ path: `${OUT}/columns-width-${label.replace('¼', 'quarter').replace('⅓', 'third').replace('½', 'half').replace('⅔', 'two-thirds').replace('¾', 'three-quarters').replace('Full', 'full')}.png` })
        }
      }
    }
  }
  await ctx.close()
}

async function shootStacking() {
  for (const [name, width] of [['columns-1344-wide', 1344], ['columns-1280-stacked', 1280]]) {
    const ctx = await browser.newContext({ viewport: { width, height: 1100 } })
    const page = await ctx.newPage()
    const pageId = await findAPageId(page)
    if (pageId) {
      await page.goto(`${BASE}/management/reports/pages/${pageId}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(800)
      await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
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
