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

import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { METRIC_BOARD_SUB_TABS, getRouteTable } from '@/data/clients'
import type { DetailRoute, SubTabRoute } from '@/data/types'
import { LoadingSkeleton, type SkeletonPattern } from '@/components/LoadingSkeleton'
import { REPORTS_SUB_TAB_ID } from '@/screens/reports/ids'
import { AppLayout } from '@/shell/AppLayout'
import { useShell } from '@/shell/ShellContext'
import { forbiddenReason } from '@/shell/permissions'
import { DEFAULT_IDLE_TIMEOUT_MINUTES, type SessionExpiryReason } from '@/shell/session'
import type { AuthCondition } from '@/components/auth/authContract'
/* -------------------- Route-level code splitting --------------------
   Every screen below is a SEPARATE CHUNK. Before this, `routes.tsx` had 36
   static screen imports and zero `React.lazy`, so the whole product shipped as
   one 2.71 MB chunk on first paint - an operator waited for the Report Builder
   in order to sign in.

   **Barrels are kept, deliberately.** `import('@/screens/financials')` chunks
   all seven financials screens together, which matches how an operator moves:
   they enter a workspace and stay in it. Splitting per screen would trade one
   wait for seven on the same journey.

   **`SubTabScreen` and `RouteStates` stay eager.** `SubTabScreen` is the
   fallback for every unmapped route and `NotFoundScreen` is the catch-all - a
   lazy fallback can fail to load, and a fallback that can fail is not one.

   `lazy` needs a default export and these are named, hence the `.then` shim.
   ------------------------------------------------------------------- */

import { SubTabScreen } from '@/screens/SubTabScreen'
import { ForbiddenScreen, NotFoundScreen } from '@/screens/RouteStates'

/* Operations */
const PeopleScreen = lazy(() =>
  import('@/screens/operations/people').then((m) => ({ default: m.PeopleScreen })),
)
const ApplicantDetailScreen = lazy(() =>
  import('@/screens/operations/people').then((m) => ({ default: m.ApplicantDetailScreen })),
)
const SubscriptionsScreen = lazy(() =>
  import('@/screens/operations/subscriptions').then((m) => ({ default: m.SubscriptionsScreen })),
)
const TripsScreen = lazy(() =>
  import('@/screens/operations/trips').then((m) => ({ default: m.TripsScreen })),
)
const CorporateScreen = lazy(() =>
  import('@/screens/operations/corporate').then((m) => ({ default: m.CorporateScreen })),
)
const CorporateDetailScreen = lazy(() =>
  import('@/screens/operations/corporate').then((m) => ({ default: m.CorporateDetailScreen })),
)
const DispatchScreen = lazy(() =>
  import('@/screens/operations/dispatch').then((m) => ({ default: m.DispatchScreen })),
)

/* Wave 2 - the five section 8.4 work queues. Five sub-tabs, two workspaces, one
   shared contract (`specs/02-work-queues.md` section 4, `src/screens/queues/`). */
const RequestsScreen = lazy(() =>
  import('@/screens/operations/requests').then((m) => ({ default: m.RequestsScreen })),
)
const AssuranceScreen = lazy(() =>
  import('@/screens/operations/assurance').then((m) => ({ default: m.AssuranceScreen })),
)
const MyWorkScreen = lazy(() =>
  import('@/screens/operations/my-work').then((m) => ({ default: m.MyWorkScreen })),
)

/* Customer Support */
const TicketsScreen = lazy(() =>
  import('@/screens/support/tickets').then((m) => ({ default: m.TicketsScreen })),
)
const TicketDetailScreen = lazy(() =>
  import('@/screens/support/tickets').then((m) => ({ default: m.TicketDetailScreen })),
)
const DisputesScreen = lazy(() =>
  import('@/screens/support/disputes').then((m) => ({ default: m.DisputesScreen })),
)
const DisputeDetailScreen = lazy(() =>
  import('@/screens/support/disputes').then((m) => ({ default: m.DisputeDetailScreen })),
)
const SafetyScreen = lazy(() =>
  import('@/screens/support/safety').then((m) => ({ default: m.SafetyScreen })),
)
const IncidentDetailScreen = lazy(() =>
  import('@/screens/support/safety').then((m) => ({ default: m.IncidentDetailScreen })),
)
const FairnessScreen = lazy(() =>
  import('@/screens/support/fairness').then((m) => ({ default: m.FairnessScreen })),
)
const CaseDetailScreen = lazy(() =>
  import('@/screens/support/fairness').then((m) => ({ default: m.CaseDetailScreen })),
)
const ContactCentreScreen = lazy(() =>
  import('@/screens/support/contacts').then((m) => ({ default: m.ContactCentreScreen })),
)

/* Admin / Settings */
const AdminWorkspaceScreen = lazy(() =>
  import('@/screens/admin/workspace').then((m) => ({ default: m.AdminWorkspaceScreen })),
)
const AdminTeamScreen = lazy(() =>
  import('@/screens/admin/team').then((m) => ({ default: m.AdminTeamScreen })),
)
const AdminPolicyScreen = lazy(() =>
  import('@/screens/admin/policy').then((m) => ({ default: m.AdminPolicyScreen })),
)
const AdminCommunicationsScreen = lazy(() =>
  import('@/screens/admin/communications').then((m) => ({ default: m.AdminCommunicationsScreen })),
)
const AdminDataScreen = lazy(() =>
  import('@/screens/admin/data').then((m) => ({ default: m.AdminDataScreen })),
)
const AdminActivityScreen = lazy(() =>
  import('@/screens/admin/activity').then((m) => ({ default: m.AdminActivityScreen })),
)

/* Wave 4 - ONE screen for all eight section 3.7 metric-tile sub-tabs. */
const MetricBoardScreen = lazy(() =>
  import('@/screens/metrics').then((m) => ({ default: m.MetricBoardScreen })),
)
const SupportDesk = lazy(() =>
  import('@/screens/support/desk/SupportDesk').then((m) => ({ default: m.SupportDesk })),
)

/* Wave 3 - the seven Financials sub-tabs and the one full-bleed editor. */
const FinancialsOverviewScreen = lazy(() =>
  import('@/screens/financials').then((m) => ({ default: m.OverviewScreen })),
)
const RevenueScreen = lazy(() =>
  import('@/screens/financials').then((m) => ({ default: m.RevenueScreen })),
)
const PayoutsScreen = lazy(() =>
  import('@/screens/financials').then((m) => ({ default: m.PayoutsScreen })),
)
const CashScreen = lazy(() =>
  import('@/screens/financials').then((m) => ({ default: m.CashScreen })),
)
const WalletsScreen = lazy(() =>
  import('@/screens/financials').then((m) => ({ default: m.WalletsScreen })),
)
const PricingScreen = lazy(() =>
  import('@/screens/financials').then((m) => ({ default: m.PricingScreen })),
)
const LedgerControlsScreen = lazy(() =>
  import('@/screens/financials').then((m) => ({ default: m.LedgerControlsScreen })),
)
const FinancialsPlanEditorScreen = lazy(() =>
  import('@/screens/financials').then((m) => ({ default: m.PlanEditorScreen })),
)

/* R4-6b - Market & Zones is a P1 table with a P5 strip above it, and the strip
   filters the table. It is in `METRIC_BOARD_SUB_TABS` because the board half is
   real; the ruling makes the TABLE primary, so this screen renders both and the
   board screen does not mount here. */
const ZonesScreen = lazy(() =>
  import('@/screens/management/zones').then((m) => ({ default: m.ZonesScreen })),
)

/* Wave 6 - the Report Builder (`specs/06-report-builder.md`, D13).
   `REPORTS_SUB_TAB_ID` is imported from `./ids`, NOT from the barrel: keying the
   router on a symbol declared inside `ReportsScreen` would pull the whole
   builder into the entry chunk and undo the split. */
const ReportsScreen = lazy(() =>
  import('@/screens/reports').then((m) => ({ default: m.ReportsScreen })),
)
const SavedReportScreen = lazy(() =>
  import('@/screens/reports').then((m) => ({ default: m.SavedReportScreen })),
)
const DashboardDetailScreen = lazy(() =>
  import('@/screens/reports').then((m) => ({ default: m.DashboardDetailScreen })),
)

const EntityPageScreen = lazy(() =>
  import('@/screens/EntityPageScreen').then((m) => ({ default: m.EntityPageScreen })),
)

/* Wave 5 - the six auth screens. **Siblings of the layout, never children**:
   AC-500 requires that no rail, no sub-tab column and no top bar is IN THE DOM,
   and a `hidden` class would leave all three in it. Same structural argument as
   the plan editor's `bleed` route (AC-13).

   Split too, and the win runs both ways: a signed-in operator never downloads
   them, and a signed-out one never downloads the console. */
const SignInScreen = lazy(() =>
  import('@/screens/auth').then((m) => ({ default: m.SignInScreen })),
)
const VerifyScreen = lazy(() =>
  import('@/screens/auth').then((m) => ({ default: m.VerifyScreen })),
)
const EnrollScreen = lazy(() =>
  import('@/screens/auth').then((m) => ({ default: m.EnrollScreen })),
)
const ForgotPasswordScreen = lazy(() =>
  import('@/screens/auth').then((m) => ({ default: m.ForgotPasswordScreen })),
)
const ResetPasswordScreen = lazy(() =>
  import('@/screens/auth').then((m) => ({ default: m.ResetPasswordScreen })),
)
const ActivateScreen = lazy(() =>
  import('@/screens/auth').then((m) => ({ default: m.ActivateScreen })),
)

/**
 * The Suspense boundary for a lazy screen chunk.
 *
 * **It sits BELOW `AppLayout`, never above it.** A boundary above the layout
 * blanks the rail, the sub-tab column and the top bar on the first visit to
 * every route - the operator watches the whole shell disappear in order to load
 * one screen. Below it, the shell stays painted and only the content waits.
 *
 * The fallback is the same skeleton family the screen's own loading state uses,
 * so the chunk fetch and the data fetch read as one continuous shape rather than
 * two different ones flashing in sequence. `LoadingSkeleton` has no generic
 * block by design (AC-35: "no centred spinner anywhere"), so the pattern is
 * named per route family: index screens P1, details P2, forms P3.
 *
 * A chunk that 404s after a deploy throws during render and is caught by the
 * `ErrorBoundary` inside `AppLayout`'s `<main>`, which offers `Try again`.
 */
function Chunk({ pattern, children }: { pattern: SkeletonPattern; children: ReactNode }) {
  return <Suspense fallback={<LoadingSkeleton pattern={pattern} />}>{children}</Suspense>
}

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
        <Route
          key={detail.path}
          path={detail.path}
          element={
            <Chunk pattern="P3">
              <FinancialsPlanEditorScreen />
            </Chunk>
          }
        />
      ))}

      {/* **AC-658** — the six auth screens require no permission and are
          reachable while unauthenticated. They are also the only routes in the
          product that are, which is why they sit outside `RequireSession`. */}
      <Route path="/signin" element={<Chunk pattern="P3"><SignInScreen /></Chunk>} />
      <Route path="/signin/verify" element={<Chunk pattern="P3"><VerifyScreen /></Chunk>} />
      <Route path="/signin/enroll" element={<Chunk pattern="P3"><EnrollScreen /></Chunk>} />
      <Route path="/forgot-password" element={<Chunk pattern="P3"><ForgotPasswordScreen /></Chunk>} />
      <Route path="/reset-password" element={<Chunk pattern="P3"><ResetPasswordScreen /></Chunk>} />
      <Route path="/activate" element={<Chunk pattern="P3"><ActivateScreen /></Chunk>} />

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
            element={
              <RouteGuard row={row}>
                <Chunk pattern="P1">{screenFor(row)}</Chunk>
              </RouteGuard>
            }
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
                    <Chunk pattern="P2">{detailScreenFor(row, detail)}</Chunk>
                  </RouteGuard>
                }
              />
            )),
        )}

        {/* §6.2 — the 360° profile's deep-review escape. `main + right rail`
            shape, reachable from every workspace, belonging to none. */}
        <Route
          path="/entity/:entityId"
          element={
            <Chunk pattern="P2">
              <EntityPageScreen />
            </Chunk>
          }
        />

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
  /* One screen, two sub-tabs. `TripsScreen` reads `row.subTabId` and scopes
     itself to a `kind`; see `DECISIONS.md` D1b. */
  if (row.subTabId === 'operations-quick-rides') return <TripsScreen row={row} />
  if (row.subTabId === 'operations-subscription-trips') return <TripsScreen row={row} />
  if (row.subTabId === 'operations-corporate') return <CorporateScreen row={row} />
  if (row.subTabId === 'operations-dispatch') return <DispatchScreen row={row} />
  /* One screen, two sub-tabs — the same shape as `TripsScreen` above.
     `RequestsScreen` reads `row.subTabId` and pins its channel. */
  if (row.subTabId === 'operations-ride-requests') return <RequestsScreen row={row} />
  if (row.subTabId === 'operations-subscription-requests') return <RequestsScreen row={row} />
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
    return <MetricBoardScreen row={row} prelude={row.subTabId === 'support-overview' ? <SupportDesk /> : undefined} />
  }

  return <SubTabScreen row={row} />
}

/**
 * A level-3 detail's screen. Same registry rule as `screenFor`, one level down.
 *
 * **Keyed on `detail.kind` first, `row.subTabId` second — and the order is the
 * fix, not a preference.** The Reports row declares *two* detail routes
 * (`routeTable.ts:259`): `kind: 'report'` at `/management/reports/:reportId` and
 * `kind: 'dashboard'` at `/management/reports/dashboards/:dashboardId`. Keying
 * on the sub-tab alone cannot tell them apart, so **both resolved to
 * `SavedReportScreen`** — which reads `useParams().reportId`, gets `''` from a
 * route whose param is named `dashboardId`, and hands the operator the
 * read-only *"this report was deleted"* builder for a dashboard that exists.
 *
 * A sub-tab with one detail route is unaffected: its `kind` falls through to the
 * same branch it always took. The rule generalises — the moment a second row
 * declares two details, this dispatch already handles it.
 */
function detailScreenFor(row: SubTabRoute, detail: DetailRoute) {
  if (detail.kind === 'dashboard') {
    return <DashboardDetailScreen />
  }
  /**
   * **The conversation pane is a PAGE, and the first answer was a drawer for a
   * reason worth recording: this row declared `detailRoutes: []` and this file
   * has a single owner, so a drawer was the only surface reachable without
   * touching it.** A file-ownership constraint had decided a page shape.
   *
   * On the design: `--ev-drawer-w` is 406px and cannot hold a thread, a 320px
   * rail and a pinned composer at once — and the rail is where §8.4.2 puts the
   * countdown that both D22's SLA and its concurrent-chat cap are read from, so
   * keeping the drawer would have traded the screen's instrument for its
   * container. §5.0's drawer is also *"a surface consulted against the page
   * behind it"*, and at a 45-second first response an operator is IN the
   * conversation for twenty minutes rather than consulting it.
   */
  if (detail.kind === 'conversation') {
    return <ContactCentreScreen row={row} />
  }
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
  if (detail.kind === 'dispute') {
    return <DisputeDetailScreen />
  }
  if (detail.kind === 'incident') {
    return <IncidentDetailScreen />
  }
  if (detail.kind === 'fairness-case') {
    return <CaseDetailScreen />
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
