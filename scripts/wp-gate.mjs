// Checks a work package's changed files against its manifest (docs/09-analytics-v2/wp/<id>.json)
// so a parallel agent cannot silently edit another owner's file (06-execution-plan.md §1 step 5,
// §4.1). Precedence: handoffs are always in scope, then `deny` wins over `allow`, then a
// `*.test.ts(x)` file is in scope when the source it sits beside is.
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const HANDOFFS = 'docs/09-analytics-v2/handoffs/'
const posixGlob = typeof path.posix?.matchesGlob === 'function' ? path.posix.matchesGlob : null

// Fallback matcher for a Node without path.matchesGlob: `**` crosses `/`, `*` and `?` do not.
function globToRegExp(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i]
    if (c === '*' && glob[i + 1] === '*') {
      re += '.*'
      i += 1
    } else if (c === '*') {
      re += '[^/]*'
    } else if (c === '?') {
      re += '[^/]'
    } else {
      re += /[.+^${}()|[\]\\]/.test(c) ? `\\${c}` : c
    }
  }
  return new RegExp(`^${re}$`)
}

function matches(file, glob) {
  if (posixGlob) return posixGlob(file, glob)
  return globToRegExp(glob).test(file)
}

function matchesAny(file, globs) {
  return globs.some((g) => matches(file, g))
}

function testSiblingSource(file) {
  if (file.endsWith('.test.tsx')) return file.slice(0, -'.test.tsx'.length) + '.tsx'
  if (file.endsWith('.test.ts')) return file.slice(0, -'.test.ts'.length) + '.ts'
  return null
}

function changedFiles() {
  const lines = (cmd) => execSync(cmd, { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
  return [...new Set([...lines('git diff --name-only HEAD'), ...lines('git ls-files --others --exclude-standard')])].map(
    (f) => f.replace(/\\/g, '/'),
  )
}

function readManifest(id) {
  const manifestPath = path.join(ROOT, 'docs/09-analytics-v2/wp', `${id}.json`)
  if (!existsSync(manifestPath)) {
    console.error(`wp-gate: no manifest at docs/09-analytics-v2/wp/${id}.json`)
    process.exit(1)
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.id !== id) {
    console.error(`wp-gate: docs/09-analytics-v2/wp/${id}.json declares id "${manifest.id}", expected "${id}"`)
    process.exit(1)
  }
  return manifest
}

export function checkFiles(files, manifest) {
  const allow = manifest.allow ?? []
  const deny = manifest.deny ?? []
  const offenders = []
  for (const file of files) {
    if (file.startsWith(HANDOFFS)) continue
    if (matchesAny(file, deny)) {
      offenders.push(`${file} (in deny)`)
      continue
    }
    if (matchesAny(file, allow)) continue
    const sibling = testSiblingSource(file)
    if (sibling && matchesAny(sibling, allow) && !matchesAny(sibling, deny)) continue
    offenders.push(`${file} (outside allow)`)
  }
  return offenders
}

function main() {
  const id = process.argv[2]
  if (!id) {
    console.error('usage: node scripts/wp-gate.mjs WP-nn')
    process.exit(1)
  }
  const manifest = readManifest(id)
  const files = changedFiles()
  const offenders = checkFiles(files, manifest)
  if (offenders.length) {
    console.error(`wp-gate: ${id} touches ${offenders.length} file(s) outside its manifest`)
    for (const o of offenders) console.error(`  ${o}`)
    process.exit(1)
  }
  console.log(`wp-gate: ${id} clean (${files.length} changed file(s), all within scope)`)
  process.exit(0)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
