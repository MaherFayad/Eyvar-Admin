/**
 * The five seeded operators — legacy `DB.teamUsers` (`eyvar_ops_panel_v40_fixed.html:2830`–`:2841`).
 * Names, emails, phones, roles, 2FA flags and permission arrays are verbatim.
 *
 * Converted on the way across the seam:
 *   `lastLogin: 'Today 09:00'` → ISO, against the fixed clock (`2026-06-25T09:14:00+03:00`)
 *   `lastLogin: 'Not yet'`     → `null`
 *   `photo: null`              → `photoUrl: null`
 *
 * `compensationCapHalalas` is **not** in the legacy `teamUsers` shape — it comes
 * from `compPolicy` (`:15379`), a five-role cap table, joined here because §11.2
 * makes it a session-level authority and the wallet screen needs it on the
 * operator, not on a config page.
 */

import type { TeamUser } from '../types/session'

export const teamUserFixtures: TeamUser[] = [
  {
    id: 'USR-1',
    name: 'Sarah Al-Rashid',
    email: 'sarah@eyvar.com',
    phone: '+966 50 123 4567',
    photoUrl: null,
    role: 'Owner',
    lastLoginAt: '2026-06-25T09:00:00+03:00',
    status: 'Active',
    secondFactor: { method: 'totp', hint: 'Authenticator app' },
    /* The legacy 13, less the retired `manage_settings` (D17). */
    permissions: [
      'approve_drivers',
      'manage_subscriptions',
      'live_ops',
      'manage_plans',
      'view_finance',
      'process_payouts',
      'release_escrow',
      'apply_deductions',
      'manage_tickets',
      'view_profiles',
      'contact_users',
      'manage_team',
    ],
    compensationCapHalalas: null,
  },
  {
    id: 'USR-2',
    name: 'Fahad Al-Dosari',
    email: 'fahad@eyvar.com',
    phone: '+966 55 222 8890',
    photoUrl: null,
    role: 'Finance',
    lastLoginAt: '2026-06-25T08:45:00+03:00',
    status: 'Active',
    /* Finance, moving real money, with **no second factor enrolled**. Under
       spec §4.2 that is no longer a warning badge beside a toggle — it is a
       mandatory enrolment at the next sign-in (`signin-enroll`, §4.4), and this
       is the row that makes that screen reachable. */
    secondFactor: null,
    permissions: ['process_payouts', 'release_escrow', 'apply_deductions', 'view_finance', 'view_profiles'],
    compensationCapHalalas: 500_00,
  },
  {
    id: 'USR-3',
    name: 'Lina Al-Otaibi',
    email: 'lina@eyvar.com',
    phone: '+966 54 771 3320',
    photoUrl: null,
    role: 'Support',
    lastLoginAt: '2026-06-24T00:00:00+03:00',
    status: 'Active',
    /* `twoFA: false` at `:2835`, kept: **no second factor enrolled.** Three of
       the five operators are in this state, which is what
       `admin.overview.operatorsWithoutTwoFactor` counts — and under spec §4.2
       it is no longer a badge beside a toggle but a mandatory enrolment. */
    secondFactor: null,
    /* Three permissions. §13.1 R5: not equipped for a suspension decision,
       which is why Safety & Incidents write actions stay Ops-Manager-gated. */
    permissions: ['manage_tickets', 'view_profiles', 'contact_users'],
    compensationCapHalalas: 100_00,
  },
  {
    id: 'USR-4',
    name: 'Noura Al-Fahad',
    email: 'noura.f@eyvar.com',
    phone: '+966 56 990 1145',
    photoUrl: null,
    role: 'Support',
    /* Invited, never logged in — the `null` case for every "last seen" column. */
    lastLoginAt: null,
    status: 'Invited',
    /* Never activated, so never enrolled. */
    secondFactor: null,
    permissions: ['manage_tickets', 'view_profiles', 'contact_users'],
    compensationCapHalalas: 100_00,
  },
  {
    id: 'USR-5',
    name: 'Yousef Al-Balawi',
    email: 'yousef@eyvar.com',
    phone: '+966 53 410 7762',
    photoUrl: null,
    role: 'Ops Manager',
    lastLoginAt: '2026-06-25T08:10:00+03:00',
    status: 'Active',
    secondFactor: { method: 'sms', hint: '••••••62' },
    permissions: [
      'approve_drivers',
      'manage_subscriptions',
      'live_ops',
      'manage_plans',
      'view_finance',
      'manage_tickets',
      'view_profiles',
      'contact_users',
    ],
    compensationCapHalalas: 250_00,
  },
  /* D17: every role has a seeded holder. The two roles D17 minted had none,
     so the account-menu switch could not reach them and AC-914 / AC-916 had no
     seed to run against. Both `Active`, both enrolled. */
  {
    id: 'USR-6',
    name: 'Tariq Al-Mutairi',
    email: 'tariq@eyvar.com',
    phone: '+966 55 604 2218',
    photoUrl: null,
    role: 'Dispatcher',
    lastLoginAt: '2026-06-25T06:02:00+03:00',
    status: 'Active',
    secondFactor: { method: 'sms', hint: '••••••18' },
    permissions: ['view_operations', 'view_profiles', 'live_ops', 'contact_users'],
    compensationCapHalalas: 50_00,
  },
  {
    id: 'USR-7',
    name: 'Hind Al-Qahtani',
    email: 'hind@eyvar.com',
    phone: '+966 50 318 7740',
    photoUrl: null,
    role: 'Trust & Safety',
    lastLoginAt: '2026-06-24T21:40:00+03:00',
    status: 'Active',
    secondFactor: { method: 'totp', hint: 'Authenticator app' },
    permissions: [
      'view_analytics',
      'view_operations',
      'view_support',
      'view_profiles',
      'approve_drivers',
      'manage_tickets',
      'contact_users',
    ],
    compensationCapHalalas: 100_00,
  },
]

/**
 * Legacy `CURRENT_USER_ID = 'USR-1'` (`:2841`). The single-session demo's one
 * operator.
 *
 * **The seeded default, and nothing else.** It answers *"who is signed in
 * before anybody switches"*, which is why `clients/session.ts` initialises
 * `mockUserId` from it and `resetMockSession` restores it. It does **not**
 * answer *"who is acting right now"* — that is `currentMockUserId()`, and a
 * client reading this constant to stamp an actor, filter a `mine` view or
 * decide a take-over is invisible to `switchMockUser`. Twenty clients did, and
 * `clients/identity.test.ts` is the guard that keeps them from doing it again.
 */
export const CURRENT_USER_ID = 'USR-1'

/**
 * Role → landing workspace (§3.3, AC-07). Not invented: the mapping is stated
 * in the spec and in `PROPOSED-STRUCTURE.md` §10.2.
 */
export const ROLE_LANDING: Record<string, { workspaceId: string; path: string }> = {
  Owner: { workspaceId: 'management', path: '/management/overview' },
  'Ops Manager': { workspaceId: 'operations', path: '/operations/overview' },
  Finance: { workspaceId: 'financials', path: '/financials/overview' },
  Support: { workspaceId: 'support', path: '/support/overview' },
  /* D17: the Dispatcher lands on the board they clear; Trust & Safety on the
     queue they own, not on Support's ticket metrics. */
  Dispatcher: { workspaceId: 'operations', path: '/operations/dispatch' },
  'Trust & Safety': { workspaceId: 'support', path: '/support/safety' },
}

/** §8.2 — the documented fallback when a role has no mapping. */
export const DEFAULT_LANDING = { workspaceId: 'operations', path: '/operations/overview' }
