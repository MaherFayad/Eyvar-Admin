/**
 * **Pseudo-localisation** — the build mode that makes an Arabic defect fail a
 * build instead of a review.
 *
 * ## Why this exists before Arabic does
 *
 * `src/i18n/dictionaries.ts` ships `AR = {}` on purpose, so every screen renders
 * English today. That is a deliberate content decision — but it also means the
 * three failure modes Arabic will expose are **completely invisible right now**:
 *
 *  1. **An unkeyed string.** A literal typed straight into JSX renders
 *     identically to a translated one. Nothing distinguishes them by eye.
 *  2. **A concatenated sentence (AC-75).** `t('sla.past') + count` looks correct
 *     in English and is ungrammatical in Arabic at four of its six plural
 *     categories.
 *  3. **A box that cannot take the width.** Arabic runs **4–8% wider** than
 *     English at the same point size (`design/18` §2.2 A4), against an identity
 *     column that already collapses to 38px at 1280 (`docs/ref/table.md` T2).
 *
 * All three are found the same way: render every keyed string through a
 * transform that **marks it** and **lengthens it**, then look. A string that
 * comes out plain was never keyed. A sentence with a bracket in the middle of it
 * was assembled from parts. A box that clips at +35% will clip at +8% too, on a
 * bad day, in a longer word.
 *
 * **The whole point is that this runs before a translator writes a word.** If
 * Arabic ships first, every one of these gets logged as "the Arabic is broken"
 * and the translator gets blamed for a layout bug that predates them.
 *
 * ## Turning it on
 *
 * ```bash
 * npm run dev:pseudo          # VITE_PSEUDO_LOCALE=1 vite
 * npm run build:pseudo        # a shippable bundle in pseudo, for a preview host
 * ```
 *
 * In dev, `?pseudo=1` on any URL does the same thing without a restart — a
 * review affordance, gated on `isDevEnvironment()` so a production build can
 * never be garbled by a query string.
 *
 * Combine it with the language switch for the full picture: `ar` gives you RTL
 * geometry and the Naskh type ramp, pseudo gives you the width. Neither needs a
 * dictionary.
 *
 * ## What the output looks like
 *
 * ```
 * 'Save changes'            ->  '⟦Šàvé çhàñgéš ṗšéûḋ⟧'
 * '{count} trips'           ->  '⟦{count} ţŕîṗš ṗš⟧'
 * ''                        ->  ''
 * ```
 *
 * Three properties, each load-bearing:
 *
 * - **`⟦ ⟧` bracket every keyed string.** Unbracketed text on screen is either
 *   data or an unkeyed literal — and the two are easy to tell apart, because one
 *   of them is a sentence. A bracket appearing *inside* a rendered sentence is
 *   AC-75's failure caught by eye.
 * - **Accented look-alikes, not gibberish.** The string stays readable, so a
 *   reviewer can still tell which screen they are on and QA can still follow a
 *   script. Cyrillic or box-drawing pseudo-locales fail that test.
 * - **+35% length, never less.** More than Arabic's 4–8% on purpose: a layout
 *   that survives +35% has headroom, and one that fails it is a layout with none
 *   left for a long captain name either.
 *
 * ## What it must never break
 *
 * `{placeholder}` runs pass through **byte-identical**. `interpolate` throws on
 * a placeholder with no matching parameter (AC-75's guard), so mangling one
 * would turn every pseudo run into a crash rather than a finding. The
 * substitution is why the transform splits on the placeholder pattern rather
 * than mapping the string character by character.
 */

import { isDevEnvironment } from '../invariant'

/** The same `{name}` pattern `translate.ts` interpolates. Kept in sync by `pseudo.test.ts`. */
const PLACEHOLDER = /(\{\w+\})/g

/** How much longer than the source, as a fraction. Arabic is 4–8%; this over-shoots on purpose. */
export const PSEUDO_EXPANSION = 0.35

export const PSEUDO_OPEN = '⟦'
export const PSEUDO_CLOSE = '⟧'

/**
 * Padding glyphs, cycled. Deliberately average-width Latin rather than `·` or
 * `~`: the point of the padding is to *measure* a box, and narrow filler would
 * report 35% more characters at 15% more pixels.
 */
const PAD = 'ṗšéûḋö'

/**
 * ASCII letters to accented look-alikes. Latin-1 and Latin Extended-A only, so
 * every glyph is present in Inter and nothing falls back to a system face and
 * changes the width being measured.
 */
const MAP: Readonly<Record<string, string>> = {
  a: 'à', b: 'ƀ', c: 'ç', d: 'ď', e: 'é', f: 'ƒ', g: 'ğ',
  h: 'ĥ', i: 'î', j: 'ĵ', k: 'ķ', l: 'ĺ', m: 'ḿ', n: 'ñ',
  o: 'ö', p: 'ṗ', q: 'ơ', r: 'ŕ', s: 'š', t: 'ţ', u: 'û',
  v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ż',
  A: 'À', B: 'Ɓ', C: 'Ç', D: 'Ď', E: 'É', F: 'Ƒ', G: 'Ğ',
  H: 'Ĥ', I: 'Î', J: 'Ĵ', K: 'Ķ', L: 'Ĺ', M: 'Ḿ', N: 'Ñ',
  O: 'Ö', P: 'Ṗ', Q: 'Ơ', R: 'Ŕ', S: 'Š', T: 'Ţ', U: 'Û',
  V: 'Ṽ', W: 'Ŵ', X: 'Ẋ', Y: 'Ý', Z: 'Ż',
}

/**
 * Marks and lengthens one template. Idempotent-safe to call on any string; an
 * empty template returns empty, because bracketing `''` would give a label a
 * width it does not have and report a layout defect that is not there.
 *
 * @param template the English source, placeholders included
 */
export function pseudoLocalise(template: string): string {
  if (template === '') return ''

  /* Split rather than replace: the odd-indexed parts are `{placeholder}` runs
     and must survive untouched or `interpolate` throws instead of reporting. */
  const parts = template.split(PLACEHOLDER)
  let literal = 0
  const accented = parts
    .map((part, index) => {
      if (index % 2 === 1) return part
      literal += part.length
      return part.replace(/[A-Za-z]/g, (ch) => MAP[ch] ?? ch)
    })
    .join('')

  /* Budget from the literal length, not the template length: `{count}` renders
     as a number of unknown width and padding for its seven source characters
     would overstate every count-bearing string. Minimum one, so a two-letter
     label still carries visible growth. */
  const pad = Math.max(1, Math.ceil(literal * PSEUDO_EXPANSION))
  let tail = ''
  while (tail.length < pad) tail += PAD
  return `${PSEUDO_OPEN}${accented} ${tail.slice(0, pad)}${PSEUDO_CLOSE}`
}

function readFlag(): boolean {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    if (env?.VITE_PSEUDO_LOCALE === '1' || env?.VITE_PSEUDO_LOCALE === 'true') return true
  } catch {
    /* not a module graph with import.meta.env — a bare Node script or a unit test */
  }
  const node = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  if (node?.VITE_PSEUDO_LOCALE === '1') return true

  /* The review affordance. Dev only: a production console must not be garbled
     by a pasted URL, and a screenshot of one would be indistinguishable from a
     real defect. */
  if (!isDevEnvironment()) return false
  const search = (globalThis as { location?: { search?: string } }).location?.search
  return typeof search === 'string' && /[?&]pseudo=1\b/.test(search)
}

/**
 * Read once per module load. `createTranslator` captures the answer in its
 * closure, so flipping the flag is a page reload — which is what `?pseudo=1`
 * already costs.
 */
let enabled: boolean | undefined

export function isPseudoLocaleEnabled(): boolean {
  enabled ??= readFlag()
  return enabled
}

/** Test seam. Nothing in the app calls this. */
export function setPseudoLocaleEnabled(value: boolean | undefined): void {
  enabled = value
}
