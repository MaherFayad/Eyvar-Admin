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
  suspendOperator,
  transitionRefusal,
  useTwoManageTeamHolders,
} from './team'
import { getInvite, getOnCallRota, listOperatorSessions, revokeOperatorSession, updateOnCallRota } from './team'
import { listEmailDeliveries, resetEmails } from './emails'
import { activateInvite, validateResetToken } from './auth'
import { EYVAR_NOW } from '../mock/clock'
import { claimTicket, getTicket, resetTickets } from './tickets'
import { getOperationalPolicy, resetPolicy, saveOperationalPolicy } from './policy'
import { capForRole, releaseHoldingsOf } from './team'
import { resetAuditToSeed, auditLogSize as logSize } from './audit'
import { resetAuth } from './auth'
import { setPermissionDelta } from './rbac'
import { resetMockSession, switchMockUser } from './session'
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
      setPermissionDelta('USR-1', { granted: [], revoked: ['manage_team'] }),
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

    await refusalOf(setPermissionDelta('USR-1', { granted: [], revoked: ['manage_team'] }))
    expect(await roster()).toStrictEqual(before)

    const owner = await find('USR-1')
    expect(owner.status).toBe('Active')
    expect(owner.permissions).toContain('manage_team')
  })

  it('writes no audit entry for a refused transition', async () => {
    await refusalOf(suspendOperator('USR-1', 'because'))
    await refusalOf(offboardOperator('USR-1', 'because'))
    await refusalOf(setPermissionDelta('USR-1', { granted: [], revoked: ['manage_team'] }))
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

    await expect(setPermissionDelta('USR-1', { granted: [], revoked: ['manage_team'] })).resolves.toMatchObject({
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
    await setPermissionDelta('USR-1', { granted: [], revoked: ['manage_team'] })
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
    expect((await roster()).length).toBe(7)
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

describe('sessions and devices (D20): a colleague’s sessions under manage_team', () => {
  beforeEach(() => {
    resetAuth()
    resetMockSession()
  })

  it('lets the Owner list and end a colleague’s session, and audits it', async () => {
    const before = await listOperatorSessions('USR-5')
    expect(before.canRevoke).toBe(true)
    expect(before.refusal).toBeNull()
    expect(before.items.length).toBeGreaterThan(0)
    const audits = auditLogSize()

    await revokeOperatorSession('USR-5', before.items[0]!.id)

    const after = await listOperatorSessions('USR-5')
    expect(after.items.length).toBe(before.items.length - 1)
    expect(auditLogSize()).toBe(audits + 1)
    expect((await listAuditEntries({ page: 1, pageSize: 1 })).items[0]?.action).toBe('team.sessionRevoke')
  })

  it('refuses a colleague’s list to an operator without manage_team, and still allows their own', async () => {
    await switchMockUser('USR-3')
    const theirs = await listOperatorSessions('USR-5')
    expect(theirs.canRevoke).toBe(false)
    expect(theirs.refusal).toBe('no_manage_team')

    const own = await listOperatorSessions('USR-3')
    expect(own.canRevoke).toBe(true)
    expect(own.refusal).toBeNull()
  })
})

describe('the invitation is a link and an email (T3.1 to T3.3)', () => {
  beforeEach(() => {
    resetEmails()
    resetAuth()
  })

  it('mints a token, records a `team.invite` send on the outbox, and the link activates the account', async () => {
    const created = await inviteOperator({
      name: 'Rana Al-Harbi',
      email: 'rana@eyvar.com',
      phone: null,
      role: 'Support',
      compensationCapHalalas: null,
    })
    const invite = await getInvite(created.id)
    expect(invite.token).toMatch(/^INV-/)

    const outbox = await listEmailDeliveries({ view: 'outbox', pageSize: 5 })
    expect(outbox.items[0]).toMatchObject({ recipient: 'rana@eyvar.com', templateKey: 'team.invite', state: 'queued' })

    expect(await validateResetToken(invite.token)).toMatchObject({ state: 'valid', purpose: 'invite', role: 'Support' })
    await expect(activateInvite({ token: invite.token, password: 'Long-enough-passphrase-9' })).resolves.toMatchObject({
      kind: 'reset',
    })
    const activated = (await roster()).find((u) => u.id === created.id)
    expect(activated?.status).toBe('Active')
    expect(activated?.lastLoginAt).toBe(EYVAR_NOW)
    expect((await validateResetToken(invite.token)).state).toBe('unknown')
  })

  it('renews the expiry on resend, keeps the token, and records a second send', async () => {
    const before = await getInvite('USR-4')
    const outboxBefore = (await listEmailDeliveries({ view: 'outbox', pageSize: 200 })).total
    const renewed = await resendInvite('USR-4')
    expect(renewed.token).toBe(before.token)
    expect(Date.parse(renewed.expiresAt)).toBeGreaterThan(Date.parse(before.expiresAt))
    expect((await listEmailDeliveries({ view: 'outbox', pageSize: 200 })).total).toBe(outboxBefore + 1)
  })

  it('refuses an expired invitation at the door, with the expiry named', async () => {
    const created = await inviteOperator({
      name: 'Late Joiner',
      email: 'late@eyvar.com',
      phone: null,
      role: 'Support',
      compensationCapHalalas: null,
    })
    const invite = await getInvite(created.id)
    /* Age the invitation past its life through the store the client reads. */
    const { getInvites, setInvites } = await import('./rosterStore')
    setInvites(getInvites().map((i) => (i.token === invite.token ? { ...i, expiresAt: '2026-06-01T00:00:00+03:00' } : i)))
    expect((await validateResetToken(invite.token)).state).toBe('expired')
    await expect(activateInvite({ token: invite.token, password: 'Long-enough-passphrase-9' })).resolves.toMatchObject({
      kind: 'failed',
      reason: 'expired',
    })
    expect((await roster()).find((u) => u.id === created.id)?.status).toBe('Invited')
  })
})

/* ─────────────────────── T6.4: the handover on suspend ────────────────── */

describe('T6.4 — what a suspended or offboarded operator held returns to Unassigned', () => {
  beforeEach(() => {
    resetTickets()
  })

  it('releases the claim in the same act, and the audit entry names the count', async () => {
    await claimTicket('TKT-501', 'USR-3', 'Lina')
    expect((await getTicket('TKT-501')).ownerId).toBe('USR-3')

    await suspendOperator('USR-3', 'on leave')

    expect((await getTicket('TKT-501')).ownerId).toBeNull()
    /* The seed already has Lina holding work; the count is everything she held. */
    const entry = (await listAuditEntries({ action: 'team.suspend' })).items[0]
    expect(entry?.detail.params?.released).toBeGreaterThanOrEqual(1)
  })

  it('releases on offboarding too, and reports zero for an operator holding nothing', async () => {
    await useTwoManageTeamHolders()
    await claimTicket('TKT-502', 'USR-5', 'Yousef', { takeOver: true })
    await offboardOperator('USR-5', 'left the company')
    expect((await getTicket('TKT-502')).ownerId).toBeNull()
    /* An operator who holds nothing releases nothing. */
    const fresh = await inviteOperator({
      name: 'Holds Nothing',
      email: 'nothing@eyvar.com',
      phone: null,
      role: 'Support',
      compensationCapHalalas: null,
    })
    expect(await releaseHoldingsOf(fresh.id)).toBe(0)
  })
})

/* ─────────────────────── T2.6: the cap default is policy ──────────────── */

describe('T2.6 — the compensation cap default comes from the Limits pane', () => {
  beforeEach(() => {
    resetPolicy()
  })

  it('reads the role default from the policy document and follows a saved change', async () => {
    expect(capForRole('Dispatcher')).toBe(50_00)
    expect(capForRole('Owner')).toBeNull()

    const policy = await getOperationalPolicy()
    await saveOperationalPolicy({
      dispatch: policy.dispatch,
      cities: policy.cities.map(({ activeCaptains: _derived, ...city }) => ({ ...city })),
      sla: policy.sla,
      limits: {
        ...policy.limits,
        compensationCapHalalasByRole: { ...policy.limits.compensationCapHalalasByRole, Dispatcher: 75_00 },
      },
    })
    expect(capForRole('Dispatcher')).toBe(75_00)
  })
})

/* ─────────────────────── T7.6: the log the app boots with ─────────────── */

describe('T7.6 — the Activity Log opens on the seeded history', () => {
  it('boots with the roster\'s own entries, and a reset empties them for tests', async () => {
    resetAuditToSeed()
    expect(await logSize()).toBe(4)
    resetAudit()
    expect(await logSize()).toBe(0)
  })
})
