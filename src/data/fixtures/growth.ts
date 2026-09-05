/**
 * Growth fixtures — the four lists under `/management/growth`.
 * The four promos, one referral, four incentives and the seeded bonus log are
 * legacy's own (`eyvar_ops_panel_v40_fixed.html:13495`, `:13888`, `:13564`,
 * `:13895`); everything past them exists so each state in
 * `specs/management-growth-tables.md` is reachable without hand-editing.
 */

import type {
  GrowthBulkMessage,
  GrowthIncentive,
  GrowthPromo,
  GrowthReferral,
} from '../types/growth'

/* `promoROI(p)`: `newSubs × 8650 halalas ÷ spent` (`:13501`), to one decimal.
   `0` when nothing has been spent, which is what legacy's guard returns. */
const ATTRIBUTED_HALALAS_PER_SUB = 8_650

function roiOf(newSubscriptions: number, spentHalalas: number): number {
  if (spentHalalas <= 0) return 0
  return Math.round(((newSubscriptions * ATTRIBUTED_HALALAS_PER_SUB) / spentHalalas) * 10) / 10
}

function burnOf(spentHalalas: number, budgetHalalas: number): number {
  if (budgetHalalas <= 0) return 0
  return Math.round((spentHalalas / budgetHalalas) * 100)
}

function promo(
  row: Omit<GrowthPromo, 'burnPercent' | 'roi'>,
): GrowthPromo {
  return {
    ...row,
    burnPercent: burnOf(row.spentHalalas, row.budgetHalalas),
    roi: roiOf(row.newSubscriptions, row.spentHalalas),
  }
}

/**
 * Ten campaigns. The first four are legacy's seed verbatim; the rest carry the
 * states its four never reached — a paused campaign, a zero-spend campaign
 * whose return is therefore `0`, an over-budget one at 118 %, a code long
 * enough to truncate, and enough rows to page at 25 only after a second page
 * is asked for.
 */
export const growthPromoFixtures: readonly GrowthPromo[] = [
  promo({
    code: 'EYVAR30',
    discountPercent: 30,
    budgetHalalas: 500_000,
    spentHalalas: 418_000,
    uses: 214,
    newSubscriptions: 61,
    target: 'new-riders',
    perUserLimit: 1,
    expiresOn: '2026-07-31',
    status: 'active',
    createdAt: '2026-05-02T08:00:00+03:00',
  }),
  promo({
    code: 'BACK2WORK',
    discountPercent: 15,
    budgetHalalas: 300_000,
    spentHalalas: 300_000,
    uses: 180,
    newSubscriptions: 32,
    target: 'lapsed-subscribers',
    perUserLimit: 1,
    expiresOn: '2026-07-15',
    status: 'exhausted',
    createdAt: '2026-04-18T08:00:00+03:00',
  }),
  promo({
    code: 'MONTHLY10',
    discountPercent: 10,
    budgetHalalas: 800_000,
    spentHalalas: 124_000,
    uses: 41,
    newSubscriptions: 38,
    target: 'monthly-plan',
    perUserLimit: 2,
    expiresOn: '2026-09-01',
    status: 'active',
    createdAt: '2026-05-20T08:00:00+03:00',
  }),
  promo({
    code: 'RAMADAN25',
    discountPercent: 25,
    budgetHalalas: 600_000,
    spentHalalas: 592_000,
    uses: 301,
    newSubscriptions: 88,
    target: 'all-riders',
    perUserLimit: 1,
    expiresOn: '2026-04-10',
    status: 'expired',
    createdAt: '2026-02-25T08:00:00+03:00',
  }),
  /* The paused state. Legacy can reach it only by clicking `Pause`, so nothing
     has ever rendered a `Resume` lane on first paint. */
  promo({
    code: 'NARJIS15',
    discountPercent: 15,
    budgetHalalas: 250_000,
    spentHalalas: 96_500,
    uses: 47,
    newSubscriptions: 11,
    target: 'zone',
    perUserLimit: 1,
    expiresOn: '2026-08-15',
    status: 'paused',
    createdAt: '2026-06-01T08:00:00+03:00',
  }),
  /* Zero spend, so the return is a real `0` and not an absence. Its burn bar is
     empty and its burn cell reads `0 %`. */
  promo({
    code: 'WELCOME5',
    discountPercent: 5,
    budgetHalalas: 150_000,
    spentHalalas: 0,
    uses: 0,
    newSubscriptions: 0,
    target: 'new-riders',
    perUserLimit: 1,
    expiresOn: '2026-12-31',
    status: 'active',
    createdAt: '2026-06-22T08:00:00+03:00',
  }),
  /* Over budget at 118 %. `Progress` clamps its bar; the number does not. */
  promo({
    code: 'SUMMERLONGWEEKEND',
    discountPercent: 20,
    budgetHalalas: 120_000,
    spentHalalas: 141_500,
    uses: 96,
    newSubscriptions: 24,
    target: 'all-riders',
    perUserLimit: 3,
    expiresOn: '2026-07-05',
    status: 'exhausted',
    createdAt: '2026-06-05T08:00:00+03:00',
  }),
  /* 84 % — inside the 80-99 band, so the row carries `Nearly spent`. */
  promo({
    code: 'STUDENT12',
    discountPercent: 12,
    budgetHalalas: 200_000,
    spentHalalas: 168_000,
    uses: 74,
    newSubscriptions: 19,
    target: 'new-riders',
    perUserLimit: 1,
    expiresOn: '2026-08-31',
    status: 'active',
    createdAt: '2026-05-11T08:00:00+03:00',
  }),
  promo({
    code: 'LOYALTY8',
    discountPercent: 8,
    budgetHalalas: 400_000,
    spentHalalas: 61_200,
    uses: 22,
    newSubscriptions: 7,
    target: 'monthly-plan',
    perUserLimit: 4,
    expiresOn: '2026-10-01',
    status: 'active',
    createdAt: '2026-06-09T08:00:00+03:00',
  }),
  promo({
    code: 'RETURN20',
    discountPercent: 20,
    budgetHalalas: 350_000,
    spentHalalas: 289_400,
    uses: 133,
    newSubscriptions: 41,
    target: 'lapsed-subscribers',
    perUserLimit: 2,
    expiresOn: '2026-06-20',
    status: 'expired',
    createdAt: '2026-04-02T08:00:00+03:00',
  }),
]

function referral(
  row: Omit<GrowthReferral, 'totalBonusHalalas'>,
): GrowthReferral {
  return {
    ...row,
    totalBonusHalalas: row.referrerBonusHalalas + row.refereeBonusHalalas,
  }
}

/**
 * Seven credited referrals. `REF-seed-1` is legacy's own (`:13889`). Two carry
 * the shared-device flag the Fraud page computes (`:5610`), one pair holds the
 * 46-character Arabic name that breaks a fixed identity column, and one pays a
 * referee nothing because the programme's welcome bonus was zero that week.
 */
export const growthReferralFixtures: readonly GrowthReferral[] = [
  referral({
    id: 'REF-seed-1',
    referrerId: 'RDR-1041',
    referrerName: 'Nora Al-Harbi',
    refereeId: 'RDR-1075',
    refereeName: 'Sara Al-Ghamdi',
    referrerBonusHalalas: 2_000,
    refereeBonusHalalas: 1_000,
    creditedAt: '2026-06-18T09:30:00+03:00',
    sharedDeviceFlag: false,
  }),
  referral({
    id: 'REF-0002',
    referrerId: 'RDR-2087',
    referrerName: 'Layla Al-Faraj',
    refereeId: 'RDR-4002',
    refereeName: 'الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي',
    referrerBonusHalalas: 2_000,
    refereeBonusHalalas: 1_000,
    creditedAt: '2026-06-19T14:05:00+03:00',
    sharedDeviceFlag: true,
  }),
  referral({
    id: 'REF-0003',
    referrerId: 'RDR-1080',
    referrerName: 'Mohammed Al-Qahtani',
    refereeId: 'RDR-1090',
    refereeName: 'Reem Al-Dosari',
    referrerBonusHalalas: 2_000,
    refereeBonusHalalas: 1_000,
    creditedAt: '2026-06-20T11:47:00+03:00',
    sharedDeviceFlag: false,
  }),
  /* The welcome bonus was zero the week this pair joined, so a real `0` reaches
     the cell rather than an absence. */
  referral({
    id: 'REF-0004',
    referrerId: 'RDR-1052',
    referrerName: 'Omar Al-Shehri',
    refereeId: 'RDR-1044',
    refereeName: 'Fatimah Al-Qurashi',
    referrerBonusHalalas: 1_500,
    refereeBonusHalalas: 0,
    creditedAt: '2026-06-21T08:12:00+03:00',
    sharedDeviceFlag: false,
  }),
  referral({
    id: 'REF-0005',
    referrerId: 'RDR-1046',
    referrerName: 'Noura Al-Harbi',
    refereeId: 'RDR-1047',
    refereeName: 'Salman Al-Dossari',
    referrerBonusHalalas: 2_000,
    refereeBonusHalalas: 1_000,
    creditedAt: '2026-06-22T16:40:00+03:00',
    sharedDeviceFlag: true,
  }),
  referral({
    id: 'REF-0006',
    referrerId: 'RDR-1042',
    referrerName: 'محمد بن عبد العزيز بن ناصر آل سعيّد الشمري',
    refereeId: 'RDR-1043',
    refereeName: 'Abdulrahman Al-Zahrani',
    referrerBonusHalalas: 2_000,
    refereeBonusHalalas: 1_000,
    creditedAt: '2026-06-23T10:02:00+03:00',
    sharedDeviceFlag: false,
  }),
  referral({
    id: 'REF-0007',
    referrerId: 'RDR-1045',
    referrerName: 'Youssef Abdelrahman El-Sayed Farag',
    refereeId: 'RDR-1048',
    refereeName: 'Maryam Al-Anazi',
    referrerBonusHalalas: 2_000,
    refereeBonusHalalas: 1_000,
    creditedAt: '2026-06-24T19:18:00+03:00',
    sharedDeviceFlag: false,
  }),
]

/**
 * Legacy's four rules verbatim (`:13565`), with the prose reward and rule
 * strings resolved into the enums `types/growth.ts` declares. `earnedCount` and
 * `totalPaidHalalas` come from `DB.driverBonusLog`'s two seeded rows (`:13895`),
 * which is why INV-3 and INV-4 have paid nothing.
 */
export const growthIncentiveFixtures: readonly GrowthIncentive[] = [
  {
    id: 'INV-1',
    name: 'Perfect package bonus',
    condition: 'perfect-package',
    reward: { kind: 'per-package', amountHalalas: 4_000, fromPercent: null, toPercent: null },
    active: true,
    earnedCount: 1,
    totalPaidHalalas: 4_000,
    createdAt: '2026-03-01T08:00:00+03:00',
  },
  {
    id: 'INV-2',
    name: '5-star streak',
    condition: 'rating-streak',
    reward: { kind: 'flat', amountHalalas: 2_500, fromPercent: null, toPercent: null },
    active: true,
    earnedCount: 1,
    totalPaidHalalas: 2_500,
    createdAt: '2026-03-01T08:00:00+03:00',
  },
  /* The commission cut: no amount, two percentages. Legacy writes it as the
     prose `Commission 20% → 17%` and nothing ever applies it (§18.1 item 10). */
  {
    id: 'INV-3',
    name: 'Gold captain commission',
    condition: 'gold-tier',
    reward: { kind: 'commission-cut', amountHalalas: null, fromPercent: 20, toPercent: 17 },
    active: true,
    earnedCount: 0,
    totalPaidHalalas: 0,
    createdAt: '2026-03-14T08:00:00+03:00',
  },
  {
    id: 'INV-4',
    name: 'Backup readiness',
    condition: 'backup-readiness',
    reward: {
      kind: 'weekly-retainer',
      amountHalalas: 1_500,
      fromPercent: null,
      toPercent: null,
    },
    active: false,
    earnedCount: 0,
    totalPaidHalalas: 0,
    createdAt: '2026-04-06T08:00:00+03:00',
  },
]

/**
 * Eight sends, newest first. Legacy holds no log at all, so every row here is
 * the audit entry `sendBulkMsg` writes (`:13755`) with its operand fields kept
 * rather than concatenated into a summary sentence. One body is long enough to
 * need the sheet, and one reached nobody.
 */
export const growthBulkMessageFixtures: readonly GrowthBulkMessage[] = [
  {
    id: 'MSG-0008',
    body: 'Your package expires in 3 days. Renew now and keep your captain.',
    segment: 'packages-expiring',
    channel: 'push',
    recipientCount: 8,
    sentAt: '2026-06-24T17:20:00+03:00',
    sentById: 'USR-0002',
    sentByName: 'Reem Al-Otaibi',
  },
  {
    id: 'MSG-0007',
    body: 'Two of your documents expire this month. Upload the new ones from the captain app before your next package starts, or dispatch will hold your assignments until they are checked.',
    segment: 'documents-expiring',
    channel: 'sms',
    recipientCount: 3,
    sentAt: '2026-06-23T09:05:00+03:00',
    sentById: 'USR-0001',
    sentByName: 'Faisal Al-Harbi',
  },
  {
    id: 'MSG-0006',
    body: 'Al Narjis needs captains this week. Open the app and go online.',
    segment: 'drivers-in-zone',
    channel: 'push',
    recipientCount: 8,
    sentAt: '2026-06-22T06:30:00+03:00',
    sentById: 'USR-0002',
    sentByName: 'Reem Al-Otaibi',
  },
  /* Reached nobody: the segment was empty when it ran. A real zero, not a gap. */
  {
    id: 'MSG-0005',
    body: 'A backup captain is now assigned to your subscription.',
    segment: 'exposed-subscriptions',
    channel: 'in-app',
    recipientCount: 0,
    sentAt: '2026-06-20T13:44:00+03:00',
    sentById: 'USR-0003',
    sentByName: 'عبد الله بن محمد الشهري',
  },
  {
    id: 'MSG-0004',
    body: 'Eid schedule: your morning trips start 30 minutes later next week.',
    segment: 'active-subscribers',
    channel: 'push',
    recipientCount: 142,
    sentAt: '2026-06-18T20:10:00+03:00',
    sentById: 'USR-0001',
    sentByName: 'Faisal Al-Harbi',
  },
  {
    id: 'MSG-0003',
    body: 'Rate your captain and help us keep the best ones on your route.',
    segment: 'active-subscribers',
    channel: 'in-app',
    recipientCount: 138,
    sentAt: '2026-06-15T11:00:00+03:00',
    sentById: 'USR-0002',
    sentByName: 'Reem Al-Otaibi',
  },
  {
    id: 'MSG-0002',
    body: 'Your subscription has no backup captain. Add one from the app.',
    segment: 'exposed-subscriptions',
    channel: 'sms',
    recipientCount: 5,
    sentAt: '2026-06-11T15:26:00+03:00',
    sentById: 'USR-0003',
    sentByName: 'عبد الله بن محمد الشهري',
  },
  {
    id: 'MSG-0001',
    body: 'Welcome to Eyvar. Your first package starts on Sunday.',
    segment: 'active-subscribers',
    channel: 'push',
    recipientCount: 96,
    sentAt: '2026-06-04T08:00:00+03:00',
    sentById: 'USR-0001',
    sentByName: 'Faisal Al-Harbi',
  },
]
