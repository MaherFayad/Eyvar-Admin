/**
 * `fitColumnWidths` — the declared budget resolved against the real container.
 *
 * The defect these cover: four tables declared more width than the content
 * region has (Tickets by 140px at 1440), so a header rendered as `Verdic` and
 * the last column was simply outside the box.
 */

import { describe, expect, it } from 'vitest'
import { MIN_SHRINK_WIDTH_PX, fitColumnWidths, type FitColumn } from './fitWidths'

const col = (id: string, width: number, extra: Partial<FitColumn> = {}): FitColumn => ({
  id,
  width,
  ...extra,
})

/** Σ of the resolved widths, so a test asserts the OUTCOME and not the shares. */
function resolvedTotal(columns: readonly FitColumn[], container: number): number {
  const fitted = fitColumnWidths(columns, container)
  return columns.reduce((sum, c) => sum + (fitted?.get(c.id) ?? c.width), 0)
}

describe('a table that already fits is not touched', () => {
  it('returns null when the declared total is inside the container', () => {
    expect(fitColumnWidths([col('a', 300), col('b', 300)], 1000)).toBeNull()
  })

  it('returns null on an exact fit, and on a 1px overflow', () => {
    expect(fitColumnWidths([col('a', 500), col('b', 500)], 1000)).toBeNull()
    /* A fractional container against integer columns must not put every table
       in the product through a shrink that changes nothing. */
    expect(fitColumnWidths([col('a', 500), col('b', 501)], 1000)).toBeNull()
  })

  it('returns null before the container has been measured', () => {
    /* The first frame: `clientWidth` is 0, nothing is known, and the declared
       widths are the correct thing to paint. */
    expect(fitColumnWidths([col('a', 900)], 0)).toBeNull()
    expect(fitColumnWidths([col('a', 900)], Number.NaN)).toBeNull()
  })
})

describe('an overflowing table is brought back to its container', () => {
  it('lands on the container exactly, not one or two pixels beside it', () => {
    /* The rounding case: three columns sharing an overflow that does not
       divide by three. The last candidate takes the remainder. */
    expect(resolvedTotal([col('a', 400), col('b', 400), col('c', 400)], 1037)).toBe(1037)
    expect(resolvedTotal([col('a', 300), col('b', 250), col('c', 190)], 617)).toBe(617)
  })

  it('reproduces the four tables that were over budget at 1440', () => {
    /* Disputes, as declared: 96 id + 240 what + 180 parties + 116 amount +
       132 status + 124 verdict-due + 224 action lane = 1112, in 1038. */
    const disputes: FitColumn[] = [
      col('id', 96, { type: 'id' }),
      col('what', 240),
      col('parties', 180),
      col('amount', 116, { type: 'money' }),
      col('status', 132),
      col('due', 124),
      col('actions', 224, { isLane: true }),
    ]
    expect(resolvedTotal(disputes, 1038)).toBe(1038)

    const fitted = fitColumnWidths(disputes, 1038)
    /* §7.3 rule 5 — the two a reader cannot tell have been truncated, plus the
       lane, come through at their declared width. */
    expect(fitted?.has('id')).toBe(false)
    expect(fitted?.has('amount')).toBe(false)
    expect(fitted?.has('actions')).toBe(false)
    /* The width came out of the columns that had it to give. */
    expect(fitted?.get('what')).toBeLessThan(240)
  })
})

describe('what never shrinks, and why', () => {
  it('leaves money and id alone even when they are the widest thing there', () => {
    const fitted = fitColumnWidths(
      [col('amount', 400, { type: 'money' }), col('note', 400)],
      600,
    )
    expect(fitted?.has('amount')).toBe(false)
    expect(fitted?.get('note')).toBe(200)
  })

  it('leaves a lane alone: a control that shrinks stops being clickable', () => {
    /* 40 + 400 = 440 in 300, so 140 has to go. The lane keeps its 40 and the
       single candidate absorbs all of it: 400 - 140 = 260. */
    const fitted = fitColumnWidths([col('sel', 40, { isLane: true }), col('a', 400)], 300)
    expect(fitted?.has('sel')).toBe(false)
    expect(fitted?.get('a')).toBe(260)
  })

  it('does not overrule a column the operator resized', () => {
    const fitted = fitColumnWidths(
      [col('dragged', 400, { userResized: true }), col('a', 400)],
      600,
    )
    expect(fitted?.has('dragged')).toBe(false)
    expect(fitted?.get('a')).toBe(200)
  })
})

describe('the floor, and the honest failure past it', () => {
  it('never takes a column below the minimum', () => {
    const fitted = fitColumnWidths([col('a', 200), col('b', 200)], 100)
    expect(fitted?.get('a')).toBe(MIN_SHRINK_WIDTH_PX)
    expect(fitted?.get('b')).toBe(MIN_SHRINK_WIDTH_PX)
  })

  it('lets the table overflow rather than crushing columns to nothing', () => {
    /* Eleven columns in a 400px container has no good answer, and inventing
       one by driving them to 20px would be worse than the scrollbar. */
    const many = Array.from({ length: 11 }, (_, i) => col(`c${i}`, 120))
    expect(resolvedTotal(many, 400)).toBe(11 * MIN_SHRINK_WIDTH_PX)
    expect(resolvedTotal(many, 400)).toBeGreaterThan(400)
  })

  it("honours a column's own declared floor when it is larger", () => {
    /* The flexible identity column declares `minWidth`, and §7.3 chose that
       number for that column's content. It beats the generic floor. */
    const fitted = fitColumnWidths(
      [col('identity', 320, { floor: 280 }), col('a', 320)],
      400,
    )
    /* It is a FLOOR, not a target. Sharing is proportional to slack, so the
       identity column gives up 40/284 of the overflow and stops well above its
       own minimum while the roomier column absorbs the rest — which is the
       behaviour that keeps the identity cell readable under pressure. */
    expect(fitted?.get('identity')).toBeGreaterThanOrEqual(280)
    expect(fitted?.get('identity')).toBeLessThan(320)
    expect(fitted?.get('a')).toBeGreaterThanOrEqual(MIN_SHRINK_WIDTH_PX)
  })

  it('returns null when nothing has any slack left to give', () => {
    expect(fitColumnWidths([col('a', MIN_SHRINK_WIDTH_PX)], 10)).toBeNull()
  })
})

describe('shares are proportional to SLACK, not to width', () => {
  it('does not drive a column with little room through its floor', () => {
    /* Both columns are 300 wide. `pinned` may only give up 10px before it hits
       its declared floor; `roomy` may give up 224. Sharing by WIDTH would take
       50 from each and push `pinned` under. */
    const fitted = fitColumnWidths(
      [col('pinned', 300, { floor: 290 }), col('roomy', 300)],
      500,
    )
    expect(fitted?.get('pinned')).toBeGreaterThanOrEqual(290)
    expect(fitted?.get('roomy')).toBeLessThan(300)
  })
})
