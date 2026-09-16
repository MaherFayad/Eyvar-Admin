/**
 * The analyst agent (`an.*`), D38, WP-7.4. The agent's own prose is content
 * stored in a page, never a key (`01-analyst-agent.md` §4) — this is the
 * chrome around it: the index table, the composer, the job timeline
 * (`22-analytics-v2.md` §5.2), the provenance rail (§5.3) and the runner
 * status line (§5.4).
 */

import type { Dictionary } from '@/lib'

export const ANALYST_EN: Dictionary = {
  /* ── the jobs index (§4, AC-1254) ────────────────────────────────────── */
  'an.index.title': 'Analyst',
  /* R8 first-run: zero jobs ever. */
  'an.index.empty': 'No questions asked yet.',
  'an.index.loading': 'Loading the analyst’s jobs',
  'an.index.error': 'The jobs didn’t load.',
  'an.index.error.retry': 'Try again',
  'an.index.firstRun.heading': 'Ask your first question',
  'an.index.firstRun.body': 'The analyst answers questions about the business, using the same reports and the same numbers you would run yourself.',
  /* Filtered-to-zero (R8's second kind of empty) — one grey sentence. */
  'an.index.noMatch': 'No jobs match these filters.',
  'an.index.noMatch.action': 'Clear filters',
  'an.index.search': 'Search questions',
  'an.index.open': 'Open',
  'an.index.col.question': 'Question',
  'an.index.col.kind': 'Kind',
  'an.index.col.state': 'State',
  'an.index.col.requestedBy': 'Requested by',
  'an.index.col.started': 'Started',
  'an.index.col.duration': 'Duration',
  'an.index.col.result': 'Result',
  'an.index.owner.you': 'You',
  /* `mine · team`, the same split `pg.view.*` already offers a page. */
  'an.view.mine': 'Mine',
  'an.view.team': 'Team',

  /* The top-level content switch (§8) — Jobs is the index above; Schedules is new. */
  'an.contentTab.jobs': 'Jobs',
  'an.contentTab.schedules': 'Schedules',

  /* `AgentJobKind` (`types/agent.ts`), one word or phrase per kind — reused
     by both the index filter and the composer's segmented control. */
  'an.kind.ask': 'Answer',
  'an.kind.caseStudy': 'Case study',
  'an.kind.buildPage': 'Draft a page',
  'an.kind.triageAlert': 'Triage alert',
  'an.kind.weeklyReview': 'Weekly review',

  /* ── the ask composer (§5.1, AC-1255) ───────────────────────────────── */
  'an.compose.heading': 'Ask the analyst',
  'an.compose.question.label': 'Question',
  'an.compose.question.placeholder': 'Ask a question about the business',
  'an.compose.kind': 'Kind',
  'an.compose.attach': 'Attach…',
  'an.compose.attach.report': 'Saved report',
  'an.compose.attach.page': 'Page',
  'an.compose.attach.firing': 'Alert firing',
  'an.compose.attach.window': 'Date range',
  'an.compose.attach.search.placeholder': 'Search…',
  'an.compose.attach.empty': 'Nothing to attach yet.',
  'an.compose.attach.remove': 'Remove {name}',
  /* The composer's own primary (§5.1) — shorter than the entry-point label
     below, because it sits beside the `Kind` control rather than standing
     alone. */
  'an.compose.action.ask': 'Ask',
  'an.compose.disabled.offline': 'Runner offline. Your question will wait until it reconnects.',
  'an.compose.disabled.limited': 'At usage limit until {time}. Ask again after that.',
  'an.compose.error': 'The question didn’t send.',

  /* Reused at every entry point named in `01-analyst-agent.md` §4's table:
     the builder overflow, a page header, the palette. Only the palette
     entry is this work package's to wire (WP-7.4); the other two are
     follow-ups for whoever owns those files. */
  'an.compose.ask': 'Ask the analyst',
  /* `commands/analyst.ts`'s own §11.2 refusal, for a host with no `navigate`. */
  'an.compose.ask.unwired': 'The command centre can’t open the analyst here yet.',

  /* The runner status line (§4, §10), quoted almost verbatim. */
  'an.runner.online': 'Runner online · last seen {time}',
  'an.runner.offline': 'Runner offline',
  'an.runner.limited': 'At usage limit until {time}',

  /* ── one job (§4 / §11: "all four states plus `deferred`") ─────────────── */
  'an.job.loading': 'Loading the job',
  'an.job.error': 'The job didn’t load.',
  'an.job.notFound': 'This job could not be found.',
  'an.job.meta': 'Asked by {who} · {time}',
  /* The provenance panel's own heading (§4). */
  'an.provenance': 'Provenance',

  /* The state badge (§4): queued neutral · running info · deferred warning ·
     done success · failed warning — no red (R7). */
  'an.job.state.queued': 'Queued',
  'an.job.state.running': 'Running',
  'an.job.state.deferred': 'Deferred',
  'an.job.state.done': 'Done',
  'an.job.state.failed': 'Failed',

  /* ── the job timeline (§5.2, AC-1256/AC-1257/AC-1261) ───────────────── */
  'an.timeline.queued': 'Waiting for the runner to pick this up.',
  /* AC-1267 — a queued job (a schedule's own enqueue included) while the runner is offline: not a guess, `an.runner.offline`'s own fact restated in place. */
  'an.timeline.queued.offline': 'The runner is offline. This will stay queued until it reconnects.',
  'an.timeline.showSteps': 'Show steps',
  'an.timeline.deferred': 'Paused. The runner is at its usage limit until {time}.',
  'an.timeline.timedOut': 'This job ran out of time. Here is what it found before stopping.',
  'an.timeline.evidenceMismatch': 'The analyst couldn’t substantiate its own numbers, so this job did not finish.',
  'an.timeline.schemaFailed': 'This job’s answer didn’t come back in the expected shape.',
  'an.timeline.rerun': 'Re-run',

  /* The tool-label dictionary (§5.2) — chrome, final, translated. The
     finding's own text is the model's prose in the operator's language and
     is never a key; `note_finding` carries no label for that reason. */
  'an.tool.catalogue_measures': 'Looked up measures',
  'an.tool.catalogue_dimensions': 'Checked available splits',
  'an.tool.glossary': 'Checked a definition',
  'an.tool.plan_query': 'Checked the question',
  'an.tool.run_report': 'Ran a report',
  'an.tool.compare_windows': 'Compared two periods',
  'an.tool.describe_series': 'Described the trend',
  'an.tool.correlate': 'Checked a correlation',
  'an.tool.contribution': 'Found what changed',
  'an.tool.sample_rows': 'Sampled a few rows',
  'an.tool.saved_reports_search': 'Searched saved reports',
  'an.tool.get_saved_report': 'Opened a saved report',
  'an.tool.save_report': 'Saved a report',
  'an.tool.pages_search': 'Searched pages',
  'an.tool.get_page': 'Opened a page',
  'an.tool.create_page_draft': 'Drafted a page',
  'an.tool.alerts_list': 'Checked alert rules',
  'an.tool.alert_history': 'Checked firing history',
  'an.tool.alert_context': 'Checked a firing',
  'an.tool.annotations_list': 'Checked annotations',
  'an.tool.prior_studies_search': 'Searched past studies',
  'an.tool.job_context': 'Read the job details',

  /* ── job actions (§4's table, AC-1260) ──────────────────────────────── */
  'an.job.action.saveAsPage': 'Save as page',
  'an.job.action.saveAsPage.toast': 'Saved as a page',
  'an.job.action.saveAsPage.failed': 'That didn’t save.',
  'an.job.action.pinToPage': 'Pin to page…',
  /* AC-1260 — a bookmark block onto a dashboard page (`BookmarkBlockView.tsx`
     already renders `{kind:'page'}`), the same picker shape ReportBuilder's
     own `Pin to a page…` uses. Legal only once the job has a result. */
  'an.job.action.pinToPage.noResult': 'This job has no result to pin yet.',
  'an.job.action.createAlert': 'Create alert',
  /* Deferred — the composer that would take a prefilled condition is
     `AlertRuleDialog.tsx`, owned outside this work package. */
  'an.job.action.createAlert.unwired': 'Creating an alert from a finding isn’t wired yet.',
  'an.job.action.copyLink': 'Copy link',
  'an.job.action.copyLink.toast': 'Link copied',
  'an.job.action.copyLink.failed': 'The link didn’t copy.',
  'an.job.action.rerun.toast': 'Asked again',
  'an.job.action.rerun.failed': 'That didn’t send.',

  /* ── the provenance panel (§5.3, AC-1258/AC-1259) ───────────────────── */
  'an.provenance.openInBuilder': 'Open in builder',
  'an.provenance.none': 'This job didn’t run a report.',
  /* F-V2-90 — a cited runId `getRun` could not resolve; the case an operator
     most needs to see, so it renders rather than drops. */
  'an.provenance.missing': 'This run could not be found. Its number can’t be re-checked.',
  'an.provenance.loading': 'Loading the runs this study cites',
  'an.provenance.error': 'The runs behind this study didn’t load.',
  'an.provenance.asOf': 'as of {time}',

  /* ── the Schedules tab (§8, AC-1266/AC-1267) ─────────────────────────── */
  'an.schedules.loading': 'Loading schedules',
  'an.schedules.error': 'The schedules didn’t load.',
  'an.schedules.empty.heading': 'Schedule your first weekly review',
  'an.schedules.empty.body': 'No schedules yet. A weekly review lands as a draft.',
  'an.schedules.col.reports#one': '{count} report',
  'an.schedules.col.reports#other': '{count} reports',
  'an.schedules.owner': 'Owner {who}',
  'an.schedules.enabled': 'Enabled',
  'an.schedules.disabled': 'Disabled',
  'an.schedules.action.enable': 'Enable',
  'an.schedules.action.disable': 'Disable',
  'an.schedules.action.enable.toast': 'Schedule enabled',
  'an.schedules.action.disable.toast': 'Schedule disabled',
  'an.schedules.action.toggle.failed': 'That didn’t save.',

  /* One sentence per cadence shape (§8's cron, restricted to daily/weekly) — never the raw cron string, an operator reads neither cron syntax nor `dow` digits. */
  'an.schedules.cadence.weekly': 'Every {day} at {time} (Riyadh)',
  'an.schedules.cadence.daily': 'Daily at {time} (Riyadh)',

  'an.schedules.new.heading': 'New weekly review',
  'an.schedules.new.day': 'Day',
  'an.schedules.new.time': 'Time (Riyadh)',
  'an.schedules.new.attach': 'Reports…',
  'an.schedules.new.action': 'Schedule',
  'an.schedules.new.toast': 'Scheduled',
  'an.schedules.new.error': 'That didn’t schedule.',

  /* `Intl` has no "just the weekday name" shape this product's closed `DateStyle` set offers (`src/lib/format/date.ts`), and the day picker needs one independent of any date — `0` = Sunday, matching `WEEK_START_DOW` and the cron `dow` digit (D45). */
  'an.day.0': 'Sunday',
  'an.day.1': 'Monday',
  'an.day.2': 'Tuesday',
  'an.day.3': 'Wednesday',
  'an.day.4': 'Thursday',
  'an.day.5': 'Friday',
  'an.day.6': 'Saturday',
}
