/**
 * Corporate accounts — Operations › Corporate Accounts, and its level-3 detail
 * `/operations/corporate/:corpId`.
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import { corporateAccountFixtures } from '../fixtures/corporateAccounts'
import { ApiError, type Facets, type Paginated, type QueryParams } from '../types/common'
import type { CorporateAccount, CorporateAccountStatus } from '../types/corporateAccount'
import { http } from './http'

export const CORPORATE_OPERATIONS = {
  facets: 'corporate.facets',
  list: 'corporate.list',
  get: 'corporate.get',
  create: 'corporate.create',
  updatePolicy: 'corporate.updatePolicy',
  addEmployee: 'corporate.addEmployee',
} as const

export interface CorporateQuery extends QueryParams {
  status?: CorporateAccountStatus
}

const corporateShape: QueryShape<CorporateAccount> = {
  searchable: [(c) => c.companyName, (c) => c.id, (c) => c.contactName, (c) => c.contactEmail],
  sortable: {
    companyName: (c) => c.companyName,
    employeeCount: (c) => c.employeeCount,
    totalSpendHalalas: (c) => c.totalSpendHalalas,
    createdAt: (c) => c.createdAt,
    nextInvoiceOn: (c) => c.nextInvoiceOn,
    status: (c) => c.status,
  },
  filterable: {
    /* identity — text */
    id: (c) => c.id,
    companyName: (c) => c.companyName,
    contactName: (c) => c.contactName,
    contactEmail: (c) => c.contactEmail,
    contactPhone: (c) => c.contactPhone,

    /* closed sets — options via `getCorporateFacets` */
    status: (c) => c.status,
    billingType: (c) => c.billingType,
    vehicleTier: (c) => c.usagePolicy.vehicleTier,

    /* booleans */
    invoiceOverdue: (c) => c.invoiceOverdue,
    workHoursOnly: (c) => c.usagePolicy.workHoursOnly,

    /* numbers */
    employeeCount: (c) => c.employeeCount,
    expectedEmployees: (c) => c.expectedEmployees,
    totalSpendHalalas: (c) => c.totalSpendHalalas,
    monthlyCapHalalas: (c) => c.usagePolicy.monthlyCapHalalas,
    invoiceDayOfMonth: (c) => c.invoiceDayOfMonth,

    /* dates */
    createdAt: (c) => toInstant(c.createdAt),
    lastInvoiceGeneratedAt: (c) => toInstant(c.lastInvoiceGeneratedAt),
    nextInvoiceOn: (c) => toInstant(c.nextInvoiceOn),
  },
  facetable: ['status', 'billingType', 'vehicleTier'],
  views: {
    all: () => true,
    overdue: (c) => c.invoiceOverdue,
  },
}

/**
 * GET /api/v1/corporate-accounts
 *   params: q · status · page · pageSize · sort · filter · view=all|overdue
 *   -> Paginated<CorporateAccount>
 *
 * Sortable: companyName · employeeCount · totalSpendHalalas · createdAt ·
 *           nextInvoiceOn · status
 * Filterable: status · billingType · invoiceOverdue
 *
 * `totalSpendHalalas` and `invoiceOverdue` are **server-computed**. Legacy
 * computes spend live from every employee's payments (`corpTotalSpend`,
 * `:13843`), which is right for one file and wrong for a list endpoint — the
 * index would have to hydrate every rider's payment history to draw one column.
 */
export async function listCorporateAccounts(
  params: CorporateQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<CorporateAccount>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<CorporateAccount>>('/corporate-accounts', { ...params }, { signal })
  }
  return mock(CORPORATE_OPERATIONS.list, signal, () => {
    const filters = params.status
      ? [...(params.filters ?? []), { field: 'status', op: 'eq' as const, value: params.status }]
      : params.filters
    return runQuery(corporateAccountFixtures, { ...params, filters }, corporateShape)
  })
}

/**
 * GET /api/v1/corporate-accounts/:id
 *   -> CorporateAccount
 */
export async function getCorporateAccount(id: string, signal?: AbortSignal): Promise<CorporateAccount> {
  if (DATA_SOURCE === 'http') {
    return http.get<CorporateAccount>(`/corporate-accounts/${id}`, undefined, { signal })
  }
  return mock(CORPORATE_OPERATIONS.get, signal, () => {
    const row = corporateAccountFixtures.find((c) => c.id === id)
    if (!row) throw notFound('corporate account', id)
    return row
  })
}

export interface CreateCorporateAccountInput {
  companyName: string
  contactName: string
  contactEmail: string
  contactPhone?: string | null
  billingType: CorporateAccount['billingType']
  expectedEmployees?: number | null
  /** 1–28. Clamped server-side, as legacy does on write (`:6524`). */
  invoiceDayOfMonth?: number
}

/**
 * POST /api/v1/corporate-accounts
 *   body: CreateCorporateAccountInput
 *   -> CorporateAccount   (status `Pending`, empty `riderIds`)
 *   422 when company name, contact name or contact email is missing
 */
export async function createCorporateAccount(
  input: CreateCorporateAccountInput,
  signal?: AbortSignal,
): Promise<CorporateAccount> {
  if (DATA_SOURCE === 'http') {
    return http.post<CorporateAccount>('/corporate-accounts', input, { signal })
  }
  return mockMutation(CORPORATE_OPERATIONS.create, signal, () => {
    const missing = (['companyName', 'contactName', 'contactEmail'] as const).filter(
      (k) => !String(input[k] ?? '').trim(),
    )
    if (missing.length > 0) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'required_fields',
        message: 'Company name, contact name and contact email are required',
        details: missing.map((field) => ({ field, code: 'required', message: 'Enter a value' })),
        retryable: false,
      })
    }
    const nextNumber = corporateAccountFixtures.length + 1
    return {
      id: `CORP-${String(nextNumber).padStart(3, '0')}`,
      companyName: input.companyName,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone ?? null,
      status: 'Pending',
      billingType: input.billingType,
      expectedEmployees: input.expectedEmployees ?? null,
      invoiceDayOfMonth: Math.min(28, Math.max(1, input.invoiceDayOfMonth ?? 1)),
      lastInvoiceGeneratedAt: null,
      riderIds: [],
      employeeCount: 0,
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
      createdAt: EYVAR_NOW,
    }
  })
}

/**
 * PATCH /api/v1/corporate-accounts/:id/usage-policy
 *   body: Partial<CorporateUsagePolicy>
 *   -> CorporateAccount
 *
 * The detail page's sectioned form (§4.1) with a save bar (§2.3). Every field is
 * nullable, so "cleared" and "never set" are the same value — which is the
 * legacy behaviour and worth checking with product-owner before the form is built.
 */
export async function updateCorporateUsagePolicy(
  id: string,
  patch: Partial<CorporateAccount['usagePolicy']>,
  signal?: AbortSignal,
): Promise<CorporateAccount> {
  if (DATA_SOURCE === 'http') {
    return http.patch<CorporateAccount>(`/corporate-accounts/${id}/usage-policy`, patch, { signal })
  }
  return mockMutation(CORPORATE_OPERATIONS.updatePolicy, signal, () => {
    const row = corporateAccountFixtures.find((c) => c.id === id)
    if (!row) throw notFound('corporate account', id)
    return { ...row, usagePolicy: { ...row.usagePolicy, ...patch } }
  })
}

/**
 * POST /api/v1/corporate-accounts/:id/employees
 *   body: { riderId: string }
 *   -> CorporateAccount
 *   409 when the rider is already covered by another account
 *
 * The 409 is real: legacy builds a `linkedElsewhere` map precisely because one
 * rider cannot be on two corporate bills (`:6726`).
 */
export async function addCorporateEmployee(
  id: string,
  riderId: string,
  signal?: AbortSignal,
): Promise<CorporateAccount> {
  if (DATA_SOURCE === 'http') {
    return http.post<CorporateAccount>(`/corporate-accounts/${id}/employees`, { riderId }, { signal })
  }
  return mockMutation(CORPORATE_OPERATIONS.addEmployee, signal, () => {
    const row = corporateAccountFixtures.find((c) => c.id === id)
    if (!row) throw notFound('corporate account', id)
    const other = corporateAccountFixtures.find((c) => c.id !== id && c.riderIds.includes(riderId))
    if (other) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'rider_linked_elsewhere',
        message: `${riderId} is already covered by ${other.companyName}`,
        retryable: false,
      })
    }
    const riderIds = [...row.riderIds, riderId]
    return { ...row, riderIds, employeeCount: riderIds.length }
  })
}

/**
 * GET /api/v1//corporate-accounts/facets
 *   params: view
 *   -> Facets — field name -> [{ value, count }], count-descending
 *
 * The option set for every `select` / `multi-select` filter over corporate accounts,
 * **derived from the data**. A screen that hard-codes `Riyadh` / `Jeddah` is
 * wrong the first time a third city is seeded (finding **F-6**). Scoped by
 * `view` only, so narrowing one filter never removes the options you would
 * need to widen it again.
 *
 * Facetable fields are declared on the shape's `facetable` list above.
 */
export async function getCorporateFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/corporate-accounts/facets', { view: view ?? undefined }, { signal })
  }
  return mock(CORPORATE_OPERATIONS.facets, signal, () => computeFacets(corporateAccountFixtures, corporateShape, view))
}
