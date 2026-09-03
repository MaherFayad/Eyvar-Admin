/**
 * **Every table in the product, column by column, against what its data layer
 * can actually sort and filter.**
 *
 * A `DataColumn` declares sortability by carrying `sortField` and filterability
 * by carrying `filter` (`src/components/table/columns.ts`). What a column MAY
 * declare is decided one layer down, by the client's `QueryShape`: `sortable`
 * is a map of field -> accessor, and `facetable` is the list of fields the
 * filter menu can count. So a gap is not "a column with no sort" — it is a
 * column whose field the shape can sort and which does not say so.
 *
 * Parsed rather than rendered, deliberately: a third of these tables sit behind
 * a role, a filter or an overlay, and a screenshot pass would audit whichever
 * ones happened to be reachable.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(full)
  }
  return out
}

/** Strip comments and strings so brace matching cannot be fooled by either. */
function mask(src) {
  const out = src.split('')
  let i = 0
  while (i < src.length) {
    const two = src.slice(i, i + 2)
    if (two === '//') {
      while (i < src.length && src[i] !== '\n') out[i++] = ' '
    } else if (two === '/*') {
      const end = src.indexOf('*/', i + 2)
      const stop = end === -1 ? src.length : end + 2
      while (i < stop) {
        if (src[i] !== '\n') out[i] = ' '
        i += 1
      }
    } else if (src[i] === "'" || src[i] === '"' || src[i] === '`') {
      const quote = src[i]
      out[i] = ' '
      i += 1
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\') {
          out[i] = ' '
          i += 1
        }
        if (i < src.length && src[i] !== '\n') out[i] = ' '
        i += 1
      }
      if (i < src.length) out[i++] = ' '
    } else {
      i += 1
    }
  }
  return out.join('')
}

/** The `{ … }` that starts at `open`, as a [start, end] pair over the source. */
function objectAt(masked, open) {
  let depth = 0
  for (let i = open; i < masked.length; i += 1) {
    if (masked[i] === '{') depth += 1
    else if (masked[i] === '}') {
      depth -= 1
      if (depth === 0) return [open, i + 1]
    }
  }
  return null
}

/** Top-level keys of one object literal, with their raw values. */
function topKeys(src, masked, start, end) {
  const keys = {}
  let depth = 0
  let keyStart = -1
  for (let i = start; i < end; i += 1) {
    const ch = masked[i]
    if (ch === '{' || ch === '[' || ch === '(') depth += 1
    else if (ch === '}' || ch === ']' || ch === ')') depth -= 1
    if (depth !== 1) continue
    if (keyStart === -1 && /[A-Za-z_$]/.test(ch)) keyStart = i
    else if (keyStart !== -1 && ch === ':') {
      const key = src.slice(keyStart, i).trim()
      // value runs to the next depth-1 comma
      let j = i + 1
      let d = depth
      while (j < end) {
        const c = masked[j]
        if (c === '{' || c === '[' || c === '(') d += 1
        else if (c === '}' || c === ']' || c === ')') d -= 1
        if (d === 1 && c === ',') break
        if (d === 0) break
        j += 1
      }
      if (/^[A-Za-z_$][\w$]*$/.test(key)) keys[key] = src.slice(i + 1, j).trim()
      keyStart = -1
      i = j
    } else if (keyStart !== -1 && !/[\w$]/.test(ch)) keyStart = -1
  }
  return keys
}

/* ── 1. every column, everywhere ───────────────────────────────────────── */

const columnsByFile = new Map()
for (const file of walk(join(ROOT, 'src'))) {
  const src = readFileSync(file, 'utf8')
  if (!src.includes('DataColumn')) continue
  const masked = mask(src)
  const rel = relative(ROOT, file).replace(/\\/g, '/')

  // the row type each column array is over, in declaration order
  const generics = [...src.matchAll(/DataColumn<\s*([A-Za-z_$][\w$]*)/g)].map((m) => m[1])
  const rowType = generics[0] ?? '?'

  const found = []
  for (let i = 0; i < masked.length; i += 1) {
    if (masked[i] !== '{') continue
    const span = objectAt(masked, i)
    if (!span) continue
    const [start, end] = span
    if (end - start > 20000) continue
    const keys = topKeys(src, masked, start, end)
    if (!('id' in keys) || !('header' in keys) || !('cell' in keys)) continue
    const id = (keys.id.match(/'([^']*)'/) ?? [])[1] ?? keys.id
    found.push({
      id,
      dataType: (keys.dataType?.match(/'([^']*)'/) ?? [])[1] ?? null,
      sortField: keys.sortField ? ((keys.sortField.match(/'([^']*)'/) ?? [])[1] ?? keys.sortField) : null,
      filterField: keys.filter
        ? ((keys.filter.match(/field:\s*'([^']*)'/) ?? [])[1] ?? '(inline)')
        : null,
      filterKind: keys.filter ? ((keys.filter.match(/kind:\s*'([^']*)'/) ?? [])[1] ?? '?') : null,
      alwaysVisible: 'alwaysVisible' in keys,
    })
    i = end - 1
  }
  if (found.length > 0) columnsByFile.set(rel, { rowType, columns: found })
}

/* ── 2. what each client shape can do ──────────────────────────────────── */

const shapes = new Map() // rowType -> { sortable: Set, facetable: Set, file }
for (const file of walk(join(ROOT, 'src/data'))) {
  const src = readFileSync(file, 'utf8')
  const masked = mask(src)
  for (const m of src.matchAll(/QueryShape<\s*([A-Za-z_$][\w$]*)\s*>\s*=\s*\{/g)) {
    const open = masked.indexOf('{', m.index + m[0].length - 1)
    const span = objectAt(masked, open)
    if (!span) continue
    const body = src.slice(span[0], span[1])
    const bodyMasked = masked.slice(span[0], span[1])
    const keys = topKeys(body, bodyMasked, 0, body.length)
    const sortable = new Set(
      [...(keys.sortable ?? '').matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].map((k) => k[1]),
    )
    const facetable = new Set(
      [...(keys.facetable ?? '').matchAll(/'([^']+)'/g)].map((k) => k[1]),
    )
    shapes.set(m[1], { sortable, facetable, file: relative(ROOT, file).replace(/\\/g, '/') })
  }
}

/* ── 3. the report ─────────────────────────────────────────────────────── */

const lines = []
let tables = 0
let cols = 0
let sortGaps = 0
let filterGaps = 0

for (const [file, { rowType, columns }] of [...columnsByFile].sort()) {
  const shape = shapes.get(rowType)
  tables += 1
  cols += columns.length
  const rows = []
  for (const c of columns) {
    const canSort = shape ? shape.sortable.has(c.sortField ?? c.id) : null
    // a field the shape can sort, by the column's own id when it declares none
    const sortableField = shape
      ? [c.sortField, c.id].find((f) => f && shape.sortable.has(f)) ?? null
      : null
    const facetField = shape
      ? [c.filterField, c.sortField, c.id].find((f) => f && shape.facetable.has(f)) ?? null
      : null
    const missSort = !c.sortField && sortableField
    const missFilter = !c.filterField && facetField
    if (missSort) sortGaps += 1
    if (missFilter) filterGaps += 1
    rows.push(
      [
        '    ',
        c.id.padEnd(22),
        (c.dataType ?? '—').padEnd(8),
        c.sortField ? 'sort ✓' : missSort ? `SORT MISSING (${sortableField})` : 'sort —',
        '  ',
        c.filterField ? `filter ✓ ${c.filterKind}` : missFilter ? `FILTER MISSING (${facetField})` : 'filter —',
      ].join(''),
    )
    void canSort
  }
  lines.push(`${file}   <${rowType}>${shape ? '' : '   [no QueryShape found]'}`)
  lines.push(...rows)
  lines.push('')
}

lines.unshift(
  `${tables} column sets, ${cols} columns — ${sortGaps} sortable-but-silent, ${filterGaps} facetable-but-silent\n`,
)
const report = lines.join('\n')
writeFileSync(join(ROOT, 'scratch/table-audit.txt'), report)
console.log(report.split('\n').slice(0, 1).join('\n'))
console.log('written to scratch/table-audit.txt')
