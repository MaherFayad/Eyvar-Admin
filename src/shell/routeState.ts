/**
 * Route → shell state. Foundation spec §8.1, design spec §2.3 / §3.1.
 *
 * **This file is the whole mechanical point of the rebuild.** Both nav columns,
 * the back arrow, the title pair, the page shape and the open shell layer are
 * DERIVED from the URL. No handler anywhere sets an active state — that is
 * **AC-08**, and it is what retires the legacy `go(id, el)` with its 80 call
 * sites passing `null` for `el` (**D-L2**), and `navStack.length` (`:7005`,
 * **D-L5**) as the back arrow's condition.
 *
 * The route table is DATA (`@/data/clients` → `getRouteTable`). Moving a
 * sub-tab between workspaces, or adding one, is a fixture edit. Nothing below
 * hard-codes a path, a workspace id or a sub-tab id.
 */

import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { getRouteTable } from '@/data/clients'
import type {
  DetailKind,
  DetailRoute,
  PageShape,
  ShellLayerId,
  SubTabRoute,
  Workspace,
  WorkspaceId,
} from '@/data/types'

/** §8.1, as one value. Every field is derived; none is settable. */
export interface RouteState {
  path: string
  workspace: Workspace | null
  workspaceId: WorkspaceId | null
  subTab: SubTabRoute | null
  subTabId: string | null
  /** The level-3 route that matched, when one did. */
  detail: DetailRoute | null
  detailKind: DetailKind | null
  params: Readonly<Record<string, string>>
  /** `?view=`. **A view is a control, not a level** — it changes neither column's highlight (AC-10). */
  view: string | null
  /** At most one, ever (**AC-22**). */
  overlay: ShellLayerId | null
  /** The value of the overlay param: an entity id, `all`, or `me`. */
  overlayValue: string | null
  shape: PageShape
  /** `detail` or `bleed` only. Never a stack depth (**AC-13**, D-L5). */
  showsBackArrow: boolean
  /** `bleed` unmounts the shell entirely (**AC-13**). */
  isBleed: boolean
  /** True when the path matched nothing in the route table — `route-not-found` (**AC-12**). */
  isNotFound: boolean
}

/**
 * `?entity=` · `?notifications=` · `?account=` · `?onboarding=` → the layer
 * they open (§8.1). **Four layers now, not three** (R4-3 §3.1).
 *
 * **`reauth` is deliberately absent and must stay absent.** R4-3 makes
 * re-authentication a **modal**, with no route and no URL param: *"a re-auth
 * surface with an address is one an operator can navigate past."* The spec's
 * own §4.1 row 7 still says "layer" and §19.1 row 5 records that it was
 * corrected. Adding a fifth entry here would give the freeze a back door.
 *
 * `?onboarding=1` — the value is the literal `1`, not an id. It is a param
 * rather than a route so that browser Back **closes the layer and stays put**,
 * and so the layer does not consume a navigation level (§10.1).
 */
const OVERLAY_PARAMS: ReadonlyArray<readonly [param: string, layer: ShellLayerId]> = [
  ['entity', 'entity'],
  ['notifications', 'notifications'],
  ['account', 'account'],
  ['onboarding', 'onboarding'],
]

export function normalisePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

/**
 * Does `path` match a route-table pattern such as
 * `/operations/people/applications/:applicantId`? Returns the captured params,
 * or `null` for no match. Segment count must agree — a prefix is not a match.
 */
export function matchPattern(
  pattern: string,
  path: string,
): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean)
  const a = path.split('/').filter(Boolean)
  if (p.length !== a.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i += 1) {
    const seg = p[i] as string
    const actual = a[i] as string
    if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(actual)
    else if (seg !== actual) return null
  }
  return params
}

/** The full-page escape for the 360° profile (§3.10, design spec §6.2). */
const ENTITY_FULL_PAGE = '/entity/:entityId'

/**
 * Resolve a location. Pure, so a test can call it without a router — QA checks
 * AC-08 through AC-12 against this function directly, not through the DOM.
 */
export function resolveRoute(pathname: string, search: string): RouteState {
  const table = getRouteTable()
  const path = normalisePath(pathname)
  const query = new URLSearchParams(search)

  let overlay: ShellLayerId | null = null
  let overlayValue: string | null = null
  for (const [param, layer] of OVERLAY_PARAMS) {
    const value = query.get(param)
    /* AC-22 — first one wins and the rest are ignored. The URL SETTER is what
       guarantees at most one is ever present; this is the reader's half, so a
       hand-typed URL carrying two opens one layer rather than two. */
    if (value !== null && overlay === null) {
      overlay = layer
      overlayValue = value
    }
  }

  const view = query.get('view')

  const base: Omit<RouteState, 'shape' | 'showsBackArrow' | 'isBleed' | 'isNotFound'> = {
    path,
    workspace: null,
    workspaceId: null,
    subTab: null,
    subTabId: null,
    detail: null,
    detailKind: null,
    params: {},
    view,
    overlay,
    overlayValue,
  }

  /* The profile's full-page escape belongs to no workspace: it is the layer's
     deep-review shape, reachable from every one of them (design spec §6.2). */
  const entityParams = matchPattern(ENTITY_FULL_PAGE, path)
  if (entityParams) {
    return {
      ...base,
      params: entityParams,
      shape: 'detail',
      /**
       * **`false`, and it is the only detail route that says so.**
       *
       * The top bar's arrow is an unlabelled icon calling `navigate(-1)`
       * (`TopBar.tsx`), which is fine on a route reached by drilling down and
       * wrong here. `/entity/:id` is reached from global search, from any table,
       * from a notification and from the profile layer's `Open full profile` —
       * and on a pasted link or a fresh tab there is no entry to go back to, so
       * the arrow walks the operator out of the application.
       *
       * The page renders its own return control instead: an `<a href>` with a
       * resolved destination and a label naming the screen it returns to. That
       * one always has somewhere to go, which is what lets it satisfy §11.2
       * without a disabled state.
       *
       * So this is not "the page has no back affordance" — it is "the page owns
       * it". Leaving both drew two back controls 40px apart, the unlabelled one
       * being the one that could dead-end.
       */
      showsBackArrow: false,
      isBleed: false,
      isNotFound: false,
    }
  }

  /* 1. An exact sub-tab route. */
  const exact = table.subTabs.find((row) => row.path === path)
  if (exact) {
    return {
      ...base,
      workspace: workspaceOf(exact.workspaceId),
      workspaceId: exact.workspaceId,
      subTab: exact,
      subTabId: exact.subTabId,
      shape: exact.shape,
      showsBackArrow: false,
      isBleed: exact.shape === 'bleed',
      isNotFound: false,
    }
  }

  /* 2. A level-3 detail route. §3.8 rule 2: it highlights its PARENT sub-tab
        (**AC-09**), so the workspace and the row come from the parent row, not
        from the path's own segments. */
  for (const row of table.subTabs) {
    for (const detail of row.detailRoutes) {
      const params = matchPattern(detail.path, path)
      if (!params) continue
      return {
        ...base,
        workspace: workspaceOf(row.workspaceId),
        workspaceId: row.workspaceId,
        subTab: row,
        subTabId: row.subTabId,
        detail,
        detailKind: detail.kind,
        params,
        shape: detail.shape,
        showsBackArrow: detail.shape === 'detail' || detail.shape === 'bleed',
        isBleed: detail.shape === 'bleed',
        isNotFound: false,
      }
    }
  }

  /* 3. Nothing matched. **AC-12**: the shell stays intact, the URL is NOT
        rewritten, and the LAST VALID WORKSPACE stays selected — so a bare
        `/operations/nonsense` still highlights Operations. A path whose first
        segment names no workspace highlights nothing, which is correct: there
        is no last valid workspace to keep. */
  const prefix = `/${path.split('/').filter(Boolean)[0] ?? ''}`
  const workspace = table.workspaces.find((w) => w.routePrefix === prefix) ?? null

  return {
    ...base,
    workspace,
    workspaceId: workspace?.id ?? null,
    shape: 'single',
    showsBackArrow: false,
    isBleed: false,
    isNotFound: true,
  }

  function workspaceOf(id: WorkspaceId): Workspace | null {
    return table.workspaces.find((w) => w.id === id) ?? null
  }
}

/** The hook the shell uses. One `useLocation`, memoised on the two strings it reads. */
export function useRouteState(): RouteState {
  const location = useLocation()
  return useMemo(
    () => resolveRoute(location.pathname, location.search),
    [location.pathname, location.search],
  )
}

/* ─────────────────── writing the URL, the only two ways ─────────────────── */

/**
 * Set (or clear) the open shell layer on the CURRENT route.
 *
 * **AC-22** is enforced here and only here: the other two params are always
 * deleted, so opening a second layer closes the first, and at most one of
 * `?entity`, `?notifications`, `?account` can be in the URL. Every other
 * search param — `?view=` in particular — survives untouched, because
 * **AC-10** says a layer changes neither the view nor either nav column.
 */
export function withOverlay(
  search: string,
  layer: ShellLayerId | null,
  value: string,
): string {
  const query = new URLSearchParams(search)
  for (const [param] of OVERLAY_PARAMS) query.delete(param)
  if (layer !== null) {
    const entry = OVERLAY_PARAMS.find(([, id]) => id === layer)
    if (entry) query.set(entry[0], value)
  }
  const next = query.toString()
  return next === '' ? '' : `?${next}`
}

/** `?view=`. A view is a control: it never becomes a path segment (§3.8 rule 3). */
export function withView(search: string, viewId: string | null): string {
  const query = new URLSearchParams(search)
  if (viewId === null) query.delete('view')
  else query.set('view', viewId)
  const next = query.toString()
  return next === '' ? '' : `?${next}`
}
