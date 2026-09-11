/**
 * AC-1159 — jsdom has no canvas, so `renderChartPng` (`src/lib/chartPng.ts`)
 * is proven here: a real download, its PNG dimensions, and its `tEXt` chunk
 * (an OCR-free proxy for the caption band, per the design doc's own note).
 * Reads `HARNESS_BASE`, default `http://localhost:4343`.
 *
 *   npx vite --port 4343 &&  node scripts/harness/reports-export-png.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync, readFileSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4343'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

let failures = 0
function check(label, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL'
  if (!ok) failures += 1
  console.log(`${mark}  ${label}${detail ? '  — ' + detail : ''}`)
}

/** IHDR width/height — the first chunk after the 8-byte signature. */
function pngDimensions(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) }
}

/** The `tEXt` chunk's keyword/text, or `null` if the keyword is absent. */
function readTextChunk(bytes, keyword) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 8
  while (offset < bytes.length) {
    const length = view.getUint32(offset, false)
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    const data = bytes.subarray(offset + 8, offset + 8 + length)
    if (type === 'tEXt') {
      const zero = data.indexOf(0)
      if (String.fromCharCode(...data.subarray(0, zero)) === keyword) {
        return String.fromCharCode(...data.subarray(zero + 1))
      }
    }
    if (type === 'IEND') return null
    offset += 4 + 4 + length + 4
  }
  return null
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))

/* RPT-1 — the owner's standing question, a line chart over ≥30 buckets. */
await page.goto(`${BASE}/management/reports/RPT-1`, { waitUntil: 'load' })
await page.waitForTimeout(2200)

await page.getByRole('button', { name: 'More actions' }).click()
await page.getByRole('menuitem', { name: 'Export' }).click()

const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('menuitem', { name: 'Export PNG' }).click(),
])

const savedPath = `${OUT}/export-RPT-1.png`
await download.saveAs(savedPath)
const bytes = new Uint8Array(readFileSync(savedPath))

check('is a PNG (signature)', bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)

const { width, height } = pngDimensions(bytes)
console.log(`dimensions: ${width} × ${height}`)
check('has a real width', width > 0)
/* At 2×, the caption band (title + window + meta + filters + asOf + url,
   each 18px, plus 32px of padding) adds well over 200px beyond the bare
   chart — the two are distinguishable without re-deriving the exact sum. */
check('caption band adds real height beyond the bare chart', height > width * 0.3)

const query = readTextChunk(bytes, 'eyvar:query')
check('tEXt chunk carries the query', query !== null && query.length > 0, query ? `${query.length} chars` : '')

check('no console error during export', errors.length === 0, errors[0])

await ctx.close()
await browser.close()

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
