/**
 * The one test needing a real subscription — gated behind `AGENT_E2E=1`
 * (§11) so `npm --prefix agent test` never requires one. Run explicitly:
 * `AGENT_E2E=1 npx vitest run runner/spawn.e2e.test.ts`.
 */

import { describe, expect, it } from 'vitest'
import { checkLogin } from './loginCheck.js'
import { __testing__ } from './spawn.js'

const e2e = process.env.AGENT_E2E === '1' ? describe : describe.skip

e2e('E2E — a real claude -p spawn (AGENT_E2E=1)', () => {
  it('the login check passes on this machine (real subscription session)', async () => {
    const result = await checkLogin('claude')
    expect(result.ok).toBe(true)
  }, 30_000)

  it('a minimal real spawn produces a result message', async () => {
    const outcome = await __testing__.spawnAndCollect(
      'claude',
      ['-p', 'reply with the word ready', '--output-format', 'stream-json', '--verbose', '--max-turns', '1'],
      process.cwd(),
      {},
      60_000,
    )
    expect(outcome.timedOut).toBe(false)
    expect(outcome.exitCode).toBe(0)
  }, 65_000)
})

if (process.env.AGENT_E2E !== '1') {
  // vitest requires at least one assertion when a file has no active `it`s under some configs;
  // this keeps the file meaningful to run directly and explains the skip when read in isolation.
  it.skip('AGENT_E2E is not set — this whole file is gated (see spawn.e2e.test.ts header)', () => {})
}
