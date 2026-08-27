/**
 * A QR code as a boolean matrix — for design §5.1's **144 px QR canvas** in the
 * TOTP enrolment option, and for nothing else.
 *
 * ## Why this is written here rather than installed
 *
 * The thing that has to be drawn is a **graphic in the design system**: 144 px,
 * `currentColor` so it inherits `--ev-ink`, `aria-hidden` because the secret
 * beneath it is the accessible path, and **it does not mirror** (`rtl.md`,
 * media glyphs). Every QR package on the registry emits either a `<canvas>` or
 * an SVG with baked hex colours, so adopting one would mean adding a dependency
 * *and* post-processing its output to get back to a token. Emitting the matrix
 * and drawing it ourselves is fewer moving parts and one fewer thing that can
 * put `#000000` into this codebase.
 *
 * It is also **pure, total and dependency-free**, which is what makes the tests
 * beside it worth anything.
 *
 * ## Scope, deliberately narrow
 *
 * **Byte mode, error-correction level M, versions 1–6.** That is 106 bytes at
 * version 6, against an `otpauth://` URI that is about 100 for the longest
 * seeded address. Versions 7 and up would need the version-information blocks
 * and buy nothing, so `qrMatrix` **throws** past 106 bytes rather than silently
 * emitting a code that cannot hold the URI — and the caller renders the secret
 * alone, which is the manual path §5.1 already ships beside the square
 * (*"Can't scan it? Enter this key in the app"*).
 *
 * ## How this is verified, since a hand-written encoder is a liability
 *
 * `qrMatrix.test.ts` checks four things, and the second is the one that matters:
 *
 * 1. the bit stream **round-trips** — mode, length and payload read back out of
 *    what was written in;
 * 2. **every block's Reed–Solomon syndromes are zero**, which is not an
 *    assertion against a remembered fixture but the defining property of a
 *    correct codeword: `data ‖ ecc` is divisible by the generator polynomial,
 *    so a wrong ECC byte cannot pass;
 * 3. the format information satisfies its BCH(15,5) check and decodes back to
 *    level M and the mask that was applied;
 * 4. the function patterns land where the specification puts them.
 *
 * What none of that proves is that a **phone** reads it. That is a visual-QA
 * check with a real scanner, and it is named in the handoff rather than
 * implied. The failure mode is benign in the meantime: QR carries its own error
 * correction, so a wrong stream fails to decode rather than decoding to a
 * *different* URI — an operator cannot be silently enrolled against the wrong
 * secret.
 *
 * Structure follows the reference formulation of the specification: coordinates
 * are `(x = column, y = row)` throughout, which is how the placement and
 * masking rules are stated.
 */

/** Total codewords, ECC codewords **per block**, and block count — level M. */
const VERSIONS: ReadonlyArray<{ total: number; ecPerBlock: number; blocks: number }> = [
  { total: 26, ecPerBlock: 10, blocks: 1 }, // v1
  { total: 44, ecPerBlock: 16, blocks: 1 }, // v2
  { total: 70, ecPerBlock: 26, blocks: 1 }, // v3
  { total: 100, ecPerBlock: 18, blocks: 2 }, // v4
  { total: 134, ecPerBlock: 24, blocks: 2 }, // v5
  { total: 172, ecPerBlock: 16, blocks: 4 }, // v6
]

/** Alignment-pattern centre coordinates, by version. v1 has none. */
const ALIGNMENT: ReadonlyArray<readonly number[]> = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
]

/** Level M. The two bits the format information carries for it. */
const ECL_FORMAT_BITS = 0b00

export const MAX_QR_BYTES = 106

export interface QrCode {
  /** `17 + 4 × version` modules on a side. */
  size: number
  version: number
  /** The mask that scored best, 0–7. Carried so a test can decode the format bits back. */
  mask: number
  /** `modules[row][col]`. `true` is a dark module. */
  modules: boolean[][]
}

/* ─────────────────────────── GF(256), once ──────────────────────────── */

const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255] as number
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return EXP[(LOG[a] as number) + (LOG[b] as number)] as number
}

/** The Reed–Solomon generator for `n` ECC codewords. Length `n + 1`, monic. */
export function generatorPoly(n: number): number[] {
  let poly = [1]
  for (let i = 0; i < n; i += 1) {
    const next = new Array<number>(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j += 1) {
      next[j] = (next[j] as number) ^ (poly[j] as number)
      next[j + 1] = (next[j + 1] as number) ^ gfMul(poly[j] as number, EXP[i] as number)
    }
    poly = next
  }
  return poly
}

/** The `n` ECC codewords for `data`. */
export function reedSolomon(data: readonly number[], n: number): number[] {
  const g = generatorPoly(n)
  const remainder = new Array<number>(n).fill(0)
  for (const byte of data) {
    const factor = byte ^ (remainder.shift() as number)
    remainder.push(0)
    if (factor !== 0) {
      for (let i = 0; i < n; i += 1) {
        remainder[i] = (remainder[i] as number) ^ gfMul(g[i + 1] as number, factor)
      }
    }
  }
  return remainder
}

/* ───────────────────────────── the encoder ──────────────────────────── */

function utf8(text: string): number[] {
  return Array.from(new TextEncoder().encode(text))
}

/** The smallest version 1–6 whose level-M data capacity holds `byteCount` bytes. */
export function versionFor(byteCount: number): number {
  for (let v = 1; v <= VERSIONS.length; v += 1) {
    const spec = VERSIONS[v - 1] as (typeof VERSIONS)[number]
    /* Two codewords go to the mode indicator and the 8-bit character count. */
    if (spec.total - spec.ecPerBlock * spec.blocks - 2 >= byteCount) return v
  }
  throw new RangeError(
    `A QR code of ${byteCount} bytes needs a version above 6, which this encoder does not emit. ` +
      `Render the secret on its own instead — §5.1 ships it beside the square for exactly this.`,
  )
}

/** Mode indicator, length, payload, terminator and padding — as a bit array. */
export function encodeBits(bytes: readonly number[], dataCodewords: number): number[] {
  const bits: number[] = []
  const push = (value: number, width: number) => {
    for (let i = width - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1)
  }

  push(0b0100, 4) // byte mode
  push(bytes.length, 8) // an 8-bit count, because versions 1–9 use 8
  for (const byte of bytes) push(byte, 8)

  const capacity = dataCodewords * 8
  /* Terminator: up to four zeros, and never past the capacity. */
  for (let i = 0; i < 4 && bits.length < capacity; i += 1) bits.push(0)
  while (bits.length % 8 !== 0) bits.push(0)

  /* The two specified pad codewords, alternating, to fill the block. */
  const pad = [0xec, 0x11]
  for (let i = 0; bits.length < capacity; i += 1) push(pad[i % 2] as number, 8)
  return bits
}

export function bitsToBytes(bits: readonly number[]): number[] {
  const bytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | (bits[i + j] as number)
    bytes.push(byte)
  }
  return bytes
}

/** How the data codewords split into blocks, for a test that wants the same split. */
export function blockLayout(version: number): { blocks: number; ecPerBlock: number; dataPerBlock: number } {
  const spec = VERSIONS[version - 1] as (typeof VERSIONS)[number]
  const dataCodewords = spec.total - spec.ecPerBlock * spec.blocks
  return { blocks: spec.blocks, ecPerBlock: spec.ecPerBlock, dataPerBlock: dataCodewords / spec.blocks }
}

/** Split into blocks, add ECC to each, and interleave as the specification requires. */
export function interleave(dataCodewords: readonly number[], version: number): number[] {
  const { blocks, ecPerBlock, dataPerBlock } = blockLayout(version)
  const data: number[][] = []
  const ecc: number[][] = []
  for (let b = 0; b < blocks; b += 1) {
    const block = dataCodewords.slice(b * dataPerBlock, (b + 1) * dataPerBlock)
    data.push(block)
    ecc.push(reedSolomon(block, ecPerBlock))
  }

  const out: number[] = []
  for (let i = 0; i < dataPerBlock; i += 1) for (const block of data) out.push(block[i] as number)
  for (let i = 0; i < ecPerBlock; i += 1) for (const block of ecc) out.push(block[i] as number)
  return out
}

/* ───────────────────────────── the matrix ───────────────────────────── */

class Grid {
  readonly size: number
  readonly modules: boolean[][]
  readonly isFunction: boolean[][]

  constructor(version: number) {
    this.size = 17 + 4 * version
    this.modules = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false))
    this.isFunction = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false),
    )
  }

  /** `(x = column, y = row)`, matching the specification's own coordinates. */
  setFunction(x: number, y: number, dark: boolean): void {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return
    ;(this.modules[y] as boolean[])[x] = dark
    ;(this.isFunction[y] as boolean[])[x] = true
  }
}

function drawFinder(grid: Grid, cx: number, cy: number): void {
  /* One loop draws the 7×7 pattern **and** its separator: at Chebyshev
     distance 2 and 4 the modules are light, everywhere else dark. */
  for (let dy = -4; dy <= 4; dy += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy))
      grid.setFunction(cx + dx, cy + dy, dist !== 2 && dist !== 4)
    }
  }
}

function drawAlignment(grid: Grid, cx: number, cy: number): void {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      grid.setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
    }
  }
}

/** The 15 format bits for a level and a mask: BCH(15,5), then the fixed XOR mask. */
export function formatBits(mask: number): number {
  const data = (ECL_FORMAT_BITS << 3) | mask
  let rem = data
  for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
  return ((data << 10) | rem) ^ 0x5412
}

function drawFormat(grid: Grid, mask: number): void {
  const bits = formatBits(mask)
  const bit = (i: number) => ((bits >>> i) & 1) !== 0

  for (let i = 0; i <= 5; i += 1) grid.setFunction(8, i, bit(i))
  grid.setFunction(8, 7, bit(6))
  grid.setFunction(8, 8, bit(7))
  grid.setFunction(7, 8, bit(8))
  for (let i = 9; i < 15; i += 1) grid.setFunction(14 - i, 8, bit(i))

  for (let i = 0; i < 8; i += 1) grid.setFunction(grid.size - 1 - i, 8, bit(i))
  for (let i = 8; i < 15; i += 1) grid.setFunction(8, grid.size - 15 + i, bit(i))
  /* The one module that is always dark. */
  grid.setFunction(8, grid.size - 8, true)
}

function drawFunctionPatterns(grid: Grid, version: number): void {
  for (let i = 0; i < grid.size; i += 1) {
    grid.setFunction(6, i, i % 2 === 0)
    grid.setFunction(i, 6, i % 2 === 0)
  }
  drawFinder(grid, 3, 3)
  drawFinder(grid, grid.size - 4, 3)
  drawFinder(grid, 3, grid.size - 4)

  const centres = ALIGNMENT[version - 1] as readonly number[]
  const first = centres[0]
  const last = centres[centres.length - 1]
  for (const cy of centres) {
    for (const cx of centres) {
      /* The three that would sit on a finder are omitted, not overwritten. */
      if ((cx === first && cy === first) || (cx === first && cy === last) || (cx === last && cy === first)) {
        continue
      }
      drawAlignment(grid, cx, cy)
    }
  }
  drawFormat(grid, 0) // reserved; rewritten once the mask is chosen
}

function drawCodewords(grid: Grid, codewords: readonly number[]): void {
  let i = 0
  for (let right = grid.size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5 // the vertical timing column is skipped whole
    for (let vert = 0; vert < grid.size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? grid.size - 1 - vert : vert
        if (!(grid.isFunction[y] as boolean[])[x] && i < codewords.length * 8) {
          const byte = codewords[i >>> 3] as number
          ;(grid.modules[y] as boolean[])[x] = ((byte >>> (7 - (i & 7))) & 1) !== 0
          i += 1
        }
      }
    }
  }
}

const MASKS: ReadonlyArray<(x: number, y: number) => boolean> = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => ((((x * y) % 2) + ((x * y) % 3)) % 2) === 0,
  (x, y) => ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0,
]

function applyMask(grid: Grid, mask: number): void {
  const fn = MASKS[mask] as (x: number, y: number) => boolean
  for (let y = 0; y < grid.size; y += 1) {
    for (let x = 0; x < grid.size; x += 1) {
      if (!(grid.isFunction[y] as boolean[])[x] && fn(x, y)) {
        ;(grid.modules[y] as boolean[])[x] = !(grid.modules[y] as boolean[])[x]
      }
    }
  }
}

/**
 * The specification's four penalty rules. **Cosmetic, not correctness**: every
 * mask decodes, because the mask number travels in the format bits. Choosing
 * the least-penalised one is what stops a code with long same-colour runs or a
 * false finder pattern in it, which is what a phone actually struggles with.
 */
function penalty(grid: Grid): number {
  const n = grid.size
  const dark = (x: number, y: number) => (grid.modules[y] as boolean[])[x] === true
  let score = 0

  // Rule 1 — runs of five or more in a row or a column.
  for (let line = 0; line < n; line += 1) {
    for (const vertical of [false, true]) {
      const at = (i: number) => (vertical ? dark(line, i) : dark(i, line))
      let run = 1
      for (let i = 1; i < n; i += 1) {
        if (at(i) === at(i - 1)) {
          run += 1
          if (run === 5) score += 3
          else if (run > 5) score += 1
        } else run = 1
      }
    }
  }

  // Rule 2 — every 2×2 block of one colour.
  for (let y = 0; y < n - 1; y += 1) {
    for (let x = 0; x < n - 1; x += 1) {
      const c = dark(x, y)
      if (c === dark(x + 1, y) && c === dark(x, y + 1) && c === dark(x + 1, y + 1)) score += 3
    }
  }

  // Rule 3 — the 1:1:3:1:1 finder-like pattern with four light modules beside it.
  const finder = [true, false, true, true, true, false, true]
  const matches = (get: (i: number) => boolean, i: number): boolean => {
    for (let k = 0; k < 7; k += 1) if (get(i + k) !== (finder[k] as boolean)) return false
    const before = [i - 4, i - 3, i - 2, i - 1].every((k) => k < 0 || !get(k))
    const after = [i + 7, i + 8, i + 9, i + 10].every((k) => k >= n || !get(k))
    return before || after
  }
  for (let line = 0; line < n; line += 1) {
    for (let j = 0; j + 7 <= n; j += 1) {
      if (matches((k) => dark(k, line), j)) score += 40
      if (matches((k) => dark(line, k), j)) score += 40
    }
  }

  // Rule 4 — deviation of the dark-module proportion from one half.
  let darkCount = 0
  for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) if (dark(x, y)) darkCount += 1
  const percent = (darkCount * 100) / (n * n)
  score += Math.floor(Math.abs(percent - 50) / 5) * 10
  return score
}

/**
 * `otpauth://…` in, a matrix out.
 *
 * **Throws** for a payload above `MAX_QR_BYTES`, which the caller treats as
 * *"draw the secret alone"* rather than as an error state — §5.1 already puts
 * the manual path beside the square.
 */
export function qrMatrix(text: string): QrCode {
  const bytes = utf8(text)
  const version = versionFor(bytes.length)
  const { blocks, ecPerBlock, dataPerBlock } = blockLayout(version)
  const codewords = interleave(bitsToBytes(encodeBits(bytes, blocks * dataPerBlock)), version)
  void ecPerBlock

  let best: { grid: Grid; mask: number; score: number } | null = null
  for (let mask = 0; mask < 8; mask += 1) {
    const grid = new Grid(version)
    drawFunctionPatterns(grid, version)
    drawCodewords(grid, codewords)
    applyMask(grid, mask)
    drawFormat(grid, mask)
    const score = penalty(grid)
    if (best === null || score < best.score) best = { grid, mask, score }
  }

  const chosen = best as { grid: Grid; mask: number; score: number }
  return { size: chosen.grid.size, version, mask: chosen.mask, modules: chosen.grid.modules }
}
