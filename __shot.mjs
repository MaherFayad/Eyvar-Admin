import { chromium } from 'playwright'
const OUT = process.argv[2]
const URL = process.argv[3]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)) })
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(2500)
await page.screenshot({ path: OUT, fullPage: false })
const body = await page.evaluate(() => document.body.innerText)
const marked = (body.match(/⟦/g) || []).length
console.log('URL       ', URL)
console.log('title     ', await page.title())
console.log('html dir  ', await page.getAttribute('html', 'dir'), 'lang', await page.getAttribute('html', 'lang'))
console.log('⟦ marks   ', marked)
console.log('--- first 1400 chars of visible text ---')
console.log(body.slice(0, 1400))
if (errors.length) console.log('--- page errors ---\n' + errors.slice(0, 5).join('\n'))
await browser.close()
