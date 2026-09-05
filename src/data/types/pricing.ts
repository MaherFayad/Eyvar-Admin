/**
 * Pricing & Plans — the plan catalogue, the rate card, quick rides, surge and
 * cancellation fees.
 *
 * ## Read this before adding a field
 *
 * **Q7 is not answered.** Four stores claim to price the product — `DB.plans`
 * (`:2889`), the frozen `PLANS`/`CADENCE_META` constants (`:4389`, `:4519`),
 * `DB.quickRideTypes` (`:13908`) and `DB.rateCard` (`:21431`) — and they
 * disagree on the numbers, not just the shape: commission is 20 % / 20-18-15 /
 * 22-20 depending on which you ask; Economy per-km is 1.10 or 1.20; the plan
 * discount is 0-5-10 or 12-16-20; the cancellation fee is scenario-based and
 * enforced, or class-based and not (§4.1).
 *
 * Which store wins is the Finance lead's decision with the business owner.
 * **This file does not decide it.** It models both halves of `DB.plans` — the
 * catalogue half, which has no duplicate anywhere, and the pricing half, which
 * duplicates the rate card — and marks the second `readOnly` for Stage A
 * (§4.5). Every pricing input takes the disabled treatment; the derived values,
 * the formula panel and the preview strip all work, computed from the live rate
 * card, because they are why Financials is wave 3.
 */

import type { Halalas, IsoDate, IsoDateTime, LocalisedText } from './common'
import type { PlanKey } from './subscription'

/* ─────────────────────── the plan catalogue ─────────────────── */

export type PlanStatus = 'draft' | 'active' | 'archived'

/** Both languages required on save (`:6125`), ≤ 60 characters each (`:6050`). */
export interface PlanFeature {
  en: string
  ar: string
}

/**
 * A subscription plan.
 *
 * §4.2 finding 2, recorded: **`DB.plans` is two things wearing one name.** Its
 * catalogue half (`nameEn`, `nameAr`, `durationDays`, `executeDays`,
 * `cancelCap`, `sortOrder`, `status`, `features`) has no duplicate anywhere in
 * the app. Its pricing half duplicates `rateCard.commission`,
 * `rateCard.planDiscountPercent` and `rateCard.classes`. **Q7 is a question
 * about the second half only**, which is why the two halves are separated by a
 * comment rather than by two types: they are one row on one screen and the
 * editor edits them together the moment Q7 lands.
 *
 * `driverSharePercent` and the worked-example figures are **derived** (§8.4)
 * and are therefore not fields.
 */
export interface SubscriptionPlan {
  /**
   * The three built-in plans carry a `PlanKey`; a plan added from the editor
   * carries a server-assigned slug. Subscriptions still reference `PlanKey`.
   */
  id: string
  nameEn: string
  nameAr: string
  durationDays: number
  /** How many legs the plan executes over its duration. */
  executeDays: number
  /** Free cancellations allowed inside the plan (`cap`, `:2890`). */
  cancelCap: number
  sortOrder: number
  status: PlanStatus
  features: PlanFeature[]
  economyActive: boolean
  comfortActive: boolean

  /* ── the pricing half — Stage A renders these DISABLED (§4.5) ────────
     Not `derived`: they *will* become editable once Q7 lands, and §4.6's
     disabled treatment is exactly "unavailable now, available later".
     AC-392 turns on this distinction being visible. */
  commissionPercent: number
  discountPercent: number
  economyPerMinuteHalalas: Halalas
  economyPerKmHalalas: Halalas
  comfortPerMinuteHalalas: Halalas
  comfortPerKmHalalas: Halalas

  /** Which store the pricing half currently comes from. Flips when Q7 is answered. */
  pricingSource: 'plan' | 'rate-card'
  /** `false` for the whole pricing half while Q7 is open. Drives the disabled treatment. */
  pricingEditable: boolean
}

/* ──────────────────────── the rate card ─────────────────────── */

export type RateCardStatus = 'live' | 'draft' | 'superseded'

export interface RateCardClass {
  id: string
  label: string
  baseHalalas: Halalas
  perKmHalalas: Halalas
  perMinHalalas: Halalas
  minFareHalalas: Halalas
  /**
   * **D-F9.** This exists *and* `DB.cancellationPolicy` exists, with different
   * numbers on a different dimension (8.00 / 12.00 by class here; 5 / 10 / 10
   * by scenario there, `:13939`). **Only the policy table is enforced**
   * (`:11832`). Merging them means choosing a dimension — **Q-F1**, Finance
   * lead. Until then both render, side by side, and this one is marked
   * unenforced.
   */
  cancelFeeHalalas: Halalas
  freeWaitMin: number
  waitPerMinHalalas: Halalas
}

export interface RateCardSimulation {
  /** How many real trips the proposal was replayed against. A simulation is not a client computation. */
  trips: number
  riderBeforeHalalas: Halalas
  riderAfterHalalas: Halalas
  /** Signed. Percentage change to the rider's bill. */
  deltaPercent: number
  ranAt: IsoDateTime
}

export interface RateCard {
  version: string
  status: RateCardStatus
  effectiveFrom: IsoDate
  /** `null` while live. Set when a successor supersedes it (AC-406). */
  effectiveTo: IsoDate | null
  /** All consumer prices are VAT-inclusive (`:21430`). */
  vatIncluded: boolean
  classes: RateCardClass[]
  commission: { onDemandPercent: number; subscriptionPercent: number }
  /** `0.90` — the return leg avoids the dead-heading the outbound created (`:21451`). */
  returnLegFactor: number
  planDiscountPercent: Record<PlanKey, number>
  surge: {
    capByCity: Record<string, number>
    minMultiplier: number
    /** `false`, and **not a toggle** (`:21459`). `fareFor(…,{isPlanLeg:true})` forces 1 (`:21474`). */
    appliesToPlanLegs: boolean
  }
  /**
   * The guardrails `planFloorCheck()` computes and **nothing enforces** —
   * the function has no call site in 21,857 lines (**D-F11**, `14a` §19.22).
   * They render as stated guardrails; the publish block is Stage B (AC-407).
   */
  floors: {
    targetMarginPercent: number
    supportCostPerSubscriberHalalas: Halalas
    paymentFeePercent: number
    emergencyReservePercent: number
  }
  proposedByUserId: string | null
  approvedByUserId: string | null
  simulation: RateCardSimulation | null
  createdAt: IsoDateTime
}

/* ───────────────────────── quick rides ──────────────────────── */

/**
 * A quick-ride vehicle class (`:13908`).
 *
 * Under §4.3's recommendation these merge into `rateCard.classes`; until Q7
 * lands they are a separate store with its own numbers (Economy per-km 1.10
 * here, 1.20 on the rate card) and the sub-tab shows both.
 */
export interface QuickRideType {
  id: string
  name: string
  /** What an Arabic rider sees when booking; required on save like a plan's. */
  nameAr: string
  baseFareHalalas: Halalas
  perKmHalalas: Halalas
  perMinHalalas: Halalas
  active: boolean
}

/* ───────────────────── cancellation fees ────────────────────── */

/**
 * A cancellation rule.
 *
 * **A discriminated union, not two nullable fields** (§6.7): a quick-ride rule
 * charges a flat fee in halalas, a subscription rule charges a percentage of
 * the refund otherwise owed, and `{feeHalalas: null, feePercent: null}` and
 * `{feeHalalas: 500, feePercent: 10}` are both states the union cannot express.
 * Same argument as `direction` over a signed amount (§3.1).
 */
export type CancellationRule = QuickRideCancellationRule | SubscriptionCancellationRule

interface CancellationRuleBase {
  id: string
  /** The scenario, keyed. Legacy stores an English sentence (`:13937`). */
  scenario: LocalisedText
  enabled: boolean
  /** `true` = the rule may not be edited at all; it is free by policy (`:13937`). */
  locked: boolean
  note: LocalisedText | null
  /**
   * **NEW field, and the most important one here.**
   *
   * Five of the eight rules have **no consumer** (**D-F7**): only
   * `sub_mid_cycle` (`:5527`), `qr_after_grace` and `qr_rider_noshow`
   * (`:11831`) are ever read. The other five are edited, saved and audited, and
   * never applied — an operator sets `qr_after_arrival` to 10 SAR and no rider
   * is ever charged it. `graceMinutes` on `qr_grace_period` is likewise
   * rendered, saved and read by no enforcement path (**D-F8**).
   *
   * AC-414: a rule with no enforcement path renders a visible `Not enforced`
   * state. It never renders as though it were live.
   */
  hasEnforcement: boolean
}

export interface QuickRideCancellationRule extends CancellationRuleBase {
  appliesTo: 'quick_ride'
  feeHalalas: Halalas
  /** `null` on every rule but `qr_grace_period`. */
  graceMinutes: number | null
}

export interface SubscriptionCancellationRule extends CancellationRuleBase {
  appliesTo: 'subscription'
  /** Percent of the unused-portion refund (`:13943`). */
  feePercent: number
}

/* ────────────────────────── surge ───────────────────────────── */

export interface SurgeWindow {
  id: string
  label: string
  /** 0–23. `endHour` must be **after** `startHour` (AC-412). */
  startHour: number
  endHour: number
  /** `Sun` … `Sat`, as legacy stores them (`:13884`). */
  days: string[]
  multiplier: number
  enabled: boolean
}

/**
 * A live suspension of surge in one zone. Max 12 h (`:21527`); it cannot be
 * extended, only re-raised (AC-409).
 *
 * `expiresIn` is **derived and live** — it counts down — so it is not a field.
 * The client returns `expiresAt` and the screen counts against the clock it
 * was given.
 */
export interface SurgeSuspension {
  id: string
  zoneId: string
  zoneName: string
  reason: string
  setByUserId: string
  setByUserName: string
  startedAt: IsoDateTime
  expiresAt: IsoDateTime
}

export const SURGE_SUSPENSION_MAX_HOURS = 12

/* ───────────── the plan editor's derived values (§8) ────────── */

/**
 * **D-F2, the single source.** Each computed field is defined once. The formula
 * panel renders from these definitions; the computation evaluates them. There
 * is no second copy of any formula anywhere, in code or in markup.
 *
 * Today there are two artefacts and nothing links them: `:1125` is hand-written
 * HTML and `cr()` (`:12986`) is the code. They agree, *which is worse than
 * disagreeing*, because the drift will be silent when it comes.
 *
 * ## The grammar `expression` is written in
 *
 * Identifiers (the ids in `inputs`, plus `exampleMinutes` / `exampleKm`),
 * decimal literals, parentheses, and the operators `+`, `−` (U+2212), `×`
 * (U+00D7), `/`. The display characters are the evaluable ones — one string,
 * rendered and evaluated, so AC-397's *"matches its definition character for
 * character"* is true by construction rather than by review.
 *
 * **The evaluator belongs to utilities-engineer** (§14). This file owns the
 * definitions; it does not own the arithmetic.
 */
export interface DerivedFieldDefinition {
  id: string
  /** `pricing.derived.*`. */
  labelKey: string
  /** Ordered. The recompute listener set is the union of every definition's inputs (§8.2). */
  inputs: string[]
  expression: string
  unit: 'percent' | 'halalas'
  /**
   * Whether this step rounds to a whole halala.
   *
   * **M-1: round once.** The chain carries full precision until the first
   * `true`; legacy rounds at every step (`r2()`, `:19889`, plus at least nine
   * inline `Math.round(x*100)/100`) so a three-step chain rounds three times
   * and the error compounds in one direction.
   */
  rounds: boolean
  /**
   * **M-3: a split never rounds both legs.** The residual leg is
   * `total − counterparty`, so the two always sum exactly and the platform
   * absorbs the rounding. Found, not invented: `vat = amount − net` (`:19966`,
   * `:15867`) and `platformCutHalalas = fare − driverEarn − stopFee`
   * (`src/data/fixtures/trips.ts:11`).
   */
  isResidual: boolean
  /** Evaluated once per vehicle class (Economy, Comfort). */
  perClass: boolean
}

/** Declared in the column header literally (`:1119`). Both are inputs to the worked example. */
export const PLAN_EXAMPLE_INPUTS = { exampleMinutes: 20, exampleKm: 10 } as const

/** §8.4, in order. The formula panel's line count equals this array's length (AC-397). */
export const PLAN_PRICING_DEFINITIONS: readonly DerivedFieldDefinition[] = [
  {
    id: 'driverSharePercent',
    labelKey: 'pricing.derived.driverShare',
    inputs: ['commissionPercent'],
    expression: '100 − commissionPercent',
    unit: 'percent',
    rounds: false,
    isResidual: false,
    perClass: false,
  },
  {
    id: 'grossPerTrip',
    labelKey: 'pricing.derived.gross',
    inputs: ['perMinuteHalalas', 'perKmHalalas'],
    expression: 'exampleMinutes × perMinuteHalalas + exampleKm × perKmHalalas',
    unit: 'halalas',
    rounds: false,
    isResidual: false,
    perClass: true,
  },
  {
    id: 'discountedPerTrip',
    labelKey: 'pricing.derived.discounted',
    inputs: ['grossPerTrip', 'discountPercent'],
    expression: 'grossPerTrip × (1 − discountPercent/100)',
    unit: 'halalas',
    rounds: false,
    isResidual: false,
    perClass: true,
  },
  {
    id: 'planTotal',
    labelKey: 'pricing.derived.planTotal',
    inputs: ['discountedPerTrip', 'executeDays'],
    expression: 'discountedPerTrip × executeDays',
    unit: 'halalas',
    rounds: false,
    isResidual: false,
    perClass: true,
  },
  {
    id: 'driverEarns',
    labelKey: 'pricing.derived.driverEarns',
    inputs: ['planTotal', 'commissionPercent'],
    expression: 'planTotal × (1 − commissionPercent/100)',
    unit: 'halalas',
    /** The first and only rounding in the chain (M-1). */
    rounds: true,
    isResidual: false,
    perClass: true,
  },
  {
    id: 'platformKeeps',
    labelKey: 'pricing.derived.platformKeeps',
    inputs: ['planTotal', 'driverEarns'],
    expression: 'planTotal − driverEarns',
    unit: 'halalas',
    rounds: false,
    /** The residual, so the legs always sum exactly (M-3). New; legacy has no such line. */
    isResidual: true,
    perClass: true,
  },
]

/**
 * The quick-ride editor's chain (FINANCIALS-UX-PLAN §12), one class at a time.
 * Surge is IN, because the quick-ride fare carries it (spec §8.5, D-F4's
 * second case). `surgedFare` rounds because it is what the rider is charged;
 * `driverEarns` rounds and `platformKeeps` is the residual (M-3).
 */
export const QUICK_RIDE_PRICING_DEFINITIONS: readonly DerivedFieldDefinition[] = [
  {
    id: 'driverSharePercent',
    labelKey: 'pricing.derived.driverShare',
    inputs: ['commissionPercent'],
    expression: '100 − commissionPercent',
    unit: 'percent',
    rounds: false,
    isResidual: false,
    perClass: false,
  },
  {
    id: 'baseFare',
    labelKey: 'pricing.derived.quick.base',
    inputs: ['baseFareHalalas', 'perKmHalalas', 'perMinHalalas'],
    expression: 'baseFareHalalas + exampleKm × perKmHalalas + exampleMinutes × perMinHalalas',
    unit: 'halalas',
    rounds: false,
    isResidual: false,
    perClass: false,
  },
  {
    id: 'surgedFare',
    labelKey: 'pricing.derived.quick.surged',
    inputs: ['baseFare', 'surgeMultiplier'],
    expression: 'baseFare × surgeMultiplier',
    unit: 'halalas',
    rounds: true,
    isResidual: false,
    perClass: false,
  },
  {
    id: 'driverEarns',
    labelKey: 'pricing.derived.driverEarns',
    inputs: ['surgedFare', 'commissionPercent'],
    expression: 'surgedFare × (1 − commissionPercent/100)',
    unit: 'halalas',
    rounds: true,
    isResidual: false,
    perClass: false,
  },
  {
    id: 'platformKeeps',
    labelKey: 'pricing.derived.platformKeeps',
    inputs: ['surgedFare', 'driverEarns'],
    expression: 'surgedFare − driverEarns',
    unit: 'halalas',
    rounds: false,
    isResidual: true,
    perClass: false,
  },
]

/**
 * Every numeric input the editor's formulas read. The recompute listener set
 * must equal this exactly (§8.2).
 *
 * Legacy binds 7 listeners (`:13000`) while the formula and the save handler
 * read 11 — `fp3-duration`, `fp3-cap`, `fp3-sort` and the status select are
 * unbound, so the preview strip shows a stale number with no indication.
 */
export const PLAN_PRICING_INPUT_IDS: readonly string[] = [
  ...new Set(PLAN_PRICING_DEFINITIONS.flatMap((d) => d.inputs)),
].filter((id) => !PLAN_PRICING_DEFINITIONS.some((d) => d.id === id))
