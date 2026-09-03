/**
 * The gap list, classified — which missing sort/filter is a one-line
 * declaration, which needs an accessor in the client's `QueryShape` first, and
 * which is a table with no query behind it at all.
 *
 * Reads the audit's own parse (see `table-audit.mjs`) and adds two things: the
 * fields each row TYPE actually carries, and the fields each shape already
 * knows how to sort. A column whose id is neither a field on the row nor a key
 * in the shape is a derived or composite cell, and it is reported as such
 * rather than as a gap — `Identity`, an action column and a computed deviation
 * are all correctly unsortable.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const audit = readFileSync(join(ROOT, 'scratch/table-audit.txt'), 'utf8')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.ts$/.test(name)) out.push(full)
  }
  return out
}

/* ── the fields each row type carries ──────────────────────────────────── */
const typeFields = new Map()
for (const file of walk(join(ROOT, 'src/data/types'))) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(/export interface ([A-Za-z_$][\w$]*)[^{]*\{/g)) {
    let depth = 0
    let i = m.index + m[0].length - 1
    const start = i
    for (; i < src.length; i += 1) {
      if (src[i] === '{') depth += 1
      else if (src[i] === '}') {
        depth -= 1
        if (depth === 0) break
      }
    }
    const body = src.slice(start, i)
    const fields = new Set(
      [...body.matchAll(/^\s{2}([a-z][\w$]*)\??\s*:/gm)].map((f) => f[1]),
    )
    typeFields.set(m[1], fields)
  }
}

/* ── what each shape can already sort / facet ──────────────────────────── */
const shapes = new Map()
for (const file of walk(join(ROOT, 'src/data'))) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(/QueryShape<\s*([A-Za-z_$][\w$]*)\s*>\s*=\s*\{/g)) {
    let depth = 0
    let i = src.indexOf('{', m.index + m[0].length - 1)
    const start = i
    for (; i < src.length; i += 1) {
      if (src[i] === '{') depth += 1
      else if (src[i] === '}') {
        depth -= 1
        if (depth === 0) break
      }
    }
    const body = src.slice(start, i)
    const sortableBlock = /sortable:\s*\{/.exec(body)
    let sortable = new Set()
    if (sortableBlock) {
      let d = 0
      let j = sortableBlock.index + sortableBlock[0].length - 1
      const s0 = j
      for (; j < body.length; j += 1) {
        if (body[j] === '{') d += 1
        else if (body[j] === '}') {
          d -= 1
          if (d === 0) break
        }
      }
      const inner = body.slice(s0, j)
      sortable = new Set(
        [...inner.matchAll(/(?:^|\n)\s{4}([A-Za-z_$][\w$]*)\s*:/g)].map((k) => k[1]),
      )
    }
    const facetBlock = /facetable:\s*\[([^\]]*)\]/.exec(body)
    const facetable = new Set(
      facetBlock ? [...facetBlock[1].matchAll(/'([^']+)'/g)].map((k) => k[1]) : [],
    )
    shapes.set(m[1], { sortable, facetable, file: relative(ROOT, file).replace(/\\/g, '/') })
  }
}

/* ── classify the audit's rows ─────────────────────────────────────────── */
const out = []
let file = null
let rowType = null
const tally = { declare: 0, extend: 0, derived: 0, noShape: 0 }

for (const line of audit.split('\n')) {
  const head = /^(\S+\.tsx?)\s+<([A-Za-z_$][\w$]*)>/.exec(line)
  if (head) {
    file = head[1]
    rowType = head[2]
    out.push('')
    out.push(`${file}   <${rowType}>`)
    continue
  }
  const col = /^ {4}(\S+)\s+(\S+)\s+(sort ✓|sort —|SORT MISSING \([^)]*\))\s{2}(.*)$/.exec(line)
  if (!col || !file) continue
  const [, id, dataType, sortCell, filterCell] = col
  const shape = shapes.get(rowType)
  const fields = typeFields.get(rowType) ?? new Set()
  const hasSort = sortCell.startsWith('sort ✓')
  const hasFilter = filterCell.startsWith('filter ✓')
  if (hasSort && hasFilter) continue

  const notes = []
  if (!hasSort) {
    if (!shape) {
      notes.push('sort: no QueryShape behind this table')
      tally.noShape += 1
    } else if (shape.sortable.has(id)) {
      notes.push(`sort: DECLARE — shape already sorts '${id}'`)
      tally.declare += 1
    } else if (fields.has(id)) {
      notes.push(`sort: EXTEND — '${id}' is a field on ${rowType}, shape needs an accessor`)
      tally.extend += 1
    } else {
      notes.push('sort: derived/composite cell — no scalar field of this name')
      tally.derived += 1
    }
  }
  if (!hasFilter) {
    if (!shape) notes.push('filter: no QueryShape')
    else if (shape.facetable.has(id)) notes.push(`filter: DECLARE — '${id}' is facetable`)
    else if (fields.has(id) && ['enum', 'boolean'].includes(dataType))
      notes.push(`filter: EXTEND — enum field '${id}' is not facetable yet`)
    else notes.push(`filter: —  (${dataType})`)
  }
  out.push(`    ${id.padEnd(24)} ${notes.join('   |   ')}`)
}

out.unshift(
  `sort gaps — ${tally.declare} declare-only, ${tally.extend} need a shape accessor, ` +
    `${tally.derived} derived/composite, ${tally.noShape} in tables with no query\n`,
)
writeFileSync(join(ROOT, 'scratch/table-gaps.txt'), out.join('\n'))
console.log(out[0])

/* ── the inverse check, and it is the one that matters ──────────────────
   `sortRows` THROWS on an unknown field, so a `sortField` the shape cannot
   resolve is a crash the moment an operator opens the sort menu — not a
   silent no-op. Every declaration is checked against its shape. */
const bad = []
let f2 = null
let t2 = null
for (const line of audit.split('\n')) {
  const head = /^(\S+\.tsx?)\s+<([A-Za-z_$][\w$]*)>/.exec(line)
  if (head) { f2 = head[1]; t2 = head[2]; continue }
  const m = /^ {4}(\S+)\s+\S+\s+sort ✓/.exec(line)
  if (!m || !f2) continue
  const shape = shapes.get(t2)
  if (!shape) continue
  const src = readFileSync(join(ROOT, f2), 'utf8')
  const decl = new RegExp(`id: '${m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',[\s\S]{0,400}?sortField: '([^']+)'`)
  const d = decl.exec(src)
  const field = d ? d[1] : m[1]
  if (!shape.sortable.has(field)) bad.push(`${f2}  ${m[1]}  ->  '${field}' is not in ${t2}'s sortable map`)
}
console.log(bad.length === 0 ? 'every declared sortField resolves ✓' : 'UNRESOLVABLE SORT FIELDS:\n  ' + bad.join('\n  '))
