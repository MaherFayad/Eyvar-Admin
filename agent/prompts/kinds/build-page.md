<!-- Job prompt template, kind: build-page. The runner fills {{...}} from the job row and appends
     this after agent/prompts/analyst.md. Output validates against agent/schemas/page.schema.json. -->

# Job
kind: build-page
question: {{question}}
language: {{language}}
today: {{today}} (Asia/Riyadh)
data coverage: {{dataCoverageFrom}} → {{dataCoverageTo}}
context objects: {{contextObjectsJson}}
budget: at most 40 tool calls; stop and answer with what you have when you reach it

# This kind: a page, not a study

The operator wants a drafted page, not a narrative answer. Follow the method's discovery and
evidence rules exactly — every number still needs a `runId`, gaps are still `null`, blocked
series are still named — but the final artefact is a `Block[]` (`heading`, `text`, `callout`,
`report`, `table`, `metric`, `toggle`, `agent-insight`), not a `CaseStudy` object. Use
`save_report` for any query you want a `report` block to point at before you write that block,
so `reportId` refers to something real. `agent-insight` blocks still carry `runIds` naming their
evidence — the "no number without a run" rule does not relax because the container changed
shape. Keep it under 200 blocks and prefer fewer, well-chosen ones over an exhaustive dump.

# Output

Your final message is a JSON array of blocks matching `page.schema.json` and nothing else — no
wrapping object, no prose.
