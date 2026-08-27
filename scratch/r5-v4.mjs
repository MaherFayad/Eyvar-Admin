/**
 * **V-4, exercised rather than inferred.**
 *
 * The attribute being present is not the finding. The finding was that under
 * `dir="rtl"` an OVERFLOWING Latin row label was ellipsised at its **head** -
 * `Abdulaziz Al-Suwailem` became a tail nobody can identify - because the
 * truncating box carried the page's direction while the isolated run inside
 * carried its own.
 *
 * No seeded name overflows a 428px card, so the attribute is untested by the
 * fixture. This forces the case: replace a row label's text with a name long
 * enough to overflow, then ask which END survives.
 *
 * The observable: a Range over the FIRST character of the label. If its box
 * sits inside the visible box, the first character is on screen and the
 * ellipsis is at the tail - correct. If it sits outside, the head was eaten.
 * Run for both label kinds, because the ruling is that they differ.
 */
import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:5433'
const LONG = 'Abdulaziz Al-Suwailem Al-Qahtani Al-Mutairi Abdullah'

const FORCE = (long) => {
  const out = []
  for (const box of document.querySelectorAll('ul[aria-labelledby] span.flex-1')) {
    const isEntity = box.getAttribute('dir') === 'auto'
    const run = box.querySelector('bdi') ?? box
    run.textContent = long
    const overflowing = box.scrollWidth > box.clientWidth + 1
    if (!overflowing) { out.push({ kind: isEntity ? 'text (entity)' : 'key (copy)', note: 'did not overflow' }); continue }
    const r = document.createRange()
    const text = run.firstChild
    r.setStart(text, 0)
    r.setEnd(text, 1)
    const first = r.getBoundingClientRect()
    const vis = box.getBoundingClientRect()
    out.push({
      kind: isEntity ? 'text (entity)' : 'key (copy)',
      dir: box.getAttribute('dir'),
      computed: getComputedStyle(box).direction,
      firstCharVisible: first.left >= vis.left - 1 && first.right <= vis.right + 1,
      firstCharX: Math.round(first.left),
      boxLeft: Math.round(vis.left),
      boxRight: Math.round(vis.right),
    })
    if (out.length >= 2) break
  }
  return out
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } })
await page.goto(`${BASE}/management/overview`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Account' }).click()
await page.waitForTimeout(300)
await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
await page.waitForFunction(() => document.documentElement.dir === 'rtl', null, { timeout: 5000 })
await page.keyboard.press('Escape')
await page.waitForTimeout(600)

for (const route of ['/management/risk', '/admin/overview', '/operations/overview']) {
  await page.evaluate((r) => {
    window.history.pushState({}, '', r)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, route)
  await page.waitForTimeout(1500)
  const dir = await page.evaluate(() => document.documentElement.dir)
  const rows = await page.evaluate(FORCE, LONG)
  console.log(`\n${route}  page dir=${dir}`)
  for (const r of rows) console.log('  ', JSON.stringify(r))
}
await browser.close()
