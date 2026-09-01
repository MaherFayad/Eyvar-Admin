/**
 * The matcher's own tests — P3-T1.
 *
 * Weighted towards the inputs that break a matcher rather than the ones that
 * demonstrate it: an empty query, a query longer than the candidate, a query of
 * nothing but punctuation, ids and phone numbers whose separators the operator
 * did not type, and Arabic in every spelling of itself.
 *
 * Scores are asserted **relatively** wherever the point is an ordering. Pinning
 * `0.8735…` would make every future tweak to a weight a test edit, which is how
 * a scoring model quietly stops being tunable.
 */

import { describe, expect, it } from 'vitest'

import { MIN_MATCH_SCORE, editDistance, matchDetail, matchScore, normalizeSearchText } from './fuzzy'

/* ────────────────────────────── normalisation ───────────────────────────── */

describe('normalizeSearchText', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeSearchText('  Nora   AL-Harbi \n')).toBe('nora al-harbi')
  })

  it('returns an empty string for whitespace only', () => {
    expect(normalizeSearchText('   \t\n ')).toBe('')
  })

  it('strips Arabic harakat', () => {
    // مُحَمَّد -> محمد
    expect(normalizeSearchText('مُحَمَّد')).toBe(
      'محمد',
    )
  })

  it('strips the tatweel', () => {
    expect(normalizeSearchText('ســلام')).toBe(
      'سلام',
    )
  })

  it('folds ta marbuta to ha', () => {
    // مكتبة -> مكتبه
    expect(normalizeSearchText('مكتبة')).toBe('مكتبه')
  })

  it('folds alef maksura to ya', () => {
    // مصطفى -> مصطفي
    expect(normalizeSearchText('مصطفى')).toBe(
      'مصطفي',
    )
  })

  it('folds every hamza-bearing alef to a bare alef', () => {
    for (const alef of ['أ', 'إ', 'آ', 'ٱ']) {
      expect(normalizeSearchText(`${alef}حمد`)).toBe('احمد')
    }
  })

  it('latinises Arabic-Indic digits', () => {
    expect(normalizeSearchText('٠١٢٣٤')).toBe('01234')
    // Extended (Persian) forms too — `toLatinDigits` already knew about them.
    expect(normalizeSearchText('۵۶')).toBe('56')
  })

  it('folds Latin combining accents', () => {
    expect(normalizeSearchText('Zoë Bäcker')).toBe('zoe backer')
  })

  it('drops bidi controls a paste brings with it', () => {
    expect(normalizeSearchText('‏nora‎')).toBe('nora')
  })

  it('leaves punctuation and structure alone — word boundaries are scored', () => {
    expect(normalizeSearchText('DRV-0204')).toBe('drv-0204')
    expect(normalizeSearchText('+966 55 600 7788')).toBe('+966 55 600 7788')
  })
})

/* ────────────────────── bounded Damerau–Levenshtein ─────────────────────── */

describe('editDistance', () => {
  it('is zero for identical strings', () => {
    expect(editDistance('captain', 'captain')).toBe(0)
  })

  it('prices a transposition at one, not two', () => {
    expect(editDistance('captian', 'captain')).toBe(1)
    expect(editDistance('teh', 'the')).toBe(1)
  })

  it('prices a substitution, an insertion and a deletion at one each', () => {
    expect(editDistance('csptain', 'captain')).toBe(1)
    expect(editDistance('captan', 'captain')).toBe(1)
    expect(editDistance('cappttain', 'captain')).toBe(2)
  })

  it('is symmetric', () => {
    expect(editDistance('riyadh', 'ryiadh')).toBe(editDistance('ryiadh', 'riyadh'))
  })

  it('handles empty inputs on either side', () => {
    expect(editDistance('', '')).toBe(0)
    expect(editDistance('', 'abc')).toBe(3)
    expect(editDistance('abc', '')).toBe(3)
  })

  it('returns maxDistance + 1 rather than the true distance once bounded out', () => {
    expect(editDistance('captain', 'submarine', 2)).toBe(3)
    expect(editDistance('captain', 'submarine', 0)).toBe(1)
  })

  it('still reports an in-bounds distance exactly', () => {
    expect(editDistance('captian', 'captain', 2)).toBe(1)
  })

  it('bails on a length difference bigger than the bound without scanning', () => {
    expect(editDistance('a', 'a'.repeat(5_000), 2)).toBe(3)
  })

  it('handles a negative bound as "no answer fits"', () => {
    expect(editDistance('a', 'a', -1)).toBe(0)
  })
})

/* ─────────────────────────── the pathological set ───────────────────────── */

describe('matchScore — the inputs that break a matcher', () => {
  it('scores an empty query at zero against everything', () => {
    expect(matchScore('', 'Nora Al-Harbi')).toBe(0)
    expect(matchScore('   ', 'Nora Al-Harbi')).toBe(0)
  })

  it('scores anything against an empty candidate at zero', () => {
    expect(matchScore('nora', '')).toBe(0)
  })

  it('scores a query longer than the candidate at zero', () => {
    expect(matchScore('captains and riders', 'cap')).toBe(0)
    expect(matchScore('Nora Al-Harbi the third', 'Nora')).toBe(0)
  })

  it('scores an all-punctuation query at zero', () => {
    expect(matchScore('!!!', 'Nora Al-Harbi')).toBe(0)
    expect(matchScore('---', 'DRV-0204')).toBe(0)
    expect(matchScore('· — ·', 'Nora Al-Harbi')).toBe(0)
  })

  it('does not let a single punctuation character match every hyphenated name', () => {
    expect(matchScore('-', 'Nora Al-Harbi')).toBe(0)
  })

  it('never exceeds one', () => {
    expect(matchScore('nora al-harbi', 'Nora Al-Harbi')).toBeLessThanOrEqual(1)
    expect(matchScore('a', 'a')).toBeLessThanOrEqual(1)
  })

  it('either scores zero or scores at least the floor — nothing in between', () => {
    const scores = ['n', 'no', 'nor', 'nora', 'zzz', 'q', 'harbi'].map((q) =>
      matchScore(q, 'Nora Al-Harbi'),
    )
    for (const score of scores) {
      expect(score === 0 || score >= MIN_MATCH_SCORE).toBe(true)
    }
  })
})

/* ─────────────────────────── typo tolerance (§1) ────────────────────────── */

describe('typo tolerance', () => {
  it('finds `Captains` from `csptain`', () => {
    expect(matchScore('csptain', 'Captains')).toBeGreaterThan(MIN_MATCH_SCORE)
  })

  it('finds `Captains` from the transposition `captians`', () => {
    expect(matchScore('captians', 'Captains')).toBeGreaterThan(MIN_MATCH_SCORE)
  })

  it('ranks the correctly spelled query above the mistyped one', () => {
    expect(matchScore('captains', 'Captains')).toBeGreaterThan(matchScore('csptain', 'Captains'))
  })

  it('never lets a fuzzy hit outrank an exact one on the same candidate', () => {
    /* `scription` is the weakest kind of exact hit — buried mid-word.
       `subscriptian` is the strongest kind of fuzzy hit — one edit, at the very
       start, on a long token. Against the same candidate the exact one wins,
       which is the property `FUZZY_QUALITY` is chosen to guarantee. */
    const worstExact = matchScore('scription', 'Subscriptions')
    const bestFuzzy = matchScore('subscriptian', 'Subscriptions')
    expect(worstExact).toBeGreaterThan(0)
    expect(bestFuzzy).toBeGreaterThan(0)
    expect(worstExact).toBeGreaterThan(bestFuzzy)
  })

  it('gives short tokens no tolerance at all — `drv` must not match `dvr`', () => {
    expect(matchScore('drv', 'DVR-0204')).toBe(0)
  })

  it('refuses two words that merely rhyme', () => {
    expect(matchScore('cancelpolicy', 'Cancellation fees')).toBe(0)
    expect(matchScore('captain', 'Subscriptions')).toBe(0)
  })
})

/* ───────────────────── prefix and word-boundary boosts ──────────────────── */

describe('position boosts', () => {
  it('ranks a prefix above the same query mid-word', () => {
    expect(matchScore('ride', 'Riders')).toBeGreaterThan(matchScore('ride', 'Overriders'))
  })

  it('ranks a word start above the same query mid-word', () => {
    expect(matchScore('harbi', 'Nora Al-Harbi')).toBeGreaterThan(matchScore('harbi', 'Alharbistan'))
  })

  it('ranks a whole-string match above a match buried in a long title', () => {
    expect(matchScore('captains', 'Captains')).toBeGreaterThan(
      matchScore('captains', 'Captains and riders, from application to compliance'),
    )
  })
})

/* ────────────────────── out-of-order token matching ─────────────────────── */

describe('out-of-order tokens', () => {
  it('finds `Nora Al-Harbi` from `harbi nora`', () => {
    expect(matchScore('harbi nora', 'Nora Al-Harbi')).toBeGreaterThan(MIN_MATCH_SCORE)
  })

  it('ranks the in-order spelling a shade higher', () => {
    expect(matchScore('nora harbi', 'Nora Al-Harbi')).toBeGreaterThan(
      matchScore('harbi nora', 'Nora Al-Harbi'),
    )
  })

  it('requires every token to hit — one word of a two-word query is not a match', () => {
    expect(matchScore('cancellation policy', 'Cancellation fees')).toBe(0)
    expect(matchScore('nora almutairi', 'Nora Al-Harbi')).toBe(0)
  })
})

/* ─────────────────────────── ids and phone numbers ──────────────────────── */

describe('ids', () => {
  it('matches `DRV-0204` from `drv204` — no separator, no leading zero', () => {
    expect(matchScore('drv204', 'DRV-0204')).toBeGreaterThan(MIN_MATCH_SCORE)
  })

  it('matches `DRV-0204` from the full id in either case', () => {
    expect(matchScore('drv-0204', 'DRV-0204')).toBeGreaterThan(0.9)
    expect(matchScore('DRV-0204', 'DRV-0204')).toBeGreaterThan(0.9)
  })

  it('matches on the numeric tail alone', () => {
    expect(matchScore('0204', 'DRV-0204')).toBeGreaterThan(MIN_MATCH_SCORE)
  })

  it('matches an id typed in Arabic-Indic digits', () => {
    expect(matchScore('drv-٠٢٠٤', 'DRV-0204')).toBeGreaterThan(0.9)
  })

  it('ranks the exact id above a near one', () => {
    expect(matchScore('drv-0204', 'DRV-0204')).toBeGreaterThan(matchScore('drv-0204', 'DRV-0205'))
  })
})

describe('phone numbers', () => {
  const phone = '+966 55 600 7788'

  it('matches with the spacing the fixture uses', () => {
    expect(matchScore('55 600 7788', phone)).toBeGreaterThan(MIN_MATCH_SCORE)
  })

  it('matches with no spacing at all', () => {
    expect(matchScore('556007788', phone)).toBeGreaterThan(MIN_MATCH_SCORE)
    expect(matchScore('+966556007788', phone)).toBeGreaterThan(MIN_MATCH_SCORE)
  })

  it('matches the tail an operator reads off a screen', () => {
    expect(matchScore('7788', phone)).toBeGreaterThan(MIN_MATCH_SCORE)
  })

  it('matches a number typed in Arabic-Indic digits', () => {
    expect(matchScore('٥٥٦٠٠', phone)).toBeGreaterThan(MIN_MATCH_SCORE)
  })

  it('does not match an unrelated number', () => {
    expect(matchScore('44 111 2222', phone)).toBe(0)
  })
})

/* ─────────────────────────────── Arabic input ───────────────────────────── */

describe('Arabic input', () => {
  it('matches a name spelled with and without harakat', () => {
    const withMarks = 'مُحَمَّد' // مُحَمَّد
    const plain = 'محمد' // محمد
    expect(matchScore(plain, withMarks)).toBeGreaterThan(0.9)
    expect(matchScore(withMarks, plain)).toBeGreaterThan(0.9)
  })

  it('matches across the alef spellings', () => {
    // أحمد typed, احمد stored
    expect(matchScore('أحمد', 'احمد')).toBeGreaterThan(0.9)
  })

  it('matches the Arabic plan name from the catalogue', () => {
    // الباقة الأسبوعية, queried without the hamza and with the ta marbuta folded
    const stored = 'الباقة الأسبوعية'
    expect(matchScore('الاسبوعيه', stored)).toBeGreaterThan(
      MIN_MATCH_SCORE,
    )
  })

  it('scores an unrelated Arabic word at zero', () => {
    expect(matchScore('سيارة', 'محمد')).toBe(0)
  })
})

/* ──────────────────────────── the matched ranges ────────────────────────── */

describe('matchDetail ranges', () => {
  it('reports an exact hit in the original string’s own indices', () => {
    const { ranges } = matchDetail('harbi', 'Nora Al-Harbi')
    expect(ranges).toEqual([{ start: 8, end: 13 }])
    expect('Nora Al-Harbi'.slice(8, 13)).toBe('Harbi')
  })

  it('reports one range per query token', () => {
    const { ranges } = matchDetail('nora harbi', 'Nora Al-Harbi')
    expect(ranges).toEqual([
      { start: 0, end: 4 },
      { start: 8, end: 13 },
    ])
  })

  it('survives a candidate whose normalisation deleted characters', () => {
    // The stored name carries harakat the query does not.
    const stored = 'مُحَمَّد'
    const { ranges } = matchDetail('محمد', stored)
    expect(ranges).toHaveLength(1)
    expect(ranges[0]!.start).toBe(0)
    expect(ranges[0]!.end).toBe(stored.length)
  })

  it('reports no range when there is no match', () => {
    expect(matchDetail('zzz', 'Nora Al-Harbi')).toEqual({ score: 0, ranges: [] })
  })

  it('keeps every range inside the candidate', () => {
    for (const query of ['drv204', 'captians', '7788', 'harbi nora']) {
      for (const candidate of ['DRV-0204', 'Captains', '+966 55 600 7788', 'Nora Al-Harbi']) {
        for (const range of matchDetail(query, candidate).ranges) {
          expect(range.start).toBeGreaterThanOrEqual(0)
          expect(range.end).toBeLessThanOrEqual(candidate.length)
          expect(range.end).toBeGreaterThan(range.start)
        }
      }
    }
  })
})

/* ─────────────────────────────── determinism ────────────────────────────── */

describe('purity', () => {
  it('returns the same score for the same pair every time', () => {
    const once = matchScore('csptain', 'Captains and riders')
    for (let i = 0; i < 5; i += 1) expect(matchScore('csptain', 'Captains and riders')).toBe(once)
  })

  it('does not mutate its inputs', () => {
    const query = 'Nora'
    const candidate = 'Nora Al-Harbi'
    matchDetail(query, candidate)
    expect(query).toBe('Nora')
    expect(candidate).toBe('Nora Al-Harbi')
  })
})
