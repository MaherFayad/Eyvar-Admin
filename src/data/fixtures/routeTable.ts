/**
 * The route table — foundation spec §3.4, §3.5, §3.6, §3.7, §3.10, §8.5.
 *
 * One row per destination, 35 sub-tabs across 5 workspaces, plus the 3 shell
 * layers. Boring and greppable on purpose: someone will need to hand-edit a row
 * to reproduce a bug, and a clever factory would make that impossible.
 *
 * **Every row carries a `viewPermission` and a `writePermission` — DECISIONS.md
 * D17, which closes Q4 and AC-61.** The 35-row table below is D17's, verbatim.
 *
 * Read it as `● = view + write · ◐ = view only · ○ = not rendered`, where the
 * disc is a fact about the OPERATOR and not about the row: a row is `◐` for an
 * operator who holds its `viewPermission` and not its `writePermission`. The
 * old single `permission: PermissionRef` could not say that — `level` was a
 * property of the row, so a sub-tab was read-only for everybody or for nobody,
 * and Operations › People has to be `●` for Ops Manager and `◐` for Finance at
 * the same time.
 *
 * **Three rows are irregular and each carries its reason inline**:
 * `admin-team` (gated on its own write key), `admin-activity` (no view key at
 * all) and the two self-gating rows, `operations-my-work` and
 * `management-reports`. **Eight cells deviate from §10.3's matrix** — six
 * widenings and two narrowings — and each deviation is noted on its row.
 *
 * `titleKey` / `subtitleKey` are i18n keys, not strings — §7.5 requires Arabic
 * from day one, not as a phase two.
 */

import type {
  DetailRoute,
  RouteTable,
  ShellLayerRoute,
  SubTabRoute,
  SubTabView,
  Workspace,
} from '../types/navigation'
import { RETIRED_LEGACY_PAGE_IDS } from './legacyPages'

/* Small helper so the 35 rows below read as data and not as boilerplate. */
function views(...defs: Array<[id: string, titleKey: string]>): SubTabView[] {
  return defs.map(([id, titleKey], i) => ({ id, titleKey, order: i + 1, isDefault: i === 0 }))
}

/* ───────────────────────── Workspaces (§3.3) ───────────────────────── */

export const WORKSPACES: Workspace[] = [
  {
    id: 'management',
    routePrefix: '/management',
    titleKey: 'workspace.management',
    order: 1,
    pinnedToBottom: false,
    defaultSubTabId: 'management-overview',
    iconConcept: 'Chart axis with a rising line',
    legacyIconLine: 487,
  },
  {
    id: 'operations',
    routePrefix: '/operations',
    titleKey: 'workspace.operations',
    order: 2,
    pinnedToBottom: false,
    defaultSubTabId: 'operations-overview',
    iconConcept: 'Concentric circles with a centre dot',
    legacyIconLine: 498,
  },
  {
    id: 'financials',
    routePrefix: '/financials',
    titleKey: 'workspace.financials',
    order: 3,
    pinnedToBottom: false,
    defaultSubTabId: 'financials-overview',
    iconConcept: 'Currency stroke through a vertical line',
    legacyIconLine: 527,
  },
  {
    id: 'support',
    routePrefix: '/support',
    titleKey: 'workspace.support',
    order: 4,
    pinnedToBottom: false,
    defaultSubTabId: 'support-overview',
    iconConcept: 'Speech bubble with a headset arc',
    legacyIconLine: 533,
  },
  {
    id: 'admin',
    routePrefix: '/admin',
    titleKey: 'workspace.admin',
    order: 5,
    pinnedToBottom: true,
    defaultSubTabId: 'admin-overview',
    iconConcept: 'Gear',
    legacyIconLine: 539,
  },
]

/* ─────────────────────── Level-3 detail routes (§3.10) ─────────────────────── */

const CORP_DETAIL: DetailRoute = {
  kind: 'corporate',
  path: '/operations/corporate/:corpId',
  parentSubTabId: 'operations-corporate',
  paramName: 'corpId',
  titleKey: 'route.corporate.detail',
  shape: 'detail',
  patterns: ['P2'],
}

const APPLICANT_DETAIL: DetailRoute = {
  kind: 'applicant',
  path: '/operations/people/applications/:applicantId',
  parentSubTabId: 'operations-people',
  paramName: 'applicantId',
  titleKey: 'route.people.applicantDetail',
  shape: 'detail',
  patterns: ['P2'],
}

const CONVERSATION_DETAIL: DetailRoute = {
  kind: 'conversation',
  path: '/support/contact-centre/:conversationId',
  parentSubTabId: 'support-contact-centre',
  paramName: 'conversationId',
  titleKey: 'route.contacts.conversation',
  shape: 'detail',
  patterns: ['P2'],
}

const DISPUTE_DETAIL: DetailRoute = {
  kind: 'dispute',
  path: '/support/disputes/:disputeId',
  parentSubTabId: 'support-disputes',
  paramName: 'disputeId',
  titleKey: 'route.disputes.detail',
  shape: 'detail',
  patterns: ['P2'],
}

const INCIDENT_DETAIL: DetailRoute = {
  kind: 'incident',
  path: '/support/safety/:incidentId',
  parentSubTabId: 'support-safety',
  paramName: 'incidentId',
  titleKey: 'route.safety.detail',
  shape: 'detail',
  patterns: ['P2'],
}

const FAIRNESS_DETAIL: DetailRoute = {
  kind: 'fairness-case',
  path: '/support/fairness/:caseId',
  parentSubTabId: 'support-fairness',
  paramName: 'caseId',
  titleKey: 'route.fairness.detail',
  shape: 'detail',
  patterns: ['P2'],
}

const TICKET_DETAIL: DetailRoute = {
  kind: 'ticket',
  path: '/support/tickets/:ticketId',
  parentSubTabId: 'support-tickets',
  paramName: 'ticketId',
  titleKey: 'route.tickets.detail',
  shape: 'detail',
  patterns: ['P2'],
}

/** The one full-bleed screen. The shell unmounts entirely (§3.10, AC-13). */
const PLAN_EDITOR: DetailRoute = {
  kind: 'plan-editor',
  path: '/financials/pricing/plans/:planId/edit',
  parentSubTabId: 'financials-pricing',
  paramName: 'planId',
  titleKey: 'route.pricing.planEditor',
  shape: 'bleed',
  patterns: ['P3'],
}

/* ─────────────────── The 35 sub-tabs (§3.4, and D1a) ─────────────────── */

export const SUB_TABS: SubTabRoute[] = [
  /* ── 1. Management — 6 (five §3.7 boards, then the report builder) ───── */
  {
    subTabId: 'management-overview',
    workspaceId: 'management',
    path: '/management/overview',
    order: 1,
    titleKey: 'subtab.management.overview',
    subtitleKey: 'subtab.management.overview.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['exec-overview'],
    legacySettingsPanes: [],
    patterns: ['P5'],
    shape: 'single',
    viewPermission: 'view_analytics',
    writePermission: null,
    hasBacklog: false,
  },
  {
    subTabId: 'management-performance',
    workspaceId: 'management',
    path: '/management/performance',
    order: 2,
    titleKey: 'subtab.management.performance',
    subtitleKey: null,
    views: [],
    detailRoutes: [],
    legacyPageIds: ['exec-overview', 'growth'],
    legacySettingsPanes: [],
    patterns: ['P5'],
    shape: 'single',
    viewPermission: 'view_analytics',
    writePermission: null,
    hasBacklog: false,
  },
  {
    subTabId: 'management-risk',
    workspaceId: 'management',
    path: '/management/risk',
    order: 3,
    titleKey: 'subtab.management.risk',
    subtitleKey: 'subtab.management.risk.sub',
    views: [],
    detailRoutes: [],
    /* M1. `fraud` moved P8 → P5 here: Risk & Signals computes a flag and routes
       elsewhere; every action is a `go()` (`:14320`, `:14336`, `:14351`, `:14363`). */
    legacyPageIds: ['predictive', 'fraud'],
    legacySettingsPanes: [],
    patterns: ['P5'],
    shape: 'single',
    viewPermission: 'view_analytics',
    writePermission: 'approve_drivers',
    hasBacklog: true,
  },
  {
    subTabId: 'management-growth',
    workspaceId: 'management',
    path: '/management/growth',
    order: 4,
    titleKey: 'subtab.management.growth',
    subtitleKey: 'subtab.management.growth.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['growth'],
    legacySettingsPanes: [],
    patterns: ['P5', 'P1'],
    shape: 'single',
    /* **A D17 deviation** — `◐` → `●` for Finance, who hold `manage_plans`
       for Pricing. "May edit a plan but not a promotion" is a distinction
       nobody can defend. */
    viewPermission: 'view_analytics',
    writePermission: 'manage_plans',
    hasBacklog: false,
  },
  {
    subTabId: 'management-zones',
    workspaceId: 'management',
    path: '/management/zones',
    order: 5,
    titleKey: 'subtab.management.zones',
    subtitleKey: 'subtab.management.zones.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['zones', 'exec-overview'],
    legacySettingsPanes: [],
    patterns: ['P1'],
    shape: 'single',
    /* **A D17 deviation** — `○` → `◐` for Finance. A zone map is not
       sensitive and `view_analytics` is one key. */
    viewPermission: 'view_analytics',
    writePermission: 'manage_ops_policy',
    hasBacklog: true,
  },
  {
    /**
     * **The 35th sub-tab, and the row Q-RB-1 was blocking.**
     *
     * `specs/06-report-builder.md` §5.1 places the Report Builder at Management
     * order 6 and is explicit that the row *"is a **D1 amendment** and must be
     * recorded as one in `DECISIONS.md` before the route table is edited"*. The
     * business owner answered — **add it under Management** — and the amendment
     * is recorded as **D1a**. The screens have been built and mounted behind
     * `REPORTS_SUB_TAB_ID` since wave 6; this row is the only thing that was
     * missing, which is why nothing in `routes.tsx` changes.
     *
     * **Management rather than Admin**, per §5.1: the other five Management
     * sub-tabs are §3.7 boards and this is their ad-hoc sibling. Filing "ask a
     * question about the business" under configuration would be wrong.
     *
     * **`views` are declared here even though `ReportsScreen` carries its own
     * `VIEWS` list.** The screen predates the row and had to name itself while
     * unrouted. Rather than refactor a screen with passing tests to read
     * `row.views`, `routes.test.ts` asserts the two lists are identical — so
     * the duplication cannot drift, and the screen can adopt `row.views` later
     * without a behaviour change.
     *
     * **`legacyPageIds: []`** — genuinely new. Nothing in the 41-page census
     * maps here, and AC-04 requires each census id in *at least* one row, never
     * each row to claim one.
     *
     * **`hasBacklog: false`** (§12.6) — a report is a question, not a queue, so
     * there is no count to badge. It is **self-gating** under D17 —
     * `writePermission` is its own `viewPermission` — because saving your own
     * report needs no authority beyond being able to see the screen.
     */
    subTabId: 'management-reports',
    workspaceId: 'management',
    path: '/management/reports',
    order: 6,
    titleKey: 'subtab.management.reports',
    subtitleKey: 'subtab.management.reports.sub',
    views: views(
      ['reports', 'rb.view.reports'],
      ['dashboards', 'rb.view.dashboards'],
      ['alerts', 'rb.view.alerts'],
    ),
    detailRoutes: [
      {
        kind: 'report',
        path: '/management/reports/:reportId',
        parentSubTabId: 'management-reports',
        paramName: 'reportId',
        titleKey: 'rb.page.title',
        shape: 'single',
        patterns: ['P5'],
      },
      {
        /* Ordered AFTER the saved-report route on purpose. `:reportId` would
           otherwise swallow `/dashboards/DASH-1` by matching `dashboards` as an
           id — the same first-match hazard `findSubTabByPath` resolves for
           sub-tab paths, one level down. */
        kind: 'dashboard',
        path: '/management/reports/dashboards/:dashboardId',
        parentSubTabId: 'management-reports',
        paramName: 'dashboardId',
        titleKey: 'rb.page.title',
        shape: 'single',
        patterns: ['P5'],
      },
    ],
    legacyPageIds: [],
    legacySettingsPanes: [],
    patterns: ['P5'],
    shape: 'single',
    /* **Self-gating** (D17): saving your own report needs no authority beyond
       being able to see the screen. A SHARED report is still safe, because a
       report is a stored QUESTION and its measures resolve against the
       VIEWER's permissions at run time (D13, closed by D17). */
    viewPermission: 'view_analytics',
    writePermission: 'view_analytics',
    hasBacklog: false,
  },

  /* ── 2. Operations — 9 ───────────────────────────────────────────────── */
  {
    subTabId: 'operations-overview',
    workspaceId: 'operations',
    path: '/operations/overview',
    order: 1,
    titleKey: 'subtab.operations.overview',
    subtitleKey: 'subtab.operations.overview.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['dashboard', 'inbox'],
    legacySettingsPanes: [],
    patterns: ['P5'],
    shape: 'single',
    viewPermission: 'view_operations',
    writePermission: null,
    hasBacklog: false,
  },
  {
    subTabId: 'operations-my-work',
    workspaceId: 'operations',
    path: '/operations/my-work',
    order: 2,
    titleKey: 'subtab.operations.myWork',
    subtitleKey: 'subtab.operations.myWork.sub',
    views: views(
      ['mine', 'view.myWork.mine'],
      ['unassigned', 'view.myWork.unassigned'],
      ['everything', 'view.myWork.everything'],
    ),
    detailRoutes: [],
    legacyPageIds: ['inbox'],
    legacySettingsPanes: [],
    patterns: ['P10', 'P8'],
    shape: 'single',
    /* **Self-gating** (D17): claiming your own work needs no authority beyond
       being able to see the screen. Without this My Work is `◐` for the
       Dispatcher and §10.4's "● on 5 of 9" is unmeetable. */
    viewPermission: 'view_operations',
    writePermission: 'view_operations',
    hasBacklog: true,
  },
  {
    subTabId: 'operations-dispatch',
    workspaceId: 'operations',
    path: '/operations/dispatch',
    order: 3,
    titleKey: 'subtab.operations.dispatch',
    subtitleKey: 'subtab.operations.dispatch.sub',
    views: [],
    detailRoutes: [],
    /* `interventions` is NOT listed: it is retired (§3.11). Only its one
       surviving card moves here, and a card is not a page id. */
    legacyPageIds: ['live'],
    legacySettingsPanes: [],
    patterns: ['P6'],
    shape: 'monitor',
    viewPermission: 'view_operations',
    writePermission: 'live_ops',
    hasBacklog: false,
  },
  /**
   * **Requests, split by CHANNEL into two sub-tabs.**
   *
   * It was one queue with `instant` and `subscription` as two of its six view
   * tabs. The two are not variants of one job and this file's own type doc says
   * so: an instant request is matched by the tick engine and an operator
   * intervenes only on breach, while a subscription request is matched BY HAND
   * against a plan, and assigning a captain to one captures the rider's
   * authorisation hold. Two different acts, two different clocks, two different
   * confirmations (AC-247) — and until now, one destination that an operator
   * had to re-filter every time they arrived.
   *
   * **The channel leaves the view row and becomes the tab.** What is left on
   * each is the lifecycle — all, pending, assigned, expired — which is the same
   * four on both because the lifecycle really is shared. `RequestsScreen` reads
   * `subTabId` and pins the channel, exactly as `TripsScreen` already does for
   * quick rides and subscription trips (D1b).
   *
   * `legacyPageIds` are split the same way: `requests-instant-all` was always
   * the instant queue and `requests-sub-all` the subscription one. `requests`
   * — the legacy combined page — goes with the ride tab, which is where a
   * legacy deep link with no channel most nearly lands.
   */
  {
    subTabId: 'operations-ride-requests',
    workspaceId: 'operations',
    path: '/operations/ride-requests',
    order: 4,
    titleKey: 'subtab.operations.rideRequests',
    subtitleKey: 'subtab.operations.rideRequests.sub',
    views: views(
      ['all', 'view.requests.all'],
      /* T3.2 — the spec's name (`specs/02-work-queues.md:697`): "pending" is a
         status word and this is a scope. `clients/requests.ts` keeps `pending`
         as an alias so a bookmarked `?view=pending` still resolves. */
      ['needs-decision', 'view.requests.needsDecision'],
      ['assigned', 'view.requests.assigned'],
      ['expired', 'view.requests.expired'],
    ),
    detailRoutes: [],
    legacyPageIds: ['requests', 'requests-instant-all'],
    legacySettingsPanes: [],
    patterns: ['P8'],
    shape: 'single',
    viewPermission: 'view_operations',
    writePermission: 'live_ops',
    hasBacklog: true,
  },
  {
    subTabId: 'operations-subscription-requests',
    workspaceId: 'operations',
    path: '/operations/subscription-requests',
    order: 5,
    titleKey: 'subtab.operations.subscriptionRequests',
    subtitleKey: 'subtab.operations.subscriptionRequests.sub',
    views: views(
      ['all', 'view.requests.all'],
      /* T3.2 — the spec's name (`specs/02-work-queues.md:697`): "pending" is a
         status word and this is a scope. `clients/requests.ts` keeps `pending`
         as an alias so a bookmarked `?view=pending` still resolves. */
      ['needs-decision', 'view.requests.needsDecision'],
      ['assigned', 'view.requests.assigned'],
      ['expired', 'view.requests.expired'],
    ),
    detailRoutes: [],
    legacyPageIds: ['requests-sub-all'],
    legacySettingsPanes: [],
    patterns: ['P8'],
    shape: 'single',
    viewPermission: 'view_operations',
    writePermission: 'live_ops',
    hasBacklog: true,
  },
  {
    subTabId: 'operations-subscriptions',
    workspaceId: 'operations',
    path: '/operations/subscriptions',
    order: 6,
    titleKey: 'subtab.operations.subscriptions',
    subtitleKey: 'subtab.operations.subscriptions.sub',
    views: views(
      ['all', 'view.subscriptions.all'],
      ['active', 'view.subscriptions.active'],
      /* This is the view "Renewal pipeline" must resolve to (§4.3.4). */
      ['expiring-7d', 'view.subscriptions.expiring7d'],
      ['at-risk', 'view.subscriptions.atRisk'],
      ['frozen', 'view.subscriptions.frozen'],
    ),
    detailRoutes: [],
    legacyPageIds: ['subscriptions', 'renewal'],
    legacySettingsPanes: [],
    patterns: ['P1'],
    shape: 'single',
    viewPermission: 'view_operations',
    writePermission: 'manage_subscriptions',
    hasBacklog: true,
  },
  {
    subTabId: 'operations-corporate',
    workspaceId: 'operations',
    path: '/operations/corporate',
    order: 7,
    titleKey: 'subtab.operations.corporate',
    subtitleKey: 'subtab.operations.corporate.sub',
    views: [],
    detailRoutes: [CORP_DETAIL],
    legacyPageIds: ['corporate', 'corp-detail'],
    legacySettingsPanes: [],
    patterns: ['P1', 'P2'],
    shape: 'single',
    /* **A D17 deviation** — `○` → `◐` for Support, who answer calls about
       corporate rides. */
    viewPermission: 'view_operations',
    writePermission: 'manage_subscriptions',
    hasBacklog: true,
  },
  /* **Two sub-tabs, on the owner's ruling — see `DECISIONS.md` D1b.**
     D1 made quick rides "the same table with a different filter". The business
     owner overruled it: a quick ride and a subscription leg are different work,
     and an operator should not have to remember which view tab they were on.

     `kind` stays ONE type on ONE collection. What separated is the operator's
     entry point, not the domain model — which is why both rows carry the same
     `patterns`, `viewPermission` and `writePermission`, and the same screen
     renders both. The `all` view of each is now `kind`-scoped, so the two view
     tabs that did the filtering are gone: they became the sub-tabs. */
  {
    subTabId: 'operations-quick-rides',
    workspaceId: 'operations',
    path: '/operations/quick-rides',
    order: 8,
    titleKey: 'subtab.operations.quickRides',
    subtitleKey: 'subtab.operations.quickRides.sub',
    views: views(
      ['all', 'view.trips.all'],
      ['flagged', 'view.trips.flagged'],
      ['low-rating', 'view.trips.lowRating'],
      ['route-history', 'view.trips.routeHistory'],
    ),
    detailRoutes: [],
    legacyPageIds: ['quickrides', 'live'],
    legacySettingsPanes: [],
    patterns: ['P1'],
    shape: 'single',
    viewPermission: 'view_operations',
    writePermission: 'live_ops',
    hasBacklog: false,
  },
  {
    subTabId: 'operations-subscription-trips',
    workspaceId: 'operations',
    path: '/operations/subscription-trips',
    order: 9,
    titleKey: 'subtab.operations.subscriptionTrips',
    subtitleKey: 'subtab.operations.subscriptionTrips.sub',
    views: views(
      ['all', 'view.trips.all'],
      ['flagged', 'view.trips.flagged'],
      ['low-rating', 'view.trips.lowRating'],
    ),
    detailRoutes: [],
    legacyPageIds: ['trips'],
    legacySettingsPanes: [],
    patterns: ['P1'],
    shape: 'single',
    viewPermission: 'view_operations',
    writePermission: 'live_ops',
    hasBacklog: false,
  },
  {
    subTabId: 'operations-assurance',
    workspaceId: 'operations',
    path: '/operations/assurance',
    order: 10,
    titleKey: 'subtab.operations.assurance',
    subtitleKey: 'subtab.operations.assurance.sub',
    views: views(
      ['departing-24h', 'view.assurance.departing24h'],
      ['no-backup-captain', 'view.assurance.noBackupCaptain'],
      ['awaiting-confirmation', 'view.assurance.awaitingConfirmation'],
      ['absences', 'view.assurance.absences'],
    ),
    detailRoutes: [],
    legacyPageIds: ['readiness', 'coverage', 'commitment'],
    legacySettingsPanes: [],
    patterns: ['P8'],
    shape: 'single',
    viewPermission: 'view_operations',
    writePermission: 'live_ops',
    hasBacklog: true,
  },
  {
    subTabId: 'operations-people',
    workspaceId: 'operations',
    path: '/operations/people',
    order: 11,
    titleKey: 'subtab.operations.people',
    subtitleKey: 'subtab.operations.people.sub',
    /* The widest merge — 5 legacy pages, 4 views, 3 patterns, on one route.
       Captains and Riders are index tables; Applications is a work queue;
       Compliance is an index table over document expiry. Four separate
       resources with four separate clients — they share a screen, not a type. */
    views: views(
      ['captains', 'view.people.captains'],
      ['applications', 'view.people.applications'],
      ['compliance', 'view.people.compliance'],
      ['riders', 'view.people.riders'],
    ),
    detailRoutes: [APPLICANT_DETAIL],
    legacyPageIds: ['drivers', 'all-pending', 'applicant-detail', 'compliance', 'riders'],
    legacySettingsPanes: [],
    patterns: ['P1', 'P8', 'P2'],
    shape: 'single',
    viewPermission: 'view_operations',
    writePermission: 'approve_drivers',
    hasBacklog: true,
  },

  /* ── 3. Financials — 7 ───────────────────────────────────────────────── */
  {
    subTabId: 'financials-overview',
    workspaceId: 'financials',
    path: '/financials/overview',
    order: 1,
    titleKey: 'subtab.financials.overview',
    subtitleKey: 'subtab.financials.overview.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['finance', 'wallets', 'rwallets', 'settings'],
    legacySettingsPanes: [],
    patterns: ['P5'],
    shape: 'single',
    viewPermission: 'view_finance',
    writePermission: null,
    hasBacklog: false,
  },
  {
    subTabId: 'financials-revenue',
    workspaceId: 'financials',
    path: '/financials/revenue',
    order: 2,
    titleKey: 'subtab.financials.revenue',
    subtitleKey: 'subtab.financials.revenue.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['finance'],
    legacySettingsPanes: [],
    patterns: ['P7'],
    shape: 'single',
    viewPermission: 'view_finance',
    writePermission: 'apply_deductions',
    hasBacklog: false,
  },
  {
    subTabId: 'financials-payouts',
    workspaceId: 'financials',
    path: '/financials/payouts',
    order: 3,
    titleKey: 'subtab.financials.payouts',
    subtitleKey: 'subtab.financials.payouts.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['wallets'],
    legacySettingsPanes: [],
    patterns: ['P7'],
    shape: 'single',
    /* **A D17 deviation from §10.3, and one of the eight named ones.** §10.3
       gave Ops Manager `○` here; D17 rules `◐`. A workspace read key cannot
       hide two rows inside the workspace it opens, and read-only money is not
       a risk — a second key for it is. */
    viewPermission: 'view_finance',
    writePermission: 'process_payouts',
    hasBacklog: true,
  },
  {
    subTabId: 'financials-cash',
    workspaceId: 'financials',
    path: '/financials/cash',
    order: 4,
    titleKey: 'subtab.financials.cash',
    subtitleKey: 'subtab.financials.cash.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['wallets'],
    legacySettingsPanes: [],
    patterns: ['P7', 'P8'],
    shape: 'single',
    viewPermission: 'view_finance',
    writePermission: 'apply_deductions',
    hasBacklog: true,
  },
  {
    subTabId: 'financials-rider-wallets',
    workspaceId: 'financials',
    path: '/financials/rider-wallets',
    order: 5,
    titleKey: 'subtab.financials.riderWallets',
    subtitleKey: 'subtab.financials.riderWallets.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['rwallets'],
    legacySettingsPanes: [],
    patterns: ['P7'],
    shape: 'single',
    /* **A D17 narrowing.** §10.3 gave Support `◐*` here; D17 rules `○` —
       Support does not hold `view_finance` at all, so this row does not
       render for them. The compensation credit Support genuinely needs
       mid-call is a COMMAND on the rider's 360° profile, gated on
       `manage_tickets` plus the `compPolicy` cap, not a Financials screen. */
    viewPermission: 'view_finance',
    writePermission: 'apply_deductions',
    hasBacklog: false,
  },
  {
    subTabId: 'financials-pricing',
    workspaceId: 'financials',
    path: '/financials/pricing',
    order: 6,
    titleKey: 'subtab.financials.pricing',
    subtitleKey: 'subtab.financials.pricing.sub',
    views: views(
      ['subscription-plans', 'view.pricing.subscriptionPlans'],
      ['quick-rides', 'view.pricing.quickRides'],
      ['rate-card', 'view.pricing.rateCard'],
      /* "Cancellation Policy" resolves here — the search case §4.3.4 names. */
      ['cancellation-fees', 'view.pricing.cancellationFees'],
    ),
    detailRoutes: [PLAN_EDITOR],
    legacyPageIds: ['plans', 'plan-edit', 'settings'],
    legacySettingsPanes: ['pricing', 'cancelpolicy'],
    patterns: ['P1', 'P3'],
    shape: 'single',
    viewPermission: 'view_finance',
    writePermission: 'manage_plans',
    hasBacklog: false,
  },
  {
    subTabId: 'financials-ledger',
    workspaceId: 'financials',
    path: '/financials/ledger',
    order: 7,
    titleKey: 'subtab.financials.ledger',
    subtitleKey: 'subtab.financials.ledger.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['settings'],
    legacySettingsPanes: ['ledger', 'gateways'],
    patterns: ['P7', 'P4'],
    shape: 'single',
    /* **A D17 deviation from §10.3** — `○` → `◐` for Ops Manager, for the
       same reason as Payouts. */
    viewPermission: 'view_finance',
    writePermission: 'release_escrow',
    hasBacklog: false,
  },

  /* ── 4. Customer Support — 6 ─────────────────────────────────────────── */
  {
    subTabId: 'support-overview',
    workspaceId: 'support',
    path: '/support/overview',
    order: 1,
    titleKey: 'subtab.support.overview',
    subtitleKey: 'subtab.support.overview.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['support', 'contacts', 'safety', 'fairness'],
    legacySettingsPanes: [],
    patterns: ['P5'],
    shape: 'single',
    viewPermission: 'view_support',
    writePermission: null,
    hasBacklog: false,
  },
  {
    subTabId: 'support-tickets',
    workspaceId: 'support',
    path: '/support/tickets',
    order: 2,
    titleKey: 'subtab.support.tickets',
    subtitleKey: 'subtab.support.tickets.sub',
    /* A §8.4 queue (S-1): it lands on the work nobody holds (Q-32). */
    views: views(
      ['unassigned', 'view.tickets.unassigned'],
      ['mine', 'view.tickets.mine'],
      ['open', 'view.tickets.open'],
      ['waiting', 'view.tickets.waiting'],
      ['done', 'view.tickets.done'],
    ),
    detailRoutes: [TICKET_DETAIL],
    legacyPageIds: ['support', 'ticket-detail'],
    legacySettingsPanes: [],
    patterns: ['P8'],
    shape: 'single',
    viewPermission: 'view_support',
    writePermission: 'manage_tickets',
    hasBacklog: true,
  },
  {
    subTabId: 'support-disputes',
    workspaceId: 'support',
    path: '/support/disputes',
    order: 3,
    titleKey: 'subtab.support.disputes',
    subtitleKey: 'subtab.support.disputes.sub',
    /* Open and decided claims are two views (R20: a decided row carries no
       refused action); lost property is a second collection on the same tab strip. */
    views: views(
      ['disputes', 'view.disputes.disputes'],
      ['decided', 'view.disputes.decided'],
      ['lost-and-found', 'view.disputes.lostAndFound'],
    ),
    detailRoutes: [DISPUTE_DETAIL],
    legacyPageIds: ['support'],
    legacySettingsPanes: [],
    patterns: ['P9'],
    shape: 'single',
    viewPermission: 'view_support',
    writePermission: 'manage_tickets',
    hasBacklog: true,
  },
  {
    subTabId: 'support-fairness',
    workspaceId: 'support',
    path: '/support/fairness',
    order: 4,
    titleKey: 'subtab.support.fairness',
    subtitleKey: 'subtab.support.fairness.sub',
    views: views(
      ['suspension-appeals', 'view.fairness.suspensionAppeals'],
      ['rating-disputes', 'view.fairness.ratingDisputes'],
      ['rider-reports', 'view.fairness.riderReports'],
      ['captain-economics', 'view.fairness.captainEconomics'],
    ),
    detailRoutes: [FAIRNESS_DETAIL],
    legacyPageIds: ['fairness'],
    legacySettingsPanes: [],
    patterns: ['P5', 'P8'],
    shape: 'single',
    viewPermission: 'view_support',
    writePermission: 'manage_tickets',
    hasBacklog: true,
  },
  {
    subTabId: 'support-safety',
    workspaceId: 'support',
    path: '/support/safety',
    order: 5,
    titleKey: 'subtab.support.safety',
    subtitleKey: 'subtab.support.safety.sub',
    /* Spec §8.9: `critical`, not `critical-sos` (severity is not type), and an `all` view. */
    views: views(
      ['open', 'view.safety.open'],
      ['critical', 'view.safety.critical'],
      ['closed', 'view.safety.closed'],
      ['all', 'view.safety.all'],
    ),
    detailRoutes: [INCIDENT_DETAIL],
    legacyPageIds: ['safety'],
    legacySettingsPanes: [],
    patterns: ['P9'],
    shape: 'single',
    /* **The important D17 narrowing.** §10.3 gave Support `●`; its own R5 says
       the Support role "is not equipped for a suspension decision". Trust &
       Safety now exists and holds `approve_drivers`, so Support is `◐` here.
       This is R5 applied, not overridden (AC-916, AC-917). */
    viewPermission: 'view_support',
    writePermission: 'approve_drivers',
    hasBacklog: true,
  },
  {
    subTabId: 'support-contact-centre',
    workspaceId: 'support',
    path: '/support/contact-centre',
    order: 6,
    titleKey: 'subtab.support.contactCentre',
    subtitleKey: 'subtab.support.contactCentre.sub',
    views: [],
    detailRoutes: [CONVERSATION_DETAIL],
    legacyPageIds: ['contacts', 'support'],
    legacySettingsPanes: [],
    patterns: ['P1'],
    shape: 'single',
    viewPermission: 'view_support',
    writePermission: 'contact_users',
    hasBacklog: true,
  },

  /* ── 5. Admin — 7 ────────────────────────────────────────────────────── */
  {
    subTabId: 'admin-overview',
    workspaceId: 'admin',
    path: '/admin/overview',
    order: 1,
    titleKey: 'subtab.admin.overview',
    subtitleKey: 'subtab.admin.overview.sub',
    views: [],
    detailRoutes: [],
    /* New surface — §3.4 Admin row 1. Assembled from auditLog, teamUsers,
       integrity, rotaGaps(), legalDocuments, the erasure queue and dataWindow.
       No legacy page contributes wholesale, so the array is empty; AC-04
       requires every census id to appear somewhere, not every row to be full. */
    legacyPageIds: [],
    legacySettingsPanes: [],
    patterns: ['P5'],
    shape: 'single',
    viewPermission: 'view_admin',
    writePermission: null,
    hasBacklog: true,
  },
  {
    subTabId: 'admin-workspace',
    workspaceId: 'admin',
    path: '/admin/workspace',
    order: 2,
    titleKey: 'subtab.admin.workspace',
    subtitleKey: 'subtab.admin.workspace.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['settings'],
    /* `general` + `branding` merge closes a real defect: two logo stores never
       synchronised (`DB.branding.logoUrl` vs `DB.opsConfig.general.logoDataUrl`). */
    legacySettingsPanes: ['general', 'branding', 'legal'],
    patterns: ['P4'],
    shape: 'single',
    /* **A D17 deviation** — `○` → `◐` for Ops Manager. Read-only branding
       harms nobody; `admin-team` is the row that needed protecting and it has
       its own key. */
    viewPermission: 'view_admin',
    writePermission: 'manage_workspace',
    hasBacklog: false,
  },
  {
    subTabId: 'admin-team',
    workspaceId: 'admin',
    path: '/admin/team',
    order: 3,
    titleKey: 'subtab.admin.team',
    subtitleKey: 'subtab.admin.team.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['settings'],
    legacySettingsPanes: ['team', 'permissions', 'security', 'rota'],
    patterns: ['P4'],
    shape: 'single',
    /* **The one Admin row gated on its own write key** (D17). Read-only access
       to Team & Access exposes the full operator roster, everyone's
       second-factor state and the whole permission matrix. There is no useful
       `◐` for it: either you administer operators or you have no business
       reading the list. This is why Finance and Dispatcher see an Admin tile
       containing only the Activity Log. */
    viewPermission: 'manage_team',
    writePermission: 'manage_team',
    hasBacklog: true,
  },
  {
    subTabId: 'admin-policy',
    workspaceId: 'admin',
    path: '/admin/policy',
    order: 4,
    titleKey: 'subtab.admin.policy',
    subtitleKey: 'subtab.admin.policy.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['settings'],
    legacySettingsPanes: ['dispatch', 'cities', 'limits', 'reasons'],
    patterns: ['P4'],
    shape: 'single',
    viewPermission: 'view_admin',
    writePermission: 'manage_ops_policy',
    hasBacklog: false,
  },
  {
    subTabId: 'admin-communications',
    workspaceId: 'admin',
    path: '/admin/communications',
    order: 5,
    titleKey: 'subtab.admin.communications',
    subtitleKey: 'subtab.admin.communications.sub',
    /* Email Log's Inbox/Outbox becomes two views on one index — this is what
       removes the product's only four-deep path (§3.7). */
    views: views(['inbox', 'view.communications.inbox'], ['outbox', 'view.communications.outbox']),
    detailRoutes: [],
    legacyPageIds: ['settings'],
    legacySettingsPanes: ['notifications', 'push', 'emails'],
    patterns: ['P4'],
    shape: 'single',
    viewPermission: 'view_admin',
    writePermission: 'manage_workspace',
    hasBacklog: true,
  },
  {
    subTabId: 'admin-data',
    workspaceId: 'admin',
    path: '/admin/data',
    order: 6,
    titleKey: 'subtab.admin.data',
    subtitleKey: 'subtab.admin.data.sub',
    views: [],
    detailRoutes: [],
    legacyPageIds: ['settings'],
    legacySettingsPanes: ['integrity', 'export'],
    patterns: ['P4'],
    shape: 'single',
    viewPermission: 'view_admin',
    writePermission: 'manage_data_governance',
    hasBacklog: true,
  },
  {
    subTabId: 'admin-activity',
    workspaceId: 'admin',
    path: '/admin/activity',
    order: 7,
    titleKey: 'subtab.admin.activity',
    subtitleKey: 'subtab.admin.activity.sub',
    views: views(
      ['by-actor', 'view.activity.byActor'],
      ['by-action', 'view.activity.byAction'],
      ['by-entity', 'view.activity.byEntity'],
    ),
    detailRoutes: [],
    legacyPageIds: ['audit-log', 'settings'],
    legacySettingsPanes: ['activity'],
    patterns: ['P1'],
    shape: 'single',
    /* **The only row in the table with NO view key** (D17, AC-919). Every
       authenticated operator can open the Activity Log; **the rows are
       filtered server-side to entities the operator can otherwise see**, and
       that filtering is not optional — a client-side filter over a full log
       is a leak in the network tab (AC-920). §10.3 gave all four legacy roles
       `◐` here, and an audit trail only the accused can hide is not a
       control. `writePermission: null` — a log is not written from its own
       screen. */
    viewPermission: null,
    writePermission: null,
    hasBacklog: false,
  },
]

/* ─────────────────────────── Shell layers (§4.3) ─────────────────────────── */

export const SHELL_LAYERS: ShellLayerRoute[] = [
  {
    layerId: 'entity',
    overlayParam: 'entity',
    titleKey: 'shellLayer.profile',
    /* The only shell layer with a full-page escape (§3.10). */
    fullPagePath: '/entity/:entityId',
    legacyPageIds: ['profile'],
    patterns: ['P2'],
    /* §4.3.1 and D17 — gated on `view_profiles`, the permission that was
       enforced at **zero** call sites before D17 made it a real gate. Every one
       of the six roles holds it, so the layer opens for everybody today; what
       changes is that a role created WITHOUT it can no longer read a rider's
       personal details by opening a profile. `writePermission` is the same key:
       the 360° layer's own commands (contact, compensate, suspend) carry their
       own keys through the command registry, so there is no separate "edit the
       profile" authority to name here. */
    viewPermission: 'view_profiles',
    writePermission: 'view_profiles',
  },
  {
    layerId: 'notifications',
    overlayParam: 'notifications',
    titleKey: 'shellLayer.notifications',
    fullPagePath: null,
    legacyPageIds: ['notifications-all'],
    patterns: ['P10'],
    /* §11.2 — every authenticated operator. Row visibility is per-notification. */
    viewPermission: null,
    writePermission: null,
  },
  {
    layerId: 'account',
    overlayParam: 'account',
    titleKey: 'shellLayer.account',
    fullPagePath: null,
    legacyPageIds: ['my-account'],
    patterns: ['P4'],
    /* §11.2 — every operator, for their own record only. Administering others
       is Admin › Team & Access under `manage_team`. */
    viewPermission: null,
    writePermission: null,
  },
  {
    /**
     * **The fourth layer, minted by R4-2 §2.2 and scoped by R4-3.** The guided
     * onboarding checklist, `?onboarding=1`.
     *
     * `legacyPageIds` is **empty and that is correct** — this surface has no
     * legacy ancestor. It is the first row in this table that carries none, and
     * AC-04 counts the union over every row rather than requiring one per row,
     * so nothing breaks.
     *
     * `viewPermission: null` — every operator, every role, permanently reachable
     * from the account menu (**AC-598**). A checklist an operator cannot open
     * is a checklist they will not finish.
     *
     * **`reauth` is not here and must not be added** (R4-3, spec §18 item 6).
     * See `ShellLayerId`.
     */
    layerId: 'onboarding',
    overlayParam: 'onboarding',
    titleKey: 'shellLayer.onboarding',
    fullPagePath: null,
    legacyPageIds: [],
    /* Guided checklist — the §6.4 row R4-2 §2.2 minted. No new page shape. */
    patterns: ['P4'],
    viewPermission: null,
    writePermission: null,
  },
]

export const ROUTE_TABLE: RouteTable = {
  workspaces: WORKSPACES,
  subTabs: SUB_TABS,
  shellLayers: SHELL_LAYERS,
  retiredLegacyPageIds: [...RETIRED_LEGACY_PAGE_IDS],
}
