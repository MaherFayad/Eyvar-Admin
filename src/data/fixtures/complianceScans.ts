/**
 * **The bytes behind a compliance document — genuine, decodable, and visibly
 * not a scan of anything.**
 *
 * `types/driver.ts` ruled that `ComplianceDocFile` is *"the record of an
 * uploaded scan. Never the scan"*, and said what would have to be true before
 * that changed:
 *
 * > *"Fetching the bytes is a separate, streaming, separately-permitted read
 * > against an object store, and it does not exist. When it does it is one
 * > route on this record — the id is already here — and adding it is a one-line
 * > change to this interface plus one client function."*
 *
 * This module is the mock object store that read talks to. It holds **no
 * stored assets**: every response is composed, deterministically, from the
 * document record itself. `clients/drivers.ts#getComplianceDocumentFile` is the
 * one route; nothing else may import this file.
 *
 * ## The tension this file exists to resolve, and how it is resolved
 *
 * The ruling's objection to a fabricated scan is not squeamishness about fake
 * data — it is a training argument, and it is the sharpest sentence in the type:
 *
 * > *"an operator who is taught that the viewer shows a licence will read the
 * > next placeholder as a licence too."*
 *
 * Legacy's `zoomDoc()` (`:10893`) painted a diagonal-striped rectangle captioned
 * *"Simulated scan preview"*, and that is the failure mode: a shape that
 * **occupies the position of evidence** while carrying none. An operator learns
 * the position, not the caption.
 *
 * But a viewer served nothing proves nothing. A preview that renders a blank
 * page cannot distinguish *"the pipeline works and this document is unreadable"*
 * from *"the pipeline is broken"* — the same pair of opposite diagnoses
 * `compliance.test.ts` §8 argues about a missing `href`.
 *
 * **The resolution: serve real bytes whose entire content is the statement that
 * they are not evidence.** Every response renders, in the largest type on the
 * page, `EYVAR ADMIN SAMPLE` / `NOT A REAL DOCUMENT`, and then the three facts
 * that make it *this* document rather than a generic placeholder — the document
 * type, the captain, and the document id. There is no border of a licence, no
 * photograph, no field labels, no seal, no Arabic, no stock imagery and no
 * striped rectangle. Nothing on the page has the **shape** of a Saudi driving
 * licence or an Istimara, so there is no shape for an operator to learn.
 *
 * Three consequences follow, and each is deliberate:
 *
 *   1. **The type name is rendered as its enum key** — `OPERATING_CARD`, not
 *      *"Operating card"*. `COMPLIANCE_DOC_TYPES` carries `labelKey`, not
 *      prose, precisely so a document type is translatable
 *      (`types/driver.ts:208`); baking an English label into image bytes would
 *      reintroduce that defect in a form no dictionary can reach. The enum key
 *      is the domain's own name for the thing and is untranslatable by
 *      construction, the same way a file name is data rather than copy.
 *   2. **The bytes are much smaller than `ComplianceDocFile.sizeBytes` claims,
 *      and that mismatch is intentional.** `DRV-0101-license` records a
 *      1.8 MB phone photo; the sample is ~20 kB. Padding the sample to 1.8 MB
 *      would buy nothing but weight, and a viewer that showed a 1.8 MB
 *      download of this page would be the more misleading artefact. The meta
 *      line renders `file.sizeBytes` — the record's claim about the real
 *      upload — and the viewer renders these bytes; they are answers to
 *      different questions and only http mode makes them the same file.
 *   3. **No `sample: true` flag crosses the seam.** A boolean the viewer could
 *      render a banner from would be `false` forever against a real server —
 *      the same "field every screen has to special-case" the ruling refused an
 *      always-null `href` over. The marking is *in the bytes*, so it survives a
 *      screenshot, a download, a print and a paste into a ticket, which a
 *      banner does not.
 *
 * ## Why composed rather than three stored files
 *
 * A stored asset per media type would be smaller in code and would fail the
 * requirement: it could not name the document it was served for, so every
 * captain's licence would be byte-identical and a viewer wired to the wrong id
 * would look correct. Composing from the record makes the round trip
 * observable — open `DRV-0104-id_card` and the page says
 * `DRV-0104-INSPECTION`.
 *
 * The encoders below are the whole cost of that: a 1-bit PNG, a DC-only
 * baseline JPEG and a one-page PDF, none of which needs a dependency. They are
 * standards-conformant rather than clever — the JPEG carries the Annex K
 * Huffman tables rather than a two-symbol table it could get away with, because
 * nothing in this repo can decode a JPEG to prove the shortcut was safe.
 *
 * **This module lives under `fixtures/` for the reason every fixture does**
 * (`mock/fixtures.ts`): it is reached only through the lazy fixture chunk, so a
 * `VITE_DATA_SOURCE=http` build ships none of it. Against a real object store
 * these encoders are dead code, and dead code that never shipped is the cheapest
 * kind.
 *
 * Nothing here reads a clock or a PRNG. Given the same document record it
 * returns the same bytes, on every run and on every machine.
 */

import type { ComplianceDocFile, DocumentType } from '../types/driver'

/**
 * **What a scan needs to be generated: an id, a type and a file record.**
 *
 * It was `ComplianceDoc`, which is the captain's row — and the applications
 * viewer draws the same samples for a document that is not one yet. An
 * `ApplicantDoc` carries the same three fields and none of the other five, so
 * the parameter is narrowed to what the encoders actually read rather than
 * widened to a union of two records. Nothing about the bytes changed.
 *
 * `subjectId` is the captain or the applicant the document belongs to. It is a
 * separate argument and not a substring of `id`, because both types call their
 * id **opaque** and a server free to issue `CDOC-8814` must stay free to.
 */
export interface ScannableDoc {
  id: string
  type: DocumentType
  file: ComplianceDocFile | null
}

/* ─────────────────────────── the caption ───────────────────────────────── */

/**
 * The six lines every sample renders, in every media type.
 *
 * Identical across PDF, PNG and JPEG on purpose: a test that asserts the JPEG
 * names the right document should not have to know a second layout, and an
 * operator comparing two documents of different types should see one form.
 *
 * `doc.id` is **printed, never parsed** — the type calls it opaque and says the
 * captain id belongs to the compliance row, which is why `driverId` is a
 * separate argument rather than a substring.
 */
export function complianceScanCaption(
  subjectId: string,
  doc: ScannableDoc,
  /* **`CAPTAIN` by default, because every existing caller means one.** The
     applications viewer draws the same samples for a document that belongs to
     an APPLICANT, and a sample captioned `CAPTAIN APP-2205` would be a picture
     asserting something the record denies. A parameter with the old value as
     its default keeps every compliance caption byte-identical. */
  subjectLabel: string = 'CAPTAIN',
): string[] {
  return [
    'EYVAR ADMIN SAMPLE',
    'NOT A REAL DOCUMENT',
    '',
    `TYPE ${doc.type.toUpperCase()}`,
    `${subjectLabel} ${subjectId.toUpperCase()}`,
    `DOC ${doc.id.toUpperCase()}`,
  ].map(sanitise)
}

/**
 * Everything outside the font's alphabet becomes `?` rather than a blank.
 *
 * Ids are ASCII today. A server free to issue `CDOC-٨٨١٤` is not, and a caption
 * that silently dropped half a document id would be a viewer quietly showing
 * the wrong document.
 */
function sanitise(line: string): string {
  return line.replace(/[^A-Z0-9 ._:/-]/g, '?')
}

/**
 * The bytes for one document's scan.
 *
 * Throws rather than returning empty when `doc.file` is `null`: the caller
 * distinguishes *no file on record* before it gets here, because that is not an
 * error and must not be represented as zero bytes.
 */
export function complianceScanBytes(
  subjectId: string,
  doc: ScannableDoc,
  subjectLabel?: string,
): Uint8Array {
  const file: ComplianceDocFile | null = doc.file
  if (file === null) {
    throw new Error(`complianceScanBytes: ${doc.id} has no file on record; the caller must branch first`)
  }
  const lines = complianceScanCaption(subjectId, doc, subjectLabel)
  if (file.mimeType === 'application/pdf') return samplePdf(lines)
  if (file.mimeType === 'image/png') return samplePng(lines)
  return sampleJpeg(lines)
}

/* ──────────────────────────── the bitmap ───────────────────────────────── */

/**
 * A 5×7 uppercase font, one line per glyph, seven space-separated rows of five
 * bits. Written as legible ASCII art rather than packed hex because someone
 * will eventually need to fix a letter to reproduce a rendering bug, and a
 * table of `0x7e` cannot be proofread.
 */
const FONT: Readonly<Record<string, string>> = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 11001 10101 10011 10001 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 11011 10001',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  '0': '01110 10001 10011 10101 11001 10001 01110',
  '1': '00100 01100 00100 00100 00100 00100 01110',
  '2': '01110 10001 00001 00010 00100 01000 11111',
  '3': '11111 00010 00100 00010 00001 10001 01110',
  '4': '00010 00110 01010 10010 11111 00010 00010',
  '5': '11111 10000 11110 00001 00001 10001 01110',
  '6': '00110 01000 10000 11110 10001 10001 01110',
  '7': '11111 00001 00010 00100 01000 01000 01000',
  '8': '01110 10001 10001 01110 10001 10001 01110',
  '9': '01110 10001 10001 01111 00001 00010 01100',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
  '-': '00000 00000 00000 11111 00000 00000 00000',
  _: '00000 00000 00000 00000 00000 00000 11111',
  '.': '00000 00000 00000 00000 00000 01100 01100',
  ':': '00000 01100 01100 00000 01100 01100 00000',
  '/': '00001 00010 00010 00100 01000 01000 10000',
  '?': '01110 10001 00001 00010 00100 00000 00100',
}

/** An unmapped character renders as a filled box — visibly wrong, never invisible. */
const TOFU = '11111 10001 10001 10001 10001 10001 11111'

const GLYPH_W = 5
const GLYPH_H = 7
/** One blank column between glyphs. */
const ADVANCE = 6
/** Two blank rows between baselines. */
const LINE_H = 9
/** Cells of white between the frame and the text. */
const PAD = 3
/** Narrower captions still render as a page rather than a strip. */
const MIN_COLS = 26

/** One byte per cell, `1` where there is ink. The unit both raster encoders scale up from. */
interface CellGrid {
  readonly width: number
  readonly height: number
  readonly ink: Uint8Array
}

function renderCaption(lines: readonly string[]): CellGrid {
  const cols = Math.max(MIN_COLS, ...lines.map((line) => line.length))
  const width = cols * ADVANCE - 1 + (PAD + 1) * 2
  const height = lines.length * LINE_H - (LINE_H - GLYPH_H) + (PAD + 1) * 2
  const ink = new Uint8Array(width * height)

  /* A one-cell frame. Without it the sample reads as loose text on whatever the
     viewer's background happens to be, and an operator cannot see where the
     served object ends. */
  for (let x = 0; x < width; x += 1) {
    ink[x] = 1
    ink[(height - 1) * width + x] = 1
  }
  for (let y = 0; y < height; y += 1) {
    ink[y * width] = 1
    ink[y * width + width - 1] = 1
  }

  lines.forEach((line, index) => {
    const top = PAD + 1 + index * LINE_H
    for (let column = 0; column < line.length; column += 1) {
      const rows = (FONT[line.charAt(column)] ?? TOFU).split(' ')
      const left = PAD + 1 + column * ADVANCE
      for (let y = 0; y < GLYPH_H; y += 1) {
        const row = rows[y] ?? ''
        for (let x = 0; x < GLYPH_W; x += 1) {
          if (row.charAt(x) === '1') ink[(top + y) * width + left + x] = 1
        }
      }
    }
  })

  return { width, height, ink }
}

/** `true` where the cell containing this pixel carries ink. */
function inked(grid: CellGrid, px: number, py: number, scale: number): boolean {
  const cell = Math.floor(py / scale) * grid.width + Math.floor(px / scale)
  return grid.ink[cell] === 1
}

/* ───────────────────────────── PNG ─────────────────────────────────────── */

/**
 * Four device pixels per cell — 20 px capitals, legible at 1:1 and small
 * enough that a stored (uncompressed) deflate stream stays around 20 kB.
 */
const PNG_SCALE = 4

/**
 * A 1-bit greyscale PNG. Colour type 0, bit depth 1, filter `None` on every row.
 *
 * The zlib stream is **stored**, not compressed: a deflate encoder that emitted
 * matches would be another 60 lines of bit-level code to get wrong, and the
 * saving is a fixture nobody downloads over a network. Stored blocks are a
 * legal deflate stream and every decoder reads them.
 */
function samplePng(lines: readonly string[]): Uint8Array {
  const grid = renderCaption(lines)
  const width = grid.width * PNG_SCALE
  const height = grid.height * PNG_SCALE
  const rowBytes = Math.ceil(width / 8)
  const raw = new Uint8Array((rowBytes + 1) * height)

  for (let py = 0; py < height; py += 1) {
    let out = py * (rowBytes + 1)
    raw[out] = 0 /* filter: None */
    out += 1
    let accumulator = 0
    let bits = 0
    for (let px = 0; px < width; px += 1) {
      /* Bit depth 1, greyscale: 0 is black, 1 is white. Ink is black. */
      accumulator = (accumulator << 1) | (inked(grid, px, py, PNG_SCALE) ? 0 : 1)
      bits += 1
      if (bits === 8) {
        raw[out] = accumulator
        out += 1
        accumulator = 0
        bits = 0
      }
    }
    if (bits > 0) raw[out] = accumulator << (8 - bits)
  }

  const ihdr = new Uint8Array(13)
  const header = new DataView(ihdr.buffer)
  header.setUint32(0, width)
  header.setUint32(4, height)
  ihdr[8] = 1 /* bit depth */
  ihdr[9] = 0 /* colour type: greyscale */
  ihdr[10] = 0 /* compression: deflate */
  ihdr[11] = 0 /* filter method: adaptive */
  ihdr[12] = 0 /* interlace: none */

  return concat([
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlibStored(raw)),
    pngChunk('IEND', new Uint8Array(0)),
  ])
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i += 1) chunk[4 + i] = type.charCodeAt(i)
  chunk.set(data, 8)
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)))
  return chunk
}

/** `0x78 0x01` — deflate, 32 kB window, "fastest". `0x7801 % 31 === 0`, which is the header check. */
function zlibStored(data: Uint8Array): Uint8Array {
  const MAX = 65_535
  const blocks = Math.max(1, Math.ceil(data.length / MAX))
  const out = new Uint8Array(2 + blocks * 5 + data.length + 4)
  let at = 0
  out[at] = 0x78
  out[at + 1] = 0x01
  at += 2
  for (let block = 0; block < blocks; block += 1) {
    const start = block * MAX
    const len = Math.min(MAX, data.length - start)
    out[at] = block === blocks - 1 ? 1 : 0 /* BFINAL, BTYPE=00 stored */
    out[at + 1] = len & 0xff
    out[at + 2] = (len >> 8) & 0xff
    out[at + 3] = ~len & 0xff
    out[at + 4] = (~len >> 8) & 0xff
    at += 5
    out.set(data.subarray(start, start + len), at)
    at += len
  }
  const sum = adler32(data)
  out[at] = (sum >>> 24) & 0xff
  out[at + 1] = (sum >>> 16) & 0xff
  out[at + 2] = (sum >>> 8) & 0xff
  out[at + 3] = sum & 0xff
  return out
}

function adler32(data: Uint8Array): number {
  let a = 1
  let b = 0
  for (let i = 0; i < data.length; i += 1) {
    a = (a + (data[i] ?? 0)) % 65_521
    b = (b + a) % 65_521
  }
  return ((b << 16) | a) >>> 0
}

/** Built once at module load from a fixed polynomial — a loop, not a clock and not a PRNG. */
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    c = (CRC_TABLE[(c ^ (bytes[i] ?? 0)) & 0xff] ?? 0) ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

/* ───────────────────────────── JPEG ────────────────────────────────────── */

/**
 * One cell per 8×8 block, which is what makes this encoder small enough to be
 * worth having.
 *
 * A block whose 64 samples are all the same value has one non-zero DCT
 * coefficient — the DC term — so the whole scan is DC differences and
 * end-of-block markers. No DCT, no zig-zag, no AC coefficients, no rounding
 * error. It is a real baseline JPEG that any decoder reads; it is simply an
 * image that happens to be blocky, which is the honest form for a sample.
 */
const JPEG_SCALE = 8

/**
 * Every quantiser is 8, so `pixel = DCquantised + 128` exactly: white is `127`,
 * black is `-128`, and both reconstruct to 255 and 0 with no error.
 */
const JPEG_QUANT = 8

/** ITU-T T.81 Annex K.3.3.1, table K.3 — DC luminance. Twelve categories, 0…11. */
const DC_BITS = [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]
const DC_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

/**
 * ITU-T T.81 Annex K.3.3.2, table K.5 — AC luminance.
 *
 * Carried in full although the encoder emits exactly one of its 162 symbols
 * (`0x00`, end-of-block). A two-symbol table would be legal and 160 bytes
 * smaller, and nothing in this repository can decode a JPEG to prove a decoder
 * accepts it. The standard table is the one every decoder is tested against.
 */
const AC_BITS = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d]
const AC_VALUES = [
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07,
  0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0,
  0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
  0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
  0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69,
  0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
  0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7,
  0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5,
  0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
  0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8,
  0xf9, 0xfa,
]

interface HuffmanCode {
  readonly code: number
  readonly length: number
}

/** Canonical code assignment, T.81 figure C.2. */
function buildHuffman(bits: readonly number[], values: readonly number[]): Map<number, HuffmanCode> {
  const table = new Map<number, HuffmanCode>()
  let code = 0
  let index = 0
  for (let length = 1; length <= 16; length += 1) {
    for (let n = 0; n < (bits[length - 1] ?? 0); n += 1) {
      table.set(values[index] ?? 0, { code, length })
      code += 1
      index += 1
    }
    code <<= 1
  }
  return table
}

const DC_TABLE = buildHuffman(DC_BITS, DC_VALUES)
const AC_TABLE = buildHuffman(AC_BITS, AC_VALUES)

function sampleJpeg(lines: readonly string[]): Uint8Array {
  const grid = renderCaption(lines)
  const width = grid.width * JPEG_SCALE
  const height = grid.height * JPEG_SCALE

  const quant = new Uint8Array(65)
  quant.fill(JPEG_QUANT, 1)
  quant[0] = 0x00 /* Pq = 8-bit, Tq = 0 */

  const frame = Uint8Array.from([
    8, /* sample precision */
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    1, /* one component */
    1, /* component id */
    0x11, /* 1×1 sampling */
    0, /* quantisation table 0 */
  ])

  const scanHeader = Uint8Array.from([
    1, /* one component in scan */
    1, /* component id */
    0x00, /* DC table 0, AC table 0 */
    0, 63, 0x00, /* Ss, Se, Ah/Al — baseline sequential */
  ])

  return concat([
    Uint8Array.from([0xff, 0xd8]),
    marker(0xdb, quant),
    marker(0xc0, frame),
    marker(0xc4, concat([Uint8Array.from([0x00]), Uint8Array.from(DC_BITS), Uint8Array.from(DC_VALUES)])),
    marker(0xc4, concat([Uint8Array.from([0x10]), Uint8Array.from(AC_BITS), Uint8Array.from(AC_VALUES)])),
    marker(0xda, scanHeader),
    jpegScan(grid),
    Uint8Array.from([0xff, 0xd9]),
  ])
}

function marker(code: number, payload: Uint8Array): Uint8Array {
  const length = payload.length + 2
  return concat([Uint8Array.from([0xff, code, (length >> 8) & 0xff, length & 0xff]), payload])
}

/**
 * The entropy-coded segment: one DC difference and one end-of-block per 8×8
 * block, in raster order. `0xff` is byte-stuffed with `0x00` as T.81 B.1.1.5
 * requires, or a run of white would be read as a marker.
 */
function jpegScan(grid: CellGrid): Uint8Array {
  const out: number[] = []
  let accumulator = 0
  let bits = 0

  function write(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i -= 1) {
      accumulator = (accumulator << 1) | ((value >> i) & 1)
      bits += 1
      if (bits === 8) {
        out.push(accumulator)
        if (accumulator === 0xff) out.push(0x00)
        accumulator = 0
        bits = 0
      }
    }
  }

  function writeSymbol(table: Map<number, HuffmanCode>, symbol: number): void {
    const entry = table.get(symbol)
    if (entry === undefined) throw new Error(`jpegScan: no Huffman code for symbol ${symbol}`)
    write(entry.code, entry.length)
  }

  let previous = 0
  for (let row = 0; row < grid.height; row += 1) {
    for (let column = 0; column < grid.width; column += 1) {
      const value = grid.ink[row * grid.width + column] === 1 ? -128 : 127
      const difference = value - previous
      previous = value
      const magnitude = Math.abs(difference)
      let category = 0
      while (magnitude >= 1 << category) category += 1
      writeSymbol(DC_TABLE, category)
      if (category > 0) {
        write(difference > 0 ? difference : difference + (1 << category) - 1, category)
      }
      writeSymbol(AC_TABLE, 0x00) /* end of block */
    }
  }

  /* Pad the final byte with 1-bits: T.81 B.1.1.5. A 0-pad can look like the
     start of a valid code to a decoder still reading. */
  if (bits > 0) write((1 << (8 - bits)) - 1, 8 - bits)
  return Uint8Array.from(out)
}

/* ────────────────────────────── PDF ────────────────────────────────────── */

const PDF_WIDTH = 420
const PDF_HEIGHT = 250

/**
 * A one-page PDF 1.4 with a rotated grey `SAMPLE` watermark and the caption in
 * Helvetica-Bold.
 *
 * Written by hand because the alternative is a dependency, and because a PDF is
 * a text format with a byte-offset table — the only fiddly part is the `xref`,
 * and everything here is ASCII so a string offset is a byte offset.
 *
 * The watermark is a rotated word rather than legacy's diagonal stripes on
 * purpose: stripes are decoration that an operator stops seeing, a word that
 * reads `SAMPLE` through the middle of the page is not.
 */
function samplePdf(lines: readonly string[]): Uint8Array {
  const content = pdfContent(lines)
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] ` +
      '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })

  const startxref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`

  return Uint8Array.from(pdf, (character) => character.charCodeAt(0) & 0xff)
}

function pdfContent(lines: readonly string[]): string {
  const body = lines
    .map((line) => `(${line.replace(/([\\()])/g, '\\$1')}) Tj T*`)
    .join('\n')
  return [
    /* The watermark, painted first so the caption sits on top of it. */
    '0.82 g',
    'BT /F1 54 Tf 0.7071 0.7071 -0.7071 0.7071 62 46 Tm (SAMPLE) Tj ET',
    /* The frame, matching the raster samples' one-cell border. */
    '0 G 2 w 14 14 392 222 re S',
    '0 g',
    `BT /F1 15 Tf 1 0 0 1 34 ${PDF_HEIGHT - 52} Tm 22 TL`,
    body,
    'ET',
  ].join('\n')
}

/* ──────────────────────────── shared ───────────────────────────────────── */

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}
