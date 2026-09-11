/**
 * T3 `glossary`'s starter content. §5's own description of T3 says the real
 * thing is "server-side markdown, generated from `Measure.captionKey` and
 * `docs/05-restructure/specs/05-metrics-content.md` §5–§12 excerpts" — that
 * generator does not exist yet (flagged in the WP report). These entries are
 * the rules an analyst gets wrong most often if it is not told them; a
 * measure's own caption (T1's `caption`) is folded in by the tool when
 * `term` matches a measure key.
 */

export interface GlossaryEntry {
  term: string
  definition: string
}

export const CORE_GLOSSARY: readonly GlossaryEntry[] = [
  {
    term: 'riyadh-day',
    definition:
      'Every bucket boundary is Asia/Riyadh local time, not UTC and not the reader\'s machine. A "day" runs ' +
      'midnight to midnight Riyadh time.',
  },
  {
    term: 'sunday-week',
    definition: 'A week bucket starts Sunday, not Monday — the Saudi calendar week, not ISO 8601.',
  },
  {
    term: 'money',
    definition:
      'Every money value this server returns is an integer count of halalas (1 SAR = 100 halalas), never a ' +
      'decimal. State findings in SAR by dividing by 100 in prose, but never assume a tool already did that.',
  },
  {
    term: 'gap-vs-zero',
    definition:
      'A `null` point is a gap — no data, often outside a measure\'s coverage window. A `0` point is a measured ' +
      'zero. Never read a gap as a zero; never state a trend across a gap without saying so.',
  },
  {
    term: 'partial-bucket',
    definition:
      'The most recent bucket is often incomplete (the day/week/month is still running). It is drawn and marked, ' +
      'never silently dropped, but `run_report`\'s summary and `describe_series` both exclude it from totals, ' +
      'means and trends — a partial bucket compared to a complete one is not a real change.',
  },
  {
    term: 'blocked-series',
    definition:
      'A series with `blocked` set is a measure this operator (not you) lacks permission to see. It has no ' +
      'points. State this as a `dataQuality.blockedSeries` finding, never guess the number.',
  },
  {
    term: 'run-provenance',
    definition:
      'Every number in a finding must cite the `runId` that produced it (from `run_report`/`compare_windows`). ' +
      'The runner recomputes cited values against the stored run and fails the job on a mismatch — never state a ' +
      'number you have not run.',
  },
]

export function findGlossaryEntries(term: string | undefined): readonly GlossaryEntry[] {
  if (term === undefined) return CORE_GLOSSARY
  const needle = term.trim().toLowerCase()
  if (needle.length === 0) return CORE_GLOSSARY
  return CORE_GLOSSARY.filter((e) => e.term.toLowerCase().includes(needle) || e.definition.toLowerCase().includes(needle))
}
