/**
 * The workspace security policy — **D20**'s *Security policy* pane on Admin ›
 * Team & Access, and the client D20 names for it.
 *
 * ## What this replaces
 *
 * Three controls at `AdminTeamScreen.tsx:315`, `:321` and `:335` — mandatory
 * second factor, idle timeout, absolute expiry — each a `useState` seeded with
 * a literal, and **no save control anywhere on that screen persisted any of
 * them**. An operator could set a session timeout and the console forgot it on
 * the next navigation.
 *
 * ## The write key it will need, and the one it uses today
 *
 * D20 gates this pane on **`manage_security_policy`**, which **does not exist
 * yet** — it is one of D17's eight minted keys and another agent is landing
 * that union. Until it lands the surface gates on `manage_team`, and that is
 * recorded here rather than in a component comment nobody greps: **this is
 * Q-78 / AC-663 and the pane closes them the day the key exists.**
 *
 * ## Why it is a client of its own rather than three fields on `team.ts`
 *
 * Because it has a different permission. D20 puts every other Team & Access
 * pane behind `manage_team` and this one behind `manage_security_policy`, and a
 * client that mixes two authorities is a client whose http branch cannot be
 * gated at the route. Splitting it now costs one file; splitting it after the
 * key lands costs a migration of every caller.
 *
 * ## `idleTimeoutMinutes` has a consumer waiting for it
 *
 * `shell/session.ts:75` hardcodes `DEFAULT_IDLE_TIMEOUT_MINUTES = 30` and the
 * shell expires a session against that constant. The seed below **is** 30, so
 * wiring the shell to read this field is a no-op change rather than a silent
 * behaviour change. The bounds are `shell/session.ts`'s own clamp (5…240),
 * restated as numbers rather than imported: `src/data/` does not import from
 * `src/shell/`, and this 422 is what catches the day the clamp moves.
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation } from '../mock/delay'
import { ApiError } from '../types/common'
import type { SecurityPolicy } from '../types/team'
import { appendAudit } from './audit'
import { http } from './http'

export const SECURITY_POLICY_OPERATIONS = {
  get: 'securityPolicy.get',
  update: 'securityPolicy.update',
} as const

/** `shell/session.ts` — `MIN_IDLE_TIMEOUT_MINUTES` / `MAX_IDLE_TIMEOUT_MINUTES`. */
export const MIN_IDLE_TIMEOUT_MINUTES = 5
export const MAX_IDLE_TIMEOUT_MINUTES = 240

const SEED: SecurityPolicy = {
  /* §4.2 — the workspace requirement survives; the per-user `twoFA` toggle
     (`:3047`) and the workspace `require2FA` switch (`:8028`) are both retired
     and neither is rebuilt. Three of the five seeded operators have
     `secondFactor: null`, which under this policy is *enrolment owed at next
     sign-in*, not *opted out*. */
  requireSecondFactor: true,
  idleTimeoutMinutes: 30,
  absoluteExpiryHours: 12,
  updatedAt: null,
  updatedBy: null,
}

let policy: SecurityPolicy = { ...SEED }

export function resetSecurityPolicy(): void {
  policy = { ...SEED }
}

/**
 * GET /api/v1/security-policy
 *   -> SecurityPolicy
 */
export async function getSecurityPolicy(signal?: AbortSignal): Promise<SecurityPolicy> {
  if (DATA_SOURCE === 'http') {
    return http.get<SecurityPolicy>('/security-policy', undefined, { signal })
  }
  return mock(SECURITY_POLICY_OPERATIONS.get, signal, () => ({ ...policy }))
}

/**
 * PATCH /api/v1/security-policy
 *   body: Partial<SecurityPolicy>
 *   -> SecurityPolicy
 *
 * **AC-950** — one audit entry naming the pane and what changed. The entry
 * carries the resulting values rather than a diff object, because the audit
 * table renders one line and a diff needs a detail surface that does not exist.
 */
export async function updateSecurityPolicy(
  patch: Partial<Omit<SecurityPolicy, 'updatedAt' | 'updatedBy'>>,
  signal?: AbortSignal,
): Promise<SecurityPolicy> {
  if (DATA_SOURCE === 'http') {
    return http.patch<SecurityPolicy>('/security-policy', patch, { signal })
  }
  return mockMutation(SECURITY_POLICY_OPERATIONS.update, signal, () => {
    const idle = patch.idleTimeoutMinutes ?? policy.idleTimeoutMinutes
    if (idle < MIN_IDLE_TIMEOUT_MINUTES || idle > MAX_IDLE_TIMEOUT_MINUTES) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'idle_timeout_out_of_range',
        message: `Idle timeout must be between ${MIN_IDLE_TIMEOUT_MINUTES} and ${MAX_IDLE_TIMEOUT_MINUTES} minutes`,
        details: [
          {
            field: 'idleTimeoutMinutes',
            code: 'out_of_range',
            message: 'Between 5 and 240 minutes.',
          },
        ],
        retryable: false,
      })
    }
    const before = policy
    policy = { ...policy, ...patch, updatedAt: EYVAR_NOW, updatedBy: 'USR-1' }
    appendAudit({
      action: 'team.securityPolicy',
      subjectType: 'workspace',
      subjectId: 'security-policy',
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: {
        key: 'admin.audit.team.securityPolicy',
        params: {
          idleMinutes: policy.idleTimeoutMinutes,
          expiryHours: policy.absoluteExpiryHours,
          twoFactor: String(policy.requireSecondFactor !== before.requireSecondFactor),
        },
      },
    })
    return { ...policy }
  })
}
