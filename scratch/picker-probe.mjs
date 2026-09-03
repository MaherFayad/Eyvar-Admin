import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
for (const r of ['/management/overview','/management/performance','/management/risk','/management/growth','/operations/overview','/support/fairness']) {
  await page.goto('http://localhost:4325' + r, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  console.log(r.padEnd(24), await page.evaluate(() => {
    const band = document.querySelector('section.bg-hero')
    if (!band) return 'no band'
    const btn = [...band.querySelectorAll('button')].find((b) => b.textContent.includes('–') || /Change the period/.test(b.textContent))
    const pill = band.querySelector('span.bg-hero-2')
    return 'picker=' + !!btn + ' staticPill=' + !!pill + ' | right col: ' +
      JSON.stringify([...(band.querySelectorAll('div.flex-col.items-end')[0]?.children ?? [])].map((e) => e.textContent.trim().slice(0, 30)))
  }))
}
await browser.close()
