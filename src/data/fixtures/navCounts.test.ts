/**
 * The nav-count fixture's **tone budget**.
 *
 * `attention` means *breached* — past a deadline, expired, or needing a
 * decision now. It does not mean "has items": the count beside the chip already
 * says that, and a tone that merely repeats the number is a second copy of it
 * wearing a colour.
 *
 * An earlier revision of the fixture toned **nine of the 34** sub-tabs
 * `attention`. A signal that is almost always on carries no information — the
 * same failure as the legacy rail's eleven boot-time zeroes (defect D-L8),
 * which is what taught operators to stop reading badges at all.
 *
 * Two is the ceiling. This file is what makes a third a build failure rather
 * than a slow drift back to nine.
 *
 * **Scope.** This tests the *fixture*, which is mock-data-engineer's. The
 * roll-up *rule* (`workspaceBadge`, including the Q12 `count > 0` gate) is the
 * shell owner's and is tested in `src/shell/navBadges.test.ts`.
 */

import { describe, expect, it } from 'vitest'

import { disableMockLatency } from '../config'
import { listApplicants } from '../clients/applicants'
import { SUB_TABS } from './routeTable'
import { navCountFixtures, navCountFixturesAllEmpty } from './navCounts'

disableMockLatency()

const attentionToned = navCountFixtures.filter((c) => c.tone === 'attention')
const attentionVisible = attentionToned.filter((c) => (c.count ?? 0) > 0)
const names = (rows: typeof navCountFixtures) => rows.map((c) => c.subTabId).join(', ') || 'none'

describe('`attention` means breached, not non-empty', () => {
  it('tones at most two of the 34 sub-tabs `attention`', () => {
    expect(
      attentionToned.length,
      `attention-toned: ${names(attentionToned)} — a third means the tone has started ` +
        'meaning "has items" again. Adding one requires retiring one, with the breach ' +
        'named in the fixture comment.',
    ).toBeLessThanOrEqual(2)
  })

  it('renders at most two `attention` badges to the operator', () => {
    /* The operator-facing form: a tone with a zero count renders nothing (Q12),
       so what matters most is how many warning chips are on screen at once. */
    expect(attentionVisible.length, `visible: ${names(attentionVisible)}`).toBeLessThanOrEqual(2)
  })

  it('names exactly the sub-tabs whose breach is evidenced elsewhere in the fixtures', () => {
    /* Pinned, so re-toning is a visible diff with a reason attached rather than
       a quiet edit. */
    expect(attentionToned.map((c) => c.subTabId).sort()).toEqual([
      'financials-cash',
      'operations-people',
    ])
  })

  it('leaves every large healthy backlog neutral', () => {
    /* The counter-examples that make the rule falsifiable: big numbers that are
       emphatically not emergencies. Activity Log's 1,247 is the sharpest. */
    for (const subTabId of ['admin-activity', 'operations-my-work', 'operations-subscriptions']) {
      const row = navCountFixtures.find((c) => c.subTabId === subTabId)!
      expect(row.count ?? 0, subTabId).toBeGreaterThan(0)
      expect(row.tone, `${subTabId} is a healthy backlog, not a breach`).toBe('neutral')
    }
  })

  it('keeps the breached application that justifies the one visible tone', async () => {
    /* The honesty link: if APP-2204 stops being breached, `operations-people`
       must stop being attention. Asserting the two together is what stops the
       fixture drifting away from the data it claims to describe. */
    const breached = await listApplicants({ view: 'breached', pageSize: 100 })
    expect(breached.items.map((a) => a.id)).toContain('APP-2204')
    expect(navCountFixtures.find((c) => c.subTabId === 'operations-people')!.tone).toBe('attention')
  })

  it('keeps the empty escalation queue that proves the Q12 gate', () => {
    const cash = navCountFixtures.find((c) => c.subTabId === 'financials-cash')!
    expect(cash).toMatchObject({ count: 0, tone: 'attention' })
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
