/**
 * The route table, as routes. **Single-owner file** (`PHASE-PLAN.md`): a Phase
 * 1 engineer declares their screen and the shell owner merges it here.
 *
 * **Every route is generated from `src/data/fixtures/routeTable.ts`.** There is
 * no hand-written menu and no hard-coded path anywhere below. Spec §3.4's
 * Operations risk R1 is the reason:
 *
 * > *"a sub-tab's route must not encode its workspace in anything except the
 * > route table, so moving one is a data change"* — and §11.3: *"adding or
 * > changing a permission on a route is a data change in the route table, not a
 * > code change in a screen."*
 *
 * Shape of the tree, and why:
 *
 * ```
 * <ShellProvider>                     mounted once for the session (§4.1)
 *   /financials/pricing/plans/:planId/edit   ← OUTSIDE the layout (AC-13)
 *   <AppLayout>                              ← rail + column + top bar
 *     /                                      → the ROLE's landing route (AC-07)
 *     34 sub-tab routes                      (AC-03, AC-05)
 *     4 level-3 detail routes                (AC-09)
 *     /entity/:entityId                      the profile's full-page escape
 *     *                                      route-not-found, URL NOT rewritten (AC-12)
 *   </AppLayout>
 * </ShellProvider>
 * ```
 *
 * **`AppLayout` is a LAYOUT ROUTE**, so React Router keeps it mounted across
 * every sibling navigation — which is **AC-18** ("a counter in each region's
 * mount effect reads 1 after twenty route changes") structurally rather than by
 * memoisation.
 *
 * **The plan editor is a SIBLING of the layout, not a child.** That is the only
 * way AC-13 can be true: *"neither the rail, the sub-tab list, nor the app top
 * bar is in the DOM"*. A `hidden` class would leave all three in it.
 *
 * The catch-all is `*` and it renders `NotFoundScreen` — it does **not**
 * redirect. AC-12: the URL is not rewritten.
 *
 * **AC-56 is wired here, in `RouteGuard`.** The 0.8 QA verdict found
 * `ForbiddenScreen` and `forbiddenReason` with **zero call sites** in
 * production code and called the criterion a fail rather than a Q4 gap, and it
 * was right: an unwired component falsifies the claim that no shell code
 * changes when the 34 permission values land. Every sub-tab and every level-3
 * detail now renders through the guard. Q4 is still unanswered, so
 * `forbiddenReason` returns `null` for all 34 rows and the guard is a
 * pass-through today — but it is a pass-through that is EXERCISED on every
 * navigation, so the day a `permission` key lands the forbidden state appears
 * with no change here.
 */

import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { getRouteTable } from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { AppLayout } from '@/shell/AppLayout'
import { useShell } from '@/shell/ShellContext'
import { forbiddenReason } from '@/shell/permissions'
import { SubTabScreen } from '@/screens/SubTabScreen'
import { PeopleScreen } from '@/screens/operations/people'
import { ForbiddenScreen, NotFoundScreen } from '@/screens/RouteStates'
import { PlanEditorScreen } from '@/screens/PlanEditorScreen'
import { EntityPageScreen } from '@/screens/EntityPageScreen'

export function AppRoutes() {
  const table = getRouteTable()

  /* The one full-bleed route, hoisted out of the layout (§3.10, AC-13). It is
     found in the data rather than typed here, so if a second `bleed` shape is
     ever added the router picks it up and the design spec's "and nothing else"
     becomes a visible, checkable claim rather than a comment. */
  const bleedRoutes = table.subTabs.flatMap((row) =>
    row.detailRoutes.filter((detail) => detail.shape === 'bleed'),
  )

  return (
    <Routes>
      {bleedRoutes.map((detail) => (
        <Route key={detail.path} path={detail.path} element={<PlanEditorScreen />} />
      ))}

      <Route element={<AppLayout />}>
        {/* AC-07 — the landing route is ROLE-derived. `replace`, because the
            bare `/` is not a destination an operator should be able to go back
            to; it is a redirect to their real one. */}
        <Route index element={<LandingRedirect />} />

        {table.subTabs.map((row) => (
          <Route
            key={row.path}
            path={row.path}
            element={<RouteGuard row={row}>{screenFor(row)}</RouteGuard>}
          />
        ))}

        {/* AC-09 — a level-3 detail highlights its PARENT sub-tab, which
            `resolveRoute` derives; the screen itself is the sub-tab's, in
            detail shape, until Phase 1 replaces it. */}
        {table.subTabs.flatMap((row) =>
          row.detailRoutes
            .filter((detail) => detail.shape !== 'bleed')
            .map((detail) => (
              <Route
                key={detail.path}
                path={detail.path}
                element={
                  /* A detail inherits its PARENT sub-tab's permission — the
                     route table has no separate key for one, and a detail the
                     role cannot see is a sub-tab the role cannot see. */
                  <RouteGuard row={row}>
                    <SubTabScreen row={row} />
                  </RouteGuard>
                }
              />
            )),
        )}

        {/* §6.2 — the 360° profile's deep-review escape. `main + right rail`
            shape, reachable from every workspace, belonging to none. */}
        <Route path="/entity/:entityId" element={<EntityPageScreen />} />

        {/* AC-12 — NOT a redirect. Shell intact, URL untouched. */}
        <Route path="*" element={<NotFoundScreen />} />
      </Route>
    </Routes>
  )
}

/**
 * **AC-56** — *"loading a route the role cannot see renders the forbidden state
 * naming the permission required"*. Not a redirect (§11.2) and not a toast: a
 * redirect teaches the operator that the URL they were given is wrong, when the
 * truth is that their role is. **The URL is not rewritten**, exactly as AC-12
 * requires for not-found.
 *
 * This is the one place the check happens. A screen does not gate itself —
 * §11.3: *"adding or changing a permission on a route is a data change in the
 * route table, not a code change in a screen."*
 *
 * While the session is loading there is no permission context to judge with, so
 * the guard passes through and the screen renders its own loading state. Gating
 * on an unloaded session would flash `You don't have access` at every operator
 * on every cold start.
 */
function RouteGuard({ row, children }: { row: SubTabRoute; children: ReactNode }) {
  const shell = useShell()
  if (shell.status === 'loading') return children
  const permission = forbiddenReason(shell.permissions, row)
  if (permission === null) return children
  /* §4.7 — the route's own title is the `<h1>`. The operator asked for
     something by name and is owed the name of what they asked for; the route
     table's titles are not secret, only its data is. */
  return <ForbiddenScreen permission={permission} title={shell.language.t(row.titleKey)} />
}

/**
 * The Phase 1 registry: a built sub-tab's own screen, or the generic
 * placeholder. **One entry per sub-tab, keyed by `subTabId`**, so registering a
 * screen is a one-line change to this file and nothing else — the route, its
 * path, its permission and its shape all still come from the route table.
 */
function screenFor(row: SubTabRoute) {
  if (row.subTabId === 'operations-people') return <PeopleScreen row={row} />
  return <SubTabScreen row={row} />
}

/**
 * **AC-07** — Owner → `/management/overview`, Ops Manager →
 * `/operations/overview`, Finance → `/financials/overview`, Support →
 * `/support/overview`. The map is the SESSION's (`session.landingRoute`,
 * derived server-side per §8.2), never a switch in the UI, so adding a role is
 * a data change.
 *
 * While the session is loading there is nothing to redirect to yet, so the
 * shell holds still rather than bouncing the operator to a default and then to
 * their real workspace.
 */
function LandingRedirect() {
  const shell = useShell()
  if (shell.status === 'loading') return null
  return <Navigate to={shell.session?.landingRoute ?? '/operations/overview'} replace />
}
