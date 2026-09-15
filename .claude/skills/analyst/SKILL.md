---
name: analyst
description: Ask the Eyvar analyst a question about the ride-subscription business from a terminal and get a study file, backed by real report runs. Use when the owner types `/analyst <question>`. Interactive entry point onto the analytics-v2 agent, docs/09-analytics-v2/01-analyst-agent.md §9.
---

# /analyst — ask a question, get a study

The owner's terminal-driven entry point onto the same machinery the product's queued jobs use
(`docs/09-analytics-v2/01-analyst-agent.md` §9): the repo-root `.mcp.json` points at the same
`agent/dist/mcp/server.js` MCP tool server the runner spawns, and the `analyst` subagent
(`.claude/agents/analyst.md`) carries the same reasoning protocol (`agent/prompts/analyst.md`) —
read once, from one place, never forked.

This path is for the owner working at the keyboard. It is not the product surface an operator
uses (`/management/reports?view=analyst`, §4) — that one runs through the backend's job queue and
the runner, unattended. Print mode (what the runner spawns) cannot preload this skill or spawn a
subagent at all; only an interactive session like this one can.

## What `/analyst <question>` does

1. **Take the question verbatim** — everything after `/analyst`. If nothing was given, ask for a
   question and stop; do not guess one.
2. **Decide the language**: `ar` if the question is written in Arabic, otherwise `en`. The study
   is written in this language throughout.
3. **Get today's date in Asia/Riyadh** (D45 — Riyadh time, Sunday week start), the same way the
   runner does it for a queued job (`agent/runner/index.ts#riyadhToday`, reproduced here rather
   than imported — this skill does not touch `agent/**`):
   ```
   node -e "console.log(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))"
   ```
4. **Delegate to the `analyst` subagent** (Task/Agent tool, `subagent_type: "analyst"`). Give it
   exactly this, so it has everything a queued job's prompt would have carried (§6) minus the
   parts that do not apply interactively:
   ```
   # Job
   kind: ask (interactive — no jobId, no --json-schema; see your own instructions for what that changes)
   question: <the question, verbatim, in the operator's own words>
   language: <ar | en>
   today: <YYYY-MM-DD> (Asia/Riyadh)

   Investigate this and reply with the complete study as Markdown — see your own instructions
   (.claude/agents/analyst.md) for what the study must contain and how this run differs from a
   queued job.
   ```
   The subagent has only the `mcp__eyvar__*` tools and `Read` (to load its own protocol file) —
   no `Write`, no shell. It cannot save anything itself; its final message is the whole study.
5. **Save the study.** Take the subagent's final message verbatim and write it to
   ```
   docs/09-analytics-v2/studies/<today>-<slug>.md
   ```
   where `<slug>` is the question, lowercased, non-alphanumerics collapsed to single hyphens,
   trimmed, capped at ~60 characters. If a file at that path already exists (a second question the
   same day that slugs the same), append `-2`, `-3`, … rather than overwrite it.
6. **Tell the owner**: the file path, the headline/answer sentence, and the `runId`s the study
   cites. If the subagent's message does not read as a finished study (it refused, it asked a
   clarifying question, a tool call failed outright), say so plainly instead of writing a partial
   file and reporting success.

## Before the first run in a session

`.mcp.json` is read once, when a `claude` session starts. If this skill was just added (or
`.mcp.json` just created) in the session you're in, the MCP server will not be loaded yet —
restart the session (or run `claude mcp list` to confirm `eyvar` is registered) before trying
`/analyst`.

No backend exists yet for this build (`agent/README.md`: `EYVAR_MCP_SOURCE` defaults to `mock`,
which runs the tools against `src/data/clients`' own fixtures — this is expected until the P6 job
queue and P7's http backend land, not a defect). To point at a real backend once one exists, set
`EYVAR_MCP_SOURCE=http` (and `AGENT_RUNNER_TOKEN`, `EYVAR_ACTING_FOR`, `EYVAR_API_BASE_URL`) in the
shell **before** starting `claude` — `.mcp.json` does not hardcode the source, so it inherits
whatever the shell has, exactly as `01-analyst-agent.md` §9 specifies ("`EYVAR_MCP_SOURCE` from
the environment").

## What this is not

Not the batch path (§3–§8): no job queue, no `agent_events`, no scheduled reviews, no polling job
page. Not a chat loop: one question, one study, done — a follow-up is a new `/analyst` call, same
as a new job is a new job (§12).
