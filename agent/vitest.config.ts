/**
 * `npm --prefix agent test` — 01-analyst-agent.md §11: "one unit test per
 * tool against `EYVAR_MCP_SOURCE=mock`… `agent/mcp/*.test.ts`." `node`
 * environment: the MCP server never touches a DOM.
 */
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '../src') },
  },
  test: {
    name: 'agent',
    environment: 'node',
    include: ['mcp/**/*.test.ts', 'schemas/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 15_000,
  },
})
