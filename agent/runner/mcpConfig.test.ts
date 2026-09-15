/**
 * The runner's MCP server path has to resolve from the runner's own cwd, not
 * from the repo root. `index.ts` spawns `claude` with `cwd: env.sandboxDir`,
 * and a bare relative path in `--mcp-config` resolves against that cwd — so
 * `agent/dist/mcp/server.js` looked for `agent/sandbox/agent/dist/...` and the
 * tool server would have failed to start on the runner's first real job.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readRunnerEnv } from './env.js'

/* `readRunnerEnv` defaults `repoRoot` to `process.cwd()`, which is the repo
   root when the runner is launched as documented but `agent/` under
   `npm --prefix agent test`. Pin it to this file's own location so the test
   measures the shipped config rather than the cwd it happened to run in. */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const env = readRunnerEnv({ runnerToken: 'test-token', repoRoot })

interface McpConfig {
  mcpServers: Record<string, { command: string; args: string[] }>
}

const config = JSON.parse(readFileSync(env.mcpConfigPath, 'utf8')) as McpConfig

describe('the runner’s MCP config', () => {
  it('names a server script that exists when resolved from the spawn cwd', () => {
    for (const [name, server] of Object.entries(config.mcpServers)) {
      const script = server.args.at(-1)
      expect(script, `${name} declares no script`).toBeTruthy()
      const resolved = isAbsolute(script!) ? script! : resolve(env.sandboxDir, script!)
      expect(existsSync(resolved), `${name} resolves to ${resolved}, which does not exist`).toBe(true)
    }
  })

  it('does not resolve against the repo root, which is not where the runner runs', () => {
    /* The regression itself: the old value existed from the repo root and only
       from there, which is exactly why argv-shape tests passed over it. */
    const script = config.mcpServers.eyvar.args.at(-1)!
    expect(resolve(env.sandboxDir, script)).toBe(resolve(env.agentDir, 'dist', 'mcp', 'server.js'))
  })
})
