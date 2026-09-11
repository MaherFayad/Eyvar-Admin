/**
 * AC-1249: the spawn argv. `buildSpawnArgs` is pure — no process, no
 * subscription. The `stream-json` parsing (`collectFromLines`) is tested
 * against captured-shape transcript lines — real message shapes observed
 * from an actual `claude -p` run on this machine (assistant `tool_use` /
 * user `tool_result` pairs, the `StructuredOutput` tool, `rate_limit_event`,
 * the terminal `result`'s `structured_output` field) — with no process
 * involved. `spawnAndCollect`'s own process plumbing (timeout → SIGTERM,
 * exit code) is proven against a real, trivial `node` invocation instead of
 * a fake `claude` binary, since `buildSpawnArgs`'s argv is always
 * claude-shaped and cannot itself run an arbitrary test script; the real
 * spawn against a live subscription is the gated `spawn.e2e.test.ts`.
 */

import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildSpawnArgs, collectFromLines, __testing__ } from './spawn.js'

const SCHEMAS_DIR = resolve(__dirname, '../schemas')

function baseConfig(overrides: Partial<Parameters<typeof buildSpawnArgs>[0]> = {}) {
  return {
    claudeBin: 'claude',
    cwd: '/repo/agent/sandbox',
    mcpConfigPath: '/repo/agent/mcp.json',
    settingsPath: '/repo/agent/settings.json',
    systemPromptFile: '/repo/agent/prompts/analyst.md',
    schemasDir: SCHEMAS_DIR,
    kind: 'case-study' as const,
    maxTurns: 60,
    prompt: 'question: why did X happen',
    env: {},
    ...overrides,
  }
}

describe('buildSpawnArgs — AC-1249', () => {
  it('carries every flag §3.3 names, in a single argv', () => {
    const built = buildSpawnArgs(baseConfig())
    expect(built.command).toBe('claude')
    expect(built.args).toEqual(
      expect.arrayContaining([
        '-p',
        '--output-format',
        'stream-json',
        '--verbose',
        '--mcp-config',
        '/repo/agent/mcp.json',
        '--settings',
        '/repo/agent/settings.json',
        '--allowedTools',
        'mcp__eyvar__*',
        '--disallowedTools',
        'Bash,Edit,Write,MultiEdit,NotebookEdit,WebFetch,WebSearch,Read,Glob,Grep,Task,Agent',
        '--permission-prompts',
        'none',
        '--permission-mode',
        'dontAsk',
        '--max-turns',
        '60',
        '--append-system-prompt-file',
        '/repo/agent/prompts/analyst.md',
        '--json-schema',
        '--no-session-persistence',
      ]),
    )
  })

  it('sets the working directory to agent/sandbox', () => {
    const built = buildSpawnArgs(baseConfig({ cwd: '/repo/agent/sandbox' }))
    expect(built.cwd.endsWith('sandbox')).toBe(true)
  })

  it('passes the job prompt as the final positional argument', () => {
    const built = buildSpawnArgs(baseConfig({ prompt: 'the exact job prompt text' }))
    expect(built.args.at(-1)).toBe('the exact job prompt text')
  })

  it('reads and inlines the kind schema file content for --json-schema, not a path', () => {
    const built = buildSpawnArgs(baseConfig({ kind: 'case-study' }))
    const idx = built.args.indexOf('--json-schema')
    const schemaArg = built.args[idx + 1]!
    expect(schemaArg.startsWith('{')).toBe(true)
    expect(JSON.parse(schemaArg).title).toBe('CaseStudy')
  })

  it('selects the right schema file per kind (ask vs case-study)', () => {
    const ask = buildSpawnArgs(baseConfig({ kind: 'ask' }))
    const schema = JSON.parse(ask.args[ask.args.indexOf('--json-schema') + 1]!)
    expect(schema.$id).toContain('ask.schema.json')
  })
})

/* ─────────── captured-shape stream-json lines (real message shapes) ─────────── */

const RUN_REPORT_TOOL_USE =
  "{\"type\":\"assistant\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"toolu_1\",\"name\":\"mcp__eyvar__eyvar_run_report\",\"input\":{\"query\":{}}}]}}"
const RUN_REPORT_RESULT =
  "{\"type\":\"user\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"toolu_1\",\"content\":[{\"type\":\"text\",\"text\":\"{\\\"runId\\\":\\\"RUN-FAKE-1\\\",\\\"buckets\\\":[\\\"2026-06-24\\\"],\\\"series\\\":[{\\\"id\\\":\\\"s1\\\",\\\"points\\\":[7]}]}\"}]}]}}"
const NOTE_FINDING_TOOL_USE =
  "{\"type\":\"assistant\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"toolu_2\",\"name\":\"mcp__eyvar__eyvar_note_finding\",\"input\":{\"text\":\"a finding\",\"runIds\":[\"RUN-FAKE-1\"]}}]}}"
const NOTE_FINDING_RESULT =
  "{\"type\":\"user\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"toolu_2\",\"content\":[{\"type\":\"text\",\"text\":\"{\\\"ok\\\":true}\"}]}]}}"
const STRUCTURED_OUTPUT_TOOL_USE =
  "{\"type\":\"assistant\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"toolu_3\",\"name\":\"StructuredOutput\",\"input\":{\"title\":\"fake study\"}}]}}"
const STRUCTURED_OUTPUT_RESULT =
  "{\"type\":\"user\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"toolu_3\",\"content\":\"Structured output provided successfully\"}]}}"
const FINAL_RESULT =
  "{\"type\":\"result\",\"is_error\":false,\"result\":\"{\\\"title\\\":\\\"fake study\\\"}\",\"structured_output\":{\"title\":\"fake study\"},\"num_turns\":4}"

const REJECTED_RATE_LIMIT =
  "{\"type\":\"rate_limit_event\",\"rate_limit_info\":{\"status\":\"rejected\",\"resetsAt\":1789290000,\"rateLimitType\":\"five_hour\"}}"

describe('collectFromLines — parses a captured-shape stream-json transcript', () => {
  it('extracts the tool log, findings, and structured_output candidate', () => {
    const outcome = collectFromLines([
      RUN_REPORT_TOOL_USE,
      RUN_REPORT_RESULT,
      NOTE_FINDING_TOOL_USE,
      NOTE_FINDING_RESULT,
      STRUCTURED_OUTPUT_TOOL_USE,
      STRUCTURED_OUTPUT_RESULT,
      FINAL_RESULT,
    ])
    expect(outcome.toolLog).toEqual([{ kind: 'run', runId: 'RUN-FAKE-1', result: { buckets: ['2026-06-24'], series: [{ id: 's1', points: [7] }] } }])
    expect(outcome.findings).toEqual([{ text: 'a finding', runIds: ['RUN-FAKE-1'] }])
    expect(outcome.candidate).toEqual({ title: 'fake study' })
    expect(outcome.turns).toBe(4)
    expect(outcome.events.some((e) => e.tool === 'eyvar_run_report')).toBe(true)
    // the StructuredOutput tool call is never logged as an eyvar tool call
    expect(outcome.events.every((e) => e.tool !== 'StructuredOutput')).toBe(true)
    expect(outcome.rateLimit).toEqual({ limited: false })
  })

  it('reports a rate limit from a rejected rate_limit_event in the stream', () => {
    const outcome = collectFromLines([REJECTED_RATE_LIMIT, '{"type":"result","is_error":true,"result":"blocked"}'])
    expect(outcome.rateLimit.limited).toBe(true)
  })

  it('ignores malformed lines rather than throwing', () => {
    expect(() => collectFromLines(['not json', '', RUN_REPORT_TOOL_USE, RUN_REPORT_RESULT])).not.toThrow()
  })
})

describe('spawnAndCollect — process plumbing', () => {
  it('reports a real, non-null exit code for a process that exits cleanly', async () => {
    const outcome = await __testing__.spawnAndCollect(process.execPath, ['-e', 'process.exit(0)'], process.cwd(), {}, 10_000)
    expect(outcome.timedOut).toBe(false)
    expect(outcome.exitCode).toBe(0)
  })

  it('marks timedOut and terminates the process when the timeout elapses', async () => {
    // A script file, not an inline `-e` string: `shell: true` runs through cmd.exe on Windows,
    // which mangles `()`/`{}` in an inline script (confirmed live: `setInterval(() => {}, 1000)`
    // arrived at node truncated to `setInterval(()`, a syntax error) — a file sidesteps that.
    const fs = await import('node:fs')
    const os = await import('node:os')
    const path = await import('node:path')
    const hangScript = path.join(os.tmpdir(), `eyvar-runner-hang-test-${process.pid}.mjs`)
    fs.writeFileSync(hangScript, 'setInterval(function () {}, 1000)\n')
    try {
      const outcome = await __testing__.spawnAndCollect(process.execPath, [hangScript], process.cwd(), {}, 300)
      expect(outcome.timedOut).toBe(true)
    } finally {
      fs.rmSync(hangScript, { force: true })
    }
  }, 10_000)
})
