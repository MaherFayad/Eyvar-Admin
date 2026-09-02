/**
 * **A `/** … *␘/` block in JSX child position renders as TEXT.**
 *
 * React treats it as a child, not a comment. One shipped a **376×880px slab of
 * prose into `<header>` on 35 of 35 routes**, in both languages and at both
 * widths, covering `Export CSV` on every index screen and the first KPI tile on
 * the management board.
 *
 * Nothing caught it. `tsc -b --force` was clean — it is a valid string child.
 * All 3,075 tests passed — none asserts the absence of stray text. `npm run
 * build` was green. It took a human-shaped visual audit measuring an element
 * box to find it, and by then it had been on every route for an hour.
 *
 * The correct form is `{​/* … *␘/}`. The braces are the whole difference, and
 * the same file gets it right eleven lines away — which is exactly why a person
 * reviewing a diff does not see it.
 *
 * **The signature this test matches:** an unbraced `/**` whose previous
 * non-blank line closes a JSX tag, and whose following non-blank line opens one.
 * A comment between two elements is in child position. Comments above an
 * interface member, a function or a `const` are unaffected, which is why the
 * check is anchored on both sides rather than on the comment alone.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return entry === 'node_modules' ? [] : tsxFiles(path)
    return path.endsWith('.tsx') ? [path] : []
  })
}

/** `/**` at line start, not already wrapped in braces. */
const OPENS_BLOCK = /^\s*\/\*\*/
const ALREADY_BRACED = /^\s*\{\s*\/\*/

function offenders(path: string): number[] {
  const lines = readFileSync(path, 'utf8').split('\n')
  const found: number[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    if (!OPENS_BLOCK.test(line) || ALREADY_BRACED.test(line)) continue

    let before = i - 1
    while (before >= 0 && (lines[before] ?? '').trim() === '') before -= 1
    if (before < 0) continue

    /* `>` closes a JSX tag — but `=>` is an arrow function, and a comment above
       a callback body is ordinary and correct. */
    const previous = (lines[before] ?? '').trimEnd()
    if (!previous.endsWith('>') || previous.endsWith('=>')) continue

    let end = i
    while (end < lines.length && !(lines[end] ?? '').includes('*/')) end += 1
    let after = end + 1
    while (after < lines.length && (lines[after] ?? '').trim() === '') after += 1

    if ((lines[after] ?? '').trimStart().startsWith('<')) found.push(i + 1)
  }
  return found
}

describe('a JSX comment must be braced, or React renders it as text', () => {
  it('has no `/** … */` block sitting in JSX child position', () => {
    const bad = tsxFiles(SRC).flatMap((path) =>
      offenders(path).map((line) => `${path.slice(SRC.length + 1).replace(/\\/g, '/')}:${line}`),
    )
    expect(bad, 'wrap these in braces: {/* … */}').toEqual([])
  })

  /* The detector is worth as much as its ability to fail. Without this, a regex
     that silently stopped matching would report a clean tree forever — which is
     the failure mode the checker that reported clean on `AUDIT_OPERATIONS` had,
     one directory over. */
  it('detects the shape it exists to catch', () => {
    const lines = [
      '      </DropdownMenuTrigger>',
      '',
      '  /**',
      '   * A comment in child position.',
      '   */',
      '      <DropdownMenuContent>',
    ].join('\n')
    expect(offendersFromSource(lines)).toEqual([3])
  })

  it('does not flag a comment above an interface member or a callback', () => {
    const benign = [
      '  rowActions?: ReadonlyArray<RowAction<T>>',
      '  /** Which skeleton shape. */',
      '  skeletonPattern?: string',
      '',
      '      onSelect={() =>',
      '        /* a comment above a callback body is ordinary */',
      '        doThing()',
      '      }',
    ].join('\n')
    expect(offendersFromSource(benign)).toEqual([])
  })
})

/** Same predicate as `offenders`, against a string — so the detector is testable. */
function offendersFromSource(source: string): number[] {
  const lines = source.split('\n')
  const found: number[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    if (!OPENS_BLOCK.test(line) || ALREADY_BRACED.test(line)) continue
    let before = i - 1
    while (before >= 0 && (lines[before] ?? '').trim() === '') before -= 1
    if (before < 0) continue
    const previous = (lines[before] ?? '').trimEnd()
    if (!previous.endsWith('>') || previous.endsWith('=>')) continue
    let end = i
    while (end < lines.length && !(lines[end] ?? '').includes('*/')) end += 1
    let after = end + 1
    while (after < lines.length && (lines[after] ?? '').trim() === '') after += 1
    if ((lines[after] ?? '').trimStart().startsWith('<')) found.push(i + 1)
  }
  return found
}
