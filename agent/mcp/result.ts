/**
 * Every tool's return shape, in one place — 01-analyst-agent.md §5's own
 * rule: "Tool error ... Not a failure. The tool returns the refusal; the
 * model is told to report it." A refusal is JSON the model reads, never a
 * thrown MCP protocol error (that stays for transport failures only).
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { assertUnderOutputCap } from './limits.js'

/** A successful tool answer. `toolName` names the cap this guards (AC-1243). */
export function ok(toolName: string, data: unknown): CallToolResult {
  assertUnderOutputCap(data, toolName)
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

/**
 * A typed refusal — "a malformed measure key is a typed refusal naming what
 * was wrong, not an empty result." Same envelope shape everywhere so the
 * model learns one vocabulary: `{ refused: true, code, message }`.
 */
export function refuse(code: string, message: string, extra?: Record<string, unknown>): CallToolResult {
  const data = { refused: true as const, code, message, ...extra }
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

/** The shape every tool's JSON text decodes to, for tests. */
export function parseResult<T = Record<string, unknown>>(result: CallToolResult): T {
  const first = result.content[0]
  if (!first || first.type !== 'text') throw new Error('tool result carried no text content')
  return JSON.parse(first.text) as T
}
