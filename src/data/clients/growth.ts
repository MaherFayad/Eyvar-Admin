/**
 * Growth — Management › Growth, the four `?view=` index tables under the board
 * (`specs/management-growth-tables.md`, T7.1, decision O3).
 * Four lists, four facet reads and the two writes the spec grants: pause and
 * resume a campaign, activate and deactivate an incentive.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import { ApiError, type Facets, type Paginated, type QueryParams } from '../types/common'
import type {
  GrowthBulkMessage,
  GrowthIncentive,
  GrowthPromo,
  GrowthReferral,
  PromoStatus,
} from '../types/growth'
import { http } from './http'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows — `mock/fixtures.ts` says why a static import would
   pin 26 000 lines of seeded data into every build. */
let promoFixtures!: Fixtures['growthPromoFixtures']
let referralFixtures!: Fixtures['growthReferralFixtures']
let incentiveFixtures!: Fixtures['growthIncentiveFixtures']
let messageFixtures!: Fixtures['growthBulkMessageFixtures']

onFixturesLoaded((f) => {
  promoFixtures = f.growthPromoFixtures
  referralFixtures = f.growthReferralFixtures
  incentiveFixtures = f.growthIncentiveFixtures
  messageFixtures = f.growthBulkMessageFixtures
  dynamicPromos = [...promoFixtures]
  dynamicIncentives = [...incentiveFixtures]
})

/* Session state for the two lists that carry a write, so a read after a write
   reflects it. Referrals and messages are logs and have none. */
let dynamicPromos!: GrowthPromo[]
let dynamicIncentives!: GrowthIncentive[]

/** Back to fixtures, so one test's pause cannot leak into the next. */
export function resetGrowth(): void {
  if (!fixturesLoaded()) return
  dynamicPromos = [...promoFixtures]
  dynamicIncentives = [...incentiveFixtures]
}

export const GROWTH_OPERATIONS = {
  listPromos: 'growth.listPromos',
  promoFacets: 'growth.promoFacets',
  setPromoStatus: 'growth.setPromoStatus',
  listReferrals: 'growth.listReferrals',
  referralFacets: 'growth.referralFacets',
  listIncentives: 'growth.listIncentives',
  incentiveFacets: 'growth.incentiveFacets',
  setIncentiveActive: 'growth.setIncentiveActive',
  listMessages: 'growth.listMessages',
  messageFacets: 'growth.messageFacets',
} as const

/* Registered at module load, not on first call, so `?mockFail=` can name an
   operation nobody has invoked yet (`config.ts`). */
registerOperations(...Object.values(GROWTH_OPERATIONS))

/* ── Promos ──────────────────────────────────────────────────────────── */

const promoShape: QueryShape<GrowthPromo> = {
  searchable: [(p) => p.code, (p) => p.target],
  sortable: {
    code: (p) => p.code,
    discountPercent: (p) => p.discountPercent,
    burnPercent: (p) => p.burnPercent,
    spentHalalas: (p) => p.spentHalalas,
    uses: (p) => p.uses,
    newSubscriptions: (p) => p.newSubscriptions,
    roi: (p) => p.roi,
    expiresOn: (p) => p.expiresOn,
    status: (p) => p.status,
    createdAt: (p) => p.createdAt,
  },
  filterable: {
    code: (p) => p.code,
    status: (p) => p.status,
    target: (p) => p.target,
    discountPercent: (p) => p.discountPercent,
    burnPercent: (p) => p.burnPercent,
    uses: (p) => p.uses,
    newSubscriptions: (p) => p.newSubscriptions,
    roi: (p) => p.roi,
    perUserLimit: (p) => p.perUserLimit,
    expiresOn: (p) => toInstant(p.expiresOn),
    createdAt: (p) => p.createdAt,
  },
  facetable: ['status', 'target'],
}

/**
 * GET /api/v1/growth/promos
 *   params: q · page · pageSize · sort · filter
 *   -> Paginated<GrowthPromo>
 * Sortable: every column. Filterable: status · target · every numeric column.
 * `burnPercent` and `roi` are server-computed, so this list and the board's
 * tile cannot answer differently.
 */
export async function listGrowthPromos(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<GrowthPromo>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<GrowthPromo>>('/growth/promos', { ...params }, { signal })
  }
  return mock(GROWTH_OPERATIONS.listPromos, signal, () =>
    runQuery(dynamicPromos, params, promoShape),
  )
}

/**
 * GET /api/v1/growth/promos/facets
 *   -> Facets
 * Field name to [{ value, count }], count-descending.
 */
export async function getGrowthPromoFacets(signal?: AbortSignal): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/growth/promos/facets', undefined, { signal })
  }
  return mock(GROWTH_OPERATIONS.promoFacets, signal, () =>
    computeFacets(dynamicPromos, promoShape),
  )
}

/**
 * PATCH /api/v1/growth/promos/:code/status
 *   body: { status: 'active' | 'paused' }
 *   -> GrowthPromo
 *   404 unknown code · 409 `campaign_not_pausable` when exhausted or expired
 * The campaign stays on the list with its new state, the way a released escrow
 * hold does. Legacy toggles `DB.promos[i].status` in place (`:13529`).
 */
export async function setGrowthPromoStatus(
  code: string,
  status: Extract<PromoStatus, 'active' | 'paused'>,
  signal?: AbortSignal,
): Promise<GrowthPromo> {
  if (DATA_SOURCE === 'http') {
    return http.patch<GrowthPromo>(`/growth/promos/${code}/status`, { status }, { signal })
  }
  return mockMutation(GROWTH_OPERATIONS.setPromoStatus, signal, () => {
    const index = dynamicPromos.findIndex((p) => p.code === code)
    const row = dynamicPromos[index]
    if (!row) throw notFound('promo campaign', code)
    if (row.status === 'exhausted' || row.status === 'expired') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'campaign_not_pausable',
        message: `${row.code} is ${row.status}`,
        retryable: false,
      })
    }
    const updated = { ...row, status }
    dynamicPromos[index] = updated
    return updated
  })
}

/* ── Referrals ───────────────────────────────────────────────────────── */

const referralShape: QueryShape<GrowthReferral> = {
  searchable: [
    (r) => r.referrerName,
    (r) => r.refereeName,
    (r) => r.referrerId,
    (r) => r.refereeId,
    (r) => r.id,
  ],
  sortable: {
    referrerName: (r) => r.referrerName,
    refereeName: (r) => r.refereeName,
    referrerBonusHalalas: (r) => r.referrerBonusHalalas,
    refereeBonusHalalas: (r) => r.refereeBonusHalalas,
    totalBonusHalalas: (r) => r.totalBonusHalalas,
    creditedAt: (r) => r.creditedAt,
  },
  filterable: {
    id: (r) => r.id,
    referrerId: (r) => r.referrerId,
    refereeId: (r) => r.refereeId,
    referrerName: (r) => r.referrerName,
    refereeName: (r) => r.refereeName,
    sharedDeviceFlag: (r) => r.sharedDeviceFlag,
    referrerBonusHalalas: (r) => r.referrerBonusHalalas,
    refereeBonusHalalas: (r) => r.refereeBonusHalalas,
    totalBonusHalalas: (r) => r.totalBonusHalalas,
    creditedAt: (r) => r.creditedAt,
  },
  facetable: ['sharedDeviceFlag'],
}

/**
 * GET /api/v1/growth/referrals
 *   params: q · page · pageSize · sort · filter
 *   -> Paginated<GrowthReferral>
 * `sharedDeviceFlag` is server-computed: the predicate is the Fraud page's
 * (`:5610`) over `lastIp` and `device`, neither of which reaches a screen. The
 * flag comes across; the act it invites does not (O4).
 */
export async function listGrowthReferrals(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<GrowthReferral>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<GrowthReferral>>('/growth/referrals', { ...params }, { signal })
  }
  return mock(GROWTH_OPERATIONS.listReferrals, signal, () =>
    runQuery(referralFixtures, params, referralShape),
  )
}

/**
 * GET /api/v1/growth/referrals/facets
 *   -> Facets
 */
export async function getGrowthReferralFacets(signal?: AbortSignal): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/growth/referrals/facets', undefined, { signal })
  }
  return mock(GROWTH_OPERATIONS.referralFacets, signal, () =>
    computeFacets(referralFixtures, referralShape),
  )
}

/* ── Incentives ──────────────────────────────────────────────────────── */

const incentiveShape: QueryShape<GrowthIncentive> = {
  searchable: [(i) => i.name, (i) => i.id, (i) => i.condition],
  sortable: {
    name: (i) => i.name,
    condition: (i) => i.condition,
    earnedCount: (i) => i.earnedCount,
    totalPaidHalalas: (i) => i.totalPaidHalalas,
    createdAt: (i) => i.createdAt,
    active: (i) => String(i.active),
  },
  filterable: {
    id: (i) => i.id,
    name: (i) => i.name,
    condition: (i) => i.condition,
    active: (i) => i.active,
    rewardKind: (i) => i.reward.kind,
    earnedCount: (i) => i.earnedCount,
    totalPaidHalalas: (i) => i.totalPaidHalalas,
    createdAt: (i) => i.createdAt,
  },
  facetable: ['condition', 'active', 'rewardKind'],
}

/**
 * GET /api/v1/growth/incentives
 *   params: q · page · pageSize · sort · filter
 *   -> Paginated<GrowthIncentive>
 * `earnedCount` and `totalPaidHalalas` are server-computed over the captain
 * bonus log (`:13662`, `:13663`); a screen that totalled it would be a second
 * answer to what a rule has cost.
 */
export async function listGrowthIncentives(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<GrowthIncentive>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<GrowthIncentive>>('/growth/incentives', { ...params }, { signal })
  }
  return mock(GROWTH_OPERATIONS.listIncentives, signal, () =>
    runQuery(dynamicIncentives, params, incentiveShape),
  )
}

/**
 * GET /api/v1/growth/incentives/facets
 *   -> Facets
 */
export async function getGrowthIncentiveFacets(signal?: AbortSignal): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/growth/incentives/facets', undefined, { signal })
  }
  return mock(GROWTH_OPERATIONS.incentiveFacets, signal, () =>
    computeFacets(dynamicIncentives, incentiveShape),
  )
}

/**
 * PATCH /api/v1/growth/incentives/:id
 *   body: { active: boolean }
 *   -> GrowthIncentive
 *   404 when the rule does not exist
 * Legacy's toggle has no permission check and writes no audit row (`:13674`);
 * the spec records that as a defect and puts this behind `manage_plans`.
 */
export async function setGrowthIncentiveActive(
  id: string,
  active: boolean,
  signal?: AbortSignal,
): Promise<GrowthIncentive> {
  if (DATA_SOURCE === 'http') {
    return http.patch<GrowthIncentive>(`/growth/incentives/${id}`, { active }, { signal })
  }
  return mockMutation(GROWTH_OPERATIONS.setIncentiveActive, signal, () => {
    const index = dynamicIncentives.findIndex((i) => i.id === id)
    const row = dynamicIncentives[index]
    if (!row) throw notFound('incentive rule', id)
    const updated = { ...row, active }
    dynamicIncentives[index] = updated
    return updated
  })
}

/* ── Bulk messages ───────────────────────────────────────────────────── */

const messageShape: QueryShape<GrowthBulkMessage> = {
  searchable: [(m) => m.body, (m) => m.sentByName, (m) => m.id],
  sortable: {
    body: (m) => m.body,
    segment: (m) => m.segment,
    channel: (m) => m.channel,
    recipientCount: (m) => m.recipientCount,
    sentAt: (m) => m.sentAt,
    sentByName: (m) => m.sentByName,
  },
  filterable: {
    id: (m) => m.id,
    body: (m) => m.body,
    segment: (m) => m.segment,
    channel: (m) => m.channel,
    recipientCount: (m) => m.recipientCount,
    sentAt: (m) => m.sentAt,
    sentById: (m) => m.sentById,
    sentByName: (m) => m.sentByName,
  },
  facetable: ['segment', 'channel'],
}

/**
 * GET /api/v1/growth/messages
 *   params: q · page · pageSize · sort · filter
 *   -> Paginated<GrowthBulkMessage>
 * A send log, and read-only: legacy's own gate says a bulk message *"cannot be
 * unsent"* (`:20855`). Composing one is `design/11-conversation-composer.md`'s.
 */
export async function listGrowthBulkMessages(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<GrowthBulkMessage>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<GrowthBulkMessage>>('/growth/messages', { ...params }, { signal })
  }
  return mock(GROWTH_OPERATIONS.listMessages, signal, () =>
    runQuery(messageFixtures, params, messageShape),
  )
}

/**
 * GET /api/v1/growth/messages/facets
 *   -> Facets
 */
export async function getGrowthMessageFacets(signal?: AbortSignal): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/growth/messages/facets', undefined, { signal })
  }
  return mock(GROWTH_OPERATIONS.messageFacets, signal, () =>
    computeFacets(messageFixtures, messageShape),
  )
}
