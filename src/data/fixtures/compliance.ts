/**
 * Fleet compliance — legacy `DB.driverDocs` (`eyvar_ops_panel_v40_fixed.html:13278`),
 * five captains × five document types, with real ISO expiry dates.
 *
 * The `state` on each doc is the bucket `docState(days)` computes (`:13291`)
 * against the fixed clock (`2026-06-25`):
 *   `< 0` expired · `≤ 7` critical · `≤ 30` expiring · else valid
 *
 * Legacy computes this at render from `REQ_NOW_REF`, which is the same fixed
 * clock — so the buckets below are the values the legacy app actually shows,
 * not an invention.
 *
 * DRV-0106 and every added captain have **no doc record at all** in legacy: the
 * collection covers 0101–0105 only, so a captain with no compliance file is the
 * normal case and the screen has to say so rather than showing five green pills.
 */

import type { DriverCompliance } from '../types/driver'

export const complianceFixtures: DriverCompliance[] = [
  {
    driverId: 'DRV-0101',
    driverName: 'Ahmed Salem',
    vehicle: 'Corolla 2022 · White',
    docs: [
      { type: 'license', expiresOn: '2027-03-12', state: 'valid' },
      /* 24 days out — `expiring`. */
      { type: 'vehicle_reg', expiresOn: '2026-07-19', state: 'expiring' },
      { type: 'inspection', expiresOn: '2026-08-02', state: 'valid' },
      { type: 'insurance', expiresOn: '2026-11-30', state: 'valid' },
      { type: 'operating_card', expiresOn: '2027-01-15', state: 'valid' },
    ],
    worstState: 'expiring',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0102',
    driverName: 'Omar Farouk',
    vehicle: 'Camry 2023 · Silver',
    docs: [
      /* 19 days — `expiring`. */
      { type: 'license', expiresOn: '2026-07-14', state: 'expiring' },
      { type: 'vehicle_reg', expiresOn: '2026-12-01', state: 'valid' },
      { type: 'inspection', expiresOn: '2026-09-10', state: 'valid' },
      /* 10 days — `expiring`, one bucket above critical. The boundary row. */
      { type: 'insurance', expiresOn: '2026-07-05', state: 'expiring' },
      { type: 'operating_card', expiresOn: '2026-10-22', state: 'valid' },
    ],
    worstState: 'expiring',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0103',
    driverName: 'Khalid Mansour',
    vehicle: 'Yaris 2021 · Black',
    docs: [
      { type: 'license', expiresOn: '2028-01-20', state: 'valid' },
      { type: 'vehicle_reg', expiresOn: '2026-08-15', state: 'valid' },
      /* 30 days exactly — the `expiring` boundary. Off-by-one lives here. */
      { type: 'inspection', expiresOn: '2026-07-25', state: 'expiring' },
      { type: 'insurance', expiresOn: '2027-02-28', state: 'valid' },
      { type: 'operating_card', expiresOn: '2026-12-05', state: 'valid' },
    ],
    worstState: 'expiring',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0104',
    driverName: 'Hassan Al-Ghamdi',
    vehicle: 'Sonata 2023 · Grey',
    docs: [
      { type: 'license', expiresOn: '2026-09-30', state: 'valid' },
      { type: 'vehicle_reg', expiresOn: '2027-04-11', state: 'valid' },
      /* **Expired five days ago.** A gold-tier captain with 524 trips and 98%
         on-time, driving on a lapsed inspection certificate. The row that
         justifies the §8.4 row-level marker. */
      { type: 'inspection', expiresOn: '2026-06-20', state: 'expired' },
      /* 45 days — valid. */
      { type: 'insurance', expiresOn: '2026-08-09', state: 'valid' },
      { type: 'operating_card', expiresOn: '2027-03-01', state: 'valid' },
    ],
    worstState: 'expired',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0105',
    driverName: 'Youssef Nouri',
    vehicle: 'Sunny 2020 · White',
    docs: [
      { type: 'license', expiresOn: '2027-06-18', state: 'valid' },
      /* 13 days. */
      { type: 'vehicle_reg', expiresOn: '2026-07-08', state: 'expiring' },
      { type: 'inspection', expiresOn: '2026-10-14', state: 'valid' },
      { type: 'insurance', expiresOn: '2026-09-22', state: 'valid' },
      { type: 'operating_card', expiresOn: '2026-11-11', state: 'valid' },
    ],
    worstState: 'expiring',
    suspendedReason: null,
  },

  /* ── added rows ─────────────────────────────────────────────────────── */
  {
    driverId: 'DRV-0202',
    driverName: 'Majed Al-Shamrani',
    vehicle: 'Accent 2019 · Silver',
    docs: [
      { type: 'license', expiresOn: '2027-08-04', state: 'valid' },
      { type: 'vehicle_reg', expiresOn: '2026-09-19', state: 'valid' },
      { type: 'inspection', expiresOn: '2026-06-30', state: 'critical' },
      { type: 'insurance', expiresOn: '2026-07-01', state: 'critical' },
      /* Expired a week ago and the captain is suspended for it. The one row
         where compliance has already acted. */
      { type: 'operating_card', expiresOn: '2026-06-18', state: 'expired' },
    ],
    worstState: 'expired',
    suspendedReason: 'Transport authority operating card expired 7 days ago',
  },
  {
    driverId: 'DRV-0201',
    driverName: 'عبد الرحمن بن محمد بن عبد الله آل عبد الله القحطاني الدوسري',
    vehicle: 'Hyundai Azera 2024 · Pearl White Metallic',
    /* Everything valid and far out — the all-clear row, so the screen has a
       "nothing to do here" case beside the four that need work. */
    docs: [
      { type: 'license', expiresOn: '2029-05-30', state: 'valid' },
      { type: 'vehicle_reg', expiresOn: '2028-02-14', state: 'valid' },
      { type: 'inspection', expiresOn: '2027-09-01', state: 'valid' },
      { type: 'insurance', expiresOn: '2028-11-20', state: 'valid' },
      { type: 'operating_card', expiresOn: '2029-01-08', state: 'valid' },
    ],
    worstState: 'valid',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0203',
    driverName: 'Faisal Al-Amri',
    vehicle: 'Elantra 2024 · Blue',
    /**
     * **No documents on file at all.** Approved yesterday; the compliance
     * record has not been created. This is the *filtered-to-zero vs first-run*
     * distinction from R8 in one row: the captain exists, the file does not.
     * It is also the normal case for every captain outside 0101–0105 in the
     * legacy data.
     */
    docs: [],
    /* `null`, not `valid`. Reporting a captain with no file as compliant is the
       most dangerous default this screen could have. */
    worstState: null,
    suspendedReason: null,
  },
]
