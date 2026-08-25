/**
 * The **one** numeric coercion for a form field. Input side; `format/*` is the
 * output side.
 *
 * `DESIGN.md` §8.2.5, verbatim:
 *
 * > Exactly one numeric coercion function MUST serve both preview and save. Two
 * > functions with different blank-field semantics (`gv()` at `:12984` returns 0;
 * > `numval()` at `:6150` returns the previous value) MUST NOT ship.
 *
 * The legacy defect is real and worth naming, because it is the kind of bug an
 * operator cannot report coherently: `gv()`
 * (`eyvar_ops_panel_v40_fixed.html:12984`) is `parseFloat(...)||0`, so a blank
 * discount field previews as **0 %**; `numval()` (`:6150`) returns the *stored*
 * value on a blank field, so the same blank discount **saves as whatever was
 * there before**. The operator clears the field, watches the preview drop, saves,
 * and gets something else entirely. Two functions, two answers, one form.
 *
 * Here there is one function and one answer: **blank is `null`**. Not `0`, which
 * is a real discount; not the previous value, which is a lie. `null` flows into
 * the derived-value chain and §8.2's *"no computable result renders an em-dash,
 * never `0`, never blank"* falls out of it.
 *
 * `||0` is also wrong for a second reason the legacy app never hit: it cannot
 * tell "the operator typed zero" from "the operator typed nothing", and a save
 * bar has to know the difference.
 *
 * **Arabic path (§9.2).** An operator on an Arabic keyboard types Arabic-Indic
 * digits with U+066B as the decimal separator. The digits do not mirror, but
 * they are not U+0030..U+0039 either, so `parseFloat` returns `NaN` and — through
 * `||0` — the form silently reads zero. Arabic-Indic (U+0660) and extended
 * Arabic-Indic (U+06F0) digits, U+066B, the Arabic thousands separator U+066C
 * and the bidi control characters a copy-paste drags along are all normalised
 * here, in one place, rather than in 225 input handlers.
 *
 * Separator convention is fixed by §8.3.1, not by locale: `,` groups, `.`
 * decimates. That makes `parseNumericInput` the exact inverse of `formatMoney`'s
 * number half — including its U+2212 minus — so a value can round-trip through
 * the UI without changing.
 *
 * Several separators below are invisible or near-invisible characters. Each
 * regex therefore carries a comment naming its code points, because a character
 * class nobody can see in a diff is a character class nobody can review.
 */

import type { Halalas } from '@/data/types/common'

/** U+0660..U+0669 and U+06F0..U+06F9 both render as Arabic-Indic digits. */
const DIGIT_OFFSETS = [0x0660, 0x06f0] as const

/**
 * Zero-width and directional marks. A value copied out of an RTL paragraph
 * arrives wrapped in these and looks identical to one that is not.
 * LRM, RLM, ALM, the four isolates, and the five embedding/override controls.
 */
const BIDI_CONTROLS = /[‎‏؜⁦-⁩‪-‮]/g

/**
 * Group separators. ASCII comma, Arabic thousands separator U+066C, NBSP,
 * narrow NBSP, thin space, plain space, and the Swiss apostrophe a pasted
 * spreadsheet cell brings with it.
 */
const GROUP_SEPARATORS = /[,٬    ']/g

/** U+2212 minus (what `formatMoney` emits) plus the dashes a paste brings. */
const MINUS_LIKE = /[−‒–—‐‑]/g

/** U+066B, the Arabic decimal separator. */
const ARABIC_DECIMAL = /٫/g

/** Sign, integer part, optional fraction. No exponent — see the note below. */
const NUMERIC = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/

/**
 * Arabic-Indic and extended Arabic-Indic digits to `0-9`. Everything else is
 * returned unchanged — this is not a transliterator.
 */
export function toLatinDigits(input: string): string {
  let out = ''
  for (const char of input) {
    const code = char.codePointAt(0)
    if (code === undefined) continue
    let mapped = char
    for (const base of DIGIT_OFFSETS) {
      if (code >= base && code <= base + 9) {
        mapped = String.fromCharCode(0x30 + (code - base))
        break
      }
    }
    out += mapped
  }
  return out
}

/**
 * Everything except the parse: strip bidi marks, latinise digits, normalise the
 * separators and the minus sign, and validate the shape.
 *
 * Returns the canonical `[+-]?ddd(.ddd)?` string, or `null` if the input is not
 * a number the operator could have meant.
 */
function canonicalise(raw: string): string | null {
  const stripped = toLatinDigits(raw.replace(BIDI_CONTROLS, '')).trim()
  if (stripped === '') return null

  const normalised = stripped
    .replace(MINUS_LIKE, '-')
    .replace(ARABIC_DECIMAL, '.')
    .replace(GROUP_SEPARATORS, '')

  return NUMERIC.test(normalised) ? normalised : null
}

/**
 * A typed number, or `null` for blank and for anything that is not one.
 *
 * `null` means **"no value"** and covers both cases on purpose: to a form, a
 * cleared field and a field holding `12px` are the same thing — there is nothing
 * to compute with. The distinction the operator needs is made by the field's
 * validation message, not by the coercion.
 *
 * Exponent notation (`1e5`) is rejected. Nobody types it into a price field, and
 * accepting it means a slipped keystroke turns 1 SAR into 100,000.
 */
export function parseNumericInput(raw: string): number | null {
  const canonical = canonicalise(raw)
  if (canonical === null) return null
  const value = Number(canonical)
  return Number.isFinite(value) ? value : null
}

/**
 * A typed **major-unit** amount to integer `Halalas`, or `null` for blank.
 *
 * §8.3 and `src/data/types/common.ts`: money is *"always an integer count of
 * halalas... never a float"*, and `formatMoney` throws on a non-integer rather
 * than render `0.12 SAR` for `12.34`. The operator types major units, so this
 * conversion is precisely where the float would get in, and it is the only place
 * that has to be right.
 *
 * The conversion is done on the **digit string**, not by `value * 100`:
 * `19.99 * 100` is `1998.9999999999998` in IEEE-754 and `Math.round` hides that
 * until it does not. Splitting `19` and `99` cannot be off by a halala.
 *
 * A third decimal is rounded half-away-from-zero (`12.345` to `1235`,
 * `-12.345` to `-1235`) rather than rejected: an amount pasted from a
 * spreadsheet should land somewhere defined, and rounding is what a ledger does.
 */
export function parseMoneyInput(raw: string): Halalas | null {
  const canonical = canonicalise(raw)
  if (canonical === null) return null

  const negative = canonical.startsWith('-')
  const unsigned = canonical.replace(/^[+-]/, '')
  const [integerPart = '', fractionPart = ''] = unsigned.split('.')

  const integer = integerPart === '' ? 0 : Number(integerPart)
  const padded = fractionPart.padEnd(3, '0')
  const halalaDigits = Number(padded.slice(0, 2))
  const roundingDigit = Number(padded.slice(2, 3))

  const magnitude = integer * 100 + halalaDigits + (roundingDigit >= 5 ? 1 : 0)
  if (!Number.isSafeInteger(magnitude)) return null

  // `|| 0` here is not the legacy coercion: it only collapses -0 to 0, which
  // §8.3.1 requires anyway (a negative zero must never render as a signed zero).
  return (negative ? -magnitude : magnitude) || 0
}
