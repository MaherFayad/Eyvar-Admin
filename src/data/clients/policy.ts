/**
 * Admin › Policy — the operational policy document and the reason-code
 * registry. **P6-T3.**
 *
 * `src/lib/sla.ts` has always computed against a policy; until now nothing
 * edited one, so the policy was a constant wearing a type. This client is the
 * other end of that: `resolutionTargetMinutes()` in `types/policy.ts` produces
 * exactly `SlaInput.targetMinutes`, and no shape was invented in parallel.
 *
 * ## Why one document and not four
 *
 * The screen has four panes — dispatch, cities, limits, reasons — and legacy
 * gave each its own button over its own mutable global (`saveSlaPolicy`
 * `:15140`, `saveReasonCodes` `:15093`, `saveCompPolicy`). Four saves that each
 * read the DOM is four chances to lose something, and F-014 is what losing
 * something looks like. One read, one write, one diff.
 *
 * The registry is the exception, and deliberately: a code is created, edited and
 * retired **one at a time**, because a 30-row form whose save writes every row
 * is precisely the construction that flattened.
 *
 * ## F-014 and the three things that stop it here
 *
 * 1. **`SaveOperationalPolicyInput` mirrors the stored document.** The round
 *    trip is the identity function. A mapping is where the defect lived; there
 *    is no mapping.
 * 2. **`changedFields`.** Every save reports the dotted path of every field it
 *    moved. A flattening save cannot be quiet: each flattened cell shows up as
 *    `sla.queues.tickets.T2.resolutionMinutes`. This is the audit payload and
 *    it is the regression test's instrument.
 * 3. **An empty diff still writes.** The save does not short-circuit on "nothing
 *    changed" — it stores what it was given and then reports that nothing moved.
 *    A short-circuit would make the round-trip test pass without exercising the
 *    round trip, which is a vacuous green (`DECISIONS.md`, *"a negative
 *    assertion can pass vacuously"*). Only the **audit entry** is skipped, since
 *    a log line reading *"changed nothing"* is noise.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { rederiveOpenTicketClocks } from './tickets'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { ApiError, type ApiErrorDetail, type Paginated } from '../types/common'
import {
  SLA_TIER_KEYS,
  pickableReasonCodes,
  type CreateReasonCodeInput,
  type OperationalPolicy,
  type ReasonCode,
  type ReasonCodeState,
  type ReasonSurface,
  type SaveOperationalPolicyInput,
  type SavePolicyResult,
  type SaveReasonCodeInput,
  type SlaPolicy,
  type SlaQueuePolicy,
} from '../types/policy'
import { appendAudit } from './audit'
import { http } from './http'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let operationalPolicyFixture!: Fixtures['operationalPolicyFixture']
onFixturesLoaded((f) => {
  operationalPolicyFixture = f.operationalPolicyFixture
  /* Seeded here rather than at module load: these locals are built from
     late-bound fixtures, which are undefined until the fixture chunk lands. */
  policyState = clone(operationalPolicyFixture)
})

export const POLICY_OPERATIONS = {
  get: 'policy.get',
  save: 'policy.save',
  reasonCodes: 'policy.reasonCodes',
  reasonCodeOptions: 'policy.reasonCodeOptions',
  resolveReasonCode: 'policy.resolveReasonCode',
  createReasonCode: 'policy.createReasonCode',
  saveReasonCode: 'policy.saveReasonCode',
  retireReasonCode: 'policy.retireReasonCode',
  restoreReasonCode: 'policy.restoreReasonCode',
} as const

/* AC-904 — registered at module load, so `?mockFail=` can be validated and a QA
   panel can list these eight without having called one of them first. */
registerOperations(...Object.values(POLICY_OPERATIONS))

/* ─────────────────────────── state ─────────────────────────── */

/**
 * `JSON` round trip rather than `structuredClone`: the document is plain data
 * by construction (no `Date`, no `Map`, no `undefined`), and a clone that would
 * *fail* on a non-serialisable field is a cheap guard that the document stayed
 * plain data.
 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

let policyState!: OperationalPolicy

/**
 * The policy document, synchronously, for the clients that stamp promises
 * inside one `mockMutation` (`clients/tickets.ts`). Mock only: in http mode
 * the server resolves an SLA and this is never called.
 */
/** D22: the cap's ceiling. Four already breaks the 45-second promise. */
export const CHAT_CAP_MAX = 8

export function currentPolicy(): OperationalPolicy {
  return policyState
}

export function resetPolicy(): void {
  /* Nothing seeded yet: the fixture chunk has not landed, so there is no
     state to reset and the rows this would read are still undefined. The
     binder in this module seeds fresh state when it does land. */
  if (!fixturesLoaded()) return
  policyState = clone(operationalPolicyFixture)
}

/* ───────────────────────── read ───────────────────────── */

/**
 * GET /api/v1/policy
 *   -> OperationalPolicy
 *
 * The whole document, including the registry. The editor needs all of it at
 * once because a reason code's tier is only meaningful against the tier
 * defaults, and an SLA cell's *inherited* value is only renderable with the
 * tier defaults in hand — §11.2's "disabled in place with a stated reason" has
 * an analogue here: an inherited cell states the number it inherits, never a
 * blank.
 */
export async function getOperationalPolicy(signal?: AbortSignal): Promise<OperationalPolicy> {
  if (DATA_SOURCE === 'http') {
    return http.get<OperationalPolicy>('/policy', undefined, { signal })
  }
  return mock(POLICY_OPERATIONS.get, signal, () => clone(policyState))
}

/* ───────────────────────── write ───────────────────────── */

/**
 * PUT /api/v1/policy
 *   body: SaveOperationalPolicyInput
 *   -> SavePolicyResult
 *   422 on a malformed grid, a negative or fractional target, an empty city
 *       name, or a first-response target later than the resolution target
 *
 * **The registry is not in the input.** `reasonCodes` is written by
 * `createReasonCode` / `saveReasonCode` / `retireReasonCode`, one code at a
 * time. A bulk registry save is the shape that produced F-014 and it is not
 * offered.
 *
 * **`null` in `sla.queues[*].tiers[*]` is stored as `null`.** It is never
 * resolved on the way in. If a caller sends the tier's number instead of
 * `null`, that is an explicit override and it appears in `changedFields` — the
 * save cannot tell an intentional override from a flattened one, and it does not
 * try to. It makes the difference *visible*, which is what the operator and the
 * audit log need.
 */
export async function saveOperationalPolicy(
  input: SaveOperationalPolicyInput,
  signal?: AbortSignal,
): Promise<SavePolicyResult> {
  if (DATA_SOURCE === 'http') {
    return http.put<SavePolicyResult>('/policy', input, { signal })
  }
  return mockMutation(POLICY_OPERATIONS.save, signal, () => {
    const details = validatePolicyInput(input)
    if (details.length) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'policy_invalid',
        message: 'Fix the fields below',
        details,
        retryable: false,
      })
    }

    const before = policyState
    const next: OperationalPolicy = {
      dispatch: clone(input.dispatch),
      /* The derived fleet count is re-attached from what is stored, never taken
         from the input — it is not the operator's to write. A city the input
         adds has no count yet, and `0` is the honest answer for a city nobody
         drives in. */
      cities: input.cities.map((city) => ({
        ...clone(city),
        activeCaptains: before.cities.find((each) => each.id === city.id)?.activeCaptains ?? 0,
      })),
      limits: clone(input.limits),
      reasonCodes: clone(before.reasonCodes),
      sla: clone(input.sla),
    }

    const changedFields = diffPolicy(before, next)
    policyState = next
    /* B1: the grid moved, so every open ticket's promises move with it (§9.1). */
    if (JSON.stringify(before.sla) !== JSON.stringify(next.sla)) rederiveOpenTicketClocks(next)

    if (changedFields.length > 0) {
      appendAudit({
        action: 'policy.save',
        subjectType: 'policy',
        subjectId: 'operational',
        amountHalalas: null,
        reasonCode: null,
        note: null,
        detail: {
          key: 'policy.audit.saved',
          params: { count: changedFields.length, fields: changedFields.join(', ') },
        },
      })
    }

    return { policy: clone(next), changedFields }
  })
}

/* ─────────────────── the reason-code registry ─────────────────── */

export interface ReasonCodeQuery {
  q?: string
  surface?: ReasonSurface
  state?: ReasonCodeState
  page?: number
  pageSize?: number
  signal?: AbortSignal
}

/**
 * GET /api/v1/policy/reason-codes
 *   params: q · surface · state · page · pageSize
 *   -> Paginated<ReasonCode>, active first then retired, `key` within each
 *
 * **The admin registry, which shows retired codes.** A picker must not use
 * this — it uses `listReasonCodeOptions`.
 *
 * Ordering is deliberate: retired codes sink rather than disappear, so an
 * operator looking for *"the one we stopped using"* finds it at the bottom of
 * the same list instead of having to know a filter exists.
 */
export async function listReasonCodes(
  params: ReasonCodeQuery = {},
): Promise<Paginated<ReasonCode>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<ReasonCode>>(
      '/policy/reason-codes',
      { ...params, signal: undefined },
      { signal: params.signal },
    )
  }
  return mock(POLICY_OPERATIONS.reasonCodes, params.signal, () => {
    const needle = params.q?.trim().toLowerCase() ?? ''
    const rows = policyState.reasonCodes
      .filter((code) => !params.state || code.state === params.state)
      .filter((code) => !params.surface || code.surfaces.includes(params.surface))
      .filter(
        (code) =>
          !needle ||
          code.key.toLowerCase().includes(needle) ||
          code.labels.en.toLowerCase().includes(needle) ||
          /* Arabic is searched too. An Arabic-first agent typing an Arabic label
             into an English-shaped search box is the normal case here, not the
             edge one. */
          code.labels.ar.includes(params.q?.trim() ?? '') ||
          (code.reference ?? '').includes(needle),
      )
      .sort((a, b) => {
        if (a.state !== b.state) return a.state === 'active' ? -1 : 1
        return a.key.localeCompare(b.key)
      })

    const pageSize = params.pageSize ?? 50
    const page = params.page ?? 1
    const start = (page - 1) * pageSize
    return {
      items: clone(rows.slice(start, start + pageSize)),
      page,
      pageSize,
      total: rows.length,
      totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
    }
  })
}

/**
 * GET /api/v1/policy/reason-codes/options
 *   params: surface
 *   -> ReasonCode[] — **active only**
 *
 * What a picker offers. This is the whole mechanism of retirement: a retired
 * code leaves this list and stays in `resolveReasonCode`, so it stops being
 * choosable and never stops being readable.
 */
export async function listReasonCodeOptions(
  surface: ReasonSurface,
  signal?: AbortSignal,
): Promise<ReasonCode[]> {
  if (DATA_SOURCE === 'http') {
    return http.get<ReasonCode[]>('/policy/reason-codes/options', { surface }, { signal })
  }
  return mock(POLICY_OPERATIONS.reasonCodeOptions, signal, () =>
    clone(pickableReasonCodes(policyState.reasonCodes, surface)),
  )
}

/**
 * GET /api/v1/policy/reason-codes/:key
 *   -> ReasonCode
 *   404 only when the key was never defined
 *
 * **Resolves a retired code exactly as it resolves an active one.** A closed
 * dispute from March points at `TRP_GHOST_COMPLETE`; a 404 here would render a
 * raw key on an audit line, which is the failure retirement exists to avoid.
 */
export async function resolveReasonCode(key: string, signal?: AbortSignal): Promise<ReasonCode> {
  if (DATA_SOURCE === 'http') {
    return http.get<ReasonCode>(`/policy/reason-codes/${key}`, undefined, { signal })
  }
  return mock(POLICY_OPERATIONS.resolveReasonCode, signal, () => {
    const found = policyState.reasonCodes.find((code) => code.key === key)
    if (!found) throw notFound('reason code', key)
    return clone(found)
  })
}

/**
 * POST /api/v1/policy/reason-codes
 *   body: CreateReasonCodeInput
 *   -> ReasonCode
 *   409 when the key already exists — including when the existing one is retired
 *   422 on a malformed key, a missing label in either language, or no surface
 *
 * **A retired key blocks reuse.** Legacy's `addReasonCode` checks `rcById(code)`
 * (`:15118`) and so does this — but the reason is worth stating: reusing a
 * retired key silently rewrites history, because every record pointing at the
 * old meaning would resolve to the new label.
 */
export async function createReasonCode(
  input: CreateReasonCodeInput,
  signal?: AbortSignal,
): Promise<ReasonCode> {
  if (DATA_SOURCE === 'http') {
    return http.post<ReasonCode>('/policy/reason-codes', input, { signal })
  }
  return mockMutation(POLICY_OPERATIONS.createReasonCode, signal, () => {
    const key = input.key.trim().toUpperCase()
    const details = validateReasonCodeInput(input)
    if (!/^[A-Z][A-Z0-9_]{2,}$/.test(key)) {
      details.push({
        field: 'key',
        code: 'format',
        message: 'Use capitals, digits and underscores, three characters or more',
      })
    }
    if (details.length) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'reason_code_invalid',
        message: 'Fix the fields below',
        details,
        retryable: false,
      })
    }
    if (policyState.reasonCodes.some((code) => code.key === key)) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'reason_code_exists',
        message: `${key} already exists. A key is never reused, not even after it is retired.`,
        retryable: false,
      })
    }

    const created: ReasonCode = {
      key,
      reference: input.reference,
      labels: { ...input.labels },
      surfaces: [...input.surfaces],
      requiresNote: input.requiresNote,
      state: 'active',
      tier: input.tier,
      ownerTeam: input.ownerTeam,
      retiredAt: null,
      supersededByKey: null,
    }
    policyState = { ...policyState, reasonCodes: [...policyState.reasonCodes, created] }
    appendAudit({
      action: 'reasonCode.create',
      subjectType: 'reasonCode',
      subjectId: key,
      amountHalalas: null,
      reasonCode: key,
      note: null,
      detail: { key: 'policy.audit.codeCreated', params: { code: key } },
    })
    return clone(created)
  })
}

/**
 * PUT /api/v1/policy/reason-codes/:key
 *   body: SaveReasonCodeInput
 *   -> ReasonCode
 *
 * Edits the code's presentation and routing. It **cannot** change `key` and it
 * cannot change `state` — retirement is its own operation with its own
 * confirmation, because it is the only edit here that changes what an operator
 * can do tomorrow.
 *
 * A retired code is still editable: a typo in an Arabic label on a code that
 * appears on two years of closed disputes is worth fixing.
 */
export async function saveReasonCode(
  key: string,
  input: SaveReasonCodeInput,
  signal?: AbortSignal,
): Promise<ReasonCode> {
  if (DATA_SOURCE === 'http') {
    return http.put<ReasonCode>(`/policy/reason-codes/${key}`, input, { signal })
  }
  return mockMutation(POLICY_OPERATIONS.saveReasonCode, signal, () => {
    const existing = policyState.reasonCodes.find((code) => code.key === key)
    if (!existing) throw notFound('reason code', key)

    const details = validateReasonCodeInput(input)
    if (details.length) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'reason_code_invalid',
        message: 'Fix the fields below',
        details,
        retryable: false,
      })
    }

    const next: ReasonCode = {
      ...existing,
      reference: input.reference,
      labels: { ...input.labels },
      surfaces: [...input.surfaces],
      requiresNote: input.requiresNote,
      tier: input.tier,
      ownerTeam: input.ownerTeam,
    }
    const changedFields = diffReasonCode(existing, next)
    policyState = {
      ...policyState,
      reasonCodes: policyState.reasonCodes.map((code) => (code.key === key ? next : code)),
    }
    if (changedFields.length > 0) {
      appendAudit({
        action: 'reasonCode.save',
        subjectType: 'reasonCode',
        subjectId: key,
        amountHalalas: null,
        reasonCode: key,
        note: null,
        detail: {
          key: 'policy.audit.codeSaved',
          params: { code: key, count: changedFields.length, fields: changedFields.join(', ') },
        },
      })
    }
    return clone(next)
  })
}

/**
 * POST /api/v1/policy/reason-codes/:key/retire
 *   body: { supersededByKey }
 *   -> ReasonCode
 *   409 when the code is already retired
 *   422 when the named successor does not exist, is itself retired, or is the
 *       code being retired
 *
 * **Retirement removes a code from the picker and from nothing else.** The row
 * stays in the registry, `resolveReasonCode` keeps answering, and every
 * historical record that points at the key keeps rendering its label — in both
 * languages.
 *
 * `supersededByKey` is optional but strongly wanted: legacy's own UI copy says
 * *"deactivate and add a successor"* (`:1793`) and then gave the operator
 * nowhere to write the successor down, so the advice survived only as folklore.
 */
export async function retireReasonCode(
  key: string,
  options: { supersededByKey?: string | null } = {},
  signal?: AbortSignal,
): Promise<ReasonCode> {
  if (DATA_SOURCE === 'http') {
    return http.post<ReasonCode>(`/policy/reason-codes/${key}/retire`, options, { signal })
  }
  return mockMutation(POLICY_OPERATIONS.retireReasonCode, signal, () => {
    const existing = policyState.reasonCodes.find((code) => code.key === key)
    if (!existing) throw notFound('reason code', key)
    if (existing.state === 'retired') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'reason_code_retired',
        message: `${key} is already retired.`,
        retryable: false,
      })
    }

    const successorKey = options.supersededByKey ?? null
    if (successorKey !== null) {
      const successor = policyState.reasonCodes.find((code) => code.key === successorKey)
      if (!successor || successor.state === 'retired' || successorKey === key) {
        throw new ApiError({
          status: 422,
          kind: 'validation',
          code: 'successor_invalid',
          message: 'Choose a code that is still in use',
          details: [
            { field: 'supersededByKey', code: 'invalid', message: 'Choose a code that is still in use' },
          ],
          retryable: false,
        })
      }
    }

    const next: ReasonCode = {
      ...existing,
      state: 'retired',
      retiredAt: EYVAR_NOW,
      supersededByKey: successorKey,
    }
    policyState = {
      ...policyState,
      reasonCodes: policyState.reasonCodes.map((code) => (code.key === key ? next : code)),
    }
    appendAudit({
      action: 'reasonCode.retire',
      subjectType: 'reasonCode',
      subjectId: key,
      amountHalalas: null,
      reasonCode: key,
      note: null,
      detail: {
        key: 'policy.audit.codeRetired',
        params: { code: key, successor: successorKey ?? '' },
      },
    })
    return clone(next)
  })
}

/**
 * POST /api/v1/policy/reason-codes/:key/restore
 *   -> ReasonCode
 *   409 when the code is already active
 *
 * Puts a code back in the picker. **`retiredAt` is not cleared** — it happened,
 * and an audit trail that can be un-happened is not one.
 */
export async function restoreReasonCode(key: string, signal?: AbortSignal): Promise<ReasonCode> {
  if (DATA_SOURCE === 'http') {
    return http.post<ReasonCode>(`/policy/reason-codes/${key}/restore`, {}, { signal })
  }
  return mockMutation(POLICY_OPERATIONS.restoreReasonCode, signal, () => {
    const existing = policyState.reasonCodes.find((code) => code.key === key)
    if (!existing) throw notFound('reason code', key)
    if (existing.state === 'active') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'reason_code_active',
        message: `${key} is already in use.`,
        retryable: false,
      })
    }
    const next: ReasonCode = { ...existing, state: 'active', supersededByKey: null }
    policyState = {
      ...policyState,
      reasonCodes: policyState.reasonCodes.map((code) => (code.key === key ? next : code)),
    }
    appendAudit({
      action: 'reasonCode.restore',
      subjectType: 'reasonCode',
      subjectId: key,
      amountHalalas: null,
      reasonCode: key,
      note: null,
      detail: { key: 'policy.audit.codeRestored', params: { code: key } },
    })
    return clone(next)
  })
}

/* ───────────────────────── QA levers ───────────────────────── */

/**
 * An empty registry, reachable without editing a fixture. The reason-code table
 * has two empties — *no code matches these filters* and *no code is defined* —
 * and only one of them is reachable by typing in the search box.
 */
export function useEmptyReasonCodes(): void {
  policyState = { ...policyState, reasonCodes: [] }
}

/**
 * Every SLA cell overridden — what the screen looked like **after** one legacy
 * save. QA can compare the two treatments side by side without reproducing the
 * defect.
 */
export function useFlattenedSlaPolicy(): void {
  const { sla } = policyState
  policyState = {
    ...policyState,
    sla: {
      ...sla,
      queues: sla.queues.map((queue) => ({
        ...queue,
        tiers: queue.tiers.map((cell) => {
          const tierDefault = sla.tiers.find((each) => each.key === cell.tier)
          return {
            tier: cell.tier,
            firstResponseMinutes:
              cell.firstResponseMinutes ?? tierDefault?.firstResponseMinutes ?? 0,
            resolutionMinutes: cell.resolutionMinutes ?? tierDefault?.resolutionMinutes ?? 0,
          }
        }),
      })),
    },
  }
}

/* ──────────────────────── the diff ──────────────────────── */

/**
 * Every field that moved, as a dotted path. Order is stable — document order,
 * not insertion order — so two saves of the same edit produce the same audit
 * line and a snapshot can diff it.
 */
export function diffPolicy(before: OperationalPolicy, after: OperationalPolicy): string[] {
  const changed: string[] = []

  for (const field of ['initialSearchRadiusMetres', 'searchPhaseTimeoutSeconds', 'maxSurgePercent'] as const) {
    if (before.dispatch[field] !== after.dispatch[field]) changed.push(`dispatch.${field}`)
  }

  for (const field of [
    'maxCaptainDailyDrivingMinutes',
    'maxConcurrentSubscriptionsPerCaptain',
    'maxRiderDailyCancellations',
    'maxConcurrentChatsPerOperator',
  ] as const) {
    if (before.limits[field] !== after.limits[field]) changed.push(`limits.${field}`)
  }

  for (const city of after.cities) {
    const previous = before.cities.find((each) => each.id === city.id)
    if (!previous) {
      changed.push(`cities.${city.id}.added`)
      continue
    }
    for (const field of ['nameEn', 'nameAr', 'quickRidesEnabled', 'subscriptionsEnabled'] as const) {
      if (previous[field] !== city[field]) changed.push(`cities.${city.id}.${field}`)
    }
  }
  for (const city of before.cities) {
    if (!after.cities.some((each) => each.id === city.id)) changed.push(`cities.${city.id}.removed`)
  }

  changed.push(...diffSla(before.sla, after.sla))
  return changed
}

function diffSla(before: SlaPolicy, after: SlaPolicy): string[] {
  const changed: string[] = []

  for (const field of ['atRiskPercent', 'uncodedCeilingPercent'] as const) {
    if (before[field] !== after[field]) changed.push(`sla.${field}`)
  }

  for (const tier of after.tiers) {
    const previous = before.tiers.find((each) => each.key === tier.key)
    if (!previous) continue
    for (const field of [
      'firstResponseMinutes',
      'resolutionMinutes',
      'coverage',
      'pausesOnCustomer',
    ] as const) {
      if (previous[field] !== tier[field]) changed.push(`sla.tiers.${tier.key}.${field}`)
    }
  }

  for (const queue of after.queues) {
    const previous = before.queues.find((each) => each.queueId === queue.queueId)
    if (!previous) continue
    for (const cell of queue.tiers) {
      const previousCell = previous.tiers.find((each) => each.tier === cell.tier)
      if (!previousCell) continue
      /* `null` compares by identity against `null`, so an inherited cell that
         stays inherited never appears here — and an inherited cell that gains a
         number always does, whatever number it is. That asymmetry IS the
         F-014 detector. */
      if (previousCell.firstResponseMinutes !== cell.firstResponseMinutes) {
        changed.push(`sla.queues.${queue.queueId}.${cell.tier}.firstResponseMinutes`)
      }
      if (previousCell.resolutionMinutes !== cell.resolutionMinutes) {
        changed.push(`sla.queues.${queue.queueId}.${cell.tier}.resolutionMinutes`)
      }
    }
    for (const field of ['marksRow', 'reordersQueue', 'escalateToRole'] as const) {
      if (previous.breach[field] !== queue.breach[field]) {
        changed.push(`sla.queues.${queue.queueId}.breach.${field}`)
      }
    }
  }

  return changed
}

function diffReasonCode(before: ReasonCode, after: ReasonCode): string[] {
  const changed: string[] = []
  if (before.labels.en !== after.labels.en) changed.push('labels.en')
  if (before.labels.ar !== after.labels.ar) changed.push('labels.ar')
  if (before.reference !== after.reference) changed.push('reference')
  if (before.requiresNote !== after.requiresNote) changed.push('requiresNote')
  if (before.tier !== after.tier) changed.push('tier')
  if (before.ownerTeam !== after.ownerTeam) changed.push('ownerTeam')
  if (before.surfaces.join(',') !== after.surfaces.join(',')) changed.push('surfaces')
  return changed
}

/* ──────────────────────── validation ──────────────────────── */

function isWholeMinutes(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function validatePolicyInput(input: SaveOperationalPolicyInput): ApiErrorDetail[] {
  const details: ApiErrorDetail[] = []

  const positive = (field: string, value: number, min: number) => {
    if (!Number.isInteger(value) || value < min) {
      details.push({ field, code: 'range', message: `Enter a whole number of ${min} or more` })
    }
  }

  positive('dispatch.initialSearchRadiusMetres', input.dispatch.initialSearchRadiusMetres, 1)
  positive('dispatch.searchPhaseTimeoutSeconds', input.dispatch.searchPhaseTimeoutSeconds, 1)
  positive('dispatch.maxSurgePercent', input.dispatch.maxSurgePercent, 100)
  positive('limits.maxCaptainDailyDrivingMinutes', input.limits.maxCaptainDailyDrivingMinutes, 1)
  positive(
    'limits.maxConcurrentSubscriptionsPerCaptain',
    input.limits.maxConcurrentSubscriptionsPerCaptain,
    1,
  )
  positive('limits.maxRiderDailyCancellations', input.limits.maxRiderDailyCancellations, 0)
  positive('limits.maxConcurrentChatsPerOperator', input.limits.maxConcurrentChatsPerOperator, 1)
  if (input.limits.maxConcurrentChatsPerOperator > CHAT_CAP_MAX) {
    details.push({
      field: 'limits.maxConcurrentChatsPerOperator',
      code: 'range',
      message: `At most ${CHAT_CAP_MAX} chats per operator`,
    })
  }

  const seenCityIds = new Set<string>()
  for (const city of input.cities) {
    if (!city.nameEn.trim()) {
      details.push({ field: `cities.${city.id}.nameEn`, code: 'required', message: 'Enter an English name' })
    }
    if (!city.nameAr.trim()) {
      details.push({ field: `cities.${city.id}.nameAr`, code: 'required', message: 'Enter an Arabic name' })
    }
    if (seenCityIds.has(city.id)) {
      details.push({ field: `cities.${city.id}`, code: 'duplicate', message: 'This city is listed twice' })
    }
    seenCityIds.add(city.id)
  }

  if (!Number.isInteger(input.sla.atRiskPercent) || input.sla.atRiskPercent < 1 || input.sla.atRiskPercent > 99) {
    details.push({ field: 'sla.atRiskPercent', code: 'range', message: 'Enter 1 to 99' })
  }
  if (
    !Number.isInteger(input.sla.uncodedCeilingPercent) ||
    input.sla.uncodedCeilingPercent < 0 ||
    input.sla.uncodedCeilingPercent > 100
  ) {
    details.push({ field: 'sla.uncodedCeilingPercent', code: 'range', message: 'Enter 0 to 100' })
  }

  for (const key of SLA_TIER_KEYS) {
    const tier = input.sla.tiers.find((each) => each.key === key)
    if (!tier) {
      details.push({ field: `sla.tiers.${key}`, code: 'required', message: 'This tier is missing' })
      continue
    }
    if (!isWholeMinutes(tier.firstResponseMinutes)) {
      details.push({
        field: `sla.tiers.${key}.firstResponseMinutes`,
        code: 'range',
        message: 'Enter a whole number of minutes',
      })
    }
    if (!isWholeMinutes(tier.resolutionMinutes) || tier.resolutionMinutes < 1) {
      details.push({
        field: `sla.tiers.${key}.resolutionMinutes`,
        code: 'range',
        message: 'Enter a whole number of minutes',
      })
    }
    if (
      isWholeMinutes(tier.firstResponseMinutes) &&
      isWholeMinutes(tier.resolutionMinutes) &&
      tier.firstResponseMinutes > tier.resolutionMinutes
    ) {
      details.push({
        field: `sla.tiers.${key}.firstResponseMinutes`,
        code: 'order',
        message: 'First response cannot be later than resolution',
      })
    }
  }

  for (const queue of input.sla.queues) {
    details.push(...validateQueueGrid(queue, input.sla))
  }

  return details
}

/**
 * The grid's own shape rules. Two of them exist because a *missing* row and an
 * *inherited* row are different facts and only one of them is legal:
 *
 *   - exactly four cells, one per tier, in `SLA_TIER_KEYS` order;
 *   - each override either `null` or a whole non-negative count of minutes —
 *     `undefined`, `NaN`, `''` and `-1` are all refused rather than coerced,
 *     because every one of them would land in the store as a number and become
 *     an override nobody typed.
 */
function validateQueueGrid(queue: SlaQueuePolicy, sla: SlaPolicy): ApiErrorDetail[] {
  const details: ApiErrorDetail[] = []
  const path = `sla.queues.${queue.queueId}`

  if (queue.tiers.length !== SLA_TIER_KEYS.length) {
    details.push({ field: path, code: 'shape', message: 'Every tier needs a row' })
    return details
  }

  SLA_TIER_KEYS.forEach((key, index) => {
    const cell = queue.tiers[index]
    if (!cell || cell.tier !== key) {
      details.push({ field: `${path}.${key}`, code: 'shape', message: 'Every tier needs a row' })
      return
    }
    for (const field of ['firstResponseMinutes', 'resolutionMinutes'] as const) {
      const value = cell[field]
      if (value !== null && !isWholeMinutes(value)) {
        details.push({
          field: `${path}.${key}.${field}`,
          code: 'range',
          message: 'Enter a whole number of minutes, or leave it inherited',
        })
      }
    }
    const tierDefault = sla.tiers.find((each) => each.key === key)
    const first = cell.firstResponseMinutes ?? tierDefault?.firstResponseMinutes
    const resolution = cell.resolutionMinutes ?? tierDefault?.resolutionMinutes
    if (typeof first === 'number' && typeof resolution === 'number' && first > resolution) {
      details.push({
        field: `${path}.${key}.firstResponseMinutes`,
        code: 'order',
        message: 'First response cannot be later than resolution',
      })
    }
  })

  return details
}

function validateReasonCodeInput(input: SaveReasonCodeInput): ApiErrorDetail[] {
  const details: ApiErrorDetail[] = []
  if (!input.labels.en.trim()) {
    details.push({ field: 'labels.en', code: 'required', message: 'Enter an English label' })
  }
  /* Both languages, always. The legacy registry let `labelAr` be empty and then
     rendered an em dash for it forever (`:15078`). */
  if (!input.labels.ar.trim()) {
    details.push({ field: 'labels.ar', code: 'required', message: 'Enter an Arabic label' })
  }
  if (input.surfaces.length === 0) {
    details.push({ field: 'surfaces', code: 'required', message: 'Choose at least one surface' })
  }
  return details
}
