/**
 * The census. All 41 legacy `.page` ids, verbatim and in order, from
 * `docs/00-index/GROUND-TRUTH-INVENTORY.md` §A (lines 31–71), which was itself
 * derived from `eyvar_ops_panel_v40_fixed.html`.
 *
 * This file exists so AC-04 compares the route table against the census rather
 * than against a hand-typed list inside the test. If the census is ever
 * corrected, it is corrected here, once.
 */

export const PAGE_ALIAS_IDS = [
  'exec-overview',
  'corporate',
  'corp-detail',
  'fraud',
  'dashboard',
  'subscriptions',
  'live',
  'trips',
  'renewal',
  'readiness',
  'drivers',
  'riders',
  'finance',
  'wallets',
  'rwallets',
  'plans',
  'plan-edit',
  'quickrides',
  'my-account',
  'notifications-all',
  'predictive',
  'coverage',
  'compliance',
  'safety',
  'growth',
  'zones',
  'all-pending',
  'applicant-detail',
  'support',
  'ticket-detail',
  'profile',
  'inbox',
  'commitment',
  'fairness',
  'contacts',
  'settings',
  'audit-log',
  'interventions',
  'requests',
  'requests-sub-all',
  'requests-instant-all',
] as const

export type PageAliasId = (typeof PAGE_ALIAS_IDS)[number]

/** §3.11 — retired under D1. No route resolves to it and it appears in no row's `pageAliasIds`. */
export const RETIRED_PAGE_ALIAS_IDS: readonly string[] = ['interventions']

/**
 * The 21 settings pane keys, from `GROUND-TRUTH-INVENTORY.md` §C / §Q and the
 * relocation table in the foundation spec §3.7. Four leave Admin for Financials;
 * seventeen collapse into Admin's seven sub-tabs. AC-15 walks the route table
 * and asserts all 21 are reachable and none twice.
 */
export const SETTINGS_PANE_KEYS = [
  'general',
  'branding',
  'legal',
  'team',
  'permissions',
  'security',
  'rota',
  'dispatch',
  'cities',
  'limits',
  'reasons',
  'notifications',
  'push',
  'emails',
  'integrity',
  'export',
  'activity',
  'gateways',
  'ledger',
  'pricing',
  'cancelpolicy',
] as const

export type SettingsPaneKey = (typeof SETTINGS_PANE_KEYS)[number]

/**
 * Legacy page titles — `titles` map (`eyvar_ops_panel_v40_fixed.html:2168`).
 * Kept because global search resolves **by legacy name** (§4.3.4): an operator
 * who types "Renewal pipeline" must land on Operations › Subscriptions. Without
 * this map, `pageAliasIds` resolves ids nobody types.
 */
export const PAGE_ALIAS_TITLES: Record<string, string> = {
  'exec-overview': 'Executive Overview',
  corporate: 'Corporate Accounts',
  'corp-detail': 'Corporate Account',
  rwallets: 'Rider Wallets',
  dashboard: 'Dashboard',
  subscriptions: 'Subscriptions',
  quickrides: 'Quick Rides',
  trips: 'All Trips',
  renewal: 'Renewal Pipeline',
  live: 'Live Map & Route History',
  drivers: 'Drivers',
  riders: 'Riders',
  finance: 'Finance',
  wallets: 'Driver Wallets',
  plans: 'Pricing Plan',
  'plan-edit': 'Edit Plan',
  settings: 'Settings',
  'audit-log': 'Activity log',
  interventions: 'Interventions',
  requests: 'Requests',
  'requests-sub-all': 'All Subscription Requests',
  'requests-instant-all': 'All Instant Ride Requests',
  coverage: 'Coverage & Capacity',
  compliance: 'Fleet Compliance',
  safety: 'Safety & Incidents',
  growth: 'Promos & Growth',
  zones: 'Zones',
  predictive: 'Predictive Signals',
  fraud: 'Fraud & Risk',
  'notifications-all': 'Notifications',
  'my-account': 'My Account',
  profile: '360° Profile',
  'all-pending': 'All Pending Applications',
  'applicant-detail': 'Applicant Detail',
  support: 'Support Center',
  inbox: 'Work Inbox',
  readiness: 'Trip Readiness',
  'ticket-detail': 'Ticket Detail',
  fairness: 'Captain Fairness',
  commitment: 'Plan Commitment',
  contacts: 'Contact Drivers & SLA',
}
