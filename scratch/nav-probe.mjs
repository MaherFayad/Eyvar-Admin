import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
for (const r of ['/operations/overview', '/management/overview']) {
  await page.goto('http://localhost:4325' + r, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  console.log(r, await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[data-roving-item]')]
    const col = links[links.length - 1].parentElement
    const parts = []
    for (const kid of col.children) {
      if (kid.getAttribute('data-slot') === 'separator' || kid.tagName === 'HR' || kid.getAttribute('role') === 'none' || kid.className.includes('shrink-0 bg-border'))
        parts.push('────────')
      else parts.push(kid.textContent.trim().replace(/\s+/g, ' '))
    }
    return '\n  ' + parts.join('\n  ')
  }))
}
await browser.close()
