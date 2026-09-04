/**
 * **The bytes behind a compliance document, and the four answers the read has
 * to be able to give.**
 *
 * `compliance.test.ts` §8 guards the record: *there is no `href` on a document
 * or a file, and there must not be one*. That guard is untouched by this file
 * and must stay green beside it — the bytes are reached by `ComplianceDoc.id`,
 * so nothing was added to either interface. §8 is the reason this suite exists
 * in a separate file rather than as a tenth `describe` there: one file asserts
 * that the record holds no URL, the other that the bytes are reachable anyway,
 * and conflating them would make it easy to "fix" a failure in the first by
 * weakening the second.
 *
 * ## What is worth asserting, and what would be theatre
 *
 * The interesting properties are not "it returns something":
 *
 *   1. **Four outcomes, none collapsed.** Bytes, *no file on record*, refused,
 *      failed. The second is not an error and the last two are not each other.
 *   2. **The bytes are genuine.** A viewer that renders nothing proves nothing,
 *      so each media type is parsed here — PNG chunk CRCs and the zlib
 *      checksum, the JPEG marker sequence and its byte stuffing, the PDF's
 *      cross-reference offsets. Nothing in this repository can decode a JPEG,
 *      so the JPEG is checked structurally and its Huffman tables are the
 *      standard ones for exactly that reason.
 *   3. **The bytes are about *this* document.** A sample that could not name
 *      the document it was served for would make a viewer wired to the wrong id
 *      look correct.
 *   4. **They are visibly samples.** The PDF says so in text this file reads
 *      back; the raster formats say the same words in ink.
 *   5. **They are deterministic.** Same document, same bytes, every run.
 *
 * The population is read through `clients/drivers.ts`, never off
 * `fixtures/compliance.ts` — `compliance.test.ts` states that house rule and it
 * applies with more force here, because the whole point is that a screen can
 * reach these bytes without importing a fixture.
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures, seedMockFailuresFromLocation, setMockLatency } from '../config'
import { isApiError, type ApiError } from '../types/common'
import type { ComplianceDoc, ComplianceDocFile } from '../types/driver'
import { getComplianceDocumentFile, listDriverCompliance } from './drivers'
import { resetMockSession, switchMockUser } from './session'

type MimeType = ComplianceDocFile['mimeType']

/** Every document the resource serves, with the captain it came off. */
let docs: Array<{ driverId: string; doc: ComplianceDoc }> = []

beforeAll(async () => {
  disableMockLatency()
  const page = await listDriverCompliance({ pageSize: 500 })
  docs = page.items.flatMap((record) => record.docs.map((doc) => ({ driverId: record.driverId, doc })))
})

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
  resetMockSession()
})

/* ── helpers ──────────────────────────────────────────────────────────── */

/** The first document carrying a scan of this media type. Fails loudly rather than skipping. */
function withMime(mimeType: MimeType): { driverId: string; doc: ComplianceDoc } {
  const found = docs.find((d) => d.doc.file?.mimeType === mimeType)
  expect(found, `no seeded document carries a ${mimeType} scan`).toBeDefined()
  return found!
}

/** Two different documents carrying the same media type — for the "per document" assertions. */
function pairWithMime(mimeType: MimeType): Array<{ driverId: string; doc: ComplianceDoc }> {
  const found = docs.filter((d) => d.doc.file?.mimeType === mimeType).slice(0, 2)
  expect(found.length, `fewer than two seeded ${mimeType} scans`).toBe(2)
  return found
}

/**
 * The `ApiError` a read rejected with.
 *
 * A `.catch()` inline would type the result as *the union of the resolved value
 * and the error*, which makes `error.kind` a compile error and tempts a cast
 * that would also pass if the read had resolved. This asserts the rejection
 * happened before it narrows.
 */
async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  const outcome: unknown = await promise.then(
    () => null,
    (error: unknown) => error,
  )
  expect(isApiError(outcome), 'expected the read to reject with an ApiError').toBe(true)
  return outcome as ApiError
}

async function bytesOf(documentId: string): Promise<Uint8Array> {
  const read = await getComplianceDocumentFile(documentId)
  expect(read.outcome, documentId).toBe('bytes')
  if (read.outcome !== 'bytes') throw new Error('unreachable')
  return read.bytes
}

function ascii(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i] ?? 0)
  return out
}

function u32(bytes: Uint8Array, at: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(at)
}

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
  for (let i = 0; i < bytes.length; i += 1) c = (CRC_TABLE[(c ^ (bytes[i] ?? 0)) & 0xff] ?? 0) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
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

interface PngChunk {
  type: string
  data: Uint8Array
}

/** Walks the chunk list, verifying every CRC on the way. */
function readPngChunks(png: Uint8Array): PngChunk[] {
  expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const chunks: PngChunk[] = []
  let at = 8
  while (at < png.length) {
    const length = u32(png, at)
    const type = ascii(png.subarray(at + 4, at + 8))
    const data = png.subarray(at + 8, at + 8 + length)
    expect(u32(png, at + 8 + length), `${type} CRC`).toBe(crc32(png.subarray(at + 4, at + 8 + length)))
    chunks.push({ type, data })
    at += 12 + length
  }
  expect(at, 'trailing bytes after the last chunk').toBe(png.length)
  return chunks
}

/** Inflates a zlib stream made only of stored blocks, and checks its Adler-32. */
function inflateStored(zlib: Uint8Array): Uint8Array {
  expect((zlib[0] ?? 0) & 0x0f, 'compression method must be deflate').toBe(8)
  expect(((zlib[0] ?? 0) * 256 + (zlib[1] ?? 0)) % 31, 'zlib header check').toBe(0)
  const parts: Uint8Array[] = []
  let at = 2
  for (;;) {
    const header = zlib[at] ?? 0
    expect((header >> 1) & 0x03, 'every block is stored').toBe(0)
    const length = (zlib[at + 1] ?? 0) | ((zlib[at + 2] ?? 0) << 8)
    expect(((zlib[at + 3] ?? 0) | ((zlib[at + 4] ?? 0) << 8)) ^ 0xffff, 'NLEN').toBe(length)
    parts.push(zlib.subarray(at + 5, at + 5 + length))
    at += 5 + length
    if ((header & 1) === 1) break
  }
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const raw = new Uint8Array(total)
  let out = 0
  for (const part of parts) {
    raw.set(part, out)
    out += part.length
  }
  expect(u32(zlib, at), 'Adler-32').toBe(adler32(raw))
  expect(at + 4, 'trailing bytes after the zlib checksum').toBe(zlib.length)
  return raw
}

/** The PNG, back as one byte per source cell — `1` where there is ink. */
function pngCellGrid(png: Uint8Array): { width: number; height: number; ink: Uint8Array; scale: number } {
  const chunks = readPngChunks(png)
  const ihdr = chunks.find((c) => c.type === 'IHDR')?.data
  expect(ihdr, 'IHDR').toBeDefined()
  const pixelWidth = u32(ihdr!, 0)
  const pixelHeight = u32(ihdr!, 4)
  expect(ihdr![8], 'bit depth').toBe(1)
  expect(ihdr![9], 'colour type: greyscale').toBe(0)
  expect(ihdr![12], 'interlace: none').toBe(0)

  const raw = inflateStored(chunks.find((c) => c.type === 'IDAT')!.data)
  const rowBytes = Math.ceil(pixelWidth / 8)
  expect(raw.length, 'one filter byte plus one row of samples per scanline').toBe(
    (rowBytes + 1) * pixelHeight,
  )

  /* The scale is recovered rather than assumed: the run of identical leading
     rows is one cell tall, and the encoder never scales differently in x. */
  const rowAt = (y: number) => raw.subarray(y * (rowBytes + 1) + 1, (y + 1) * (rowBytes + 1))
  let scale = 1
  while (scale < pixelHeight && ascii(rowAt(scale)) === ascii(rowAt(0))) scale += 1

  const width = pixelWidth / scale
  const height = pixelHeight / scale
  const ink = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    const row = rowAt(y * scale)
    for (let x = 0; x < width; x += 1) {
      const bit = x * scale
      /* Bit depth 1 greyscale: 0 is black, and black is ink. */
      ink[y * width + x] = ((row[bit >> 3] ?? 0) >> (7 - (bit & 7))) & 1 ? 0 : 1
    }
  }
  return { width, height, ink, scale }
}

/** Every marker segment in a JPEG, plus the entropy-coded scan. */
function readJpegSegments(jpeg: Uint8Array): { markers: number[]; sof: Uint8Array; scan: Uint8Array } {
  expect([jpeg[0], jpeg[1]], 'SOI').toEqual([0xff, 0xd8])
  const markers: number[] = []
  let sof: Uint8Array = new Uint8Array(0)
  let scanStart = -1
  let at = 2
  while (at < jpeg.length) {
    expect(jpeg[at], `expected a marker at ${at}`).toBe(0xff)
    const code = jpeg[at + 1] ?? 0
    markers.push(code)
    if (code === 0xd9) {
      at += 2
      break
    }
    const length = ((jpeg[at + 2] ?? 0) << 8) | (jpeg[at + 3] ?? 0)
    if (code === 0xc0) sof = jpeg.subarray(at + 4, at + 2 + length)
    at += 2 + length
    if (code === 0xda) {
      scanStart = at
      /* The entropy-coded segment runs to the next unstuffed marker. */
      while (at < jpeg.length - 1 && !((jpeg[at] ?? 0) === 0xff && (jpeg[at + 1] ?? 0) !== 0x00)) at += 1
    }
  }
  expect(at, 'bytes after EOI').toBe(jpeg.length)
  expect(scanStart, 'SOS').toBeGreaterThan(0)
  return { markers, sof, scan: jpeg.subarray(scanStart) }
}

/* ── 1 ────────────────────────────────────────────────────────────────── */

describe('1 — the four outcomes, and none of them collapsed into another', () => {
  it('returns bytes and the media type for a document that has a scan', async () => {
    const { doc } = withMime('application/pdf')
    const read = await getComplianceDocumentFile(doc.id)
    expect(read.outcome).toBe('bytes')
    if (read.outcome !== 'bytes') throw new Error('unreachable')
    expect(read.documentId).toBe(doc.id)
    expect(read.mimeType).toBe('application/pdf')
    expect(read.bytes.byteLength).toBeGreaterThan(0)
  })

  it('resolves — does not reject — for a document with no file on record', async () => {
    /**
     * The whole reason the return type is a union. `file: null` is 187 of the
     * 255 seeded documents; a 404 here would mean *this document id is wrong*,
     * which is somebody's bug, and *this document has no scan*, which is
     * Tuesday. `ComplianceDocFile`'s header: *"a viewer whose empty state is
     * rare is a viewer whose empty state was never built."*
     */
    const empty = docs.find((d) => d.doc.file === null)
    expect(empty, 'no seeded document is without a file — this would pass vacuously').toBeDefined()
    const read = await getComplianceDocumentFile(empty!.doc.id)
    expect(read).toEqual({ outcome: 'no-file-on-record', documentId: empty!.doc.id })
  })

  it('the empty case is the common one, so it cannot be the case nobody built', async () => {
    const withFile = docs.filter((d) => d.doc.file !== null).length
    expect(withFile).toBeGreaterThan(0)
    expect(docs.length - withFile).toBeGreaterThan(withFile)
  })

  it('refuses an operator who lacks a permission, as a 403 naming the key', async () => {
    /* `USR-2` is Finance and holds no `view_operations` — a seeded refusal,
       reachable without editing a fixture. */
    await switchMockUser('USR-2')
    const { doc } = withMime('image/jpeg')
    const error = await rejection(getComplianceDocumentFile(doc.id))
    expect(error.status).toBe(403)
    expect(error.kind).toBe('forbidden')
    expect(error.retryable, 'a refusal must not offer Try again').toBe(false)
    expect(error.details.map((d) => d.message)).toContain('view_operations')
  })

  it('serves the same operator once the permission is back', async () => {
    /* The positive twin: a refusal that fires for everybody is a broken read,
       not a permission model. */
    const { doc } = withMime('image/jpeg')
    await switchMockUser('USR-2')
    await expect(getComplianceDocumentFile(doc.id)).rejects.toSatisfy(isApiError)
    await switchMockUser('USR-1')
    await expect(getComplianceDocumentFile(doc.id)).resolves.toMatchObject({ outcome: 'bytes' })
  })

  it('keeps a refusal and a failure apart — opposite diagnoses, different actions', async () => {
    /**
     * `compliance.test.ts` §8 makes this argument about a URL that points at
     * nothing: *"those are opposite diagnoses and an operator acts differently
     * on each"*. Here they are two rejections that must not look alike, and
     * `retryable` is the field that decides whether the error state shows a
     * button an operator can hammer.
     */
    const { doc } = withMime('image/png')

    mockFailures.always('compliance.documentFile')
    const failure = await rejection(getComplianceDocumentFile(doc.id))
    expect(failure.kind).toBe('server')
    expect(failure.retryable).toBe(true)

    mockFailures.clear()
    expect(seedMockFailuresFromLocation('?mockFail=compliance.documentFile:403')).toEqual([
      'compliance.documentFile',
    ])
    const refusal = await rejection(getComplianceDocumentFile(doc.id))
    expect(refusal.kind).toBe('forbidden')
    expect(refusal.retryable).toBe(false)
  })

  it('is a 404 for an id no document has — which the empty case is not', async () => {
    const error = await rejection(getComplianceDocumentFile('DRV-0101-does-not-exist'))
    expect(error.status).toBe(404)
    expect(error.message).toContain('DRV-0101-does-not-exist')
    expect(error.retryable).toBe(false)
  })

  it('checks the permission before the lookup, so a refusal leaks no ids', async () => {
    await switchMockUser('USR-2')
    const error = await rejection(getComplianceDocumentFile('DRV-9999-nonsense'))
    expect(error.status, 'a 404 here would confirm which ids are real').toBe(403)
  })
})

/* ── 2 ────────────────────────────────────────────────────────────────── */

describe('2 — the record still carries no URL', () => {
  /**
   * The point of the exercise, restated where a change to this client would
   * trip it. `compliance.test.ts` §8 scans the documents; this scans the thing
   * the bytes read hands back, because that is the object a well-meaning
   * addition would land on next.
   */
  const URLISH = /(href|url|uri|src)/i

  it('carries no url-like key on the read result either', async () => {
    const { doc } = withMime('application/pdf')
    const read = await getComplianceDocumentFile(doc.id)
    const offences = Object.keys(read).filter((key) => URLISH.test(key))
    expect(offences, 'the bytes are addressed by the document id, never by a URL').toEqual([])
    expect(Object.keys(read).sort()).toEqual(['bytes', 'documentId', 'mimeType', 'outcome'])
  })

  it('needs nothing from the record but the id it already had', async () => {
    /* The ruling predicted *"a one-line change to this interface plus one
       client function"*. The one line was not needed: `ComplianceDoc.id` was
       already the address. */
    const { doc } = withMime('image/png')
    await expect(getComplianceDocumentFile(doc.id)).resolves.toMatchObject({ outcome: 'bytes' })
  })
})

/* ── 3 ────────────────────────────────────────────────────────────────── */

describe('3 — the bytes are genuine', () => {
  it('serves a PNG whose chunk CRCs and zlib checksum are correct', async () => {
    const { doc } = withMime('image/png')
    const grid = pngCellGrid(await bytesOf(doc.id))
    expect(grid.width).toBeGreaterThan(0)
    expect(grid.height).toBeGreaterThan(0)
    expect(grid.scale, 'the caption is scaled up so it is legible at 1:1').toBeGreaterThan(1)
  })

  it('serves a JPEG whose marker sequence is a baseline sequential frame', async () => {
    const { doc } = withMime('image/jpeg')
    const jpeg = await bytesOf(doc.id)
    const { markers, sof } = readJpegSegments(jpeg)
    expect(markers).toEqual([
      0xdb, /* DQT */
      0xc0, /* SOF0 — baseline sequential, Huffman */
      0xc4, /* DHT — DC */
      0xc4, /* DHT — AC */
      0xda, /* SOS */
      0xd9, /* EOI */
    ])
    expect(sof[0], 'eight-bit samples').toBe(8)
    expect(sof[5], 'one component — greyscale').toBe(1)
    expect(sof[7], '1×1 sampling, no subsampling').toBe(0x11)
    const height = ((sof[1] ?? 0) << 8) | (sof[2] ?? 0)
    const width = ((sof[3] ?? 0) << 8) | (sof[4] ?? 0)
    expect(width % 8, 'a whole number of 8×8 blocks').toBe(0)
    expect(height % 8).toBe(0)
  })

  it('stuffs every 0xFF in the JPEG scan, so no run of white reads as a marker', async () => {
    const { doc } = withMime('image/jpeg')
    const { scan } = readJpegSegments(await bytesOf(doc.id))
    const unstuffed: number[] = []
    for (let i = 0; i < scan.length - 2; i += 1) {
      if (scan[i] === 0xff && scan[i + 1] !== 0x00) unstuffed.push(i)
    }
    expect(unstuffed, 'only the closing EOI may be an unstuffed 0xFF').toEqual([])
    expect([scan[scan.length - 2], scan[scan.length - 1]]).toEqual([0xff, 0xd9])
  })

  it('serves a PDF whose cross-reference table points at its own objects', async () => {
    const { doc } = withMime('application/pdf')
    const text = ascii(await bytesOf(doc.id))
    expect(text.startsWith('%PDF-1.')).toBe(true)
    expect(text.endsWith('%%EOF\n')).toBe(true)

    const startxref = Number(text.slice(text.lastIndexOf('startxref') + 9).trim().split('\n')[0])
    expect(text.slice(startxref, startxref + 4)).toBe('xref')

    /* Every entry must land exactly on `N 0 obj`, which is the one part of a
       hand-written PDF that silently rots when a string above it changes. */
    const entries = text
      .slice(startxref)
      .split('\n')
      .filter((line) => / 00000 n $/.test(line))
    expect(entries.length, 'five objects').toBe(5)
    entries.forEach((entry, index) => {
      const offset = Number(entry.slice(0, 10))
      expect(text.slice(offset).startsWith(`${index + 1} 0 obj`), `object ${index + 1}`).toBe(true)
    })
  })

  it('keeps every sample small enough to be a fixture rather than an asset', async () => {
    for (const mimeType of ['application/pdf', 'image/jpeg', 'image/png'] as const) {
      const { doc } = withMime(mimeType)
      const bytes = await bytesOf(doc.id)
      expect(bytes.byteLength, `${mimeType} is not tiny`).toBeGreaterThan(512)
      expect(bytes.byteLength, `${mimeType} is oversized for a fixture`).toBeLessThan(64 * 1024)
    }
  })

  it('does not pretend to be the file the record describes, and that is deliberate', async () => {
    /**
     * `DRV-0101-license` records a 1.8 MB phone photo; the sample is a few tens
     * of kilobytes. Padding it to match would buy weight and nothing else, and
     * the meta line renders `file.sizeBytes` — the record's claim about the real
     * upload — not this. Asserted so the mismatch is a documented property
     * rather than a surprise in review.
     */
    const { doc } = withMime('image/jpeg')
    const bytes = await bytesOf(doc.id)
    expect(bytes.byteLength).not.toBe((doc.file as ComplianceDocFile).sizeBytes)
  })
})

/* ── 4 ────────────────────────────────────────────────────────────────── */

describe('4 — the bytes are about this document, and are visibly samples', () => {
  it('prints the sample marking, the type, the captain and the id in the PDF', async () => {
    const { driverId, doc } = withMime('application/pdf')
    const text = ascii(await bytesOf(doc.id))
    expect(text).toContain('(EYVAR ADMIN SAMPLE) Tj')
    expect(text).toContain('(NOT A REAL DOCUMENT) Tj')
    expect(text).toContain(`(TYPE ${doc.type.toUpperCase()}) Tj`)
    expect(text).toContain(`(CAPTAIN ${driverId.toUpperCase()}) Tj`)
    expect(text).toContain(`(DOC ${doc.id.toUpperCase()}) Tj`)
    expect(text, 'a rotated word, not legacy’s diagonal stripes').toContain('(SAMPLE) Tj')
  })

  it('names nothing that a real Saudi document would be recognised by', async () => {
    /**
     * The training argument in `types/driver.ts`, made mechanical: *"an operator
     * who is taught that the viewer shows a licence will read the next
     * placeholder as a licence too."* The sample carries the enum key, never a
     * label a real licence would print — which is also why an English document
     * name is not baked into the bytes: `COMPLIANCE_DOC_TYPES` carries
     * `labelKey`, not prose, so a translated label in an image would be
     * untranslatable by construction.
     */
    const { doc } = withMime('application/pdf')
    const text = ascii(await bytesOf(doc.id))
    for (const forbidden of ['Istimara', 'Driving licence', 'Kingdom of Saudi', 'رخصة']) {
      expect(text.toLowerCase(), forbidden).not.toContain(forbidden.toLowerCase())
    }
  })

  it('draws ink for the raster formats — a blank page would prove nothing', async () => {
    const { doc } = withMime('image/png')
    const grid = pngCellGrid(await bytesOf(doc.id))
    const ink = grid.ink.reduce((sum: number, cell) => sum + cell, 0)
    expect(ink, 'the sample renders nothing at all').toBeGreaterThan(grid.width)
    expect(ink, 'the sample is a solid block, not a caption').toBeLessThan(
      grid.width * grid.height * 0.5,
    )
    /* The frame: every cell of the top row is ink. */
    expect([...grid.ink.subarray(0, grid.width)].every((cell) => cell === 1)).toBe(true)
  })

  it('serves different bytes for different documents of the same media type', async () => {
    for (const mimeType of ['application/pdf', 'image/jpeg', 'image/png'] as const) {
      const [first, second] = pairWithMime(mimeType)
      const a = ascii(await bytesOf(first!.doc.id))
      const b = ascii(await bytesOf(second!.doc.id))
      expect(a, `two ${mimeType} samples are byte-identical`).not.toBe(b)
    }
  })

  it('serves identical bytes for the same document, twice', async () => {
    for (const mimeType of ['application/pdf', 'image/jpeg', 'image/png'] as const) {
      const { doc } = withMime(mimeType)
      expect(await bytesOf(doc.id)).toStrictEqual(await bytesOf(doc.id))
    }
  })
})

/* ── 5 ────────────────────────────────────────────────────────────────── */

describe('5 — every media type on the wire is reachable', () => {
  it('serves all three, from documents QA does not have to hand-edit', async () => {
    const served = new Set<string>()
    for (const mimeType of ['application/pdf', 'image/jpeg', 'image/png'] as const) {
      const { doc } = withMime(mimeType)
      const read = await getComplianceDocumentFile(doc.id)
      if (read.outcome === 'bytes') served.add(read.mimeType)
    }
    expect([...served].sort()).toEqual(['application/pdf', 'image/jpeg', 'image/png'])
  })

  it('answers for every document the resource holds, and never with empty bytes', async () => {
    /* The whole population, not a sample of it: a document type whose scan
       cannot be served is a viewer state nobody can reach. */
    const outcomes = await Promise.all(
      docs.map(async ({ doc }) => {
        const read = await getComplianceDocumentFile(doc.id)
        return read.outcome === 'bytes'
          ? `${doc.id}:${read.mimeType}:${read.bytes.byteLength > 0}`
          : `${doc.id}:none`
      }),
    )
    expect(outcomes.filter((line) => line.endsWith(':false'))).toEqual([])
    expect(outcomes.length).toBe(docs.length)
  })
})

/* ── 6 ──────────────────────────────────────────────────────────────── */

describe('6 — an in-flight read can be abandoned', () => {
  /**
   * **A captain has five document rows and the design fires this read on row
   * expansion.** An operator who expands and collapses faster than the reads
   * resolve would otherwise race stale bytes into a row that has moved on, and
   * a megabyte arriving for a row nobody is looking at is worse here than on a
   * list: it is the one read in this client that is expensive.
   *
   * The signal is not new machinery. `mock()` threads it into
   * `delayAbortable`, `http.bytes` hands it to `fetch`, and every neighbouring
   * read on this resource already takes one — `listDriverCompliance`,
   * `getDriverCompliance`, `getDriverTimeline`. This asserts the wiring rather
   * than the abstraction.
   */

  it('rejects immediately on a signal that is already aborted', async () => {
    const { doc } = withMime('image/png')
    const controller = new AbortController()
    controller.abort()
    const error = await rejection(getComplianceDocumentFile(doc.id, controller.signal))
    expect(error.code).toBe('aborted')
    expect(error.kind).toBe('network')
    expect(error.retryable, 'an abandoned read is not a failure to retry').toBe(false)
  })

  it('rejects a read abandoned while it is still in flight', async () => {
    const { doc } = withMime('application/pdf')
    setMockLatency(50)
    try {
      const controller = new AbortController()
      const inFlight = rejection(getComplianceDocumentFile(doc.id, controller.signal))
      controller.abort()
      expect((await inFlight).code).toBe('aborted')
    } finally {
      disableMockLatency()
    }
  })

  it('leaves a later read unaffected — an abort is not a broken client', async () => {
    const { doc } = withMime('application/pdf')
    const controller = new AbortController()
    controller.abort()
    await expect(getComplianceDocumentFile(doc.id, controller.signal)).rejects.toSatisfy(isApiError)
    await expect(getComplianceDocumentFile(doc.id)).resolves.toMatchObject({ outcome: 'bytes' })
  })
})
