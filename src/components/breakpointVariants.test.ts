/**
 * **Tailwind's own responsive variants DO NOT EXIST in this product, and a
 * utility that uses one compiles to nothing at all.**
 *
 * `src/styles/globals.css` sets `--breakpoint-*: initial` inside `@theme`. That
 * is deliberate and it is load-bearing — it is what stops a screen minting its
 * own breakpoint and quietly softening the density rules. The cost is that the
 * five variants Tailwind ships are deleted along with it, so a class carrying
 * one of their prefixes generates **no rule**. Not a broken rule, not a rule at
 * the wrong width: no rule.
 *
 * **The failure mode is invisible, which is why it needed a gate.** A row that
 * asks for one column, then asks for three at the first Tailwind breakpoint,
 * renders one column at 1440px. Nothing errors. `tsc` is clean, the build is
 * green, and the source reads like a considered responsive layout — the second
 * half of the sentence is simply never spoken. Sixteen call sites shipped this
 * way across nine screens and two dialogs, and two of them were measured before
 * anyone noticed: a settings form ran six controls to a 998px line and another
 * to 870px, against §7.1's 640px measure, purely because the column request
 * behind them was dead. Nobody had ever seen the layout those files describe.
 *
 * ## What to write instead
 *
 * The product is desktop-first with ONE max-width variant. `globals.css`
 * declares exactly two responsive variants and a screen may not add a third:
 *
 *   - the **compact** variant — `@media (width < 768px)`, the mobile shell
 *   - the **wide** variant — `@media (min-width: 1344px)`, §0.1's three uses
 *
 * So the unprefixed class is the DESKTOP answer, and the compact variant
 * overrides it below 768px. A layout that wanted three columns on a desktop and
 * one on a phone states three columns plainly and asks the compact variant for
 * the single column. Never the reverse: mobile-first would invert nineteen
 * index screens, a three-column shell and a nine-column table that are all
 * authored for 1280 and up.
 *
 * ## What this test matches, and what it deliberately does not
 *
 * The signature is a variant PREFIX immediately followed by the start of a
 * utility — a lowercase letter, an opening bracket or a negation. That is
 * narrow on purpose, because these two-letter tokens turn up constantly in text
 * that is not a class:
 *
 *   - a documentation citation such as a markdown filename followed by a line
 *     number — the character after the colon is a digit, so it cannot match;
 *   - a URL with a port, for the same reason, and the dot before the extension
 *     is excluded by the left-hand boundary;
 *   - prose naming a prefix on its own, where the next character is a space or
 *     a backtick.
 *
 * Two exclusions beyond that:
 *
 * **Only string literals are read.** A class only ever reaches the stylesheet
 * from a string, so comments and JSX prose are skipped — including the
 * docblocks in `ui/dialog.tsx` and `lib/i18n/isolate.ts` that name these
 * prefixes precisely in order to warn about them. A test that forced those
 * warnings to be deleted would be removing the documentation of its own defect.
 *
 * **Test files are skipped.** `globals.css` already excludes them from
 * Tailwind's scan for exactly this reason — 0.4 and 0.7 both shipped a banned
 * class into `dist` out of a test that existed to forbid it. `isolate.test.ts`
 * has to pass these prefixes as inputs to the helper that parses them, and
 * `dialog.size.test.tsx` has to name the widths it bans.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const GLOBALS = join(SRC, 'styles', 'globals.css')

/**
 * The prefixes Tailwind ships and this product deletes.
 *
 * `2xl` leads the alternation so it is tried before `xl`; otherwise the shorter
 * arm matches at the `x` and is then rejected by the left boundary, and the
 * longer form escapes.
 *
 * The lookahead is the whole precision of the check: a utility starts with a
 * lowercase letter, an arbitrary-value bracket, a variable bracket or a minus.
 * A digit, a space, a quote or a backtick after the colon is prose.
 *
 * **`@` is in the left boundary, and it is not a loophole.** `@xl:grid-cols-2`
 * is a CONTAINER query, not a viewport one. It reads `--container-xl`, which
 * this product does not delete and which `@theme inline` only ever adds to
 * (`--container-page`, `--container-measure`); the deletion is `--breakpoint-*:
 * initial`, and it reaches the media variants alone. Compiled against the
 * shipped `globals.css`, `@xl:grid-cols-2` emits
 * `@container (width >= 36rem){.\@xl\:grid-cols-2{…}}` — a real rule, at a
 * real width, which is the exact opposite of what this gate exists to catch.
 *
 * Without the `@`, `@sm:`/`@md:`/`@lg:`/`@xl:` were all flagged and `@4xl:` was
 * not, purely because a digit happens to sit in the boundary class — so the
 * gate was inconsistent as well as wrong, and it fired on
 * `MetricBoardScreen.panelColumns`, which is the one row in the product whose
 * width the viewport genuinely cannot predict.
 */
const DEAD_VARIANT = /(?<![\w./$@-])(2xl|sm|md|lg|xl):(?=[a-z[(-])/g

/** What a reader gets told when they trip it. */
const WHY = [
  'this compiles to NOTHING.',
  'globals.css sets --breakpoint-* to initial, so Tailwind’s sm/md/lg/xl/2xl variants',
  'do not exist and the utility is silently dropped — leaving the unprefixed class',
  'in force at every width, on a 1440px desktop included.',
  'This product is desktop-first: write the DESKTOP answer unprefixed, and override it',
  'below 768px with the compact variant declared in globals.css.',
  'Above 1344px, the wide variant. There is no third breakpoint.',
].join(' ')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return entry === 'node_modules' ? [] : sourceFiles(path)
    if (!/\.tsx?$/.test(entry)) return []
    return /\.test\.tsx?$/.test(entry) ? [] : [path]
  })
}

/**
 * Every string, template and JSX-attribute literal in a TS/TSX source, with the
 * line each one starts on.
 *
 * A hand-rolled scanner rather than a parser because the question is lexical and
 * the answer must survive a file that does not typecheck. Two known limits, both
 * chosen to fail toward silence rather than toward a false alarm:
 *
 *   - a regex literal containing a quote character can open a spurious string.
 *     A quoted run is therefore abandoned at a newline, which bounds the damage
 *     to the rest of one line;
 *   - an interpolation inside a template is read as part of the template. A
 *     class expression nested there is still a class expression, so a match
 *     inside one is a true positive.
 */
function stringLiterals(source: string): Array<{ text: string; line: number }> {
  const out: Array<{ text: string; line: number }> = []
  let line = 1
  let i = 0

  while (i < source.length) {
    const c = source[i]
    const next = source[i + 1]

    if (c === '\n') {
      line += 1
      i += 1
      continue
    }

    if (c === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i += 1
      continue
    }

    if (c === '/' && next === '*') {
      i += 2
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') line += 1
        i += 1
      }
      i += 2
      continue
    }

    if (c === '"' || c === "'" || c === '`') {
      const startLine = line
      const quote = c
      let text = ''
      i += 1
      while (i < source.length) {
        const d = source[i]
        if (d === '\\') {
          text += source.slice(i, i + 2)
          i += 2
          continue
        }
        if (d === quote) {
          i += 1
          break
        }
        if (d === '\n') {
          line += 1
          /* An unterminated single- or double-quoted run is a mis-read, most
             likely a quote inside a regex. Give up on it at the newline. */
          if (quote !== '`') break
        }
        text += d
        i += 1
      }
      out.push({ text, line: startLine })
      continue
    }

    i += 1
  }

  return out
}

/** `line:variant` for every dead variant reachable from a string in `source`. */
export function deadVariantsIn(source: string): string[] {
  return stringLiterals(source).flatMap(({ text, line }) =>
    [...text.matchAll(DEAD_VARIANT)].map((match) => `${line}:${match[1]}`),
  )
}

describe('Tailwind’s responsive variants are deleted, so a utility using one is dead code', () => {
  it('has no sm/md/lg/xl/2xl variant in any shipped source file', () => {
    const offenders = sourceFiles(SRC).flatMap((path) => {
      const relative = path.slice(SRC.length + 1).replace(/\\/g, '/')
      return deadVariantsIn(readFileSync(path, 'utf8')).map(
        (hit) => `${relative}:${hit.split(':')[0]} — variant ${hit.split(':')[1]}`,
      )
    })
    expect(offenders, WHY).toEqual([])
  })

  /* A lexical gate is worth exactly its ability to fail. Without this, a regex
     that stopped matching would report a clean tree forever — the same failure
     the audit checker one directory over had. */
  it('detects the shape it exists to catch', () => {
    const request = `${'md'}:${'grid-cols-3'}`
    expect(deadVariantsIn(`<div className="grid grid-cols-1 gap-4 ${request}" />`)).toEqual([
      '1:md',
    ])
  })

  it('catches every one of the five, and the stacked and arbitrary forms', () => {
    const dead = ['sm', 'md', 'lg', 'xl', '2xl'].map((prefix) => `"${prefix}:${'flex-row'}"`)
    expect(deadVariantsIn(dead.join('\n'))).toEqual(['1:sm', '2:md', '3:lg', '4:xl', '5:2xl'])

    expect(deadVariantsIn(`'hover:${'lg'}:${'underline'}'`)).toEqual(['1:lg'])
    expect(deadVariantsIn(`'${'md'}:${'-mt-2'}'`)).toEqual(['1:md'])
    expect(deadVariantsIn(`'${'sm'}:${'w-['}${'--ev-rail-w]'}'`)).toEqual(['1:sm'])
  })

  it('leaves the two variants this product actually has alone', () => {
    expect(deadVariantsIn(`'grid grid-cols-3 ${'compact'}:${'grid-cols-1'}'`)).toEqual([])
    expect(deadVariantsIn(`'${'wide'}:${'grid-cols-4'} ${'rtl'}:${'translate-x-1/2'}'`)).toEqual([])
  })

  /* A container query is a different variant reading a different namespace, and
     `--container-*` is not deleted. See `DEAD_VARIANT`. All five are asserted
     because four of them used to fire and `@4xl` never did — an inconsistency
     that is itself evidence the boundary, not the layout, was wrong. */
  it('leaves CONTAINER queries alone — they read --container-*, which survives', () => {
    for (const size of ['sm', 'md', 'lg', 'xl', '2xl', '4xl']) {
      expect(
        deadVariantsIn(`'grid-cols-1 @${size}:${'grid-cols-2'}'`),
        `@${size}: is a container query and compiles to a real rule`,
      ).toEqual([])
    }
    /* The line that tripped it: `MetricBoardScreen.panelColumns`, verbatim. */
    expect(
      deadVariantsIn(`'grid-cols-1 @${'xl'}:${'grid-cols-2'} @4xl:${'grid-cols-3'}'`),
    ).toEqual([])
    /* And the bare form is still dead, so widening the boundary cost nothing. */
    expect(deadVariantsIn(`'grid-cols-1 ${'xl'}:${'grid-cols-2'}'`)).toEqual(['1:xl'])
  })

  /* The premise behind that exemption, asserted rather than assumed — the same
     move the `globals.css` check below makes for the deletion itself. */
  it('rests on globals.css NOT deleting the container scale', () => {
    const css = readFileSync(GLOBALS, 'utf8')
    expect(
      css,
      'the container scale is now deleted too — the container-query exemption above is wrong',
    ).not.toMatch(/--container-\*:\s*initial/)
  })

  it('does not fire on the text these two-letter tokens really appear in', () => {
    /* A documentation citation, a URL with a port, a filename, and a prefix
       named in prose — the character after the colon decides all four. */
    expect(deadVariantsIn(`'docs/ref/tokens.${'md'}:33 and DESIGN.${'md'}:5328'`)).toEqual([])
    expect(deadVariantsIn(`'https://example.${'md'}:8080/path'`)).toEqual([])
    expect(deadVariantsIn(`'the ${'md'}: prefix is dead'`)).toEqual([])
    expect(deadVariantsIn('`a ' + '`sm' + ':` prefix on a dialog`')).toEqual([])
  })

  it('does not read comments, where these prefixes are named to warn about them', () => {
    const warning = ['/**', ` * A ${'sm'}:${'max-w-md'} on a dialog is a breakpoint arriving`, ' */'].join('\n')
    expect(deadVariantsIn(warning)).toEqual([])
    expect(deadVariantsIn(`// ${'lg'}:${'hidden'} would do nothing here`)).toEqual([])
  })

  it('still reads the code after a comment, and after a URL', () => {
    const source = [
      `// see https://example.com/${'md'}-notes`,
      `const cls = 'grid ${'md'}:${'grid-cols-2'}'`,
    ].join('\n')
    expect(deadVariantsIn(source)).toEqual(['2:md'])
  })

  /* The premise, asserted rather than assumed. If the steward ever restores
     Tailwind's scale, this gate is wrong and must be deleted rather than
     silently enforcing a rule that no longer holds. */
  it('rests on globals.css still deleting the scale and still declaring the two variants', () => {
    const css = readFileSync(GLOBALS, 'utf8')
    expect(css, 'the scale is no longer deleted — this gate is now wrong').toMatch(
      /--breakpoint-\*:\s*initial/,
    )
    expect(css, 'the compact variant is gone — the replacement this gate names does not exist').toMatch(
      /@custom-variant\s+compact\s*\(@media\s*\(width\s*<\s*768px\)\)/,
    )
    expect(css, 'the wide variant is gone').toMatch(
      /@custom-variant\s+wide\s*\(@media\s*\(min-width:\s*1344px\)\)/,
    )
  })
})
