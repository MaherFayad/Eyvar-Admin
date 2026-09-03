/**
 * Rasterise the PWA icons from the two SVGs that define them, so the PNGs can
 * never drift from the vector the app actually renders. Run after any edit to
 * `public/icons/*.svg`:  node scratch/render-icons.mjs
 */
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'

const JOBS = [
  ['public/icons/icon-any.svg', 'public/icons/icon-192.png', 192],
  ['public/icons/icon-any.svg', 'public/icons/icon-512.png', 512],
  ['public/icons/icon-any.svg', 'public/icons/apple-touch-icon-180.png', 180],
  ['public/icons/icon-maskable.svg', 'public/icons/icon-maskable-192.png', 192],
  ['public/icons/icon-maskable.svg', 'public/icons/icon-maskable-512.png', 512],
]

const browser = await chromium.launch()
for (const [src, out, size] of JOBS) {
  const svg = readFileSync(src, 'utf8')
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  )
  writeFileSync(out, await page.locator('svg').screenshot({ omitBackground: true }))
  await page.close()
  console.log(`${out}  ${size}x${size}`)
}
await browser.close()
