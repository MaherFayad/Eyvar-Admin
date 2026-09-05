/**
 * Growth — Management › Growth, the four `?view=` index tables under the board.
 * From `DB.promos` (`eyvar_ops_panel_v40_fixed.html:13495`), `DB.referralLog`
 * (`:13888`), `DB.incentives` (`:13564`) and the audit row `sendBulkMsg` writes
 * (`:13755`). X2: a promo target and an incentive rule and reward are enums here,
 * not the English prose legacy stores. Money is halalas; legacy stores SAR.
 */

import type { Halalas, IsoDate, IsoDateTime } from './common'

/* ── Promos ──────────────────────────────────────────────────────────── */

/* `DB.promos[].status` (`:13496`); the four branches `renderPromoList` draws
   (`:13512`). R7 tones: success, warning, neutral, neutral. Legacy paints
   `exhausted` red and R5a forbids a red badge. */
export type PromoStatus = 'active' | 'paused' | 'exhausted' | 'expired'

/**
 * Legacy stores the English label the create modal's `<select>` produced
 * (`:13540`). Keyed here so the cell reads in Arabic.
 */
export type PromoTarget =
  | 'new-riders'
  | 'all-riders'
  | 'lapsed-subscribers'
  | 'monthly-plan'
  | 'zone'

export interface GrowthPromo {
  /** The campaign code, and the resource's identity (`:13496`). */
  code: string
  discountPercent: number
  budgetHalalas: Halalas
  /**
   * **Server-computed.** Legacy never increments it (module doc §18.1 item 2),
   * so every figure here is a seeded literal and the fixtures say so.
   */
  spentHalalas: Halalas
  /**
   * `spent ÷ budget`, rounded (`:13510`). Server-computed so this list and the
   * board's `management.growth.promoBudgetConsumed` tile cannot disagree.
   */
  burnPercent: number
  uses: number
  newSubscriptions: number
  /**
   * `promoROI(p)` (`:13501`): attributed subscription revenue ÷ discount spend.
   * Server-computed, for the same reason as `burnPercent`. `0` when nothing has
   * been spent, which is what legacy's guard returns.
   */
  roi: number
  target: PromoTarget
  perUserLimit: number
  expiresOn: IsoDate
  status: PromoStatus
  /** New. Legacy has array order and nothing else (`:13509`). */
  createdAt: IsoDateTime
}

/* ── Referrals ───────────────────────────────────────────────────────── */

export interface GrowthReferral {
  /** `REF-…` (`:13889`). */
  id: string
  referrerId: string
  referrerName: string
  refereeId: string
  refereeName: string
  referrerBonusHalalas: Halalas
  refereeBonusHalalas: Halalas
  /** The two bonuses summed — the figure `contributionMargin()` subtracts (`:15726`). */
  totalBonusHalalas: Halalas
  /** Legacy stores a display string, `'18 Jul 09:30'` (`:13889`); the wire carries an instant. */
  creditedAt: IsoDateTime
  /**
   * Referrer and referee share a last-known IP or a device — the Fraud page's
   * `refFlags` predicate (`:5610`). Server-computed: neither field reaches a
   * screen, and the act it invites belongs to Risk & Signals (O4).
   */
  sharedDeviceFlag: boolean
}

/* ── Incentives ──────────────────────────────────────────────────────── */

/** The four seeded rules (`:13565`), one key each. A fifth rule is a fifth key. */
export type IncentiveCondition =
  | 'perfect-package'
  | 'rating-streak'
  | 'gold-tier'
  | 'backup-readiness'

export type IncentiveRewardKind = 'per-package' | 'flat' | 'weekly-retainer' | 'commission-cut'

/**
 * Legacy stores `'+40 SAR per package'` and `'Commission 20% → 17%'` as prose
 * (`:13565`). Structured so the number right-aligns and the sentence translates.
 */
export interface IncentiveReward {
  kind: IncentiveRewardKind
  /** `null` on a commission cut, which pays no amount. */
  amountHalalas: Halalas | null
  /** Both `null` unless `kind` is `commission-cut`. */
  fromPercent: number | null
  toPercent: number | null
}

export interface GrowthIncentive {
  /** `INV-…` (`:13565`). */
  id: string
  /** Operator-authored, so a string and not a key. */
  name: string
  condition: IncentiveCondition
  reward: IncentiveReward
  active: boolean
  /** `incentiveEarnedCount()` (`:13662`) — captains paid under this rule. */
  earnedCount: number
  /** `incentiveTotalPaid()` (`:13663`). */
  totalPaidHalalas: Halalas
  /** New, for the same reason as `GrowthPromo.createdAt`. */
  createdAt: IsoDateTime
}

/* ── Bulk messages ───────────────────────────────────────────────────── */

/**
 * `MSG_SEGMENTS` (`:13734`), renamed from `seg1`–`seg5` to say what each is.
 * The labels and the recipient counts legacy carries are hardcoded (module doc
 * §16 item 11) and the counts are per-send here instead.
 */
export type MessageSegment =
  | 'drivers-in-zone'
  | 'packages-expiring'
  | 'exposed-subscriptions'
  | 'documents-expiring'
  | 'active-subscribers'

/** The three the composer offers (`:13745`). */
export type MessageChannel = 'push' | 'sms' | 'in-app'

/* Legacy's audit row made first-class: `sendBulkMsg` (`:13750`) sends nothing
   and stores nothing, it writes one `logAction('bulk_message', …)` row. Every
   field below is a field that row already carries. */
export interface GrowthBulkMessage {
  /** `MSG-…`. */
  id: string
  /** Operator-authored (`:13746`). The identity cell. */
  body: string
  segment: MessageSegment
  channel: MessageChannel
  /** What the send reached. Legacy prints a hardcoded segment size instead. */
  recipientCount: number
  sentAt: IsoDateTime
  sentById: string
  sentByName: string
}
