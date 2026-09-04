/**
 * The Arabic dictionary is complete and consistent with the English one.
 * The key count itself is generated into `docs/08-i18n/KEYS.md`; no test
 * asserts a number quoted in a comment.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AR, EN } from '@/i18n/dictionaries'
/* The two screen dictionaries `dictionaries.ts` has not registered. They are
   still REACHABLE in Arabic: `withFallback` passes the English string as a
   `defaultValue`, and `translate` prefers `dictionary[key]` over it, so an
   Arabic entry wins on those screens even though the key is not in `EN`. */
import { CORPORATE_EN } from '@/screens/operations/corporate/copy'
import { DISPATCH_EN } from '@/screens/operations/dispatch/copy'
import { PLURAL_CATEGORIES } from './plural'
import { placeholdersIn } from './translate'

/** Drop every `${...}` group, braces balanced, so nested templates go too. */
function stripInterpolations(source: string): string {
  let out = ''
  let depth = 0
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '$' && source[i + 1] === '{') {
      depth += 1
      i += 1
    } else if (depth > 0 && source[i] === '}') depth -= 1
    else if (depth === 0) out += source[i]
  }
  return out
}

describe('AR is complete', () => {
  /* This block used to guard `AR = {}` as AC-74's fixture, and the fixture has
     served its purpose: the fallback chain is proved by `i18n.test.ts`, which
     builds its own empty dictionary rather than borrowing the shipping one.

     What matters now is the OPPOSITE property. DESIGN.md §9.3's objection was
     never to translating; it was to a HALF-translated console, where an operator
     reads two languages on one screen. So the assertion is completeness: every
     key an operator can reach in English resolves in Arabic, and the day
     somebody adds an English key without its Arabic string, this fails and names
     it. */
  const enKeys = Object.keys(EN)

  it('answers every key EN answers', () => {
    const missing = enKeys.filter((key) => AR[key] === undefined).sort()
    expect(missing, 'reachable from EN, absent from AR — add it in src/i18n/ar/').toEqual([])
  })

  it('carries no key EN does not', () => {
    const unregistered = { ...CORPORATE_EN, ...DISPATCH_EN }
    const stray = Object.keys(AR).filter(
      (key) => EN[key] === undefined && unregistered[key] === undefined,
    )
    /* A plural FAMILY is the exception, and the only one. Arabic has six CLDR
       categories against English's two, so `ticket.meta#two` legitimately
       exists in AR and not in EN. The family itself still has to. */
    const orphans = stray.filter((key) => {
      const family = key.split('#')[0]
      return !enKeys.some((candidate) => candidate.startsWith(`${family}#`))
    })
    expect(orphans, 'in AR, in no English dictionary — registered or not').toEqual([])
  })

  it('gives every plural family all six Arabic categories', () => {
    const families = new Set(
      enKeys.filter((key) => key.includes('#')).map((key) => key.split('#')[0] as string),
    )
    const gaps: string[] = []
    for (const family of families) {
      for (const category of PLURAL_CATEGORIES) {
        if (AR[`${family}#${category}`] === undefined) gaps.push(`${family}#${category}`)
      }
    }
    /* Not pedantry: `2` is `two` and `3`–`10` is `few` in Arabic, so a family
       that only copies English's one/other renders a wrong noun form at counts
       an operator sees every day. */
    expect(gaps, 'a plural family Arabic cannot resolve at some count').toEqual([])
  })

  /**
   * **X2 / T4.1 — the data layer must not write English.**
   *
   * `clients/myWork.ts` used to build `Captain application — {name}` and hand it
   * to a table an operator reads in Arabic. Rows carry a key and its values now;
   * this fails the day one carries a sentence again.
   */
  it('assembles no operator-facing sentence under src/data/clients', () => {
    const dir = join(process.cwd(), 'src/data/clients')
    const fields = /^\s*(title|subtitle|label|heading|summary|description):\s*(.+)$/
    const offenders: string[] = []
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
      const lines = readFileSync(join(dir, file), 'utf8').split('\n')
      lines.forEach((line, index) => {
        const match = fields.exec(line)
        if (!match) return
        /* Interpolations are the row's own values — a name, an id, a place.
           What is left over is what the client wrote itself. */
        const literal = stripInterpolations(match[2] ?? '')
        if (/[A-Za-z]{2,}[ ,][A-Za-z]{2,}/.test(literal)) {
          offenders.push(`${file}:${index + 1} ${line.trim()}`)
        }
      })
    }
    expect(offenders, 'English assembled in the data layer; use a key and params').toEqual([])
  })

  it('preserves every placeholder the English template declares', () => {
    const broken: string[] = []
    for (const key of enKeys) {
      const arabic = AR[key]
      if (arabic === undefined) continue
      const declared = new Set(placeholdersIn(EN[key] as string))
      for (const name of placeholdersIn(arabic)) {
        if (!declared.has(name)) broken.push(`${key}: {${name}}`)
      }
    }
    /* One direction only. A placeholder in Arabic that English never declares
       throws at `interpolate`; one English declares and Arabic drops is legal
       and often correct — the dual form names the count in the word. */
    expect(broken, 'a placeholder Arabic invents, which would throw on render').toEqual([])
  })
})
