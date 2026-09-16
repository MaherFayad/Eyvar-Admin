#!/usr/bin/env node
/**
 * The stdio MCP server (`mcp.json`'s `{ "command": "node", "args": [...] }`).
 * `EYVAR_MCP_SOURCE` (`source.ts`) picks mock or http; see `agent/README.md`
 * for every env var this process reads.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerAllTools } from './index.js'
import { EYVAR_MCP_SOURCE } from './source.js'

async function main(): Promise<void> {
  const server = new McpServer({ name: 'eyvar', version: '0.1.0' })
  registerAllTools(server)

  const transport = new StdioServerTransport()
  await server.connect(transport)

  // stderr, never stdout — stdout is the MCP protocol channel.
  console.error(`eyvar MCP server ready (EYVAR_MCP_SOURCE=${EYVAR_MCP_SOURCE})`)
}

main().catch((error: unknown) => {
  console.error('eyvar MCP server failed to start:', error)
  process.exit(1)
})
