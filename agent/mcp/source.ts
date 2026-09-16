/**
 * The switch. `getBackend()` imports dynamically because http mode must
 * never evaluate `mockBackend.ts`: its transitive `config.ts` import reads
 * `import.meta.env` unguarded, which throws under plain Node/`tsx`.
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
