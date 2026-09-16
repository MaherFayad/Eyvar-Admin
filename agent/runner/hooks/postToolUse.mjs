#!/usr/bin/env node
/**
 * `PostToolUse` hook: appends a digest-only tool-log entry (never the full
 * output, avoiding `agent_events` duplication or a row-data leak) for §10's
 * cost accounting. Unset `EYVAR_TOOL_LOG_PATH` (an interactive `/analyst` session) makes this a no-op, not an error.
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
