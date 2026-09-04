import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1400 } })
await p.goto('http://localhost:5199/entity/DRV-0101?view=documents', { waitUntil: 'networkidle' })
await p.waitForTimeout(2200)
const rows = p.locator('[role="tabpanel"] button[aria-expanded]')
const n = await rows.count()
console.log('document rows:', n)
for (let i = 0; i < n; i += 1) {
  await rows.nth(i).click()
  await p.waitForTimeout(1600)
  const info = await p.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter(i => i.src.startsWith('blob:'))
      .map(i => ({ nat: `${i.naturalWidth}x${i.naturalHeight}`, box: `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`, alt: i.alt }))
    const panel = document.querySelector('[role="tabpanel"] [data-state="open"][role="region"], [role="tabpanel"] [data-state="open"]')
    const ctrls = [...document.querySelectorAll('[role="tabpanel"] a, [role="tabpanel"] button')]
      .map(e => e.textContent.trim()).filter(t => /scan|download|try again/i.test(t))
    return { imgs, ctrls, text: panel ? panel.innerText.replace(/\n+/g, ' | ').slice(0, 170) : '' }
  })
  console.log(`\nrow ${i}: ${info.text}`)
  console.log(`  controls: ${info.ctrls.join(' · ') || '(none)'}   blob imgs: ${JSON.stringify(info.imgs)}`)
  if (info.imgs.length) await p.screenshot({ path: `scratch/scan-row${i}.png`, clip: { x: 110, y: 320, width: 1330, height: 480 } })
  await rows.nth(i).click(); await p.waitForTimeout(400)
}
await b.close()
