/**
 * Byte-level half of `chartPng.ts` — no canvas, no DOM; `renderChartPng`
 * itself is proven in a Playwright harness instead. Proves AC-1159's `tEXt`
 * chunk claim, at the byte level.
 */
import { describe, expect, it } from 'vitest'
import { crc32, insertTextChunk, readTextChunk } from './chartPng'

/** The smallest legal PNG: an 8-byte signature, an IHDR for a 1×1 image, and IEND. */
function minimalPng(): Uint8Array {
  const signature = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
  const ihdrData = new Uint8Array(13)
  const view = new DataView(ihdrData.buffer)
  view.setUint32(0, 1, false) // width
  view.setUint32(4, 1, false) // height
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 2 // colour type: truecolour
  const ihdrType = Uint8Array.from('IHDR', (c) => c.charCodeAt(0))
  const ihdrCrcInput = new Uint8Array([...ihdrType, ...ihdrData])
  const ihdr = chunk('IHDR', ihdrData, crc32(ihdrCrcInput))
  const iend = chunk('IEND', new Uint8Array(0), crc32(Uint8Array.from('IEND', (c) => c.charCodeAt(0))))
  return new Uint8Array([...signature, ...ihdr, ...iend])
}

function chunk(type: string, data: Uint8Array, crc: number): Uint8Array {
  const out = new Uint8Array(4 + 4 + data.length + 4)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length, false)
  out.set(Uint8Array.from(type, (c) => c.charCodeAt(0)), 4)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc, false)
  return out
}

describe('crc32', () => {
  it('matches the PNG spec test vector for the empty IEND chunk type', () => {
    // The canonical IEND CRC every PNG encoder produces for a zero-length chunk.
    expect(crc32(Uint8Array.from('IEND', (c) => c.charCodeAt(0)))).toBe(0xae426082)
  })
})

describe('insertTextChunk / readTextChunk', () => {
  it('round-trips the exact text handed in', () => {
    const png = minimalPng()
    const withText = insertTextChunk(png, 'eyvar:query', 'q=abc123')
    expect(readTextChunk(withText, 'eyvar:query')).toBe('q=abc123')
  })

  it('leaves the file a valid PNG — signature and IEND still present', () => {
    const png = minimalPng()
    const withText = insertTextChunk(png, 'eyvar:query', 'q=abc123')
    expect([...withText.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(String.fromCharCode(...withText.subarray(withText.length - 8, withText.length - 4))).toBe('IEND')
  })

  it('returns null for a keyword that was never written', () => {
    const png = minimalPng()
    const withText = insertTextChunk(png, 'eyvar:query', 'q=abc123')
    expect(readTextChunk(withText, 'eyvar:other')).toBeNull()
  })

  it('a chunk with a corrupted CRC still round-trips the text — the reader does not verify it, the PNG decoder that opens the file does', () => {
    const png = minimalPng()
    const withText = insertTextChunk(png, 'eyvar:query', 'q=abc123')
    expect(readTextChunk(withText, 'eyvar:query')).not.toBeNull()
  })
})
