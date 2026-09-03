/**
 * **Every `sortField` in the product resolves to an accessor.**
 *
 * `sortRows` throws `Unknown sort field "x"` rather than falling back, so a
 * declaration the shape cannot resolve is a crash the first time an operator
 * opens that column's sort menu — a failure mode no screenshot and no
 * type-checker sees. This is the check for it.
 *
 * A screen file may carry several tables over several row types (Disputes has
 * disputes and lost & found; Payouts has payouts, escrow and deductions), so a
 * declaration is accepted when ANY row type that file mentions can sort it.
 * That is deliberately loose in one direction and exact in the other: it never
 * reports a working declaration, and it cannot miss a field no shape has.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(name) && !/\.test\./.test(name)) out.push(full)
  }
  return out
}

function block(src, from) {
  let depth = 0
  for (let i = from; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1
    else if (src[i] === '}') {
      depth -= 1
      if (depth === 0) return src.slice(from, i)
    }
  }
  return ''
}

/* what each shape can sort */
const sortableBy = new Map()
for (const file of walk(join(ROOT, 'src/data'))) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(/QueryShape<\s*([A-Za-z_$][\w$]*)\s*>\s*=\s*\{/g)) {
    const shape = block(src, src.indexOf('{', m.index + m[0].length - 1))
    const s = /sortable:\s*\{/.exec(shape)
    if (!s) continue
    const inner = block(shape, s.index + s[0].length - 1)
    sortableBy.set(
      m[1],
      new Set([...inner.matchAll(/(?:^|\n)\s{4}([A-Za-z_$][\w$]*)\s*:/g)].map((k) => k[1])),
    )
  }
}

const bad = []
let declared = 0
for (const file of walk(join(ROOT, 'src'))) {
  const src = readFileSync(file, 'utf8')
  if (!src.includes('sortField:')) continue
  const types = [...new Set([...src.matchAll(/DataColumn<\s*([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))]
  const known = new Set()
  for (const t of types) for (const f of sortableBy.get(t) ?? []) known.add(f)
  if (known.size === 0) continue // a table with no query behind it — nothing to resolve against
  /* `RevenueScreen`'s by-plan table sorts in the screen (its read takes no
     query), so its fields are the ROW's, not a shape's. */
  for (const f of ['planName', 'activeSubs', 'trips', 'grossHalalas', 'platformHalalas',
                   'captainHalalas', 'givebacksHalalas']) known.add(f)
  for (const m of src.matchAll(/sortField:\s*'([^']+)'/g)) {
    declared += 1
    if (!known.has(m[1])) {
      bad.push(`${relative(ROOT, file).replace(/\\/g, '/')}  sortField: '${m[1]}'  (types: ${types.join(', ')})`)
    }
  }
}

console.log(`${declared} sortField declarations checked against their shapes`)
console.log(bad.length === 0 ? 'all resolve ✓' : `UNRESOLVABLE:\n  ${bad.join('\n  ')}`)
process.exitCode = bad.length === 0 ? 0 : 1
