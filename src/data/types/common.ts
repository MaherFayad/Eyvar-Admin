/**
 * Shared transport vocabulary for every client in `src/data/clients/`.
 *
 * These types model **the API**, not the fixtures. Pagination is an envelope,
 * ids are strings, timestamps are ISO 8601 strings, money is integer minor
 * units, and anything the server may return as null is `T | null` here.
 *
 * Nothing in this file imports a fixture. Nothing outside `src/data/` imports
 * a fixture at all — that is the seam.
 */

/* ─────────────────────────── Money ─────────────────────────── */

/**
 * Money is always an **integer count of halalas** (1 SAR = 100 halalas).
 * Never a float, never a formatted string. Formatting is the UI's job
 * (`formatMoney`, DESIGN.md §8.3), because the display form depends on
 * locale and on `dir`, and a ledger that carries `12.34` through three
 * additions is a defect waiting for an auditor.
 *
 * Negative values are legal and meaningful: an overdrawn rider wallet, a
 * captain debt, a reversed payout.
 */
export type Halalas = number

/** ISO-4217. The product is Saudi-only today; the field exists so it stays that way by choice. */
export type CurrencyCode = 'SAR'

export interface Money {
  amount: Halalas
  currency: CurrencyCode
}

/* ───────────────────────── Timestamps ──────────────────────── */

/**
 * ISO 8601 with offset, e.g. `2026-06-25T09:14:00+03:00`.
 * The legacy app stores display strings (`'25 Jun 07:00'`, `:2676`) which cannot
 * be sorted, compared or localised. Clients convert on the way out; the UI
 * formats on the way in. A raw `Date` never crosses the seam.
 */
export type IsoDateTime = string

/** ISO 8601 calendar date, e.g. `2026-06-25`. Legacy `DB.driverDocs` already uses this (`:13279`). */
export type IsoDate = string

/* ─────────────────────── Query envelope ────────────────────── */

export type SortDirection = 'asc' | 'desc'

export interface SortSpec {
  /** Domain field name, not a column index. The server sorts; the table asks. */
  field: string
  dir: SortDirection
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'in'
  | 'nin'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'between'
  | 'isNull'
  | 'isNotNull'

export type FilterValue = string | number | boolean | null | Array<string | number>

export interface FilterSpec {
  field: string
  op: FilterOperator
  value: FilterValue
}

/**
 * The request shape every index client accepts.
 *
 * `view` is a **control, not a level** (foundation spec §3.8 rule 3). It rides
 * as a query param on the request exactly as it rides as `?view=` on the URL,
 * so a view tab never becomes a separate endpoint.
 */
export interface QueryParams {
  /** 1-based. Absent means page 1. */
  page?: number
  /** Absent means `DEFAULT_PAGE_SIZE`. */
  pageSize?: number
  /** Free-text search across the resource's documented search fields. */
  q?: string
  sort?: SortSpec | null
  filters?: FilterSpec[]
  /** The active index view tab, e.g. `expiring-7d`. */
  view?: string | null
  /** Cancellation. The mock honours it; the http transport passes it to `fetch`. */
  signal?: AbortSignal
}

/* ────────────────────── Response envelopes ─────────────────── */

/**
 * The list envelope. Every index endpoint returns this — including the ones
 * that today would fit in one page. A screen written against a bare array has
 * to be rewritten the first time a tenant has 1,200 captains.
 */
export interface Paginated<T> {
  items: T[]
  /** 1-based page number that was served. */
  page: number
  pageSize: number
  /** Total matching records across all pages, after filters, before pagination. */
  total: number
  /** `Math.ceil(total / pageSize)`, minimum 1 so an empty list still has page 1. */
  totalPages: number
}

/** Single-record envelope. Kept distinct so `data` can gain siblings (`meta`, `links`) without a breaking change. */
export interface Single<T> {
  data: T
}

/** A count endpoint: `null` means "this resource has no backlog concept", not zero. */
export interface CountResult {
  count: number | null
}

/**
 * How many records of one kind reference a subject, and how many still need
 * somebody.
 *
 * `open` and `total` are both here because they answer different sentences and
 * because **`0` open beside a non-zero `total` is a real state** — *"three
 * complaints, all resolved"* is not the same page as *"no complaints"*, and a
 * single count cannot say which. A boolean *"is there anything here"* loses the
 * distinction that killed the reference design's composed absence sentence.
 *
 * It lives in `common.ts` and not beside the first resource that needed it: the
 * rider profile's presence read declared it as `RiderRelatedCount`, the captain
 * profile's needs exactly the same shape, and two names for one concept is the
 * defect `types/rider.ts` retired `WalletTransaction` over. The rider's name
 * survives as an alias so nothing that imports it has to change.
 */
export interface RelatedCount {
  total: number
  open: number
}

/**
 * A `select` / `multi-select` filter's option set, **derived from the data**.
 *
 * The alternative is a hand-written list in the screen, and that list is wrong
 * the first time a third city is seeded (finding F-6 in
 * `docs/05-restructure/build/03-table-controls.md`). A facet endpoint is what a
 * real API returns for exactly this reason, so the seam models it now and the
 * screens never hard-code an option again.
 *
 * `count` is how many records carry the value, so a dropdown can show
 * `Riyadh (52)` and an operator can see that a value exists but is empty.
 */
export interface FacetValue {
  value: string
  count: number
}

/** Field name → its option set. Only fields a resource declares `facetable` appear. */
export type Facets = Record<string, FacetValue[]>

export const DEFAULT_PAGE_SIZE = 25

/* ──────────────────────────── Errors ───────────────────────── */

/**
 * Machine-readable failure kinds. The UI branches on `kind`, never on the
 * message string — messages are copy and belong to the design spec.
 */
export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'rate-limited'
  | 'server'
  | 'unknown'

export interface ApiErrorDetail {
  /** Dotted path to the offending field, for form-level errors. */
  field: string
  code: string
  message: string
}

/**
 * The one error type that crosses the seam. Both the mock and the http
 * transport throw this and nothing else, so a screen's error branch does not
 * change when `DATA_SOURCE` flips.
 */
export class ApiError extends Error {
  readonly status: number
  readonly kind: ApiErrorKind
  readonly code: string
  readonly details: ApiErrorDetail[]
  /** Server correlation id. `null` in mock mode unless a failure injects one. */
  readonly requestId: string | null
  /** Whether a bare retry is worth offering. Drives the ErrorState's action. */
  readonly retryable: boolean

  constructor(init: {
    status: number
    kind?: ApiErrorKind
    code?: string
    message: string
    details?: ApiErrorDetail[]
    requestId?: string | null
    retryable?: boolean
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.kind = init.kind ?? kindForStatus(init.status)
    this.code = init.code ?? this.kind
    this.details = init.details ?? []
    this.requestId = init.requestId ?? null
    this.retryable = init.retryable ?? isRetryableStatus(init.status)
    // Keeps `instanceof ApiError` working when compiled down to ES5 targets.
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export function kindForStatus(status: number): ApiErrorKind {
  if (status === 0) return 'network'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not-found'
  if (status === 408) return 'timeout'
  if (status === 409) return 'conflict'
  if (status === 422) return 'validation'
  if (status === 429) return 'rate-limited'
  if (status >= 500) return 'server'
  return 'unknown'
}

export function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

/* ──────────────────────── Localised text ───────────────────── */

/**
 * A server-supplied string that has **not** been assembled into a sentence.
 *
 * A ledger description is the case that forces this. Legacy builds them by
 * concatenation — `'Released ' + e.amount.toFixed(2) + ' SAR escrow to ' + dn`
 * (`:7068`), `nm2(driverId) + ' under-reported cash for ' + t.id + ' by ' + …`
 * (`:12124`) — and Arabic does not put the noun where English does, so a
 * concatenated sentence is untranslatable by construction (financials spec §11).
 *
 * The server sends a key and named params; the UI resolves both. Money params
 * stay integer halalas so `formatMoney` is still the only formatter.
 */
export interface LocalisedText {
  /** Dotted translation key, e.g. `fin.posting.tripFare`. */
  key: string
  /** Named placeholders. Never a pre-formatted money string. */
  params?: Record<string, string | number>
}

/* ───────────────────────── Badge tones ─────────────────────── */

/**
 * The closed five-tone badge palette (DESIGN.md **R7**). There is no red badge
 * and no sixth tone. A domain status with no tone here is a **finding for
 * product-designer**, not a licence to add one.
 */
export type BadgeTone = 'success' | 'warning' | 'info' | 'neutral' | 'new'

/**
 * Nav count badges are a different, two-value vocabulary — foundation spec
 * §8.4 `nav.badgeTone`, legacy `.sb-badge a` (`:491`) vs `.sb-badge n` (`:502`).
 * Do not conflate it with `BadgeTone`.
 */
export type NavBadgeTone = 'attention' | 'neutral'

/* ───────────────────── Ownership / claims ──────────────────── */

/**
 * A claim on a work-queue item. Server state, not UI state — it survives every
 * route change and expires on the server's clock (legacy `DB.ownershipConfig.staleMin = 30`,
 * `:18853`). Modelled here in `common` because five sub-tabs across three
 * workspaces carry it.
 *
 * Legacy shape: `{key,type,id,ownerId,ownerName,claimedAtMs,touchedAtMs,state,takeovers}` (`:18887`).
 * `*Ms` epochs become ISO strings on the wire.
 */
export type ClaimState = 'claimed' | 'released' | 'done'

export type ClaimReleaseReason = 'manual' | 'stale' | null

export interface Claim {
  /** `<type>:<id>`, legacy `ckey()` (`:18858`). */
  key: string
  entityType: string
  entityId: string
  ownerId: string
  ownerName: string
  claimedAt: IsoDateTime
  /** Last interaction. The stale sweep measures from here, not from `claimedAt`. */
  touchedAt: IsoDateTime
  state: ClaimState
  releasedAt: IsoDateTime | null
  releaseReason: ClaimReleaseReason
  /** Every deliberate take-over, in order. A claim is not a lock (`:18879`). */
  takeovers: ClaimTakeover[]
}

export interface ClaimTakeover {
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  at: IsoDateTime
}

/** What the current session may do with a claim on a given row. Derived server-side; never re-derived in a component. */
export interface ClaimAffordance {
  claim: Claim | null
  heldByMe: boolean
  canClaim: boolean
  canRelease: boolean
  canTakeOver: boolean
}
