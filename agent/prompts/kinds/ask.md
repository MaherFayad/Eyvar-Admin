<!-- Job prompt template, kind: ask. The runner fills {{...}} from the job row and appends this
     after agent/prompts/analyst.md. Output validates against agent/schemas/ask.schema.json. -->

# Job
kind: ask
question: {{question}}
language: {{language}}
today: {{today}} (Asia/Riyadh)
data coverage: {{dataCoverageFrom}} → {{dataCoverageTo}}
context objects: {{contextObjectsJson}}
budget: at most 40 tool calls; stop and answer with what you have when you reach it

# This kind: a direct answer

The operator wants one answer, not a full investigation. Keep the method (steps 1–5, 7, 9–10 of
`analyst.md`); step 6 (two alternatives) applies only if the question is a "why" — a plain
lookup ("how many riders churned last month") does not need a rival hypothesis, only the number,
its `runId`, and the window it was measured at. If the question does ask why, do not skip step
6: one alternative is still one hypothesis, and that is the failure mode the protocol exists to
prevent.

Write `answer` in place of a separate headline and baseline — one sentence with the number, the
window, and the confidence. `dataQuality` is still required even for a simple lookup: say
plainly if the number is complete, truncated, or touches a blocked series.

# Output

Your final message is JSON matching `ask.schema.json` and nothing else.
