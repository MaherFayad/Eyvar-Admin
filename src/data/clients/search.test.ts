/**
 * Global search's contract — `OPERATOR-EXPERIENCE-PLAN.md` §0.1 finding 3,
 * tasks P3-T1…T4, and design spec §4.3.4 / §4.3.1.
 *
 * Three headline defects are asserted here rather than described:
 *
 *   1. `captains` reaches Operations › People. It could not, because
 *      destinations were matched against the i18n key `subtab.operations.people`.
 *   2. `csptain` reaches it too. Matching was `String.prototype.includes()`,
 *      which has no tolerance for the most common typing error there is.
 *   3. All **eleven** `PROFILE_ENTITY_TYPES` resolve. Six did.
 *      `UNRESOLVED_IN_LEGACY` is the fixture that says which five were missing,
 *      so it is read here rather than retyped.
 *
 * Ranking is asserted as an **ordering**, never as a number, except where the
 * number is the contract (`0…100`). A test that pins `score: 87` converts every
 * future weight change into a test edit, and the weights are meant to be tuned.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { PROFILE_ENTITY_TYPES, UNRESOLVED_IN_LEGACY } from '../types/profile'
import type { ProfileEntityType, SearchResult } from '../types/profile'
import { SUB_TABS } from '../fixtures/routeTable'
import { EN } from '../../i18n/dictionaries'
import { resolveProfile, search } from './profile'

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
})

const entityTypes = (results: SearchResult[]): ProfileEntityType[] =>
  results.flatMap((r) => ('entityType' in r.target ? [r.target.entityType] : []))

const paths = (results: SearchResult[]): string[] =>
  results.flatMap((r) => ('path' in r.target ? [r.target.path] : []))

/* ═══════════════ defect 1 — the wrong field was being matched ═════════════ */

describe('destinations match the translated title, not the i18n key', () => {
  it('reaches Operations › People from `captains`', async () => {
    const { results } = await search('captains')
    const hit = results.find((r) => r.kind === 'destination' && paths([r])[0] === '/operations/people')
    expect(hit).toBeDefined()
    expect(hit!.target).toEqual({ path: '/operations/people', viewId: 'captains' })
  })

  it('names the view the operator asked for, not the tab above it', async () => {
    const { results } = await search('captains')
    const hit = results.find((r) => paths([r])[0] === '/operations/people')!
    expect(hit.title).toBe('Captains')
    expect(hit.subtitle).toBe('/operations/people?view=captains')
  })

  it('reaches a sub-tab by its own name', async () => {
    const { results } = await search('trip assurance')
    expect(paths(results)).toContain('/operations/assurance')
  })

  it('still reaches a destination by its path', async () => {
    const { results } = await search('financials')
    expect(paths(results).some((p) => p.startsWith('/financials'))).toBe(true)
  })

  it('never returns a raw i18n key as a title — defect D-7', async () => {
    for (const query of ['operations', 'overview', 'captains', 'financials', 'people']) {
      const { results } = await search(query)
      const destinations = results.filter((r) => r.kind === 'destination')
      expect(destinations.length, query).toBeGreaterThan(0)
      for (const row of destinations) {
        expect(Object.hasOwn(EN, row.title), `${query} -> ${row.title}`).toBe(false)
      }
    }
  })

  it('has an English string for every key the route table can put on a result', () => {
    /* `destinationTitle` falls back to the key when the catalogue is missing
       one, and the shell would then put that key through `t()`, which throws.
       Better to fail here, in the layer that owns the fallback. */
    const missing: string[] = []
    for (const row of SUB_TABS) {
      for (const key of [row.titleKey, row.subtitleKey, ...row.views.map((v) => v.titleKey)]) {
        if (key !== null && !Object.hasOwn(EN, key)) missing.push(key)
      }
    }
    expect(missing).toEqual([])
  })

  it('returns one row per destination, not one per matching field', async () => {
    const { results } = await search('subscriptions')
    const keys = results
      .filter((r) => r.kind === 'destination')
      .map((r) => ('path' in r.target ? `${r.target.path}|${r.target.viewId ?? ''}` : ''))
    expect(new Set(keys).size).toBe(keys.length)
  })
})

/* ══════════════════════ defect 2 — no typo tolerance ══════════════════════ */

describe('typo tolerance', () => {
  it('reaches Operations › People from `csptain`', async () => {
    const { results } = await search('csptain')
    expect(paths(results)).toContain('/operations/people')
  })

  it('reaches it from the transposition `captians` too', async () => {
    const { results } = await search('captians')
    expect(paths(results)).toContain('/operations/people')
  })

  it('finds a captain whose name was mistyped', async () => {
    const { results } = await search('ahmed slaem')
    expect(results.map((r) => r.title)).toContain('Ahmed Salem')
  })

  it('ranks the correct spelling above the mistyped one', async () => {
    const scoreFor = async (query: string) => {
      const { results } = await search(query)
      return results.find((r) => paths([r])[0] === '/operations/people')?.score ?? 0
    }
    expect(await scoreFor('captains')).toBeGreaterThan(await scoreFor('csptain'))
  })

  it('does not turn tolerance into a match-everything', async () => {
    const { results } = await search('zzzqqq')
    expect(results).toEqual([])
  })

  it('holds the two legacy-defect assertions that must keep failing to match', async () => {
    /* D-8: `cancelpolicy` is a settings PANE key, and nothing in the product
       indexes pane keys. Fuzzy matching must not accidentally paper over that
       — the fix is an index, not a looser threshold. */
    expect((await search('Cancellation policy')).results).toEqual([])
    expect((await search('cancelpolicy')).results).toEqual([])
  })
})

/* ═════════════════════ defect 3 — six of twelve types ═════════════════════ */

describe('all twelve entity types are searchable', () => {
  /** One query per type that an operator would plausibly type. */
  const QUERIES: Record<ProfileEntityType, string> = {
    rider: 'RDR-1041',
    driver: 'DRV-0101',
    trip: 'TRP-7741',
    subscription: 'SUB-1041',
    payment: 'PAY-5510',
    complaint: 'CMP-301',
    'new-rider': 'RDR-3001',
    applicant: 'APP-2201',
    ticket: 'TKT-501',
    'corporate-account': 'CORP-001',
    plan: 'weekly',
    request: 'REQ-503',
    operator: 'USR-3',
  }

  it('covers every declared type — no gaps in the map above', () => {
    expect(Object.keys(QUERIES).sort()).toEqual([...PROFILE_ENTITY_TYPES].sort())
  })

  it.each(PROFILE_ENTITY_TYPES)('finds a %s', async (type) => {
    const { results } = await search(QUERIES[type])
    expect(entityTypes(results)).toContain(type)
  })

  it.each(UNRESOLVED_IN_LEGACY)('%s — the type legacy answered "No record found" for', async (type) => {
    const { results } = await search(QUERIES[type])
    const hit = results.find((r) => entityTypes([r])[0] === type)
    expect(hit).toBeDefined()
    expect(hit!.title).not.toBe('')
  })

  it('opens every type it finds — a search hit is never a 404', async () => {
    for (const type of PROFILE_ENTITY_TYPES) {
      const { results } = await search(QUERIES[type])
      const hit = results.find((r) => entityTypes([r])[0] === type)!
      const target = hit.target as { entityId: string }
      const ref = await resolveProfile(target.entityId)
      expect(ref.entityType, type).toBe(type)
      expect(ref.sections.length, type).toBeGreaterThan(0)
    }
  })

  it('finds a ticket by its subject, not only its id', async () => {
    const { results } = await search('briefcase back seat')
    expect(entityTypes(results)).toContain('ticket')
  })

  it('finds a plan by its Arabic name', async () => {
    const { results } = await search('الاسبوعيه')
    const plan = results.find((r) => entityTypes([r])[0] === 'plan')
    expect(plan?.title).toBe('Weekly')
  })

  it('finds a captain by phone, spaced or not', async () => {
    for (const query of ['+966 53 001 0101', '966530010101', '5300101']) {
      const { results } = await search(query)
      expect(entityTypes(results).length, query).toBeGreaterThan(0)
    }
  })

  it('finds a rider by an Arabic-Indic id', async () => {
    const { results } = await search('RDR-١٠٤١')
    expect(results.some((r) => r.subtitle?.startsWith('RDR-1041'))).toBe(true)
  })
})

/* ══════════════════════════ one comparable score ══════════════════════════ */

describe('scoring', () => {
  it('scores every result on 0…100', async () => {
    const { results } = await search('a')
    expect(results.length).toBeGreaterThan(0)
    for (const row of results) {
      expect(Number.isInteger(row.score)).toBe(true)
      expect(row.score).toBeGreaterThan(0)
      expect(row.score).toBeLessThanOrEqual(100)
    }
  })

  it('returns results in descending score order', async () => {
    const { results } = await search('riders')
    const scores = results.map((r) => r.score)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
  })

  it('ranks an exact id above a record that merely mentions it', async () => {
    const { results } = await search('TRP-7741')
    const trip = results.find((r) => entityTypes([r])[0] === 'trip')!
    const others = results.filter((r) => entityTypes([r])[0] !== 'trip')
    for (const other of others) expect(trip.score).toBeGreaterThanOrEqual(other.score)
  })

  it('ranks a whole-name match above a partial one', async () => {
    const { results } = await search('Nora Al-Harbi')
    expect(results[0]!.title).toBe('Nora Al-Harbi')
  })

  it('mixes kinds in one ordering rather than grouping them', async () => {
    /* The palette groups by kind for display (§5). The client must not, or the
       server's ranking becomes unrecoverable once the two are interleaved. */
    const { results } = await search('trips')
    expect(new Set(results.map((r) => r.kind)).size).toBeGreaterThan(1)
  })

  it('honours the limit', async () => {
    const { results } = await search('a', { limit: 5 })
    expect(results).toHaveLength(5)
  })
})

/* ═════════════════════ legacy names still resolve (§4.3.4) ════════════════ */

describe('legacy names', () => {
  it('resolves "Renewal pipeline" to the view it became, and says so', async () => {
    const { results } = await search('Renewal pipeline')
    const hit = results.find((r) => r.matchedLegacyName === 'Renewal Pipeline')
    expect(hit).toBeDefined()
    expect(hit!.title).toBe('Renewal Pipeline')
    expect(hit!.target).toEqual({ path: '/operations/subscriptions', viewId: 'expiring-7d' })
  })

  it('resolves a legacy page id that is not a substring of its own title', async () => {
    const { results } = await search('all-pending')
    expect(paths(results)).toContain('/operations/people')
  })

  it('returns nothing for a retired page', async () => {
    const { results } = await search('Interventions')
    expect(results).toEqual([])
  })
})

/* ═══════════════════════════ the boring guarantees ════════════════════════ */

describe('the empty and pathological queries', () => {
  it('returns nothing for an empty query', async () => {
    for (const query of ['', '   ', '\n\t']) {
      const { results } = await search(query)
      expect(results, JSON.stringify(query)).toEqual([])
    }
  })

  it('returns nothing for a query of pure punctuation', async () => {
    for (const query of ['!!!', '---', '· ·', '?']) {
      expect((await search(query)).results, query).toEqual([])
    }
  })

  it('echoes the query and the scope untouched', async () => {
    const response = await search('  Nora  ', { scope: 'captains' })
    expect(response.query).toBe('  Nora  ')
    expect(response.scope).toBe('captains')
    expect(response.computedAt).toBe('2026-06-25T09:14:00+03:00')
  })

  it('is deterministic — the same query twice is the same answer', async () => {
    expect(await search('harbi')).toStrictEqual(await search('harbi'))
  })

  it('is case, script and digit-set insensitive on both sides', async () => {
    const upper = await search('NORA AL-HARBI')
    const lower = await search('nora al-harbi')
    expect(upper.results.map((r) => r.title)).toEqual(lower.results.map((r) => r.title))
  })
})
