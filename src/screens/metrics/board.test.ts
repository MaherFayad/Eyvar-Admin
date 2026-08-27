/**
 * **The two board-level rules that are decisions, not renderings** — R4-4 §4.3's
 * one-banner selection and `states.md`'s choice of which kind of empty.
 *
 * Both are pure functions on a `MetricBoard`, and both are tested here rather
 * than through the screen on purpose: mounting `MetricBoardScreen` needs the
 * whole shell, and what is at risk is the *rule*, not the JSX. The screen's
 * only banner expression is `{notice && <Banner …/>}`, so "at most one" is
 * structural once `selectNotice` returns one thing or nothing.
 *
 * ## What the seeded data cannot prove, said out loud
 *
 * No board declares two notices **of one tone**. `fixtures/metrics.ts` says the
 * same thing from the other side and gives the reason it will not manufacture
 * one — inventing a second condition would put a banner on screen that no tile
 * corroborates, which is the exact thing R4-4 §4.3 forbids.
 *
 * So every `severity` case below is **synthetic**, and it is marked as such. It
 * shows the comparator is correct; it does **not** show the product has ever
 * broken a real tie, and nobody should read it as saying so.
 *
 * The **tone** clause is not in that position and the earlier passes were wrong
 * about it. `operations-overview` declares a `warning` at 70 **first** and a
 * `critical` at 95 second — seeded in that order precisely so a
 * declaration-order implementation would render the wrong banner. Two passes
 * concluded otherwise, honestly, because that board threw on a missing
 * translation key before it rendered.
 *
 * ## R5-3 — what this file DELETED, and what it gained in its place
 *
 * **The declaration-order tie-break is gone, and its test with it.** R4-4 §4.3
 * ordered notices by tone, then `severity`, then declaration order, and R5-3
 * struck the third clause — the designer's own — for a reason that is not
 * reachability: *"a tie-break decided by the order somebody typed an array is
 * not a tie-break. It is a coin flip with a stable seed."* Two conditions
 * equally severe and equally urgent is a real editorial problem and it must
 * surface as a **fixture defect**, not be resolved by a line number.
 *
 * A test asserting the old behaviour would now assert an artefact of
 * `Array.prototype.sort` as if it were a rule, so it is deleted rather than
 * relabelled. **Nothing behind a flag, nothing kept for reference.**
 *
 * What replaces it is the enforcement the ruling asks for, and it is the
 * opposite of a synthetic case: **for every board in the fixtures, no two
 * notices share `(tone, severity)`.** That runs on real data, always, and never
 * goes stale.
 */

import { beforeAll, describe, expect, it } from 'vitest'
import {
  METRIC_BOARD_SUB_TABS,
  disableMockLatency,
  getMetricBoard,
} from '@/data/clients'
import type { BoardNotice, MetricBoard } from '@/data/types'
import { isBoardEmpty, selectNotice } from './MetricBoardScreen'

const AS_OF = '2026-06-25T09:14:00+03:00'

function notice(over: Partial<BoardNotice> = {}): BoardNotice {
  return {
    key: 'notice.support.unacknowledgedSos',
    params: { count: 2 },
    tone: 'critical',
    action: null,
    severity: 100,
    ...over,
  }
}

function board(over: Partial<MetricBoard> = {}): MetricBoard {
  return {
    subTabId: 'admin-overview',
    asOf: AS_OF,
    metrics: [],
    charts: [],
    breakdowns: [],
    notices: [],
    ...over,
  }
}

describe('selectNotice — "a board declares conditions; the page renders at most one banner"', () => {
  it('renders nothing when a board declares nothing — six of the eight boards', () => {
    expect(selectNotice([])).toBeNull()
  })

  it('renders the one a board declares, unchanged', () => {
    const only = notice()
    expect(selectNotice([only])).toBe(only)
  })

  /* SYNTHETIC — no fixture declares two. */
  it('takes the highest TONE first, whatever the severities say', () => {
    const warn = notice({ key: 'w', tone: 'warning', severity: 999 })
    const crit = notice({ key: 'c', tone: 'critical', severity: 1 })
    expect(selectNotice([warn, crit])?.key).toBe('c')
  })

  /* SYNTHETIC. */
  it('ranks the four tones critical > warning > info > success', () => {
    const all: BoardNotice[] = [
      notice({ key: 's', tone: 'success' }),
      notice({ key: 'i', tone: 'info' }),
      notice({ key: 'w', tone: 'warning' }),
      notice({ key: 'c', tone: 'critical' }),
    ]
    expect(selectNotice(all)?.key).toBe('c')
    expect(selectNotice(all.slice(0, 3))?.key).toBe('w')
    expect(selectNotice(all.slice(0, 2))?.key).toBe('i')
  })

  /* SYNTHETIC. */
  it('breaks a tone tie on the HIGHER severity', () => {
    const low = notice({ key: 'low', severity: 10 })
    const high = notice({ key: 'high', severity: 90 })
    expect(selectNotice([low, high])?.key).toBe('high')
  })

  /**
   * Not a declaration-order claim — that clause is deleted (R5-3). This is a
   * purity claim: `selectNotice` reads a board's array and must not rearrange
   * it, because the suppressed conditions stay declared in the board and each
   * is still visible in the tile or breakdown it came from.
   */
  it('does not reorder the board’s own array — the suppressed conditions stay as declared', () => {
    const declared = [notice({ key: 'a', severity: 1 }), notice({ key: 'b', severity: 9 })]
    selectNotice(declared)
    expect(declared.map((n) => n.key)).toEqual(['a', 'b'])
  })
})

/**
 * **R5-3's replacement for the declaration-order case, and the point is that it
 * is not synthetic.**
 *
 * R4-4 §4.3 as amended: *"the highest tone, then the highest `severity`. The
 * selection is total because `severity` is unique among a board's notices of
 * the same tone. Two notices sharing a tone and a severity is a **fixture
 * defect**, not a rendering question."*
 *
 * The right artifact for that is not a fixture exercising a third clause — it
 * is a test proving the collision never exists. It runs over every board the
 * product serves, on real data, and it never goes stale.
 *
 * **It reads through the CLIENTS, not the fixtures.** `seam.test.ts` has no
 * carve-out for test files and is right not to: a test that reaches around the
 * seam stops testing what the screen sees. `getMetricBoard` is the same call
 * `MetricBoardScreen` makes.
 */
describe('every board’s notices — R4-4 §4.3 as amended by R5-3', () => {
  let boards: MetricBoard[] = []

  beforeAll(async () => {
    disableMockLatency()
    boards = await Promise.all(METRIC_BOARD_SUB_TABS.map((subTabId) => getMetricBoard(subTabId)))
  })

  it('read something, so an empty catalogue cannot pass the check below', () => {
    expect(boards.length).toBe(METRIC_BOARD_SUB_TABS.length)
    /* And at least one board must actually declare a notice, or the uniqueness
       assertion is vacuously true over nothing. */
    expect(boards.flatMap((board) => board.notices).length).toBeGreaterThan(0)
  })

  it('declares no two notices sharing a (tone, severity) — the selection is total', () => {
    const collisions = boards.flatMap((board) => {
      const seen = new Map<string, string>()
      return board.notices.flatMap((n) => {
        const pair = `${n.tone}/${n.severity}`
        const prior = seen.get(pair)
        seen.set(pair, n.key)
        return prior === undefined ? [] : [`${board.subTabId}: ${prior} and ${n.key} are both ${pair}`]
      })
    })
    expect(collisions, 'fix the fixture — this is not a rendering question').toEqual([])
  })

  /* R4-4 §4.3's other numeric bound, checked in the same read rather than in a
     second one. A board declares at most three. */
  it('declares at most three conditions per board', () => {
    const over = boards
      .filter((board) => board.notices.length > 3)
      .map((board) => `${board.subTabId} (${board.notices.length})`)
    expect(over).toEqual([])
  })
})

describe('isBoardEmpty — a ranked list is content (R4-4 §4.1)', () => {
  it('is empty with no number, no chart and no row', () => {
    expect(isBoardEmpty(board())).toBe(true)
  })

  /**
   * **The defect this closes.** A board whose only content was a ranked list
   * read as empty and was replaced, whole, by R8's first-run illustration —
   * with five named captains sitting in the response.
   */
  it('is NOT empty when its only content is a breakdown with rows', () => {
    expect(
      isBoardEmpty(
        board({
          breakdowns: [
            {
              key: 'performance.captainsByLateShare',
              dimension: 'captain',
              rowsShown: 5,
              rowsTotal: 6,
              bar: false,
              caveat: null,
              awaitingStore: null,
              rows: [
                {
                  id: 'DRV-0103',
                  /* R5-7 — a captain's name is DATA. It was
                     `labelKey: 'breakdown.row.entity'` with `{ name }`, a key
                     whose whole string was a parameter, and that key is gone. */
                  label: { kind: 'text', text: 'Khalid Mansour' },
                  subLabelKey: null,
                  subLabelParams: null,
                  value: 20,
                  unit: 'percent',
                  currency: null,
                  barFraction: null,
                  drilldownRoute: null,
                },
              ],
            },
          ],
        }),
      ),
    ).toBe(false)
  })

  it('is still empty when a declared breakdown has NO rows — an empty section is not content', () => {
    expect(
      isBoardEmpty(
        board({
          breakdowns: [
            {
              key: 'support.contactReasons',
              dimension: 'reason-code',
              rowsShown: 5,
              rowsTotal: 0,
              bar: true,
              caveat: null,
              awaitingStore: null,
              rows: [],
            },
          ],
        }),
      ),
    ).toBe(true)
  })

  /**
   * **R5-11a §19.1 — a card awaiting a store does not count as content**, and
   * the reasoning is §4.3's about notices one object over: a board whose every
   * card is awaiting a store has nothing on it, and rendering the same sentence
   * four times is worse than rendering R8's first kind once (AC-699).
   *
   * The row below would count as content by the old test, because
   * `rows.length > 0`. §19.1's first invariant says that combination cannot
   * occur — but the invariant is asserted in the DATA layer, and this file must
   * not depend on a promise made in another tree, so the case is constructed
   * deliberately and the screen is asserted to hold the line on its own.
   */
  it('does not count a breakdown awaiting a store as content', () => {
    expect(
      isBoardEmpty(
        board({
          breakdowns: [
            {
              key: 'support.contactReasons',
              dimension: 'reason-code',
              rowsShown: 5,
              rowsTotal: 1,
              bar: false,
              caveat: null,
              awaitingStore: 'contact-log',
              rows: [
                {
                  id: 'RSN-1',
                  label: { kind: 'key', key: 'breakdown.queue.request', params: null },
                  subLabelKey: null,
                  subLabelParams: null,
                  value: 1,
                  unit: 'count',
                  currency: null,
                  barFraction: null,
                  drilldownRoute: null,
                },
              ],
            },
          ],
        }),
      ),
    ).toBe(true)
  })

  /**
   * R4-4 §4.3's own test is that a notice may only exist for a condition the
   * board already shows a number for. Counting one here would hide a violation
   * of that rule behind a rendered page.
   */
  it('is still empty when a board declares a notice and nothing else', () => {
    expect(isBoardEmpty(board({ notices: [notice()] }))).toBe(true)
  })
})
