#!/usr/bin/env node
/**
 * `PreToolUse` deny-list — `01-analyst-agent.md` §3.3, AC-1250: "exits 2 for
 * any tool whose name does not start with `mcp__eyvar__`." Belt and braces
 * over `--allowedTools`/`--disallowedTools` — and not a redundant one: a
 * real `claude -p` run with those flags set exactly as §3.3 specifies still
 * showed `system/init`'s `tools` list carrying everything not *named* in
 * `--disallowedTools`, including tools and MCP connectors that list never
 * mentions (`CronCreate`, `Monitor`, `Workflow`, `TodoWrite`, third-party
 * connector tools, …) — whatever happens to be configured on the machine
 * the runner runs on. `--disallowedTools` is a closed list of what to
 * remove, not an open one of what to keep, so this hook is the actual
 * enforcement; the flags only reduce how often it has to fire.
 *
 * One deliberate exception: `StructuredOutput`. `--json-schema` does not
 * make the final assistant message raw JSON — it adds this built-in tool,
 * and the model must call it to submit its answer at all (confirmed by
 * spawning a real session with this exact flag set: `system/init`'s `tools`
 * always carries it, and the run does not complete without a call to it).
 * Blocking it would make every job unable to ever finish.
 *
 * Uses Node, not a shell script — the runner is meant to work on the
 * owner's machine, of unknown OS.
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
