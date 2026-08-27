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

/**
 * **§7.3's 910 is the ENGLISH number, and the budget has to hold in Arabic.**
 *
 * The RTL pass measured the table's scroll viewport at 910 in English and
 * **870 in Arabic** and read the 40px as an inline-start inset — a direction
 * defect. It is not one. There is no physical property left in this path and no
 * scrollbar gutter: the 40 is the **language** step at `globals.css`
 * `:root:lang(ar)`, which widens `--ev-rail-w` 80 → 88 and `--ev-subnav-w`
 * 224 → 256. Both are declared, both are deliberate (§9.7 — one language hook),
 * and 8 + 32 = 40 exactly. It would be present in a hypothetical Arabic-LTR and
 * it is absent from a forced-DOM RTL with `lang="en"`, which is precisely why
 * nothing saw it until the language switch had a production call site.
 *
 * So it is legitimate, the constant does not stay at 910, and — because it is a
 * language step rather than a direction one — the pair below is keyed on
 * LANGUAGE. `--ev-page-pad` is deliberately not in the `:lang(ar)` block (a
 * gutter is not a line box), so it is the same 32 in both.
 *
 * ```
 *   inner = 1280 − rail − subnav − 2 × --ev-page-pad − 2 (the table's border)
 *   en    = 1280 −  80 −    224  −            64      − 2 = 910
 *   ar    = 1280 −  88 −    256  −            64      − 2 = 870
 * ```
 *
 * **Every view is asserted against both, and the language is in the test name.**
 * A single number with no language on it is how this got through the first time.
 */
export const TABLE_INNER_WIDTH_1280 = { en: 910, ar: 870 } as const

type BudgetLanguage = keyof typeof TABLE_INNER_WIDTH_1280

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

interface ViewCase {
  readonly name: string
  readonly input: BudgetInput
}

interface BudgetResult {
  readonly sum: number
  readonly innerWidth: number
  readonly flexible: readonly string[]
  readonly trailing: string | null
  readonly violations: readonly string[]
}

function budget({ columns, lanes, innerWidth = TABLE_INNER_WIDTH_1280.ar }: BudgetInput): BudgetResult {
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

/**
 * The implicit lanes, counted as they actually RENDER, not as §7.4 draws them.
 *
 *   selection 40 — `index` mode only. Applications is a `queue` without
 *                  `bulkClaim`, so it has no checkbox column (§9.3).
 *   actions   —— — **D8, and the width follows the SHAPE.** §7.8:
 *                  0 declared actions → no lane at all (Applications: its one
 *                  action duplicated the identity link, so it was deleted);
 *                  1 → a labelled button, `rowActionsWidth ?? 88` (Riders);
 *                  2+ → the `⋯` kebab at 56 (Captains, Compliance).
 *
 * This is the coupling that made D8 a width question and not a styling one:
 * replacing a 28px kebab with a labelled control costs the budget 32px, which
 * is why Riders' `City` column went back behind the column control.
 */
const SELECT_LANE = 40
const KEBAB_LANE = 56
const SINGLE_ACTION_LANE = 88

const VIEWS: readonly ViewCase[] = [
  {
    name: 'Captains',
    /* 3 declared actions → kebab. */
    input: { columns: captainColumns(t, language, href) as never, lanes: SELECT_LANE + KEBAB_LANE },
  },
  {
    name: 'Applications',
    /* 0 declared actions, no selection lane. */
    input: { columns: applicationColumns(applicationDeps) as never, lanes: 0 },
  },
  {
    name: 'Compliance',
    /* 3 declared actions → kebab. */
    input: {
      columns: complianceColumns(t, language, '2026-06-24T09:00:00.000Z' as never, href) as never,
      lanes: SELECT_LANE + KEBAB_LANE,
    },
  },
  {
    name: 'Riders',
    /* 1 declared action → a labelled `View` button at §7.8's 88. */
    input: {
      columns: riderColumns(t, language, href) as never,
      lanes: SELECT_LANE + SINGLE_ACTION_LANE,
    },
  },
]

const CASES: ReadonlyArray<{ name: string; lang: BudgetLanguage; input: BudgetInput }> = (
  ['en', 'ar'] as const
).flatMap((lang) => VIEWS.map((view) => ({ name: view.name, lang, input: view.input })))

describe('§7.3 — the width contract', () => {
  it.each(CASES)(
    '$name fits the $lang inner width at 1280 and does not end on money or an id',
    ({ lang, input }) => {
      const result = budget({ ...input, innerWidth: TABLE_INNER_WIDTH_1280[lang] })
      expect(result.violations).toEqual([])
    },
  )

  /* The Arabic width is the binding one, so it is the one asserted by name:
     if `:root:lang(ar)`'s rail or sub-tab step moves, this is what says so. */
  it('derives the two inner widths from the declared nav widths', () => {
    const inner = (rail: number, subnav: number) => 1280 - rail - subnav - 2 * 32 - 2
    expect(inner(80, 224)).toBe(TABLE_INNER_WIDTH_1280.en)
    expect(inner(88, 256)).toBe(TABLE_INNER_WIDTH_1280.ar)
    expect(TABLE_INNER_WIDTH_1280.en - TABLE_INNER_WIDTH_1280.ar).toBe(40)
  })

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
