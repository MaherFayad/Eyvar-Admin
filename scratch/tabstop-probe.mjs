/**
 * Does the captain page's tab row have ONE tab stop, and is it reachable?
 *
 * jsdom reports `tabindex="-1"` on every Radix trigger, the selected one
 * included, because Radix resolves its roving tab stop through real focus
 * events. So the assertion §4B.10 asks for cannot be written as a unit test —
 * a test that passed only because the environment reports `-1` for everything
 * would go green on a row that is genuinely unreachable. This measures it in
 * Chromium instead.
 */
import { chromium } from 'playwright'

const URL = process.argv[2] ?? 'http://localhost:5199/entity/DRV-0201'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
const errs = []
p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))
await p.goto(URL, { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)

const row = p.locator('[role="tablist"]')
console.log('tablists on page:', await row.count())
if ((await row.count()) === 0) {
  console.log('body:', (await p.evaluate(() => document.body.innerText)).slice(0, 300).replace(/\n/g, ' | '))
  console.log('errors:', errs.slice(0, 3))
  await b.close()
  process.exit(0)
}

const snapshot = () =>
  p.evaluate(() =>
    [...document.querySelectorAll('[role="tab"]')].map((el) => ({
      label: el.textContent.trim().slice(0, 24),
      tabindex: el.getAttribute('tabindex'),
      selected: el.getAttribute('aria-selected'),
      focused: el === document.activeElement,
    })),
  )

console.log('\n1. AS RENDERED (no interaction)')
console.table(await snapshot())

/* Walk Tab from the top of the document and record where focus lands, so
   "one tab stop" is measured as traversal rather than inferred from markup. */
console.log('\n2. TAB TRAVERSAL FROM DOCUMENT START')
await p.evaluate(() => document.body.focus())
const path = []
let hitRow = 0
for (let i = 0; i < 60; i += 1) {
  await p.keyboard.press('Tab')
  const at = await p.evaluate(() => {
    const el = document.activeElement
    if (!el) return null
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role'),
      label: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 32),
    }
  })
  if (!at) break
  if (at.role === 'tab') { hitRow += 1; path.push(`${i}: >>> TAB ROW <<< ${at.label}`) }
  else if (path.length && hitRow) path.push(`${i}: ${at.tag}${at.role ? `[${at.role}]` : ''} ${at.label}`)
  if (hitRow && path.length > 0 && hitRow >= 1 && at.role !== 'tab' && path.length > 3) break
}
console.log(path.join('\n') || '(never reached a [role=tab])')
console.log(`stops that were a [role=tab]: ${hitRow}`)

console.log('\n3. ARROW KEYS FROM THE FOCUSED TRIGGER')
await p.locator('[role="tab"]').first().focus()
console.table(await snapshot())
await p.keyboard.press('ArrowRight')
await p.waitForTimeout(200)
console.table(await snapshot())

console.log('\npage errors:', errs.slice(0, 3))
await b.close()
