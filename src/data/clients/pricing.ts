/**
 * Financials › Pricing & Plans — **Stage A**.
 *
 * Four views on one route: `Subscription plans` (default), `Quick rides`,
 * `Rate card`, `Cancellation fees`.
 *
 * ## What ships and what does not
 *
 * **Q7 is unanswered** — which of four stores is authoritative for rates,
 * commission and discount is a Finance-lead decision (§4). So:
 *
 *   - the catalogue half of a plan is **editable**: names, duration, execute
 *     days, cancel cap, sort order, status, features;
 *   - the pricing half renders in §4.6's **disabled** treatment, under one
 *     page-level banner naming the open question and its owner;
 *   - the rate card is **read-only in full**, with its version history and
 *     simulations;
 *   - **the derived values, the formula panel and the preview strip all work**,
 *     computed from the live rate card. They are why Financials is wave 3 and
 *     they are not deferred.
 *
 * Every Stage-B write — propose, approve, publish, edit a rate — is **absent**,
 * not stubbed. A stub is a promise the screen would render.
 *
 * ## The derived values
 *
 * `PLAN_PRICING_DEFINITIONS` (`types/pricing.ts`) is the single source D-F2
 * requires: the formula panel renders from it, the computation evaluates it,
 * and there is no second copy of any formula in code or markup. **The evaluator
 * is utilities-engineer's** (§14) — this client serves the definitions and the
 * live rate card they read, and computes nothing itself.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, offsetFromNow } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { ApiError } from '../types/common'
import type { Halalas } from '../types/common'
import type {
  CancellationRule,
  QuickRideType,
  RateCard,
  SubscriptionPlan,
  SurgeSuspension,
  SurgeWindow,
} from '../types/pricing'
import { SURGE_SUSPENSION_MAX_HOURS } from '../types/pricing'
import { appendAudit } from './audit'
import { http } from './http'
import { currentMockUserId } from './session'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let cancellationRuleFixtures!: Fixtures['cancellationRuleFixtures']
let quickRideTypeFixtures!: Fixtures['quickRideTypeFixtures']
let rateCardFixtures!: Fixtures['rateCardFixtures']
let subscriptionPlanFixtures!: Fixtures['subscriptionPlanFixtures']
let surgeSuspensionFixtures!: Fixtures['surgeSuspensionFixtures']
let surgeWindowFixtures!: Fixtures['surgeWindowFixtures']
let teamUserFixtures!: Fixtures['teamUserFixtures']
onFixturesLoaded((f) => {
  cancellationRuleFixtures = f.cancellationRuleFixtures
  quickRideTypeFixtures = f.quickRideTypeFixtures
  rateCardFixtures = f.rateCardFixtures
  subscriptionPlanFixtures = f.subscriptionPlanFixtures
  surgeSuspensionFixtures = f.surgeSuspensionFixtures
  surgeWindowFixtures = f.surgeWindowFixtures
  teamUserFixtures = f.teamUserFixtures
  /* Seeded here rather than at module load: these locals are built from
     late-bound fixtures, which are undefined until the fixture chunk lands. */
  planState = subscriptionPlanFixtures.map((p) => ({ ...p }))
  quickRideState = quickRideTypeFixtures.map((q) => ({ ...q }))
  suspensionState = surgeSuspensionFixtures.map((s) => ({ ...s }))
  suspensionSequence = surgeSuspensionFixtures.length
})

export const PRICING_OPERATIONS = {
  plans: 'pricing.plans',
  plan: 'pricing.plan',
  savePlan: 'pricing.savePlan',
  createPlan: 'pricing.createPlan',
  rateCards: 'pricing.rateCards',
  quickRides: 'pricing.quickRides',
  quickRide: 'pricing.quickRide',
  saveQuickRide: 'pricing.saveQuickRide',
  createQuickRide: 'pricing.createQuickRide',
  cancellationRules: 'pricing.cancellationRules',
  surgeWindows: 'pricing.surgeWindows',
  surgeSuspensions: 'pricing.surgeSuspensions',
  suspendSurge: 'pricing.suspendSurge',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(PRICING_OPERATIONS))

let planState!: SubscriptionPlan[]
let quickRideState!: QuickRideType[]
let suspensionState!: SurgeSuspension[]
let suspensionSequence = 0

export function resetPricing(): void {
  /* Nothing seeded yet: the fixture chunk has not landed, so there is no
     state to reset and the rows this would read are still undefined. The
     binder in this module seeds fresh state when it does land. */
  if (!fixturesLoaded()) return
  planState = subscriptionPlanFixtures.map((p) => ({ ...p }))
  quickRideState = quickRideTypeFixtures.map((q) => ({ ...q }))
  suspensionState = surgeSuspensionFixtures.map((s) => ({ ...s }))
  suspensionSequence = surgeSuspensionFixtures.length
}

/* ─────────────────────── plan catalogue ─────────────────────── */

/**
 * GET /api/v1/plans
 *   -> SubscriptionPlan[], in `sortOrder`
 *
 * Not paginated: three plans, and a catalogue an operator reorders by hand is
 * not an index table. `driverSharePercent` and every worked-example figure are
 * **derived** (§8.4) and are not on the wire.
 */
export async function listPlans(signal?: AbortSignal): Promise<SubscriptionPlan[]> {
  if (DATA_SOURCE === 'http') return http.get<SubscriptionPlan[]>('/plans', undefined, { signal })
  return mock(PRICING_OPERATIONS.plans, signal, () =>
    [...planState].sort((a, b) => a.sortOrder - b.sortOrder),
  )
}

/**
 * GET /api/v1/plans/:id
 *   -> SubscriptionPlan
 */
export async function getPlan(id: string, signal?: AbortSignal): Promise<SubscriptionPlan> {
  if (DATA_SOURCE === 'http') return http.get<SubscriptionPlan>(`/plans/${id}`, undefined, { signal })
  return mock(PRICING_OPERATIONS.plan, signal, () => {
    const plan = planState.find((p) => p.id === id)
    if (!plan) throw notFound('plan', id)
    return plan
  })
}

/**
 * The catalogue fields Stage A may write. The pricing half is **absent from
 * this type**, which is how "disabled until Q7" is enforced at the seam rather
 * than by a `disabled` attribute a screen could forget.
 */
export interface SavePlanInput {
  nameEn: string
  nameAr: string
  durationDays: number
  executeDays: number
  cancelCap: number
  sortOrder: number
  /** Read by the save handler — `savePlan()` today reads it from nothing (§8.6). */
  status: SubscriptionPlan['status']
  features: SubscriptionPlan['features']
  economyActive: boolean
  comfortActive: boolean
}

/**
 * PUT /api/v1/plans/:id
 *   body: SavePlanInput
 *   -> SubscriptionPlan
 *   422 when either name is empty, a feature is missing a language or exceeds
 *       60 characters, or a numeric field is blank
 *
 * **Both names are required** (`:6125`, correct behaviour, kept) and each
 * feature needs both languages at ≤ 60 characters (`:6050`).
 *
 * **D-F3, enforced at the seam.** A blank numeric input is `null`, not `0` and
 * not the previously stored value. `gv(id)` returns `parseFloat(value) || 0` —
 * blank is 0 (`:12984`) — while `numval(id, fallback)` returns the stored value
 * (`:6150`), and the preview strip reads the first while `savePlan()` reads the
 * second. The operator clears `Discount %`, watches the preview recompute at
 * 0 %, presses Save, and stores 10 %. A `NaN` or non-finite number arriving
 * here is refused rather than coerced, so the two can never disagree (AC-395).
 */
export async function savePlan(
  id: string,
  input: SavePlanInput,
  signal?: AbortSignal,
): Promise<SubscriptionPlan> {
  if (DATA_SOURCE === 'http') {
    return http.put<SubscriptionPlan>(`/plans/${id}`, input, { signal })
  }
  return mockMutation(PRICING_OPERATIONS.savePlan, signal, () => {
    const plan = planState.find((p) => p.id === id)
    if (!plan) throw notFound('plan', id)
    refusePlanInput(input)

    /* Only the catalogue half is written. The pricing half is untouched, which
       is the Stage-A boundary made mechanical. */
    const next: SubscriptionPlan = { ...plan, ...input }
    planState = planState.map((p) => (p.id === id ? next : p))
    appendAudit({
      action: 'plan.save',
      subjectType: 'plan',
      subjectId: id,
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: { key: 'fin.audit.planSaved', params: { plan: input.nameEn } },
    })
    return next
  })
}

/**
 * POST /api/v1/plans
 *   body: SavePlanInput
 *   -> SubscriptionPlan, with a server-assigned id and the pricing half taken
 *      from the live rate card (`pricingSource: 'rate-card'`)
 *   422 on the same rules as PUT
 *
 * The catalogue half is the operator's; the pricing half is not on the wire
 * (Stage A, §4.5) and arrives from the live rate card, so a new plan opens in
 * the editor with the same disabled pricing fields an existing one has.
 */
export async function createPlan(input: SavePlanInput, signal?: AbortSignal): Promise<SubscriptionPlan> {
  if (DATA_SOURCE === 'http') {
    return http.post<SubscriptionPlan>('/plans', input, { signal })
  }
  return mockMutation(PRICING_OPERATIONS.createPlan, signal, () => {
    refusePlanInput(input)
    const live = rateCardFixtures.find((card) => card.status === 'live')
    const economy = live?.classes.find((c) => c.id === 'economy')
    const comfort = live?.classes.find((c) => c.id === 'comfort')
    const next: SubscriptionPlan = {
      id: uniqueId(slug(input.nameEn), planState.map((p) => p.id)),
      ...input,
      commissionPercent: live?.commission.subscriptionPercent ?? 0,
      discountPercent: 0,
      economyPerMinuteHalalas: economy?.perMinHalalas ?? 0,
      economyPerKmHalalas: economy?.perKmHalalas ?? 0,
      comfortPerMinuteHalalas: comfort?.perMinHalalas ?? 0,
      comfortPerKmHalalas: comfort?.perKmHalalas ?? 0,
      pricingSource: 'rate-card',
      pricingEditable: false,
    }
    planState = [...planState, next]
    appendAudit({
      action: 'plan.create',
      subjectType: 'plan',
      subjectId: next.id,
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: { key: 'fin.audit.planCreated', params: { plan: input.nameEn } },
    })
    return next
  })
}

/** A URL-safe id from a name: `Weekend Saver` becomes `weekend-saver`. */
function slug(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return base === '' ? 'item' : base
}

function uniqueId(base: string, taken: readonly string[]): string {
  if (!taken.includes(base)) return base
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`
    if (!taken.includes(candidate)) return candidate
  }
}

/** The 422 both plan writes share. */
function refusePlanInput(input: SavePlanInput): void {
  {
    const details: Array<{ field: string; code: string; message: string }> = []
    if (!input.nameEn.trim()) details.push({ field: 'nameEn', code: 'required', message: 'Enter an English name' })
    if (!input.nameAr.trim()) details.push({ field: 'nameAr', code: 'required', message: 'Enter an Arabic name' })
    for (const [i, feature] of input.features.entries()) {
      if (!feature.en.trim() || !feature.ar.trim()) {
        details.push({ field: `features.${i}`, code: 'required', message: 'Enter both languages' })
      }
      if (feature.en.length > 60 || feature.ar.length > 60) {
        details.push({ field: `features.${i}`, code: 'maxLength', message: '60 characters' })
      }
    }
    for (const field of ['durationDays', 'executeDays', 'cancelCap', 'sortOrder'] as const) {
      const value = input[field]
      if (!Number.isFinite(value)) {
        details.push({ field, code: 'required', message: 'Enter a number' })
      }
    }
    if (details.length) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'plan_invalid',
        message: 'Fix the fields below',
        details,
        retryable: false,
      })
    }
  }
}

/* ────────────────────────── rate card ───────────────────────── */

/**
 * GET /api/v1/rate-cards
 *   params: status
 *   -> RateCard[], newest first
 *
 * Read-only in Stage A, in full: version, status, effective date, per-class
 * rates, commission, ladder, floors, surge cap, and the version history with
 * its simulations.
 *
 * The two draft states a screen must render are both here without any
 * hand-editing: a draft **proposed by the acting operator** (`Approve` disabled
 * — you cannot approve what you proposed, `:21586`, AC-405) and a draft with
 * **no simulation** (`Approve` disabled — a price nobody modelled cannot be
 * approved, `:21590`, AC-404). Both are render-time states, not commit-time
 * refusals.
 *
 * **D-F10, recorded:** `proposeRateCard`, `approveRateCard`,
 * `commitRateCardChange` and `suspendSurge` carry **no permission check** in
 * 21,857 lines. The first three do not exist here at all — they are Stage B.
 */
export async function listRateCards(signal?: AbortSignal): Promise<RateCard[]> {
  if (DATA_SOURCE === 'http') return http.get<RateCard[]>('/rate-cards', undefined, { signal })
  return mock(PRICING_OPERATIONS.rateCards, signal, () =>
    [...rateCardFixtures].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)),
  )
}

/**
 * GET /api/v1/rate-cards/live
 *   -> RateCard
 *
 * The card the derived values, the formula panel and the preview strip read.
 */
export async function getLiveRateCard(signal?: AbortSignal): Promise<RateCard> {
  if (DATA_SOURCE === 'http') return http.get<RateCard>('/rate-cards/live', undefined, { signal })
  return mock(PRICING_OPERATIONS.rateCards, signal, () => {
    const live = rateCardFixtures.find((c) => c.status === 'live')
    if (!live) throw notFound('rate card', 'live')
    return live
  })
}

/* ───────────────────────── quick rides ─────────────────────── */

/**
 * GET /api/v1/quick-ride-types
 *   -> QuickRideType[]
 *
 * Economy per-km is 1.10 here and 1.20 on the rate card. The view shows both
 * until Q7 resolves which is the price.
 */
export async function listQuickRideTypes(signal?: AbortSignal): Promise<QuickRideType[]> {
  if (DATA_SOURCE === 'http') {
    return http.get<QuickRideType[]>('/quick-ride-types', undefined, { signal })
  }
  return mock(PRICING_OPERATIONS.quickRides, signal, () => quickRideState)
}

/**
 * GET /api/v1/quick-ride-types/:id
 *   -> QuickRideType
 *   404 when the class does not exist
 */
export async function getQuickRideType(id: string, signal?: AbortSignal): Promise<QuickRideType> {
  if (DATA_SOURCE === 'http') {
    return http.get<QuickRideType>(`/quick-ride-types/${id}`, undefined, { signal })
  }
  return mock(PRICING_OPERATIONS.quickRide, signal, () => {
    const type = quickRideState.find((q) => q.id === id)
    if (!type) throw notFound('quick-ride class', id)
    return type
  })
}

/**
 * Everything on a quick-ride class but its id. The rates ARE on the wire:
 * this store is the class's own (spec §4.3 row `DB.quickRideTypes`, written
 * under `manage_plans`), not the rate card's (§12).
 */
export interface SaveQuickRideTypeInput {
  name: string
  nameAr: string
  baseFareHalalas: Halalas
  perKmHalalas: Halalas
  perMinHalalas: Halalas
  active: boolean
}

/**
 * PUT /api/v1/quick-ride-types/:id
 *   body: SaveQuickRideTypeInput
 *   -> QuickRideType
 *   404 when the class does not exist
 *   422 when either name is empty or a rate is not a whole number of halalas
 *       at or above zero
 */
export async function saveQuickRideType(
  id: string,
  input: SaveQuickRideTypeInput,
  signal?: AbortSignal,
): Promise<QuickRideType> {
  if (DATA_SOURCE === 'http') {
    return http.put<QuickRideType>(`/quick-ride-types/${id}`, input, { signal })
  }
  return mockMutation(PRICING_OPERATIONS.saveQuickRide, signal, () => {
    const type = quickRideState.find((q) => q.id === id)
    if (!type) throw notFound('quick-ride class', id)
    refuseQuickRideInput(input)
    const next: QuickRideType = { ...type, ...input }
    quickRideState = quickRideState.map((q) => (q.id === id ? next : q))
    appendAudit({
      action: 'quickRide.save',
      subjectType: 'quick-ride-class',
      subjectId: id,
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: { key: 'fin.audit.quickRideSaved', params: { name: input.name } },
    })
    return next
  })
}

/**
 * POST /api/v1/quick-ride-types
 *   body: SaveQuickRideTypeInput
 *   -> QuickRideType, with a server-assigned id
 *   422 on the same rules as PUT
 */
export async function createQuickRideType(
  input: SaveQuickRideTypeInput,
  signal?: AbortSignal,
): Promise<QuickRideType> {
  if (DATA_SOURCE === 'http') {
    return http.post<QuickRideType>('/quick-ride-types', input, { signal })
  }
  return mockMutation(PRICING_OPERATIONS.createQuickRide, signal, () => {
    refuseQuickRideInput(input)
    const next: QuickRideType = {
      id: uniqueId(slug(input.name), quickRideState.map((q) => q.id)),
      ...input,
    }
    quickRideState = [...quickRideState, next]
    appendAudit({
      action: 'quickRide.create',
      subjectType: 'quick-ride-class',
      subjectId: next.id,
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: { key: 'fin.audit.quickRideCreated', params: { name: input.name } },
    })
    return next
  })
}

function refuseQuickRideInput(input: SaveQuickRideTypeInput): void {
  const details: Array<{ field: string; code: string; message: string }> = []
  if (!input.name.trim()) details.push({ field: 'name', code: 'required', message: 'Enter an English name' })
  if (!input.nameAr.trim()) details.push({ field: 'nameAr', code: 'required', message: 'Enter an Arabic name' })
  for (const field of ['baseFareHalalas', 'perKmHalalas', 'perMinHalalas'] as const) {
    const value = input[field]
    if (!Number.isInteger(value) || value < 0) {
      details.push({ field, code: 'range', message: 'Enter an amount of 0 or more' })
    }
  }
  if (details.length) {
    throw new ApiError({
      status: 422,
      kind: 'validation',
      code: 'quick_ride_invalid',
      message: 'Fix the fields below',
      details,
      retryable: false,
    })
  }
}

/* ─────────────────── cancellation fees ──────────────────────── */

/**
 * GET /api/v1/cancellation-rules
 *   -> CancellationRule[]
 *
 * Read-only. **Q-F1** — whether a cancellation fee is a property of *what
 * happened* or *what class the trip was* — is unanswered, and merging the two
 * stores means choosing a dimension.
 *
 * Five of the eight rules have `hasEnforcement: false` (**D-F7**) and render a
 * visible `Not enforced` state. They never render as though they were live
 * (AC-414).
 */
export async function listCancellationRules(signal?: AbortSignal): Promise<CancellationRule[]> {
  if (DATA_SOURCE === 'http') {
    return http.get<CancellationRule[]>('/cancellation-rules', undefined, { signal })
  }
  return mock(PRICING_OPERATIONS.cancellationRules, signal, () => cancellationRuleFixtures)
}

/* ──────────────────────────── surge ─────────────────────────── */

/**
 * GET /api/v1/surge-windows
 *   -> SurgeWindow[]
 *
 * Read-only on this sub-tab. **No control on any Financials surface raises a
 * surge multiplier** (AC-410); operations may only suspend.
 */
export async function listSurgeWindows(signal?: AbortSignal): Promise<SurgeWindow[]> {
  if (DATA_SOURCE === 'http') return http.get<SurgeWindow[]>('/surge-windows', undefined, { signal })
  return mock(PRICING_OPERATIONS.surgeWindows, signal, () => surgeWindowFixtures)
}

/**
 * GET /api/v1/surge-suspensions
 *   -> SurgeSuspension[]
 *
 * `expiresIn` is **derived and live** — it counts down — so the wire carries
 * `expiresAt` and the screen counts against the clock it was given. A countdown
 * stored as data is a stale number by definition.
 */
export async function listSurgeSuspensions(signal?: AbortSignal): Promise<SurgeSuspension[]> {
  if (DATA_SOURCE === 'http') {
    return http.get<SurgeSuspension[]>('/surge-suspensions', undefined, { signal })
  }
  return mock(PRICING_OPERATIONS.surgeSuspensions, signal, () => suspensionState)
}

/**
 * POST /api/v1/surge-suspensions
 *   body: { zoneId, zoneName, reason, hours }
 *   -> SurgeSuspension
 *   422 without a reason, or above the 12-hour ceiling
 *
 * A safety lever an ops manager must reach at 02:00, which is why §10.3 gives
 * it `live_ops` and **not** the rate card's key. It cannot be extended, only
 * re-raised (`:21527`, AC-409).
 */
export async function suspendSurge(
  input: { zoneId: string; zoneName: string; reason: string; hours: number },
  signal?: AbortSignal,
): Promise<SurgeSuspension> {
  if (DATA_SOURCE === 'http') {
    return http.post<SurgeSuspension>('/surge-suspensions', input, { signal })
  }
  return mockMutation(PRICING_OPERATIONS.suspendSurge, signal, () => {
    if (!input.reason.trim()) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'reason_required',
        message: 'Enter why surge is being suspended',
        details: [{ field: 'reason', code: 'required', message: 'Enter a reason' }],
        retryable: false,
      })
    }
    if (!(input.hours > 0) || input.hours > SURGE_SUSPENSION_MAX_HOURS) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'hours_out_of_range',
        message: `Choose between 1 and ${SURGE_SUSPENSION_MAX_HOURS} hours`,
        details: [{ field: 'hours', code: 'max', message: String(SURGE_SUSPENSION_MAX_HOURS) }],
        retryable: false,
      })
    }
    const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
    suspensionSequence += 1
    const suspension: SurgeSuspension = {
      id: `SUS-${String(suspensionSequence).padStart(4, '0')}`,
      zoneId: input.zoneId,
      zoneName: input.zoneName,
      reason: input.reason,
      setByUserId: me.id,
      setByUserName: me.name,
      startedAt: EYVAR_NOW,
      /* Riyadh offset, like every other instant in this dataset — not a UTC
         `toISOString()`, which would be the one timestamp shaped differently. */
      expiresAt: offsetFromNow({ hours: input.hours }),
    }
    suspensionState = [...suspensionState, suspension]
    return suspension
  })
}
