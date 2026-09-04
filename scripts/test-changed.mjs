// Runs the Vitest files that import anything you changed (staged, unstaged or untracked
// under src/). The full suite is CI's job. Extra arguments pass through to vitest.
import { execSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const lines = (cmd) => execSync(cmd, { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
const changed = new Set([
  ...lines('git diff --name-only HEAD'),
  ...lines('git ls-files --others --exclude-standard'),
])
const files = [...changed].filter(
  (f) => /^src\/.*\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts') && existsSync(f),
)
if (!files.length) {
  console.log('test:changed: nothing changed under src/')
  process.exit(0)
}
console.log(`test:changed: ${files.length} changed file(s) under src/`)
const result = spawnSync('npx', ['vitest', 'related', '--run', ...files, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
})
process.exit(result.status ?? 1)
