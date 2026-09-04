/** All seven entries of the one shape menu, driven from the menu itself. */
import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
await page.goto('http://localhost:4327/management/reports/RPT-1', { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)

for (const shape of ['Bar chart', 'Pie chart', 'Data table', 'Retention', 'Funnel', 'Journeys', 'Line chart']) {
  await page.getByRole('combobox', { name: 'Chart type' }).click()
  const opt = page.getByRole('option', { name: new RegExp('^' + shape) })
  const disabled = await opt.getAttribute('aria-disabled')
  if (disabled === 'true') {
    console.log(shape.padEnd(11), 'DISABLED —', (await opt.textContent())?.slice(shape.length, shape.length + 70).trim())
    await page.keyboard.press('Escape')
    continue
  }
  await opt.click()
  await page.waitForTimeout(1800)
  const f = await page.evaluate(() => ({
    trigger: document.querySelector('#rb-viz')?.textContent?.trim(),
    plots: document.querySelectorAll('.recharts-surface').length,
    tables: document.querySelectorAll('table').length,
    /* the screenshot bug: one sentence printed twice */
    dupes: (() => {
      const t = [...document.querySelectorAll('p, li')].map((n) => n.textContent?.trim()).filter((s) => s && s.length > 40)
      const seen = new Set(); const dup = new Set()
      for (const s of t) { if (seen.has(s)) dup.add(s.slice(0, 50)); seen.add(s) }
      return [...dup]
    })(),
  }))
  console.log(shape.padEnd(11), JSON.stringify(f))
}
console.log('errors', errors.length ? errors : 0)
await browser.close()
