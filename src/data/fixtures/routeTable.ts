/**
 * The route table — foundation spec §3.4, §3.5, §3.6, §3.7, §3.10, §8.5.
 *
 * One row per destination, 35 sub-tabs across 5 workspaces, plus the 3 shell
 * layers. Boring and greppable on purpose: someone will need to hand-edit a row
 * to reproduce a bug, and a clever factory would make that impossible.
 *
 * **Every `permission` is `null`.** Q4 (§12.2) is open — the *rule* that all 35
 * sub-tabs get an entry is decided; the 35 *values* are not, and 19 legacy pages
 * had nothing to inherit. Inventing them here would ship an answer the business
 * owner has not given. AC-61 fails against this table today, deliberately and
 * visibly.
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
     * there is no count to badge. **`permission: null`** keeps it with the
     * other 34 under the still-open **Q4**; it is not a decision made here.
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
    permission: null,
    hasBacklog: false,
  },
  {
    subTabId: 'operations-requests',
    workspaceId: 'operations',
    path: '/operations/requests',
    order: 4,
    titleKey: 'subtab.operations.requests',
    subtitleKey: 'subtab.operations.requests.sub',
    views: views(
      ['all', 'view.requests.all'],
      ['instant', 'view.requests.instant'],
      ['subscription', 'view.requests.subscription'],
      ['pending', 'view.requests.pending'],
      ['assigned', 'view.requests.assigned'],
      ['expired', 'view.requests.expired'],
    ),
    detailRoutes: [],
    legacyPageIds: ['requests', 'requests-sub-all', 'requests-instant-all'],
    legacySettingsPanes: [],
    patterns: ['P8'],
    shape: 'single',
    permission: null,
    hasBacklog: true,
  },
  {
    subTabId: 'operations-subscriptions',
    workspaceId: 'operations',
    path: '/operations/subscriptions',
    order: 5,
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
    permission: null,
    hasBacklog: true,
  },
  {
    subTabId: 'operations-corporate',
    workspaceId: 'operations',
    path: '/operations/corporate',
    order: 6,
    titleKey: 'subtab.operations.corporate',
    subtitleKey: 'subtab.operations.corporate.sub',
    views: [],
    detailRoutes: [CORP_DETAIL],
    legacyPageIds: ['corporate', 'corp-detail'],
    legacySettingsPanes: [],
    patterns: ['P1', 'P2'],
    shape: 'single',
    permission: null,
    hasBacklog: true,
  },
  {
    subTabId: 'operations-trips',
    workspaceId: 'operations',
    path: '/operations/trips',
    order: 7,
    titleKey: 'subtab.operations.trips',
    subtitleKey: 'subtab.operations.trips.sub',
    views: views(
      ['all', 'view.trips.all'],
      ['quick-rides', 'view.trips.quickRides'],
      ['subscription-legs', 'view.trips.subscriptionLegs'],
      ['flagged', 'view.trips.flagged'],
      ['low-rating', 'view.trips.lowRating'],
      ['route-history', 'view.trips.routeHistory'],
    ),
    detailRoutes: [],
    legacyPageIds: ['trips', 'quickrides', 'live'],
    legacySettingsPanes: [],
    patterns: ['P1'],
    shape: 'single',
    permission: null,
    hasBacklog: false,
  },
  {
    subTabId: 'operations-assurance',
    workspaceId: 'operations',
    path: '/operations/assurance',
    order: 8,
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
    permission: null,
    hasBacklog: true,
  },
  {
    subTabId: 'operations-people',
    workspaceId: 'operations',
    path: '/operations/people',
    order: 9,
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
    permission: null,
    hasBacklog: false,
  },
  {
    subTabId: 'support-tickets',
    workspaceId: 'support',
    path: '/support/tickets',
    order: 2,
    titleKey: 'subtab.support.tickets',
    subtitleKey: 'subtab.support.tickets.sub',
    views: views(
      ['open', 'view.tickets.open'],
      ['in-progress', 'view.tickets.inProgress'],
      ['waiting', 'view.tickets.waiting'],
      ['resolved', 'view.tickets.resolved'],
      ['by-reason-code', 'view.tickets.byReasonCode'],
    ),
    detailRoutes: [TICKET_DETAIL],
    legacyPageIds: ['support', 'ticket-detail'],
    legacySettingsPanes: [],
    patterns: ['P9'],
    shape: 'single',
    permission: null,
    hasBacklog: true,
  },
  {
    subTabId: 'support-disputes',
    workspaceId: 'support',
    path: '/support/disputes',
    order: 3,
    titleKey: 'subtab.support.disputes',
    subtitleKey: 'subtab.support.disputes.sub',
    views: views(['disputes', 'view.disputes.disputes'], ['lost-and-found', 'view.disputes.lostAndFound']),
    detailRoutes: [],
    legacyPageIds: ['support'],
    legacySettingsPanes: [],
    patterns: ['P9'],
    shape: 'single',
    permission: null,
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
    detailRoutes: [],
    legacyPageIds: ['fairness'],
    legacySettingsPanes: [],
    patterns: ['P5', 'P8'],
    shape: 'single',
    permission: null,
    hasBacklog: true,
  },
  {
    subTabId: 'support-safety',
    workspaceId: 'support',
    path: '/support/safety',
    order: 5,
    titleKey: 'subtab.support.safety',
    subtitleKey: 'subtab.support.safety.sub',
    views: views(
      ['open', 'view.safety.open'],
      ['critical-sos', 'view.safety.criticalSos'],
      ['closed', 'view.safety.closed'],
    ),
    detailRoutes: [],
    legacyPageIds: ['safety'],
    legacySettingsPanes: [],
    patterns: ['P9'],
    shape: 'single',
    permission: null,
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
    detailRoutes: [],
    legacyPageIds: ['contacts', 'support'],
    legacySettingsPanes: [],
    patterns: ['P1'],
    shape: 'single',
    permission: null,
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
    permission: null,
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
    /* §4.3.1 — gated on `view_profiles`, the permission enforced at **zero**
       call sites today. This is the one permission the spec states outright,
       so it is not a Q4 invention. */
    permission: { key: 'view_profiles', level: 'full' },
  },
  {
    layerId: 'notifications',
    overlayParam: 'notifications',
    titleKey: 'shellLayer.notifications',
    fullPagePath: null,
    legacyPageIds: ['notifications-all'],
    patterns: ['P10'],
    /* §11.2 — every authenticated operator. Row visibility is per-notification. */
    permission: null,
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
    permission: null,
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
     * `permission: null` — every operator, every role, permanently reachable
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
    permission: null,
  },
]

export const ROUTE_TABLE: RouteTable = {
  workspaces: WORKSPACES,
  subTabs: SUB_TABS,
  shellLayers: SHELL_LAYERS,
  retiredLegacyPageIds: [...RETIRED_LEGACY_PAGE_IDS],
}
