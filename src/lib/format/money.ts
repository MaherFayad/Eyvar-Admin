/**
 * The **only** money formatter in the product. DESIGN.md §8.3.1 / §8.3.2,
 * design spec 00-shell §9.2 and §18.
 *
 * The legacy app has at least three formatters (`fmtSAR()` at
 * `eyvar_ops_panel_v40_fixed.html:4394`, an identical `fmt()` at `:12985`, and raw
 * `.toFixed(2)+' SAR'` inline at `:6693`) across 87 money strings. That is what
 * this file replaces. Adding a second one is the defect, not the fix.
 *
 * The rules, all of them, in one place:
 *
 * | Property   | Rule                                                        |
 * |------------|-------------------------------------------------------------|
 * | Input      | **integer minor units** (`Halalas`, 1 SAR = 100). Never a float |
 * | Unit       | ISO code `SAR`, **trailing**, one space. Never the ﷼ glyph   |
 * | Decimals   | exactly 2, always. Never trimmed, never rounded to whole     |
 * | Thousands  | `,` every three digits                                       |
 * | Negative   | **U+2212** `−` immediately before the digits, no space        |
 * | Zero       | `0.00 SAR` — `—` means *absent*, never *no money*             |
 * | Arabic     | identical character order; the cell aligns, the string does not (AC-73) |
 *
 * **Not this function's job, deliberately:**
 * - `—` for an absent value. Export `ABSENT` is here so every screen uses the
 *   same em dash, but `formatMoney` never returns it — a formatter that can
 *   return "no value" makes `0.00 SAR` and "unknown" the same call.
 * - `tabular-nums`. That is a CSS class on the cell, not a character.
 * - Colour. §8.3.2: sign is typographic, never chromatic, and a negative amount
 *   MUST NOT be placed in a badge or pill of any tone.
 * - Bidi isolation. A trailing `SAR` after a digit run is two LTR runs and does
 *   not reorder, but at a boundary with Arabic prose the *component* wraps it in
 *   `<bdi>`. Embedding U+2068/U+2069 here would poison copy-paste and assertions.
 *
 * **The trap, restated:** §4.2's currency-*prefix* rule governs money **inputs**
 * only. A money input carries `SAR` as an in-field inline-start prefix; a money
 * output carries it trailing. Two different rules, one field type.
 */

import type { CurrencyCode, Halalas } from '@/data/types/common'
import { invariant } from '../invariant'

/** U+2212. Not a hyphen-minus, not a figure dash. §8.3.2. */
export const MINUS_SIGN = '\u2212'

/**
 * U+2014, the em dash that means **not applicable / unknown**.
 * Exported so 34 screens spell "absent" the same way. `formatMoney` never
 * returns it; a caller holding `null` renders this instead of calling at all.
 */
export const ABSENT = '\u2014'

export interface FormatMoneyOptions {
  /**
   * `'code'` (default) appends ` SAR`. `'none'` returns the bare number, for
   * table cells whose **column header** already carries `(SAR)` — §8.3.1:
   * inside a table the unit appears once, in the header, and never in the cells.
   */
  unit?: 'code' | 'none'
  /** ISO-4217. Saudi-only today; the parameter exists so it stays that way by choice. */
  currency?: CurrencyCode
}

/**
 * The number half is formatted with a **fixed** `en-GB-u-nu-latn` locale in both
 * languages, on purpose: §8.3.1 fixes `,` thousands and `.` decimals, and AC-73
 * requires a money value to read in the same character order in Arabic as in
 * English. Passing the UI language here is how that guarantee gets lost.
 */
const groupFormatter = new Intl.NumberFormat('en-GB-u-nu-latn', {
  numberingSystem: 'latn',
  useGrouping: true,
  maximumFractionDigits: 0,
})

/**
 * @param minorUnits integer halalas. `1234` renders `12.34 SAR`.
 *
 * Throws on a non-integer. `Halalas` is a type alias, not a nominal type, so a
 * major-unit float still type-checks — this runtime guard is what actually stops
 * `formatMoney(12.34)` from rendering `0.12 SAR`.
 */
export function formatMoney(minorUnits: Halalas, options: FormatMoneyOptions = {}): string {
  const { unit = 'code', currency = 'SAR' } = options

  invariant(Number.isFinite(minorUnits), `formatMoney needs a finite amount, got ${minorUnits}.`)
  invariant(
    Number.isInteger(minorUnits),
    `formatMoney takes integer minor units (halalas), got ${minorUnits}. ` +
      'Money is never a float — DESIGN.md §8.3.1.',
  )

  const magnitude = Math.abs(minorUnits)
  // Integer arithmetic, not `magnitude / 100`: dividing first loses the last
  // digit on large ledger totals long before Number.MAX_SAFE_INTEGER.
  const major = Math.trunc(magnitude / 100)
  const minor = magnitude % 100

  // `minorUnits < 0` and not `!== 0`, so -0 renders `0.00`, never `−0.00`.
  const sign = minorUnits < 0 ? MINUS_SIGN : ''
  const digits = `${sign}${groupFormatter.format(major)}.${String(minor).padStart(2, '0')}`

  return unit === 'none' ? digits : `${digits} ${currency}`
}
