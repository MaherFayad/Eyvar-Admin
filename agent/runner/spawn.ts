/**
 * The spawn (§3.3, AC-1249, D38): `buildSpawnArgs` is pure argv construction; `runAnalystSpawn` does the real `child_process.spawn` against the owner's subscription, streaming `stream-json` and enforcing the timeout.
 * Confirmed live: `--json-schema` adds a built-in `StructuredOutput` tool the model must call to answer at all, regardless of `--allowedTools`/`--disallowedTools` — `agent/settings.json`'s PreToolUse hook special-cases it for exactly this reason.
 */

import { spawn as spawnProcess, exec as execProcess } from 'node:child_process'
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
 * The line-by-line `stream-json` state machine, split out so it is testable
 * against a captured transcript with no child process (`collectFromLines`,
 * used by `spawn.test.ts`) — the real spawn feeds it the same way.
 */
function createStreamCollector() {
  const lines: string[] = []
  const pendingToolUse = new Map<string, { name: string; input: unknown; startedAt: number }>()
  const toolLog: ToolLogEntry[] = []
  const events: RunnerEventDraft[] = []
  const findings: FindingDraft[] = []
  let resultMessage: StreamMessage | null = null

  function handleLine(line: string): void {
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

  function finish(): Omit<SpawnOutcome, 'timedOut' | 'exitCode'> {
    const finalResultText = resultMessage && typeof resultMessage.result === 'string' ? resultMessage.result : null
    const rateLimit = detectRateLimit(lines, finalResultText)
    const turns = resultMessage && typeof (resultMessage as { num_turns?: unknown }).num_turns === 'number' ? (resultMessage as { num_turns: number }).num_turns : null
    return {
      toolLog,
      events,
      findings,
      candidate: extractCandidate(resultMessage),
      rateLimit,
      toolCallCount: events.length,
      turns,
    }
  }

  return { handleLine, finish }
}

/** Pure: feeds a captured (or fixture) `stream-json` transcript through the same logic a real spawn uses. No process, no `timedOut`/`exitCode` (those only a real spawn has). */
export function collectFromLines(lines: readonly string[]): Omit<SpawnOutcome, 'timedOut' | 'exitCode'> {
  const collector = createStreamCollector()
  for (const line of lines) collector.handleLine(line)
  return collector.finish()
}

/**
 * `child.kill('SIGTERM')` alone is not enough: `shell: true` makes the
 * direct child the shell, not `claude` — confirmed live, a hung process
 * survived a bare SIGTERM. `taskkill /pid ... /t /f` kills the whole tree on Windows; plain `SIGTERM` suffices on POSIX.
 */
function killProcessTree(child: ReturnType<typeof spawnProcess>): void {
  if (process.platform === 'win32' && child.pid) {
    execProcess(`taskkill /pid ${child.pid} /t /f`, () => {
      /* best-effort — if the process already exited, taskkill errors harmlessly */
    })
  } else {
    child.kill('SIGTERM')
  }
}

/**
 * Command-agnostic process plumbing: spawn, stream stdout through a fresh
 * collector, enforce the timeout. Separated from `runAnalystSpawn` so this
 * is testable against a plain `node` invocation, since `buildSpawnArgs`'s argv is always claude-shaped.
 */
async function spawnAndCollect(command: string, args: string[], cwd: string, env: Record<string, string>, timeoutMs: number): Promise<SpawnOutcome> {
  const collector = createStreamCollector()
  let timedOut = false

  // `shell:true` needs `command` hand-quoted when it has a space: Windows passes
  // it to the shell unquoted, and CLI install paths often have one
  // (`C:\Program Files\...`) — confirmed live, this broke before the quoting fix.
  const shellSafeCommand = command.includes(' ') ? `"${command}"` : command
  const child = spawnProcess(shellSafeCommand, args, { cwd, shell: true, env: { ...process.env, ...env } })

  const timer = setTimeout(() => {
    timedOut = true
    killProcessTree(child)
  }, timeoutMs)

  let buffer = ''
  child.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf8')
    const parts = buffer.split('\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) collector.handleLine(part)
  })

  const exitCode = await new Promise<number | null>((resolve) => {
    child.on('close', (code) => resolve(code))
    child.on('error', () => resolve(null))
  })
  clearTimeout(timer)
  if (buffer.trim()) collector.handleLine(buffer)

  return { ...collector.finish(), timedOut, exitCode }
}

/**
 * Streams one job's spawn to completion (or the timeout). Building the
 * `ToolLogEntry[]` here — not in `validate.ts` — keeps `validate.ts` a pure
 * function over already-extracted data, testable with no process at all.
 */
export async function runAnalystSpawn(config: SpawnConfig, timeoutMs: number): Promise<SpawnOutcome> {
  const built = buildSpawnArgs(config)
  return spawnAndCollect(built.command, built.args, built.cwd, built.env, timeoutMs)
}

/** Exposed for `spawn.test.ts`'s process-plumbing tests: the timeout/exit-code behaviour against a plain command, decoupled from claude's own argv shape. */
export const __testing__ = { spawnAndCollect }
