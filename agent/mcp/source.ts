/**
 * The switch — `01-analyst-agent.md` §3.1: `EYVAR_MCP_SOURCE = 'http' | 'mock'`.
 * Mock imports the frontend clients (`../../src/data/clients`) for early
 * development, before the backend exists (§3.4); http calls the real API
 * through `client.ts`.
 *
 * **Dynamic import, not static** — so an http-mode process never evaluates
 * `mockBackend.ts`'s import of `src/data/config.ts`, which reads
 * `import.meta.env` unguarded and throws under plain Node/`tsx` outside Vite
 * or Vitest (see `agent/README.md` "Known gap"). Neither branch pays for the
 * other's dependency graph.
 */

import type { Backend } from './backendTypes.js'

export type McpSource = 'mock' | 'http'

export const EYVAR_MCP_SOURCE: McpSource = process.env.EYVAR_MCP_SOURCE === 'http' ? 'http' : 'mock'

let cached: Backend | undefined

export async function getBackend(): Promise<Backend> {
  if (cached) return cached
  cached =
    EYVAR_MCP_SOURCE === 'http'
      ? (await import('./httpBackend.js')).httpBackend
      : (await import('./mockBackend.js')).mockBackend
  return cached
}

/** Test-only: forces the next `getBackend()` to re-resolve. */
export function resetBackendCache(): void {
  cached = undefined
}
