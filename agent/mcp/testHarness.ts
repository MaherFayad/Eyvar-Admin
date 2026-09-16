/**
 * Shared test rig: one connected `McpServer`/`Client` pair per test file over
 * `InMemoryTransport` (no stdio, no subprocess). `EYVAR_MCP_SOURCE` is forced
 * to `mock` before any tool file loads, since `source.ts` reads it once.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

process.env.EYVAR_MCP_SOURCE = 'mock'

export async function buildTestClient(): Promise<{ client: Client; close: () => Promise<void> }> {
  const { registerAllTools } = await import('./index.js')
  const server = new McpServer({ name: 'eyvar-test', version: '0.0.0' })
  registerAllTools(server)

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'eyvar-test-client', version: '0.0.0' })
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

  return {
    client,
    close: async () => {
      await client.close()
      await server.close()
    },
  }
}

export async function callTool(client: Client, name: string, args: Record<string, unknown> = {}): Promise<CallToolResult> {
  return client.callTool({ name, arguments: args }) as Promise<CallToolResult>
}

export function textOf(result: CallToolResult): Record<string, unknown> {
  const first = result.content[0]
  if (!first || first.type !== 'text') throw new Error('tool result carried no text content')
  return JSON.parse(first.text) as Record<string, unknown>
}
