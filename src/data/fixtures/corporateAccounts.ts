/**
 * Corporate accounts — legacy `DB.corporateAccounts` (`eyvar_ops_panel_v40_fixed.html:13846`).
 *
 * Legacy seeds **exactly one** row, `CORP-001`, `Pending`, with an empty
 * `riders[]` and `contactPhone: null`. Consequences the fixtures below undo:
 *   - the table has never had a second row, so sorting has never been used
 *   - `totalSpend` has always been `0.00 SAR`
 *   - `Active` and `Trial` badges have never rendered
 *   - the `⚠ Overdue` invoice badge (`:6491`) has never fired
 *   - the empty state *has* been seen, which is why it is kept reachable via
 *     `useNoCorporateAccounts()`
 *
 * CORP-001 is verbatim. CORP-002…006 are added, each stating its purpose.
 */

import type { CorporateAccount } from '../types/corporateAccount'

export const corporateAccountFixtures: CorporateAccount[] = [
  {
    id: 'CORP-001',
    companyName: 'Al-Dossari Logistics',
    contactName: 'Fahad Al-Dossari',
    contactEmail: 'fahad.dossari@gmail.com',
    /* Seeded `null` — the nullable contact phone, on the only real row. */
    contactPhone: null,
    status: 'Pending',
    billingType: 'Monthly invoice',
    expectedEmployees: 40,
    invoiceDayOfMonth: 1,
    lastInvoiceGeneratedAt: null,
    riderIds: [],
    employeeCount: 0,
    totalSpendHalalas: 0,
    /* Monthly invoice, day 1, never generated, and today is the 25th →
       `isCorpInvoiceDue` returns true (`:6463`). The overdue badge fires on the
       one seeded row and always has; nobody has seen it because the KPI above
       it reads `0` for spend. */
    invoiceOverdue: true,
    nextInvoiceOn: '2026-07-01',
    usagePolicy: {
      monthlyCapHalalas: 20_000,
      vehicleTier: 'Economy',
      workHoursOnly: true,
      workHoursStart: '07:00',
      workHoursEnd: '19:00',
      officeDistrict: 'Olaya / KAFD',
      geoRestrictKm: 12,
      requireApprovalAboveHalalas: null,
      approverName: null,
      approverEmail: null,
    },
    createdAt: '2026-07-14T00:00:00+03:00',
  },

  /* ── added rows ─────────────────────────────────────────────────────── */
  {
    id: 'CORP-002',
    companyName: 'Saudi Arabian Advanced Petrochemical Manufacturing Company Limited',
    /* 66 characters. Real Saudi corporate names run long and the column will not
       fit this one. Its contact is a 40-character Arabic name, so the row is
       wide in both columns at once. */
    contactName: 'منى بنت عبد الله بن ناصر الشمراني',
    contactEmail: 'procurement.mobility.services@advanced-petrochemical.example.com.sa',
    contactPhone: '+966 11 470 9900',
    status: 'Active',
    billingType: 'Monthly invoice',
    expectedEmployees: 1_200,
    invoiceDayOfMonth: 28,
    lastInvoiceGeneratedAt: '2026-05-28',
    riderIds: ['RDR-4003'],
    employeeCount: 1,
    /* Employee count (1) contradicts expected (1,200) — a real onboarding state:
       contract signed, rollout not started. The column has to show both without
       implying one is wrong. */
    totalSpendHalalas: 1_842_500,
    invoiceOverdue: false,
    nextInvoiceOn: '2026-06-28',
    usagePolicy: {
      monthlyCapHalalas: null,
      vehicleTier: 'any',
      workHoursOnly: false,
      workHoursStart: '08:00',
      workHoursEnd: '18:00',
      officeDistrict: null,
      geoRestrictKm: null,
      requireApprovalAboveHalalas: 30_000,
      approverName: 'منى بنت عبد الله بن ناصر الشمراني',
      approverEmail: 'procurement.mobility.services@advanced-petrochemical.example.com.sa',
    },
    createdAt: '2026-02-11T09:30:00+03:00',
  },
  {
    id: 'CORP-003',
    companyName: 'Nuqta Studio',
    contactName: 'Reem Al-Ajmi',
    contactEmail: 'reem@nuqta.example',
    contactPhone: '+966 55 200 1414',
    /* `Trial` — the third badge branch (`:6487`), never seeded. */
    status: 'Trial',
    billingType: 'Prepaid balance',
    /* Prepaid, so no invoice day matters and `nextInvoiceOn` is null. */
    expectedEmployees: null,
    invoiceDayOfMonth: 1,
    lastInvoiceGeneratedAt: null,
    riderIds: ['RDR-1060', 'RDR-1090'],
    employeeCount: 2,
    totalSpendHalalas: 47_300,
    invoiceOverdue: false,
    nextInvoiceOn: null,
    usagePolicy: {
      monthlyCapHalalas: 500_00,
      vehicleTier: 'Comfort',
      workHoursOnly: false,
      workHoursStart: '08:00',
      workHoursEnd: '18:00',
      officeDistrict: 'Al Sahafa',
      geoRestrictKm: 25,
      requireApprovalAboveHalalas: null,
      approverName: null,
      approverEmail: null,
    },
    createdAt: '2026-06-18T14:05:00+03:00',
  },
  {
    id: 'CORP-004',
    companyName: 'Riyadh Medical Group',
    contactName: 'Dr. Hani Al-Otaibi',
    contactEmail: 'h.otaibi@rmg.example',
    contactPhone: '+966 11 288 4400',
    status: 'Active',
    billingType: 'Monthly invoice',
    expectedEmployees: 85,
    invoiceDayOfMonth: 5,
    /* Last invoice was May. June's is 20 days late — the `⚠ Overdue` badge with
       a plausible amount behind it, unlike CORP-001's zero. */
    lastInvoiceGeneratedAt: '2026-05-05',
    riderIds: ['RDR-1080', 'RDR-2031', 'RDR-1041'],
    employeeCount: 3,
    totalSpendHalalas: 289_400,
    invoiceOverdue: true,
    nextInvoiceOn: '2026-07-05',
    usagePolicy: {
      monthlyCapHalalas: 150_000,
      vehicleTier: 'any',
      workHoursOnly: true,
      workHoursStart: '06:00',
      workHoursEnd: '23:00',
      officeDistrict: 'Al Malaz',
      geoRestrictKm: 30,
      requireApprovalAboveHalalas: 20_000,
      approverName: 'Dr. Hani Al-Otaibi',
      approverEmail: 'h.otaibi@rmg.example',
    },
    createdAt: '2025-11-02T10:00:00+03:00',
  },
  {
    id: 'CORP-005',
    companyName: 'Tamara Retail',
    contactName: 'Sultan Al-Faraj',
    contactEmail: 'sultan.f@tamara-retail.example',
    contactPhone: '+966 50 331 7788',
    /* Suspended for non-payment. Its usage policy is entirely unconfigured —
       every nullable field `getCorpUsagePolicy` back-fills (`:6548`) is null at
       once, which is the detail page's real default state. */
    status: 'Suspended',
    billingType: 'Monthly invoice',
    expectedEmployees: 12,
    invoiceDayOfMonth: 15,
    lastInvoiceGeneratedAt: '2026-04-15',
    riderIds: [],
    employeeCount: 0,
    totalSpendHalalas: 63_100,
    invoiceOverdue: true,
    nextInvoiceOn: '2026-07-15',
    usagePolicy: {
      monthlyCapHalalas: null,
      vehicleTier: 'any',
      workHoursOnly: false,
      workHoursStart: '08:00',
      workHoursEnd: '18:00',
      officeDistrict: null,
      geoRestrictKm: null,
      requireApprovalAboveHalalas: null,
      approverName: null,
      approverEmail: null,
    },
    createdAt: '2026-01-20T11:15:00+03:00',
  },
  {
    id: 'CORP-006',
    companyName: 'Wadi Ventures',
    contactName: 'Noura Al-Rasheed',
    contactEmail: 'noura@wadi.example',
    contactPhone: '+966 56 909 3030',
    status: 'Pending',
    billingType: 'Prepaid balance',
    expectedEmployees: 6,
    invoiceDayOfMonth: 1,
    lastInvoiceGeneratedAt: null,
    riderIds: [],
    employeeCount: 0,
    /* Created today, zero spend, no employees. The freshest account — the row
       an operator sees right after using the create modal. */
    totalSpendHalalas: 0,
    invoiceOverdue: false,
    nextInvoiceOn: null,
    usagePolicy: {
      monthlyCapHalalas: null,
      vehicleTier: 'any',
      workHoursOnly: false,
      workHoursStart: '08:00',
      workHoursEnd: '18:00',
      officeDistrict: null,
      geoRestrictKm: null,
      requireApprovalAboveHalalas: null,
      approverName: null,
      approverEmail: null,
    },
    createdAt: '2026-06-25T08:55:00+03:00',
  },
]
