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
import { cycle, cycleRecord } from './cycle'
import { riderFixtures } from './riders'

const namedCorporateAccounts: CorporateAccount[] = [
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

/* ── volume ──────────────────────────────────────────────────────────── */

/**
 * Company names and their contacts as **one record each**, because a corporate
 * row denormalises four related facts — company, contact name, contact email,
 * contact phone — and cycling four lists is precisely the pattern `cycle.ts`
 * documents going wrong. The email is derived from the same object the name
 * comes from, so a contact cannot end up with a colleague's address.
 */
const FILLER_COMPANIES: ReadonlyArray<{
  readonly id: string
  readonly name: string
  readonly contact: string
  readonly domain: string
}> = [
  { id: 'najd-tech', name: 'Najd Technologies', contact: 'Ibrahim Al-Sudairi', domain: 'najdtech.example' },
  { id: 'rawabi-med', name: 'Rawabi Medical Group', contact: 'Dalal Al-Muhaideb', domain: 'rawabimed.example' },
  { id: 'thumamah', name: 'Thumamah Contracting', contact: 'Saleh Al-Qahtani', domain: 'thumamah.example' },
  { id: 'lulwa-edu', name: 'Lulwa Education Trust', contact: 'Munirah Al-Fadhli', domain: 'lulwa.example' },
  { id: 'sadara-log', name: 'Sadara Logistics Partners', contact: 'Waleed Al-Turki', domain: 'sadaralog.example' },
  { id: 'faisaliah-re', name: 'Faisaliah Real Estate', contact: 'Reem Al-Nafisi', domain: 'faisaliahre.example' },
  { id: 'anwar-food', name: 'Anwar Food Services', contact: 'Tariq Al-Balawi', domain: 'anwarfood.example' },
  { id: 'qassim-agri', name: 'Qassim Agricultural Holding', contact: 'Hessa Al-Duwaish', domain: 'qassimagri.example' },
  { id: 'hail-transport', name: 'Hail Transport Company', contact: 'Fahd Al-Shammari', domain: 'hailtransport.example' },
]

/**
 * Volume for Operations › Corporate — 45 accounts, so the table pages and its
 * status, billing-type and overdue facets have populations rather than one row
 * each.
 *
 * Two things kept true across all of them:
 *
 *  - **`riderIds` resolve.** Every employee id is taken from `riderFixtures`,
 *    so `corpForRider` (`:4910`) walks in both directions and an employee list
 *    never links to a profile that 404s. `employeeCount` is `riderIds.length`,
 *    derived rather than stated, because a count beside a list that disagrees
 *    with it is the same defect as a `totalTrips` with no trips.
 *  - **`invoiceOverdue` is computed, not asserted** — `isCorpInvoiceDue`
 *    (`:6463`) is *"monthly invoice, the day has passed, and nothing was
 *    generated this cycle"*, and the flag here is exactly that expression. A
 *    row cannot claim an overdue badge its own dates deny.
 */
export const fillerCorporateAccounts: CorporateAccount[] = Array.from({ length: 45 }, (_, i) => {
  const company = cycleRecord(FILLER_COMPANIES, i)
  const suffix = Math.floor(i / FILLER_COMPANIES.length) + 1
  const monthly = i % 3 !== 2
  const invoiceDay = (i % 27) + 1
  /* Six accounts have never been invoiced; the rest were billed this cycle. */
  const neverInvoiced = i % 7 === 0
  const status = i % 11 === 0 ? 'Trial' : i % 13 === 0 ? 'Pending' : 'Active'
  /* Employees are real riders, spread so no two consecutive accounts claim the
     same person. */
  const riderIds =
    status === 'Pending'
      ? []
      : Array.from({ length: 1 + (i % 5) }, (_, e) => cycleRecord(riderFixtures, i * 5 + e).id)
  return {
    id: `CORP-${String(100 + i)}`,
    companyName: suffix === 1 ? company.name : `${company.name} ${suffix}`,
    contactName: company.contact,
    contactEmail: `${company.contact.split(' ')[0]!.toLowerCase()}@${company.domain}`,
    contactPhone: i % 8 === 0 ? null : `+966 5${i % 10} ${String(400 + i).padStart(3, '0')} ${String(7000 + i * 23).slice(-4)}`,
    status,
    billingType: monthly ? 'Monthly invoice' : 'Prepaid balance',
    expectedEmployees: 5 + ((i * 7) % 120),
    invoiceDayOfMonth: invoiceDay,
    lastInvoiceGeneratedAt: neverInvoiced ? null : `2026-06-${String(invoiceDay).padStart(2, '0')}T02:00:00+03:00`,
    riderIds,
    employeeCount: riderIds.length,
    totalSpendHalalas: status === 'Pending' ? 0 : 4_150 * (1 + (i % 60)) + i * 90,
    /* Monthly billing, the day has passed against the fixed clock (the 25th),
       and nothing was generated — legacy's own predicate, written out. */
    invoiceOverdue: monthly && invoiceDay <= 25 && neverInvoiced,
    nextInvoiceOn: monthly ? `2026-07-${String(invoiceDay).padStart(2, '0')}` : null,
    usagePolicy: {
      monthlyCapHalalas: i % 4 === 0 ? null : 20_000 + (i % 9) * 5_000,
      vehicleTier: cycle(['Economy', 'Comfort', 'any'] as const, i),
      workHoursOnly: i % 3 !== 0,
      workHoursStart: '07:00',
      workHoursEnd: '19:00',
      officeDistrict: i % 5 === 0 ? null : cycle(['Olaya / KAFD', 'Al Malqa', 'Al Sahafa', 'Al Malaz'], i),
      geoRestrictKm: i % 6 === 0 ? null : 8 + (i % 20),
      requireApprovalAboveHalalas: i % 9 === 0 ? 15_000 : null,
      approverName: i % 9 === 0 ? company.contact : null,
      approverEmail: i % 9 === 0 ? `${company.contact.split(' ')[0]!.toLowerCase()}@${company.domain}` : null,
    },
    createdAt: `2026-0${(i % 5) + 1}-${String((i % 27) + 1).padStart(2, '0')}T09:00:00+03:00`,
  } satisfies CorporateAccount
})

/** 51 rows — six hand-written accounts and forty-five of volume. */
export const corporateAccountFixtures: CorporateAccount[] = [
  ...namedCorporateAccounts,
  ...fillerCorporateAccounts,
]
