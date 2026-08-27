/**
 * Market & Zones — the zone-health table, and the strip above it.
 *
 * **This file is the whole point of R4-6b.** §6.6.4 rules that the four tiles
 * on `/management/zones` MUST be derived from the table's own rows, and
 * `resolveZones()` below is the one array everything reads:
 *
 * ```
 *                       zoneSeeds  (6 stored rows)
 *                            │
 *                     resolveZones()
 *                    ╱       │       ╲
 *      getZoneHealth()   listZones()   starvedZoneCount()
 *        4 strip tiles     the table      the nav badge
 * ```
 *
 * The tile, the first table row and the badge cannot disagree, because there is
 * nowhere for a second answer to live. Before this file there were three
 * answers: a hand-written `value: 7` (`fixtures/metrics.ts:977`), no table at
 * all, and a nav badge seeded `0` while the tile said the worst zone ran at 7×
 * (**§6.5**, and it is now closed — `starvedZoneCount()` is `2` and the badge
 * reads it).
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import {
  cityFixtures,
  zoneRecruitmentQueueFixtures,
  zoneSeeds,
  zoneSteerOfferFixtures,
  type ZoneSeed,
} from '../fixtures/zones'
import { allRequestFixtures } from '../fixtures/requests'
import { ApiError, type Facets, type Paginated, type QueryParams } from '../types/common'
import {
  HEALTHY_DEMAND_PER_CAPTAIN,
  STARVED_RATIO,
  type Zone,
  type ZoneHealthSummary,
  type ZoneSteerOffer,
  type RecruitmentPriority,
} from '../types/zone'
import { http } from './http'

export const ZONE_OPERATIONS = {
  list: 'zones.list',
  get: 'zones.get',
  facets: 'zones.facets',
  health: 'zones.health',
  steer: 'zones.steer',
  queueRecruitment: 'zones.queueRecruitment',
} as const

/* ───────────────── mutable mock state, reset between tests ────────────── */

let steerOffers: ZoneSteerOffer[] = [...zoneSteerOfferFixtures]
let recruitmentQueue = [...zoneRecruitmentQueueFixtures]
let seedOverride: ZoneSeed[] | null = null

export function resetZones(): void {
  steerOffers = [...zoneSteerOfferFixtures]
  recruitmentQueue = [...zoneRecruitmentQueueFixtures]
  seedOverride = null
}

/* ─────────────────────────── the derivation ───────────────────────────── */

/** `zoneFailRate` (`:13974`). `demand === 0` yields a true `0`, not a gap. */
function failureRate(seed: ZoneSeed): number {
  return seed.demand > 0 ? Math.round((seed.failures30d / seed.demand) * 100) : 0
}

/** `null` **iff** `supply === 0`. See `Zone.demandSupplyRatio` for why not `Infinity`. */
function demandSupplyRatio(seed: ZoneSeed): number | null {
  return seed.supply > 0 ? seed.demand / seed.supply : null
}

/**
 * **Corrected from `:14133`.** Legacy guards its starved test with
 * `z.supply > 0`, which scores a zone with zero captains as *not* starved. See
 * `Zone.starved` for the full note; the correction is deliberate and is the
 * only place this resource departs from the legacy predicate.
 */
function isStarved(seed: ZoneSeed): boolean {
  if (seed.demand <= 0) return false
  const ratio = demandSupplyRatio(seed)
  return ratio === null || ratio >= STARVED_RATIO
}

/** `max(0, ceil(demand ÷ 3) − supply)` (`:14155`). */
function captainsNeeded(seed: ZoneSeed): number {
  return Math.max(0, Math.ceil(seed.demand / HEALTHY_DEMAND_PER_CAPTAIN) - seed.supply)
}

/** `:14153`, in the order legacy evaluates it — the failure-rate arm can promote a low-ratio zone. */
function recruitmentPriority(seed: ZoneSeed): RecruitmentPriority {
  const ratio = demandSupplyRatio(seed)
  const fr = failureRate(seed)
  const starving = ratio === null || ratio >= STARVED_RATIO
  if (starving || fr >= 50) return 'recruit-now'
  if ((ratio !== null && ratio >= 2) || fr >= 25) return 'watch'
  return 'healthy'
}

/**
 * `zoneOfPickup` (`:13977`–`:13983`) — map a free-text pickup district onto a
 * tracked zone by substring, splitting a compound name on ` / ` first so
 * `KAFD / Olaya` matches a pickup of either.
 *
 * Kept verbatim including its weakness: it is a substring match over
 * operator-entered text, so a district the seeds do not name maps to nothing at
 * all. That is why `subMomentum` is nullable.
 */
function zoneOfPickup(pickup: string, seeds: readonly ZoneSeed[]): string | null {
  const p = pickup.toLowerCase()
  const hit = seeds.find((z) =>
    z.name
      .toLowerCase()
      .split(' / ')
      .some((part) => p.includes(part)),
  )
  return hit ? hit.id : null
}

/**
 * `zoneSubMomentum()` (`:14041`–`:14056`), against the subscription request
 * book rather than a second hand-typed table — legacy's own comment insists on
 * that (*"straight from DB.subscriptionRequests (real panel data, not a
 * separate hand-typed table)"*, `:14038`).
 *
 * **The `day >= 25` split is legacy's and it is a hard-coded date**, sound only
 * because the fixed clock is 25 Jun 2026 (`mock/clock.ts`). Expressed here
 * against `EYVAR_TODAY` rather than the literal `25`, so it stays correct if the
 * clock moves — the one place this derivation is written better than its source.
 *
 * `priorAvg = prior / 2` is legacy's *"seeded data spans ~2 prior days"*
 * (`:14051`). It is an assumption about the fixture, not a rule, and it is kept
 * because changing it would change every published momentum number with no
 * mandate to do so. **Flagged rather than fixed.**
 */
const PRIOR_DAYS = 2

function subMomentumByZone(seeds: readonly ZoneSeed[]): Map<string, number> {
  const today = EYVAR_NOW.slice(0, 10)
  const counts = new Map<string, { today: number; prior: number }>()

  for (const r of allRequestFixtures) {
    if (r.channel !== 'subscription') continue
    const zoneId = zoneOfPickup(r.pickup, seeds)
    if (!zoneId) continue
    const bucket = counts.get(zoneId) ?? { today: 0, prior: 0 }
    if (r.requestedAt.slice(0, 10) >= today) bucket.today += 1
    else bucket.prior += 1
    counts.set(zoneId, bucket)
  }

  const out = new Map<string, number>()
  for (const [zoneId, m] of counts) {
    const priorAvg = m.prior / PRIOR_DAYS
    out.set(
      zoneId,
      priorAvg > 0 ? Math.round(((m.today - priorAvg) / priorAvg) * 100) : m.today > 0 ? 100 : 0,
    )
  }
  return out
}

/**
 * The one array. Every reader below goes through it, and **worst-first by
 * failure rate is applied here** (`:14132`) so the table's default order, the
 * breakdown's order and the badge's first row are the same order by
 * construction.
 *
 * Ties break on `id`, ascending. A `sort` without a tie-break is a sort that
 * reorders between runs on some engines, and a visual regression cannot diff
 * that.
 */
export function resolveZones(): Zone[] {
  const seeds = seedOverride ?? zoneSeeds
  const momentum = subMomentumByZone(seeds)

  return seeds
    .map<Zone>((seed) => ({
      id: seed.id,
      name: seed.name,
      city: seed.city,
      demand: seed.demand,
      supply: seed.supply,
      failures30d: seed.failures30d,
      failureRate: failureRate(seed),
      demandSupplyRatio: demandSupplyRatio(seed),
      starved: isStarved(seed),
      captainsNeeded: captainsNeeded(seed),
      recruitmentPriority: recruitmentPriority(seed),
      subMomentum: momentum.get(seed.id) ?? null,
      activeSteerOffer:
        steerOffers.find((o) => o.zoneId === seed.id && o.status === 'active') ?? null,
      recruitmentQueuedAt: recruitmentQueue.find((r) => r.zoneId === seed.id)?.queuedAt ?? null,
    }))
    .sort((a, b) => b.failureRate - a.failureRate || a.id.localeCompare(b.id))
}

/* ──────────────────────────── query shape ─────────────────────────────── */

const zoneShape: QueryShape<Zone> = {
  searchable: [(z) => z.name, (z) => z.city],
  sortable: {
    name: (z) => z.name,
    demand: (z) => z.demand,
    supply: (z) => z.supply,
    failures30d: (z) => z.failures30d,
    failureRate: (z) => z.failureRate,
    /* `null` sorts as `-1`: a zone with no captains has no ratio, and putting it
       below every real ratio is wrong on a worst-first table. The default sort
       is `failureRate`, which has no null, so this only bites when an operator
       asks for it — and `starved` is what carries that zone regardless. */
    demandSupplyRatio: (z) => z.demandSupplyRatio,
    captainsNeeded: (z) => z.captainsNeeded,
    subMomentum: (z) => z.subMomentum,
  },
  filterable: {
    city: (z) => z.city,
    recruitmentPriority: (z) => z.recruitmentPriority,
    starved: (z) => z.starved,
  },
  /**
   * **The strip's four tiles are these views** (R4-6 §6.4 clause 1): a tile is
   * a toggle that narrows the table, not a link away from it. `filterZones(f)`
   * (`:14130`) has exactly three arms — `all`, `starved`, `offers` — and
   * `needs-captains` is the fourth, which legacy reaches by reading the sub-line
   * under the priority badge instead.
   */
  views: {
    all: () => true,
    starved: (z) => z.starved,
    offers: (z) => z.activeSteerOffer !== null,
    'needs-captains': (z) => z.captainsNeeded > 0,
  },
  facetable: ['city', 'recruitmentPriority'],
}

/* ────────────────────────────── reads ─────────────────────────────────── */

/**
 * GET /api/v1/zones
 *   params: q · view=all|starved|offers|needs-captains · sort · filters ·
 *           page · pageSize
 *   -> Paginated<Zone>
 *
 * Sortable: name · demand · supply · failures30d · failureRate ·
 * demandSupplyRatio · captainsNeeded · subMomentum
 * Filterable: city · recruitmentPriority · starved
 *
 * **Default order is worst-first by `failureRate`** (`:14132`) and the server
 * applies it, because the nav badge and the strip agree with the *first row*
 * and a client-side default sort is a second opinion about which row that is.
 */
export async function listZones(params: QueryParams = {}): Promise<Paginated<Zone>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Zone>>('/zones', { ...params, signal: undefined }, { signal: params.signal })
  }
  return mock(ZONE_OPERATIONS.list, params.signal, () => runQuery(resolveZones(), params, zoneShape))
}

/**
 * GET /api/v1/zones/:zoneId
 *   -> Zone
 */
export async function getZone(zoneId: string, signal?: AbortSignal): Promise<Zone> {
  if (DATA_SOURCE === 'http') return http.get<Zone>(`/zones/${zoneId}`, undefined, { signal })
  return mock(ZONE_OPERATIONS.get, signal, () => {
    const zone = resolveZones().find((z) => z.id === zoneId)
    if (!zone) throw notFound('zone', zoneId)
    return zone
  })
}

/**
 * GET /api/v1/zones/facets
 *   params: view
 *   -> Facets   { city: [...], recruitmentPriority: [...] }
 */
export async function getZoneFacets(view?: string | null, signal?: AbortSignal): Promise<Facets> {
  if (DATA_SOURCE === 'http') return http.get<Facets>('/zones/facets', { view }, { signal })
  return mock(ZONE_OPERATIONS.facets, signal, () => computeFacets(resolveZones(), zoneShape, view))
}

/**
 * GET /api/v1/zones/health
 *   -> ZoneHealthSummary
 *
 * The four strip tiles, computed from the same rows `/zones` serves. A separate
 * endpoint rather than a field on the list envelope, because the strip is
 * unfiltered while the table is filtered — a tile that changed when you clicked
 * it would be a tile that reports its own filter.
 */
export async function getZoneHealth(signal?: AbortSignal): Promise<ZoneHealthSummary> {
  if (DATA_SOURCE === 'http') {
    return http.get<ZoneHealthSummary>('/zones/health', undefined, { signal })
  }
  return mock(ZONE_OPERATIONS.health, signal, () => summariseZones(resolveZones()))
}

/** Pure, exported, and synchronous — the metrics client derives four tiles from it. */
export function summariseZones(zones: readonly Zone[]): ZoneHealthSummary {
  const withRatio = zones.filter((z) => z.demandSupplyRatio !== null)
  return {
    zonesTracked: zones.length,
    starvedZones: zones.filter((z) => z.starved).length,
    captainsNeeded: zones.reduce((sum, z) => sum + z.captainsNeeded, 0),
    unservedRequests30d: zones.reduce((sum, z) => sum + z.failures30d, 0),
    avgFailureRate: zones.length
      ? Math.round(zones.reduce((sum, z) => sum + z.failureRate, 0) / zones.length)
      : null,
    worstDemandSupplyRatio: withRatio.length
      ? Math.max(...withRatio.map((z) => z.demandSupplyRatio as number))
      : null,
  }
}

/**
 * The nav badge for `management-zones` (`sbb-zones`, `:14140`).
 *
 * Synchronous and fixture-backed because `fixtures/navCounts.ts` is assembled
 * at module scope. **This closes R4-6 §6.5**: the badge was seeded `0` with the
 * comment *"the zone watchlist exists and is currently empty"* while the ratio
 * tile said the worst zone ran at 7×. Both now come from `resolveZones()`, so
 * the badge is `2` and it is the count of the rows the table shows first.
 */
export function starvedZoneCount(): number {
  return resolveZones().filter((z) => z.starved).length
}

/** The four cities (`:13946`). Read by the `liveCities` tile and by `zones.citiesHealth`. */
export function listCities(): typeof cityFixtures {
  return cityFixtures
}

/* ───────────────────────────── mutations ──────────────────────────────── */

/**
 * POST /api/v1/zones/:zoneId/steer-offers
 *   body: { bonusPerTripHalalas, budgetCapHalalas, durationMinutes }
 *   -> ZoneSteerOffer
 *
 * `openSteerOffer` / `commitSteerOffer` (`:13996`, `:14018`). Permission
 * `live_ops` **plus** the page-level `zones.steer` key (`:14004`) — the row
 * action R4-6 §6.4 clause 2 puts on the table.
 *
 * **409 when an offer is already live for the zone** (`:13999`): *"let it run
 * before stacking another"*. A domain refusal, not an injected failure — the
 * two are reached differently and both must work.
 */
export async function openSteerOffer(
  input: {
    zoneId: string
    bonusPerTripHalalas: number
    budgetCapHalalas: number
    durationMinutes: number
  },
  signal?: AbortSignal,
): Promise<ZoneSteerOffer> {
  if (DATA_SOURCE === 'http') {
    return http.post<ZoneSteerOffer>(`/zones/${input.zoneId}/steer-offers`, input, { signal })
  }
  return mockMutation(ZONE_OPERATIONS.steer, signal, () => {
    const seeds = seedOverride ?? zoneSeeds
    if (!seeds.some((z) => z.id === input.zoneId)) throw notFound('zone', input.zoneId)
    if (steerOffers.some((o) => o.zoneId === input.zoneId && o.status === 'active')) {
      throw conflict(`A steering offer is already live for ${input.zoneId}`)
    }
    const offer: ZoneSteerOffer = {
      id: `STEER-${String(steerOffers.length + 1).padStart(4, '0')}`,
      zoneId: input.zoneId,
      bonusPerTripHalalas: input.bonusPerTripHalalas,
      budgetCapHalalas: input.budgetCapHalalas,
      spentHalalas: 0,
      accepted: 0,
      /* `steerableDrivers()` (`:13984`) — available captains, not on a trip and
         not suspended. Held at the seam rather than recomputed per render. */
      sentTo: 0,
      expiresAt: addMinutes(EYVAR_NOW, input.durationMinutes),
      status: 'active',
    }
    steerOffers = [...steerOffers, offer]
    return offer
  })
}

/**
 * POST /api/v1/zones/:zoneId/recruitment
 *   -> { zoneId, queuedAt }
 *
 * `queueRecruitment` (`:13989`). Permission `manage_settings` (`:13990`).
 * **409 when already queued** (`:13991`).
 */
export async function queueRecruitment(
  zoneId: string,
  signal?: AbortSignal,
): Promise<{ zoneId: string; queuedAt: string }> {
  if (DATA_SOURCE === 'http') {
    return http.post<{ zoneId: string; queuedAt: string }>(`/zones/${zoneId}/recruitment`, {}, { signal })
  }
  return mockMutation(ZONE_OPERATIONS.queueRecruitment, signal, () => {
    const seeds = seedOverride ?? zoneSeeds
    if (!seeds.some((z) => z.id === zoneId)) throw notFound('zone', zoneId)
    if (recruitmentQueue.some((r) => r.zoneId === zoneId)) {
      throw conflict(`${zoneId} is already queued for recruitment`)
    }
    const row = { zoneId, queuedAt: EYVAR_NOW }
    recruitmentQueue = [...recruitmentQueue, row]
    return row
  })
}

/* ──────────────────── mock-only fixture affordances ───────────────────── */

/**
 * **The `supply: 0` case, which R4-6b requires to be representable and which no
 * seeded zone exercises.**
 *
 * Al Narjis drops to zero captains. Three things become reachable at once and
 * none of them can be reached any other way:
 *
 *   - `demandSupplyRatio: null` — the `ratio` tile and the `Demand : supply`
 *     cell must both render an absent ratio rather than `Infinity×` (R4-12);
 *   - `starved: true` on a zone legacy's own predicate would have scored
 *     `false` (`:14133`) — the correction in `isStarved`, made visible;
 *   - `worstDemandSupplyRatio` falling from `7` to `3` while the *worst* zone
 *     got worse, which is the tile's most counter-intuitive true reading.
 *
 * Not seeded, because seeding it would move `avgFailureRate` and
 * `worstDemandSupplyRatio` away from the values the board publishes today and
 * R4-6b's brief is six rows from `DB.zones`. A toggle, exactly like
 * `useOutOfBalanceLedger()` and `useQuietSafetyQueue()`.
 */
export function useZeroSupplyZone(): void {
  seedOverride = zoneSeeds.map((z) => (z.id === 'ZONE-01' ? { ...z, supply: 0 } : z))
}

/** An offer already running on the worst zone, so the row's `Offer live` state is reachable. */
export function useLiveSteerOffer(): void {
  steerOffers = [
    {
      id: 'STEER-0001',
      zoneId: 'ZONE-01',
      bonusPerTripHalalas: 12_00,
      budgetCapHalalas: 300_00,
      spentHalalas: 96_00,
      accepted: 8,
      sentTo: 31,
      expiresAt: addMinutes(EYVAR_NOW, 74),
      status: 'active',
    },
  ]
}

/**
 * **R8's first kind** — nothing has ever existed here. A tenant in a city with
 * no tracked districts, which is what every city except Riyadh looks like
 * today (**L-6**). The strip must survive it: `avgFailureRate` and
 * `worstDemandSupplyRatio` both go `null`, and neither becomes `0`.
 */
export function useNoZones(): void {
  seedOverride = []
}

/* ─────────────────────────────── helpers ──────────────────────────────── */

function addMinutes(iso: string, minutes: number): string {
  const d = new Date(Date.parse(iso) + minutes * 60_000 + 3 * 3_600_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}+03:00`
  )
}

function conflict(message: string) {
  return new ApiError({ status: 409, message, retryable: false })
}
