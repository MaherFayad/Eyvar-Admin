/**
 * **Gap A3's guard: every reason code a screen can render has a label.**
 *
 * `reasonLabel()` falls back to the raw code, which is the only safe behaviour
 * for an operator-editable registry — and it is also exactly the defect A3
 * closed. So the fallback must be *unreachable for everything we ship*. This
 * test is what makes that a build failure rather than a screenshot somebody
 * takes in six months.
 *
 * The scan is **lexical, over the fixtures and the clients**, in the shape
 * `localisedKeys.test.ts` established and for the same reason: `t()` throws
 * when a key is *rendered*, so a code sitting on a surface nobody has opened is
 * unprotected. `fin.audit.*` cost three waves by being checked at render time.
 *
 * It reads two sources, because a code reaches a screen two ways:
 *
 *   1. **written in a fixture** — `reasonCode: 'CAP_LATE'`, and every `key:` in
 *      the reason-code registry, which is the vocabulary the picker offers;
 *   2. **minted in a client** — `clients/disputes.ts` builds
 *      `dispute_${dispute.kind…}`, so the six `DisputeKind` members are reason
 *      codes that appear nowhere as a literal. Template-built keys are the ones
 *      a lexical scan misses, so that one is enumerated from `DISPUTE_KINDS`
 *      rather than matched.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DISPUTE_KINDS } from '@/data/types'
import { EN } from '../dictionaries'
import { VOCABULARY_EN, hasReasonLabel, reasonLabel } from './copy'

const ROOT = join(process.cwd(), 'src')

function read(...parts: string[]): string {
  /* Comments stripped: this folder's own headers name codes in prose, and a
     code EXPLAINED is not a code SHIPPED. Same reason `localisedKeys.test.ts`
     strips them. */
  return readFileSync(join(ROOT, ...parts), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
}

function literalReasonCodes(source: string): string[] {
  return [...source.matchAll(/reasonCode: '([^']+)'/g)].map((m) => m[1] ?? '')
}

describe('the reason-code vocabulary is complete', () => {
  it('labels every code a shipped fixture writes', () => {
    const files = [
      'complaints.ts',
      'fairness.ts',
      'financials.ts',
      'ledger.ts',
      'tickets.ts',
    ]
    const codes = new Set(files.flatMap((f) => literalReasonCodes(read('data', 'fixtures', f))))
    expect(codes.size).toBeGreaterThan(0)
    expect([...codes].filter((c) => !hasReasonLabel(c)).sort()).toEqual([])
  })

  it('labels every code in the policy registry, retired ones included', () => {
    /* A retired code is the case that matters: it is gone from the picker and
       still on every historical record, which is `ReasonCodesCard`'s whole
       reason for existing. A missing label here is a two-year-old refund
       rendering as `TRP_GHOST_COMPLETE`. */
    const registry =
      read('data', 'fixtures', 'policy.ts').split('export const reasonCodeFixtures')[1] ?? ''
    const keys = [...registry.matchAll(/^\s{4}key: '([A-Z_]+)',$/gm)].map((m) => m[1] ?? '')
    expect(keys.length).toBeGreaterThanOrEqual(30)
    expect(keys.filter((k) => !hasReasonLabel(k)).sort()).toEqual([])
  })

  it('labels every code the dispute resolver mints', () => {
    /* Mirrors `clients/disputes.ts`: `dispute_${kind.replace(/-/g, '_')}`. */
    const minted = DISPUTE_KINDS.map((kind) => `dispute_${kind.replace(/-/g, '_')}`)
    expect(minted.filter((c) => !hasReasonLabel(c)).sort()).toEqual([])
  })

  it('is assembled into EN, so every key resolves through the real dictionary', () => {
    for (const key of Object.keys(VOCABULARY_EN)) expect(EN[key]).toBe(VOCABULARY_EN[key])
  })
})

describe('reasonLabel', () => {
  const t = (key: string) => EN[key] ?? `MISSING:${key}`

  it('renders a sentence, not the identifier', () => {
    expect(reasonLabel(t, 'fare_dispute')).toBe('Rider disputes the fare')
    expect(reasonLabel(t, 'PAY_REFUND_REQ')).toBe('Rider asked for a refund')
  })

  it('returns an unknown code unchanged rather than throwing', () => {
    /* An operator with `manage_ops_policy` can mint a code this file has never
       seen. That must degrade to what the screen printed before A3 — not to a
       crash and not to a blank cell. */
    expect(reasonLabel(t, 'NEWLY_MINTED_BY_AN_ADMIN')).toBe('NEWLY_MINTED_BY_AN_ADMIN')
  })

  it('passes null through, because "no reason recorded" is not "no label"', () => {
    expect(reasonLabel(t, null)).toBeNull()
    expect(reasonLabel(t, undefined)).toBeNull()
  })
})
