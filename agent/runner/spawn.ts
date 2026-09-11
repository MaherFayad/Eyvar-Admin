/**
 * The spawn — `01-analyst-agent.md` §3.3, AC-1249. `buildSpawnArgs` is pure
 * (the argv AC-1249 checks); `runAnalystSpawn` does the actual
 * `child_process.spawn`, streams `stream-json`, and enforces the 20-minute
 * timeout.
 *
 * **Confirmed against a real `claude -p` invocation on this machine**
 * (not assumed from the doc): `--json-schema` does not make the final
 * assistant message raw JSON. It adds a built-in `StructuredOutput` tool —
 * present in `system/init`'s `tools` regardless of `--allowedTools` /
 * `--disallowedTools` — and the model must call it; its `input` is the
 * validated structured answer, echoed again in the terminal `result`
 * message's own `structured_output` field. `agent/settings.json`'s
 * PreToolUse hook must special-case this one non-`mcp__eyvar__` tool or the
 * model could never submit an answer at all (see that file's own comment).
 * The same real run also showed the installed CLI (2.1.226) rejecting
 * `--permission-prompts` outright ("unknown option") — that flag needs
 * 2.1.259+; §3.3 still requires it in the argv this file builds, since the
 * runner is meant to run on a kept-current machine, and AC-1249 checks for
 * its presence, not that this particular sandbox's CLI accepts it.
 */

import { spawn as spawnProcess } from 'node:child_process'
import { readJsonSchema, type AgentJobKind } from './jobAssembly.js'
import type { ToolLogEntry } from './validate.js'
import { detectRateLimit, type RateLimitResult } from './limits.js'

export interface SpawnConfig {
  claudeBin: string
  cwd: string // agent/sandbox, absolute
  mcpConfigPath: string
  settingsPath: string
  systemPromptFile: string
  schemasDir: string
  kind: AgentJobKind
  maxTurns: number
  prompt: string
  env: Record<string, string>
}

const DISALLOWED_TOOLS = 'Bash,Edit,Write,MultiEdit,NotebookEdit,WebFetch,WebSearch,Read,Glob,Grep,Task,Agent'

/** Pure argv construction — AC-1249 asserts every one of these flags is present, and `cwd` is `agent/sandbox`. */
export function buildSpawnArgs(config: SpawnConfig): { command: string; args: string[]; cwd: string; env: Record<string, string> } {
  const args = [
    '-p',
    '--output-format',
    'stream-json',
    '--verbose',
    '--mcp-config',
    config.mcpConfigPath,
    '--settings',
    config.settingsPath,
    '--allowedTools',
    'mcp__eyvar__*',
    '--disallowedTools',
    DISALLOWED_TOOLS,
    '--permission-prompts',
    'none',
    '--permission-mode',
    'dontAsk',
    '--max-turns',
    String(config.maxTurns),
    '--append-system-prompt-file',
    config.systemPromptFile,
    '--json-schema',
    readJsonSchema(config.kind, config.schemasDir),
    '--no-session-persistence',
    config.prompt,
  ]
  return { command: config.claudeBin, args, cwd: config.cwd, env: config.env }
}

/* ─────────────────────── stream parsing ─────────────────────── */

interface ContentBlock {
  type?: string
  text?: string
  id?: string
  name?: string
  input?: unknown
  tool_use_id?: string
  content?: unknown
}

interface StreamMessage {
  type?: string
  subtype?: string
  message?: { role?: string; content?: ContentBlock[] }
  result?: string
  structured_output?: unknown
  is_error?: boolean
}

/** A `tool_result`'s `content` is a string in some cases (the synthetic `StructuredOutput` ack) and an array of text blocks in the MCP-tool case (`result.ts#ok/refuse`). */
function toolResultText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((block) => (block && typeof block === 'object' && typeof (block as ContentBlock).text === 'string' ? (block as ContentBlock).text : ''))
      .join('')
  }
  return ''
}

const EYVAR_PREFIX = 'mcp__eyvar__'

function shortToolName(name: string): string {
  return name.startsWith(EYVAR_PREFIX) ? name.slice(EYVAR_PREFIX.length) : name
}

/** Tools whose output carries a full recomputable `ReportResult` (T5). */
const FULL_RESULT_TOOLS = new Set(['eyvar_run_report'])
/** Tools that record a run but return only derived numbers, not raw series (T6, T9). */
const RUN_REF_TOOLS = new Set(['eyvar_compare_windows', 'eyvar_contribution'])

interface ToolLogResultShape {
  buckets?: unknown
  series?: unknown
}

function coerceToolLogResult(parsed: unknown): { buckets: string[]; series: { id: string; points: (number | null)[] }[] } | null {
  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as ToolLogResultShape
  if (!Array.isArray(obj.buckets) || !Array.isArray(obj.series)) return null
  const series = obj.series
    .map((s) => {
      if (!s || typeof s !== 'object') return null
      const rec = s as { id?: unknown; points?: unknown }
      if (typeof rec.id !== 'string' || !Array.isArray(rec.points)) return null
      return { id: rec.id, points: rec.points as (number | null)[] }
    })
    .filter((s): s is { id: string; points: (number | null)[] } => s !== null)
  return { buckets: obj.buckets as string[], series }
}

/** One tool-call summary, ready to post via `httpClient.postEvents`. */
export interface RunnerEventDraft {
  type: 'tool-call'
  tool: string
  summary: string
  durationMs: number
}

export interface FindingDraft {
  text: string
  runIds: string[]
}

export interface SpawnOutcome {
  toolLog: ToolLogEntry[]
  events: RunnerEventDraft[]
  findings: FindingDraft[]
  /** The candidate JSON `validate.ts` checks — `structured_output` preferred, `result` text as fallback. `null` when neither parsed. */
  candidate: unknown
  rateLimit: RateLimitResult
  timedOut: boolean
  exitCode: number | null
  toolCallCount: number
  turns: number | null
}

function extractCandidate(resultMessage: StreamMessage | null): unknown {
  if (!resultMessage) return null
  if (resultMessage.structured_output !== undefined) return resultMessage.structured_output
  if (typeof resultMessage.result === 'string') {
    try {
      return JSON.parse(resultMessage.result)
    } catch {
      return null
    }
  }
  return null
}

/**
 * Streams one job's spawn to completion (or the timeout). Building the
 * `ToolLogEntry[]` here — not in `validate.ts` — keeps `validate.ts` a pure
 * function over already-extracted data, testable with no process at all.
 */
export async function runAnalystSpawn(config: SpawnConfig, timeoutMs: number): Promise<SpawnOutcome> {
  const lines: string[] = []
  const pendingToolUse = new Map<string, { name: string; input: unknown; startedAt: number }>()
  const toolLog: ToolLogEntry[] = []
  const events: RunnerEventDraft[] = []
  const findings: FindingDraft[] = []
  let toolCallCount = 0
  let resultMessage: StreamMessage | null = null
  let timedOut = false

  const child = spawnProcess(config.command, config.args, { cwd: config.cwd, shell: true, env: { ...process.env, ...config.env } })

  const timer = setTimeout(() => {
    timedOut = true
    child.kill('SIGTERM')
  }, timeoutMs)

  let buffer = ''
  const handleLine = (line: string): void => {
    if (!line.trim()) return
    lines.push(line)
    let parsed: StreamMessage
    try {
      parsed = JSON.parse(line) as StreamMessage
    } catch {
      return
    }

    if (parsed.type === 'result') {
      resultMessage = parsed
      return
    }

    if (parsed.type === 'assistant' && parsed.message?.role === 'assistant') {
      for (const block of parsed.message.content ?? []) {
        if (block.type === 'tool_use' && block.id && block.name) {
          pendingToolUse.set(block.id, { name: block.name, input: block.input, startedAt: Date.now() })
        }
      }
    }

    if (parsed.type === 'user' && parsed.message?.role === 'user') {
      for (const block of parsed.message.content ?? []) {
        if (block.type !== 'tool_result' || !block.tool_use_id) continue
        const use = pendingToolUse.get(block.tool_use_id)
        pendingToolUse.delete(block.tool_use_id)
        if (!use || use.name === 'StructuredOutput') continue // the schema-delivery tool, not an eyvar call — never logged as one

        toolCallCount += 1
        const durationMs = Date.now() - use.startedAt
        const shortName = shortToolName(use.name)
        const text = toolResultText(block.content)
        let outputJson: unknown = null
        try {
          outputJson = JSON.parse(text)
        } catch {
          /* not JSON — refuse()/ok() always emit JSON, so this only happens on a transport oddity */
        }

        events.push({ type: 'tool-call', tool: shortName, summary: `${shortName} (${durationMs}ms)`, durationMs })

        if (outputJson && typeof outputJson === 'object' && !('refused' in (outputJson as object))) {
          const record = outputJson as Record<string, unknown>
          if (FULL_RESULT_TOOLS.has(shortName) && typeof record.runId === 'string') {
            const result = coerceToolLogResult(record)
            if (result) toolLog.push({ kind: 'run', runId: record.runId, result })
          } else if (RUN_REF_TOOLS.has(shortName)) {
            for (const key of ['runId', 'runIdA', 'runIdB']) {
              const v = record[key]
              if (typeof v === 'string') toolLog.push({ kind: 'run-ref', runId: v })
            }
          } else if (shortName === 'eyvar_note_finding' && use.input && typeof use.input === 'object') {
            const input = use.input as { text?: unknown; runIds?: unknown }
            if (typeof input.text === 'string' && Array.isArray(input.runIds)) {
              findings.push({ text: input.text, runIds: input.runIds.filter((r): r is string => typeof r === 'string') })
            }
          }
        }
      }
    }
  }

  child.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf8')
    const parts = buffer.split('\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) handleLine(part)
  })

  const exitCode = await new Promise<number | null>((resolve) => {
    child.on('close', (code) => resolve(code))
    child.on('error', () => resolve(null))
  })
  clearTimeout(timer)
  if (buffer.trim()) handleLine(buffer)

  const finalResultText = resultMessage && typeof (resultMessage as StreamMessage).result === 'string' ? (resultMessage as StreamMessage).result! : null
  const rateLimit = detectRateLimit(lines, finalResultText)
  const turns = resultMessage && typeof (resultMessage as { num_turns?: unknown }).num_turns === 'number' ? ((resultMessage as { num_turns: number }).num_turns) : null

  return {
    toolLog,
    events,
    findings,
    candidate: extractCandidate(resultMessage),
    rateLimit,
    timedOut,
    exitCode,
    toolCallCount,
    turns,
  }
}
