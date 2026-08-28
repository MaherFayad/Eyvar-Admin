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
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { METRIC_BOARD_SUB_TABS, getRouteTable } from '@/data/clients'
import type { DetailRoute, SubTabRoute } from '@/data/types'
import { AppLayout } from '@/shell/AppLayout'
import { useShell } from '@/shell/ShellContext'
import { forbiddenReason } from '@/shell/permissions'
import { DEFAULT_IDLE_TIMEOUT_MINUTES, type SessionExpiryReason } from '@/shell/session'
import type { AuthCondition } from '@/components/auth/authContract'
import { SubTabScreen } from '@/screens/SubTabScreen'
import { ApplicantDetailScreen, PeopleScreen } from '@/screens/operations/people'
import { SubscriptionsScreen } from '@/screens/operations/subscriptions'
import { TripsScreen } from '@/screens/operations/trips'
import { CorporateDetailScreen, CorporateScreen } from '@/screens/operations/corporate'
import { DispatchScreen } from '@/screens/operations/dispatch'
/* Wave 2 — the five §8.4 work queues. Five sub-tabs, two workspaces, one
   shared contract (`specs/02-work-queues.md` §4, `src/screens/queues/`). */
import { RequestsScreen } from '@/screens/operations/requests'
import { AssuranceScreen } from '@/screens/operations/assurance'
import { MyWorkScreen } from '@/screens/operations/my-work'
import { TicketDetailScreen, TicketsScreen } from '@/screens/support/tickets'
import { DisputesScreen } from '@/screens/support/disputes'
import { SafetyScreen } from '@/screens/support/safety'
import { FairnessScreen } from '@/screens/support/fairness'
import { ContactCentreScreen } from '@/screens/support/contacts'
import { AdminWorkspaceScreen } from '@/screens/admin/workspace'
import { AdminTeamScreen } from '@/screens/admin/team'
import { AdminPolicyScreen } from '@/screens/admin/policy'
import { AdminCommunicationsScreen } from '@/screens/admin/communications'
import { AdminDataScreen } from '@/screens/admin/data'
import { AdminActivityScreen } from '@/screens/admin/activity'
/* Wave 4 — ONE screen for all eight §3.7 metric-tile sub-tabs. */
import { MetricBoardScreen } from '@/screens/metrics'
/* Wave 3 — the seven Financials sub-tabs and the one full-bleed editor. */
import {
  CashScreen,
  LedgerControlsScreen,
  OverviewScreen as FinancialsOverviewScreen,
  PayoutsScreen,
  PlanEditorScreen as FinancialsPlanEditorScreen,
  PricingScreen,
  RevenueScreen,
  WalletsScreen,
} from '@/screens/financials'
/* R4-6b — Market & Zones is a P1 table with a P5 strip above it, and the strip
   filters the table. It is in `METRIC_BOARD_SUB_TABS` because the board half is
   real; the ruling makes the TABLE primary, so this screen renders both and the
   board screen does not mount here. */
import { ZonesScreen } from '@/screens/management/zones'
/* Wave 6 — the Report Builder (`specs/06-report-builder.md`, D13).
   **This mount point is deliberately unreachable today.** See `screenFor`. */
import {
  REPORTS_SUB_TAB_ID,
  ReportsScreen,
  SavedReportScreen,
} from '@/screens/reports'
import { ForbiddenScreen, NotFoundScreen } from '@/screens/RouteStates'
import { EntityPageScreen } from '@/screens/EntityPageScreen'
/* Wave 5 — the six auth screens. **Siblings of the layout, never children**:
   AC-500 requires that no rail, no sub-tab column and no top bar is IN THE
   DOM, and a `hidden` class would leave all three in it. Same structural
   argument as the plan editor's `bleed` route (AC-13). */
import {
  ActivateScreen,
  EnrollScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
  SignInScreen,
  VerifyScreen,
} from '@/screens/auth'

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
        <Route key={detail.path} path={detail.path} element={<FinancialsPlanEditorScreen />} />
      ))}

      {/* **AC-658** — the six auth screens require no permission and are
          reachable while unauthenticated. They are also the only routes in the
          product that are, which is why they sit outside `RequireSession`. */}
      <Route path="/signin" element={<SignInScreen />} />
      <Route path="/signin/verify" element={<VerifyScreen />} />
      <Route path="/signin/enroll" element={<EnrollScreen />} />
      <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      <Route path="/activate" element={<ActivateScreen />} />

      <Route element={<RequireSession />}>
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
                  <RouteGuard row={row}>{detailScreenFor(row, detail)}</RouteGuard>
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
      </Route>
    </Routes>
  )
}

/**
 * **AC-501** — *"an operator who is not authenticated and opens any in-app
 * route is sent to `/signin`, and after a successful sign-in lands on **the
 * route they originally asked for**, not on `session.landingRoute`."*
 *
 * The route they asked for travels in `location.state.from` — never in a query
 * parameter, and it is **never rendered on the sign-in card**. Design §3.1:
 * *"the redirect target is an attacker-controllable URL parameter, and
 * rendering its title on an unauthenticated page is a text-injection surface
 * bought for no operator benefit."*
 *
 * ## Why the default is `authenticated`
 *
 * `GET /session` succeeds in mock mode, which models *"the server read the auth
 * cookie and it was valid"*. So an operator opening the console has a session,
 * exactly as they would against a real API, and this guard is a **pass-through
 * until something ends the session** — a sign-out, an idle expiry, or an
 * absolute expiry.
 *
 * That is not a weaker guard than the alternative; it is the honest one. A
 * default of `signed-out` would assert that the mock server rejected a cookie
 * it did not reject, and it would make every existing shell test navigate a
 * sign-in form that has nothing to do with what it is testing. **AC-502**,
 * **AC-575** and **AC-658** are all reachable and checkable against this shape;
 * only the cold-boot-unauthenticated case is not, and it has no fixture behind
 * it either way.
 *
 * `replace`, because the route the operator could not reach is not somewhere
 * browser Back should return them to — it would bounce them straight here
 * again.
 */
function RequireSession() {
  const shell = useShell()
  const location = useLocation()
  if (shell.session_lifecycle.status === 'authenticated') return <Outlet />
  return (
    <Navigate
      to="/signin"
      replace
      state={{
        from: location.pathname + location.search,
        /* §3.2 — the card names WHY the session ended: `Your session ended` /
           `You were inactive for {duration}` for idle, and `Your session
           reached its 12-hour limit` for absolute (**AC-560**). Nothing at all
           for a deliberate sign-out, because nothing went wrong. */
        condition: conditionForEndedSession(shell.session_lifecycle.endedReason),
      }}
    />
  )
}

/**
 * `SessionExpiryReason | null` → the `/signin` card's arrival banner.
 *
 * **The idle reason carries the configured timeout, not a measured elapsed
 * time.** `You were inactive for {minutes} minutes.` is a statement about the
 * policy that ended the session, and the policy is the number the operator can
 * act on — the exact number of minutes they were away is both unknowable from
 * here and useless to them.
 */
function conditionForEndedSession(reason: SessionExpiryReason | null): AuthCondition | undefined {
  if (reason === 'absolute') return { kind: 'session-ended-absolute' }
  if (reason === 'idle') {
    return { kind: 'session-ended-idle', minutes: DEFAULT_IDLE_TIMEOUT_MINUTES }
  }
  return undefined
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
  if (row.subTabId === REPORTS_SUB_TAB_ID) return <ReportsScreen row={row} />

  /* Operations */
  if (row.subTabId === 'operations-people') return <PeopleScreen row={row} />
  if (row.subTabId === 'operations-subscriptions') return <SubscriptionsScreen row={row} />
  if (row.subTabId === 'operations-trips') return <TripsScreen row={row} />
  if (row.subTabId === 'operations-corporate') return <CorporateScreen row={row} />
  if (row.subTabId === 'operations-dispatch') return <DispatchScreen row={row} />
  if (row.subTabId === 'operations-requests') return <RequestsScreen row={row} />
  if (row.subTabId === 'operations-assurance') return <AssuranceScreen row={row} />
  if (row.subTabId === 'operations-my-work') return <MyWorkScreen row={row} />

  /* Customer Support */
  if (row.subTabId === 'support-tickets') return <TicketsScreen row={row} />
  if (row.subTabId === 'support-disputes') return <DisputesScreen row={row} />
  if (row.subTabId === 'support-safety') return <SafetyScreen row={row} />
  if (row.subTabId === 'support-fairness') return <FairnessScreen row={row} />
  if (row.subTabId === 'support-contact-centre') return <ContactCentreScreen row={row} />

  /* Financials */
  if (row.subTabId === 'financials-overview') return <FinancialsOverviewScreen row={row} />
  if (row.subTabId === 'financials-revenue') return <RevenueScreen row={row} />
  if (row.subTabId === 'financials-payouts') return <PayoutsScreen row={row} />
  if (row.subTabId === 'financials-cash') return <CashScreen row={row} />
  if (row.subTabId === 'financials-rider-wallets') return <WalletsScreen row={row} />
  if (row.subTabId === 'financials-pricing') return <PricingScreen row={row} />
  if (row.subTabId === 'financials-ledger') return <LedgerControlsScreen row={row} />

  /* Admin / Settings */
  if (row.subTabId === 'admin-workspace') return <AdminWorkspaceScreen row={row} />
  if (row.subTabId === 'admin-team') return <AdminTeamScreen row={row} />
  if (row.subTabId === 'admin-policy') return <AdminPolicyScreen row={row} />
  if (row.subTabId === 'admin-communications') return <AdminCommunicationsScreen row={row} />
  if (row.subTabId === 'admin-data') return <AdminDataScreen row={row} />
  if (row.subTabId === 'admin-activity') return <AdminActivityScreen row={row} />

  /* Management */
  if (row.subTabId === 'management-zones') return <ZonesScreen row={row} />

  if (row.subTabId !== 'support-fairness' && METRIC_BOARD_SUB_TABS.includes(row.subTabId)) {
    return <MetricBoardScreen row={row} />
  }

  return <SubTabScreen row={row} />
}

/**
 * A level-3 detail's screen. Same registry rule as `screenFor`, one level down.
 */
function detailScreenFor(row: SubTabRoute, _detail: DetailRoute) {
  if (row.subTabId === REPORTS_SUB_TAB_ID) {
    return <SavedReportScreen row={row} />
  }
  if (row.subTabId === 'operations-corporate') {
    return <CorporateDetailScreen />
  }
  if (row.subTabId === 'operations-people') {
    return <ApplicantDetailScreen />
  }
  if (row.subTabId === 'support-tickets') {
    return <TicketDetailScreen />
  }
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
