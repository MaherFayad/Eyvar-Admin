/**
 * The analyst agent (`an.*`), D38. The agent's own prose is content stored
 * in a page, never a key (`01-analyst-agent.md` §4); this is only the
 * chrome the doc names — the index title and states, the composer's
 * primary, the runner status line, `Provenance` and the job state badges.
 * Findings and timelines belong to the work package building the job page.
 */

import type { Dictionary } from '@/lib'

export const ANALYST_EN: Dictionary = {
  /* ── the jobs index (§4) ─────────────────────────────────────────────── */
  'an.index.title': 'Analyst',
  /* R8 first-run: zero jobs ever. */
  'an.index.empty': 'No questions asked yet.',
  'an.index.loading': 'Loading the analyst’s jobs',
  'an.index.error': 'The jobs didn’t load.',

  /* The composer's one primary (§4), reused at every entry point named in
     the doc's table: the builder overflow, a page header, the palette. */
  'an.compose.ask': 'Ask the analyst',

  /* The runner status line (§4, §10), quoted almost verbatim. */
  'an.runner.online': 'Runner online · last seen {time}',
  'an.runner.offline': 'Runner offline',
  'an.runner.limited': 'At usage limit until {time}',

  /* ── one job (§4 / §11: "all four states plus `deferred`") ─────────────── */
  'an.job.loading': 'Loading the job',
  'an.job.error': 'The job didn’t load.',
  /* The provenance panel's own heading (§4). */
  'an.provenance': 'Provenance',

  /* The state badge (§4): queued neutral · running info · deferred warning ·
     done success · failed warning — no red (R7). */
  'an.job.state.queued': 'Queued',
  'an.job.state.running': 'Running',
  'an.job.state.deferred': 'Deferred',
  'an.job.state.done': 'Done',
  'an.job.state.failed': 'Failed',
}
