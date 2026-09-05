/**
 * Every operator-facing string the shell can render, as keys — **AC-74**.
 *
 * Two rules this file exists to make mechanical:
 *
 *   **AC-74** — every string resolves through a key, and rendering with an
 *   EMPTY Arabic dictionary shows the English fallback for every one of them
 *   and never a raw key. `createTranslator` (0.5) enforces the fallback; this
 *   file supplies the English side.
 *
 *   **AC-75** — no concatenation. Every interpolation is a NAMED PLACEHOLDER
 *   inside a SINGLE key. `'Work assigned to you: ' + count` is the defect this
 *   forbids; `shell.chip.mine.a11y` is the fix. A missing parameter throws in
 *   `interpolate` rather than rendering `{count}` to an operator.
 *
 * Sources for the copy, in order of authority:
 *   design spec §11.6   the 24 shell states — FINAL copy, quoted verbatim
 *   design spec §2–§6   the rail, the column, the top bar, the layers
 *   spec §3.4           the 34 sub-tab display names
 *   `docs/ref/copy.md`  sentence case, verbs on buttons, R6 on periods
 *
 * **`ar` IS NO LONGER EMPTY.** Every operator-facing string is translated
 * and lives in `./ar`, one module per English dictionary, spread in the
 * same order so the two sides diff file by file. §9.3's objection was to a
 * HALF-translated console, not to a translated one: every key reachable from
 * `EN` has an Arabic string, so no screen mixes the two languages.
 *
 * AC-74's fallback chain is unchanged and still tested — `src/lib/i18n/i18n.test.ts`
 * builds its own empty dictionary rather than borrowing this one, so the guard
 * survives Arabic landing. Arabic GEOMETRY and the Arabic FACE remain
 * independent of this file: they key off `:root:lang(ar)` and the font stack.
 * The glossary the strings were written against is
 * `docs/05-restructure/design/20-arabic-glossary.md`.
 *
 * The key count and the per-file breakdown are generated into
 * `docs/08-i18n/KEYS.md` by `npm run i18n:keys`. This header states no number.
 */

import type { Dictionary, Language } from '@/lib'
import { DATE_MESSAGES_EN, FILE_SIZE_MESSAGES_EN, SLA_MESSAGES_EN } from '@/lib'
/* A Phase 1 screen owns its own copy and exports it as a `Dictionary`; the
   assembly below is the only place they meet. One import and one spread per
   screen, so adding a screen never edits another screen's strings.

   **Imported from the screen's `copy` module, never from its barrel.** The
   barrel also exports the screen component, which reaches `ShellContext`,
   which imports this file — a cycle. `copy.ts` imports one TYPE and nothing
   else, so this edge has no runtime cost and no ordering hazard. */
/* P3-T5…T9 — the command centre's own copy. A module exports a `Dictionary`
   and this file spreads it, exactly as a screen does; `src/commands` is its
   own owner, so its strings live with it rather than inside the shell's
   `shell.search.*` block. */
import { COMMANDS_EN } from '@/commands/copy'
/**
 * **Registered in phase C-5, and this is the no-op `localCopy.ts` predicted.**
 *
 * Trips and Subscriptions own their copy properly — one `Dictionary` each, in
 * their own `copy.ts` — but neither was ever spread here, so both screens have
 * been reaching their strings through `withFallback`
 * (`screens/operations/localCopy.ts`), whose own header says: *"the day
 * `dictionaries.ts` imports `TRIPS_EN`, this becomes a no-op … the wrapper can
 * be deleted with a one-line diff per screen."*
 *
 * The command registry is what forces the day. `commands/trips.ts` and
 * `commands/subscriptions.ts` are run by the **palette**, which holds the
 * shell's `t` and knows nothing about a screen's fallback wrapper — so an
 * unregistered `trips.flag.title.one` throws in dev (AC-74) and renders a raw
 * key in production, which is the one thing §7.4 / AC-74 forbid outright.
 *
 * Purely additive: neither dictionary shares a key with anything already here
 * or with the other, and `translate` prefers `dictionary[key]` over a
 * `defaultValue`, so both screens keep the identical strings by the shorter
 * route. **Raised in the handoff to the screens' owners:** `withFallback` is
 * now dead weight in `TripsScreen` and `SubscriptionsScreen` and both call
 * sites can drop it; Corporate is the third screen in the same position and is
 * left alone because no command touches it.
 */
/* Wave 2 — the five §8.4 work queues. `QUEUE_SHARED_EN` is §4's own contract
   vocabulary (the owner chip, the countdown, the take-over confirmation), which
   all five inherit; the five screen dictionaries carry only what differs. */
import { QUEUE_SHARED_EN } from '@/screens/queues/copy'
/* Wave 4 — one dictionary for all eight §3.7 metric-tile sub-tabs. They share
   `overview.noData`, which §3.7 requires to be byte-identical everywhere. */
/* Wave 3 — the seven Financials sub-tabs, the ledger vocabulary they share, and
   the plan editor. `FINANCIALS_EN` also carries the `fin.*` keys the DATA layer
   emits as `LocalisedText`, because a posting description that resolves to
   nothing renders a raw key. */
import { FINANCIALS_EN } from '@/screens/financials/copy'
/* R4-6b — Management › Market & Zones' table, strip and cities row. */
/* Wave 6 — the Report Builder. It carries the 60 `rb.*` keys the SEMANTIC layer
   emits (measure labels, population sentences, violation reasons, panel titles)
   as well as the module's own copy: the data layer holds no display string, and
   this is the other end of every key it does hold. */
/* Wave 5 — the six auth screens, the re-authentication modal, the session
   banners and the device list; then the onboarding layer and its 21 steps.
   Two dictionaries, because the two surfaces have different owners in the
   design spec (§3–§9 and §10) and nothing is shared between them but the
   `role.*` keys, which live with auth because the auth card renders one first
   (`auth.activate.subtitle`). */
import { AUTH_EN } from '@/screens/auth/copy'
import { ONBOARDING_EN } from '@/screens/onboarding/copy'
/* P6-T3 — Admin › Policy. It also carries the `policy.audit.*` keys the DATA
   layer emits as `LocalisedText` on every policy and reason-code write, and the
   `labelKey` on every SLA tier and queue in `fixtures/policy.ts`. Those are the
   half that has to be here rather than in the screen: Admin › Activity resolves
   an audit line with the SHELL translator, and a raw key on an audit line is the
   one place a missing string is unrecoverable. */
import { COMMUNICATIONS_EN } from '@/screens/admin/communications/copy'
/* Remediation wave 5 — Support › Tickets and Support › Disputes. Between them
   the two screens shipped 55 `t(key, { defaultValue })` calls and defined not
   one of those keys (`REMEDIATION-PLAN.md` §4.2), so every string on both was
   untranslatable by construction. `DISPUTES_EN` also carries
   `dispute.posting.settlement`, which `clients/disputes.ts` mints as a
   `LocalisedText` — `i18n/localisedKeys.test.ts` fails the build without it. */
/* P5-T4 / P5-T6 — Support › Contact Centre, rebuilt as the conversation console
   (D19, D22). The screen it replaces shipped 21 `t(key, { defaultValue })` calls
   and defined none of those keys, so every string on it was untranslatable by
   construction. The §4 work-queue vocabulary stays in `QUEUE_SHARED_EN`; this
   carries only what a conversation adds. */
/* A3 — the reason-code vocabulary. NOT a screen's copy and not the shell's
   either: the same `CAP_LATE` lands on a ticket, a complaint, a fairness case,
   a ledger posting, a refund and an audit line, so it is owned once and
   inherited, exactly as `QUEUE_SHARED_EN` is. See the module header for why the
   32 registry labels are duplicated here and what collapses that. */
/* The second family in the same module, and it is here for the same reason:
   `Rider.churnReason` and `RiderTimelineEvent.kind` are minted by
   `clients/riders.ts` and rendered by BOTH the rider side sheet and the
   full-page rider profile. `types/rider.ts` names the defect that follows from
   letting either screen declare them — *"`RDR-4002` would carry two different
   explanations of one badge on two surfaces of the same record."* */
import { DRIVER_VOCABULARY_EN, RIDER_VOCABULARY_EN, VOCABULARY_EN } from './vocabulary/copy'
/* G5 — the shared confirmation's own string. `ConfirmDialog` renders on every
   workspace, so its `Cancel` cannot live in one screen's namespace; the
   component owns it, exactly as `components/profile/copy.ts` owns the profile's.
   Everything else on that modal is supplied per act by the caller. */
import { CONFIRM_EN } from '@/components/confirmCopy'
/* The 360° profile's twelve section renderers and its right rail. It is a
   COMPONENT directory rather than a screen because two surfaces render it —
   the `?entity=` drawer and `/entity/:entityId` — and a dictionary living
   under either one would make the other a second home for the same string. */
import { PROFILE_EN } from '@/components/profile/copy'
/* The 360° profile's RIDER presentation. A second dictionary beside
   `PROFILE_EN` rather than more keys inside it: the sheet is one arrangement of
   the profile's facts and it owns only the strings that arrangement needs — the
   band's `Joined {date}`, the rail's block labels, the tab names. Everything it
   shares with the card stack (`profile.section.*`, `profile.field.*`) it
   consumes from `PROFILE_EN` and does not restate. */
import { RIDER_PROFILE_EN } from '@/components/profile/rider/copy'
/* The rider FULL PAGE's own strings — the back affordance, the three-up strip's
   two labels and the movements table's furniture. It restates nothing
   `RIDER_PROFILE_EN` already says; its header lists what it reads instead. */
import { ENTITY_RIDER_EN } from '@/screens/entity/copy'
/* The 360° profile's CAPTAIN presentation, and its full page. Two dictionaries
   for the same reason the rider has two: everything that names a fact about a
   captain is in `DRIVER_PROFILE_EN` and is rendered by BOTH surfaces, and
   `ENTITY_DRIVER_EN` holds only what a page has and a sheet does not — a back
   affordance that names a route, and a ledger table's furniture. Neither
   restates anything `PROFILE_EN` already says. */
import { DRIVER_PROFILE_EN } from '@/components/profile/driver/copy'
import { ENTITY_DRIVER_EN } from '@/screens/entity/DriverCopy'
/* The 360° profile's REQUEST presentation — the sheet a Requests row opens.
   One dictionary and no full-page twin: `/entity/REQ-*` renders the generic
   card stack, whose strings are `PROFILE_EN`'s. Its header lists the six key
   families it reuses rather than restates, `requests.route` chief among them —
   that key carries the arrow, and the Arabic entry carries `←`. */
import { REQUEST_PROFILE_EN } from '@/components/profile/request/copy'
/* The 360° profile's SUBSCRIPTION presentation. Small on purpose: a commitment
   sheet and a request sheet are the same shape, so it reuses the request's map
   and panel vocabulary and mints only what a commitment alone has — its legs,
   its cycle window, its escrow and the direction of the daily leg. */
import { SUBSCRIPTION_PROFILE_EN } from '@/components/profile/subscription/copy'
/* The 360° profile's TRIP presentation — the ride sheet a trips row opens, and
   the ride page behind `Open full record`. **One dictionary for both**, because
   they are two arrangements of one record; a second would be a second chance
   for them to call the same thing by two names. It restates nothing from
   `TRIPS_EN` — the status words, the flag label and the kind nouns are already
   there and are read from there, so a trip's status cannot be spelled one way
   on the table and another on the record. */
import { TRIP_PROFILE_EN } from '@/components/profile/trip/copy'
/* P6-T4 — Admin › Data & Compliance. Carries the `integrity.check.*` and
   `integrity.detail.*` families the DATA layer emits as `LocalisedText`: a
   finding crosses the seam as a key plus params and is worded here, so
   re-phrasing one never means editing a scan function. */
/* P6-T5 / P6-T1 / P4-T1 — the three Admin sub-tabs rebuilt in this round.
   `ADMIN_TEAM_EN` and `ADMIN_WORKSPACE_EN` each carry the `admin.audit.*`
   family their client emits as `LocalisedText`; `i18n/localisedKeys.test.ts`
   fails the build if one is minted in `src/data` and missing here. */

/* The PWA layer's four install-affordance strings (`docs/ref/pwa.md`, P1). It
   adds no offline-banner copy: `state.offline.message`, `state.feedDead.message`
   and `state.feedStale.freshness` above already say those things, and the
   offline surface is a new condition on the existing `ShellBanner` rather than
   a new block of strings. See `src/pwa/copy.ts`. */
import { PWA_EN } from '@/pwa/copy'
/*
 * **These four stay, and the reason is the command palette.**
 *
 * ⌘K is a SHELL surface. It renders every domain's command labels and refusal
 * sentences through the shell translator, so a registry's copy has to be
 * resolvable without that registry's screen being mounted — `people.action.suspend`
 * is read while the operator is looking at Financials.
 *
 * The five domains with a command registry therefore keep their dictionaries
 * here. Every other screen's copy travels in its own chunk; see the note above
 * `EN`. The proper fix is to move the command-facing keys into
 * `commands/copy.ts`, which is where the palette's own vocabulary already
 * lives — a rename across five files, and out of scope for a bundle change.
 */
import { PEOPLE_EN } from '@/screens/operations/people/copy'
import { TICKETS_EN } from '@/screens/support/tickets/copy'
import { TRIPS_EN } from '@/screens/operations/trips/copy'
import { SUBSCRIPTIONS_EN } from '@/screens/operations/subscriptions/copy'
import { ADMIN_ACTIVITY_EN } from '@/screens/admin/activity/copy'
import { ADMIN_DATA_EN } from '@/screens/admin/data/copy'
import { ADMIN_TEAM_EN } from '@/screens/admin/team/copy'
import { ADMIN_WORKSPACE_EN } from '@/screens/admin/workspace/copy'
import { ASSURANCE_EN } from '@/screens/operations/assurance/copy'
import { CONVERSATIONS_EN } from '@/screens/support/inbox/copy'
import { INBOX_EN } from '@/screens/support/inbox/copy'
import { DISPUTES_EN } from '@/screens/support/disputes/copy'
import { FAIRNESS_EN } from '@/screens/support/fairness/copy'
import { MY_WORK_EN } from '@/screens/operations/my-work/copy'
import { OVERVIEW_EN } from '@/screens/metrics/copy'
import { POLICY_EN } from '@/screens/admin/policy/copy'
import { REPORTS_EN } from '@/screens/reports/copy'
import { REQUESTS_EN } from '@/screens/operations/requests/copy'
import { SAFETY_EN } from '@/screens/support/safety/copy'
import { SUPPORT_DESK_EN } from '@/screens/support/desk/copy'
import { ZONES_EN } from '@/screens/management/zones/copy'
import { GROWTH_EN } from '@/screens/metrics/growth/copy'
/* Arabic, whole. One module per English dictionary; see `./ar/index.ts`. */
import { AR } from './ar'

/* ───────────────────────── workspaces (§2.2) ───────────────────────── */

const workspaces: Dictionary = {
  'workspace.management': 'Management',
  'workspace.operations': 'Operations',
  'workspace.financials': 'Financials',
  /* DataTable and its header cell are shared components, not a screen, so their
     strings live here rather than in any one screen's copy.ts. Both were
     `defaultValue` literals inside the component - unreachable by an extractor
     and unreachable by the copy tests. */
  'table.scrollMore': 'Scroll for more',
  'table.resizeColumn': 'Drag to resize, double-click to reset',
  /* **The permission's NAME, as distinct from its capability sentence.**
     `account.permission.<key>` holds what the permission lets you DO
     ("Dispatch trips and act on live requests") - a sentence, which cannot be
     quoted inside `the “…” permission` without reading as a paste. A refusal
     needs a short noun phrase instead.

     Before this, `RouteStates.tsx` and `DispatchScreen.tsx` interpolated the raw
     KEY, so an operator read: *This page needs the “live_ops” permission.*
     Arabic terms are specified alongside in
     `design/21-voice-refusals-and-permission-names.md`, every one reusing an
     existing ruling from `20-arabic-glossary.md`. */
  'perm.view_analytics.name': 'Management access',
  'perm.view_operations.name': 'Operations access',
  'perm.view_finance.name': 'Financials access',
  'perm.view_support.name': 'Support access',
  'perm.view_admin.name': 'Admin access',
  'perm.view_profiles.name': 'Profile access',
  'perm.approve_drivers.name': 'Captain applications',
  'perm.manage_subscriptions.name': 'Subscription control',
  'perm.live_ops.name': 'Live dispatch',
  'perm.manage_plans.name': 'Plans and pricing',
  'perm.process_payouts.name': 'Captain payouts',
  'perm.release_escrow.name': 'Escrow release',
  'perm.apply_deductions.name': 'Captain deductions',
  'perm.manage_tickets.name': 'Ticket handling',
  'perm.contact_users.name': 'Contact users',
  'perm.manage_team.name': 'Team administration',
  'perm.manage_ops_policy.name': 'Operational policy',
  'perm.manage_workspace.name': 'Workspace settings',
  'perm.manage_data_governance.name': 'Data governance',
  'perm.manage_security_policy.name': 'Security policy',
  'perm.manage_settings.name': 'Legacy settings',
  'workspace.support': 'Customer Support',
  'workspace.admin': 'Admin',

  /* §2.2 (amended, D5) — THE RAIL'S OWN LABELS, and they are also the tiles'
     ACCESSIBLE NAMES.

     The old arrangement rendered a short label with the full name in
     `aria-label`, and justified it under WCAG 2.5.3 (Label in Name) because
     "Customer Support" contains "Support". That justification does not survive
     `Ops` — "Operations" does not contain it — so the split is gone and the
     short word is simply what the tile is called, visible and accessible alike.

     The full name is not lost. `workspace.*` above is what the level-2 column
     heading, the top-bar `Title › Subtitle` pair and global search all use, so
     an operator who needs "Customer Support" spelled out reads it one column to
     the inline-end of the tile they just clicked.

     Every one is ≤ 7 characters, which is what keeps `truncate` from ever
     firing at the 88px rail width. `nav.workspace.support.short` is retired. */
  'nav.rail.management': 'Exec',
  'nav.rail.operations': 'Ops',
  'nav.rail.financials': 'Finance',
  'nav.rail.support': 'Support',
  'nav.rail.admin': 'Admin',
}

/* ───────────────── the 34 sub-tabs, spec §3.4 (§3.1) ───────────────── */

/* Titles are spec §3.4's display names, verbatim.
   SUBTITLES ARE NOT SPECIFIED ANYWHERE — not in the design spec, not in
   §3.4, not in `patterns.md`. They are derived here from §3.4's own
   "contributing legacy pages" column and from the two the design spec does
   state (Live Dispatch, §7.4; People, §7.1). Flagged to product-designer as
   provisional: a subtitle is copy and copy is not mine. A null subtitle
   renders NOTHING — no orphan separator (§4 slot 2). */
const subTabs: Dictionary = {
  // Management — 5
  'subtab.management.overview': 'Overview',
  'subtab.management.overview.sub': 'The whole business on one screen',
  'subtab.management.performance': 'Performance',
  'subtab.management.risk': 'Risk & Signals',
  'subtab.management.risk.sub': 'Predicted churn, supply gaps and fraud flags',
  'subtab.management.growth': 'Growth',
  'subtab.management.growth.sub': 'Promotions, referrals and captain incentives',
  'subtab.management.zones': 'Market & Zones',
  'subtab.management.zones.sub': 'Coverage, demand and expansion-ready cities',
  'subtab.management.reports': 'Reports',
  'subtab.management.reports.sub': 'Build a report, pin it to a dashboard, alert on it',

  // Operations — 9
  'subtab.operations.overview': 'Overview',
  'subtab.operations.overview.sub': 'Where the shift stands right now',
  'subtab.operations.myWork': 'My Work',
  'subtab.operations.myWork.sub': 'Everything assigned to you, oldest first',
  'subtab.operations.dispatch': 'Live Dispatch',
  'subtab.operations.dispatch.sub': 'Track active trips, watch requests, and step in when needed',
  'subtab.operations.rideRequests': 'Ride requests',
  'subtab.operations.rideRequests.sub': 'One-off rides waiting on a captain',
  'subtab.operations.subscriptionRequests': 'Subscription requests',
  'subtab.operations.subscriptionRequests.sub': 'Plan trips waiting to be matched by hand',
  'subtab.operations.subscriptions': 'Subscriptions',
  'subtab.operations.subscriptions.sub': 'Active plans, renewals and cancellations',
  'subtab.operations.corporate': 'Corporate Accounts',
  'subtab.operations.corporate.sub': 'Company accounts, employees and usage policy',
  'subtab.operations.quickRides': 'Quick rides',
  'subtab.operations.quickRides.sub': 'One-off journeys, and the ones that went wrong',
  'subtab.operations.subscriptionTrips': 'Subscription trips',
  'subtab.operations.subscriptionTrips.sub':
    'Journeys taken against a standing plan, and the ones that went wrong',
  'subtab.operations.assurance': 'Trip Assurance',
  'subtab.operations.assurance.sub': 'Departures at risk of having no captain',
  'subtab.operations.people': 'People',
  'subtab.operations.people.sub': 'Captains and riders, from application to compliance',

  // Financials — 7
  'subtab.financials.overview': 'Overview',
  'subtab.financials.overview.sub': 'Money in, money out, money held',
  'subtab.financials.revenue': 'Revenue & Refunds',
  'subtab.financials.revenue.sub': 'Earned revenue, refunds and credit notes',
  'subtab.financials.payouts': 'Payouts & Escrow',
  'subtab.financials.payouts.sub': 'Captain payouts, escrow releases and deductions',
  'subtab.financials.cash': 'Cash & Captain Debt',
  'subtab.financials.cash.sub': 'Cash collected, reconciled and still owed',
  'subtab.financials.riderWallets': 'Rider Wallets',
  'subtab.financials.riderWallets.sub': 'Rider balances, goodwill credits and holds',
  'subtab.financials.pricing': 'Pricing & Plans',
  'subtab.financials.pricing.sub': 'Subscription plans, rate card and cancellation fees',
  'subtab.financials.ledger': 'Ledger & Payment Controls',
  'subtab.financials.ledger.sub': 'Chart of accounts, gateways, VAT and invoicing',

  // Customer Support — 6
  'subtab.support.overview': 'Overview',
  'subtab.support.overview.sub': 'What riders and captains are asking for',
  'subtab.support.tickets': 'Tickets',
  'subtab.support.tickets.sub': 'Every open conversation, by state',
  'subtab.support.disputes': 'Disputes & Claims',
  'subtab.support.disputes.sub': 'Contested charges and lost property',
  'subtab.support.fairness': 'Captain Fairness',
  'subtab.support.fairness.sub': 'Appeals, rating disputes and captain economics',
  'subtab.support.safety': 'Safety & Incidents',
  'subtab.support.safety.sub': 'SOS calls, incidents and their outcomes',
  'subtab.support.contactCentre': 'Contact Centre',
  'subtab.support.contactCentre.sub': 'Who is reachable, and on which channel',

  // Admin — 7
  'subtab.admin.overview': 'Overview',
  'subtab.admin.overview.sub': 'Team, integrity and data governance at a glance',
  'subtab.admin.workspace': 'Workspace',
  'subtab.admin.workspace.sub': 'Company details, branding, language and legal documents',
  'subtab.admin.team': 'Team & Access',
  'subtab.admin.team.sub': 'Operators, roles, permissions and the on-call rota',
  'subtab.admin.policy': 'Operational Policy',
  'subtab.admin.policy.sub': 'Dispatch rules, cities, limits and reason codes',
  'subtab.admin.communications': 'Communications',
  'subtab.admin.communications.sub': 'Notifications, push messages and email',
  'subtab.admin.data': 'Data & Compliance',
  'subtab.admin.data.sub': 'Integrity checks, exports, retention and erasure',
  'subtab.admin.activity': 'Activity Log',
  'subtab.admin.activity.sub': 'Every action taken in this workspace',
}

/* ────────── index views — controls, not levels (spec §3.8 r3) ────────── */

const views: Dictionary = {
  'view.myWork.mine': 'Mine',
  'view.myWork.handed': 'Handed to me',
  'view.myWork.unassigned': 'Unassigned',
  'view.myWork.everything': 'Everything',

  'view.requests.all': 'All',
  'view.requests.instant': 'Instant',
  'view.requests.subscription': 'Subscription',
  'view.requests.needsDecision': 'Needs a decision',
  'view.requests.assigned': 'Assigned',
  'view.requests.expired': 'Expired',

  'view.subscriptions.all': 'All',
  'view.subscriptions.active': 'Active',
  'view.subscriptions.expiring7d': 'Expiring ≤ 7 days',
  'view.subscriptions.atRisk': 'At risk',
  'view.subscriptions.frozen': 'Frozen',

  'view.trips.all': 'All',
  'view.trips.quickRides': 'Quick rides',
  'view.trips.subscriptionLegs': 'Subscription legs',
  'view.trips.flagged': 'Flagged',
  'view.trips.lowRating': 'Low rating',
  'view.trips.routeHistory': 'Route history',

  'view.assurance.departing24h': 'Departing next 24 h',
  'view.assurance.noBackupCaptain': 'No backup captain',
  'view.assurance.awaitingConfirmation': 'Awaiting confirmation',
  'view.assurance.absences': 'Absences',

  'view.people.captains': 'Captains',
  'view.people.applications': 'Applications',
  'view.people.compliance': 'Compliance',
  'view.people.riders': 'Riders',

  'view.pricing.subscriptionPlans': 'Subscription plans',
  'view.pricing.quickRides': 'Quick rides',
  'view.pricing.rateCard': 'Rate card',
  'view.pricing.cancellationFees': 'Cancellation fees',

  'view.tickets.unassigned': 'Unassigned',
  'view.tickets.mine': 'Mine',
  'view.tickets.open': 'Open',
  'view.tickets.waiting': 'Waiting',
  'view.tickets.done': 'Done',

  'view.disputes.disputes': 'Disputes',
  'view.disputes.decided': 'Decided',
  'view.disputes.lostAndFound': 'Lost & found',

  'view.fairness.suspensionAppeals': 'Suspension appeals',
  'view.fairness.ratingDisputes': 'Rating disputes',
  'view.fairness.riderReports': 'Rider reports',
  'view.fairness.captainEconomics': 'Captain economics',

  'view.safety.open': 'Open',
  'view.safety.all': 'All',
  'view.safety.critical': 'Critical SOS',
  'view.safety.closed': 'Closed',

  'view.communications.inbox': 'Inbox',
  'view.communications.outbox': 'Outbox',
  'view.communications.senders': 'Sender identities',
  'view.communications.templates': 'Templates',
  'view.communications.push': 'Push',

  /* D20's Admin panes, as views (§2.4 through D-5: the sub-tab column is the
     settings nav, so a pane is a `?view=` and never a third nav pattern). */
  'view.workspace.general': 'General',
  'view.workspace.branding': 'Branding',
  'view.workspace.legal': 'Legal',
  'view.workspace.integrations': 'Integrations',
  'view.team.operators': 'Operators',
  'view.team.roles': 'Roles & permissions',
  'view.team.overrides': 'Overrides',
  'view.team.sessions': 'Sessions & devices',
  'view.team.security': 'Security policy',
  'view.team.oncall': 'On-call',
  'view.policy.dispatch': 'Dispatch',
  'view.policy.cities': 'Cities',
  'view.policy.limits': 'Limits',
  'view.policy.sla': 'SLA targets',
  'view.policy.reasons': 'Reason codes',
  'view.data.integrity': 'Integrity checks',
  'view.data.retention': 'Retention & erasure',
  'view.data.exports': 'Exports',
  'admin.panes': 'Sections',
  /* `AccessPreview`: the router's own answer to "what will they see" (AC-924). */
  'access.preview.title': 'What they will see',
  'access.preview.full': 'Read and act',
  'access.preview.view': 'Read only',
  'access.preview.none': 'Nothing. This set opens no workspace.',

  'view.activity.byActor': 'By actor',
  'view.activity.byAction': 'By action',
  'view.activity.byEntity': 'By entity',
}

/* ─────────────── level-3 routes and the three shell layers ─────────────── */

const routes: Dictionary = {
  'route.corporate.detail': 'Corporate account',
  'route.people.applicantDetail': 'Application',
  'route.tickets.detail': 'Ticket',
  'route.disputes.detail': 'Claim',
  'route.safety.detail': 'Incident',
  'route.fairness.detail': 'Case',
  'route.contacts.conversation': 'Conversation',
  'route.pricing.planEditor': 'Edit plan',
  'route.pricing.planCreate': 'New plan',
  'route.pricing.quickRideEditor': 'Edit class',
  'route.pricing.quickRideCreate': 'New class',

  'shellLayer.profile': 'Profile',
  'shellLayer.notifications': 'Notifications',
  'shellLayer.account': 'My profile',
  /* The fourth layer. `SHELL_LAYERS` has carried `titleKey:
     'shellLayer.onboarding'` since the row was minted (`routeTable.ts:894`);
     this side of the pair was never written, so the layer's own title was the
     one string on it that could throw. `t()` raises on a missing key in dev
     (AC-74), which is why nobody saw a raw key — they saw an exception, from a
     surface that opens off the account menu for every operator and every role.

     Found by a dictionary sweep, not by use, and that is the point: three
     sibling keys sitting right here made the gap look filled. */
  'shellLayer.onboarding': 'Getting started',
}

/* ──────────────────── the shell chrome, §2 – §6 ──────────────────── */

const shell: Dictionary = {
  /* §11.6, the two strings the shell owns outright. */
  'shell.skipToContent': 'Skip to content',
  'shell.truncated': 'Showing {shown} of {total} {noun}.',

  /* §2.5 — one control, one fixed position, two states. */
  'shell.nav.showSubTabs': 'Show sub-tabs',
  'shell.nav.hideSubTabs': 'Hide sub-tabs',
  'shell.nav.pinSubTabs': 'Keep sub-tabs open',
  'shell.nav.subTabsFor': 'Sub-tabs for {workspace}',
  'shell.nav.workspaces': 'Workspaces',

  /* ── The phone shell's off-canvas navigation, 2026-09-02 ──────────────
     Three keys, added with the phone shell under the owner's viewport
     ruling. Below `--ev-bp-phone` the rail and the sub-tab column are not on
     screen, so a control has to bring them back and a screen reader has to be
     able to name what it opened.

     **PROVISIONAL COPY, and flagged as such.** Copy is the content-designer's
     and these three strings have not been through them. They are here rather
     than absent because the alternative to provisional copy on an icon-only
     button is an unnamed button, which is a WCAG 4.1.2 failure rather than a
     wording opinion. `Navigation` is the noun the two `<nav>` landmarks
     already carry to a screen reader, so the control and the thing it opens
     agree; if the content-designer prefers `Menu`, all three move together. */
  'shell.nav.openMenu': 'Open navigation',
  'shell.nav.closeMenu': 'Close navigation',
  'shell.nav.menu': 'Navigation',
  /* §2.4 — a count badge above 99 reads `99+`, and never a `0` (AC-26). */
  'shell.nav.countOverflow': '99+',

  /* **O8** — the accessible name of a nav count badge: what it counts, in the
     words the sub-tab's own default view uses. `nav.count.other` is the
     fallback for a sub-tab that grows a backlog before it grows a sentence. */
  'nav.count.other': '{count} open items',
  'nav.count.management-risk': '{count} open risk signals',
  'nav.count.management-zones': '{count} supply-starved zones',
  'nav.count.operations-my-work': '{count} items in your work',
  'nav.count.operations-ride-requests': '{count} open ride requests',
  'nav.count.operations-subscription-requests': '{count} open subscription requests',
  'nav.count.operations-subscriptions': '{count} subscriptions',
  'nav.count.operations-corporate': '{count} corporate accounts awaiting approval',
  'nav.count.operations-assurance': '{count} legs with no backup captain',
  'nav.count.operations-people': '{count} captains',
  'nav.count.financials-payouts': '{count} payout batches',
  'nav.count.financials-cash': '{count} cash escalations',
  'nav.count.support-tickets': '{count} open tickets',
  'nav.count.support-disputes': '{count} open disputes',
  'nav.count.support-fairness': '{count} open fairness cases',
  'nav.count.support-safety': '{count} open incidents',
  'nav.count.support-contact-centre': '{count} open conversations',
  'nav.count.admin-team': '{count} operators who have never signed in',
  'nav.count.admin-data': '{count} erasure requests past their deadline',
  /* Plural families. The count governs a noun, so it governs the sentence:
     `1 items need attention` in English and a wrong noun form in Arabic at
     every count but one. `Intl.PluralRules` picks the form (`plural.ts`). */
  'shell.nav.backlog#one': '{count} item needs attention',
  'shell.nav.backlog#other': '{count} items need attention',

  /* §4 — the top bar, slot by slot. */
  'shell.topbar.back': 'Back',
  /* The `i` beside a label (X15). One accessible name for every hint, naming
     the ACTION and not the field, which the label beside it already announces. */
  'shell.hint.show': 'What this means',
  'shell.topbar.search': 'Search',
  'shell.topbar.searchShortcut': '⌘ K',
  'shell.topbar.searchShortcutWin': 'Ctrl K',
  'shell.topbar.notifications': 'Notifications',
  'shell.topbar.account': 'Account',
  'shell.topbar.mine': 'Mine',
  'shell.topbar.mineA11y#one': 'Work assigned to you: {count} item',
  'shell.topbar.mineA11y#other': 'Work assigned to you: {count} items',
  'shell.topbar.onCall': 'On call: {name}',
  'shell.topbar.onCallUnassigned': 'On call: unassigned',
  'shell.presence.title': 'Your availability',
  'shell.presence.label': 'Availability: {state}',
  'shell.presence.online': 'Online',
  'shell.presence.away': 'Away',
  'shell.presence.offline': 'Offline',
  'shell.presence.toast.online': 'You are online',
  'shell.presence.toast.away': 'You are away',
  'shell.presence.toast.offline': 'You are offline',
  'shell.presence.handover.title': 'Hand over your chats?',
  'shell.presence.handover.body':
    'You hold {count} live chats. Hand them to a colleague who is online, or keep them; a kept chat stays yours until its claim goes stale.',
  'shell.presence.handover.to': 'Hand over to',
  'shell.presence.handover.choose': 'Choose a colleague',
  'shell.presence.handover.option': '{name}, {count} live',
  'shell.presence.handover.nobody': 'Nobody else is online. Keep the chats or stay on.',
  'shell.presence.handover.note': 'Handed over: the previous operator went offline.',
  'shell.presence.handover.cancel': 'Stay on',
  'shell.presence.handover.keep': 'Keep and go offline',
  'shell.presence.handover.confirm': 'Hand over and go offline',
  'shell.presence.handover.done': 'Handed {count} chats to {name}',
  'shell.presence.handover.failed': 'The handover did not complete. Your chats are still yours.',

  /* §4 — the account menu. Verb-first where they are actions. */
  'shell.account.myProfile': 'My profile',
  'shell.account.switchUser': 'Switch user',
  /* The submenu's own four states. An empty roster menu reads as "there is
     nobody else", which is a different claim from "the roster did not load". */
  'shell.account.switchLoading': 'Loading operators',
  'shell.account.switchError': "Operators couldn't be read",
  'shell.account.switchEmpty': 'No other operators',
  /* §11.2 — the reason, on a second line inside the disabled item. Switching
     against a real API is impersonation and needs an audited endpoint. */
  'shell.account.switchUnavailable': 'Only available against mock data',
  'shell.account.signOut': 'Sign out',

  /* §6.4 — the account layer's five sections. `password` and `twoFactor`
     rendered `state.cardError.message` on a layer where nothing had failed;
     these are the strings that replaced it. */
  'account.section.profile': 'Profile',
  'account.section.password': 'Password',
  'account.section.twoFactor': 'Two-step verification',
  'account.section.sessions': 'Active sessions',
  'account.section.permissions': 'What your role can do',

  /* Verb-first, and specific: §5.7 wants the verb of the thing, not `Edit`. */
  'account.action.password': 'Change password',
  'account.action.twoFactor': 'Re-enrol',

  'account.field.role': 'Role',
  'account.field.permissionCount': 'Permissions',
  'account.field.permissionSummary': '{granted} of {total} granted',
  'account.field.lastLogin': 'Last signed in',
  /* The team record could not be read. Distinct from `never signed in`, which
     is a fact about the operator rather than about the request. */
  'account.field.unavailable': "Couldn't be read",
  'account.field.neverSignedIn': 'Not yet',

  /* The one real commit in this layer. `requestPasswordReset` answers the same
     way for every address (§6.2), so the confirmation says a link was sent and
     never whether it landed. */
  'account.password.resting': 'Change your password by email.',
  'account.password.expanded': 'A reset link goes to {email}. The link expires in 60 minutes.',
  'account.password.consequence':
    'You stay signed in here. Your other sessions end when the new password is set.',
  'account.password.send': 'Send reset link',
  'account.password.sent': 'Reset link sent to {email}',

  /* §11.2 — the refusal is a sentence naming what is missing and what the
     operator can do instead. It is rendered as text beside the disabled
     control, never as a tooltip. */
  'account.twoFactor.reenrol': 'Re-enrol',
  'account.twoFactor.blocked':
    'Re-enrolling needs your password proved again, which only happens at sign in. Sign out and back in to change your second factor.',
  'account.twoFactor.error': "Couldn't load your second factor.",
  /* `secondFactor: null` is enrolment PENDING, not opted out — the console
     requires a second factor and no setting turns it off (§4.2). */
  'account.twoFactor.pending': 'No second factor is enrolled yet. You will be asked to enrol at your next sign in.',
  'account.twoFactor.enrolled': 'Enrolled',
  'account.twoFactor.method.sms': 'Text message',
  'account.twoFactor.method.totp': 'Authenticator app',

  /* The thirteen. All of them render, held or not: a list of only the granted
     ones answers "what can I do" and not "why can I not do this", and the
     second question is the one that brings an operator to this card. */
  'account.permission.granted': 'Granted',
  'account.permission.withheld': 'Not granted',
  /* The five workspace READ keys D17 minted. `view_finance` already was one. */
  'account.permission.view_analytics': 'See the Management workspace',
  'account.permission.view_operations': 'See the Operations workspace',
  'account.permission.view_finance': 'See the Financials workspace',
  'account.permission.view_support': 'See the Customer Support workspace',
  'account.permission.view_admin': 'See the Admin workspace',
  'account.permission.view_profiles': 'Open 360° profiles and see personal details',
  /* Write keys. */
  'account.permission.approve_drivers': 'Approve and reject captain applications',
  'account.permission.manage_subscriptions': 'Freeze, cancel and reassign subscriptions',
  'account.permission.live_ops': 'Dispatch trips and act on live requests',
  'account.permission.manage_plans': 'Edit plans, pricing and cancellation rules',
  'account.permission.process_payouts': 'Pay captains and record repayments',
  'account.permission.release_escrow': 'Release plan escrow',
  'account.permission.apply_deductions': 'Apply and waive captain deductions',
  'account.permission.manage_tickets': 'Claim, reply to and resolve tickets',
  'account.permission.contact_users': 'Message riders and captains',
  'account.permission.manage_team': 'Invite operators and change their roles',
  'account.permission.manage_ops_policy': 'Set dispatch radius, cities, limits and SLA policy',
  'account.permission.manage_workspace': 'Change branding, legal text and communications',
  'account.permission.manage_data_governance': 'Run retention, erasure, integrity and exports',
  'account.permission.manage_security_policy': 'Set second-factor and session policy',
  /* @deprecated D17 — retired and Owner-only, and it gates no row. It is listed
     because it is still a member of the union and the summary lists the union;
     the label says what it now means rather than what it used to do. */
  'account.permission.manage_settings': 'Legacy settings access (being retired)',

  /* §11.6 row 23 `language-switching` — the control that fires it.
     `shell.account.language` is a GROUP HEADING, not an action, so it is a
     noun and not verb-first (§5.7 governs commands, and this is a label).
     The two language names are the SAME KEYS the toast interpolates, so
     "Interface language set to Arabic" and the menu item an operator just
     chose can never disagree — and when `AR` is filled they both become the
     endonym in the same edit. AC-75: named placeholder, one key, no
     concatenation. */
  'shell.account.language': 'Language',
  'shell.language.en': 'English',
  'shell.language.ar': 'Arabic',

  /* The colour theme. `System` names what it follows rather than what it
     currently shows — an operator choosing it is choosing to be governed by
     their machine, and a label reading `Automatic` would leave them guessing
     what is automatic about it. */
  'shell.account.theme': 'Theme',
  'shell.theme.system': 'Match my system',
  'shell.theme.light': 'Light',
  'shell.theme.dark': 'Dark',

  /* §4.1 — the save bar. */
  'shell.saveBar.dirty': 'Unsaved changes',
  'shell.saveBar.dirtyEntity': 'Unsaved {entity}',
  'shell.saveBar.discard': 'Discard',
  'shell.saveBar.save': 'Save',
  'shell.saveBar.saving': 'Saving',

  /* §5 — global search. */
  'shell.search.placeholder': 'Type a command, a name or an ID',
  'shell.search.destinations': 'Destinations ({count})',
  'shell.search.records': 'Records ({count})',
  'shell.search.actions': 'Actions ({count})',
  'shell.search.escapeHatch': 'Search for "{query}" in {scope}',
  'shell.search.escapeHatchUnscoped': 'Search for "{query}"',
  'shell.search.scopedPrompt': 'Search {scope}',
  'shell.search.prompt': 'Search captains, trips, plans and pages',
  'shell.search.noMatch': 'No matches for "{query}".',
  /* **A failed read is not "no matches".** The two are opposite instructions:
     one says the spelling is wrong, the other says the request never got an
     answer. AC-39 — imperative, names the fix, no blame and no `failed`. */
  'shell.search.error': "Search didn't answer. Nothing was searched.",
  'shell.search.retry': 'Try again',
  /* Labels the skeleton's busy region. Never rendered as visible copy. */
  'shell.search.searching': 'Searching',
  'shell.search.removeScope': 'Remove {scope} scope',
  'shell.search.everywhere': 'everywhere',

  /* §6.3 — the bell preview. */
  'shell.notifications.title': 'Notifications',
  'shell.notifications.seeAll': 'See all',
  'shell.notifications.endOfList': 'No more notifications',
  'shell.notifications.noUnread': 'No unread notifications.',
  /* `shell.notifications.markAllRead` — the count-less version — is GONE, not
     kept beside its replacement: an orphan key carries an Arabic string for
     nothing and the next reader cannot tell which of the two is live. */
  'shell.notifications.unreadCount': '{count} unread',
  /* §6.3 — the bell popover's own unread chip. It rendered `{unread} new` as a
     hardcoded English template with a raw JS numeral beside it; the numeral now
     goes through `formatCount` and the word through this key. */
  'shell.notifications.newCount#one': '{count} new',
  'shell.notifications.newCount#other': '{count} new',
  /* §6.3 — the six filter chips. They rendered the raw `NotificationFilter` id
     (`all`, `unread`, `alert`, …) — untranslated English on a shell surface. */
  'shell.notifications.filter.all': 'All',
  'shell.notifications.filter.unread': 'Unread',
  'shell.notifications.filter.alert': 'Alerts',
  'shell.notifications.filter.ticket': 'Tickets',
  'shell.notifications.filter.payout': 'Payouts',
  'shell.notifications.filter.renewal': 'Renewals',
  'shell.notifications.filter.team': 'Team',
  'admin.notification.team.inviteAccepted': '{name} accepted the invitation and can sign in',
  'admin.notification.team.suspended': '{name} was suspended',
  'admin.notification.team.roleChanged': '{name} is now {role}',
  /* §6.3 — the four priority tiers as section headings. They rendered the raw
     `NotificationPriority` id under a CSS `capitalize`, which is a no-op in
     Arabic. */
  'shell.notifications.tier.critical': 'Critical',
  'shell.notifications.tier.high': 'High',
  'shell.notifications.tier.medium': 'Medium',
  'shell.notifications.tier.low': 'Low',
  /* §7.5 — the unread marker was colour and shape with no word. This is the
     word, visually hidden on the bell row and visible nowhere else. */
  'shell.notifications.unread': 'Unread',
  /* Read state is REVERSIBLE per row, not only in bulk: a notification with no
     destination was previously unreachable by `markNotificationRead` entirely. */
  'shell.notifications.markRead': 'Mark as read',
  /* **The visible label comes FIRST and whole; the row's title is appended.**
     This read `Mark "{title}" as read`, which threaded the title through the
     middle of the visible label — so the six characters an operator can see
     were not a contiguous run of the accessible name, and a voice-control user
     saying "click mark as read" matched nothing. WCAG 2.5.3 asks only that the
     visible label be CONTAINED in the name; it says nothing about where the
     rest goes, so the distinguishing half moves to the end and both halves
     keep their job. Same rule, same shape, in Arabic. */
  'shell.notifications.markReadA11y': 'Mark as read: {title}',
  /* The bulk action names the count, and renders DISABLED at zero rather than
     hidden (§11.2). */
  'shell.notifications.markAllReadCount': 'Mark all {count} as read',
  /* R8 — two empties, not one. `noUnread` is the `unread` filter at zero; this
     is the list itself being empty, which `noUnread` asserted wrongly. */
  'shell.notifications.empty': 'No notifications.',

  /* §8 slot 4b — the overflow trigger. A caret, not a chevron pair: §10.2
     reserves the stacked `⌃⌄` for a SELECT, and a dropdown button's single `⌄`
     is what distinguishes the two. Verb-first, sentence case, no punctuation. */
  'shell.moreActions': 'More actions',

  /* §6.1 — layer chrome. */
  'shell.layer.close': 'Close',
  'shell.layer.openFullProfile': 'Open full profile',
  'shell.layer.cancel': 'Cancel',
}

/* ───────── every shell state's final copy — design spec §11.6 ───────── */

const states: Dictionary = {
  /* 1 route-not-found */
  'state.notFound.title': "This page doesn't exist",
  'state.notFound.body': 'Check the address, or pick a sub-tab from the list.',
  'state.notFound.action': 'Go to overview',

  /* The generic sub-tab PLACEHOLDER — not a state, and deliberately not worded
     as one. `SubTabScreen`'s content branch used to render
     `state.cardError.message` on a SUCCESSFUL load, so a healthy page said
     "Couldn't load Performance." to the operator looking at it (V8). This is
     the honest replacement, and it disappears route by route as Phase 1 builds
     each sub-tab. */
  'state.placeholder.message': '{resource} is being built.',

  /* 2 route-forbidden */
  'state.forbidden.title': "You don't have access to this page",
  'state.forbidden.body':
    'This page needs the “{permission}” permission. An Owner can grant it in Admin › Team & Access.',
  'state.forbidden.action': 'Go to overview',

  /* 3 page-error */
  'state.pageError.title': "Couldn't load {resource}",
  /* §4.4 — "from the list", so the sentence points at something the operator
     can actually see. The column is always rendered now (D5), so it does. */
  'state.pageError.body':
    "The data didn't arrive. Try again, or pick another sub-tab from the list.",
  'state.pageError.action': 'Try again',

  /* 4 page-partial-failure */
  'state.rowError.message': "Couldn't {verb} this {object}.",
  'state.rowError.action': 'Try again',

  /* card-scoped error (§11.2, §4.5). The second clause exists because the
     first question an operator asks is whether their query survived. */
  'state.cardError.message': "Couldn't load {resource}. The filters are unchanged.",

  /* 8 save-failed — validation */
  'state.saveInvalid.title': 'To save this {entity}, {count} changes need to be made:',
  /* 9 save-failed — rejected */
  'state.saveRejected.title': "Couldn't save this {entity}",
  'state.saveRejected.body': 'Nothing was changed. Try again.',
  'state.saveRejected.action': 'Try again',

  /* 10 navigate-away-dirty */
  'state.leaveDirty.title': 'Leave without saving?',
  'state.leaveDirty.body':
    'Your changes to this {entity} will be lost. Anything you saved earlier is unaffected.',
  'state.leaveDirty.cancel': 'Cancel',
  'state.leaveDirty.confirm': 'Discard changes',

  /* 14 overlay-error */
  'state.overlayError.message': "Couldn't load this profile.",
  'state.overlayError.action': 'Try again',
  /* 15 overlay-not-found */
  'state.overlayNotFound.message': 'No record found for {id}.',

  /* 16 impersonating · 17 call-active · 20 offline · merged */
  'state.impersonating.message': 'You are acting as {name}.',
  'state.impersonating.action': 'Stop impersonating',
  'state.callActive.message': 'On a call with {name} · {duration}',
  'state.callActive.action': 'End call',
  'state.offline.message': "You are offline. Changes can't be saved until the connection returns.",
  'state.merged.message': '{count} conditions need your attention.',

  /* 18 feed-stale · 19 feed-dead */
  'state.feedStale.message': 'Live data stopped arriving {duration} ago.',
  'state.feedStale.action': 'Reconnect',
  'state.feedStale.freshness': 'Last update {duration} ago',
  'state.feedDead.message': 'Live data has stopped. What you see is from {time}.',
  'state.feedDead.action': 'Reconnect',
  'state.feedDead.header': 'Not receiving',

  /* 21 role-switched · 23 language-switching — toasts (R9, ≤60 chars) */
  'state.roleSwitched.toast': 'Now acting as {role}',
  'state.languageSwitched.toast': 'Interface language set to {language}',
  'state.userSwitched.toast': 'Now signed in as {name} · {role}',
  'state.userSwitched.failed': "Couldn't switch user",
  'state.navPinned.toast': 'Sub-tabs pinned open',

  /* P1-8 — the render-crash boundaries, route level and panel level.
     `ErrorBoundary.tsx` places them; §5.7 governs the words. No "Oops", no
     "Sorry", no exclamation mark, no "please", and no "something went wrong" —
     the body's job is to say what still works and what to press.

     The page body names the sub-tab list because that IS the way out: the
     boundary sits inside `<main>`, so the rail and the column beside it are
     untouched, and `state.pageError.body` already points there for the same
     reason. */
  'state.crashPage.title': "Couldn't display {resource}",
  'state.crashPage.titleGeneric': "Couldn't display this page",
  'state.crashPage.body':
    'The rest of the console is still working. Try again, or pick another sub-tab from the list.',
  'state.crashPage.action': 'Try again',
  'state.crashPage.escape': 'Go to overview',
  'state.crashCard.message': "Couldn't display {resource}. The rest of the page still works.",
  'state.crashCard.messageGeneric': "Couldn't display this panel. The rest of the page still works.",
  /* Development only — never rendered in a production build. Keyed anyway,
     because the rule is that a rendered string resolves through a key and
     "only developers see it" is how the first `defaultValue` gets written. */
  'state.crash.detail': 'Error detail',

  /* the shell's own boot error (§9.1) */
  'state.shellError.title': "Couldn't load your workspace",
  'state.shellError.body': "Your identity and permissions didn't arrive. Try again.",
  'state.shellError.action': 'Try again',
}

/* ────────────── table + state-component copy (§9.1, §11.1) ────────────── */

const table: Dictionary = {
  'table.selectRow': 'Select row',
  'table.selectAll': 'Select all rows on this page',
  'table.selectedCount': '{count} selected',
  'table.rowActions': 'More actions for {row}',
  'table.showing': 'Showing {from}–{to} of {total}',
  'table.previous': '‹ Previous',
  'table.next': 'Next ›',
  'table.learnMore': 'Learn more about {resource}.',
  'table.sort': 'Sort',
  'table.sortBy': 'Sort by',
  'table.search': 'Search',
  'table.cancel': 'Cancel',
  'table.saveAs': 'Save as',
  'table.clearAll': 'Clear all',
  'table.addFilter': 'Add filter',
  'table.filter': 'Filter',
  'table.clear': 'Clear',
  /* **D21's escape hatch.** The count is `formatCount(...)`, never `String(n)`,
     so a locale asking for Arabic-Indic digits gets them here too. */
  'table.bulk.selectEligible': 'Select only the {count} eligible',
  /* Only when two refused actions carry DIFFERENT sentences — one refusal, or
     several sharing a reason, renders unprefixed. The em dash is in the
     template rather than in JSX so a translator can make it `: ` or an Arabic
     colon; a concatenation here would not survive bidi. */
  'table.bulk.refusalLabelled': '{action} — {reason}',
  'table.columns': 'Columns',
  'table.openingBalance': 'Opening balance',
  'table.closingBalance': 'Closing balance',
  'table.balance': 'Balance',
  'table.pending': 'Pending',
  'table.sourceDocument': 'Go to {reference}',
  'table.noMatch': 'No {resource} match these filters.',
  'table.clearFilters': 'Clear all filters',
  'table.clearOneFilter': 'Clear {column} filter',
  'table.truncatedPostings': 'Showing {shown} of {total} postings.',

  /* ── per-column controls — 01-table-controls.md §13 ──────────────────
     Sentence case (copy.md rule 1). Menu items and buttons are VERBS
     (rule 2) and carry no period (rule 8). No exclamation marks and no
     emoji (rule 3). Errors are imperatives naming the fix (rule 4).

     `table.sortAscending` / `table.sortDescending` are REMOVED above.
     They were `Oldest first` / `Newest first` — DATE labels applied to
     every column, and `Oldest first` on a `Trips` column is nonsense
     (§5.4). The six pairs below are keyed off the column's `dataType`
     instead, which is what AC-88 asserts. */
  'table.column.menu': 'Column options for {column}',
  'table.column.filtered': '{label}: {value}',
  'table.column.hide': 'Hide column',
  'table.sort.textAsc': 'Sort A to Z',
  'table.sort.textDesc': 'Sort Z to A',
  'table.sort.numberAsc': 'Sort low to high',
  'table.sort.numberDesc': 'Sort high to low',
  'table.sort.dateAsc': 'Sort oldest first',
  'table.sort.dateDesc': 'Sort newest first',
  'table.sort.booleanAsc': 'Sort {trueLabel} first',
  'table.sort.booleanDesc': 'Sort {falseLabel} first',
  'table.sort.clear': 'Clear sort',
  'table.sort.active': 'Sorted by {column}',
  'table.pin.pin': 'Pin column',
  'table.pin.unpin': 'Unpin column',
  /* §7.2 — `PinRefusalReason` has exactly one value, so there is exactly
     one refusal sentence, and it never states the pixel figure the
     refusal object carries. */
  'table.pin.blocked': 'Not enough room to pin another column',
  /* The other two refusals the column popover can render. They exist because
     §11.2 asks a disabled control to say why, and `pinDisabled` was true for
     three distinct reasons while the operator was shown none of them. Same
     rule as above: state the condition, never the pixel figure. */
  'table.pin.hidden': 'Show this column before pinning it',
  'table.pin.unpinnable': 'This column cannot be pinned',

  'table.filter.open': 'Filter…',
  'table.filter.clear': 'Clear filter',
  'table.filter.remove': 'Remove the {column} filter',
  'table.filter.title': 'Filter by {column}',
  'table.filter.searchPlaceholder': 'Search {column}',
  'table.filter.optionSearch': 'Search options',
  'table.filter.any': 'Any',
  'table.filter.yes': 'Yes',
  'table.filter.no': 'No',
  'table.filter.from': 'From',
  'table.filter.to': 'To',
  'table.filter.lastDays': 'Last {days} days',
  'table.filter.apply': 'Apply',
  'table.filter.cancel': 'Cancel',
  'table.filter.rangeError': 'Enter a To value that is higher than From',
  'table.filter.noOptions': 'No options available',
  /* §11.7 — deliberately does not quote the query: a Latin query inside
     an Arabic sentence is a bidi hazard for zero benefit. */
  'table.filter.noOptionsMatch': 'No options match that search',
  /* AC-75 — one key per summary shape, never concatenation. */
  'table.filter.summary.multi': '{value} +{count}',
  'table.filter.summary.range': '{from}–{to}',
  'table.filter.summary.rangeFrom': '{from} and above',
  'table.filter.summary.rangeTo': '{to} and below',

  /* P3-12 — the label says what comes out, because `Export` alone leaves the
     operator to find out the format by opening the file. */
  'table.export': 'Export CSV',

  /* D16 `ui.density`. Two values and no third: `preferences.ts` records that a
     third would be a design decision rather than a schema one. */
  'table.density.title': 'Row density',
  'table.density.comfortable': 'Comfortable',
  'table.density.compact': 'Compact',

  'table.columns.title': 'Columns',
  'table.columns.toggleVisible': 'Show {column}',
  'table.columns.togglePin': 'Pin {column}',
  'table.columns.identityLocked': 'Always shown',
  'table.columns.reset': 'Reset columns',

  /* §13.6 — `aria-live="polite"`, through `useAnnounce`. **No toast fires
     for any of these**: R9/R10 spend a toast on a mutation of an object,
     and sorting a view mutates nothing. One line each, no period. */
  'table.announce.sortedAsc': 'Sorted by {column}, ascending',
  'table.announce.sortedDesc': 'Sorted by {column}, descending',
  'table.announce.sortCleared': 'Sort cleared',
  'table.announce.filterApplied': '{column} filtered',
  'table.announce.filterRemoved': '{column} filter removed',
  'table.announce.allFiltersCleared': 'All filters cleared',
  'table.announce.pinned': '{column} pinned',
  'table.announce.unpinned': '{column} unpinned',
  'table.announce.columnHidden': '{column} hidden',
  'table.announce.columnShown': '{column} shown',
  /* P3-12. Announced and never toasted: R9/R10 spend a toast on a mutation of
     an object, and an export mutates nothing. */
  'table.announce.exported': '{count} rows exported',
}

/* ─────────── the form vocabulary — `ui/field.tsx`, doc 14 G7 ─────────── */

/**
 * Four strings that belong to the field primitive rather than to any screen.
 * They live here because `ui/field.tsx` is a presentational primitive with no
 * access to a translator: the call site passes the localised node in.
 *
 * `field.optional` is §10.2's ONLY field marker. There is no required marker
 * and there are no asterisks in this product — a required field says nothing
 * and an optional one says so in words, which survives translation and is
 * readable by a screen reader without a legend.
 */
const form: Dictionary = {
  'field.optional': '(optional)',
  'field.copy': 'Copy {label}',
  'field.copied': '{label} copied',
  /* §4.4 layer (2). The count is the whole point: a banner that says "fix the
     errors" without saying how many is a banner the operator cannot plan
     against. Two keys, not a plural built by concatenation (AC-75). */
  'form.blocked.one': 'One field needs attention before you can save.',
  'form.blocked.many': '{count} fields need attention before you can save.',
}

/* ────────────────────────────── assembly ────────────────────────────── */

/**
 * `SLA_MESSAGES_EN` is merged HERE, at the dictionary module, not at the
 * provider — 0.4's recorded decision, restated because this is where it lands.
 * The provider takes ONE input; a dictionary assembled in two places is a
 * dictionary that disagrees with itself the first time a caller forgets a
 * merge. The keys are the same either way.
 *
 * `FILE_SIZE_MESSAGES_EN` lands the same way and for the same reason. Both are
 * `src/lib` families: a helper that encodes a rule owns the keys the rule needs,
 * because a unit built by concatenation at the call site is the defect (AC-75)
 * — `formatFileSize` exists because three screens had each answered `240 KB`
 * differently and one of them printed no unit at all.
 */
/*
 * **Every screen dictionary is still spread here, and removing them is BLOCKED —
 * not undone by accident. Read this before trying again.**
 *
 * The prize is real and measured: `EN` is needed synchronously by the shell, so
 * everything it imports is hoisted into the ENTRY chunk — **249 KB of UI copy,
 * about 69 KB gzip, in front of an operator before they open a single screen**,
 * including every string of the nineteen screens they will not visit.
 *
 * The architecture to reach is built and proven: **25 screens now read their own
 * `copy.ts` through `withFallback`**, so the copy is ready to travel in each
 * screen's own lazy chunk. That work is landed and green.
 *
 * What blocks the last step is that **shell surfaces resolve screen keys**:
 *
 *   - **⌘K** renders every domain's command labels and refusal sentences through
 *     the shell translator — `people.action.suspend` is read while the operator
 *     is looking at Financials.
 *   - The **report builder's** shareable `?q=` link resolves report copy before
 *     its screen has mounted.
 *   - `AC-14` reaches Dispatch copy from a shell assertion.
 *
 * Removing them was attempted and reverted: each removal surfaced another
 * shell-level consumer, and iterating toward green would have meant discovering
 * the list by breakage rather than by design.
 *
 * **The real fix is a key split, not a bundle change.** The command-facing keys
 * belong in `commands/copy.ts`, where the palette's own vocabulary already
 * lives, and the handful the shell resolves belong in a shared module. That is a
 * rename across a known set of files — a day of work with a design behind it,
 * and it should not be done by trial and error at the end of an unrelated pass.
 */
export const EN: Dictionary = {
  ...workspaces,
  ...subTabs,
  ...views,
  ...routes,
  ...shell,
  ...states,
  ...table,
  ...form,
  ...SLA_MESSAGES_EN,
  ...FILE_SIZE_MESSAGES_EN,
  ...DATE_MESSAGES_EN,
  ...COMMANDS_EN,
  ...ADMIN_ACTIVITY_EN,
  ...ADMIN_DATA_EN,
  ...ADMIN_TEAM_EN,
  ...ADMIN_WORKSPACE_EN,
  ...ASSURANCE_EN,
  ...CONVERSATIONS_EN,
  ...INBOX_EN,
  ...DISPUTES_EN,
  ...FAIRNESS_EN,
  ...MY_WORK_EN,
  ...OVERVIEW_EN,
  ...POLICY_EN,
  ...REPORTS_EN,
  ...REQUESTS_EN,
  ...SAFETY_EN,
  ...SUPPORT_DESK_EN,
  ...ZONES_EN,
  ...GROWTH_EN,
  ...PEOPLE_EN,
  ...TICKETS_EN,
  ...TRIPS_EN,
  ...SUBSCRIPTIONS_EN,
  /* After `COMMANDS_EN`, like every screen module: a screen owns its own
     strings, and the command registry reads them rather than redeclaring
     them (CM-2). */
  ...QUEUE_SHARED_EN,
  ...AUTH_EN,
  ...ONBOARDING_EN,
  ...PROFILE_EN,
  ...RIDER_PROFILE_EN,
  ...ENTITY_RIDER_EN,
  ...DRIVER_PROFILE_EN,
  ...ENTITY_DRIVER_EN,
  ...REQUEST_PROFILE_EN,
  ...SUBSCRIPTION_PROFILE_EN,
  ...TRIP_PROFILE_EN,
  ...FINANCIALS_EN,
  ...COMMUNICATIONS_EN,
  ...VOCABULARY_EN,
  ...RIDER_VOCABULARY_EN,
  ...DRIVER_VOCABULARY_EN,
  ...CONFIRM_EN,
  ...PWA_EN,
}

/**
 * Arabic. Assembled in `./ar/index.ts` from one module per English dictionary,
 * and re-exported here because every consumer already reads `AR` from this file.
 */
export { AR }

export const DICTIONARIES: Readonly<Record<Language, Dictionary>> = {
  en: EN,
  ar: AR,
}
