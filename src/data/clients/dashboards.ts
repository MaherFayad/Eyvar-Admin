/**
 * Quick dashboards — §11.
 *
 * **A dashboard is a named, ordered list of saved report ids, rendered through
 * the existing §3.7 composer. Nothing more.** "Quick" is load-bearing in the
 * owner's ask, and the product already has a fixed composer for exactly this
 * shape (`MetricBoardScreen`, `MetricBoard { metrics[], charts[] }`). A
 * dashboard reuses it with a different source for the list.
 *
 * ## The one modelling decision that matters, stated so nobody reverses it
 *
 * **A tile stores a reference (`reportId`), never a copy of the query.** The
 * consequence, plainly: *editing a report changes every dashboard that pins it*
 * (AC-867). That is correct and it is the point of naming and saving a report
 * at all — a report is a definition and a dashboard shows the current
 * definition.
 *
 * The rejected alternative is "pin the current definition", which copies the
 * query into the tile. It sounds safer and it is worse: two editable
 * definitions share one name, nobody can tell which one the board is showing,
 * and the day they diverge is the day the board silently stops matching the
 * report it is named after.
 *
 * `pinnedName` exists **only** so a tile whose report has vanished can say what
 * it used to be. It is never read for a resolvable tile.
 *
 * ## Ordering is two integers, not a grid
 *
 * §11.2 costs a drag-and-drop grid honestly — a second layout model, a
 * persisted geometry per breakpoint, a keyboard equivalent for every drag
 * (*"§7 does not exempt drag-and-drop; a reorder with no keyboard path is a
 * defect"*), and reflow when a middle tile is removed. `Move up` / `Move down`
 * is keyboard-operable by construction, one integer per tile, no breakpoint
 * interaction — and an ordered list is a valid input to a grid, so nothing is
 * redesigned when phase two arrives.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { dashboardFixtures } from '../fixtures/reports'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { paginate } from '../mock/query'
import type { Paginated, QueryParams, Single } from '../types/common'
import {
  REPORT_NAME_MAX,
  type Dashboard,
  type DashboardTile,
  type SaveDashboardOutcome,
  type SaveInvalidReason,
} from '../types/report'
import { currentMockUserId } from './session'
import { http } from './http'

export const DASHBOARD_OPERATIONS = {
  list: 'dashboards.list',
  get: 'dashboards.get',
  save: 'dashboards.save',
  delete: 'dashboards.delete',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(DASHBOARD_OPERATIONS))

/** Mutable copy. **Not persistence** — Q1 is open; see `fixtures/reports.ts`. */
let dashboards: Dashboard[] = dashboardFixtures.map((d) => ({ ...d, tiles: d.tiles.map((t) => ({ ...t })) }))

/**
 * GET /api/v1/dashboards
 *   params: q · page · pageSize
 *   -> Paginated<Dashboard>
 */
export async function listDashboards(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Dashboard>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Dashboard>>('/dashboards', { ...params, signal }, { signal })
  }
  return mock(DASHBOARD_OPERATIONS.list, signal, () => {
    const q = params.q?.trim().toLowerCase()
    const rows = q ? dashboards.filter((d) => d.name.toLowerCase().includes(q)) : dashboards
    return paginate(rows, params)
  })
}

/**
 * GET /api/v1/dashboards/:id
 *   -> Single<Dashboard>
 *
 * Returns the tiles in `order`. **It does not resolve them** — each tile loads
 * through `reports.run` independently, which is what lets one tile fail, one be
 * blocked and one be missing while the rest render (§11.4, AC-872). A dashboard
 * that resolved its tiles server-side would fail as a unit.
 */
export async function getDashboard(id: string, signal?: AbortSignal): Promise<Single<Dashboard>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Single<Dashboard>>(`/dashboards/${id}`, undefined, { signal })
  }
  return mock(DASHBOARD_OPERATIONS.get, signal, () => {
    const row = dashboards.find((d) => d.id === id)
    if (!row) throw notFound('dashboard', id)
    return { data: { ...row, tiles: [...row.tiles].sort((a, b) => a.order - b.order) } }
  })
}

export interface SaveDashboardInput {
  id: string | null
  name: string
  tiles: DashboardTile[]
}

/**
 * POST /api/v1/dashboards · PATCH /api/v1/dashboards/:id
 *   body: { name, tiles }
 *   -> Single<Dashboard>
 *
 * **A dashboard with zero tiles is valid.** AC-865 requires creating one with a
 * name and no tiles and rendering the first-run empty state for that dashboard;
 * refusing it would make that state unreachable. `no-tiles` exists in
 * `SaveInvalidReason` for a caller that wants to require them and is not used
 * here.
 *
 * Tile order is renormalised to 1..n on save, so `Move up` at the top and
 * `Move down` at the bottom are no-ops rather than drift.
 */
export async function saveDashboard(
  input: SaveDashboardInput,
  signal?: AbortSignal,
): Promise<SaveDashboardOutcome> {
  if (DATA_SOURCE === 'http') {
    const res = input.id
      ? await http.patch<Single<Dashboard>>(`/dashboards/${input.id}`, input, { signal })
      : await http.post<Single<Dashboard>>('/dashboards', input, { signal })
    return { status: 'saved', dashboard: res.data }
  }
  return mockMutation(DASHBOARD_OPERATIONS.save, signal, () => {
    const reasons: SaveInvalidReason[] = []
    const name = input.name.trim()
    if (name.length === 0) reasons.push('name-required')
    if (name.length > REPORT_NAME_MAX) reasons.push('name-too-long')
    if (reasons.length > 0) return { status: 'invalid' as const, reasons }

    const tiles = [...input.tiles]
      .sort((a, b) => a.order - b.order)
      .map((t, i) => ({ ...t, order: i + 1 }))

    if (input.id) {
      const existing = dashboards.find((d) => d.id === input.id)
      if (!existing) throw notFound('dashboard', input.id)
      const updated: Dashboard = { ...existing, name, tiles, updatedAt: EYVAR_NOW }
      dashboards = dashboards.map((d) => (d.id === updated.id ? updated : d))
      return { status: 'saved' as const, dashboard: { ...updated } }
    }

    const created: Dashboard = {
      id: `DSH-${dashboards.length + 1}${dashboards.length}`,
      name,
      ownerId: currentMockUserId(),
      tiles,
      createdAt: EYVAR_NOW,
      updatedAt: EYVAR_NOW,
    }
    dashboards = [...dashboards, created]
    return { status: 'saved' as const, dashboard: { ...created } }
  })
}

/**
 * DELETE /api/v1/dashboards/:id
 *   -> 204
 *
 * Deleting a dashboard unpins its reports and deletes nothing else. The
 * asymmetry with `reports.delete` is deliberate: a dashboard is a view over
 * reports, so losing it loses a arrangement; losing a report loses a definition
 * several dashboards may be showing.
 */
export async function deleteDashboard(id: string, signal?: AbortSignal): Promise<void> {
  if (DATA_SOURCE === 'http') {
    await http.delete<void>(`/dashboards/${id}`, { signal })
    return
  }
  await mockMutation(DASHBOARD_OPERATIONS.delete, signal, () => {
    if (!dashboards.some((d) => d.id === id)) throw notFound('dashboard', id)
    dashboards = dashboards.filter((d) => d.id !== id)
  })
}

/**
 * Move a tile one place, keyboard-operable by construction (AC-871).
 *
 * A pure function over the tile list rather than a client call, so the screen
 * can reorder optimistically and save once. Out-of-range moves return the list
 * unchanged — a `Move up` on the first tile is a no-op, not an error.
 */
export function moveTile(tiles: readonly DashboardTile[], tileId: string, direction: -1 | 1): DashboardTile[] {
  const ordered = [...tiles].sort((a, b) => a.order - b.order)
  const index = ordered.findIndex((t) => t.tileId === tileId)
  const target = index + direction
  if (index === -1 || target < 0 || target >= ordered.length) return ordered
  const a = ordered[index]
  const b = ordered[target]
  if (!a || !b) return ordered
  const swapped = [...ordered]
  swapped[index] = b
  swapped[target] = a
  return swapped.map((t, i) => ({ ...t, order: i + 1 }))
}

export function resetDashboards(): void {
  dashboards = dashboardFixtures.map((d) => ({ ...d, tiles: d.tiles.map((t) => ({ ...t })) }))
}
