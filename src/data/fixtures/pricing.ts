/**
 * Pricing & Plans fixtures — the catalogue, the rate card and its history,
 * quick rides, surge and cancellation fees.
 *
 * Every number is the legacy seed converted to halalas, with the source line
 * cited. **Nothing here decides Q7.** Where two stores disagree — and they
 * disagree about commission, per-km rate, plan discount and cancellation fee —
 * both values are seeded, because the `Pricing & Plans` sub-tab's Stage-A job
 * is to show the operator that they disagree.
 */

import type {
  CancellationRule,
  QuickRideType,
  RateCard,
  SubscriptionPlan,
  SurgeSuspension,
  SurgeWindow,
} from '../types/pricing'

/* ─────────────────────── the plan catalogue ─────────────────── */

/**
 * `DB.plans` (`:2889`), halalas for money and percent for rates.
 *
 * `pricingEditable: false` on all three: **Stage A** ships the catalogue half
 * editable and the pricing half in §4.6's disabled treatment, under one
 * page-level banner naming Q7 and who owns it (§4.5). Not `derived` —
 * disabled, because these inputs *will* become available and that is exactly
 * what disabled means.
 */
export const subscriptionPlanFixtures: SubscriptionPlan[] = [
  {
    id: 'weekly',
    nameEn: 'Weekly',
    nameAr: 'الباقة الأسبوعية',
    durationDays: 7,
    executeDays: 5,
    cancelCap: 1,
    sortOrder: 1,
    status: 'active',
    features: [
      { en: 'Same captain every trip', ar: 'نفس السائق في كل رحلة' },
      { en: 'No waiting at pickup time', ar: 'بلا انتظار في وقت الالتقاط' },
      { en: 'Save up to 30% vs single rides', ar: 'وفر حتى 30% مقارنة بالرحلات الفردية' },
    ],
    economyActive: true,
    comfortActive: true,
    commissionPercent: 20,
    discountPercent: 0,
    economyPerMinuteHalalas: 95,
    economyPerKmHalalas: 110,
    comfortPerMinuteHalalas: 135,
    comfortPerKmHalalas: 160,
    pricingSource: 'plan',
    pricingEditable: false,
  },
  {
    id: 'biweekly',
    nameEn: 'Bi-weekly',
    nameAr: 'الباقة نصف الشهرية',
    durationDays: 14,
    executeDays: 10,
    cancelCap: 2,
    sortOrder: 2,
    status: 'active',
    features: [
      { en: 'Same captain every trip', ar: 'نفس السائق في كل رحلة' },
      { en: 'Save up to 35% vs single rides', ar: 'وفر حتى 35% مقارنة بالرحلات الفردية' },
    ],
    economyActive: true,
    comfortActive: true,
    commissionPercent: 18,
    discountPercent: 5,
    economyPerMinuteHalalas: 85,
    economyPerKmHalalas: 98,
    comfortPerMinuteHalalas: 120,
    comfortPerKmHalalas: 142,
    pricingSource: 'plan',
    pricingEditable: false,
  },
  {
    /* Draft. The status select at `:1105` is read by **nothing** in
       `savePlan()`, so an operator can change it, see it change, save, and lose
       it (§8.6). AC-401 wires it. */
    id: 'monthly',
    nameEn: 'Monthly',
    nameAr: 'الباقة الشهرية',
    durationDays: 30,
    executeDays: 22,
    cancelCap: 5,
    sortOrder: 3,
    status: 'draft',
    features: [
      { en: 'Same captain every trip', ar: 'نفس السائق في كل رحلة' },
      { en: 'Save up to 40% vs single rides', ar: 'وفر حتى 40% مقارنة بالرحلات الفردية' },
      { en: 'Priority support', ar: 'دعم ذو أولوية' },
    ],
    economyActive: true,
    comfortActive: true,
    commissionPercent: 15,
    discountPercent: 10,
    economyPerMinuteHalalas: 72,
    economyPerKmHalalas: 85,
    comfortPerMinuteHalalas: 105,
    comfortPerKmHalalas: 125,
    pricingSource: 'plan',
    pricingEditable: false,
  },
]

/* ─────────────────────────── rate card ──────────────────────── */

const RATE_CARD_CLASSES = [
  {
    id: 'economy',
    label: 'Economy',
    baseHalalas: 500,
    perKmHalalas: 120,
    perMinHalalas: 40,
    minFareHalalas: 1_200,
    /* 8.00 by class here; `DB.cancellationPolicy` says 5.00 / 10.00 by
       scenario and **only that one is enforced** (D-F9, Q-F1). */
    cancelFeeHalalas: 800,
    freeWaitMin: 5,
    waitPerMinHalalas: 50,
  },
  {
    id: 'comfort',
    label: 'Comfort',
    baseHalalas: 800,
    perKmHalalas: 175,
    perMinHalalas: 55,
    minFareHalalas: 1_800,
    cancelFeeHalalas: 1_200,
    freeWaitMin: 5,
    waitPerMinHalalas: 75,
  },
]

const RATE_CARD_FLOORS = {
  targetMarginPercent: 12,
  supportCostPerSubscriberHalalas: 900,
  paymentFeePercent: 2.2,
  emergencyReservePercent: 3.5,
}

/**
 * Four cards: one superseded, one live, and two drafts that exist to make the
 * two `Approve`-disabled states reachable without hand-editing anything.
 *
 * **Departure from the legacy seed, recorded.** `DB.rateCard` is
 * `{status:'live', effectiveFrom:'2026-08-01'}` (`:21431`) against an app whose
 * today is 25 June 2026 — a live rate card that has not taken effect, pricing
 * every trip six weeks before it exists. The live card here is dated
 * 2026-04-01; the August date survives as the *proposed* draft, which is what
 * it must actually have been.
 */
export const rateCardFixtures: RateCard[] = [
  {
    version: 'RC-2026-01-01',
    status: 'superseded',
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-04-01',
    vatIncluded: true,
    classes: [
      { ...RATE_CARD_CLASSES[0]!, baseHalalas: 450, perKmHalalas: 110, minFareHalalas: 1_100 },
      { ...RATE_CARD_CLASSES[1]!, baseHalalas: 750, perKmHalalas: 165, minFareHalalas: 1_700 },
    ],
    commission: { onDemandPercent: 20, subscriptionPercent: 18 },
    returnLegFactor: 0.9,
    planDiscountPercent: { weekly: 10, biweekly: 14, monthly: 18 },
    surge: { capByCity: { RUH: 2.0, JED: 2.0 }, minMultiplier: 1.0, appliesToPlanLegs: false },
    floors: RATE_CARD_FLOORS,
    proposedByUserId: 'USR-2',
    approvedByUserId: 'USR-1',
    simulation: {
      trips: 3_412,
      riderBeforeHalalas: 2_180,
      riderAfterHalalas: 2_180,
      deltaPercent: 0,
      ranAt: '2025-12-18T11:00:00+03:00',
    },
    createdAt: '2025-12-18T10:40:00+03:00',
  },
  {
    version: 'RC-2026-04-01',
    status: 'live',
    effectiveFrom: '2026-04-01',
    effectiveTo: null,
    vatIncluded: true,
    classes: RATE_CARD_CLASSES,
    commission: { onDemandPercent: 22, subscriptionPercent: 20 },
    returnLegFactor: 0.9,
    planDiscountPercent: { weekly: 12, biweekly: 16, monthly: 20 },
    surge: { capByCity: { RUH: 2.0, JED: 2.0 }, minMultiplier: 1.0, appliesToPlanLegs: false },
    floors: RATE_CARD_FLOORS,
    proposedByUserId: 'USR-2',
    approvedByUserId: 'USR-1',
    simulation: {
      trips: 4_186,
      riderBeforeHalalas: 2_180,
      riderAfterHalalas: 2_294,
      deltaPercent: 5.2,
      ranAt: '2026-03-21T09:30:00+03:00',
    },
    createdAt: '2026-03-21T09:12:00+03:00',
  },
  {
    /* Proposed by USR-2, who therefore **cannot approve it**. `Approve` renders
       disabled with the reason on it — a render-time state, not the
       commit-time refusal legacy uses (`:21586`, AC-405). */
    version: 'RC-2026-08-01',
    status: 'draft',
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
    vatIncluded: true,
    classes: [
      { ...RATE_CARD_CLASSES[0]!, perKmHalalas: 128, perMinHalalas: 42 },
      { ...RATE_CARD_CLASSES[1]!, perKmHalalas: 185, perMinHalalas: 58 },
    ],
    commission: { onDemandPercent: 22, subscriptionPercent: 20 },
    returnLegFactor: 0.9,
    planDiscountPercent: { weekly: 12, biweekly: 16, monthly: 20 },
    surge: { capByCity: { RUH: 2.0, JED: 2.0 }, minMultiplier: 1.0, appliesToPlanLegs: false },
    floors: RATE_CARD_FLOORS,
    proposedByUserId: 'USR-2',
    approvedByUserId: null,
    simulation: {
      trips: 4_186,
      riderBeforeHalalas: 2_294,
      riderAfterHalalas: 2_372,
      deltaPercent: 3.4,
      ranAt: '2026-06-20T14:05:00+03:00',
    },
    createdAt: '2026-06-20T13:50:00+03:00',
  },
  {
    /* **No simulation.** `Approve` disabled, reason: a price nobody modelled
       cannot be approved (`:21590`, AC-404). */
    version: 'RC-2026-09-01',
    status: 'draft',
    effectiveFrom: '2026-09-01',
    effectiveTo: null,
    vatIncluded: true,
    classes: [
      { ...RATE_CARD_CLASSES[0]!, minFareHalalas: 1_400 },
      { ...RATE_CARD_CLASSES[1]!, minFareHalalas: 2_000 },
    ],
    commission: { onDemandPercent: 24, subscriptionPercent: 21 },
    returnLegFactor: 0.9,
    planDiscountPercent: { weekly: 12, biweekly: 16, monthly: 20 },
    surge: { capByCity: { RUH: 2.0, JED: 2.0 }, minMultiplier: 1.0, appliesToPlanLegs: false },
    floors: RATE_CARD_FLOORS,
    proposedByUserId: 'USR-1',
    approvedByUserId: null,
    simulation: null,
    createdAt: '2026-06-24T16:20:00+03:00',
  },
]

/** The one card that prices a trip today. */
export const liveRateCardFixture: RateCard = rateCardFixtures.find((c) => c.status === 'live')!

/* ───────────────────────── quick rides ──────────────────────── */

/**
 * `:13908`. Economy per-km is **1.10 here and 1.20 on the rate card** — one of
 * the four disagreements §4.1 lists, and the reason the `Quick rides` view
 * shows both until Q7 lands.
 */
export const quickRideTypeFixtures: QuickRideType[] = [
  {
    id: 'economy',
    name: 'Economy',
    baseFareHalalas: 250,
    perKmHalalas: 110,
    perMinHalalas: 35,
    active: true,
  },
  {
    id: 'comfort',
    name: 'Comfort',
    baseFareHalalas: 400,
    perKmHalalas: 160,
    perMinHalalas: 50,
    active: true,
  },
  {
    id: 'large',
    name: 'Large',
    baseFareHalalas: 600,
    perKmHalalas: 210,
    perMinHalalas: 65,
    active: true,
  },
]

/* ───────────────────── cancellation fees ────────────────────── */

/**
 * All eight rules from `:13936`. **`hasEnforcement` is `true` on exactly three**
 * — `qr_after_grace` and `qr_rider_noshow` (`:11831`) and `sub_mid_cycle`
 * (`:5527`). The other five are edited, saved and audited, and never applied
 * (**D-F7**). `qr_grace_period`'s `graceMinutes` is likewise rendered, saved and
 * read by no enforcement path (**D-F8**).
 *
 * AC-414: a rule with no enforcement path renders `Not enforced`. It never
 * renders as though it were live.
 */
export const cancellationRuleFixtures: CancellationRule[] = [
  {
    id: 'qr_before_assigned',
    appliesTo: 'quick_ride',
    scenario: { key: 'pricing.cancel.qrBeforeAssigned' },
    feeHalalas: 0,
    graceMinutes: null,
    enabled: false,
    locked: true,
    note: { key: 'pricing.cancel.note.alwaysFreeNoCommitment' },
    hasEnforcement: false,
  },
  {
    id: 'qr_grace_period',
    appliesTo: 'quick_ride',
    scenario: { key: 'pricing.cancel.qrGracePeriod' },
    feeHalalas: 0,
    graceMinutes: 2,
    enabled: true,
    locked: false,
    note: { key: 'pricing.cancel.note.graceWindow' },
    hasEnforcement: false,
  },
  {
    id: 'qr_after_grace',
    appliesTo: 'quick_ride',
    scenario: { key: 'pricing.cancel.qrAfterGrace' },
    feeHalalas: 500,
    graceMinutes: null,
    enabled: true,
    locked: false,
    note: null,
    hasEnforcement: true,
  },
  {
    id: 'qr_after_arrival',
    appliesTo: 'quick_ride',
    scenario: { key: 'pricing.cancel.qrAfterArrival' },
    feeHalalas: 1_000,
    graceMinutes: null,
    enabled: true,
    locked: false,
    note: null,
    hasEnforcement: false,
  },
  {
    id: 'qr_driver_fault',
    appliesTo: 'quick_ride',
    scenario: { key: 'pricing.cancel.qrDriverFault' },
    feeHalalas: 0,
    graceMinutes: null,
    enabled: false,
    locked: true,
    note: { key: 'pricing.cancel.note.alwaysFreeDriverFault' },
    hasEnforcement: false,
  },
  {
    id: 'qr_rider_noshow',
    appliesTo: 'quick_ride',
    scenario: { key: 'pricing.cancel.qrRiderNoShow' },
    feeHalalas: 1_000,
    graceMinutes: null,
    enabled: true,
    locked: false,
    note: null,
    hasEnforcement: true,
  },
  {
    id: 'sub_before_first_trip',
    appliesTo: 'subscription',
    scenario: { key: 'pricing.cancel.subBeforeFirstTrip' },
    feePercent: 0,
    enabled: false,
    locked: true,
    note: { key: 'pricing.cancel.note.fullRefundNothingDelivered' },
    hasEnforcement: false,
  },
  {
    id: 'sub_mid_cycle',
    appliesTo: 'subscription',
    scenario: { key: 'pricing.cancel.subMidCycle' },
    feePercent: 10,
    enabled: true,
    locked: false,
    note: { key: 'pricing.cancel.note.unusedPortion' },
    hasEnforcement: true,
  },
]

/* ────────────────────────── surge ───────────────────────────── */

/** `:13883`. One disabled window, so the state is reachable. */
export const surgeWindowFixtures: SurgeWindow[] = [
  {
    id: 'surge_1',
    label: 'Morning rush',
    startHour: 7,
    endHour: 9,
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
    multiplier: 1.3,
    enabled: true,
  },
  {
    id: 'surge_2',
    label: 'Evening rush',
    startHour: 17,
    endHour: 20,
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
    multiplier: 1.5,
    enabled: true,
  },
  {
    id: 'surge_3',
    label: 'Weekend evening',
    startHour: 20,
    endHour: 23,
    days: ['Thu', 'Fri'],
    multiplier: 1.2,
    enabled: false,
  },
]

/**
 * One suspension running now — started 07:14, expires 13:14, against
 * `EYVAR_NOW` of 09:14. The countdown is **derived and live**; the client
 * returns `expiresAt` and the screen counts against the clock it was given, so
 * nothing here moves between runs.
 */
export const surgeSuspensionFixtures: SurgeSuspension[] = [
  {
    id: 'SUS-0001',
    zoneId: 'al-narjis',
    zoneName: 'Al Narjis',
    reason: 'Stadium event — surge would price out the evening commute',
    setByUserId: 'USR-5',
    setByUserName: 'Yousef Al-Balawi',
    startedAt: '2026-06-25T07:14:00+03:00',
    expiresAt: '2026-06-25T13:14:00+03:00',
  },
]
