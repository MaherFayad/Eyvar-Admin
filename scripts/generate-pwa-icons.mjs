/**
 * Rasterise the two icon SVGs in `public/icons/` into the PNG sizes a manifest
 * has to name.
 *
 * Run: `node scripts/generate-pwa-icons.mjs`
 *
 * The SVGs are the source of truth and are committed; the PNGs are committed
 * too, because a build must not depend on a browser being installed. This
 * script exists so that regenerating them after a brand change is one command
 * rather than a designer round-trip.
 *
 * It uses Playwright's Chromium, which is already a devDependency for the
 * verification suite — no image library is added to the tree for four files.
 */
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const icons = path.join(root, 'public', 'icons')

/** [source svg, output png, edge in px] */
const TARGETS = [
  ['icon-any.svg', 'icon-192.png', 192],
  ['icon-any.svg', 'icon-512.png', 512],
  ['icon-maskable.svg', 'icon-maskable-192.png', 192],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512],
  // iOS applies its own mask and never honours `purpose`, so the Apple icon is
  // the full-bleed one at Apple's canonical 180.
  ['icon-maskable.svg', 'apple-touch-icon-180.png', 180],
]

const browser = await chromium.launch()
try {
  for (const [source, output, size] of TARGETS) {
    const svg = readFileSync(path.join(icons, source), 'utf8')
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
    await page.setContent(
      `<!doctype html><style>html,body{margin:0;padding:0;background:transparent}
       svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    )
    writeFileSync(path.join(icons, output), await page.screenshot({ omitBackground: true }))
    await page.close()
    console.log(`${output}  ${size}x${size}`)
  }
} finally {
  await browser.close()
}
