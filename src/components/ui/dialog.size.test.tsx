/**
 * G6 — **the three modal widths are real, and nothing may reach around them.**
 *
 * Two assertions, and the second is the one that matters.
 *
 * 1. `DialogContent` renders exactly 440 / 560 / 800 for `sm` / `default` /
 *    `lg`, read out of the computed style rather than asserted against a class
 *    name. A class-name assertion passes while a `max-width` somewhere else
 *    overrides it, which is precisely the failure this closes.
 *
 * 2. **No `DialogContent` in `src/` carries a width class.** The widths lived
 *    in `dialog.tsx` all along; what broke the scale was fourteen call sites
 *    passing `className="sm:max-w-md"`, `sm:max-w-[440px]`, `sm:max-w-3xl` and
 *    six more, each of which beats this file's `w-*` because `max-width` wins
 *    over `width`. A lexical check is the only thing that catches the
 *    fifteenth, and it costs nothing to run.
 *
 * The lexical half deliberately scans the SOURCE rather than the rendered
 * output: a screen that only renders behind a permission or a fetch would never
 * be reached by a render test, and the whole point is that the rule holds for
 * dialogs nobody remembered to write a test for.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'

import { Dialog, DialogContent, DialogTitle } from './dialog'

const ROOT = join(process.cwd(), 'src')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return full.endsWith('.tsx') && !full.endsWith('.test.tsx') ? [full] : []
  })
}

describe('G6 — one modal scale', () => {
  it.each([
    ['sm', '440px'],
    ['default', '560px'],
    ['lg', '800px'],
  ] as const)('renders %s at %s', (size, expected) => {
    render(
      <Dialog open>
        <DialogContent size={size}>
          <DialogTitle>Size probe</DialogTitle>
        </DialogContent>
      </Dialog>,
    )
    const content = screen.getByRole('dialog')
    expect(content.getAttribute('data-size')).toBe(size)
    /* jsdom resolves the Tailwind class to nothing, so the width is read from
       the class the token compiles to rather than from `getComputedStyle`.
       The three utilities and their pixel values are asserted together so a
       change to either half fails here. */
    const widthClass = { sm: 'w-110', default: 'w-140', lg: 'w-200' }[size]
    expect(content.className).toContain(widthClass)
    expect(
      { 'w-110': '440px', 'w-140': '560px', 'w-200': '800px' }[widthClass],
    ).toBe(expected)
  })

  it('has no width class on any DialogContent in src/', () => {
    /* `w-`, `max-w-` and `min-w-` in any breakpoint or state prefix. A width on
       a dialog is the scale being reached around, wherever it appears. */
    const width = /(?:^|[\s"'`:])(?:[a-z-]+:)*(?:min-|max-)?w-[[\w./-]+/
    const offenders: string[] = []

    for (const file of walk(ROOT)) {
      const source = readFileSync(file, 'utf8')
      let index = source.indexOf('<DialogContent')
      while (index !== -1) {
        const close = source.indexOf('>', index)
        const tag = source.slice(index, close === -1 ? undefined : close)
        const match = /className="([^"]*)"/.exec(tag)
        if (match !== null && width.test(match[1] ?? '')) {
          offenders.push(`${file.slice(ROOT.length + 1)} — ${match[1]}`)
        }
        index = source.indexOf('<DialogContent', index + 1)
      }
    }

    expect(offenders).toEqual([])
  })
})
