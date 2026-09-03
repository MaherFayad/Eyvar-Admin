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
import type { ChurnReasonKey } from '@/data/types'
import { createTranslator, placeholdersIn } from '@/lib'
import type { Translate } from '@/lib'
import { AR } from '../ar'
import { EN } from '../dictionaries'
import {
  RIDER_TIMELINE_KINDS,
  RIDER_VOCABULARY_EN,
  VOCABULARY_EN,
  hasReasonLabel,
  reasonLabel,
  riderTimelineStrings,
} from './copy'
import { RIDER_VOCABULARY_AR } from '../ar/vocabulary'

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

/**
 * **The rider vocabulary is complete in BOTH languages, for every kind.**
 *
 * `AC-74`'s guard fires when a key is *rendered*, and a timeline kind that no
 * fixture happens to produce is a kind nobody renders until the day a record
 * does. `rider.timeline.*` is the family most exposed to that: the key is picked
 * from `RiderTimelineKind` at runtime, so a kind added to the union with no
 * strings behind it type-checks perfectly and throws in front of an operator.
 *
 * This iterates the union instead of trusting the fixtures — the same move
 * `localisedKeys.test.ts` makes for `DISPUTE_KINDS`.
 */
describe('the rider vocabulary', () => {
  it('is assembled into EN and AR, so every key resolves through the real dictionaries', () => {
    for (const key of Object.keys(RIDER_VOCABULARY_EN)) {
      expect(EN[key], `${key} missing from EN`).toBe(RIDER_VOCABULARY_EN[key])
    }
    for (const key of Object.keys(RIDER_VOCABULARY_AR)) {
      expect(AR[key], `${key} missing from AR`).toBe(RIDER_VOCABULARY_AR[key])
    }
  })

  it('gives every ChurnReasonKey a string in both languages', () => {
    /* Mirrors the union in `types/rider.ts`. Written out rather than imported
       because the type is erased at runtime and a `satisfies` on a literal is
       what makes a rename here a compile error there. */
    const keys = [
      'rider.churn.noSubscription',
      'rider.churn.cancelledOnRecord',
      'rider.churn.complaintsFiled',
      'rider.churn.ratingBelowFour',
      'rider.churn.lowRenewalRate',
      'rider.churn.lapsedUnused',
    ] as const satisfies readonly ChurnReasonKey[]
    expect(keys.filter((k) => EN[k] === undefined)).toEqual([])
    expect(keys.filter((k) => AR[k] === undefined)).toEqual([])
  })

  it('gives every RiderTimelineKind a title and a subtitle in both languages', () => {
    const missing: string[] = []
    for (const kind of RIDER_TIMELINE_KINDS) {
      for (const key of [`rider.timeline.${kind}.title`, `rider.timeline.${kind}.subtitle`]) {
        if (EN[key] === undefined) missing.push(`EN ${key}`)
        if (AR[key] === undefined) missing.push(`AR ${key}`)
      }
    }
    expect(missing, 'a half-written family throws at render time, not here').toEqual([])
  })

  /**
   * **AC-75 / §9.6 both ways.** A placeholder the caller cannot supply throws in
   * `interpolate`, and an Arabic string that names a *different* placeholder
   * from its English counterpart throws only under `lang="ar"` — which is the
   * failure mode no English screenshot can catch.
   */
  it('names the same placeholders in Arabic as in English', () => {
    const disagreed: string[] = []
    for (const key of Object.keys(RIDER_VOCABULARY_EN)) {
      const en = RIDER_VOCABULARY_EN[key]
      const ar = RIDER_VOCABULARY_AR[key]
      if (en === undefined || ar === undefined) continue
      const a = placeholdersIn(en).sort().join(',')
      const b = placeholdersIn(ar).sort().join(',')
      if (a !== b) disagreed.push(`${key}: EN(${a}) AR(${b})`)
    }
    expect(disagreed).toEqual([])
  })

  it('has no unnamed placeholder — AC-75', () => {
    for (const dict of [RIDER_VOCABULARY_EN, RIDER_VOCABULARY_AR]) {
      for (const [key, template] of Object.entries(dict)) {
        expect(placeholdersIn(template).filter((p) => p === ''), key).toEqual([])
      }
    }
  })

  /**
   * The four trip kinds carry the same route subtitle by value. They are four
   * keys so that one kind can diverge deliberately; this is what stops one of
   * them diverging by accident, in one language only.
   */
  it('keeps the four trip route subtitles in agreement', () => {
    const trips = ['trip-requested', 'trip-completed', 'trip-cancelled', 'trip-no-show']
    for (const dict of [RIDER_VOCABULARY_EN, RIDER_VOCABULARY_AR]) {
      const forms = new Set(trips.map((k) => dict[`rider.timeline.${k}.subtitle`]))
      expect([...forms]).toHaveLength(1)
    }
  })

  /**
   * **§9.5 — the mirrored glyph is in the string.** English points right, Arabic
   * points left, and neither is done with CSS. `profile.rider.trip.route` holds
   * the same pair; a route that keeps `→` under `dir="rtl"` reads as travelling
   * backwards.
   */
  it('mirrors the route arrow in Arabic', () => {
    for (const key of Object.keys(RIDER_VOCABULARY_EN)) {
      const en = RIDER_VOCABULARY_EN[key] ?? ''
      const ar = RIDER_VOCABULARY_AR[key] ?? ''
      if (en.includes('→')) {
        expect(ar, `${key} keeps a right arrow in Arabic`).not.toContain('→')
        expect(ar, `${key} has no mirrored arrow`).toContain('←')
      }
    }
  })
})

/**
 * `riderTimelineStrings` — the branching both profile surfaces share.
 *
 * The cases that matter are the ones where a placeholder is ABSENT, because
 * `interpolate()` throws on those and the throw is indistinguishable from a
 * crash to whoever is on shift.
 */
describe('riderTimelineStrings', () => {
  const t = createTranslator({ dictionary: EN }) as Translate
  const ar = createTranslator({ dictionary: AR, fallback: EN, language: 'ar' }) as Translate

  it('renders a full route', () => {
    const out = riderTimelineStrings(t, {
      kind: 'trip-completed',
      detail: { pickup: 'Al Malaz', destination: 'Riyadh Park', captainAssigned: true },
    })
    expect(out.title).toBe('Trip completed')
    expect(out.subtitle).toBe('Al Malaz → Riyadh Park')
    expect(out.note).toBeNull()
  })

  it('mirrors the arrow under Arabic without reordering the ends', () => {
    const out = riderTimelineStrings(
      ar,
      {
        kind: 'trip-completed',
        detail: { pickup: 'الملز', destination: 'الرياض بارك', captainAssigned: true },
      },
      'ar',
    )
    expect(out.subtitle).toBe('الملز ← الرياض بارك')
  })

  /**
   * `TRP-9003` — cancelled at Al Aqiq before a destination was confirmed
   * (`fixtures/trips.ts:235`). A `{destination}` template here is a throw, not a
   * blank, which is why the variant key exists.
   */
  it('does not throw when a cancelled trip never got a destination', () => {
    const out = riderTimelineStrings(t, {
      kind: 'trip-cancelled',
      detail: { pickup: 'Al Aqiq', captainAssigned: true },
    })
    expect(out.subtitle).toBe('From Al Aqiq — no destination confirmed')
  })

  /** `TRP-9104` — requested three minutes ago and never assigned. */
  it('gives an unassigned trip its own sentence rather than a clause', () => {
    const out = riderTimelineStrings(t, {
      kind: 'trip-requested',
      detail: { pickup: 'Al Olaya', destination: 'KAFD', captainAssigned: false },
    })
    expect(out.note).toBe('No captain was assigned.')
    /* §9.6 — the note is NOT welded onto the title or the subtitle. */
    expect(out.title).not.toContain('captain')
    expect(out.subtitle).not.toContain('captain')
  })

  it('says nothing about a captain when one was assigned, or when the field is absent', () => {
    expect(
      riderTimelineStrings(t, { kind: 'trip-completed', detail: { captainAssigned: true } }).note,
    ).toBeNull()
    expect(riderTimelineStrings(t, { kind: 'trip-completed', detail: {} }).note).toBeNull()
  })

  it('falls back when a registration carries no place', () => {
    expect(
      riderTimelineStrings(t, { kind: 'account-registered', detail: { tier: 'bronze' } }).subtitle,
    ).toBe('Bronze tier')
    expect(
      riderTimelineStrings(t, {
        kind: 'account-registered',
        detail: { location: 'Riyadh, SA', tier: 'gold' },
      }).subtitle,
    ).toBe('Riyadh, SA · Gold tier')
  })

  it('formats the subscription window and the trip ratio, and leaves the plan name alone', () => {
    expect(
      riderTimelineStrings(t, {
        kind: 'subscription-started',
        detail: { planName: 'Weekly Economy', startedOn: '2026-06-01', endsOn: '2026-06-08' },
      }).subtitle,
    ).toBe('Weekly Economy · 1 Jun → 8 Jun')
    expect(
      riderTimelineStrings(t, {
        kind: 'subscription-expired',
        detail: { planName: 'Weekly Economy', tripsUsed: 0, tripsIncluded: 5 },
      }).subtitle,
    ).toBe('Weekly Economy · 0 of 5 trips used')
  })

  /**
   * Every kind, against a detail bag carrying NOTHING. The union is the input
   * space; an empty bag is the worst legal member of it, and no member may
   * throw.
   */
  it('never throws on any kind, however empty the detail', () => {
    for (const kind of RIDER_TIMELINE_KINDS) {
      expect(() => riderTimelineStrings(t, { kind, detail: {} }), kind).not.toThrow()
      expect(() => riderTimelineStrings(ar, { kind, detail: {} }, 'ar'), kind).not.toThrow()
    }
  })
})
