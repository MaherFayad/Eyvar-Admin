/**
 * **Who is acting.** One question, and until this file existed the data layer
 * had two answers for it.
 *
 * Twenty clients resolved the actor against `fixtures/teamUsers.CURRENT_USER_ID`
 * — a module constant frozen at `USR-1` — and eight against
 * `session.currentMockUserId()`. The halves met inside a single operation and
 * disagreed: `nextClaim` (`clients/requests.ts`, imported by five wave-2 queues
 * and by `conversations.ts`) **wrote** `ownerId: CURRENT_USER_ID`, while the
 * `mine` and `heldByMe` views **read** ownership off the session. So a claim
 * made after `switchMockUser('USR-3')` landed on `USR-1`, and the operator who
 * made it never saw it in their own queue.
 *
 * That is not a cosmetic split. `switchMockUser` is the only instrument the
 * role tests have — D17 gates 20 permission keys across 35 route rows on the
 * signed-in role, and D22 exempts `Owner` from the concurrent-chat cap while
 * the only seeded operator *is* an `Owner`. A client that cannot see a user
 * switch cannot be exercised for any role but the seeded one.
 *
 * **Every assertion here comes in a pair.** The negative half — "the other
 * operator does not see it" — passes vacuously against a `mine` view that is
 * simply always empty, which is a failure mode this codebase has shipped before
 * and written up in `DECISIONS.md`. The positive twin beside it is what stops
 * that.
 *
 * The rule these tests fix in place:
 *
 *   - *"who is acting right now"* → `currentMockUserId()`
 *   - *"who is the seeded default"* → `CURRENT_USER_ID`
 *   - **would a `switchMockUser` make this answer wrong?** → then it is the
 *     first, and §5 below refuses the second anywhere it could be the first.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { isApiError } from '../types/common'
import { appendAudit, listAuditEntries, resetAudit } from './audit'
import { claimConversation, getConversation, listConversations, resetConversations } from './conversations'
import { nextClaim } from './requests'
import { currentMockUserId, resetMockSession, switchMockUser } from './session'
import { checkAdjustmentAuthority, resetWallets } from './wallets'

/** The seeded default. An `Owner`, which is why D22's cap never fires on it. */
const OWNER = 'USR-1'
const OWNER_NAME = 'Sarah Al-Rashid'

/** `Support`, three permissions, a 75 SAR compensation ceiling. Reached only by switching. */
const SUPPORT = 'USR-3'
const SUPPORT_NAME = 'Lina Al-Otaibi'

const ALL = { pageSize: 200 } as const

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
  resetMockSession()
  resetConversations()
  resetWallets()
  resetAudit()
})

/** The ids in the signed-in operator's own queue, right now. */
async function mine(): Promise<string[]> {
  const page = await listConversations({ ...ALL, view: 'mine' })
  return page.items.map((c) => c.id)
}

/**
 * An unheld, unclosed conversation — **asked for, never hard-coded.** Pinning
 * `CNV-107` here would fail the day the fixtures are re-seeded for a reason
 * that has nothing to do with identity.
 */
async function anUnheldConversation(): Promise<string> {
  const page = await listConversations({ ...ALL, view: 'unassigned' })
  expect(page.items.length, 'the seed must leave something unclaimed to claim').toBeGreaterThan(0)
  return page.items[0]!.id
}

/* ───────────── 1 — the claim and the queue agree about the owner ───────────── */

describe('1 — a claim belongs to the operator who made it', () => {
  /**
   * **The headline, and both halves of it in one render.**
   *
   * Claim as `USR-3`, and `USR-3` sees it. Switch to `USR-1`, and `USR-1` does
   * not. Switch back, and it is still there — which is the assertion that
   * distinguishes *"ownership moved with the session"* from *"the row was
   * dropped, released or filtered out by something else entirely"*.
   *
   * Before the fix the first expectation failed outright: `nextClaim` stamped
   * `USR-1`, so `USR-3`'s `mine` came back without the row it had just claimed,
   * and `USR-1`'s came back with it.
   */
  it('shows in the claimant’s queue, is absent from the other operator’s, and survives switching back', async () => {
    await switchMockUser(SUPPORT)
    const id = await anUnheldConversation()
    await claimConversation(id)

    /* The positive half. Without it the negative half below passes against a
       `mine` view that returns nothing at all. */
    expect(await mine(), 'the claimant must see their own claim').toContain(id)

    await switchMockUser(OWNER)
    expect(await mine(), 'another operator must not see it').not.toContain(id)

    await switchMockUser(SUPPORT)
    expect(await mine(), 'it did not vanish — it belongs to USR-3').toContain(id)
  })

  /** The row itself carries the claimant, not the seeded default. */
  it('stamps the claimant on the record, by id and by name', async () => {
    await switchMockUser(SUPPORT)
    const id = await anUnheldConversation()
    await claimConversation(id)

    const row = await getConversation(id)
    expect(row.claim?.ownerId).toBe(SUPPORT)
    expect(row.claim?.ownerName).toBe(SUPPORT_NAME)
  })

  /**
   * **The mirror.** The same sequence signed in as the seeded `Owner`, which is
   * the case that passed before the fix *by accident* — the constant happened
   * to be `USR-1`. Keeping it means a regression that re-freezes ownership at
   * `USR-1` fails the test above while this one still passes, so the failure
   * message points at identity rather than at claiming being broken.
   */
  it('works the same way when the claimant is the seeded operator', async () => {
    expect(currentMockUserId()).toBe(OWNER)
    const id = await anUnheldConversation()
    await claimConversation(id)

    expect(await mine()).toContain(id)

    await switchMockUser(SUPPORT)
    expect(await mine()).not.toContain(id)
  })
})

/* ─────────────── 2 — the take-over 409 is decided against the session ─────────────── */

describe('2 — the 409 knows who is holding and who is asking', () => {
  /**
   * `nextClaim` refuses when *someone else* holds the row. "Someone else" was
   * measured against the constant, so signed in as `USR-3` you were refused
   * your own claim and waved through `USR-1`'s — exactly backwards.
   *
   * Both directions asserted, because either one alone passes against a
   * `nextClaim` that always throws or never does.
   */
  it('refuses another operator’s row and names the holder', async () => {
    await switchMockUser(SUPPORT)
    const id = await anUnheldConversation()
    await claimConversation(id)

    await switchMockUser(OWNER)
    await expect(claimConversation(id)).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.code === 'claimed_by_other' && e.message.includes(SUPPORT_NAME),
    )
  })

  it('lets the holder re-claim their own row without a conflict', async () => {
    await switchMockUser(SUPPORT)
    const id = await anUnheldConversation()
    const first = await claimConversation(id)
    const again = await claimConversation(id)

    expect(again.claim?.ownerId).toBe(SUPPORT)
    /* Re-claiming keeps the original `claimedAt` — it is a touch, not a new
       claim — which is only reachable when the holder check recognises you. */
    expect(again.claim?.claimedAt).toBe(first.claim?.claimedAt)
    expect(again.claim?.takeovers).toEqual([])
  })

  /** A take-over is recorded from the real holder to the real taker. */
  it('records the take-over between the two operators who were actually involved', async () => {
    await switchMockUser(SUPPORT)
    const id = await anUnheldConversation()
    await claimConversation(id)

    await switchMockUser(OWNER)
    const taken = await claimConversation(id, { takeOver: true })

    expect(taken.claim?.ownerId).toBe(OWNER)
    expect(taken.claim?.takeovers).toHaveLength(1)
    expect(taken.claim?.takeovers[0]).toMatchObject({
      fromUserId: SUPPORT,
      fromUserName: SUPPORT_NAME,
      toUserId: OWNER,
      toUserName: OWNER_NAME,
    })
    expect(await mine()).toContain(id)
  })
})

/* ─────────── 3 — the shared helper, tested where five queues use it ─────────── */

describe('3 — nextClaim stamps the session, for every queue that imports it', () => {
  /**
   * `requests.ts` does not persist its claims — `claimRequest` returns a fresh
   * object and leaves `allRequestFixtures` alone — so the queue-level assertion
   * above cannot be made through `listRequests`. The helper is therefore tested
   * directly, which is honest about where the contract lives: this one function
   * is what `requests`, `applicants`-adjacent, `safety`, `fairness`, `cash` and
   * `conversations` all stamp ownership with.
   */
  it('follows switchMockUser in both directions', async () => {
    await switchMockUser(SUPPORT)
    const asSupport = nextClaim('request', 'REQ-9001', null, undefined)
    expect(asSupport.ownerId).toBe(SUPPORT)
    expect(asSupport.ownerName).toBe(SUPPORT_NAME)

    await switchMockUser(OWNER)
    const asOwner = nextClaim('request', 'REQ-9001', null, undefined)
    expect(asOwner.ownerId).toBe(OWNER)
    expect(asOwner.ownerName).toBe(OWNER_NAME)
  })
})

/* ──────────────── 4 — everything else that stamps an actor ──────────────── */

describe('4 — the actor on a write is the operator who made it', () => {
  /**
   * `appendAudit` defaults `actorId` to the acting session. It is called by
   * every mutation in this directory, so a frozen actor makes the whole log a
   * record of what `USR-1` did — including the writes `USR-3` made.
   */
  it('attributes an audit entry to the signed-in operator', async () => {
    await switchMockUser(SUPPORT)
    appendAudit({
      action: 'wallet.adjust',
      subjectType: 'rider',
      subjectId: 'RDR-1041',
      amountHalalas: 5_000,
      reasonCode: 'goodwill',
      note: null,
      /* An existing key — `localisedKeys.test.ts` fails a key minted and never
         written, and this test has no business inventing copy. */
      detail: { key: 'fin.audit.walletAdjusted', params: { direction: 'credit', reference: 'WTX-ADJ-0001' } },
    })

    const page = await listAuditEntries()
    expect(page.items[0]?.actorId).toBe(SUPPORT)
    expect(page.items[0]?.actorName).toBe(SUPPORT_NAME)
  })

  /** The twin: an explicit `actorId` still wins over the session. */
  it('lets a caller name the actor explicitly', async () => {
    await switchMockUser(SUPPORT)
    appendAudit({
      action: 'wallet.adjust',
      subjectType: 'rider',
      subjectId: 'RDR-1041',
      amountHalalas: 5_000,
      reasonCode: 'goodwill',
      note: null,
      detail: { key: 'fin.audit.walletAdjusted', params: { direction: 'credit', reference: 'WTX-ADJ-0002' } },
      actorId: OWNER,
    })

    expect((await listAuditEntries()).items[0]?.actorId).toBe(OWNER)
  })

  /**
   * **The one that is an authority decision rather than a label.**
   *
   * `checkAdjustmentAuthority` reads the acting operator's *role* to pick a
   * compensation ceiling — `Owner` 1,000 SAR per case, `Support` 75. Frozen at
   * `USR-1`, every operator got the Owner ceiling, so §11.2's cap was
   * unreachable and D17's whole point — authority varies by role — could not be
   * demonstrated. 500 SAR is deliberately between the two ceilings.
   */
  it('applies the signed-in operator’s role ceiling, not the seeded operator’s', async () => {
    const asOwner = await checkAdjustmentAuthority('RDR-1041', 50_000, 'goodwill')
    expect(asOwner.appliedRole).toBe('Owner')
    expect(asOwner.allowed).toBe(true)
    expect(asOwner.blockedReason).toBeNull()

    await switchMockUser(SUPPORT)
    const asSupport = await checkAdjustmentAuthority('RDR-1041', 50_000, 'goodwill')
    expect(asSupport.appliedRole).toBe('Support')
    expect(asSupport.allowed).toBe(false)
    expect(asSupport.blockedReason).not.toBeNull()
    expect(asSupport.perCaseCapHalalas).toBe(7_500)
  })
})

/* ───────────────────── 5 — the guard against the next one ───────────────────── */

describe('5 — CURRENT_USER_ID is the seeded default and nothing else', () => {
  /**
   * A static scan, in the spirit of `seam.test.ts` §4. The rule cannot be
   * expressed as a runtime assertion — a client reading the constant behaves
   * identically until somebody switches user — so it is enforced at the import.
   *
   * `session.ts` is the sole exemption: it is where the constant becomes the
   * session's starting value (`let mockUserId = CURRENT_USER_ID`) and where
   * `resetMockSession` restores it. That is the *seeded default* use, and it is
   * the only correct one in this directory.
   *
   * Comments are stripped first, so the several files that explain the defect
   * by name are not read as committing it.
   */
  it('is imported by no client but session.ts', () => {
    const dir = join(process.cwd(), 'src', 'data', 'clients')
    const offenders: string[] = []

    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.ts') || name === 'session.ts' || name.endsWith('.test.ts')) continue
      const source = stripComments(readFileSync(join(dir, name), 'utf8'))
      if (/\bCURRENT_USER_ID\b/.test(source)) offenders.push(name)
    }

    expect(
      offenders,
      'a client that reads CURRENT_USER_ID is invisible to switchMockUser — use currentMockUserId()',
    ).toEqual([])
  })
})

/** Block comments, then line comments. Same helper `seam.test.ts` uses, same limits. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}
