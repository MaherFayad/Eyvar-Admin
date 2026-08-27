/**
 * Market & Zones — **R4-6b §6.6.4, made falsifiable**.
 *
 * The ruling is one sentence: *"the nav badge, the four tiles and the table's
 * first row all derive from one zone array, or they will drift."* A comment
 * saying so is worth nothing; the tests below are what make it true tomorrow.
 *
 * Group 1 checks the derivation against the legacy formulas by line number.
 * Group 2 is the one that matters: **the strip, the badge and the table are
 * asserted against each other**, not against literals, so a fixture edit that
 * moves one and not the others fails here rather than on an operator's screen.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, mockFailures, resetDataLayer } from './index'
import { getMetricBoard } from './metrics'
import { getNavCounts } from './navCounts'
import {
  ZONE_OPERATIONS,
  getZone,
  getZoneFacets,
  getZoneHealth,
  listZones,
  openSteerOffer,
  queueRecruitment,
  resolveZones,
  starvedZoneCount,
  summariseZones,
  useLiveSteerOffer,
  useNoZones,
  useZeroSupplyZone,
} from './zones'

beforeEach(() => {
  resetDataLayer()
  disableMockLatency()
})

const byName = (name: string) => resolveZones().find((z) => z.name === name)!

describe('1 — the derivation, against the legacy formulas', () => {
  it('sorts worst-first by failure rate, which is the table default (`:14132`)', async () => {
    const { items } = await listZones()
    expect(items.map((z) => z.name)).toEqual([
      'Al Narjis',
      'Al Sahafa',
      'Al Yasmin',
      'Al Malaz',
      'KAFD / Olaya',
      'Qurtubah',
    ])
    expect(items.map((z) => z.failureRate)).toEqual([79, 67, 64, 25, 18, 17])
  })

  it('computes `failureRate` as `zoneFailRate` does (`:13974`)', () => {
    /* 11/14 → 79, and the rounding is `Math.round`, not a floor. */
    expect(byName('Al Narjis').failureRate).toBe(79)
    expect(byName('Qurtubah').failureRate).toBe(17)
  })

  it('computes `captainsNeeded` as `:14155` does, and only one zone is short', () => {
    /* `max(0, ceil(14/3) − 2)` = 3. Every other zone already clears ≤3 per captain. */
    expect(byName('Al Narjis').captainsNeeded).toBe(3)
    expect(resolveZones().filter((z) => z.captainsNeeded > 0)).toHaveLength(1)
  })

  it('assigns `recruitmentPriority` in the order `:14153` evaluates it', () => {
    /* Al Yasmin's ratio is 2.75 — below the starved threshold — and it is still
       `recruit-now`, because the 64 % failure rate takes the first arm. A
       reimplementation that tested the ratio arms first would call it `watch`. */
    expect(byName('Al Yasmin').demandSupplyRatio).toBeLessThan(3)
    expect(byName('Al Yasmin').recruitmentPriority).toBe('recruit-now')
    expect(byName('Al Malaz').recruitmentPriority).toBe('watch')
    expect(byName('KAFD / Olaya').recruitmentPriority).toBe('healthy')
  })

  it('leaves `subMomentum` null for a zone no subscription request maps to', () => {
    /* `zoneOfPickup` (`:13977`) is a substring match over rider-entered text.
       A zone nothing maps to has NO reading — never a `0`, which would claim we
       measured flat growth. */
    expect(byName('KAFD / Olaya').subMomentum).toBeNull()
    expect(byName('Al Narjis').subMomentum).not.toBeNull()
  })

  it('keeps every zone in Riyadh, because that is L-6’s cause (`:6941`)', () => {
    expect(new Set(resolveZones().map((z) => z.city))).toEqual(new Set(['Riyadh']))
  })
})

describe('2 — the strip, the badge and the table come from one array (R4-6b §6.6.4)', () => {
  it('derives the five zone tiles to exactly the literals they replaced', async () => {
    const board = await getMetricBoard('management-zones')
    const value = (key: string) => board.metrics.find((m) => m.key === key)!.value
    expect(value('management.zones.captainsNeeded')).toBe(3)
    expect(value('management.zones.starvedZones')).toBe(2)
    expect(value('management.zones.unservedRequests30d')).toBe(31)
    expect(value('management.zones.avgFailureRate')).toBe(45)
    expect(value('management.zones.worstDemandSupplyRatio')).toBe(7)
  })

  it('makes each tile equal the table it sits above, not a number beside it', async () => {
    const board = await getMetricBoard('management-zones')
    const { items } = await listZones({ pageSize: 100 })
    const value = (key: string) => board.metrics.find((m) => m.key === key)!.value

    expect(value('management.zones.starvedZones')).toBe(items.filter((z) => z.starved).length)
    expect(value('management.zones.unservedRequests30d')).toBe(
      items.reduce((s, z) => s + z.failures30d, 0),
    )
    expect(value('management.zones.captainsNeeded')).toBe(
      items.reduce((s, z) => s + z.captainsNeeded, 0),
    )
    /* The worst ratio is the FIRST row's ratio only by coincidence of this
       dataset — the table sorts on failure rate, not on ratio. Asserted against
       the max so the coincidence is not mistaken for the rule. */
    expect(value('management.zones.worstDemandSupplyRatio')).toBe(
      Math.max(...items.map((z) => z.demandSupplyRatio ?? 0)),
    )
  })

  it('makes the nav badge the starved count, closing R4-6 §6.5', async () => {
    /* The badge was seeded `0` beside a ratio tile reading 7×. Both now read
       the same array, so the badge cannot disagree with the table's top rows. */
    const counts = await getNavCounts()
    const badge = counts.subTabs.find((s) => s.subTabId === 'management-zones')!
    expect(badge.count).toBe(starvedZoneCount())
    expect(badge.count).toBe((await listZones({ view: 'starved' })).total)
  })

  it('keeps `steerOffersLive` and `liveCities` OUT of the zone derivation', async () => {
    const board = await getMetricBoard('management-zones')
    /* Neither is a function of the zone rows. A `liveCities` derived from six
       rows that are all in one city would be L-6 in a new place. */
    expect(board.metrics.find((m) => m.key === 'management.zones.steerOffersLive')!.value).toBe(0)
    expect(board.metrics.find((m) => m.key === 'management.zones.liveCities')!.value).toBe(1)
  })
})

describe('3 — L-6 preserved in shape, removed as a bug', () => {
  it('gives Riyadh a reading and the other three a genuine null', async () => {
    const board = await getMetricBoard('management-zones')
    const rows = board.breakdowns.find((b) => b.key === 'zones.citiesHealth')!.rows
    expect(rows.map((r) => (r.label.kind === 'text' ? r.label.text : null))).toEqual([
      'Riyadh',
      'Jeddah',
      'Dammam',
      'Makkah',
    ])
    /* **R5-5.** The rate was the second numeric column and is now a noun phrase
       in the sub-label, so the "genuine null" is no longer an em dash in a
       column — it is a row that states no rate at all, under a key that says
       `Not launched` instead. A city with no reading and a city with a reading
       of zero stay different facts, which is what the column form could not
       render. */
    expect(rows.map((r) => r.subLabelParams?.rate ?? null)).toEqual([45, null, null, null])
    expect(rows.map((r) => r.subLabelKey)).toEqual([
      'breakdown.sub.cityLiveUnserved',
      'breakdown.sub.cityNotLive',
      'breakdown.sub.cityNotLive',
      'breakdown.sub.cityNotLive',
    ])
    /* The primary is the zone count, because `value` is `number` and not
       `number | null` — ranking on a field three rows cannot fill is not a
       ranking. */
    expect(rows.map((r) => r.value)).toEqual([6, 0, 0, 0])
  })

  it('agrees with the tile, so AC-695 holds by construction', async () => {
    const board = await getMetricBoard('management-zones')
    const riyadh = board.breakdowns.find((b) => b.key === 'zones.citiesHealth')!.rows[0]!
    expect(riyadh.subLabelParams?.rate).toBe(
      board.metrics.find((m) => m.key === 'management.zones.avgFailureRate')!.value,
    )
    expect(riyadh.value).toBe((await listZones({ pageSize: 100 })).total)
  })

  it('is a zone-count test rather than legacy’s string test on the city name', () => {
    /* `:6942` gates on `c.name === 'Riyadh'`. Seed a Jeddah zone under that rule
       and the column stays blank forever. Here the reading follows the zones. */
    const summary = summariseZones(resolveZones().filter((z) => z.city === 'Jeddah'))
    expect(summary.avgFailureRate).toBeNull()
    expect(summary.zonesTracked).toBe(0)
  })
})

describe('4 — `supply: 0`, which R4-6b requires to be representable', () => {
  it('returns a null ratio rather than Infinity, and still scores the zone starved', () => {
    useZeroSupplyZone()
    const narjis = byName('Al Narjis')
    expect(narjis.supply).toBe(0)
    expect(narjis.demandSupplyRatio).toBeNull()
    /**
     * **The correction to `:14133`.** Legacy's `z.supply > 0 &&` guard would
     * score a zone with no captains as NOT starved — the most starved state
     * there is, missing from the badge, the tile and the red row treatment
     * together. This is the assertion that fails if somebody "restores" the
     * legacy predicate.
     */
    expect(narjis.starved).toBe(true)
    expect(narjis.recruitmentPriority).toBe('recruit-now')
  })

  it('drops the worst-ratio tile to the worst REMAINING ratio, never to Infinity', () => {
    useZeroSupplyZone()
    const summary = summariseZones(resolveZones())
    expect(Number.isFinite(summary.worstDemandSupplyRatio!)).toBe(true)
    /* Al Sahafa's 3.0 — the worst zone got worse and the tile went DOWN. The
       most counter-intuitive true reading this tile has, and it is why the
       label says "worst demand-to-supply ratio" and not "worst zone". */
    expect(summary.worstDemandSupplyRatio).toBe(3)
    expect(summary.starvedZones).toBe(2)
  })

  it('returns null readings, never zeroes, when there are no zones at all', async () => {
    useNoZones()
    const summary = await getZoneHealth()
    expect(summary.zonesTracked).toBe(0)
    expect(summary.avgFailureRate).toBeNull()
    expect(summary.worstDemandSupplyRatio).toBeNull()
    /* These two are sums over an empty set and `0` is their honest value. */
    expect(summary.unservedRequests30d).toBe(0)
    expect(summary.captainsNeeded).toBe(0)
  })
})

describe('5 — views, facets and the two row actions', () => {
  it('serves the strip’s four tiles as views into the table (R4-6 §6.4 clause 1)', async () => {
    expect((await listZones({ view: 'all' })).total).toBe(6)
    expect((await listZones({ view: 'starved' })).total).toBe(2)
    expect((await listZones({ view: 'offers' })).total).toBe(0)
    expect((await listZones({ view: 'needs-captains' })).total).toBe(1)
  })

  it('sources the priority filter’s options from the data, never a hand-written list', async () => {
    const facets = await getZoneFacets()
    expect((facets.recruitmentPriority ?? []).map((f) => f.value).sort()).toEqual([
      'healthy',
      'recruit-now',
      'watch',
    ])
    expect(facets.city ?? []).toEqual([{ value: 'Riyadh', count: 6 }])
  })

  it('refuses a second live steering offer on one zone (`:13999`)', async () => {
    await openSteerOffer({
      zoneId: 'ZONE-01',
      bonusPerTripHalalas: 12_00,
      budgetCapHalalas: 300_00,
      durationMinutes: 120,
    })
    await expect(
      openSteerOffer({
        zoneId: 'ZONE-01',
        bonusPerTripHalalas: 12_00,
        budgetCapHalalas: 300_00,
        durationMinutes: 120,
      }),
    ).rejects.toMatchObject({ status: 409 })
    /* And the row now carries the offer, which is what suppresses the button. */
    expect(byName('Al Narjis').activeSteerOffer).not.toBeNull()
    expect((await listZones({ view: 'offers' })).total).toBe(1)
  })

  it('refuses a second recruitment drive on one zone (`:13991`)', async () => {
    await queueRecruitment('ZONE-02')
    await expect(queueRecruitment('ZONE-02')).rejects.toMatchObject({ status: 409 })
    expect(byName('Al Sahafa').recruitmentQueuedAt).not.toBeNull()
  })

  it('404s on an unknown zone rather than returning an empty row', async () => {
    await expect(getZone('ZONE-99')).rejects.toMatchObject({ status: 404 })
  })

  it('reaches the `Offer live` row state without a hand edit', () => {
    useLiveSteerOffer()
    expect(byName('Al Narjis').activeSteerOffer?.status).toBe('active')
  })
})

describe('6 — every operation fails on demand', () => {
  it.each(Object.values(ZONE_OPERATIONS))('injects a failure into %s', async (op) => {
    mockFailures.always(op)
    expect(mockFailures.peek(op)).not.toBeNull()
  })

  it('surfaces the injected failure as an ApiError the ErrorState can read', async () => {
    mockFailures.always(ZONE_OPERATIONS.list)
    await expect(listZones()).rejects.toMatchObject({ status: 503, retryable: true })
  })

  it('fails the strip independently of the table, so one card can error alone', async () => {
    mockFailures.always(ZONE_OPERATIONS.health)
    await expect(getZoneHealth()).rejects.toMatchObject({ status: 503 })
    await expect(listZones()).resolves.toBeTruthy()
  })
})
