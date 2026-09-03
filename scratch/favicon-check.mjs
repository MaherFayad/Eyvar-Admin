import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
const svg = readFileSync('public/favicon.svg', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 300, height: 90 }, deviceScaleFactor: 4 })
await page.setContent(
  `<style>html,body{margin:0;background:#fff;display:flex;gap:18px;align-items:center;padding:16px}
   .a svg{width:16px;height:16px}.b svg{width:24px;height:24px}.c svg{width:32px;height:32px}.d svg{width:48px;height:48px}</style>
   <div class="a">${svg}</div><div class="b">${svg}</div><div class="c">${svg}</div><div class="d">${svg}</div>`,
)
writeFileSync('scratch/favicon-sizes.png', await page.screenshot())
await browser.close()
console.log('ok')
