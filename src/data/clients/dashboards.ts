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
 *
 * **A tile's `span` is the one thing that ordering could not say.** Amplitude's
 * boards are compositions — a hero across the top, a grid beneath it — and a
 * uniform 2-up reads as a contact sheet rather than as a board. `span` is an
 * enum on the tile, not a geometry: the grid decides what `'full'` means at
 * each width, so nothing here has to know a breakpoint and the keyboard
 * objection never arises (it is a menu item, like every other tile control).
 *
 * ## §C4 — the board has a range and filters, and they are the same vocabulary
 *
 * `Dashboard.range` and `Dashboard.filters` are the board-level controls
 * Amplitude puts in the dashboard header. `applyBoardScope` below is the whole
 * definition of what they mean, as a pure function over one tile's saved query,
 * and it refuses rather than distorts: a filter a report cannot take is not
 * sent, a range that would invalidate a report is not applied, and both
 * refusals are RETURNED so the tile can name them. A board control that
 * silently did nothing to three of nine tiles would be worse than no control.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { paginate } from '../mock/query'
import type { FilterSpec, Paginated, QueryParams, Single } from '../types/common'
import type { Dimension, Measure } from '../types/measure'
import {
  REPORT_NAME_MAX,
  type Dashboard,
  type DashboardTile,
  type ReportQuery,
  type ReportWindow,
  type SaveDashboardOutcome,
  type SaveInvalidReason,
} from '../types/report'
import { planReportQuery } from './catalogue'
import { currentMockUserId } from './session'
import { http } from './http'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let dashboardFixtures!: Fixtures['dashboardFixtures']
onFixturesLoaded((f) => {
  dashboardFixtures = f.dashboardFixtures
  /* Seeded here rather than at module load: these locals are built from
     late-bound fixtures, which are undefined until the fixture chunk lands. */
  dashboards = dashboardFixtures.map((d) => ({ ...d, tiles: d.tiles.map((t) => ({ ...t })) }))
})

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
let dashboards!: Dashboard[]

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
  /**
   * **Required, not optional.** An optional field here is how a tile write
   * silently blanks a description: `writeTiles` sends the whole record, and a
   * caller that simply forgot the key would send `undefined` and erase what the
   * author wrote. The type makes every caller state what it means.
   */
  description: string | null
  tiles: DashboardTile[]
  /**
   * §C4's board range. **Optional, and `undefined` means *leave it alone*.**
   *
   * The asymmetry with `description` is deliberate and it is a property of the
   * VALUES, not a shortcut. `description: null` is the only way to clear a
   * description, so an omitted key and a cleared field would be
   * indistinguishable and a tile write would silently blank one. `range: null`
   * is not a cleared range — it is the live value *"every tile answers with its
   * own window"*, which a board holds most of the time. So `null` can carry
   * "no override" and `undefined` is free to carry "not part of this write",
   * which is what lets a rename, a reorder and a pin each send only what they
   * edit.
   */
  range?: ReportWindow | null
  /** §C4's board filters. `undefined` means *leave them alone*; `[]` clears them. */
  filters?: FilterSpec[]
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

    /* A description that is blank after trimming is `null`, not `''` — so a
       cleared field and an unwritten one are one state, and the list has one
       test to make rather than two. No length rule: §4.2 sets one for the NAME
       and none for this, and inventing a cap here would be a design decision. */
    const trimmedDescription = input.description?.trim() ?? ''
    const description = trimmedDescription.length === 0 ? null : trimmedDescription

    const tiles = [...input.tiles]
      .sort((a, b) => a.order - b.order)
      .map((t, i) => ({ ...t, order: i + 1 }))

    if (input.id) {
      const existing = dashboards.find((d) => d.id === input.id)
      if (!existing) throw notFound('dashboard', input.id)
      const updated: Dashboard = {
        ...existing,
        name,
        description,
        tiles,
        /* `undefined` is *not part of this write*, which is why a rename does
           not have to know a board range exists. See `SaveDashboardInput`. */
        range: input.range === undefined ? existing.range : input.range,
        filters: input.filters === undefined ? existing.filters : [...input.filters],
        updatedAt: EYVAR_NOW,
      }
      dashboards = dashboards.map((d) => (d.id === updated.id ? updated : d))
      return { status: 'saved' as const, dashboard: { ...updated } }
    }

    const created: Dashboard = {
      id: `DSH-${dashboards.length + 1}${dashboards.length}`,
      name,
      description,
      ownerId: currentMockUserId(),
      tiles,
      /* A new board imposes nothing. Every tile answers with its own window
         until somebody decides otherwise, which is the honest starting state
         and the one the control names in those words. */
      range: input.range ?? null,
      filters: input.filters ? [...input.filters] : [],
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
 * Move a tile to a **1-based position**, keyboard-operable by construction.
 *
 * This is the general form and `moveTile` is one line of it. It exists because
 * ±1 is five round-trips — and five saves — to move the sixth tile to the top,
 * and §11.2 rejects a drag grid on keyboard-operability grounds rather than on
 * directness grounds. A `Select` of `1..n` is directness with the keyboard
 * story free: the control is a form field, not a gesture.
 *
 * **A move is a removal and a re-insertion, not a swap.** Swapping is right for
 * ±1 and wrong for everything else — moving tile 6 to position 1 by swapping
 * would send tile 1 to the bottom, which is not what an operator who dragged it
 * would have got. Re-inserting keeps every other tile's relative order.
 *
 * Out-of-range positions return the list unchanged rather than throwing: a
 * `Move up` on the first tile is a no-op, not an error.
 */
export function moveTileTo(
  tiles: readonly DashboardTile[],
  tileId: string,
  position: number,
): DashboardTile[] {
  const ordered = [...tiles].sort((a, b) => a.order - b.order)
  const index = ordered.findIndex((t) => t.tileId === tileId)
  const target = position - 1
  if (index === -1 || target < 0 || target >= ordered.length) return ordered
  const moved = ordered[index]
  if (!moved) return ordered
  const rest = ordered.filter((_, i) => i !== index)
  const next = [...rest.slice(0, target), moved, ...rest.slice(target)]
  /* Renormalised here as well as in `saveDashboard`, so the optimistic list the
     screen renders carries the same integers the server will hand back. */
  return next.map((t, i) => ({ ...t, order: i + 1 }))
}

/**
 * Move a tile one place, keyboard-operable by construction (AC-871).
 *
 * A pure function over the tile list rather than a client call, so the screen
 * can reorder optimistically and save once. `Move up` / `Move down` stay: they
 * are the fast path for ±1 and AC-871 names them.
 */
export function moveTile(tiles: readonly DashboardTile[], tileId: string, direction: -1 | 1): DashboardTile[] {
  const ordered = [...tiles].sort((a, b) => a.order - b.order)
  const index = ordered.findIndex((t) => t.tileId === tileId)
  if (index === -1) return ordered
  return moveTileTo(ordered, tileId, index + 1 + direction)
}

/* ─────────────── §C4 — the board scope, resolved per tile ──────────────── */

/** What the board imposes. The two fields `Dashboard` persists, and nothing else. */
export interface BoardScope {
  range: ReportWindow | null
  filters: readonly FilterSpec[]
}

/** The board scope that imposes nothing — every tile answers with its own window. */
export const OPEN_BOARD_SCOPE: BoardScope = { range: null, filters: [] }

/**
 * One tile's question, after the board has had its say.
 *
 * **The refusals are returned, not swallowed.** A tile that quietly ignored the
 * filter an operator can read two inches above it is the worst outcome
 * available here: the numbers are right for a question nobody asked and nothing
 * on screen says which question that was.
 */
export interface ScopedTileQuery {
  /** What to run. Never illegal — every override that would make it so was backed out. */
  query: ReportQuery
  /** True when the board range was refused and the report's own window stands. */
  rangeRefused: boolean
  /** Board filter fields this report cannot take, in board order. */
  refusedFilterFields: string[]
  /** Board filter fields that really did narrow this tile. */
  appliedFilterFields: string[]
}

/**
 * **Apply a dashboard's range and filters to one tile's saved query.**
 *
 * Pure, and deliberately here rather than in the tile: it is the definition of
 * what a board-level control *means*, it is the thing a test can pin without
 * rendering anything, and a component that computed it privately would be a
 * second answer the moment a second surface needed one.
 *
 * ## Three rules, in this order
 *
 * 1. **A filter applies only where the report can legally take it.**
 *    `QueryPlan.legalFilterFields` is the intersection of every measure's
 *    `filterableFields`, so a board filter on `trip.kind` is meaningless to a
 *    report counting subscriptions and **is not sent**. Sending it would come
 *    back `no-shared-filter-field` and turn a healthy tile into §8.3 state 12,
 *    which is a lie about the report: nothing is wrong with it.
 * 2. **A board filter replaces the report's own filter on the same field**,
 *    rather than joining it. Two `eq` filters on one field is the empty set,
 *    and an operator who typed `Riyadh` on the board did not ask for
 *    *Riyadh AND Jeddah*.
 * 3. **The range is applied only if it introduces no NEW violation.** A cohort
 *    over `last-365d` whose horizon reaches `M3` does not fit in `last-7d`, and
 *    the honest answer is the report's own window plus a sentence — not four
 *    columns quietly becoming one. Compared against the report's own plan
 *    rather than against zero, so a report that is *already* invalid is not
 *    blamed on the board.
 */
export function applyBoardScope(
  query: ReportQuery,
  scope: BoardScope,
  catalogue: { measures: readonly Measure[]; dimensions: readonly Dimension[] },
  today: string,
): ScopedTileQuery {
  const own = planReportQuery(query, catalogue, today)

  const applied: FilterSpec[] = []
  const refusedFilterFields: string[] = []
  for (const filter of scope.filters) {
    if (own.legalFilterFields.includes(filter.field)) applied.push(filter)
    else refusedFilterFields.push(filter.field)
  }

  const filters =
    applied.length === 0
      ? query.filters
      : [
          ...query.filters.filter(
            (existing) => !applied.some((board) => board.field === existing.field),
          ),
          ...applied,
        ]

  let window = query.window
  let rangeRefused = false
  if (scope.range !== null) {
    const candidate: ReportQuery = { ...query, filters, window: scope.range }
    const introduced = planReportQuery(candidate, catalogue, today).violations.filter(
      (violation) =>
        !own.violations.some(
          (existing) => existing.code === violation.code && existing.field === violation.field,
        ),
    )
    if (introduced.length > 0) rangeRefused = true
    else window = scope.range
  }

  return {
    query: { ...query, filters, window },
    rangeRefused,
    refusedFilterFields,
    appliedFilterFields: applied.map((filter) => filter.field),
  }
}

/**
 * Every field some measure in the catalogue can be filtered by — the board
 * filter control's vocabulary.
 *
 * **Derived from the catalogue, never from a hand-kept list.** A board does not
 * resolve its tiles (that is the whole of AC-872), so it cannot know which
 * fields *this* board's reports accept without nine extra reads. What it can
 * know honestly is which fields exist at all; `applyBoardScope` then decides
 * per tile, and a tile that cannot take one says so. Offering the union and
 * refusing per tile is truthful in both directions. Filtering the list down to
 * fields no dimension names would leave a control with no label to render.
 */
export function boardFilterFields(measures: readonly Measure[], dimensions: readonly Dimension[]): string[] {
  const named = new Set(dimensions.map((dimension) => dimension.key))
  const fields = new Set<string>()
  for (const measure of measures) {
    for (const field of measure.filterableFields) if (named.has(field)) fields.add(field)
  }
  return [...fields].sort()
}

export function resetDashboards(): void {
  /* Nothing seeded yet: the fixture chunk has not landed, so there is no
     state to reset and the rows this would read are still undefined. The
     binder in this module seeds fresh state when it does land. */
  if (!fixturesLoaded()) return
  dashboards = dashboardFixtures.map((d) => ({ ...d, tiles: d.tiles.map((t) => ({ ...t })) }))
}
