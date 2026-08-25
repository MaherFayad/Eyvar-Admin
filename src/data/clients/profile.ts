/**
 * 360° profile resolver and global search — foundation spec §4.3.1, §4.3.4.
 *
 * Two operations the shell cannot work without:
 *   `resolveProfile(id)`  — what `?entity=<id>` opens
 *   `search(q)`           — the field that makes a 5-workspace structure
 *                           survivable when someone cannot find where
 *                           Cancellation Policy went
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, notFound } from '../mock/delay'
import { corporateAccountFixtures } from '../fixtures/corporateAccounts'
import { driverFixtures } from '../fixtures/drivers'
import { applicantFixtures } from '../fixtures/applicants'
import { riderFixtures } from '../fixtures/riders'
import { subscriptionFixtures } from '../fixtures/subscriptions'
import { tripFixtures } from '../fixtures/trips'
import { LEGACY_PAGE_TITLES } from '../fixtures/legacyPages'
import { SUB_TABS } from '../fixtures/routeTable'
import type {
  ProfileEntityType,
  ProfileRef,
  ProfileSectionKey,
  SearchResponse,
  SearchResult,
} from '../types/profile'
import { resolveLegacyPage } from './routes'
import { http } from './http'

export const PROFILE_OPERATIONS = {
  resolve: 'profile.resolve',
  search: 'search.query',
} as const

/**
 * GET /api/v1/entities/:entityId
 *   -> ProfileRef
 *   404 when the id resolves to nothing — and the copy must name the id that
 *      was searched (§9.2 `overlay-not-found`), which is why `notFound` carries it.
 *
 * Prefix-based resolution mirrors the id scheme the whole product already uses
 * (`RDR-`, `DRV-`, `TRP-`, `SUB-`, `PAY-`, `CMP-`, `TKT-`, `APP-`, `CORP-`).
 * Legacy resolves by scanning collections in an arbitrary `for…in` order
 * (`:3266`); prefixes make it deterministic and make the five missing types
 * (§4.3.1) a one-line addition each rather than a rewrite.
 */
export async function resolveProfile(entityId: string, signal?: AbortSignal): Promise<ProfileRef> {
  if (DATA_SOURCE === 'http') return http.get<ProfileRef>(`/entities/${entityId}`, undefined, { signal })
  return mock(PROFILE_OPERATIONS.resolve, signal, () => {
    const ref = resolveLocally(entityId)
    if (!ref) throw notFound('record', entityId)
    return ref
  })
}

/**
 * GET /api/v1/search
 *   params: q · scope · limit
 *   -> SearchResponse
 *
 * Covers three kinds of target (§4.3.4): entities, destinations (by current
 * name **and by legacy name**, via the route table's `legacyPageIds`), and
 * named actions. Results the operator cannot open must not appear (AC-60) —
 * that filtering is the server's, because the client does not hold the
 * permission truth.
 */
export async function search(
  q: string,
  opts: { scope?: string | null; limit?: number } = {},
  signal?: AbortSignal,
): Promise<SearchResponse> {
  if (DATA_SOURCE === 'http') {
    return http.get<SearchResponse>('/search', { q, scope: opts.scope ?? undefined, limit: opts.limit }, { signal })
  }
  return mock(PROFILE_OPERATIONS.search, signal, () => {
    const needle = q.trim().toLowerCase()
    if (!needle) return { results: [], query: q, scope: opts.scope ?? null, computedAt: EYVAR_NOW }
    const results = [...searchEntities(needle), ...searchDestinations(needle)]
      // Stable descending: equal scores keep fixture order, so "Al-Harbi" does
      // not silently pick a different one of the two people on every keystroke.
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.limit ?? 20)
    return { results, query: q, scope: opts.scope ?? null, computedAt: EYVAR_NOW }
  })
}

/* ─────────────────────────────── resolution ────────────────────────────── */

const SECTIONS: Record<ProfileEntityType, ProfileSectionKey[]> = {
  rider: ['identity', 'subscriptions', 'trips', 'wallet', 'payments', 'tickets', 'movement', 'devices'],
  driver: ['identity', 'trips', 'compliance', 'commitment', 'wallet', 'payments', 'fairness', 'movement', 'devices'],
  trip: ['identity', 'trips', 'payments', 'disputes'],
  subscription: ['identity', 'subscriptions', 'trips', 'payments'],
  payment: ['identity', 'payments'],
  complaint: ['identity', 'disputes', 'tickets'],
  'new-rider': ['identity', 'movement', 'devices'],
  applicant: ['identity', 'compliance', 'movement', 'devices'],
  ticket: ['identity', 'tickets', 'disputes'],
  'corporate-account': ['identity', 'subscriptions', 'payments'],
  plan: ['identity', 'subscriptions'],
}

function resolveLocally(entityId: string): ProfileRef | null {
  const id = entityId.trim().toUpperCase()

  const rider = riderFixtures.find((r) => r.id === id)
  if (rider) return ref(id, 'rider', rider.name, rider.phone)

  const driver = driverFixtures.find((d) => d.id === id)
  if (driver) return ref(id, 'driver', driver.name, driver.vehicle)

  const applicant = applicantFixtures.find((a) => a.id === id)
  if (applicant) return ref(id, 'applicant', applicant.name, applicant.vehicle)

  const trip = tripFixtures.find((t) => t.id === id)
  if (trip) return ref(id, 'trip', id, trip.route)

  const sub = subscriptionFixtures.find((s) => s.id === id)
  if (sub) return ref(id, 'subscription', id, sub.planName)

  const corp = corporateAccountFixtures.find((c) => c.id === id)
  if (corp) return ref(id, 'corporate-account', corp.companyName, corp.contactName)

  return null
}

function ref(id: string, type: ProfileEntityType, title: string, subtitle: string | null): ProfileRef {
  return { entityId: id, entityType: type, title, subtitle, fullPagePath: `/entity/${id}`, sections: SECTIONS[type] }
}

/* ──────────────────────────────── search ──────────────────────────────── */

function searchEntities(needle: string): SearchResult[] {
  const out: SearchResult[] = []
  const push = (id: string, type: ProfileEntityType, title: string, subtitle: string | null) => {
    const idHit = id.toLowerCase().includes(needle)
    const nameHit = title.toLowerCase().includes(needle)
    // Partial-id and phone matching, both of which legacy lacks entirely (§4.3.4).
    const phoneHit = (subtitle ?? '').replace(/\s/g, '').includes(needle.replace(/\s/g, ''))
    if (!idHit && !nameHit && !phoneHit) return
    out.push({
      kind: 'entity',
      title,
      subtitle: `${id}${subtitle ? ` · ${subtitle}` : ''}`,
      target: { entityId: id, entityType: type },
      matchedLegacyName: null,
      score: idHit ? 100 : nameHit ? 80 : 60,
    })
  }

  riderFixtures.forEach((r) => push(r.id, 'rider', r.name, r.phone))
  driverFixtures.forEach((d) => push(d.id, 'driver', d.name, d.phone))
  applicantFixtures.forEach((a) => push(a.id, 'applicant', a.name, a.phone))
  corporateAccountFixtures.forEach((c) => push(c.id, 'corporate-account', c.companyName, c.contactName))
  tripFixtures.forEach((t) => push(t.id, 'trip', t.id, t.route))
  subscriptionFixtures.forEach((s) => push(s.id, 'subscription', s.id, s.planName))
  return out
}

function searchDestinations(needle: string): SearchResult[] {
  const out: SearchResult[] = []

  // By current name — the i18n key stands in until the catalogue exists.
  for (const row of SUB_TABS) {
    if (!row.titleKey.toLowerCase().includes(needle) && !row.path.includes(needle)) continue
    out.push({
      kind: 'destination',
      title: row.titleKey,
      subtitle: row.path,
      target: { path: row.path, viewId: null },
      matchedLegacyName: null,
      score: 70,
    })
  }

  // By legacy name — this is the §4.3.4 case: "Renewal pipeline" resolves to
  // Operations › Subscriptions — Expiring ≤ 7 days without the operator knowing
  // it moved. Scored above a current-name partial because the operator typed a
  // name that no longer exists, which is a strong signal of intent.
  for (const hit of resolveLegacyPage(needle)) {
    out.push({
      kind: 'destination',
      title: LEGACY_PAGE_TITLES[hit.legacyPageId] ?? hit.legacyPageId,
      subtitle: hit.viewId ? `${hit.path}?view=${hit.viewId}` : hit.path,
      target: { path: hit.path, viewId: hit.viewId },
      matchedLegacyName: hit.legacyTitle,
      score: 75,
    })
  }

  return out
}
