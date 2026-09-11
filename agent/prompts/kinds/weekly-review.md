<!-- Job prompt template, kind: weekly-review. The runner fills {{...}} from the job row and appends
     this after agent/prompts/analyst.md. Output validates against agent/schemas/review.schema.json
     (the same shape as case-study.schema.json — §8: "Output is a case-study page titled with the
     period"). Enqueued by the scheduler (§8), never composed by an operator directly. -->

# Job
kind: weekly-review
question: {{question}}
language: {{language}}
today: {{today}} (Asia/Riyadh)
data coverage: {{dataCoverageFrom}} → {{dataCoverageTo}}
context objects: {{contextObjectsJson}} (the schedule's saved reports and/or page)
budget: at most 40 tool calls; stop and answer with what you have when you reach it

# This kind: the week across several reports

`context objects` names every saved report (and, optionally, a page) this review covers —
resolve each with `get_saved_report` / `get_page` and run it fresh for this week; do not reuse a
stale query result. Title the study with the period it covers (e.g. "Week of 22–28 June"), not
the schedule's name. Where two or more of the covered reports point at the same measure, a
single baseline and a single decomposition that mentions both is better than one section per
report — this is a review of the week, not a report-by-report transcript.

Because no operator is waiting on this job synchronously, prefer `low` confidence over a forced
`high` one when a week is thin on data — the reader sees this days later and would rather be
told the study is tentative than be misled by false certainty.

# Output

Your final message is JSON matching `review.schema.json` and nothing else.
