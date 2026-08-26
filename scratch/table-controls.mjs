/* Captures for docs/05-restructure/build/03-table-controls.md.
   Run against `vite preview` on :5199. */
import { chromium } from 'playwright'

const b = await chromium.launch()
const errors = []

async function open(width, { rtl = false, path = '/operations/people' } = {}) {
  const p = await b.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 })
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${width}${rtl ? ' rtl' : ''}: ${m.text()}`)
  })
  p.on('pageerror', (e) => errors.push(`${width}: ${e.message}`))
  await p.goto(`http://localhost:5199${path}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2200)
  if (rtl) {
    await p.getByRole('button', { name: /account|profile|EN|العربية/i }).first().click().catch(() => {})
    await p.evaluate(() => {
      localStorage.setItem('eyvar.ui.language', JSON.stringify('ar'))
    })
    await p.reload({ waitUntil: 'networkidle' })
    await p.waitForTimeout(2200)
  }
  return p
}

const shot = (p, name) => p.screenshot({ path: `./scratch/shots/${name}.png` })

/* 1 — resting card at 1440: caret at rest on every controllable header. */
{
  const p = await open(1440)
  await shot(p, 'tc-rest-1440')

  /* 2 — the header menu. */
  await p.getByRole('button', { name: /Column options for Status/ }).click()
  await p.waitForTimeout(350)
  await shot(p, 'tc-header-menu-1440')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(200)

  /* 3 — sort from the header, then the labelled toolbar control. */
  await p.getByRole('button', { name: /Column options for Trips/ }).click()
  await p.waitForTimeout(300)
  await p.getByRole('menuitemradio', { name: /Sort high to low/ }).click()
  await p.waitForTimeout(1200)
  await shot(p, 'tc-sorted-1440')

  /* 4 — pin two columns, then watch the third be refused. */
  for (const col of ['Status', 'City']) {
    await p.getByRole('button', { name: new RegExp(`Column options for ${col}`) }).click()
    await p.waitForTimeout(300)
    await p.getByRole('menuitem', { name: 'Pin column' }).click()
    await p.waitForTimeout(500)
  }
  await p.getByRole('button', { name: /Column options for Rating/ }).click()
  await p.waitForTimeout(350)
  await shot(p, 'tc-pin-refused-1440')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(200)

  /* 5 — scrolled, so the boundary hairline is live. */
  const scroller = p.locator('[data-slot=table-container]').first()
  await scroller.evaluate((el) => el.scrollBy({ left: 320 }))
  await p.waitForTimeout(400)
  await shot(p, 'tc-pinned-scrolled-1440')
  await p.close()
}

/* 6 — the six filter kinds at 1280. */
{
  const p = await open(1280)

  await p.getByRole('button', { name: /Column options for Status/ }).click()
  await p.waitForTimeout(300)
  await p.getByRole('menuitem', { name: 'Filter…' }).click()
  await p.waitForTimeout(400)
  await shot(p, 'tc-filter-multiselect-1280')
  await p.getByRole('checkbox', { name: 'Active' }).click()
  await p.waitForTimeout(900)
  await p.keyboard.press('Escape')
  await p.waitForTimeout(600)
  await shot(p, 'tc-filtered-header-and-chip-1280')

  await p.getByRole('button', { name: /Column options for Rating/ }).click()
  await p.waitForTimeout(300)
  await p.getByRole('menuitem', { name: 'Filter…' }).click()
  await p.waitForTimeout(400)
  await p.getByRole('textbox', { name: /Rating From/ }).fill('5')
  await p.getByRole('textbox', { name: /Rating To/ }).fill('4')
  await p.waitForTimeout(700)
  await shot(p, 'tc-filter-range-inverted-1280')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(300)

  await p.getByRole('button', { name: 'Add filter' }).last().click()
  await p.waitForTimeout(350)
  await shot(p, 'tc-add-filter-picker-1280')
  await p.getByRole('button', { name: 'Dispatch' }).click()
  await p.waitForTimeout(350)
  await shot(p, 'tc-filter-boolean-1280')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(300)

  await p.getByRole('button', { name: 'Columns' }).click()
  await p.waitForTimeout(350)
  await shot(p, 'tc-columns-popover-1280')
  await p.keyboard.press('Escape')
  await p.close()
}

/* 7 — the money range, on Riders. */
{
  const p = await open(1280, { path: '/operations/people?view=riders' })
  await p.getByRole('button', { name: /Column options for Wallet/ }).click()
  await p.waitForTimeout(300)
  await p.getByRole('menuitem', { name: 'Filter…' }).click()
  await p.waitForTimeout(400)
  await shot(p, 'tc-filter-money-1280')
  await p.close()
}

/* 8 — the queue: text filter + the R5a marker riding the pinned column. */
{
  const p = await open(1440, { path: '/operations/people?view=applications' })
  await shot(p, 'tc-queue-1440')
  const scroller = p.locator('[data-slot=table-container]').first()
  await scroller.evaluate((el) => el.scrollBy({ left: 400 }))
  await p.waitForTimeout(400)
  await shot(p, 'tc-queue-scrolled-1440')
  await p.close()
}

/* 9 — Arabic. */
{
  const p = await open(1280, { rtl: true })
  await shot(p, 'tc-rtl-1280')
  await p.getByRole('button', { name: /Column options for/ }).nth(2).click()
  await p.waitForTimeout(350)
  await shot(p, 'tc-rtl-menu-1280')
  await p.keyboard.press('Escape')
  const scroller = p.locator('[data-slot=table-container]').first()
  const offsets = await scroller.evaluate((el) => {
    el.scrollBy({ left: -300 })
    return { scrollLeft: el.scrollLeft, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
  })
  await p.waitForTimeout(400)
  await shot(p, 'tc-rtl-scrolled-1280')
  console.log('rtl scroll:', JSON.stringify(offsets))
  await p.close()
}

await b.close()
console.log(errors.length === 0 ? 'no console errors' : errors.join('\n'))
