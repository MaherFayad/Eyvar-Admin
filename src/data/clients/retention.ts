/**
 * Retention schedules — the second card on Admin › Data & Compliance.
 *
 * Built because the screen's `Save retention policy` was
 * `toast.success('Data retention schedules updated')` and nothing else
 * (`AdminDataScreen.tsx:35`), over two `Select`s whose state nothing read. A
 * save that does not save is a worse defect than a missing feature: the
 * operator now believes a number that is not true, and no surface in the
 * product will contradict them.
 *
 * Session-scoped like every other mock mutation, and deterministic — the
 * timestamp is `EYVAR_NOW` and the actor is the session user.
 *
 * **No audit entry yet, and that is recorded rather than skipped.** Legacy
 * writes `logAction('edit_data_window', …)` (`:20520`) and this should too, but
 * `AuditAction` (`types/audit.ts`) is a closed union with no arm for a settings
 * change and that file belongs to another owner. Raised in the handoff:
 * `settings.retention` is the arm this needs.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation } from '../mock/delay'
import type { RetentionPolicy, RetentionPolicyInput } from '../types/retention'
import {
  AUDIT_RETENTION_OPTIONS,
  OPERATIONAL_WINDOW_OPTIONS,
  TELEMETRY_RETENTION_OPTIONS,
} from '../types/retention'
import { http } from './http'
import { currentMockUserId } from './session'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let teamUserFixtures!: Fixtures['teamUserFixtures']
onFixturesLoaded((f) => {
  teamUserFixtures = f.teamUserFixtures
})

export const RETENTION_OPERATIONS = {
  get: 'retention.get',
  save: 'retention.save',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(RETENTION_OPERATIONS))

/**
 * The shipped policy. `730` and `90` are the two values the screen defaulted
 * its `Select`s to, and `13` is `DB.dataWindow.months` (`:20404`) — so nothing
 * an operator sees changes on the day this client lands.
 */
const SEEDED: RetentionPolicy = {
  auditRetentionDays: 730,
  telemetryRetentionDays: 90,
  operationalWindowMonths: 13,
  updatedAt: null,
  updatedByUserId: null,
  updatedByUserName: null,
}

let policy: RetentionPolicy = { ...SEEDED }

export function resetRetention(): void {
  policy = { ...SEEDED }
}

/**
 * GET /api/v1/settings/retention
 *   -> RetentionPolicy
 */
export async function getRetentionPolicy(signal?: AbortSignal): Promise<RetentionPolicy> {
  if (DATA_SOURCE === 'http') {
    return http.get<RetentionPolicy>('/settings/retention', undefined, { signal })
  }
  return mock(RETENTION_OPERATIONS.get, signal, () => ({ ...policy }))
}

/**
 * PUT /api/v1/settings/retention
 *   body: RetentionPolicyInput
 *   -> RetentionPolicy
 *
 * The three values are validated against their closed option sets before
 * anything is written. The type already forbids a stray value at every call
 * site inside this repo; this catches the one caller the type cannot reach —
 * a hand-rolled request in http mode, and a `JSON.parse` in a test.
 */
export async function saveRetentionPolicy(
  input: RetentionPolicyInput,
  signal?: AbortSignal,
): Promise<RetentionPolicy> {
  if (DATA_SOURCE === 'http') {
    return http.put<RetentionPolicy>('/settings/retention', input, { signal })
  }
  return mockMutation(RETENTION_OPERATIONS.save, signal, () => {
    assertOption('auditRetentionDays', input.auditRetentionDays, AUDIT_RETENTION_OPTIONS)
    assertOption('telemetryRetentionDays', input.telemetryRetentionDays, TELEMETRY_RETENTION_OPTIONS)
    assertOption('operationalWindowMonths', input.operationalWindowMonths, OPERATIONAL_WINDOW_OPTIONS)
    const actor = teamUserFixtures.find((u) => u.id === currentMockUserId())
    policy = {
      ...input,
      updatedAt: EYVAR_NOW,
      updatedByUserId: currentMockUserId(),
      updatedByUserName: actor?.name ?? currentMockUserId(),
    }
    return { ...policy }
  })
}

function assertOption(field: string, value: number, allowed: readonly number[]): void {
  if (!allowed.includes(value)) {
    throw new Error(`${field} must be one of ${allowed.join(', ')}; got ${value}`)
  }
}
