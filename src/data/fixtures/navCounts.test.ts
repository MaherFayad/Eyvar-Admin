/**
 * The nav-count fixture's **tone budget**.
 *
 * `attention` means *breached* — past a deadline, expired, or needing a
 * decision now. It does not mean "has items": the count beside the chip already
 * says that, and a tone that merely repeats the number is a second copy of it
 * wearing a colour.
 *
 * **Wave 2 proposed the rule and R4-10b ruled on it.** The fixture's
 * *"irreversible or statutory"* was adopted with one correction — "irreversible"
 * is arguable — and tightened into **two clauses, both required**:
 *
 *   1. the harm lands on a **person**, on **money that cannot be recovered**, or
 *      on a **legal obligation** — never on a metric, a rating or a queue
 *      length;
 *   2. the deadline that makes it irreversible **is not one we set**. If the
 *      number lives in Admin › Operational Policy and the harm moves with it,
 *      the queue is `neutral`.
 *
 * An earlier revision of the fixture toned **nine of the 34** sub-tabs
 * `attention`. A signal that is almost always on carries no information — the
 * same failure as the legacy rail's eleven boot-time zeroes (defect D-L8),
 * which is what taught operators to stop reading badges at all.
 *
 * **The ceiling is 3, raised from 2 by R4-10b, and it changed job.** Three
 * queues qualify under the clauses above and a cap of two was silencing one of
 * them — a genuine statutory breach — so the cap is no longer the rule. It is a
 * **tripwire**: a fourth `attention` must argue clause 1 and clause 2 in the
 * fixture before this file will let the build pass.
 *
 * **Scope.** This tests the *fixture*, which is mock-data-engineer's. The
 * roll-up *rule* (`workspaceBadge`, including the Q12 `count > 0` gate) is the
 * shell owner's and is tested in `src/shell/navBadges.test.ts`.
 */

import { describe, expect, it } from 'vitest'

import { disableMockLatency } from '../config'
import { listApplicants } from '../clients/applicants'
import { listAssuranceTrips } from '../clients/assurance'
import { listDriverCompliance, listDrivers } from '../clients/drivers'
import { listFairnessCases } from '../clients/fairness'
import { getMetricBoard } from '../clients/metrics'
import { listWorkItems, myWorkBacklogSize } from '../clients/myWork'
import { getNavCounts } from '../clients/navCounts'
import { listRequests } from '../clients/requests'
import { listSafetyIncidents } from '../clients/safety'
import { SUB_TABS } from './routeTable'
import { navCountFixtures, navCountFixturesAllEmpty } from './navCounts'

/** Read a fixture row by id, so every assertion below names the sub-tab it is about. */
const row = (subTabId: string) => navCountFixtures.find((c) => c.subTabId === subTabId)!

disableMockLatency()

const attentionToned = navCountFixtures.filter((c) => c.tone === 'attention')
const attentionVisible = attentionToned.filter((c) => (c.count ?? 0) > 0)
const names = (rows: typeof navCountFixtures) => rows.map((c) => c.subTabId).join(', ') || 'none'

describe('`attention` means breached, not non-empty', () => {
  it('tones at most three of the 34 sub-tabs `attention` — R4-10b tripwire', () => {
    expect(
      attentionToned.length,
      `attention-toned: ${names(attentionToned)} — a fourth must argue BOTH R4-10b clauses ` +
        'in the fixture comment: (1) the harm lands on a person, on unrecoverable money, or ' +
        'on a legal obligation, and (2) the deadline is not one we set. Clause 2 is the ' +
        'falsifiable one — check `slaSource` and whether a policy row exists.',
    ).toBeLessThanOrEqual(3)
  })

  it('renders at most three `attention` badges to the operator', () => {
    /* The operator-facing form: a tone with a zero count renders nothing (Q12),
       so what matters most is how many warning chips are on screen at once.
       `financials-cash` is toned and empty, so this is two today. */
    expect(attentionVisible.length, `visible: ${names(attentionVisible)}`).toBeLessThanOrEqual(3)
  })

  it('names exactly the sub-tabs whose breach is evidenced elsewhere in the fixtures', () => {
    /* Pinned, so re-toning is a visible diff with a reason attached rather than
       a quiet edit. `operations-people` was here until wave 2 and stepped aside
       for `support-safety`; `navCounts.ts` records why.

       `admin-data` joined when its PDPL request went past its statutory
       deadline — the third queue R4-10b raised the cap for, and the one the
       previous cap was silencing. */
    expect(attentionToned.map((c) => c.subTabId).sort()).toEqual([
      'admin-data',
      'financials-cash',
      'support-safety',
    ])
  })

  it('keeps the third slot honest: `admin-data` is toned because a statutory clock ran out', async () => {
    /**
     * The honesty link, the same shape as `support-safety`'s below. If the
     * erasure request ever comes back inside its window, this row must go
     * neutral with it — asserting the tone against the tile is what stops a
     * badge drifting away from the data it claims to describe.
     *
     * Clause 2 passes on its own terms: PDPL's thirty days (`:15962`) cannot be
     * widened in Admin › Operational Policy.
     */
    const board = await getMetricBoard('admin-overview')
    const overdue = board.metrics.find((m) => m.key === 'admin.overview.erasureOverdue')!
    expect(overdue.value).toBe(1)
    expect(row('admin-data').tone).toBe('attention')
    expect(row('admin-data').count).toBe(overdue.value)
  })

  it('leaves every large healthy backlog neutral', () => {
    /**
     * The counter-examples that make the rule falsifiable: big numbers that are
     * emphatically not emergencies.
     *
     * **Activity Log used to be the sharpest of these and is no longer here.**
     * Its 1,247 became `null` under AC-722 — a log owes nobody work — so the
     * biggest neutral backlog in the fixture is now My Work's 22. That is a
     * weaker counter-example and it is the honest one.
     */
    for (const subTabId of ['operations-my-work', 'operations-subscriptions']) {
      expect(row(subTabId).count ?? 0, subTabId).toBeGreaterThan(0)
      expect(row(subTabId).tone, `${subTabId} is a healthy backlog, not a breach`).toBe('neutral')
    }
  })

  it('keeps the unacknowledged SOS that justifies the one visible tone', async () => {
    /**
     * The honesty link. If `INC-014` and `INC-015` are ever acknowledged in the
     * fixtures, `support-safety` must go neutral with them — asserting the two
     * together is what stops the badge drifting away from the data it claims to
     * describe.
     *
     * The breach asserted is the **first response**, not the resolution: both
     * incidents are inside their 60-minute resolve window and neither has had a
     * single protocol step ticked. T1's `firstResponseMin` is 0 (`:14652`).
     */
    const critical = await listSafetyIncidents({ view: 'critical-sos', pageSize: 100 })
    const unacknowledged = critical.items.filter(
      (i) => i.status === 'open' && i.firstResponseBreachedAt !== null,
    )
    expect(unacknowledged.map((i) => i.id).sort()).toEqual(['INC-014', 'INC-015'])
    expect(row('support-safety').tone).toBe('attention')
  })

  it('names the queues that are breached and stayed neutral, so the trade-off is visible', async () => {
    /**
     * The uncomfortable half of the budget. Requests and Fairness both hold
     * rows that are past a **measured** deadline — more than `operations-people`
     * can say — and both render neutral because there is no slot left.
     *
     * This test exists so that fact is a line in a test file rather than a
     * paragraph in a comment nobody re-reads. If the cap moves, delete it.
     */
    const requests = await listRequests({ view: 'breached', pageSize: 500 })
    const openBreachedRequests = requests.items.filter((r) =>
      ['searching', 'offered', 'no-drivers'].includes(r.status),
    )
    expect(openBreachedRequests.map((r) => r.id).sort()).toEqual([
      'REQ-503',
      'SREQ-003',
      'SREQ-006',
    ])
    expect(row('operations-ride-requests').tone).toBe('neutral')
    expect(row('operations-subscription-requests').tone).toBe('neutral')

    const cases = await listFairnessCases({ view: 'open', pageSize: 100 })
    expect(cases.items.some((c) => c.slaBreachedAt !== null)).toBe(true)
    expect(row('support-fairness').tone).toBe('neutral')
  })

  it('keeps the empty escalation queue that proves the Q12 gate', () => {
    const cash = navCountFixtures.find((c) => c.subTabId === 'financials-cash')!
    expect(cash).toMatchObject({ count: 0, tone: 'attention' })
  })
})

describe('counts are derived from the queues they describe, not typed in', () => {
  /**
   * Every number below is asserted against the client that serves the rows.
   * A badge that says seven over a screen that shows four is worse than no
   * badge, and it is the failure mode nobody notices until an operator does.
   */

  it('operations-my-work equals the backlog the screen will render', () => {
    expect(row('operations-my-work').count).toBe(myWorkBacklogSize())
  })

  it('the two request tabs each equal their own open queue, and sum to it', async () => {
    const page = await listRequests({ pageSize: 500 })
    const open = page.items.filter((r) =>
      ['searching', 'offered', 'no-drivers'].includes(r.status),
    )
    const instant = open.filter((r) => r.channel === 'instant').length
    const subscription = open.filter((r) => r.channel === 'subscription').length

    expect(row('operations-ride-requests').count).toBe(instant)
    expect(row('operations-subscription-requests').count).toBe(subscription)
    /* The split is exhaustive: a request is one channel or the other, so the
       two badges together are still the whole open queue. */
    expect(instant + subscription).toBe(open.length)
  })

  it('operations-assurance equals the legs with no eligible backup captain', async () => {
    const page = await listAssuranceTrips({ view: 'no-backup-captain', pageSize: 100 })
    expect(row('operations-assurance').count).toBe(page.total)
  })

  it('support-safety equals the open incident queue', async () => {
    const page = await listSafetyIncidents({ view: 'open', pageSize: 100 })
    expect(row('support-safety').count).toBe(page.total)
  })

  it('support-fairness equals the open case queue', async () => {
    const page = await listFairnessCases({ view: 'open', pageSize: 100 })
    expect(row('support-fairness').count).toBe(page.total)
  })
})

describe('one authority per number — spec §19, AC-720 to AC-724', () => {
  /**
   * **Q-108: a nav badge and a metric tile are allowed to differ.** A badge is
   * *work owed in the whole sub-tab*; a tile is whatever its definition says.
   * Forcing them equal breaks one or the other.
   *
   * What is not allowed is two authorities for **one** number. Three pairs
   * failed that and were corrected; two differ legitimately and are pinned here
   * **by name and with the reason**, because the next engineer to notice
   * 7 against 5 will read it as a bug and "fix" it. A comment nobody re-reads
   * is not protection.
   */

  it('AC-720 — management-risk states the number six once, on the badge', async () => {
    /* The board carried an `Open signals` tile of 6 beside a badge of 6:
       `redSubs + atRiskDrivers + paymentRisk` (`:14375`), the sum of the three
       tiles under it. The tile is deleted; the badge is the authority. */
    expect(row('management-risk').count).toBe(6)
    const board = await getMetricBoard('management-risk')
    expect(
      board.metrics.map((m) => m.key),
      'no Risk tile may restate the badge',
    ).not.toContain('management.risk.openSignals')
    expect(
      board.metrics.filter((m) => m.value === row('management-risk').count).map((m) => m.key),
      'a tile whose value equals the badge is a second copy of the badge in a bigger font',
    ).toEqual([])
  })

  it('AC-722 — admin-activity has no count at all, because a log owes nobody work', () => {
    /* It read 1,247, the row count of the audit log. A count is *work owed*
       (Q-46) and an append-only record of what already happened owes nothing.
       `null` means no badge, ever — distinct from `0`, an empty backlog. */
    expect(row('admin-activity').count).toBeNull()
  })

  it('AC-724 — management-zones counts supply-starved zones, not zones that exist', async () => {
    /**
     * `0` was legacy's boot-time placeholder (`:523`), stale until the Zones
     * page is first opened (`:14140`) — defect L-11. The real badge is
     * `starved`: zones where demand is at least three times supply (`:14133`).
     * Two qualify — Al Narjis 14 : 2 and Al Sahafa 9 : 3 (`:13952`).
     *
     * **Now asserted against the board — but against tile 2, not tile 1.**
     * AC-724 says *"the first tile on Market & Zones"*; §9.1 ranks
     * `Captains needed for a healthy ratio` first and `Supply-starved zones`
     * second, and it is the second that shares the badge's predicate. Carried
     * as a spec error: re-ranking the board to make the sentence true would be
     * bending the data to fit a typo.
     *
     * Still not asserted against a *client* — there is no zones resource — so
     * badge and tile are asserted against each other and both cite `:14133`.
     */
    const board = await getMetricBoard('management-zones')
    const starved = board.metrics.find((m) => m.key === 'management.zones.starvedZones')!
    expect(row('management-zones').count).toBe(2)
    expect(starved.value).toBe(row('management-zones').count)
    /* And the tile AC-724 actually names is a different number, which is the
       whole reason the criterion needs correcting. */
    const needed = board.metrics.find((m) => m.key === 'management.zones.captainsNeeded')!
    expect(needed.value).toBe(3)
  })

  it('AC-721 under O8 — operations-people shows no badge, and the tile still counts', async () => {
    /**
     * **O8 refined supersedes AC-721.** The badge was five applications plus
     * two lapsed documents — a number on no single page (X3) — then the captain
     * roster. A roster is not work owed, so People now carries no badge; what
     * an operator must act on is still counted, on the board tile and in each
     * queue. The seeded literal stays as documentation of the roster's size.
     */
    const captains = await listDrivers({ pageSize: 500 })
    expect(row('operations-people').count, 'the seed still records the roster').toBe(captains.total)
    const served = await getNavCounts()
    expect(
      served.subTabs.find((s) => s.subTabId === 'operations-people')!.count,
      'but the client serves no badge for a roster',
    ).toBeNull()

    const applications = await listApplicants({ pageSize: 200 })
    const waiting = applications.items.filter(
      (a) => a.status === 'pending' || a.status === 'in-review',
    )
    const compliance = await listDriverCompliance({ pageSize: 200 })
    const lapsed = compliance.items.flatMap((c) => c.docs.filter((d) => d.state === 'expired'))
    /* Both still exist and are still separately reachable: the applications
       queue and the compliance view. Neither is hidden by the badge's change. */
    expect(waiting.length, 'applications awaiting a decision').toBe(5)
    expect(lapsed.length, 'lapsed compliance documents').toBe(2)

    const board = await getMetricBoard('operations-overview')
    const tile = board.metrics.find((m) => m.key === 'operations.overview.pendingApplications')!
    expect(tile.value, 'the tile counts applications only').toBe(waiting.length)
  })

  it('AC-723 — operations-my-work backlog and the breached tile differ legitimately', async () => {
    /**
     * **Do not force these equal either.** Two predicates over one queue: the
     * badge is the backlog (`myWorkBacklogSize()` — breached *or* unclaimed),
     * the tile is `Work items past their SLA` (breached only). Neither label
     * may say "work items" without a qualifier.
     *
     * **Spec §14 prints the tile as 12 and the fixtures serve 13.** The literal
     * in the spec is stale; the property that matters is that the tile and the
     * `breached` view agree, and that is what is asserted. Carried as a spec
     * error rather than fixed by editing a fixture to match a sentence.
     */
    const breached = await listWorkItems({ view: 'breached', pageSize: 500 })
    const board = await getMetricBoard('operations-overview')
    const tile = board.metrics.find((m) => m.key === 'operations.overview.breachedWorkItems')!

    expect(row('operations-my-work').count, 'the badge is the backlog').toBe(myWorkBacklogSize())
    expect(tile.value, 'the tile is the breached subset').toBe(breached.total)
    expect(
      tile.value,
      'backlog and breached are two predicates on one queue and must not be forced equal',
    ).not.toBe(row('operations-my-work').count)
  })
})

describe('fixture integrity', () => {
  it('covers every sub-tab in the route table exactly once', () => {
    expect(navCountFixtures.map((c) => c.subTabId).sort()).toEqual(SUB_TABS.map((r) => r.subTabId).sort())
  })

  it('keeps the all-empty scenario tone-identical, so only the numbers change', () => {
    expect(navCountFixturesAllEmpty.map((c) => c.tone)).toEqual(navCountFixtures.map((c) => c.tone))
    expect(navCountFixturesAllEmpty.every((c) => c.count === null || c.count === 0)).toBe(true)
  })

  it('shows no attention badge at all once every backlog is clear', () => {
    expect(navCountFixturesAllEmpty.filter((c) => c.tone === 'attention' && (c.count ?? 0) > 0)).toEqual([])
  })
})
