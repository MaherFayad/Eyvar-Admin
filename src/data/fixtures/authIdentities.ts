/**
 * The seeded sign-in identities, the five fixture codes and the five fixture
 * tokens — spec §10.3.
 *
 * > **Domain outcomes are fixtures, not injected failures, and this is a real
 * > distinction.** `?mockFail=` produces a `503 / kind:'server' /
 * > retryable:true`. That is right for a *transport* failure and wrong for a
 * > *domain* one: a wrong password is not a 503, and a screen that treats it as
 * > one shows a `Retry` button where it owes a field error.
 *
 * Both paths must work, and they are reached differently:
 *
 *   transport   `?mockFail=auth.signIn` — and now `?mockFail=auth.signIn:429`
 *   domain      the identifiers, codes and tokens below
 *
 * ## The four legacy operators, plus three new ones
 *
 * `sarah@` · `fahad@` · `lina@` · `yousef@` are `DB.teamUsers` (`:2831`–`:2839`).
 * `noura.f@` is the seeded `Invited` row (`:2837`) — a real, never-activated
 * account, which is why `Invited → Active` has a fixture to happen to for the
 * first time (§6.6).
 *
 * `locked@`, `suspended@` and `newrole@` are **new and deliberate**, each named
 * in §10.3 and each making one state reachable that no real operator's record
 * can reach.
 *
 * ## Everything unknown behaves identically to everything rejected
 *
 * §4.5: **one message, one latency.** A form that answers *"no such account"*
 * differently from *"wrong password"* is an account-enumeration oracle, and this
 * one holds `process_payouts` and `release_escrow` behind it. The distinctions
 * below exist in the fixture and are deliberately **not** on the wire — the
 * client collapses `invited`, `suspended` and unknown to one `rejected`.
 */

import { EYVAR_NOW, offsetFromNow } from '../mock/clock'
import type { AuthIdentity, DeviceSession, TokenState } from '../types/auth'
import type { RoleName } from '../types/session'

/* ─────────────────────────── identities ─────────────────────── */

export const authIdentityFixtures: AuthIdentity[] = [
  {
    /* Owner, all 13 permissions, TOTP. The one account that can answer for the
       console, and the one whose compromise is worst — which is §4.2's whole
       argument for a second factor being a property of the console. */
    email: 'sarah@eyvar.com',
    userId: 'USR-1',
    outcome: 'happy',
    role: 'Owner',
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
      'manage_settings',
    ],
    secondFactor: { method: 'totp', hint: 'Authenticator app' },
    lockedUntil: null,
  },
  {
    /**
     * Finance. **`secondFactor: null` — enrolment pending**, so `signin-enroll`
     * (§4.4) is reachable on the very first identity QA is likely to try after
     * the Owner.
     *
     * Not arbitrary: `USR-2` is legacy's `twoFA: false` row, and the fixture
     * comment there already said why it was chosen — *"Finance, moving real
     * money, with 2FA off"*. Under §4.2 that stops being a warning badge and
     * becomes a mandatory enrolment.
     */
    email: 'fahad@eyvar.com',
    userId: 'USR-2',
    outcome: 'happy',
    role: 'Finance',
    permissions: ['process_payouts', 'release_escrow', 'apply_deductions', 'view_finance', 'view_profiles'],
    secondFactor: null,
    lockedUntil: null,
  },
  {
    /**
     * Support, **three permissions**. **AC-601**: the onboarding intro reads
     * `You hold 3 of 13 permissions.` for this account, and that is the number
     * the criterion names.
     */
    email: 'lina@eyvar.com',
    userId: 'USR-3',
    outcome: 'happy',
    role: 'Support',
    permissions: ['manage_tickets', 'view_profiles', 'contact_users'],
    /* `twoFA: false` at `:2835` — enrolment pending, like `USR-2`. Three of the
       five seeded operators are, which is what
       `admin.overview.operatorsWithoutTwoFactor` reads as **3 of 5**. */
    secondFactor: null,
    lockedUntil: null,
  },
  {
    /**
     * `Invited`, never logged in (`:2837`, `lastLogin: 'Not yet'`).
     * **Generic rejection** — §9.1's `account-invited` state exists for the
     * *copy*, not for a distinct response: the wire says `rejected` and the
     * activation link is what this account has instead of a password.
     */
    email: 'noura.f@eyvar.com',
    userId: 'USR-4',
    outcome: 'invited',
    role: 'Support',
    permissions: ['manage_tickets', 'view_profiles', 'contact_users'],
    secondFactor: null,
    lockedUntil: null,
  },
  {
    email: 'yousef@eyvar.com',
    userId: 'USR-5',
    outcome: 'happy',
    role: 'Ops Manager',
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
    secondFactor: { method: 'sms', hint: '••••••62' },
    lockedUntil: null,
  },
  {
    /**
     * **New (§10.3).** Challenge locked, **12 minutes remaining**.
     *
     * `lockedUntil` is an absolute instant, not `12`. §3.2: the lockout minutes
     * are *"re-read per attempt and never tick in the browser"*, so this is a
     * fact to render and not a countdown to run — and a duration would be wrong
     * the moment the tab is backgrounded.
     */
    email: 'locked@eyvar.com',
    userId: null,
    outcome: 'locked',
    role: 'Support',
    permissions: [],
    secondFactor: { method: 'sms', hint: '••••••11' },
    lockedUntil: offsetFromNow({ minutes: 12 }),
  },
  {
    /** **New (§10.3).** `Suspended`. Generic rejection, same copy, same latency. */
    email: 'suspended@eyvar.com',
    userId: null,
    outcome: 'suspended',
    role: 'Ops Manager',
    permissions: [],
    secondFactor: { method: 'sms', hint: '••••••44' },
    lockedUntil: null,
  },
  {
    /**
     * **New (§10.3), and it is D-A2 made visible.** An Ops Manager with
     * `permissions: []` — an account that exists, signs in, lands somewhere, and
     * can do nothing.
     *
     * **This is how `track-empty` (§9.2, AC-631) is reached, and it is not how
     * the spec expected it to be reached.** With `requiredPermission: null` on
     * all 21 steps (Q4), no step can be *forbidden*, so **AC-610 cannot pass**.
     * This account reaches the empty track through holding zero permissions
     * instead — the intro's `You hold 0 of 13 permissions.` is the same finding
     * said out loud. Both criteria are recorded as known-failing.
     */
    email: 'newrole@eyvar.com',
    userId: null,
    outcome: 'no-permissions',
    role: 'Ops Manager',
    permissions: [],
    secondFactor: { method: 'sms', hint: '••••••99' },
    lockedUntil: null,
  },
]

/* ───────────────────────── codes and tokens ─────────────────── */

/* `AUTH_FIXTURE_CODES` and `AUTH_FIXTURE_PASSWORD` moved to
   `src/data/mock/credentials.ts`, which says why: they are the two values in
   this file a test holds as a value, and re-exporting them through the seam
   was a static edge that pinned every seeded identity into the http build. */


/**
 * **Refused by the server's breach list** — **AC-548**, spec §11.1's *"cannot
 * be a client list"*.
 *
 * `Password123!` is chosen and not invented: **12 characters with all four
 * character classes**, so `passwordStrength` returns **`strong`** and the meter
 * shows a full green bar for a password the server then refuses. That is design
 * §7.3's *"the meter never gates submission"* turned into something an operator
 * can watch happen, rather than a sentence in a comment. A fixture that failed
 * the length rule too would prove nothing — the client would have caught it.
 *
 * The other two are the shapes a real list catches that a meter never does: a
 * long keyboard walk, and a common phrase padded to length.
 */
export const AUTH_BREACHED_PASSWORDS: readonly string[] = [
  'Password123!',
  'qwertyuiop123456',
  'letmein-please-1',
]

/**
 * §5.1 — the TOTP secret and its `otpauth://` URI, **fixed literals**.
 *
 * Server-issued in production and never minted in the browser (spec §11.1: code
 * generation is the server's). Fixed here because a QR square that changes per
 * run cannot be diffed by a visual regression test, and a QA engineer
 * reproducing a failed scan needs the same square twice.
 *
 * Grouped in fours because the secret is read aloud and typed by hand by every
 * operator whose phone camera cannot see their own screen — which is the entire
 * reason design §5.1 puts the secret under the canvas at all.
 */
export const AUTH_FIXTURE_TOTP = {
  secret: 'JBSW Y3DP EHPK 3PXP',
  otpauthUri: 'otpauth://totp/Eyvar:{email}?secret=JBSWY3DPEHPK3PXP&issuer=Eyvar&digits=6&period=30',
} as const

/**
 * §10.3's tokens, **as rows rather than as a list of ids**, because a token
 * carries three facts and the id is only one of them.
 *
 * **`invite` is new, and it is what §7.4's subtitle was missing.** The old
 * fixture had one live token, hard-coded to `purpose: 'reset'` and
 * `sarah@eyvar.com`, so `/activate?token=…` validated a **reset** token and no
 * `role` existed anywhere for `You've been invited to Eyvar as {role}.` to
 * name. An invite link and a reset link are different tokens in every real
 * system; they are different rows here.
 *
 * `noura.f@eyvar.com` is the seeded `Invited` operator (`:2837`) whose account
 * has no path out of `Invited` in the legacy app. This row is that path.
 */
export interface AuthTokenFixture {
  token: string
  state: TokenState
  /** `null` on anything but `valid` — an invalid token leaks no address (**AC-543**). */
  email: string | null
  purpose: 'reset' | 'invite' | null
  /** Set **only** on an `invite`. A reset does not announce a role. */
  role: RoleName | null
}

export const authTokenFixtures: readonly AuthTokenFixture[] = [
  { token: 'valid', state: 'valid', email: 'sarah@eyvar.com', purpose: 'reset', role: null },
  { token: 'invite', state: 'valid', email: 'noura.f@eyvar.com', purpose: 'invite', role: 'Support' },
  { token: 'expired', state: 'expired', email: null, purpose: null, role: null },
  { token: 'used', state: 'used', email: null, purpose: null, role: null },
  { token: 'superseded', state: 'superseded', email: null, purpose: null, role: null },
]

/** The token ids, derived. `?token=` anything not in here is `unknown`. */
export const AUTH_FIXTURE_TOKENS: readonly string[] = authTokenFixtures.map((t) => t.token)

/**
 * §5.4 — five attempts, and the 3rd and the 5th are the ones the copy changes
 * on. A **server** number: the client never counts, and §3.2 forbids a
 * client-side lockout counter outright.
 */
export const MAX_CODE_ATTEMPTS = 5

/**
 * §4.4 — 30 / 60 / 120 seconds, escalating **per challenge**.
 *
 * **This is server policy and it lives here, in the data layer, on purpose.**
 * No schedule constant may exist in a component or a hook: `useCooldown` is
 * driven off the `resendAvailableAt` deadline the client returns, so a tab
 * backgrounded for four minutes resumes with the right answer rather than with
 * a number that expired while it was asleep.
 */
export const RESEND_COOLDOWN_SECONDS: readonly number[] = [30, 60, 120]

/**
 * **AC-533 · design §4.4 — how many codes one sign-in may be sent, in total.**
 *
 * **Five codes, so four successful resends**, and the fifth press returns
 * `exhausted`. That number reconciles a real disagreement between the two
 * documents rather than picking a side:
 *
 *   - **AC-533** — *"After 5 resends on one challenge the operator is returned
 *     to `/signin` and told to start again."*
 *   - **design §4.4** — the copy is *"**Five codes** were sent for this
 *     sign-in. Sign in again to start over."*
 *
 * Five *resends* would mean **six** codes and the sentence would be wrong by
 * one. Counting **codes** satisfies both readings exactly: pressing `Resend` a
 * fifth time returns the operator to `/signin` (AC-533's observable), and the
 * five codes the copy names are the original plus four resends. **Raised as a
 * finding for product-owner anyway** — a criterion and a string that count
 * different nouns will be re-litigated by whoever reads only one of them.
 *
 * Counted per **sign-in**, not per code: like `attemptsUsed`, the budget is
 * carried forward when a resend issues a fresh code, or the limit could never
 * be reached.
 */
export const MAX_CODES_PER_CHALLENGE = 5

/** §5.1 — how long a code is accepted for. */
export const CODE_LIFETIME_MINUTES = 10

/** §3.2 — how long a locked challenge stays locked. */
export const CHALLENGE_LOCKOUT_MINUTES = 15

/** §7.1 — `[inferred]`. Stored as an expiry on the row, never as a duration plus a policy constant. */
export const TRUSTED_DEVICE_DAYS = 30

/* ────────────────────────── device sessions ─────────────────── */

/**
 * `DB.loginSessions` (`:2994`–`:3001`), keyed by user, with the two fields
 * design §9 needs and legacy does not have.
 *
 * **`USR-4` is seeded `[]` in legacy and stays empty here** — that is what makes
 * **AC-653**'s empty state reachable without a hand edit: *"You're only signed
 * in on this device."*, rendered as R8's **second** kind (one grey sentence, no
 * illustration), because the card is empty and the page is not.
 *
 * `USR-1` carries three rows so the list has something to be a list about, and
 * so `Sign out everywhere` can name a count of **two** others (**AC-576** — the
 * count is stated *before* it acts).
 *
 * **Exactly one row per user has `isCurrent: true`.** Asserted in
 * `clients/auth.test.ts`; two would put two `This device` badges on one card.
 */
export const deviceSessionFixtures: Record<string, DeviceSession[]> = {
  'USR-1': [
    {
      id: 'SESS-1',
      device: 'Chrome on macOS',
      location: 'Riyadh',
      ip: '92.96.7.40',
      lastActiveAt: EYVAR_NOW,
      isCurrent: true,
      /* Trusted, and the row renders `Trusted until 25 July 2026` beside a
         `Stop trusting` plain button. The one row on any seeded list that
         exercises the trusted line. */
      trustedUntil: offsetFromNow({ days: TRUSTED_DEVICE_DAYS }),
    },
    {
      id: 'SESS-2',
      device: 'Eyvar Ops app · iPhone',
      location: 'Riyadh',
      ip: '92.96.14.201',
      lastActiveAt: offsetFromNow({ hours: -2 }),
      isCurrent: false,
      /* Not trusted. The row shows no date line at all rather than `Not trusted`
         where a date would go — design §9 gives the state to the line's
         absence, and the `Stop trusting` control goes with it. */
      trustedUntil: null,
    },
    {
      id: 'SESS-3',
      device: 'Chrome on Windows',
      location: 'Jeddah',
      ip: '185.45.30.7',
      /* Three days old and in another city — the row an operator is meant to
         look at twice, and the reason the per-row `Sign out` exists. */
      lastActiveAt: offsetFromNow({ days: -3 }),
      isCurrent: false,
      trustedUntil: null,
    },
  ],
  'USR-2': [
    {
      id: 'SESS-4',
      device: 'Chrome on Windows',
      location: 'Riyadh',
      ip: '92.96.18.92',
      lastActiveAt: EYVAR_NOW,
      isCurrent: true,
      trustedUntil: null,
    },
  ],
  'USR-3': [
    {
      id: 'SESS-5',
      device: 'Safari on macOS',
      location: 'Riyadh',
      ip: '46.31.20.18',
      lastActiveAt: EYVAR_NOW,
      isCurrent: true,
      /**
       * **Expired trust, seeded.** `trustedUntil` is in the past, so a screen
       * that renders `Trusted until {date}` on any non-null value shows a date
       * that has already gone by. The row is *not* trusted and the line must not
       * render. Nothing else in the fixture set catches that off-by-one.
       */
      trustedUntil: offsetFromNow({ days: -4 }),
    },
  ],
  /* `:3001` — seeded empty. AC-653's empty state, without a hand edit. */
  'USR-4': [],
  'USR-5': [
    {
      id: 'SESS-6',
      device: 'Chrome on Windows',
      location: 'Riyadh',
      ip: '176.44.2.19',
      lastActiveAt: EYVAR_NOW,
      isCurrent: true,
      trustedUntil: offsetFromNow({ days: 11 }),
    },
  ],
}
