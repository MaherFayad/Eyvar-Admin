/**
 * The QR encoder, verified by **properties rather than by remembered fixtures**.
 *
 * A hand-written encoder is a liability, and a test that compares its output to
 * a matrix somebody typed in from memory is a second liability wearing the
 * clothes of the first. Every check below is either a round-trip of the
 * encoder's own input or a mathematical property of a correct QR code, so none
 * of them can be satisfied by an implementation that is confidently wrong.
 *
 * The decisive one is **§2**: `data ‖ ecc` is a codeword of the Reed–Solomon
 * code, which means it is divisible by the generator polynomial, which means
 * every syndrome `r(α^i)` is zero. That is the definition, not a sample. A
 * single wrong ECC byte makes at least one syndrome non-zero.
 *
 * **What this does not prove:** that a phone reads the square. That needs a
 * real scanner and it is named for visual-QA rather than implied here.
 */

import { describe, expect, it } from 'vitest'
import {
  bitsToBytes,
  blockLayout,
  encodeBits,
  formatBits,
  generatorPoly,
  interleave,
  qrMatrix,
  reedSolomon,
  versionFor,
  MAX_QR_BYTES,
} from './qrMatrix'

/** The seeded `otpauth://` URI, at the longest seeded address. */
const URI =
  'otpauth://totp/Eyvar:noura.f%40eyvar.com?secret=JBSWY3DPEHPK3PXP&issuer=Eyvar&digits=6&period=30'

/* GF(256) again, independently, so the test does not borrow the arithmetic it
   is checking. Same primitive polynomial 0x11D — that much is the standard. */
const EXP: number[] = []
const LOG: number[] = []
{
  let x = 1
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
}
const mul = (a: number, b: number) =>
  a === 0 || b === 0 ? 0 : (EXP[((LOG[a] as number) + (LOG[b] as number)) % 255] as number)

/** `r(α^power)` — Horner over GF(256). */
function evaluate(poly: readonly number[], power: number): number {
  const x = EXP[power % 255] as number
  let acc = 0
  for (const coefficient of poly) acc = mul(acc, x) ^ coefficient
  return acc
}

describe('1 — the bit stream round-trips', () => {
  it('reads back the mode, the length and every payload byte', () => {
    const bytes = Array.from(new TextEncoder().encode(URI))
    const version = versionFor(bytes.length)
    const { blocks, dataPerBlock } = blockLayout(version)
    const bits = encodeBits(bytes, blocks * dataPerBlock)

    const read = (offset: number, width: number) =>
      bits.slice(offset, offset + width).reduce((acc, bit) => (acc << 1) | bit, 0)

    expect(read(0, 4), 'byte mode').toBe(0b0100)
    expect(read(4, 8), 'character count').toBe(bytes.length)
    for (let i = 0; i < bytes.length; i += 1) {
      expect(read(12 + i * 8, 8), `payload byte ${i}`).toBe(bytes[i])
    }
    /* Filled exactly to capacity — never short, never over. */
    expect(bits.length).toBe(blocks * dataPerBlock * 8)
  })

  it('pads with the two specified codewords, alternating', () => {
    /* A one-byte payload leaves almost the whole block to padding, which is the
       only way to see the pattern at all.

       The header is three codewords, not two: 4 mode bits + 8 count bits +
       8 payload bits + a 4-bit terminator is 24, so `0x40 0x14 0x10` — the
       terminator shares the third byte with the tail of the payload. Padding
       therefore starts at index 3. Getting this boundary wrong in the *test*
       is how a correct encoder gets "fixed". */
    const bytes = bitsToBytes(encodeBits([0x41], 16))
    expect(bytes.slice(0, 3)).toEqual([0x40, 0x14, 0x10])
    expect(bytes.slice(3)).toEqual([0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec])
  })
})

describe('2 — every block is a real Reed–Solomon codeword', () => {
  it('has all-zero syndromes, which is the definition of one', () => {
    const bytes = Array.from(new TextEncoder().encode(URI))
    const version = versionFor(bytes.length)
    const { blocks, ecPerBlock, dataPerBlock } = blockLayout(version)
    const data = bitsToBytes(encodeBits(bytes, blocks * dataPerBlock))

    for (let b = 0; b < blocks; b += 1) {
      const block = data.slice(b * dataPerBlock, (b + 1) * dataPerBlock)
      const codeword = [...block, ...reedSolomon(block, ecPerBlock)]
      for (let i = 0; i < ecPerBlock; i += 1) {
        /* r(α^i) = 0 for i = 0 … n-1 iff the generator divides r. One wrong
           ECC byte breaks at least one of these. */
        expect(evaluate(codeword, i), `syndrome ${i} of block ${b}`).toBe(0)
      }
    }
  })

  it('holds for every ECC length these six versions use', () => {
    for (const n of [10, 16, 18, 24, 26]) {
      const block = Array.from({ length: 20 }, (_, i) => (i * 37 + 11) & 0xff)
      const codeword = [...block, ...reedSolomon(block, n)]
      for (let i = 0; i < n; i += 1) expect(evaluate(codeword, i), `n=${n} syndrome ${i}`).toBe(0)
    }
  })

  it('builds a monic generator whose roots are α^0 … α^(n-1)', () => {
    const n = 10
    const g = generatorPoly(n)
    expect(g).toHaveLength(n + 1)
    expect(g[0], 'monic').toBe(1)
    for (let i = 0; i < n; i += 1) expect(evaluate(g, i), `root α^${i}`).toBe(0)
  })

  it('interleaves without losing or duplicating a codeword', () => {
    const bytes = Array.from(new TextEncoder().encode(URI))
    const version = versionFor(bytes.length)
    const { blocks, ecPerBlock, dataPerBlock } = blockLayout(version)
    const data = bitsToBytes(encodeBits(bytes, blocks * dataPerBlock))
    const out = interleave(data, version)
    expect(out).toHaveLength(blocks * (dataPerBlock + ecPerBlock))
    /* The data half, de-interleaved, is the input in order. */
    const recovered: number[] = []
    for (let b = 0; b < blocks; b += 1) {
      for (let i = 0; i < dataPerBlock; i += 1) recovered.push(out[i * blocks + b] as number)
    }
    expect(recovered).toEqual(data)
  })
})

describe('3 — the format information is a valid BCH(15,5) word', () => {
  it('decodes back to level M and the mask it was given', () => {
    for (let mask = 0; mask < 8; mask += 1) {
      const bits = formatBits(mask)
      expect(bits, 'fifteen bits').toBeLessThan(1 << 15)

      /* Undo the fixed XOR, then check two things independently: the top five
         bits are `00` (level M) followed by the mask, and the whole fifteen-bit
         word divides by the BCH generator 0x537 with no remainder. */
      const raw = bits ^ 0x5412
      expect(raw >>> 10, `level+mask for mask ${mask}`).toBe(mask)

      let check = raw
      for (let i = 14; i >= 10; i -= 1) {
        if ((check >>> i) & 1) check ^= 0x537 << (i - 10)
      }
      expect(check, `BCH remainder for mask ${mask}`).toBe(0)
    }
  })

  it('differs for every mask, so the mask is recoverable from the code', () => {
    const seen = new Set(Array.from({ length: 8 }, (_, mask) => formatBits(mask)))
    expect(seen.size).toBe(8)
  })
})

describe('4 — the matrix has the structure the specification requires', () => {
  const code = qrMatrix(URI)
  const dark = (row: number, col: number) => (code.modules[row] as boolean[])[col] === true

  it('sizes itself from the version it chose', () => {
    expect(code.size).toBe(17 + 4 * code.version)
    expect(code.version).toBeGreaterThanOrEqual(1)
    expect(code.version).toBeLessThanOrEqual(6)
  })

  it('puts a finder pattern in three corners and not the fourth', () => {
    const finderAt = (r: number, c: number) => {
      for (let dy = 0; dy < 7; dy += 1) {
        for (let dx = 0; dx < 7; dx += 1) {
          const dist = Math.max(Math.abs(dx - 3), Math.abs(dy - 3))
          if (dark(r + dy, c + dx) !== (dist !== 2)) return false
        }
      }
      return true
    }
    expect(finderAt(0, 0), 'top inline-start').toBe(true)
    expect(finderAt(0, code.size - 7), 'top inline-end').toBe(true)
    expect(finderAt(code.size - 7, 0), 'bottom inline-start').toBe(true)
    /* The fourth corner carries data, not a fourth finder — that asymmetry is
       what tells a scanner which way up the code is. */
    expect(finderAt(code.size - 7, code.size - 7)).toBe(false)
  })

  it('alternates along both timing lines', () => {
    for (let i = 8; i < code.size - 8; i += 1) {
      expect(dark(6, i), `timing row at ${i}`).toBe(i % 2 === 0)
      expect(dark(i, 6), `timing column at ${i}`).toBe(i % 2 === 0)
    }
  })

  it('always sets the dark module', () => {
    expect(dark(code.size - 8, 8)).toBe(true)
  })

  it('is not blank, and is not solid', () => {
    const total = code.size * code.size
    let count = 0
    for (let r = 0; r < code.size; r += 1) for (let c = 0; c < code.size; c += 1) if (dark(r, c)) count += 1
    /* Mask selection targets half; anything outside a wide band means the data
       never landed or the mask never applied. */
    expect(count / total).toBeGreaterThan(0.3)
    expect(count / total).toBeLessThan(0.7)
  })
})

describe('5 — the bound is a refusal, not a silent truncation', () => {
  it('throws above the version-6 capacity rather than emitting a short code', () => {
    expect(() => qrMatrix('x'.repeat(MAX_QR_BYTES + 1))).toThrow(/version above 6/)
    /* The caller's fallback is the secret alone, which §5.1 already ships. */
    expect(() => qrMatrix('x'.repeat(MAX_QR_BYTES))).not.toThrow()
  })

  it('picks the smallest version that fits', () => {
    expect(versionFor(14)).toBe(1)
    expect(versionFor(15)).toBe(2)
    expect(versionFor(26)).toBe(2)
    expect(versionFor(27)).toBe(3)
    expect(versionFor(106)).toBe(6)
  })
})
