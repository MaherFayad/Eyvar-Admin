/**
 * The operator lifecycle, and **F-016**.
 *
 * ## What the F-016 test has to prove, and what a careless one proves instead
 *
 * The invariant is *"the last active holder of `manage_team` cannot be stripped
 * of it, suspended, or removed."* The seeded roster has exactly one holder —
 * `USR-1` — so the refusal is reachable with no fixture edit at all.
 *
 * **That is also the trap.** A test that only asserts *"these three calls
 * reject"* passes against a client that rejects unconditionally, against one
 * that rejects `USR-1` by id, and against one that has thrown for an unrelated
 * reason. Three things are therefore asserted, not one:
 *
 *   1. **All three transitions refuse**, and the refusal **names the rule** —
 *      the code is `last_manage_team_holder` and the message says F-016.
 *   2. **Nothing moved.** After each refusal the roster is byte-identical: the
 *      operator is still `Active` and still holds the key. A guard that threw
 *      *after* mutating would pass (1) and fail here.
 *   3. **The same three calls SUCCEED with two holders.** `useTwoManageTeamHolders()`
 *      grants the key to `USR-5` and nothing else changes. This is the
 *      falsification: it is the *count*, not the id and not the operation, that
 *      causes the refusal. Without this case the suite cannot distinguish the
 *      guard from a hard-coded `if (id === 'USR-1') throw`, which is exactly
 *      what the old screen had at `AdminTeamScreen.tsx:225`.
 *
 * ## Why this is a client test and not a screen test
 *
 * The rule is enforced in the client because a rule that lives in a component
 * is a rule the next surface forgets. `setOperatorPermissions` proves the
 * point: **no screen in the product edits a permission set yet**, so a
 * UI-side guard would have shipped a hole and nobody would have found it until
 * P6-T6 built the matrix. The client refuses it today.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { auditLogSize, listAuditEntries, resetAudit } from './audit'
import {
  inviteOperator,
  listInvites,
  listOperators,
  manageTeamHolderCount,
  offboardOperator,
  permissionsForRole,
  reinstateOperator,
  resendInvite,
  resetTeam,
  revokeInvite,
  setOperatorPermissions,
  suspendOperator,
  transitionRefusal,
  useTwoManageTeamHolders,
} from './team'
import { getOnCallRota, updateOnCallRota } from './team'
import { isApiError, type ApiError } from '../types/common'
import { ROLE_PERMISSIONS } from '../types/session'
import type { TeamUser } from '../types/session'

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
  resetTeam()
  resetAudit()
})

async function roster(): Promise<TeamUser[]> {
  return (await listOperators({ pageSize: 100 })).items
}

async function find(id: string): Promise<TeamUser> {
  const found = (await roster()).find((u) => u.id === id)
  if (!found) throw new Error(`No operator ${id}`)
  return found
}

/** The refusal, or a failure naming what resolved instead. */
async function refusalOf(work: Promise<unknown>): Promise<ApiError> {
  try {
    await work
  } catch (thrown) {
    if (isApiError(thrown)) return thrown
    throw thrown
  }
  throw new Error('Expected a refusal; the call resolved.')
}

/* ────────────────────────────── F-016 ─────────────────────────────────── */

describe('F-016 — the last `manage_team` holder', () => {
  it('the seeded roster has exactly one holder, so the invariant is live with no fixture edit', async () => {
    expect(manageTeamHolderCount(await roster())).toBe(1)
    expect((await find('USR-1')).permissions).toContain('manage_team')
  })

  it('refuses all three transitions, and the reason names the rule', async () => {
    const suspend = await refusalOf(suspendOperator('USR-1', 'because'))
    const offboard = await refusalOf(offboardOperator('USR-1', 'because'))
    /* The *stripped of it* clause: every permission except `manage_team`. */
    const strip = await refusalOf(
      setOperatorPermissions(
        'USR-1',
        (await find('USR-1')).permissions.filter((key) => key !== 'manage_team'),
      ),
    )

    for (const refusal of [suspend, offboard, strip]) {
      expect(refusal.code).toBe('last_manage_team_holder')
      expect(refusal.status).toBe(409)
      expect(refusal.retryable).toBe(false)
      /* Names the rule, not just the symptom. */
      expect(refusal.message).toContain('manage_team')
      expect(refusal.message).toContain('F-016')
    }
  })

  it('leaves the roster untouched after each refusal', async () => {
    const before = await roster()

    await refusalOf(suspendOperator('USR-1', 'because'))
    expect(await roster()).toStrictEqual(before)

    await refusalOf(offboardOperator('USR-1', 'because'))
    expect(await roster()).toStrictEqual(before)

    await refusalOf(setOperatorPermissions('USR-1', ['view_profiles']))
    expect(await roster()).toStrictEqual(before)

    const owner = await find('USR-1')
    expect(owner.status).toBe('Active')
    expect(owner.permissions).toContain('manage_team')
  })

  it('writes no audit entry for a refused transition', async () => {
    await refusalOf(suspendOperator('USR-1', 'because'))
    await refusalOf(offboardOperator('USR-1', 'because'))
    await refusalOf(setOperatorPermissions('USR-1', ['view_profiles']))
    /* A refusal is not an act. An audit log that records attempts as if they
       were changes is a log that cannot be read. */
    expect(auditLogSize()).toBe(0)
  })

  /**
   * **The falsification.** Same three calls, same operator, one more holder.
   * If any of these still refused, the guard would be about the id or about
   * the operation rather than about the count — which is the bug the old
   * screen's `user.id !== 'USR-1'` actually was.
   */
  it('permits all three once a second operator holds the key', async () => {
    useTwoManageTeamHolders()
    expect(manageTeamHolderCount(await roster())).toBe(2)

    await expect(setOperatorPermissions('USR-1', ['view_profiles'])).resolves.toMatchObject({
      id: 'USR-1',
    })
    /* Stripping the key leaves USR-5 as the only holder; suspending USR-1 is
       now unguarded because USR-1 is no longer a holder at all. */
    await expect(suspendOperator('USR-1', 'handing over')).resolves.toMatchObject({
      status: 'Suspended',
    })
    await expect(reinstateOperator('USR-1')).resolves.toMatchObject({ status: 'Active' })
    await expect(offboardOperator('USR-1', 'left the company')).resolves.toEqual({
      offboarded: true,
    })
    expect((await roster()).some((u) => u.id === 'USR-1')).toBe(false)
  })

  it('protects whoever the last holder is, not `USR-1` specifically', async () => {
    useTwoManageTeamHolders()
    /* Remove the original holder entirely. `USR-5` is now the last one. */
    await setOperatorPermissions('USR-1', ['view_profiles'])
    expect(manageTeamHolderCount(await roster())).toBe(1)

    const refusal = await refusalOf(suspendOperator('USR-5', 'because'))
    expect(refusal.code).toBe('last_manage_team_holder')
    /* And the ex-holder is now suspendable, which the id-based guard could
       never have expressed. */
    await expect(suspendOperator('USR-1', 'because')).resolves.toMatchObject({
      status: 'Suspended',
    })
  })

  it('does not count an invited or suspended operator as a holder', async () => {
    useTwoManageTeamHolders()
    await suspendOperator('USR-5', 'on leave')
    /* USR-5 holds the key on paper and cannot sign in, so USR-1 is the last
       WORKING administrator and stays protected. */
    expect(manageTeamHolderCount(await roster())).toBe(1)
    expect((await refusalOf(suspendOperator('USR-1', 'because'))).code).toBe(
      'last_manage_team_holder',
    )
  })

  /**
   * The predicate the screen renders from is the predicate the client refuses
   * with — same function, same answer. This is what stops D9's divergence:
   * a row kebab that disagreed with the mutation behind it.
   */
  it('answers the surface with the same code it would throw', async () => {
    const users = await roster()
    const owner = users.find((u) => u.id === 'USR-1')!
    expect(transitionRefusal(users, owner, 'suspend')).toBe('last_manage_team_holder')
    expect(transitionRefusal(users, owner, 'offboard')).toBe('last_manage_team_holder')
    expect(transitionRefusal(users, owner, 'permissions', ['view_profiles'])).toBe(
      'last_manage_team_holder',
    )
    /* A permission change that KEEPS the key is not a strip. */
    expect(transitionRefusal(users, owner, 'permissions', ['manage_team'])).toBeNull()
    expect(transitionRefusal(users, owner, 'reinstate')).toBe('not_suspended')
  })
})

/* ───────────────────────── the six transitions ─────────────────────────── */

describe('the lifecycle', () => {
  it('invites an operator with a minted id, not one derived from the array length', async () => {
    const created = await inviteOperator({
      name: 'Rana Al-Harbi',
      email: 'rana@eyvar.com',
      phone: null,
      role: 'Support',
      compensationCapHalalas: 10_000,
    })
    /* `USR-901`, not `USR-6`. The old screen minted `USR-${users.length + 1}`,
       which collides the moment anyone is offboarded. */
    expect(created.id).toBe('USR-901')
    expect(created.status).toBe('Invited')
    expect(created.lastLoginAt).toBeNull()
    expect(created.secondFactor).toBeNull()
    /**
     * **Permissions come from D17's role baseline, not from a seeded exemplar.**
     *
     * This used to assert the three keys the seeded Support operators carry,
     * which was right while the baselines were unwritten and wrong the moment a
     * role had no holder — `Dispatcher` and `Trust & Safety` have none, and
     * reading an exemplar would have handed the first one invited an empty
     * permission set, which is the legacy defect D17 names by line number.
     */
    expect(created.permissions).toEqual([...ROLE_PERMISSIONS.Support])

    /* Asserted against the constant AND spelled out, so a silent edit to the
       baseline fails here rather than agreeing with itself. */
    expect(created.permissions).toEqual([
      'view_operations',
      'view_support',
      'view_profiles',
      'manage_tickets',
      'contact_users',
    ])

    /* The same is true of a role with no seeded holder, which is the case the
       old implementation got wrong. */
    expect(permissionsForRole('Dispatcher')).toEqual([
      'view_operations',
      'view_profiles',
      'live_ops',
      'contact_users',
    ])

    /* And it is on the roster the screen reads, not in a component array. */
    expect((await roster()).some((u) => u.id === 'USR-901')).toBe(true)
    expect((await listInvites()).some((i) => i.userId === 'USR-901')).toBe(true)
  })

  it('mints a distinct id for a second invite even after the first is offboarded', async () => {
    const first = await inviteOperator({
      name: 'A',
      email: 'a@eyvar.com',
      phone: null,
      role: 'Support',
      compensationCapHalalas: null,
    })
    await revokeInvite(first.id)
    const second = await inviteOperator({
      name: 'B',
      email: 'b@eyvar.com',
      phone: null,
      role: 'Support',
      compensationCapHalalas: null,
    })
    expect(second.id).not.toBe(first.id)
  })

  it('refuses a duplicate email rather than creating a second record', async () => {
    const refusal = await refusalOf(
      inviteOperator({
        name: 'Someone Else',
        email: 'SARAH@eyvar.com',
        phone: null,
        role: 'Support',
        compensationCapHalalas: null,
      }),
    )
    expect(refusal.code).toBe('email_taken')
    expect((await roster()).length).toBe(5)
  })

  it('resends and revokes an invitation, and refuses both on an operator who has signed in', async () => {
    /* `USR-4` is seeded `Invited` and has never signed in. */
    const resent = await resendInvite('USR-4')
    expect(resent.resendCount).toBe(1)

    await revokeInvite('USR-4')
    expect((await roster()).some((u) => u.id === 'USR-4')).toBe(false)

    expect((await refusalOf(resendInvite('USR-3'))).code).toBe('not_invited')
    expect((await refusalOf(revokeInvite('USR-3'))).code).toBe('not_invited')
  })

  it('suspends and reinstates, and refuses each in the wrong state', async () => {
    await expect(suspendOperator('USR-3', 'under review')).resolves.toMatchObject({
      status: 'Suspended',
    })
    expect((await refusalOf(suspendOperator('USR-3', 'again'))).code).toBe('not_active')

    await expect(reinstateOperator('USR-3')).resolves.toMatchObject({ status: 'Active' })
    expect((await refusalOf(reinstateOperator('USR-3'))).code).toBe('not_suspended')
  })

  it('offboards, and takes the operator off the rota in the same act', async () => {
    /* `USR-5` is seeded as the primary on call. Offboarding them without
       repairing the rota would leave it pointing at a record that is gone. */
    expect((await getOnCallRota()).primaryUserId).toBe('USR-5')
    await offboardOperator('USR-5', 'left the company')
    expect((await getOnCallRota()).primaryUserId).toBeNull()
    expect((await roster()).some((u) => u.id === 'USR-5')).toBe(false)
  })
})

/* ──────────────────────────── the audit trail ──────────────────────────── */

describe('every transition writes one audit entry naming who did what to whom', () => {
  it('writes exactly one entry per transition, with the operator as the subject', async () => {
    const before = auditLogSize()

    await inviteOperator({
      name: 'Rana Al-Harbi',
      email: 'rana@eyvar.com',
      phone: null,
      role: 'Support',
      compensationCapHalalas: null,
    })
    await resendInvite('USR-901')
    await revokeInvite('USR-901')
    await suspendOperator('USR-3', 'under review')
    await reinstateOperator('USR-3')
    await offboardOperator('USR-3', 'left the company')

    expect(auditLogSize() - before).toBe(6)

    const entries = (await listAuditEntries({ pageSize: 50 })).items
    expect(entries.map((e) => e.action)).toEqual([
      'team.offboard',
      'team.reinstate',
      'team.suspend',
      'team.inviteRevoke',
      'team.inviteResend',
      'team.invite',
    ])
    /* Who did it — the acting session user — and to whom. */
    expect(entries.every((e) => e.actorId === 'USR-1')).toBe(true)
    expect(entries.every((e) => e.actorName === 'Sarah Al-Rashid')).toBe(true)
    expect(entries.every((e) => e.subjectType === 'operator')).toBe(true)
    /* None of them moves money, and `null` is not zero. */
    expect(entries.every((e) => e.amountHalalas === null)).toBe(true)
  })

  it('carries the stated reason onto the entry for the two transitions that require one', async () => {
    await suspendOperator('USR-3', 'repeated policy breach')
    const suspend = (await listAuditEntries({ action: 'team.suspend' })).items[0]
    expect(suspend?.note).toBe('repeated policy breach')

    await offboardOperator('USR-3', 'resigned 30 June')
    const offboard = (await listAuditEntries({ action: 'team.offboard' })).items[0]
    expect(offboard?.note).toBe('resigned 30 June')
  })

  it('records the rota change, and refuses a rota naming an operator who cannot sign in', async () => {
    await suspendOperator('USR-3', 'under review')
    const refusal = await refusalOf(
      updateOnCallRota({ primaryUserId: 'USR-3', secondaryUserId: null }),
    )
    expect(refusal.code).toBe('not_active')

    await updateOnCallRota({ primaryUserId: 'USR-5', secondaryUserId: null })
    expect((await listAuditEntries({ action: 'team.rota' })).items).toHaveLength(1)
  })
})

/* ────────────────────────────── the seam ──────────────────────────────── */

describe('the seam holds for every new operation', () => {
  const operations: Array<{ op: string; call: () => Promise<unknown> }> = [
    { op: 'team.list', call: () => listOperators() },
    { op: 'team.invite', call: () => inviteOperator({ name: 'X', email: 'x@eyvar.com', phone: null, role: 'Support', compensationCapHalalas: null }) },
    { op: 'team.resendInvite', call: () => resendInvite('USR-4') },
    { op: 'team.suspend', call: () => suspendOperator('USR-3', 'r') },
    { op: 'team.rota', call: () => getOnCallRota() },
  ]

  it.each(operations)('$op returns a Promise and can be made to fail', async ({ op, call }) => {
    const result = call()
    expect(result).toBeInstanceOf(Promise)
    await result

    resetTeam()
    mockFailures.always(op)
    await expect(call()).rejects.toSatisfy(isApiError)
    mockFailures.clear(op)
  })

  it('is deterministic — two identical runs produce identical ids and timestamps', async () => {
    const first = await inviteOperator({
      name: 'Rana',
      email: 'rana@eyvar.com',
      phone: null,
      role: 'Support',
      compensationCapHalalas: null,
    })
    resetTeam()
    const second = await inviteOperator({
      name: 'Rana',
      email: 'rana@eyvar.com',
      phone: null,
      role: 'Support',
      compensationCapHalalas: null,
    })
    expect(second).toStrictEqual(first)
  })
})
