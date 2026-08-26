/**
 * **The width contract** — `04-index-screen-redesign.md` §7.3, asserted.
 *
 * Craft-critique **F1** is not a style defect, it is a **correctness** defect:
 * at 1440 the pinned action column paints on top of `Earned (SAR)` and the cell
 * renders a plausible wrong number — `12,4` where the truth is `12,400.50` —
 * with the horizontal scrollbar ~430 px below the fold, so nothing on screen
 * says the value was cut. §7.3's answer is arithmetic rather than paint order:
 *
 *   1. `table-layout: fixed; inline-size: 100%`
 *   2. every column declares a width in px; **exactly one is flexible** — the
 *      identity column, which declares `minWidth` and no `width`
 *   3. **Σ(declared px) + identity `minWidth` ≤ 910** — the table's inner width
 *      at the 1280 floor (912 content column − 2 px of outer border)
 *   4. the identity column absorbs the residual
 *   5. **a `money` or `id` column MUST NOT be the last visible data column**
 *   6. un-hiding a column through `Columns` may push Σ over, and only then does
 *      the table scroll horizontally — operator-initiated, §3.1-sanctioned
 *
 * Rules 3 and 5 are the two a new column can break silently, so they are the
 * two asserted here, per view, over the **real** column factories.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`budget()` below is a placeholder for `assertColumnBudget(columns, innerWidth)`,
 * which §15.3 item 2 assigns to utilities-engineer in `src/lib`.** It is
 * written inline because `src/lib` is not this role's file to add to. When the
 * shared helper lands it takes this body verbatim, this file imports it, and
 * the dev-mode `console.error` §7.3 also asks for gets the same function — one
 * implementation, three call sites, no second arithmetic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, expect, it } from 'vitest'
import type { ColumnDataType, DataColumn } from './columns'
import { captainColumns } from '@/screens/operations/people/CaptainsView'
import { applicationColumns } from '@/screens/operations/people/ApplicationsView'
import { complianceColumns } from '@/screens/operations/people/ComplianceView'
import { riderColumns } from '@/screens/operations/people/RidersView'

/** §7.3 — the table's inner width at the 1280 floor: 912 content − 2 border. */
export const TABLE_INNER_WIDTH_1280 = 910

/** §7.3 rule 5 — the two types a reader cannot tell have been truncated. */
const UNTRAILABLE: ReadonlySet<ColumnDataType> = new Set<ColumnDataType>(['money', 'id'])

interface BudgetInput {
  /** Every declared column, hidden ones included — the factory's own output. */
  readonly columns: ReadonlyArray<DataColumn<never>>
  /**
   * The implicit lanes the component adds and no screen declares: the
   * selection checkbox (40) and the actions lane (56 for a kebab, 116 for a
   * decision triad — §7.8). They spend the same budget, so they are counted.
   */
  readonly lanes: number
  readonly innerWidth?: number
}

interface BudgetResult {
  readonly sum: number
  readonly innerWidth: number
  readonly flexible: readonly string[]
  readonly trailing: string | null
  readonly violations: readonly string[]
}

function budget({ columns, lanes, innerWidth = TABLE_INNER_WIDTH_1280 }: BudgetInput): BudgetResult {
  const shown = columns.filter((column) => column.defaultHidden !== true)
  const violations: string[] = []

  const flexible = shown.filter((column) => column.width === undefined).map((column) => column.id)
  if (flexible.length !== 1) {
    violations.push(
      `rule 2: exactly one column may be flexible, found ${flexible.length} [${flexible.join(', ')}]`,
    )
  }

  const sum = shown.reduce(
    (total, column) => total + (column.width ?? column.minWidth ?? 0),
    lanes,
  )
  if (sum > innerWidth) {
    violations.push(`rule 3: Σ = ${sum} exceeds the ${innerWidth} inner width by ${sum - innerWidth}`)
  }

  const last = shown[shown.length - 1]
  const trailing = last?.id ?? null
  if (last !== undefined) {
    const type = last.dataType ?? (last.align === 'end' ? 'number' : 'text')
    if (UNTRAILABLE.has(type)) {
      violations.push(`rule 5: the trailing data column "${last.id}" has dataType "${type}"`)
    }
  }

  return { sum, innerWidth, flexible, trailing, violations }
}

/* ─────────────────────── the four views, really built ─────────────────────── */

const t = ((key: string) => key) as never
const language = 'en' as never
const href = (() => '/') as never

/**
 * Applications is the one factory that takes a dependency bag rather than
 * positional arguments. Nothing here calls a `cell`, so the callbacks are never
 * invoked; they exist so the factory can be constructed.
 */
const applicationDeps = {
  t,
  language,
  now: '2026-06-24T09:00:00.000Z',
  canWrite: true,
  currentUserId: 'USR-1',
  detailHref: href,
  rowErrors: new Map(),
  actorName: () => '',
  onClaim: () => undefined,
  onRelease: () => undefined,
  onTakeOver: () => undefined,
  onApprove: () => undefined,
  onReject: () => undefined,
} as never

const VIEWS: ReadonlyArray<{ name: string; input: BudgetInput }> = [
  {
    name: 'Captains',
    /* index mode: a selection lane (40) and a kebab lane (56). */
    input: { columns: captainColumns(t, language, href) as never, lanes: 40 + 56 },
  },
  {
    name: 'Applications',
    /* queue mode without `bulkClaim`: no selection lane. The decision triad
       lane is 116 (§7.8) and today it is the `decision` COLUMN, so the lane
       itself is 0 until §15.2 item 11 moves it. */
    input: { columns: applicationColumns(applicationDeps) as never, lanes: 40 },
  },
  {
    name: 'Compliance',
    input: {
      columns: complianceColumns(t, language, '2026-06-24T09:00:00.000Z' as never, href) as never,
      lanes: 40 + 56,
    },
  },
  {
    name: 'Riders',
    input: { columns: riderColumns(t, language, href) as never, lanes: 40 + 56 },
  },
]

describe('§7.3 — the width contract', () => {
  it.each(VIEWS)(
    '$name fits the 910px inner width and does not end on money or an id',
    ({ input }) => {
      const result = budget(input)
      expect(result.violations).toEqual([])
    },
  )

  it('rejects a set whose Σ overflows', () => {
    const result = budget({
      columns: [
        { id: 'a', header: 'A', minWidth: 200, cell: () => null },
        { id: 'b', header: 'B', width: 800, cell: () => null },
      ],
      lanes: 40,
    })
    expect(result.sum).toBe(1040)
    expect(result.violations).toHaveLength(1)
    expect(result.violations[0]).toContain('rule 3')
  })

  it('rejects a set whose trailing data column is money', () => {
    const result = budget({
      columns: [
        { id: 'a', header: 'A', minWidth: 200, cell: () => null },
        { id: 'earned', header: 'Earned (SAR)', width: 128, dataType: 'money', cell: () => null },
      ],
      lanes: 40,
    })
    expect(result.violations).toEqual([
      'rule 5: the trailing data column "earned" has dataType "money"',
    ])
  })

  it('rejects a set whose trailing data column is an id', () => {
    const result = budget({
      columns: [
        { id: 'a', header: 'A', minWidth: 200, cell: () => null },
        { id: 'ref', header: 'ID', width: 112, dataType: 'id', cell: () => null },
      ],
      lanes: 40,
    })
    expect(result.violations).toEqual(['rule 5: the trailing data column "ref" has dataType "id"'])
  })

  it('ignores default-hidden columns — rule 6 is operator-initiated', () => {
    const result = budget({
      columns: [
        { id: 'a', header: 'A', minWidth: 200, cell: () => null },
        { id: 'b', header: 'B', width: 200, cell: () => null },
        { id: 'huge', header: 'Huge', width: 900, defaultHidden: true, cell: () => null },
      ],
      lanes: 40,
    })
    expect(result.violations).toEqual([])
  })
})
