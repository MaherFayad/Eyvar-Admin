/**
 * T3's two fixed rules with no catalogue counterpart. Everything else this
 * file used to hand-write (the Riyadh/Sunday week, the money rule, gap-vs-
 * zero, partial buckets) duplicated `BUSINESS_RULES` in `api/_lib/glossary.ts`
 * and is deleted: that generator is now T3's one source (F-V2-54). A blocked
 * series and a run's provenance are facts about the agent's own tool
 * contract, not about any measure, so the catalogue generator cannot produce
 * them and a short hand-written entry is the honest fix, not a defect.
 */

export interface ToolGlossaryEntry {
  term: string
  definition: string
}

export const TOOL_GLOSSARY_ENTRIES: readonly ToolGlossaryEntry[] = [
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

/** `undefined` returns both; otherwise only entries whose term or text matches, and `''` when neither does. */
export function toolGlossaryMarkdown(term: string | undefined): string {
  const matches =
    term === undefined
      ? TOOL_GLOSSARY_ENTRIES
      : TOOL_GLOSSARY_ENTRIES.filter((e) => {
          const needle = term.trim().toLowerCase()
          return needle.length === 0 || e.term.toLowerCase().includes(needle) || e.definition.toLowerCase().includes(needle)
        })
  if (matches.length === 0) return ''
  const lines = matches.map((e) => `- **${e.term}.** ${e.definition}`)
  return `## Tool rules\n\n${lines.join('\n')}\n`
}
