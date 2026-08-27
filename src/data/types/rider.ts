/**
 * Rider — Operations › People, view *Riders*.
 *
 * Derived from `DB.riders` (`eyvar_ops_panel_v40_fixed.html:2593`–`:2632`) and
 * `renderRidersTable()` (`:6406`).
 *
 * **A rider has no status field in the legacy data.** The status cell is
 * computed from `subs.length` — `Active` when the rider holds a subscription,
 * `On-demand` when they do not (`:6428`). Same for churn risk and lifetime
 * value, both computed at render time (`riderChurnRisk`, `riderLTV`). All three
 * are modelled as server fields here for the reason §8.2 gives: a derived value
 * computed in three screens produces three answers.
 */

import type { Halalas, IsoDate, IsoDateTime } from './common'
import type { MovementLogEntry } from './driver'

/** Legacy `lvl` (`:2594`). `new` is a real seeded value — a rider with no rating yet. */
export type RiderTier = 'gold' | 'silver' | 'bronze' | 'new'

/** Derived in legacy from `subs.length` (`:6428`). Tones (R7): subscriber → `success`, on-demand → `info`. */
export type RiderStatus = 'subscriber' | 'on-demand'

/** Legacy `riderChurnRisk(rr).level` — `'High' | 'Medium' | 'Low'` (`:6420`). */
export type ChurnRisk = 'low' | 'medium' | 'high'

/**
 * `WalletTransaction` **was here and is gone.**
 *
 * It modelled the same fact as `LedgerPosting` — `{type:'credit'|'debit',
 * amountHalalas, balanceAfterHalalas}` — and the financials spec is explicit
 * that it *"should be subsumed by `LedgerPosting` rather than kept beside it"*
 * (`specs/03-financials.md` §14). Two shapes for one concept is the defect that
 * wave produced four disagreeing money surfaces, so the second shape is
 * retired rather than kept for convenience.
 *
 * `Rider.walletTransactions` went with it. A wallet ledger is a paginated
 * server read — `getWalletLedger(riderId)` in `clients/wallets.ts` — not an
 * array embedded on an index row, because a rider with 412 postings cannot
 * have them all on the row that lists them.
 *
 * `walletBalanceHalalas` stays, and `clients/financials.test.ts` asserts it
 * equals that rider's ledger closing balance, so the index and the ledger can
 * never disagree about one number.
 */

export interface Rider {
  id: string
  name: string
  phone: string
  /** `0` in legacy means "no rating yet" (`RDR-2090`, `:2607`), not a zero rating. `null` on the wire. */
  rating: number | null
  tier: RiderTier
  status: RiderStatus
  churnRisk: ChurnRisk
  /** Legacy `joined: 'Mar 2026'` — month precision, day is 01. */
  joinedAt: IsoDate
  hasPhoto: boolean
  gender: 'Male' | 'Female'
  /** Legacy `driverGenderPref` — present on one seeded rider only (`:2594`), absent on the rest. */
  driverGenderPreference: 'male' | 'female' | null
  city: string
  address: string
  device: string
  appLanguage: 'Arabic' | 'English'
  lastIp: string
  ipLocation: string

  /**
   * Wallet balance in halalas. **May be negative** — nothing in the legacy app
   * prevents it, and no spec says what happens when it goes below zero. That is
   * an open question for product-owner, flagged in the handoff; the fixtures
   * carry an overdrawn wallet so the screen has to answer it.
   */
  walletBalanceHalalas: Halalas

  movementLog: MovementLogEntry[]

  /* ── stats, all `stats.*` in legacy (`:2597`) ──────────────────────── */
  totalTrips: number
  /** Legacy `stats.totalPaid: '1,040.00 SAR'` → halalas. */
  lifetimeValueHalalas: Halalas
  /** Legacy `stats.renewalRate: '100%' | '—'`. `null` for the em dash: no renewal history, not 0%. */
  renewalRatePercent: number | null
  quickRides: number
  /** `null` for a rider who has never taken a trip. */
  lastTripAt: IsoDateTime | null

  subscriptionIds: string[]
  tripIds: string[]
  paymentIds: string[]
  complaintIds: string[]
  /** The corporate account covering this rider, when one does (`corpForRider`, `:4910`). */
  corporateAccountId: string | null
}

/**
 * New riders — legacy `DB.newRiders` (`:2744`), a **separate collection** with a
 * different shape: no rating, no tier, no stats, no wallet, plus `firstAction`
 * and the KYC fields (`dob`, `nid`) that full riders do not carry.
 *
 * Modelled separately rather than as a `Rider` with nulls, because it is a
 * separate query on a separate screen and merging them would put eight
 * always-null fields on the main type.
 */
export interface NewRider {
  id: string
  name: string
  phone: string
  joinedAt: IsoDate
  /** `'No trips yet'`, `'1 quick ride completed'`, `'Browsing — no trips yet'` (`:2745`). Free text in legacy. */
  firstAction: string
  dateOfBirth: IsoDate
  /** Saudi national id. PII — gated on `view_profiles` (§4.3.1). */
  nationalId: string
  address: string
  city: string
  hasPhoto: boolean
  gender: 'Male' | 'Female'
  device: string
  appLanguage: 'Arabic' | 'English'
  lastIp: string
  ipLocation: string
  movementLog: MovementLogEntry[]
}
