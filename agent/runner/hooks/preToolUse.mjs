#!/usr/bin/env node
/**
 * `PreToolUse` deny-list (AC-1250): exits 2 unless the tool name starts with `mcp__eyvar__` — real enforcement, not redundant, since `--disallowedTools` alone does not close the tool list (confirmed live: unnamed built-ins and connector tools still appear regardless).
 * Exception: `StructuredOutput`, the built-in tool `--json-schema` adds — the model must call it to submit its answer at all, so blocking it would strand every job.
 * Node, not a shell script — the runner's OS is unspecified.
 */

import { readFileSync } from 'node:fs'

const EYVAR_PREFIX = 'mcp__eyvar__'
const ALWAYS_ALLOWED = new Set(['StructuredOutput'])

function readStdin() {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

function main() {
  const raw = readStdin()
  let input
  try {
    input = JSON.parse(raw)
  } catch {
    // Malformed hook input is not this tool's problem to diagnose — deny closed rather than open.
    process.stderr.write('preToolUse: could not parse hook input JSON — denying by default.\n')
    process.exit(2)
  }

  const toolName = typeof input.tool_name === 'string' ? input.tool_name : ''
  if (toolName.startsWith(EYVAR_PREFIX) || ALWAYS_ALLOWED.has(toolName)) {
    process.exit(0)
  }

  process.stderr.write(`preToolUse: "${toolName}" is not an eyvar tool — blocked (01-analyst-agent.md §3.3, AC-1250).\n`)
  process.exit(2)
}

main()
