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
 * **`ar` IS DELIBERATELY EMPTY — read this before "finishing" it.** The
 * translation of 200 operator-facing strings is a content decision, not an
 * engineering one, and a half-Arabic console is what §9.3 describes as the
 * policy the rebuild exists to retire. An empty `ar` is also AC-74's own test
 * fixture: the shell must render entirely in English through it, with no raw
 * key anywhere. Arabic GEOMETRY and the Arabic FACE are independent of this
 * file — they key off `:root:lang(ar)` and the font stack — so `dir="rtl"` +
 * `lang="ar"` is fully reviewable today. Recorded in
 * `docs/05-restructure/build/00-shell.md` as an open item for product-designer.
 */

import type { Dictionary, Language } from '@/lib'
import { SLA_MESSAGES_EN } from '@/lib'

/* ───────────────────────── workspaces (§2.2) ───────────────────────── */

const workspaces: Dictionary = {
  'workspace.management': 'Management',
  'workspace.operations': 'Operations',
  'workspace.financials': 'Financials',
  'workspace.support': 'Customer Support',
  'workspace.admin': 'Admin',
  /* §2.2 — `Customer Support` shortens to `Support` IN THE RAIL ONLY, as a
     SEPARATE KEY, never a runtime truncation. Sixteen characters do not fit
     72px at 12px on one line, and truncating a nav label is not acceptable.
     The full name is what the level-2 heading, the tile's accessible name, the
     top-bar pair and global search all use. No other workspace needs one. */
  'nav.workspace.support.short': 'Support',
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

  // Operations — 9
  'subtab.operations.overview': 'Overview',
  'subtab.operations.overview.sub': 'Where the shift stands right now',
  'subtab.operations.myWork': 'My Work',
  'subtab.operations.myWork.sub': 'Everything assigned to you, oldest first',
  'subtab.operations.dispatch': 'Live Dispatch',
  'subtab.operations.dispatch.sub': 'Track active trips, watch requests, and step in when needed',
  'subtab.operations.requests': 'Requests',
  'subtab.operations.requests.sub': 'Ride requests waiting on a captain',
  'subtab.operations.subscriptions': 'Subscriptions',
  'subtab.operations.subscriptions.sub': 'Active plans, renewals and cancellations',
  'subtab.operations.corporate': 'Corporate Accounts',
  'subtab.operations.corporate.sub': 'Company accounts, employees and usage policy',
  'subtab.operations.trips': 'Trips',
  'subtab.operations.trips.sub': 'Every trip taken, and the ones that went wrong',
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
  'view.myWork.unassigned': 'Unassigned',
  'view.myWork.everything': 'Everything',

  'view.requests.all': 'All',
  'view.requests.instant': 'Instant',
  'view.requests.subscription': 'Subscription',
  'view.requests.pending': 'Pending',
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

  'view.tickets.open': 'Open',
  'view.tickets.inProgress': 'In progress',
  'view.tickets.waiting': 'Waiting',
  'view.tickets.resolved': 'Resolved',
  'view.tickets.byReasonCode': 'By reason code',

  'view.disputes.disputes': 'Disputes',
  'view.disputes.lostAndFound': 'Lost & found',

  'view.fairness.suspensionAppeals': 'Suspension appeals',
  'view.fairness.ratingDisputes': 'Rating disputes',
  'view.fairness.riderReports': 'Rider reports',
  'view.fairness.captainEconomics': 'Captain economics',

  'view.safety.open': 'Open',
  'view.safety.criticalSos': 'Critical SOS',
  'view.safety.closed': 'Closed',

  'view.communications.inbox': 'Inbox',
  'view.communications.outbox': 'Outbox',

  'view.activity.byActor': 'By actor',
  'view.activity.byAction': 'By action',
  'view.activity.byEntity': 'By entity',
}

/* ─────────────── level-3 routes and the three shell layers ─────────────── */

const routes: Dictionary = {
  'route.corporate.detail': 'Corporate account',
  'route.people.applicantDetail': 'Application',
  'route.tickets.detail': 'Ticket',
  'route.pricing.planEditor': 'Edit plan',

  'shellLayer.profile': 'Profile',
  'shellLayer.notifications': 'Notifications',
  'shellLayer.account': 'My profile',
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
  /* §2.4 — a count badge above 99 reads `99+`, and never a `0` (AC-26). */
  'shell.nav.countOverflow': '99+',
  'shell.nav.backlog': '{count} items need attention',

  /* §4 — the top bar, slot by slot. */
  'shell.topbar.back': 'Back',
  'shell.topbar.search': 'Search',
  'shell.topbar.searchShortcut': '⌘ K',
  'shell.topbar.searchShortcutWin': 'Ctrl K',
  'shell.topbar.notifications': 'Notifications',
  'shell.topbar.account': 'Account',
  'shell.topbar.mine': 'Mine',
  'shell.topbar.mineA11y': 'Work assigned to you: {count} items',
  'shell.topbar.onCall': 'On call: {name}',
  'shell.topbar.onCallUnassigned': 'On call: unassigned',

  /* §4 — the account menu. Verb-first where they are actions. */
  'shell.account.myProfile': 'My profile',
  'shell.account.switchUser': 'Switch user',
  'shell.account.signOut': 'Sign out',

  /* §4.1 — the save bar. */
  'shell.saveBar.dirty': 'Unsaved changes',
  'shell.saveBar.dirtyEntity': 'Unsaved {entity}',
  'shell.saveBar.discard': 'Discard',
  'shell.saveBar.save': 'Save',
  'shell.saveBar.saving': 'Saving',

  /* §5 — global search. */
  'shell.search.placeholder': 'Search',
  'shell.search.destinations': 'Destinations ({count})',
  'shell.search.records': 'Records ({count})',
  'shell.search.actions': 'Actions ({count})',
  'shell.search.escapeHatch': 'Search for "{query}" in {scope}',
  'shell.search.escapeHatchUnscoped': 'Search for "{query}"',
  'shell.search.scopedPrompt': 'Search {scope}',
  'shell.search.prompt': 'Search captains, trips, plans and pages',
  'shell.search.noMatch': 'No matches for "{query}".',
  'shell.search.removeScope': 'Remove {scope} scope',
  'shell.search.everywhere': 'everywhere',

  /* §6.3 — the bell preview. */
  'shell.notifications.title': 'Notifications',
  'shell.notifications.seeAll': 'See all',
  'shell.notifications.endOfList': 'No more notifications',
  'shell.notifications.noUnread': 'No unread notifications.',
  'shell.notifications.markAllRead': 'Mark all as read',
  'shell.notifications.unreadCount': '{count} unread',

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

  /* 2 route-forbidden */
  'state.forbidden.title': "You don't have access to this page",
  'state.forbidden.body':
    'This page needs the "{permission}" permission. An owner can grant it in Admin › Team & Access.',
  'state.forbidden.action': 'Go to overview',

  /* 3 page-error */
  'state.pageError.title': "Couldn't load {resource}",
  'state.pageError.body': "The data didn't arrive. Try again, or pick another sub-tab.",
  'state.pageError.action': 'Try again',

  /* 4 page-partial-failure */
  'state.rowError.message': "Couldn't {verb} this {object}.",
  'state.rowError.action': 'Try again',

  /* card-scoped error (§11.2) */
  'state.cardError.message': "Couldn't load {resource}.",

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
  'state.navPinned.toast': 'Sub-tabs pinned open',

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
  'table.sortAscending': 'Oldest first',
  'table.sortDescending': 'Newest first',
  'table.search': 'Search',
  'table.cancel': 'Cancel',
  'table.saveAs': 'Save as',
  'table.clearAll': 'Clear all',
  'table.addFilter': 'Add filter',
  'table.columns': 'Columns',
  'table.openingBalance': 'Opening balance',
  'table.closingBalance': 'Closing balance',
  'table.balance': 'Balance',
  'table.pending': 'Pending',
  'table.sourceDocument': 'Go to {reference}',
  'table.noMatch': 'No {resource} match these filters.',
  'table.clearFilters': 'Clear all filters',
  'table.truncatedPostings': 'Showing {shown} of {total} postings.',
}

/* ────────────────────────────── assembly ────────────────────────────── */

/**
 * `SLA_MESSAGES_EN` is merged HERE, at the dictionary module, not at the
 * provider — 0.4's recorded decision, restated because this is where it lands.
 * The provider takes ONE input; a dictionary assembled in two places is a
 * dictionary that disagrees with itself the first time a caller forgets a
 * merge. The keys are the same either way.
 */
export const EN: Dictionary = {
  ...workspaces,
  ...subTabs,
  ...views,
  ...routes,
  ...shell,
  ...states,
  ...table,
  ...SLA_MESSAGES_EN,
}

/** See the file header. Empty on purpose; it is AC-74's fixture, not a gap in the build. */
export const AR: Dictionary = {}

export const DICTIONARIES: Readonly<Record<Language, Dictionary>> = { en: EN, ar: AR }
