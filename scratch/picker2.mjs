import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
for (const r of ['/management/overview', '/operations/overview']) {
  await page.goto('http://localhost:4325' + r, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: /Change the period/ }).click()
  await page.waitForTimeout(500)
  console.log(r, await page.evaluate(() => {
    const group = document.querySelector('[role="group"][aria-label="Periods"]')
    return JSON.stringify([...group.children].map((b) => {
      const check = b.querySelector('svg')
      return b.textContent.trim() + (check && check.classList.contains('visible') ? ' [x]' : '')
    }))
  }))
  await page.keyboard.press('Escape')
}
await browser.close()
