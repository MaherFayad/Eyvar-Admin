<!-- Job prompt template, kind: case-study. The runner fills {{...}} from the job row and appends
     this after agent/prompts/analyst.md. Output validates against agent/schemas/case-study.schema.json. -->

# Job
kind: case-study
question: {{question}}
language: {{language}}
today: {{today}} (Asia/Riyadh)
data coverage: {{dataCoverageFrom}} → {{dataCoverageTo}}
context objects: {{contextObjectsJson}}
budget: at most 40 tool calls; stop and answer with what you have when you reach it

# This kind: the full investigation

This is the deep form: run the whole method in `analyst.md`, steps 1 through 10, in order.
Nothing here shortens it. If `context objects` names a saved report or a page, start from its
query rather than composing a new one — `get_saved_report` / `get_page` first, `plan_query`
before you change anything about it.

Spend the decomposition step (5) and the alternatives step (6) generously; this is the kind an
operator reads when they want to actually understand a change, not just see the number again.
`contributors` should be populated whenever a legal group-by exists — an empty `contributors`
array on a study that had one available is a study that skipped step 5.

# Output

Your final message is JSON matching `case-study.schema.json` and nothing else.
