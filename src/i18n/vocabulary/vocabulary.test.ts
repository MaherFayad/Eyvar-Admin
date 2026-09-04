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
  DRIVER_TIMELINE_KINDS,
  DRIVER_VOCABULARY_EN,
  RIDER_TIMELINE_KINDS,
  RIDER_VOCABULARY_EN,
  VOCABULARY_EN,
  driverTimelineStrings,
  hasReasonLabel,
  reasonLabel,
  riderTimelineStrings,
} from './copy'
import type { DriverTimelineRow } from './copy'
import { DRIVER_VOCABULARY_AR, RIDER_VOCABULARY_AR } from '../ar/vocabulary'

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
    expect(out.subtitle).toBe('From Al Aqiq · no destination confirmed')
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

/**
 * **The captain vocabulary is complete in both languages, for every kind.**
 *
 * Same guard as the rider's above and for the same reason: the key is picked
 * from `DriverTimelineKind` at runtime, so an eighth kind with no strings behind
 * it type-checks and throws in front of an operator. The union is iterated
 * rather than the fixtures — `DRV-0104` is the only captain with a bank change
 * on file, so a fixture-driven check would cover that arm by luck.
 */
describe('the captain vocabulary', () => {
  it('is assembled into EN and AR, so every key resolves through the real dictionaries', () => {
    for (const key of Object.keys(DRIVER_VOCABULARY_EN)) {
      expect(EN[key], `${key} missing from EN`).toBe(DRIVER_VOCABULARY_EN[key])
    }
    for (const key of Object.keys(DRIVER_VOCABULARY_AR)) {
      expect(AR[key], `${key} missing from AR`).toBe(DRIVER_VOCABULARY_AR[key])
    }
  })

  it('gives every DriverTimelineKind a title and a subtitle in both languages', () => {
    const missing: string[] = []
    for (const kind of DRIVER_TIMELINE_KINDS) {
      for (const key of [`driver.timeline.${kind}.title`, `driver.timeline.${kind}.subtitle`]) {
        if (EN[key] === undefined) missing.push(`EN ${key}`)
        if (AR[key] === undefined) missing.push(`AR ${key}`)
      }
    }
    expect(missing, 'a half-written family throws at render time, not here').toEqual([])
  })

  it('lists all seven kinds and no more', () => {
    expect([...DRIVER_TIMELINE_KINDS].sort()).toEqual([
      'account-registered',
      'bank-account-changed',
      'document-expired',
      'trip-cancelled',
      'trip-completed',
      'trip-no-show',
      'trip-requested',
    ])
  })

  it('names the same placeholders in Arabic as in English', () => {
    const disagreed: string[] = []
    for (const key of Object.keys(DRIVER_VOCABULARY_EN)) {
      const en = DRIVER_VOCABULARY_EN[key]
      const ar = DRIVER_VOCABULARY_AR[key]
      if (en === undefined || ar === undefined) continue
      const a = placeholdersIn(en).sort().join(',')
      const b = placeholdersIn(ar).sort().join(',')
      if (a !== b) disagreed.push(`${key}: EN(${a}) AR(${b})`)
    }
    expect(disagreed).toEqual([])
  })

  it('has no unnamed placeholder, and no key that is ONLY a placeholder', () => {
    for (const dict of [DRIVER_VOCABULARY_EN, DRIVER_VOCABULARY_AR]) {
      for (const [key, template] of Object.entries(dict)) {
        expect(placeholdersIn(template).filter((p) => p === ''), key).toEqual([])
        /* A pass-through key — `types/metrics.ts` deleted one for being "a fig
           leaf". `{docType}` alone would be the shape. */
        expect(template.replace(/\{\w+\}/g, '').trim(), `${key} is a pass-through`).not.toBe('')
      }
    }
  })

  it('keeps the four trip subtitles in agreement', () => {
    const trips = ['trip-requested', 'trip-completed', 'trip-cancelled', 'trip-no-show']
    for (const dict of [DRIVER_VOCABULARY_EN, DRIVER_VOCABULARY_AR]) {
      const forms = new Set(trips.map((k) => dict[`driver.timeline.${k}.subtitle`]))
      expect([...forms]).toHaveLength(1)
    }
  })

  /**
   * **The five events a rider and a captain share read identically.** They are
   * restated in both dictionaries rather than referenced, because a dictionary
   * is a flat map of literals; this is what stops the duplication drifting.
   */
  it('words the five shared events exactly as the rider timeline does', () => {
    for (const kind of ['account-registered', 'trip-requested', 'trip-completed', 'trip-cancelled', 'trip-no-show']) {
      expect(EN[`driver.timeline.${kind}.title`], `EN ${kind}`).toBe(
        EN[`rider.timeline.${kind}.title`],
      )
      expect(AR[`driver.timeline.${kind}.title`], `AR ${kind}`).toBe(
        AR[`rider.timeline.${kind}.title`],
      )
    }
  })

  /** §9.5 — the transition arrow mirrors, and it is done in the string. */
  it('mirrors the bank-change arrow in Arabic', () => {
    expect(EN['driver.timeline.bank-account-changed.subtitle']).toContain('→')
    expect(AR['driver.timeline.bank-account-changed.subtitle']).toContain('←')
    expect(AR['driver.timeline.bank-account-changed.subtitle']).not.toContain('→')
  })

  /**
   * The three enum label families the subtitles delegate to. A member with no
   * label throws at render; `DriverTier` gained a fourth member once already.
   */
  it('resolves every tier, vehicle class and document type it can be handed', () => {
    const missing: string[] = []
    for (const key of [
      'people.tier.gold', 'people.tier.silver', 'people.tier.standard',
      'people.class.economy', 'people.class.comfort',
      'people.col.doc.nationalId', 'people.col.doc.license', 'people.col.doc.vehicleReg',
      'people.col.doc.photo',
    ]) {
      if (EN[key] === undefined) missing.push(`EN ${key}`)
      if (AR[key] === undefined) missing.push(`AR ${key}`)
    }
    expect(missing, 'the captain subtitles delegate to these and cannot mint them').toEqual([])
  })

  /** The two families the data layer refused to model. See the module header. */
  it('mints no driver risk score and no suspension event', () => {
    const invented = Object.keys(EN).filter(
      (k) => k.startsWith('driver.risk.') || /^driver\.timeline\..*suspend/i.test(k),
    )
    expect(invented, 'the data layer declined to model these; a label must not invent them').toEqual([])
  })
})

/**
 * `driverTimelineStrings` — where the rider's resolver spends most of its body
 * on absence, this one has none to handle. Every arm of `DriverTimelineEvent`
 * carries every field its sentence declares, so the tests are about the strings
 * being right rather than about a crash being avoided.
 */
describe('driverTimelineStrings', () => {
  const t = createTranslator({ dictionary: EN }) as Translate
  const ar = createTranslator({ dictionary: AR, fallback: EN, language: 'ar' }) as Translate

  it('names the rider a captain carried, not the route they took', () => {
    const out = driverTimelineStrings(t, {
      kind: 'trip-completed',
      detail: { riderName: 'Bandar Al-Harbi' },
    })
    expect(out.title).toBe('Trip completed')
    expect(out.subtitle).toBe('Rider: Bandar Al-Harbi')
    expect(out.note).toBeNull()
  })

  it('labels the tier and the vehicle class rather than printing the enum', () => {
    expect(
      driverTimelineStrings(t, {
        kind: 'account-registered',
        detail: { tier: 'gold', vehicleClass: 'Economy' },
      }).subtitle,
    ).toBe('Gold tier · Economy vehicle')
    expect(
      driverTimelineStrings(ar, {
        kind: 'account-registered',
        detail: { tier: 'gold', vehicleClass: 'Economy' },
      }).subtitle,
    ).toBe('فئة ذهبية · مركبة اقتصادية')
  })

  it('names the document rather than its machine type', () => {
    const out = driverTimelineStrings(t, {
      kind: 'document-expired',
      detail: { docType: 'id_card' },
    })
    expect(out.subtitle).toBe('Document: National ID')
    expect(out.subtitle).not.toContain('operating_card')
    expect(
      driverTimelineStrings(ar, { kind: 'document-expired', detail: { docType: 'vehicle_reg' } })
        .subtitle,
    ).toBe('المستند: رخصة المركبة (الاستمارة)')
  })

  it('puts the bank change in the subtitle and its reason in a separate sentence', () => {
    const detail = { fromBank: 'Al Rajhi Bank', toBank: 'Riyad Bank', reason: 'Account closed' }
    const out = driverTimelineStrings(t, { kind: 'bank-account-changed', detail })
    expect(out.subtitle).toBe('Al Rajhi Bank → Riyad Bank')
    expect(out.note).toBe('Reason: Account closed')
    /* §9.6 — the reason is NOT welded onto the subtitle. */
    expect(out.subtitle).not.toContain('Account closed')
    expect(driverTimelineStrings(ar, { kind: 'bank-account-changed', detail }).subtitle).toBe(
      'Al Rajhi Bank ← Riyad Bank',
    )
  })

  /**
   * Every kind, in both languages. There is no "empty detail" case to test the
   * way the rider's has — the type will not construct one — so the exhaustive
   * sweep is over the kinds with their real detail shapes.
   */
  it('never throws on any kind, in either language', () => {
    const rows: DriverTimelineRow[] = [
      { kind: 'account-registered', detail: { tier: 'standard', vehicleClass: 'Comfort' } },
      { kind: 'trip-requested', detail: { riderName: 'فهد' } },
      { kind: 'trip-completed', detail: { riderName: 'فهد' } },
      { kind: 'trip-cancelled', detail: { riderName: 'فهد' } },
      { kind: 'trip-no-show', detail: { riderName: 'فهد' } },
      { kind: 'document-expired', detail: { docType: 'license' } },
      { kind: 'bank-account-changed', detail: { fromBank: 'A', toBank: 'B', reason: 'r' } },
    ]
    /* The list above is the union, exhaustively — if a kind is added and not
       covered here this fails, which is the same guarantee the resolver's
       `switch` gives at compile time. */
    expect(rows.map((r) => r.kind).sort()).toEqual([...DRIVER_TIMELINE_KINDS].sort())
    for (const row of rows) {
      expect(() => driverTimelineStrings(t, row), row.kind).not.toThrow()
      expect(() => driverTimelineStrings(ar, row), row.kind).not.toThrow()
      expect(driverTimelineStrings(t, row).subtitle).not.toBe('')
    }
  })
})
