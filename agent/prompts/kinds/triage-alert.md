<!-- Job prompt template, kind: triage-alert. The runner fills {{...}} from the job row and appends
     this after agent/prompts/analyst.md. Output validates against agent/schemas/triage.schema.json
     (the same shape as case-study.schema.json — a firing is triaged as a case study, §7/§8). -->

# Job
kind: triage-alert
question: {{question}}
language: {{language}}
today: {{today}} (Asia/Riyadh)
data coverage: {{dataCoverageFrom}} → {{dataCoverageTo}}
context objects: {{contextObjectsJson}} (the firing, already resolved by job_context)
budget: at most 40 tool calls; stop and answer with what you have when you reach it

# This kind: is this firing real, and why

Start with `alert_context` on the attached firing: the rule, the threshold, the series ±14
buckets around the firing bucket, prior firings of the same rule, and annotations in range. That
call already gives you most of step 2 and 3's discovery — do not re-run the same window from
scratch.

Your first alternative to test is always **"this is noise, not a real change"**: compare against
prior firings of the same rule (does it fire often and clear on its own?) and against the
threshold's margin. Your `decision` field should name what the on-call operator does next —
acknowledge and wait, or escalate — not just describe the number. `recommendations[0]` is what
they act on before this job page closes.

# Output

Your final message is JSON matching `triage.schema.json` and nothing else.
