/**
 * Corporate account — Operations › Corporate Accounts, and its level-3 detail
 * `/operations/corporate/:corpId`.
 *
 * Derived from `DB.corporateAccounts` (`eyvar_ops_panel_v40_fixed.html:13846`),
 * `renderCorporateList()` (`:6472`), `commitNewCorp()` (`:6522`) and
 * `getCorpUsagePolicy()` (`:6547`).
 *
 * Legacy seeds **exactly one** account, `CORP-001`, and it is `Pending` with an
 * empty `riders[]`. So the whole screen — the table, the KPIs, the invoice
 * overdue badge, pagination — has never been seen with data in it. The fixtures
 * fix that.
 */

import type { Halalas, IsoDate, IsoDateTime } from './common'

/**
 * Legacy `status` with the three branches the renderer handles (`:6487`):
 * `Active` → green, `Trial` → blue, anything else → amber. `Pending` is the one
 * seeded value; `Suspended` is implied by the flag-account flow.
 *
 * Tones (R7): active → `success`, trial → `info`, pending → `new`,
 * suspended → `neutral`.
 */
export type CorporateAccountStatus = 'Active' | 'Trial' | 'Pending' | 'Suspended'

/** The two options the create modal offers (`:6512`). */
export type CorporateBillingType = 'Monthly invoice' | 'Prepaid balance'

/**
 * Legacy `usagePolicy` (`:13848`, defaults at `:6548`). Every field is nullable
 * because `getCorpUsagePolicy` back-fills five of them with `null` on read —
 * meaning "not configured" is the normal state, not an edge case.
 */
export interface CorporateUsagePolicy {
  /** Legacy `monthlyCapSAR: 200` → halalas. `null` = uncapped. */
  monthlyCapHalalas: Halalas | null
  /** `'Economy' | 'Comfort' | 'any'` — `any` is the default (`:6548`). */
  vehicleTier: 'Economy' | 'Comfort' | 'any'
  workHoursOnly: boolean
  /** `'07:00'` local. Meaningless when `workHoursOnly` is false, but still stored. */
  workHoursStart: string
  workHoursEnd: string
  officeDistrict: string | null
  geoRestrictKm: number | null
  /** Legacy `requireApprovalAboveSAR` → halalas. `null` = no approval step. */
  requireApprovalAboveHalalas: Halalas | null
  approverName: string | null
  approverEmail: string | null
}

export interface CorporateAccount {
  id: string
  companyName: string
  contactName: string
  contactEmail: string
  /** Legacy seeds `null` on the one account (`:13847`); the create modal makes it optional. */
  contactPhone: string | null

  status: CorporateAccountStatus
  billingType: CorporateBillingType
  /** `null` when not stated at creation — the field is optional in the modal (`:6513`). */
  expectedEmployees: number | null
  /** 1–28, clamped on write (`:6524`). Only meaningful for `Monthly invoice`. */
  invoiceDayOfMonth: number
  /** `null` until the first invoice is generated. `isCorpInvoiceDue` branches on it (`:6469`). */
  lastInvoiceGeneratedAt: IsoDate | null

  /** Rider ids covered by this account. Legacy `riders[]` — empty on the one seeded row. */
  riderIds: string[]
  /** `riderIds.length`, returned so the index does not have to hydrate the array to render a count. */
  employeeCount: number

  /**
   * Legacy `corpTotalSpend(c)` — computed live from the employees' payments and
   * deliberately not stored, "so it can never drift out of sync" (`:13843`).
   * That reasoning is right for a single-file app and wrong for an API: the
   * server computes it and returns it, so the index does not fetch every
   * rider's payments to render a column.
   */
  totalSpendHalalas: Halalas
  /** Derived, server-side. Legacy `isCorpInvoiceDue()` (`:6463`). */
  invoiceOverdue: boolean
  /** Next invoice date. Legacy `nextCorpInvoiceDate()` (`:6457`). `null` for prepaid accounts. */
  nextInvoiceOn: IsoDate | null

  usagePolicy: CorporateUsagePolicy
  createdAt: IsoDateTime
}
