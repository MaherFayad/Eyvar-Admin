#!/usr/bin/env node
/**
 * `PostToolUse` tool log — `01-analyst-agent.md` §3.3: "appends {tool,
 * input, output-digest, ts} to the job's tool log." A local, on-disk,
 * digest-only record (never the full output — that would duplicate
 * `agent_events` and risk holding unmasked row data past `sample_rows`'
 * own audit path) kept for §10's cost accounting ("the runner logs turns
 * and tool calls per job so the owner can see what a study costs").
 *
 * `EYVAR_TOOL_LOG_PATH` names the file (one per job, set by the runner
 * before spawning); when unset, the hook is a no-op rather than an error —
 * an interactive `/analyst` session (§9) has no per-job log to write to.
 */

import { readFileSync, appendFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

function readStdin() {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

function main() {
  const logPath = process.env.EYVAR_TOOL_LOG_PATH
  if (!logPath) process.exit(0)

  const raw = readStdin()
  let input
  try {
    input = JSON.parse(raw)
  } catch {
    process.exit(0) // nothing sensible to log; never block the tool call over this
  }

  const tool = typeof input.tool_name === 'string' ? input.tool_name : 'unknown'
  const responseText = JSON.stringify(input.tool_response ?? null)
  const digest = createHash('sha256').update(responseText).digest('hex').slice(0, 16)

  const entry = { tool, input: input.tool_input ?? null, 'output-digest': digest, ts: new Date().toISOString() }
  try {
    appendFileSync(logPath, `${JSON.stringify(entry)}\n`)
  } catch {
    /* a log write failure must never fail the tool call it is only observing */
  }
  process.exit(0)
}

main()
