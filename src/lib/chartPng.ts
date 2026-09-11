/**
 * A chart's `<svg>` → a PNG on disk (G16, `02-report-builder-v2.md` §9): drawn
 * at 2× with a caption band (title, window, grain, comparison, filters,
 * `asOf`, page URL) and the same text in a `tEXt` chunk, so the file traces
 * back to what produced it. jsdom has no canvas; the rasterising half is
 * proven in `scripts/harness/`, the byte-level chunk work in `chartPng.test.ts`.
 */

/** Every field the caption band states, left to right. */
export interface ChartPngCaption {
  title: string
  window: string
  grain: string
  comparison: string
  filters: readonly string[]
  asOf: string
  pageUrl: string
}

export interface RenderChartPngOptions {
  /** The chart's own SVG — cloned, never mutated. */
  svg: SVGSVGElement
  caption: ChartPngCaption
  /** `serialiseReportQuery(query)` — already base64url, so it is Latin-1 safe for `tEXt`. */
  query: string
  /** Amplitude parity is 2×; exposed for a harness that wants a smaller image. */
  scale?: number
}

const DEFAULT_SCALE = 2
const CAPTION_PAD = 16
const CAPTION_LINE_H = 18
/** PNG `tEXt` keyword. Namespaced so it never collides with a viewer's own metadata. */
const QUERY_KEYWORD = 'eyvar:query'

/** The caption band's lines, in draw order — title bold, the rest muted. */
function captionLines(caption: ChartPngCaption): string[] {
  const lines = [caption.title, caption.window]
  const meta = [caption.grain, caption.comparison].filter((part) => part !== '')
  if (meta.length > 0) lines.push(meta.join(' · '))
  if (caption.filters.length > 0) lines.push(caption.filters.join(' · '))
  lines.push(caption.asOf)
  lines.push(caption.pageUrl)
  return lines
}

/** The chart's SVG, rasterised into a same-size `<img>` via an object URL. */
function svgToImage(svg: SVGSVGElement, width: number, height: number): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const markup = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }))
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('chartPng: the chart svg failed to rasterise'))
    }
    image.src = url
  })
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('chartPng: the canvas produced no image'))
    }, 'image/png')
  })
}

/**
 * The chart plus its caption band, at `scale`× — with the caption's text also
 * carried in the file's `tEXt` chunk. §9's "traceable back to what produced
 * it" is this function's whole job; the visible band is for a human, the
 * chunk is for whoever finds the file later with no chat thread attached.
 */
export async function renderChartPng(options: RenderChartPngOptions): Promise<Blob> {
  const { svg, caption, query, scale = DEFAULT_SCALE } = options
  const rect = svg.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))

  const lines = captionLines(caption)
  const captionHeight = CAPTION_PAD * 2 + lines.length * CAPTION_LINE_H

  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = (height + captionHeight) * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('chartPng: no 2d context')
  ctx.scale(scale, scale)

  /* Tokens, read live rather than hard-coded, so the export matches whichever
     theme is on screen (D7 — the token layer is the visual authority). */
  const root = getComputedStyle(document.documentElement)
  const background = root.getPropertyValue('--background').trim()
  const ink = root.getPropertyValue('--foreground').trim()
  const muted = root.getPropertyValue('--muted-foreground').trim()

  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height + captionHeight)

  const chart = await svgToImage(svg, width, height)
  ctx.drawImage(chart, 0, 0, width, height)

  ctx.textBaseline = 'top'
  let y = height + CAPTION_PAD
  ctx.fillStyle = ink
  ctx.font = '600 13px Inter, "Noto Sans Arabic", sans-serif'
  ctx.fillText(lines[0], CAPTION_PAD, y)
  y += CAPTION_LINE_H
  ctx.fillStyle = muted
  ctx.font = '400 12px Inter, "Noto Sans Arabic", sans-serif'
  for (const line of lines.slice(1)) {
    ctx.fillText(line, CAPTION_PAD, y)
    y += CAPTION_LINE_H
  }

  const pngBlob = await canvasToPngBlob(canvas)
  const bytes = new Uint8Array(await pngBlob.arrayBuffer())
  return new Blob([insertTextChunk(bytes, QUERY_KEYWORD, query)], { type: 'image/png' })
}

/**
 * Hand the file to the browser — the same blob/object-URL/revoke shape
 * `csv.ts`'s `downloadCsv` uses, so both exports behave identically to the
 * operator and neither one leaks the object URL for the life of the tab.
 */
export function downloadPng(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/* ─────────────────────────── PNG chunk bytes ────────────────────────────
   Below this line is pure byte manipulation — no DOM, no canvas — so it runs
   and is asserted in `chartPng.test.ts` without a browser. */

const CRC_TABLE = buildCrcTable()

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
}

/** CRC-32 over a byte run — the PNG spec's own checksum, per chunk. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** A `tEXt` chunk's keyword and text are Latin-1 (ISO 8859-1) by spec. */
function latin1Bytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i) & 0xff
  }
  return bytes
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function findIendOffset(png: Uint8Array): number {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  let offset = 8 /* the 8-byte PNG signature */
  while (offset < png.length) {
    const length = view.getUint32(offset, false)
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8))
    if (type === 'IEND') return offset
    offset += 4 + 4 + length + 4 /* length + type + data + crc */
  }
  throw new Error('chartPng: not a PNG, no IEND chunk')
}

/**
 * Insert one `tEXt` chunk right before `IEND` — legal anywhere after `IHDR`
 * per the PNG spec, and appending keeps every offset before it untouched.
 */
export function insertTextChunk(png: Uint8Array, keyword: string, text: string): Uint8Array {
  const data = concatBytes(latin1Bytes(keyword), Uint8Array.of(0), latin1Bytes(text))
  const type = latin1Bytes('tEXt')
  const crc = crc32(concatBytes(type, data))

  const chunk = new Uint8Array(4 + 4 + data.length + 4)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, data.length, false)
  chunk.set(type, 4)
  chunk.set(data, 8)
  view.setUint32(8 + data.length, crc, false)

  const at = findIendOffset(png)
  return concatBytes(png.subarray(0, at), chunk, png.subarray(at))
}

/** The inverse of `insertTextChunk` — for a test or a harness to prove the round trip. */
export function readTextChunk(png: Uint8Array, keyword: string): string | null {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  let offset = 8
  while (offset < png.length) {
    const length = view.getUint32(offset, false)
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8))
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === 'tEXt') {
      const zero = data.indexOf(0)
      const foundKeyword = String.fromCharCode(...data.subarray(0, zero))
      if (foundKeyword === keyword) {
        return String.fromCharCode(...data.subarray(zero + 1))
      }
    }
    if (type === 'IEND') return null
    offset += 4 + 4 + length + 4
  }
  return null
}
