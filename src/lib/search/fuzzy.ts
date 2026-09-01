/**
 * Fuzzy matching for global search — `OPERATOR-EXPERIENCE-PLAN.md` §0.1
 * finding 3 and **P3-T1**; the ranking half of design spec §4.3.4.
 *
 * **Why this exists.** Global search matched with `String.prototype.includes()`,
 * so an operator who typed `csptain` got nothing, and `cmdk`'s own fuzzy filter
 * is deliberately switched off (`shouldFilter={false}`) because filtering is the
 * *server's* job — the client must not re-rank what the server sent, or the day
 * the real `GET /api/v1/search` lands the two disagree. So the tolerance has to
 * live below the seam, in a pure function the mock client and the real endpoint
 * can both be held to. That is this file.
 *
 * **Four properties, and every one of them is a defect report, not a nicety:**
 *
 *   1. **A transposition costs one edit, not two.** `captian` → `captain` is
 *      the single most common typing error and plain Levenshtein prices it as
 *      two substitutions, which pushes it past any sane tolerance for a
 *      seven-letter word. Bounded Damerau–Levenshtein (OSA form) prices it at
 *      one. The bound matters as much as the metric: a long non-match must bail
 *      after a few rows rather than filling an n×m table.
 *
 *   2. **Where the match lands is part of how good it is.** `ride` at the start
 *      of `Riders` is a stronger statement of intent than `ride` inside
 *      `Overridden fare`. Position is scored, not ignored, so a prefix outranks
 *      a word start which outranks a mid-word hit.
 *
 *   3. **Token order is not intent.** An operator who remembers a family name
 *      before a given name types `harbi nora`. Tokens are matched
 *      independently, all of them must hit, and being in order is worth a small
 *      tiebreak rather than being a requirement.
 *
 *   4. **Riyadh operators type both scripts and both digit sets.** The
 *      normaliser folds harakat, tatweel, `ة→ه`, `ى→ي`, `أ إ آ ٱ→ا`, Latin
 *      combining accents, bidi controls, and Arabic-Indic digits, on **both
 *      sides** of every comparison. §9.2's "digits do not mirror" is a rendering
 *      rule; this is its matching counterpart, and it belongs in code rather
 *      than in a review comment.
 *
 * **It returns a score, never a boolean** (P3-T4). Entities, destinations and
 * commands are three different shapes of thing and the palette has to interleave
 * them in one list; that is only possible if every kind is reduced to one
 * comparable number. A boolean forces the caller to invent the comparison, and
 * every caller invents a different one — which is exactly how the hardcoded
 * 100/80/60/70/75 constants this replaces came to exist.
 *
 * Pure, dependency-free, and no `Date`/`Math.random` — it is called from
 * `src/data`, which has a test asserting determinism.
 */

import { toLatinDigits } from '../parse/input'

/* ────────────────────────────── the contract ────────────────────────────── */

/** A half-open `[start, end)` slice of the **original** candidate string. */
export interface MatchRange {
  start: number
  end: number
}

export interface MatchDetail {
  /** `0` = no match. Otherwise `(0, 1]`, comparable across every kind of result. */
  score: number
  /**
   * Where the query landed, in the original candidate's own indices, so a UI
   * can highlight without re-running the match.
   *
   * Exact for a substring hit. **Approximate for a fuzzy hit** — the DP knows
   * where a match ended and how many edits it took, and reconstructing the exact
   * start needs a backtrack this does not do. The window it returns always
   * contains the match; it may be a character or two wide.
   */
  ranges: readonly MatchRange[]
}

const NO_MATCH: MatchDetail = { score: 0, ranges: [] }

/**
 * Below this, a "match" is noise the operator has to read past.
 *
 * Applied inside `matchScore`/`matchDetail` rather than left to callers on
 * purpose: a floor that each caller re-invents is a floor that each caller gets
 * slightly wrong, and the palette's job is to be *shorter* than the screen.
 * The number is set just under the weakest hit worth showing — a one-edit fuzzy
 * hit on a four-character token in the middle of a word.
 */
export const MIN_MATCH_SCORE = 0.2

/* ───────────────────────────── normalisation ────────────────────────────── */

/**
 * Harakat and the Quranic marks: fathatan…sukun, superscript alef, and the
 * U+06D6–U+06ED block. An operator never types these; a fixture may carry them.
 */
const ARABIC_MARK = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/

/** U+0640 — a justification stretcher, never a letter. */
const TATWEEL = '\u0640'

/** LRM/RLM, ALM, the embedding/override block, and the isolates. A paste brings them. */
const BIDI_CONTROL = /[\u200B\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/

/** Latin combining accents, left over after NFD. `Zoë` → `zoe`. */
const COMBINING_MARK = /[\u0300-\u036F]/g

/**
 * Orthographic variants an operator will not distinguish and a data-entry
 * clerk did not either.
 *
 * `ٱ` (alef wasla) is folded with the other alefs even though it is rarer than
 * the three §P3-T1 names — it is the same letter wearing a different hat, and
 * leaving it out would make one Quranic-styled fixture unfindable for no reason.
 */
const ARABIC_FOLD: Readonly<Record<string, string>> = {
  'ة': 'ه', // ta marbuta -> ha
  'ى': 'ي', // alef maksura -> ya
  'أ': 'ا', // alef with hamza above -> alef
  'إ': 'ا', // alef with hamza below -> alef
  'آ': 'ا', // alef with madda -> alef
  'ٱ': 'ا', // alef wasla -> alef
}

const ALPHANUMERIC = /[\p{L}\p{N}]/u

/**
 * The normalised text plus, for each of its UTF-16 units, the index in the
 * original string it came from. The map is what lets `ranges` be reported in
 * the caller's own coordinates even though normalisation deletes characters.
 */
interface NormalizedText {
  text: string
  /** `map[i]` is the original index of `text[i]`. Same length as `text`. */
  map: readonly number[]
}

const EMPTY_NORMALIZED: NormalizedText = { text: '', map: [] }

function normalizeWithMap(input: string): NormalizedText {
  let text = ''
  const map: number[] = []

  for (let i = 0; i < input.length; i += 1) {
    const raw = input[i]!
    if (raw === TATWEEL || BIDI_CONTROL.test(raw) || ARABIC_MARK.test(raw)) continue

    if (/\s/.test(raw)) {
      // Runs of whitespace collapse to one separator; a leading one is dropped.
      if (text === '' || text.endsWith(' ')) continue
      text += ' '
      map.push(i)
      continue
    }

    const folded = toLatinDigits(ARABIC_FOLD[raw] ?? raw)
      .toLowerCase()
      .normalize('NFD')
      .replace(COMBINING_MARK, '')

    // Iterated by UTF-16 unit, not by code point: `text` is indexed that way and
    // the map has to stay aligned with it for an astral character too.
    for (let k = 0; k < folded.length; k += 1) {
      text += folded[k]!
      map.push(i)
    }
  }

  if (text.endsWith(' ')) {
    text = text.slice(0, -1)
    map.pop()
  }
  return { text, map }
}

/**
 * Lowercased, accent-folded, Arabic-folded, Latin-digit, single-spaced.
 *
 * Exported because the same folding has to be applied to anything compared
 * *outside* this module — a scope chip, a saved-view name — and a second
 * implementation of it is a second set of Arabic bugs.
 */
export function normalizeSearchText(input: string): string {
  return normalizeWithMap(input).text
}

/** The alphanumeric skeleton, still mapped back to the original string. */
function compactOf(source: NormalizedText): NormalizedText {
  let text = ''
  const map: number[] = []
  for (let i = 0; i < source.text.length; i += 1) {
    const char = source.text[i]!
    if (!ALPHANUMERIC.test(char)) continue
    text += char
    map.push(source.map[i]!)
  }
  return { text, map }
}

function stripNonAlphanumeric(token: string): string {
  let out = ''
  for (const char of token) if (ALPHANUMERIC.test(char)) out += char
  return out
}

/* ─────────────────────── bounded Damerau–Levenshtein ────────────────────── */

/**
 * Optimal string alignment distance — Levenshtein plus **adjacent
 * transposition at cost 1** — computed inside a diagonal band of width
 * `maxDistance`.
 *
 * Returns `maxDistance + 1` as a sentinel for "further apart than you asked
 * about". That is the whole point of the bound: the caller only ever cares
 * whether a candidate is within tolerance, and a query that is nowhere near
 * one should cost a few rows, not `a.length × b.length` cells.
 *
 * OSA rather than true Damerau–Levenshtein: true DL also prices
 * `ab → ba` when other edits intervene, needs an alphabet-sized last-occurrence
 * table, and differs from OSA only on inputs no operator produces by mistake.
 */
export function editDistance(a: string, b: string, maxDistance = Math.max(a.length, b.length)): number {
  const overflow = maxDistance + 1
  if (maxDistance < 0) return overflow

  const n = a.length
  const m = b.length
  if (Math.abs(n - m) > maxDistance) return overflow
  if (n === 0) return m <= maxDistance ? m : overflow
  if (m === 0) return n <= maxDistance ? n : overflow

  /* Three rolling rows: i-1 and i-2 (the transposition needs the row before
     last), plus the one being filled. Everything outside the band is `overflow`,
     which makes it inert in the `Math.min` below without a special case. */
  const rows: number[][] = [
    new Array<number>(m + 1).fill(overflow),
    new Array<number>(m + 1).fill(overflow),
    new Array<number>(m + 1).fill(overflow),
  ]
  for (let j = 0; j <= Math.min(m, maxDistance); j += 1) rows[0]![j] = j

  for (let i = 1; i <= n; i += 1) {
    const current = rows[i % 3]!
    const previous = rows[(i - 1) % 3]!
    const beforeThat = rows[(i + 1) % 3]! // (i - 2) mod 3
    current.fill(overflow)
    current[0] = i <= maxDistance ? i : overflow

    const from = Math.max(1, i - maxDistance)
    const to = Math.min(m, i + maxDistance)
    let rowBest = current[0]!

    for (let j = from; j <= to; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, beforeThat[j - 2]! + 1)
      }
      if (value > overflow) value = overflow
      current[j] = value
      if (value < rowBest) rowBest = value
    }

    if (rowBest > maxDistance) return overflow
  }

  const answer = rows[n % 3]![m]!
  return answer > maxDistance ? overflow : answer
}

/* ──────────────────────────── locating a token ──────────────────────────── */

type PositionKind = 'start' | 'word' | 'inner'

/**
 * What a hit is worth before anything else is applied.
 *
 * The gap between `start` and `word` is deliberately small — both are the
 * beginning of *something* the operator can see. The gap down to `inner` is
 * large, because a mid-word hit is usually a coincidence: `ride` inside
 * `Overridden` is not what anyone meant.
 */
const POSITION_QUALITY: Readonly<Record<PositionKind, number>> = {
  start: 1,
  word: 0.9,
  inner: 0.7,
}

/**
 * A fuzzy hit can never outrank an exact one **on the same candidate**. `0.6`
 * is chosen so the best possible fuzzy hit — one edit, at the very start, on a
 * long token — lands below `POSITION_QUALITY.inner`, the worst possible exact
 * hit. An operator who typed a word correctly should never be shown the word
 * they mistyped first.
 *
 * Across *different* candidates a long fuzzy hit can still beat a short exact
 * one, because coverage applies afterwards and says so: `subscriptian` against
 * `Subscriptions` is a better answer than `ride` inside `Overridden fare`, and
 * pretending otherwise would be the wrong result, not a stricter rule.
 */
const FUZZY_QUALITY = 0.6

/**
 * Out-of-order tokens still match (property 3) — `harbi nora` finds
 * `Nora Al-Harbi`. They are docked a hair so that, between two candidates that
 * are otherwise identical, the one the operator typed in order comes first.
 */
const OUT_OF_ORDER_PENALTY = 0.95

/**
 * How much of the candidate the query accounts for. `captain` *is* the whole of
 * `Captains`; it is one word of `Captains and riders, from application to
 * compliance`. Both should match, the first more strongly. The floor keeps this
 * a tiebreak rather than a filter — a long title is not a worse answer, it is a
 * less specific one.
 */
const COVERAGE_FLOOR = 0.85

/**
 * Matching an id or a phone number **ignoring punctuation** is a real signal
 * (`drv204` → `DRV-0204`, `556007788` → `+966 55 600 7788`) but a weaker one
 * than matching the text as written, because it throws away every word boundary.
 * Hence a hair under 1, so a structural match wins any tie.
 */
const COMPACT_PENALTY = 0.95

/**
 * Typo tolerance by token length. Three characters or fewer get none: at that
 * size one edit reaches most of the alphabet, and `drv` would match `dvr`,
 * `drs`, `arv` and every id prefix in the product. Two is the ceiling — beyond
 * it the results stop being typos and start being different words.
 */
function maxEditsFor(length: number): number {
  if (length <= 3) return 0
  if (length <= 7) return 1
  return 2
}

interface TokenHit {
  start: number
  end: number
  distance: number
}

function positionKindAt(text: string, start: number): PositionKind {
  if (start === 0) return 'start'
  return ALPHANUMERIC.test(text[start - 1]!) ? 'inner' : 'word'
}

/** The best *exact* occurrence: the earliest one at the strongest position. */
function findExact(token: string, text: string): TokenHit | null {
  let best: TokenHit | null = null
  let bestQuality = 0
  let from = 0
  for (;;) {
    const at = text.indexOf(token, from)
    if (at < 0) break
    const quality = POSITION_QUALITY[positionKindAt(text, at)]
    if (quality > bestQuality) {
      best = { start: at, end: at + token.length, distance: 0 }
      bestQuality = quality
    }
    if (bestQuality === POSITION_QUALITY.start) break
    from = at + 1
  }
  return best
}

/**
 * Approximate substring search — Sellers' variant of the OSA recurrence: row 0
 * is all zeros so a match may begin anywhere, and the answer is the minimum of
 * the last row so it may end anywhere.
 *
 * Guarded by a character-count prefilter, because the fuzzy path runs on every
 * candidate the exact path rejected — which is most of them.
 */
function findApproximate(token: string, text: string, maxEdits: number): TokenHit | null {
  if (maxEdits === 0) return null
  const n = token.length
  const m = text.length
  if (n === 0 || m === 0 || n > m + maxEdits) return null

  const present = new Set<string>()
  for (const char of text) present.add(char)
  let absent = 0
  for (const char of token) {
    if (!present.has(char)) absent += 1
    if (absent > maxEdits) return null
  }

  const overflow = maxEdits + 1
  const rows: number[][] = [
    new Array<number>(m + 1).fill(0),
    new Array<number>(m + 1).fill(overflow),
    new Array<number>(m + 1).fill(overflow),
  ]

  for (let i = 1; i <= n; i += 1) {
    const current = rows[i % 3]!
    const previous = rows[(i - 1) % 3]!
    const beforeThat = rows[(i + 1) % 3]!
    current[0] = i > overflow ? overflow : i
    let rowBest = current[0]!

    for (let j = 1; j <= m; j += 1) {
      const cost = token[i - 1] === text[j - 1] ? 0 : 1
      let value = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost)
      if (i > 1 && j > 1 && token[i - 1] === text[j - 2] && token[i - 2] === text[j - 1]) {
        value = Math.min(value, beforeThat[j - 2]! + 1)
      }
      if (value > overflow) value = overflow
      current[j] = value
      if (value < rowBest) rowBest = value
    }
    if (rowBest > maxEdits) return null
  }

  const last = rows[n % 3]!
  let distance = overflow
  let end = -1
  for (let j = 1; j <= m; j += 1) {
    if (last[j]! < distance) {
      distance = last[j]!
      end = j
    }
  }
  if (distance > maxEdits || end < 0) return null
  return { start: Math.max(0, end - n - distance), end, distance }
}

function locate(token: string, text: string): TokenHit | null {
  return findExact(token, text) ?? findApproximate(token, text, maxEditsFor(token.length))
}

/* ──────────────────────────────── scoring ───────────────────────────────── */

function toOriginalRange(source: NormalizedText, start: number, end: number): MatchRange | null {
  if (end <= start) return null
  const first = source.map[start]
  const last = source.map[end - 1]
  if (first === undefined || last === undefined) return null
  return { start: first, end: last + 1 }
}

function mergeRanges(ranges: MatchRange[]): MatchRange[] {
  if (ranges.length < 2) return ranges
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end)
  const out: MatchRange[] = [sorted[0]!]
  for (const range of sorted.slice(1)) {
    const tail = out[out.length - 1]!
    if (range.start <= tail.end) tail.end = Math.max(tail.end, range.end)
    else out.push({ ...range })
  }
  return out
}

/**
 * Every token must hit — AND, not OR. `Cancellation policy` must not match
 * `Cancellation fees` on the strength of one word; an operator who typed two
 * words meant both of them.
 */
function scoreTokens(tokens: readonly string[], target: NormalizedText): MatchDetail {
  if (tokens.length === 0 || target.text === '') return NO_MATCH

  let quality = 0
  let covered = 0
  let inOrder = true
  let previousStart = -1
  const ranges: MatchRange[] = []

  for (const token of tokens) {
    const hit = locate(token, target.text)
    if (!hit) return NO_MATCH

    const position = POSITION_QUALITY[positionKindAt(target.text, hit.start)]
    quality +=
      hit.distance === 0
        ? position
        : position * (1 - hit.distance / token.length) * FUZZY_QUALITY

    covered += token.length
    if (hit.start < previousStart) inOrder = false
    previousStart = hit.start

    const range = toOriginalRange(target, hit.start, hit.end)
    if (range) ranges.push(range)
  }

  const coverage =
    COVERAGE_FLOOR + (1 - COVERAGE_FLOOR) * Math.min(1, covered / target.text.length)
  const score = (quality / tokens.length) * coverage * (inOrder ? 1 : OUT_OF_ORDER_PENALTY)

  return { score: Math.min(1, score), ranges: mergeRanges(ranges) }
}

/**
 * How well `query` matches `candidate`, on `[0, 1]`. `0` means "do not show
 * this"; there is no second boolean to consult.
 *
 * An empty query scores `0` against everything. That is deliberate and is the
 * opposite of `includes()`, where `''` matches every candidate — "the operator
 * has typed nothing" is a prompt state (§5), not a result set of everything.
 */
export function matchDetail(query: string, candidate: string): MatchDetail {
  const tokens = normalizeSearchText(query)
    .split(' ')
    .filter((token) => token !== '' && ALPHANUMERIC.test(token))
  if (tokens.length === 0) return NO_MATCH

  const normalized = candidate === '' ? EMPTY_NORMALIZED : normalizeWithMap(candidate)
  if (normalized.text === '') return NO_MATCH

  let best = scoreTokens(tokens, normalized)

  /* Second pass with all punctuation removed from both sides. Only run when no
     token disappears entirely, so a query of `-` cannot become a query of ``. */
  const compactTokens = tokens.map(stripNonAlphanumeric)
  if (compactTokens.every((token) => token !== '')) {
    const alternative = scoreTokens(compactTokens, compactOf(normalized))
    const score = alternative.score * COMPACT_PENALTY
    if (score > best.score) best = { score, ranges: alternative.ranges }
  }

  return best.score < MIN_MATCH_SCORE ? NO_MATCH : best
}

/** `matchDetail`'s score, for the callers that do not highlight. */
export function matchScore(query: string, candidate: string): number {
  return matchDetail(query, candidate).score
}
