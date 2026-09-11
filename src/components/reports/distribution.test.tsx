/**
 * **A pie tile and a line tile are one object, or `DSH-1` is two products.**
 *
 * `PanelCard` moved to Amplitude's anatomy — the numeral directly under the
 * title, at `--text-kpi` on the builder and `--text-lg` on a tile, with the
 * three lines of catalogue prose demoted to the card foot. `DistributionCard`
 * did not, and it draws **positions 2 and 3 of `DSH-1` side by side**: a line
 * tile leading with a 20px number beside a pie tile leading with a paragraph
 * and no number at all. Measured before, at 1440 (`scratch/dist-ladder.mjs`):
 * both panel titles 16, numerals `20` / *none*, prose at the foot / in the
 * header.
 *
 * The sizes are browser facts and `scratch/dist-ladder.mjs` measures them at
 * 1280 / 1440 / 1920 in both languages. What is asserted **here** is what a
 * screenshot cannot settle and a later edit can undo silently:
 *
 *   **The two cards take the same rung from the same prop.** Both assertions
 *   are in one file on purpose: the previous pass built the tile ladder,
 *   measured it, and declined to ship it *because these two files would have
 *   disagreed*. A test that pins only one of them re-opens exactly that.
 *
 *   **The order, and the slot the prose sits in.** Title, numeral, plot, parts,
 *   prose — and the prose in a `card-footer` rather than a `card-description`,
 *   which is the move R5-15 survived rather than a tidy-up.
 *
 *   **The total is stated only where the catalogue licences it.** `additive` is
 *   the field whose own doc says *"may this be summed … across groups"*; the
 *   planner enforces it for the PIE and not for the BAR distribution this same
 *   component draws. A sum of averages set at 28px is the highest-severity
 *   defect class in this module, and it is invisible to a green suite unless
 *   something asserts the refusal.
 *
 *   **There is no delta and no derived read sentence**, and that is a decision
 *   with two reasons rather than an omission — see the component header. Pinned
 *   here so the next reader who notices the gap does not fill it with a
 *   baseline `comparisonWindow` cannot honestly compute at `grain: 'none'`.
 *
 * The shipped block runs **`RPT-4`** — the one saved query that makes a pie
 * legal under §7.2's five gates — through `runReport`, so the arithmetic is
 * checked against the fixture rather than against a mock of it. Everything
 * crosses the client seam (`seam.test.ts` §4).
 */

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { EYVAR_TODAY, getReport, listMeasures, runReport } from '@/data/clients'
import type {
  Measure,
  ReportPanel,
  ReportQuery,
  ReportResult,
  ReportSeries,
} from '@/data/types'
import { DistributionCard } from './DistributionCard'
import { PanelCard } from './PanelCard'

const t = createTranslator({ dictionary: EN })
const copy = (key: string) => EN[key] as string
const NO_DATA = copy('overview.noData')
const BUCKET = '2026-06-01'

let measuresByKey: Record<string, Measure> = {}
/** `subscriptions.started` — additive, `count`, three plan values. */
let additive: Measure
/** `trips.cancellationRate` — a rate. Never additive, and a bar split is still legal. */
let rate: Measure

beforeAll(async () => {
  const page = await listMeasures({ pageSize: 100 })
  measuresByKey = Object.fromEntries(page.items.map((m) => [m.key, m]))
  additive = measuresByKey['subscriptions.started'] as Measure
  rate = measuresByKey['trips.cancellationRate'] as Measure
})

/* ─────────────────────────── hand-built shapes ─────────────────────────── */

function partPanel(measure: Measure, group: string): ReportPanel {
  return {
    panelId: `p-${group}`,
    titleKey: 'rb.panel.measureByGroup',
    titleParams: { measure: measure.labelKey, group },
    unit: measure.unit,
    currency: measure.currency,
    seriesIds: [`s-${group}`],
  }
}

function partSeries(measure: Measure, group: string, value: number | null): ReportSeries {
  return {
    id: `s-${group}`,
    measureKey: measure.key,
    groupValue: group,
    role: 'current',
    panelId: `p-${group}`,
    unit: measure.unit,
    currency: measure.currency,
    temporality: measure.temporality,
    points: [value],
    partialBucketIndexes: [],
    blocked: null,
    failed: null,
  }
}

/** One collapsed bucket, one measure, N groups — the shape a distribution IS. */
function distributionResult(
  measure: Measure,
  groups: readonly (readonly [string, number | null])[],
  over: Partial<ReportResult> = {},
): ReportResult {
  return {
    query: {
      measures: [{ key: measure.key }],
      groupBy: measure.dimensions[0] ? [measure.dimensions[0].key] : [],
      filters: [],
      window: { kind: 'absolute', from: BUCKET, to: '2026-06-30' },
      grain: 'none',
      periodComparison: 'none',
      chartType: 'pie',
    },
    asOf: '2026-06-25T09:14:00+03:00',
    buckets: [BUCKET],
    panels: groups.map(([group]) => partPanel(measure, group)),
    series: groups.map(([group, value]) => partSeries(measure, group, value)),
    truncated: false,
    truncatedAtRows: null,
    warnings: [],
    foldedGroupCount: null,
    ...over,
  }
}

function renderDistribution(
  result: ReportResult,
  props: Partial<React.ComponentProps<typeof DistributionCard>> = {},
) {
  const measure = props.measure === undefined ? additive : props.measure
  return render(
    <MemoryRouter>
      <DistributionCard
        panels={result.panels}
        result={result}
        measure={measure}
        kind="pie"
        title={measure ? copy(measure.labelKey) : ''}
        t={t}
        language="en"
        {...props}
      />
    </MemoryRouter>,
  )
}

/** The card's one number, or `null` where it declined to state one. */
function numeral(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[data-slot="metric-value"]')
}

function precedes(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

/* ══════════ 1 — the two cards are the same object at every rung ══════════ */

describe('the pie card and the line card take the same steps from the same prop', () => {
  /** The trend panel beside it, built on the same measure. */
  function trendPanelResult(): { result: ReportResult; panel: ReportPanel } {
    const panel: ReportPanel = {
      panelId: 'trend',
      titleKey: 'rb.panel.measure',
      titleParams: { measure: additive.labelKey },
      unit: additive.unit,
      currency: additive.currency,
      seriesIds: ['s-trend'],
    }
    const result: ReportResult = {
      query: {
        measures: [{ key: additive.key }],
        groupBy: [],
        filters: [],
        window: { kind: 'absolute', from: '2026-06-19', to: '2026-06-21' },
        grain: 'day',
        periodComparison: 'none',
        chartType: 'line',
      },
      asOf: '2026-06-25T09:14:00+03:00',
      buckets: ['2026-06-19', '2026-06-20', '2026-06-21'],
      panels: [panel],
      series: [{ ...partSeries(additive, 'x', 1), id: 's-trend', panelId: 'trend', points: [10, 20, 30] }],
      truncated: false,
      truncatedAtRows: null,
      warnings: [],
      foldedGroupCount: null,
    }
    return { result, panel }
  }

  function renderTrend(framed: boolean) {
    const { result, panel } = trendPanelResult()
    return render(
      <MemoryRouter>
        <PanelCard
          panel={panel}
          result={result}
          measure={additive}
          kind="line"
          coercedFrom={null}
          onRetrySeries={() => {}}
          noDataSentence={NO_DATA}
          framed={framed}
          t={t}
          language="en"
        />
      </MemoryRouter>,
    )
  }

  const parts = () =>
    distributionResult(additive, [
      ['weekly', 26],
      ['monthly', 22],
    ])

  const titleClass = (view: { container: HTMLElement }) =>
    (view.container.querySelector('[data-slot="card-title"]') as HTMLElement).className

  const valueClass = (view: { container: HTMLElement }) =>
    (numeral(view.container) as HTMLElement).className

  /**
   * **The ladder the previous pass measured and could not ship from one file.**
   * A tile draws its own 16px report name above these panels, so a 16px panel
   * title inside it ranks the part above the whole. 14 puts the panel name
   * below the tile's name and below its own number, which is the order a reader
   * needs: *which tile · what it says · which panel said it*.
   */
  it('drops BOTH panel titles to text-sm on a tile, and neither on the builder', () => {
    expect(titleClass(renderTrend(false))).toContain('text-sm')
    expect(titleClass(renderDistribution(parts(), { framed: false }))).toContain('text-sm')

    expect(titleClass(renderTrend(true))).toContain('text-base')
    expect(titleClass(renderDistribution(parts(), { framed: true }))).toContain('text-base')
  })

  it('sets BOTH numerals at the page rung on the builder and the step below on a tile', () => {
    expect(valueClass(renderTrend(true))).toContain('text-kpi')
    expect(valueClass(renderDistribution(parts(), { framed: true }))).toContain('text-kpi')

    expect(valueClass(renderTrend(false))).toContain('text-lg')
    expect(valueClass(renderDistribution(parts(), { framed: false }))).toContain('text-lg')
  })

  /** The rung claim is only a claim while the two steps differ. */
  it('keeps the numeral off the title’s step on the pie card too', () => {
    const view = renderDistribution(parts())
    expect(valueClass(view)).not.toContain('text-base')
    expect(valueClass(view)).not.toBe(titleClass(view))
  })

  it('puts the same three things in the same order in both headers', () => {
    const slots = (view: { container: HTMLElement }) =>
      Array.from(
        (view.container.querySelector('[data-slot="card-header"]') as HTMLElement).children,
      ).map((node) => node.getAttribute('data-slot') ?? 'headline')

    expect(slots(renderDistribution(parts()))).toEqual(['card-title', 'card-action', 'headline'])
    expect(slots(renderTrend(true))).toEqual(slots(renderDistribution(parts())))
  })

  /**
   * The tabular guarantee travels on the SLOT, pinned in `@layer base`. Shared
   * because the numeral is one component; asserted because a future inline copy
   * of it would pass everything above and drop this.
   */
  it('carries the figures on the slot rather than a hand-written class', () => {
    const value = numeral(renderDistribution(parts()).container) as HTMLElement
    expect(value.getAttribute('data-slot')).toBe('metric-value')
    expect(value.className).not.toContain('tabular-nums')
  })
})

/* ═══════ 2 — the order, and the slot the catalogue prose moved into ══════ */

describe('title, number, plot, parts, prose — and the prose is at the foot', () => {
  const result = () =>
    distributionResult(additive, [
      ['weekly', 26],
      ['monthly', 22],
    ])

  it('leaves nothing between the name of the thing and the quantity of it', () => {
    const { container } = renderDistribution(result())
    const header = container.querySelector('[data-slot="card-header"]') as HTMLElement
    expect(header.contains(numeral(container) as Node)).toBe(true)
    /* The three catalogue lines used to BE this header's `CardDescription`.
       Their absence from it is the fix; their presence at the foot is below. */
    expect(container.querySelector('[data-slot="card-description"]')).toBeNull()
    expect(within(header).queryByText(copy(additive.population.predicateKey))).not.toBeInTheDocument()
  })

  it('runs number, then plot, then the parts, then the prose', () => {
    const { container } = renderDistribution(result())
    const value = numeral(container) as HTMLElement
    const plot = screen.getByRole('img')
    const list = container.querySelector('[data-slot="part-list"]') as HTMLElement
    const prose = container.querySelector('[data-slot="panel-population"]') as HTMLElement

    expect(precedes(value, plot)).toBe(true)
    expect(precedes(plot, list)).toBe(true)
    expect(precedes(list, prose)).toBe(true)
  })

  /**
   * **R5-15 survived the demotion.** The population predicate and the base are
   * on screen, unconditionally, with no interaction — the same guarantee the
   * rule had when they sat above the number, reached in two seconds instead of
   * being waded through.
   */
  it('states the population and the base at the foot, never behind a disclosure', () => {
    const { container } = renderDistribution(result())
    const foot = container.querySelector('[data-slot="panel-population"]') as HTMLElement
    expect(foot).not.toBeNull()
    expect(foot.closest('[data-slot="card-footer"]')).not.toBeNull()
    expect(within(foot).getByText(copy(additive.population.predicateKey))).toBeInTheDocument()
    expect(within(foot).getByText('2 of 2 groups have a reading.')).toBeInTheDocument()
    expect(container.querySelector('details')).toBeNull()
  })

  it('states it on a dashboard tile too — the screenshot that travels furthest', () => {
    const { container } = renderDistribution(result(), { framed: false })
    const foot = container.querySelector('[data-slot="panel-population"]') as HTMLElement
    expect(within(foot).getByText(copy(additive.population.predicateKey))).toBeInTheDocument()
    expect(within(foot).getByText('2 of 2 groups have a reading.')).toBeInTheDocument()
  })

  /** Three translated sentences, three isolated runs — never one concatenation. */
  it('isolates each sentence, because each carries its own numerals and names', () => {
    const { container } = renderDistribution(result())
    const foot = container.querySelector('[data-slot="panel-population"]') as HTMLElement
    expect(foot.tagName.toLowerCase()).toBe('p')
    expect(within(foot).getByText(copy(additive.population.predicateKey)).tagName.toLowerCase()).toBe('bdi')
    expect(within(foot).getByText('2 of 2 groups have a reading.').tagName.toLowerCase()).toBe('bdi')
  })
})

/* ═════════ 3 — the total is stated only where it can be stated ═══════════ */

describe('the whole, across the parts — or nothing', () => {
  it('sums the parts when the catalogue says they may be summed', () => {
    const { container } = renderDistribution(
      distributionResult(additive, [
        ['weekly', 26],
        ['biweekly', 22],
        ['monthly', 22],
      ]),
    )
    expect((numeral(container) as HTMLElement).textContent).toBe('70')
  })

  /**
   * **The defect this refusal exists for.** `trips.cancellationRate` is a
   * `mean` over `percent`, `additive: false`, and §7.2 calls a pie of it
   * *"arithmetic nonsense wearing a chart"*. The planner refuses the PIE on
   * that ground — and does **not** refuse the BAR distribution this same
   * component draws, so the shape arrives here legally. Three rates summed is a
   * number no operator asked for, set at the largest step on the card.
   */
  it('states NO number for a non-additive measure, which the bar branch can reach', () => {
    const { container } = renderDistribution(
      distributionResult(rate, [
        ['riyadh', 12],
        ['jeddah', 9],
      ]),
      { measure: rate, kind: 'bar' },
    )
    expect(rate.additive).toBe(false)
    expect(numeral(container)).toBeNull()
    /* 12 + 9. The figure the unguarded version would have printed. */
    expect(container.textContent).not.toContain('21')
  })

  it('states no number when the caller could not resolve the measure at all', () => {
    const { container } = renderDistribution(
      distributionResult(additive, [['weekly', 26]]),
      { measure: null },
    )
    expect(numeral(container)).toBeNull()
  })

  /**
   * `declaredAggregate`'s test, the one `ResultTable`'s summary column and
   * `PanelCard`'s headline both run: a resolver that re-declares `unit` has
   * changed what the series counts, so `additive` describes what it used to
   * count. No resolver produces a `grain: 'none'` split today; the guard is
   * here because the whole class of defect is one routing change away.
   */
  it('states no number when a part re-declares its unit', () => {
    const result = distributionResult(additive, [
      ['weekly', 26],
      ['monthly', 22],
    ])
    const poisoned: ReportResult = {
      ...result,
      series: result.series.map((s, i) => (i === 1 ? { ...s, unit: 'percent' } : s)),
    }
    expect(numeral(renderDistribution(poisoned).container)).toBeNull()
  })

  /**
   * A gap is not a zero. The part stays in the list — it is a named group with
   * no reading — and out of the sum, and the FOOT states the denominator, which
   * is R5-15's requirement applied to a total.
   */
  it('sums only the parts that have a reading, and says how many that was', () => {
    const { container } = renderDistribution(
      distributionResult(additive, [
        ['weekly', 26],
        ['biweekly', null],
        ['monthly', 22],
      ]),
    )
    expect((numeral(container) as HTMLElement).textContent).toBe('48')
    const foot = container.querySelector('[data-slot="panel-population"]') as HTMLElement
    expect(within(foot).getByText('2 of 3 groups have a reading.')).toBeInTheDocument()
    /* The gap is still a row, and it reads as a gap. */
    const rows = container.querySelectorAll('[data-slot="part-list"] li')
    expect(rows).toHaveLength(3)
  })

  /** A sum over no readings is not zero, it is unknown — `rollup.ts`'s rule. */
  it('states no number when every group is a gap', () => {
    const { container } = renderDistribution(
      distributionResult(additive, [
        ['weekly', null],
        ['monthly', null],
      ]),
    )
    expect(numeral(container)).toBeNull()
    expect(container.querySelector('[data-slot="part-list"]')?.children).toHaveLength(2)
  })

  /**
   * §7.4's fold is part of the whole. `Other` is the smallest groups added
   * together, so excluding it would understate the total by exactly the amount
   * the fold hid — and the pill above the list already says a cap was applied.
   */
  it('counts the folded Other into the total, because the fold is part of the whole', () => {
    const { container } = renderDistribution(
      distributionResult(
        additive,
        [
          ['weekly', 26],
          [copy('rb.panel.other'), 4],
        ],
        { foldedGroupCount: 3 },
      ),
    )
    expect((numeral(container) as HTMLElement).textContent).toBe('30')
    expect(screen.getByText(copy('rb.panel.top').replace('{count}', '1'))).toBeInTheDocument()
  })
})

/* ═══ 4 — no delta and no read sentence, and that is the decision ═════════ */

describe('a parts chart states no movement, because it draws no axis to move along', () => {
  const result = () =>
    distributionResult(
      additive,
      [
        ['weekly', 26],
        ['monthly', 22],
      ],
      /* A comparison the operator CAN set: `ChartToolbar` offers it at every
         grain, so this is a reachable query rather than a hypothetical. */
      { query: { ...distributionResult(additive, []).query, periodComparison: 'previous-period' } },
    )

  /**
   * At `grain: 'none'` the window collapses to ONE bucket, so `buckets` holds a
   * single date and the result carries no resolved window end.
   * `comparisonWindow({from: b, to: b})` therefore returns a **one-day**
   * baseline — a range nobody measured. Every form of §3.7's read sentence
   * names its baseline by date, so stating one here means printing that range.
   */
  it('renders none of §3.7’s read sentences, which all name a baseline by date', () => {
    const { container } = renderDistribution(result())
    /* The headline column holds the numeral row and NOTHING ELSE. `PanelCard`
       puts its read sentence in exactly this slot, as the second child, so an
       added sentence lands here and this is the assertion it has to pass. */
    const column = (numeral(container) as HTMLElement).parentElement?.parentElement as HTMLElement
    expect(column.className).toContain('col-start-1')
    expect(column.children).toHaveLength(1)

    /* The one form with no placeholders in it, so the match is a real string
       rather than a fragment of a template. The other three name their baseline
       by date and `comparisonWindow` cannot honestly produce one here. */
    expect(container.textContent).not.toContain(copy('overview.chart.read.noBaseline'))
    /* And no `<p>` of grey prose anywhere above the plot. */
    const header = container.querySelector('[data-slot="card-header"]') as HTMLElement
    expect(header.querySelectorAll('p')).toHaveLength(0)
  })

  it('renders no delta — no caret, no percentage, no em dash standing in for one', () => {
    const { container } = renderDistribution(result())
    /* The positive control: the headline row IS drawn, so the assertions below
       are about what is beside the number rather than about an absent card. */
    const row = (numeral(container) as HTMLElement).parentElement as HTMLElement
    expect(row.textContent).toBe('48')

    /* `MetricDelta`'s three renderings, none of which may be here. It carries
       no `data-slot`, so each is matched by what it actually draws: a caret
       glyph, the signed percentage, or the em dash it uses for an absent one. */
    expect(row.querySelector('svg.lucide-arrow-up, svg.lucide-arrow-down')).toBeNull()
    expect(row.textContent).not.toContain('—')
    expect(container.textContent).not.toMatch(/\d\s*%/)
    /* And the `sr-only` clause a delta always announces beside itself. */
    expect(container.textContent).not.toContain(copy('overview.delta.flat'))
    expect(container.textContent).not.toContain(copy('overview.delta.upBetter'))
    expect(container.textContent).not.toContain(copy('overview.delta.downWorse'))
  })
})

/* ═════════════════ 5 — §9.1 / §9.2, and the token floor ═════════════════ */

describe('under dir="rtl" the new marks behave', () => {
  const result = () =>
    distributionResult(additive, [
      ['weekly', 26],
      ['monthly', 22],
    ])

  it('isolates the numeral, so 12,571.55 SAR does not reorder', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const { container } = renderDistribution(result())
    /* WRAPPED rather than styled: a stretched `<bdi>` derives its own direction
       from its content and flushes the digits to its own start. */
    expect((numeral(container) as HTMLElement).firstElementChild?.tagName.toLowerCase()).toBe('bdi')
    document.documentElement.removeAttribute('dir')
  })

  it('carries no physical direction utility anywhere on the card', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const { container } = renderDistribution(result())
    for (const node of Array.from(container.querySelectorAll<HTMLElement>('*'))) {
      expect(
        node.getAttribute('class') ?? '',
        `${node.tagName} carries a physical direction`,
      ).not.toMatch(/(?:^|\s)(?:ml|mr|pl|pr|border-l|border-r|rounded-l|rounded-r|text-left|text-right)-/)
    }
    document.documentElement.removeAttribute('dir')
  })

  /** The plot is the one thing that does NOT mirror (§9.2). */
  it('pins the figure to ltr while the card and the list mirror', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const { container } = renderDistribution(result())
    expect((screen.getByRole('img') as HTMLElement).getAttribute('dir')).toBe('ltr')
    expect(container.querySelector('[data-slot="part-list"]')?.getAttribute('dir')).toBeNull()
    document.documentElement.removeAttribute('dir')
  })
})

/* ═══════════ 6 — RPT-4, the shipped query that makes a pie legal ═════════ */

describe('the shipped distribution: RPT-4, position 3 on DSH-1', () => {
  let result: ReportResult
  let measure: Measure

  beforeAll(async () => {
    const saved = await getReport('RPT-4')
    expect(saved.data.pinnedToDashboardIds).toContain('DSH-1')
    const outcome = await runReport(saved.data.query as ReportQuery, { today: EYVAR_TODAY })
    expect(outcome.status).toBe('ok')
    result = (outcome as { status: 'ok'; result: ReportResult }).result
    /* The premise: one collapsed bucket, one additive measure, a real split. */
    expect(result.query.grain).toBe('none')
    expect(result.buckets).toHaveLength(1)
    const key = (result.series[0] as ReportSeries).measureKey
    measure = measuresByKey[key] as Measure
    expect(measure.additive).toBe(true)
  })

  /**
   * The arithmetic, against the card's own list rather than against a constant:
   * the headline has to be what the rows beneath it add up to, or the reader is
   * being asked to trust two numbers that disagree on one card.
   */
  it('states a headline equal to the parts it draws', () => {
    const { container } = render(
      <MemoryRouter>
        <DistributionCard
          panels={result.panels}
          result={result}
          measure={measure}
          kind="pie"
          title={copy(measure.labelKey)}
          t={t}
          language="en"
        />
      </MemoryRouter>,
    )
    const rows = [...container.querySelectorAll('[data-slot="part-list"] li')]
    expect(rows.length).toBeGreaterThan(1)
    const summed = rows.reduce((total, row) => {
      const shown = (row.lastElementChild?.textContent ?? '').replace(/,/g, '')
      return total + (Number.isFinite(Number(shown)) ? Number(shown) : 0)
    }, 0)
    expect(summed).toBeGreaterThan(0)
    expect((numeral(container) as HTMLElement).textContent).toBe(String(summed))
  })
})
