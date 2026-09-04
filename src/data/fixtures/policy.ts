/**
 * The seeded operational policy.
 *
 * The reason-code registry is the legacy taxonomy (`DB.reasonCodes`, `:14667`)
 * carried across with three changes, each of which is the point of the rewrite:
 *
 *   1. `labelEn` / `labelAr` become `labels.en` / `labels.ar`, and **`ar` is
 *      never empty**. Legacy's `addReasonCode` seeds `labelAr:''` (`:15121`) and
 *      the table then renders an em dash for it forever (`:15078`), so every
 *      code added after launch is English-only on an Arabic floor.
 *   2. `cat` (a display string) becomes `surfaces` (a set of places the code may
 *      be *picked*). A category tells an operator what a code is about; a
 *      surface tells the product which picker may offer it, and only the second
 *      one is enforceable.
 *   3. `active: false` becomes `state: 'retired'` **with a `retiredAt` and a
 *      named successor**, because "inactive" answers neither *when* nor *use
 *      what instead*.
 *
 * The SLA grid is legacy's tier table (`DB.slaPolicy.tiers`, `:14650`) plus the
 * queue dimension it never had. Legacy hung the override on the reason code;
 * this hangs it on the **queue**, which is where the operator actually reasons
 * about it — Safety answers a T2 faster than Support does, and that is a fact
 * about the desk, not about the scenario.
 *
 * **Inheritance is the default and it is visible in the data:** of 72 cells,
 * six carry an override. `application`, `absence` and `dispute` override nothing
 * at all — they exist so the F-014 test has queues with nothing to lose and can
 * still observe them losing something.
 *
 * No `Date.now()`, no `Math.random()`, no computed timestamps. `retiredAt` is a
 * literal ISO string with the Riyadh offset every other instant in this dataset
 * carries.
 */

import type {
  OperatingCity,
  OperationalPolicy,
  ReasonCode,
  SlaPolicy,
  SlaQueuePolicy,
  SlaQueueTier,
  SlaTierDefault,
} from '../types/policy'

/* ───────────────────────── SLA tier defaults ───────────────────────── */

/**
 * Legacy `:14652`–`:14655`, unchanged in value. T1's `firstResponseMinutes: 0`
 * is the reason every target in this file is `number | null` rather than
 * `number | undefined`: zero is a policy and absence is a different one.
 */
export const slaTierFixtures: SlaTierDefault[] = [
  {
    key: 'T1',
    labelKey: 'policy.sla.tier.T1',
    firstResponseMinutes: 0,
    resolutionMinutes: 240,
    coverage: 'continuous',
    pausesOnCustomer: false,
  },
  {
    key: 'T2',
    labelKey: 'policy.sla.tier.T2',
    firstResponseMinutes: 15,
    resolutionMinutes: 1440,
    coverage: 'continuous',
    pausesOnCustomer: true,
  },
  {
    key: 'T3',
    labelKey: 'policy.sla.tier.T3',
    firstResponseMinutes: 60,
    resolutionMinutes: 2880,
    coverage: 'continuous',
    pausesOnCustomer: true,
  },
  {
    key: 'T4',
    labelKey: 'policy.sla.tier.T4',
    firstResponseMinutes: 240,
    resolutionMinutes: 4320,
    coverage: 'business-hours',
    pausesOnCustomer: true,
  },
]

/** Every cell inherited. The shape a queue starts in, spelled once. */
function inheritedGrid(): SlaQueueTier[] {
  return [
    { tier: 'T1', firstResponseMinutes: null, resolutionMinutes: null },
    { tier: 'T2', firstResponseMinutes: null, resolutionMinutes: null },
    { tier: 'T3', firstResponseMinutes: null, resolutionMinutes: null },
    { tier: 'T4', firstResponseMinutes: null, resolutionMinutes: null },
  ]
}

/** Apply named overrides to a fresh inherited grid. Anything unnamed stays `null`. */
function grid(
  overrides: Partial<Record<'T1' | 'T2' | 'T3' | 'T4', Partial<Omit<SlaQueueTier, 'tier'>>>>,
): SlaQueueTier[] {
  return inheritedGrid().map((cell) => ({ ...cell, ...(overrides[cell.tier] ?? {}) }))
}

/**
 * **One row per `WorkQueueId`, all nine.** The union is the queues that exist;
 * a grid that covered only some of them would leave an operator unable to say
 * anything at all about the rest, and `effectiveSlaTargets` would throw the
 * first time one was asked about.
 *
 * The ids are the canonical singular ones from `types/workQueue.ts` — `ticket`,
 * `incident`, `request`, `application` — not a plural set of this module's own.
 * An SLA row that cannot be joined to a work item is a policy nobody enforces.
 */
export const slaQueueFixtures: SlaQueuePolicy[] = [
  {
    queueId: 'incident',
    labelKey: 'policy.sla.queue.incident',
    /* The one queue that beats every tier default. A T2 safety incident is not
       a T2 billing query, and legacy could only say so by editing the tier —
       which moved billing too. */
    tiers: grid({ T2: { firstResponseMinutes: 5, resolutionMinutes: 240 } }),
    breach: { marksRow: true, reordersQueue: true, escalateToRole: 'ops_supervisor' },
  },
  {
    queueId: 'request',
    labelKey: 'policy.sla.queue.request',
    tiers: grid({ T3: { firstResponseMinutes: 30 } }),
    breach: { marksRow: true, reordersQueue: true, escalateToRole: 'ops_supervisor' },
  },
  {
    queueId: 'fairness',
    labelKey: 'policy.sla.queue.fairness',
    /* A resolution override with the first response still inherited — the mixed
       cell, and the one a save that writes whole rows rather than whole fields
       gets wrong. */
    tiers: grid({ T2: { resolutionMinutes: 2880 } }),
    breach: { marksRow: true, reordersQueue: false, escalateToRole: null },
  },
  {
    queueId: 'assurance',
    labelKey: 'policy.sla.queue.assurance',
    tiers: grid({ T1: { resolutionMinutes: 120 } }),
    breach: { marksRow: true, reordersQueue: true, escalateToRole: 'ops_supervisor' },
  },
  {
    queueId: 'ticket',
    labelKey: 'policy.sla.queue.ticket',
    tiers: grid({ T4: { resolutionMinutes: 5760 } }),
    breach: { marksRow: true, reordersQueue: true, escalateToRole: null },
  },
  {
    queueId: 'dispute',
    labelKey: 'policy.sla.queue.dispute',
    tiers: inheritedGrid(),
    breach: { marksRow: true, reordersQueue: false, escalateToRole: 'finance_lead' },
  },
  /* The three queues that override nothing. They are here so a test can watch a
     queue with nothing to lose lose something anyway. */
  {
    queueId: 'application',
    labelKey: 'policy.sla.queue.application',
    tiers: inheritedGrid(),
    breach: { marksRow: false, reordersQueue: true, escalateToRole: null },
  },
  {
    queueId: 'absence',
    labelKey: 'policy.sla.queue.absence',
    tiers: inheritedGrid(),
    breach: { marksRow: false, reordersQueue: false, escalateToRole: null },
  },
  {
    queueId: 'erasure',
    labelKey: 'policy.sla.queue.erasure',
    /* A statutory clock, not an operational one — PDPL gives 30 days and the
       tier defaults have no opinion about statute. */
    tiers: grid({ T3: { resolutionMinutes: 43_200 } }),
    breach: { marksRow: true, reordersQueue: true, escalateToRole: 'ops_supervisor' },
  },
]

export const slaPolicyFixture: SlaPolicy = {
  tiers: slaTierFixtures,
  queues: slaQueueFixtures,
  atRiskPercent: 75,
  uncodedCeilingPercent: 3,
}

/* ────────────────────── the reason-code registry ────────────────────── */

/**
 * 30 codes across all eight surfaces, seeded from the call-centre guide.
 *
 * Two are retired, and they are retired for the two different reasons a code
 * ever is: `TRP_GHOST_COMPLETE` was **split** into two more precise successors,
 * and `APP_PROMO` was **superseded** when promotions moved off the trip record.
 * Both still appear on historical records — that is what the retirement test
 * asserts.
 */
export const reasonCodeFixtures: ReasonCode[] = [
  /* ── captain conduct and reliability ── */
  {
    key: 'CAP_CANCEL_ADV',
    reference: '1.1',
    labels: { en: 'Captain cancelled in advance', ar: 'إلغاء الكابتن مسبقاً' },
    surfaces: ['trip-cancellation', 'refund', 'ticket'],
    requiresNote: false,
    state: 'active',
    tier: 'T2',
    ownerTeam: 'Supply',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'CAP_LATE',
    reference: '1.2',
    labels: { en: 'Captain late for pickup', ar: 'تأخر الكابتن عن الالتقاط' },
    surfaces: ['ticket', 'wallet-adjustment'],
    requiresNote: false,
    state: 'active',
    tier: 'T3',
    /* Legacy `upd: 15` (`:14670`): a rider waiting for a late captain is promised news every quarter hour. */
    updateEveryMinutes: 15,
    ownerTeam: 'Ops',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'CAP_NOSHOW',
    reference: '1.3',
    labels: { en: 'Captain no-show', ar: 'عدم حضور الكابتن' },
    surfaces: ['trip-cancellation', 'refund', 'payout-deduction', 'ticket'],
    requiresNote: false,
    state: 'active',
    tier: 'T2',
    ownerTeam: 'Supply',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'CAP_OFFPLATFORM_PAY',
    reference: '1.4',
    labels: { en: 'Captain asked for cash off-platform', ar: 'طلب الكابتن دفعاً خارج المنصة' },
    surfaces: ['suspension', 'dispute-outcome', 'ticket'],
    requiresNote: true,
    state: 'active',
    tier: 'T2',
    ownerTeam: 'Compliance',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'CAP_CONDUCT',
    reference: '1.5',
    labels: { en: 'Captain behaved inappropriately', ar: 'سلوك غير لائق من الكابتن' },
    surfaces: ['suspension', 'dispute-outcome', 'ticket'],
    requiresNote: true,
    state: 'active',
    tier: 'T1',
    ownerTeam: 'Supply',
    retiredAt: null,
    supersededByKey: null,
  },

  /* ── booking ── */
  {
    key: 'BKG_CANCEL_REQ',
    reference: '2.1',
    labels: { en: 'Rider cancelled the booking', ar: 'طلب الراكب إلغاء الحجز' },
    surfaces: ['trip-cancellation', 'ticket'],
    requiresNote: false,
    state: 'active',
    tier: 'T4',
    ownerTeam: null,
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'BKG_WRONG_SLOT',
    reference: '2.2',
    labels: { en: 'Rider booked the wrong date or time', ar: 'حجز بتاريخ أو وقت خاطئ' },
    surfaces: ['trip-cancellation', 'refund', 'ticket'],
    requiresNote: false,
    state: 'active',
    tier: 'T4',
    ownerTeam: 'Product',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'BKG_NO_SUPPLY',
    reference: '2.3',
    labels: { en: 'No captain available in the area', ar: 'لا يوجد كابتن متاح في المنطقة' },
    surfaces: ['trip-cancellation', 'refund', 'ticket'],
    requiresNote: false,
    state: 'active',
    tier: 'T3',
    ownerTeam: 'Supply',
    retiredAt: null,
    supersededByKey: null,
  },

  /* ── payment ── */
  {
    key: 'PAY_INCORRECT_CHARGE',
    reference: '3.1',
    labels: { en: 'Rider charged incorrectly', ar: 'خصم مبلغ غير صحيح' },
    surfaces: ['refund', 'wallet-adjustment', 'dispute-outcome', 'ticket'],
    requiresNote: true,
    state: 'active',
    tier: 'T2',
    ownerTeam: 'Payments',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'PAY_DECLINED',
    reference: '3.2',
    labels: { en: 'Payment failed or was declined', ar: 'فشل أو رفض الدفع' },
    surfaces: ['ticket', 'subscription-freeze'],
    requiresNote: false,
    state: 'active',
    tier: 'T3',
    ownerTeam: 'Payments',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'PAY_REFUND_REQ',
    reference: '3.3',
    labels: { en: 'Rider asked for a refund', ar: 'طلب استرداد' },
    surfaces: ['refund', 'ticket'],
    requiresNote: false,
    state: 'active',
    tier: 'T2',
    ownerTeam: 'Ops',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'PAY_GOODWILL',
    reference: null,
    labels: { en: 'Goodwill credit, no fault found', ar: 'رصيد حسن نية دون خطأ' },
    surfaces: ['wallet-adjustment', 'refund'],
    /* No fault found means the ledger has nothing to point at. The elaboration
       IS the justification, so it is not optional. */
    requiresNote: true,
    state: 'active',
    tier: 'T4',
    ownerTeam: 'Ops',
    retiredAt: null,
    supersededByKey: null,
  },

  /* ── trip ── */
  {
    key: 'TRP_ROUTE_DEVIATION',
    reference: '4.1',
    labels: { en: 'Captain took the wrong route', ar: 'مسار خاطئ' },
    surfaces: ['refund', 'dispute-outcome', 'ticket'],
    requiresNote: false,
    state: 'active',
    tier: 'T3',
    ownerTeam: 'Supply',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'TRP_LOST_ITEM',
    reference: '4.2',
    labels: { en: 'Rider left belongings in the vehicle', ar: 'نسيان أغراض في المركبة' },
    surfaces: ['ticket'],
    requiresNote: true,
    state: 'active',
    tier: 'T3',
    /* Legacy `upd: 30` (`:14686`): the rider is told every half hour where the search stands. */
    updateEveryMinutes: 30,
    ownerTeam: 'Ops',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'TRP_GHOST_COMPLETE',
    reference: '4.3',
    labels: {
      en: 'Trip completed but the rider never boarded',
      ar: 'إنهاء رحلة دون ركوب الراكب',
    },
    surfaces: ['refund', 'payout-deduction', 'dispute-outcome'],
    requiresNote: true,
    /* Retired because it conflated two different findings — a captain who ended
       a trip they never ran, and a GPS desync that ended it for them. Both
       successors exist below. Every closed dispute from before the split still
       points here. */
    state: 'retired',
    tier: 'T1',
    ownerTeam: 'Supply',
    retiredAt: '2026-04-02T11:00:00+03:00',
    supersededByKey: 'TRP_FALSE_COMPLETE',
    },
  {
    key: 'TRP_FALSE_COMPLETE',
    reference: null,
    labels: { en: 'Captain ended a trip that never ran', ar: 'إنهاء رحلة لم تُنفَّذ' },
    surfaces: ['refund', 'payout-deduction', 'dispute-outcome', 'suspension'],
    requiresNote: true,
    state: 'active',
    tier: 'T1',
    ownerTeam: 'Supply',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'TECH_STATE_DESYNC',
    reference: null,
    labels: { en: 'Ride state desync — the two apps disagree', ar: 'عدم تطابق حالة الرحلة بين التطبيقين' },
    surfaces: ['refund', 'dispute-outcome', 'ticket'],
    requiresNote: false,
    state: 'active',
    tier: 'T2',
    ownerTeam: 'Engineering',
    retiredAt: null,
    supersededByKey: null,
  },

  /* ── technical ── */
  {
    key: 'APP_LOGIN',
    reference: '5.1',
    labels: { en: 'Rider cannot sign in', ar: 'تعذر تسجيل الدخول' },
    surfaces: ['ticket'],
    requiresNote: false,
    state: 'active',
    tier: 'T3',
    ownerTeam: 'Engineering',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'APP_CRASH',
    reference: '5.2',
    labels: { en: 'App crashes or will not open', ar: 'تعطل التطبيق' },
    surfaces: ['ticket'],
    requiresNote: false,
    state: 'active',
    tier: 'T3',
    ownerTeam: 'Engineering',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'APP_PROMO',
    reference: '5.3',
    labels: { en: 'Promo code did not apply', ar: 'عدم تطبيق كود الخصم' },
    surfaces: ['refund', 'wallet-adjustment', 'ticket'],
    requiresNote: false,
    /* Retired when promotions moved off the trip record: the code named a place
       in the product that no longer exists. */
    state: 'retired',
    tier: 'T4',
    ownerTeam: 'Marketing',
    retiredAt: '2026-05-18T14:30:00+03:00',
    supersededByKey: null,
  },

  /* ── safety ── */
  {
    key: 'SAF_RIDER_UNSAFE',
    reference: '6.1',
    labels: { en: 'Rider felt unsafe during the trip', ar: 'شعور الراكب بعدم الأمان' },
    surfaces: ['suspension', 'dispute-outcome', 'ticket'],
    requiresNote: true,
    state: 'active',
    tier: 'T1',
    ownerTeam: 'Safety',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'SAF_ACCIDENT',
    reference: '6.2',
    labels: { en: 'Accident or vehicle breakdown', ar: 'حادث أو عطل بالمركبة' },
    surfaces: ['trip-cancellation', 'refund', 'ticket'],
    requiresNote: true,
    state: 'active',
    tier: 'T1',
    ownerTeam: 'Safety',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'SAF_THEFT',
    reference: '6.3',
    labels: { en: 'Item lost or stolen during the trip', ar: 'فقدان أو سرقة غرض أثناء الرحلة' },
    surfaces: ['suspension', 'dispute-outcome', 'ticket'],
    requiresNote: true,
    state: 'active',
    tier: 'T2',
    ownerTeam: 'Compliance',
    retiredAt: null,
    supersededByKey: null,
  },

  /* ── subscription ── */
  {
    key: 'SUB_SAME_CAPTAIN_BROKEN',
    reference: null,
    labels: { en: 'Assigned captain changed mid-plan', ar: 'تغيير الكابتن أثناء الباقة' },
    surfaces: ['refund', 'wallet-adjustment', 'ticket'],
    requiresNote: false,
    state: 'active',
    tier: 'T2',
    ownerTeam: 'Supply',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'SUB_FREEZE_TRAVEL',
    reference: null,
    labels: { en: 'Rider away — plan paused', ar: 'سفر الراكب — تجميد الباقة' },
    surfaces: ['subscription-freeze'],
    requiresNote: false,
    state: 'active',
    tier: 'T4',
    ownerTeam: 'Product',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'SUB_FREEZE_MEDICAL',
    reference: null,
    labels: { en: 'Medical reason — plan paused', ar: 'سبب طبي — تجميد الباقة' },
    surfaces: ['subscription-freeze'],
    requiresNote: true,
    state: 'active',
    tier: 'T3',
    ownerTeam: 'Product',
    retiredAt: null,
    supersededByKey: null,
  },

  /* ── captain-side disputes and money ── */
  {
    key: 'DRV_RATING_DISPUTE',
    reference: null,
    labels: { en: 'Captain disputes an unfair rating', ar: 'اعتراض الكابتن على تقييم غير عادل' },
    surfaces: ['dispute-outcome', 'ticket'],
    requiresNote: false,
    state: 'active',
    tier: 'T3',
    ownerTeam: 'Ops',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'DRV_DEDUCTION_DISPUTE',
    reference: null,
    labels: { en: 'Captain disputes a deduction', ar: 'اعتراض الكابتن على خصم' },
    surfaces: ['dispute-outcome', 'payout-deduction', 'ticket'],
    requiresNote: true,
    state: 'active',
    tier: 'T2',
    ownerTeam: 'Ops',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'DRV_SUSPENSION_APPEAL',
    reference: null,
    labels: { en: 'Captain appeals a suspension', ar: 'تظلم الكابتن من الإيقاف' },
    surfaces: ['dispute-outcome', 'suspension', 'ticket'],
    requiresNote: true,
    state: 'active',
    tier: 'T2',
    ownerTeam: 'Compliance',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'DRV_DOC_EXPIRED',
    reference: null,
    labels: { en: 'Required document expired', ar: 'انتهاء صلاحية مستند مطلوب' },
    surfaces: ['suspension'],
    requiresNote: false,
    state: 'active',
    tier: 'T3',
    ownerTeam: 'Compliance',
    retiredAt: null,
    supersededByKey: null,
  },
  {
    key: 'CASH_SHORTFALL',
    reference: null,
    labels: { en: 'Cash collected does not match the trip', ar: 'عدم تطابق النقد المحصّل مع الرحلة' },
    surfaces: ['payout-deduction', 'dispute-outcome'],
    requiresNote: true,
    state: 'active',
    tier: 'T2',
    ownerTeam: 'Finance',
    retiredAt: null,
    supersededByKey: null,
  },

  /* ── the escape hatch ── */
  {
    key: 'OTHER_UNCODED',
    reference: null,
    labels: { en: 'Other — needs a taxonomy review', ar: 'غير مصنّف — يحتاج مراجعة' },
    /* On every surface, because it is what an operator reaches for when nothing
       else fits — and it always demands the elaboration, since the free text is
       the only record of what actually happened. */
    surfaces: [
      'trip-cancellation',
      'refund',
      'suspension',
      'dispute-outcome',
      'wallet-adjustment',
      'payout-deduction',
      'subscription-freeze',
      'ticket',
    ],
    requiresNote: true,
    state: 'active',
    tier: 'T3',
    ownerTeam: 'Ops',
    retiredAt: null,
    supersededByKey: null,
  },
]

/* ─────────────────────── cities, dispatch, limits ─────────────────────── */

/**
 * `activeCaptains` is the fleet, not the policy — carried here so the table can
 * show what a city switch would strand, and excluded from the save input so it
 * can never be written by an operator toggling a service.
 */
export const operatingCityFixtures: OperatingCity[] = [
  {
    id: 'CITY-01',
    nameEn: 'Riyadh',
    nameAr: 'الرياض',
    quickRidesEnabled: true,
    subscriptionsEnabled: true,
    activeCaptains: 142,
  },
  {
    id: 'CITY-02',
    nameEn: 'Jeddah',
    nameAr: 'جدة',
    quickRidesEnabled: true,
    subscriptionsEnabled: true,
    activeCaptains: 86,
  },
  {
    id: 'CITY-03',
    nameEn: 'Dammam',
    nameAr: 'الدمام',
    quickRidesEnabled: true,
    subscriptionsEnabled: true,
    activeCaptains: 45,
  },
  {
    id: 'CITY-04',
    nameEn: 'Mecca',
    nameAr: 'مكة المكرمة',
    quickRidesEnabled: false,
    subscriptionsEnabled: true,
    activeCaptains: 28,
  },
  {
    id: 'CITY-05',
    nameEn: 'Medina',
    nameAr: 'المدينة المنورة',
    quickRidesEnabled: true,
    subscriptionsEnabled: false,
    activeCaptains: 19,
  },
]

/**
 * The seeded document. **Frozen values, no derivation** — every number here was
 * a string literal in a `useState` on the screen (`AdminPolicyScreen.tsx:37`–
 * `:42`) and is now a typed integer in its base unit.
 */
export const operationalPolicyFixture: OperationalPolicy = {
  dispatch: {
    /* `5.0 km` on the old form. Metres, so the wire carries no decimal. */
    initialSearchRadiusMetres: 5000,
    searchPhaseTimeoutSeconds: 45,
    /* `2.5×` on the old form. */
    maxSurgePercent: 250,
  },
  cities: operatingCityFixtures,
  limits: {
    /* `10` hours on the old form. Minutes, shared with every SLA target beside it. */
    maxCaptainDailyDrivingMinutes: 600,
    maxConcurrentSubscriptionsPerCaptain: 5,
    maxRiderDailyCancellations: 3,
  },
  reasonCodes: reasonCodeFixtures,
  sla: slaPolicyFixture,
}
