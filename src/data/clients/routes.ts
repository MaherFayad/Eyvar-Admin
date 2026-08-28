/**
 * Route-table client — foundation spec §8.5.
 *
 * The route table is the one piece of shell data that is **synchronous on
 * purpose**. §9.1: "Workspace and sub-tab **labels are static** and render
 * immediately — they come from the route table, not the network, so the nav is
 * never a skeleton." Only the *counts* are async (`navCounts.ts`).
 *
 * The async accessor exists anyway, for the day the table is served so a route
 * can be added without a deploy. Until then it resolves from the same fixture,
 * so the two can never disagree.
 */

import { DATA_SOURCE } from '../config'
import { mock } from '../mock/delay'
import { LEGACY_PAGE_TITLES } from '../fixtures/legacyPages'
import { ROUTE_TABLE } from '../fixtures/routeTable'
import type {
  RouteTable,
  ShellLayerRoute,
  SubTabRoute,
  Workspace,
  WorkspaceId,
} from '../types/navigation'
import { http } from './http'

/* ───────────────── synchronous accessors (the common case) ───────────────── */

export function getRouteTable(): RouteTable {
  return ROUTE_TABLE
}

export function getWorkspaces(): Workspace[] {
  return [...ROUTE_TABLE.workspaces].sort((a, b) => a.order - b.order)
}

export function getSubTabs(workspaceId: WorkspaceId): SubTabRoute[] {
  return ROUTE_TABLE.subTabs.filter((r) => r.workspaceId === workspaceId).sort((a, b) => a.order - b.order)
}

export function findSubTabById(subTabId: string): SubTabRoute | null {
  return ROUTE_TABLE.subTabs.find((r) => r.subTabId === subTabId) ?? null
}

export function findSubTabByPath(path: string): SubTabRoute | null {
  const clean = (path.split('?')[0] ?? '').replace(/\/+$/, '') || '/'
  const exact = ROUTE_TABLE.subTabs.find((r) => r.path === clean)
  if (exact) return exact
  // A level-3 detail highlights its parent sub-tab (§3.8 rule 2).
  for (const row of ROUTE_TABLE.subTabs) {
    for (const detail of row.detailRoutes) {
      if (matchesDetailPath(detail.path, clean)) return row
    }
  }
  return null
}

/**
 * **The build registry — which declared sub-tabs do not yet have a screen.**
 *
 * A route-table row says a sub-tab *exists*. It does not say a sub-tab is
 * *built*, and `OnboardingStep.available` needs the second fact: **AC-609** and
 * **AC-626** require the two steps whose destination is unbuilt to render
 * disabled in place with the reason named, and to become enabled with **no
 * change to `fixtures/onboardingTracks.ts`**.
 *
 * The fact lives here rather than in the onboarding fixture for exactly that
 * reason: registering a screen is a change to the routing layer, and the
 * checklist should not have to be edited when a screen it points at ships.
 *
 * **Its proper long-term home is a `built: boolean` column on `SubTabRoute`**,
 * beside `permission` and `hasBacklog`, where the spec puts it (*"`available` —
 * source: route table"*, §8.9). That is a 34-row edit to a file two other
 * agents read, so it is **requested from the route-table owner, not taken**.
 * Until then this constant is the register, and it is one line per screen.
 *
 * Every id here must exist in the route table — asserted in `routes.test.ts`.
 * Waves are from `PHASE-PLAN.md`; the two the onboarding tracks point at are
 * named in the design spec §10.5 as *"unbuilt, wave 6"* and *"unbuilt, wave 5"*.
 */
export const UNBUILT_SUB_TAB_IDS: readonly string[] = []

/** `true` when the sub-tab exists in the route table **and** has a screen. */
export function isSubTabBuilt(subTabId: string): boolean {
  return findSubTabById(subTabId) !== null && !UNBUILT_SUB_TAB_IDS.includes(subTabId)
}

export function findShellLayer(layerId: ShellLayerRoute['layerId']): ShellLayerRoute | null {
  return ROUTE_TABLE.shellLayers.find((l) => l.layerId === layerId) ?? null
}

function matchesDetailPath(pattern: string, path: string): boolean {
  const p = pattern.split('/').filter(Boolean)
  const a = path.split('/').filter(Boolean)
  if (p.length !== a.length) return false
  return p.every((seg, i) => seg.startsWith(':') || seg === a[i])
}

/* ───────────────────── legacy-name resolution (§4.3.4) ──────────────────── */

export interface LegacyResolution {
  legacyPageId: string
  legacyTitle: string | null
  subTabId: string
  workspaceId: WorkspaceId
  path: string
  /**
   * The view to open, when the merge register puts the legacy page behind one.
   * `renewal` → `expiring-7d`, `quickrides` → `quick-rides`, and so on.
   */
  viewId: string | null
}

/**
 * Where a legacy page id or legacy page *name* now lives. This is what makes
 * global search able to resolve "Renewal pipeline" to Operations ›
 * Subscriptions — Expiring ≤ 7 days without the operator knowing it moved.
 *
 * A Split page resolves to several rows; callers rank them. Returns `[]` for
 * `interventions`, which is retired and has no destination (§3.11).
 */
export function resolveLegacyPage(idOrTitle: string): LegacyResolution[] {
  const needle = idOrTitle.trim().toLowerCase()
  const matchedIds = Object.keys(LEGACY_PAGE_TITLES).filter(
    (id) => id === needle || (LEGACY_PAGE_TITLES[id] ?? '').toLowerCase().includes(needle),
  )
  const ids = matchedIds.length > 0 ? matchedIds : [needle]

  const out: LegacyResolution[] = []
  for (const id of ids) {
    if (ROUTE_TABLE.retiredLegacyPageIds.includes(id)) continue
    for (const row of ROUTE_TABLE.subTabs) {
      if (!row.legacyPageIds.includes(id)) continue
      out.push({
        legacyPageId: id,
        legacyTitle: LEGACY_PAGE_TITLES[id] ?? null,
        subTabId: row.subTabId,
        workspaceId: row.workspaceId,
        path: row.path,
        viewId: LEGACY_PAGE_TO_VIEW[id] ?? null,
      })
    }
  }
  return out
}

/**
 * Legacy page id → the view it became, where §3.5 names one. Only pages whose
 * *destination row* states a view appear here; a page that became a whole
 * sub-tab has no entry.
 *
 * `live` appears in two rows with two different answers (Live Dispatch has no
 * views; Trips has `route-history`), so it is deliberately absent — the caller
 * disambiguates by row, which is why `resolveLegacyPage` returns a list.
 */
const LEGACY_PAGE_TO_VIEW: Record<string, string> = {
  renewal: 'expiring-7d',
  readiness: 'departing-24h',
  coverage: 'no-backup-captain',
  commitment: 'awaiting-confirmation',
  drivers: 'captains',
  riders: 'riders',
  compliance: 'compliance',
  'all-pending': 'applications',
  quickrides: 'quick-rides',
  'requests-sub-all': 'subscription',
  'requests-instant-all': 'instant',
}

/* ───────────────────────── the async seam ──────────────────────────────── */

export const ROUTE_OPERATIONS = {
  table: 'routes.table',
} as const

/**
 * GET /api/v1/routes
 *   params: none
 *   -> RouteTable
 *
 * Not called by the shell today — the synchronous accessors above are, because
 * §9.1 forbids a skeletonised nav. Wire this only if the route table becomes
 * server-owned; it must then be fetched **before first paint**, not during it.
 */
export async function fetchRouteTable(signal?: AbortSignal): Promise<RouteTable> {
  if (DATA_SOURCE === 'http') return http.get<RouteTable>('/routes', undefined, { signal })
  return mock(ROUTE_OPERATIONS.table, signal, () => ROUTE_TABLE)
}
