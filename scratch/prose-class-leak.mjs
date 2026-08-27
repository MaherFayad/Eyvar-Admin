/**
 * **Does any class name written in PROSE reach the built stylesheet?**
 *
 * Tailwind v4 scans source files as plain text. It has no idea what a comment
 * is. So a utility spelled out in a doc comment is a candidate, resolves
 * against the theme, and emits a rule - and the rule is only ever visible in
 * `dist`, which is why four of these have shipped on this project. One of them
 * was in a comment written to warn about the practice
 * (`MetricTileRow.tsx` records that occurrence and the two before it).
 *
 * The two known shapes are `content-['...']` and a hyphenated
 * physical-side-word joined to a token noun. **Neither needs brackets, an
 * arbitrary value, or anything that looks like code** - two ordinary words and
 * an ordinary hyphen are enough. A bracket-scan of `dist` catches the first
 * shape and cannot catch the second.
 *
 * ## What this checks
 *
 * Every utility-shaped token that appears **inside a block comment**, is
 * **absent from the code of the ENTIRE `src` tree**, and **matches a selector
 * emitted into `dist`**. That intersection is the leak - a rule that exists in
 * the stylesheet for no reason but a sentence.
 *
 * **The whole tree, not the file.** A first cut compared each file's prose
 * against that file's own code and reported two leaks in `ChartCard.tsx` that
 * were not leaks: both classes are used in `components/ui/card.tsx`, so the
 * rules would exist anyway. **A false finding here is worse than none**, because
 * it is the line a reviewer reads instead of checking. The prose is still worth
 * rewriting - it is one refactor away from being the only source - but that is
 * the warning below, not the failure above.
 *
 * ## Usage
 *
 *     npx vite build
 *     node scratch/prose-class-leak.mjs [glob-ish path prefix ...]
 *
 * Defaults to the whole of `src`. Exits non-zero on a leak, so it can gate a
 * handoff.
 *
 * **Verify in `dist`, never in `src`** - the source is where the sentence is,
 * and the stylesheet is where the answer is.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const DIST = join(ROOT, 'dist', 'assets')
const PREFIXES = process.argv.slice(2).map((p) => p.split('/').join(sep))

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(tsx?|css)$/.test(name)) out.push(full)
  }
  return out
}

const cssFiles = readdirSync(DIST).filter((f) => f.endsWith('.css'))
if (cssFiles.length === 0) {
  console.error('No built stylesheet in dist/assets. Run `npx vite build` first.')
  process.exit(2)
}
const css = cssFiles.map((f) => readFileSync(join(DIST, f), 'utf8')).join('\n')

/* Every class selector the build emitted, with CSS escapes removed. */
const emitted = new Set()
for (const m of css.matchAll(/\.((?:[A-Za-z0-9_-]|\\.)+)/g)) {
  emitted.add(m[1].replace(/\\(.)/g, '$1'))
}

const BLOCK = /\/\*[\s\S]*?\*\//g
/* Utility-shaped: lowercase word, then at least one hyphenated segment. */
const CANDIDATE = /[a-z][a-z0-9]*(?:-[a-z0-9]+)+/g

/* Every utility-shaped token that appears in real CODE anywhere under `src`.
   Collected across the whole tree before any file is judged, because a class
   used in one file and merely described in another is not a leak. */
const CODE_TOKENS = new Set()
for (const file of walk(join(ROOT, 'src'))) {
  const bare = readFileSync(file, 'utf8').replace(BLOCK, ' ')
  for (const t of bare.match(CANDIDATE) ?? []) CODE_TOKENS.add(t)
}

let leaks = 0
let warnings = 0

for (const file of walk(join(ROOT, 'src'))) {
  const rel = relative(ROOT, file)
  if (PREFIXES.length && !PREFIXES.some((p) => rel.startsWith(p))) continue

  const source = readFileSync(file, 'utf8')
  const comments = source.match(BLOCK) ?? []
  if (comments.length === 0) continue
  const inProse = new Set()
  for (const c of comments) for (const t of c.match(CANDIDATE) ?? []) inProse.add(t)

  const leaked = [...inProse].filter((t) => emitted.has(t) && !CODE_TOKENS.has(t)).sort()
  const alsoUsed = [...inProse].filter((t) => emitted.has(t) && CODE_TOKENS.has(t)).sort()

  if (leaked.length) {
    leaks += leaked.length
    console.log(`LEAK  ${rel}`)
    for (const t of leaked) console.log(`        ${t}  - written nowhere in src but a comment, and emitted to dist`)
  }
  if (alsoUsed.length) {
    warnings += alsoUsed.length
    console.log(`warn  ${rel}: spelled in prose, and used in code somewhere in src: ${alsoUsed.join(', ')}`)
  }
}

console.log(
  `\n${leaks} leak(s), ${warnings} prose-spelled utilit${warnings === 1 ? 'y' : 'ies'} also present in code.`,
)
console.log('Describe a utility; never spell it.')
process.exit(leaks > 0 ? 1 : 0)
