/**
 * **The report canvas's hierarchy — the parts of it a browser cannot be asked
 * about, and the parts of it that regress silently.**
 *
 * A rendered audit found this panel setting its one number at `text-base` —
 * 16px, the same step as the card's own title and the same step as the
 * paragraph under it — beneath three lines of catalogue prose, and concluded
 * *"the report canvas has no hierarchy"*. The size itself is a browser fact and
 * `scratch/panel-hierarchy.mjs` measures it (28px on the builder, 20px on a
 * tile, at 1280 / 1440 / 1920). What is asserted **here** is the four things a
 * screenshot cannot settle and a later edit can undo without anybody noticing:
 *
 *   **The step is a token, and it is not the title's.** `text-kpi` against
 *   `CardTitle`'s `text-base` is the whole hierarchy claim. An assertion that
 *   the numeral merely exists passed all the way through the defect.
 *
 *   **The order.** Title, number, plot, legend, population. The rule this
 *   file exists for is that *nothing stands between the name of the thing and
 *   the quantity of it* — and DOM order is what makes that true for a screen
 *   reader as well as for the eye.
 *
 *   **R5-15 survived the demotion.** The population sentence, the caption and
 *   the base are still on the card, still without an interaction, on every
 *   surface and in three of the four bodies. Moving a rule's carrier is only
 *   legitimate while the carrier is still there; deleting one of these three is
 *   the failure this file is aimed at.
 *
 *   **A row is a set.** Two panels whose measures differ — one with a caption
 *   and a board, one with neither — must put the same elements in the same
 *   order above the plot, and must both put the prose below it. That is the
 *   difference between two panels and one row.
 *
 * The `ReportResult` is hand-built rather than run through `runReport`, for the
 * reason `panelCard.test.tsx` gives: the point is to exercise shapes the seeded
 * data does not contain — a measure with no caption beside one with a caption,
 * a failed series next to a live one — and waiting for a fixture to grow one is
 * how a state ships untested.
 */

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { findSubTabById } from '@/data/clients'
import type {
  Measure,
  PeriodComparison,
  ReportPanel,
  ReportQuery,
  ReportResult,
  ReportSeries,
} from '@/data/types'
import { PanelCard } from './PanelCard'

const t = createTranslator({ dictionary: EN })
const copy = (key: string) => EN[key] as string
const AS_OF = '2026-06-25T09:14:00+03:00'
const NO_DATA = EN['overview.noData'] as string
const BUCKETS = ['2026-06-19', '2026-06-20', '2026-06-21']

/**
 * `rb.panel.other` is `Other` and `rb.pop.drivers.all` is the catalogue's own
 * captain population — two different strings, so an assertion about the
 * population sentence cannot pass by accidentally matching the title.
 */
const POPULATION = copy('rb.pop.drivers.all')
const CAPTION = copy('rb.caption.captains.registered')
const MEASURE: Measure = {
  key: 'captains.registered',
  labelKey: 'rb.panel.other',
  category: 'supply',
  population: {
    resource: 'drivers',
    predicate: [],
    predicateKey: 'rb.pop.drivers.all',
    timeField: 'createdAt',
    valueField: null,
    coverage: { from: '2026-01-01', to: '2026-06-25' },
  },
  temporality: 'flow',
  bucketAggregate: 'sum',
  additive: true,
  unit: 'count',
  currency: null,
  higherIsBetter: true,
  minGrain: 'day',
  dimensions: [],
  filterableFields: [],
  permission: null,
  captionKey: null,
  displayedAsMetricKeys: [],
}

/** The neighbour in a row: a caption AND a board, where the first has neither. */
const RICHER: Measure = {
  ...MEASURE,
  captionKey: 'rb.caption.captains.registered',
  displayedAsMetricKeys: ['management.growth.registeredRiders'],
}

const PANEL: ReportPanel = {
  panelId: 'p1',
  titleKey: 'rb.panel.measure',
  titleParams: { measure: 'rb.panel.other' },
  unit: 'count',
  currency: null,
  seriesIds: ['s-current', 's-comparison'],
}

function seriesOf(over: Partial<ReportSeries> = {}): ReportSeries {
  return {
    id: 's-current',
    measureKey: MEASURE.key,
    groupValue: null,
    role: 'current',
    panelId: 'p1',
    unit: 'count',
    currency: null,
    temporality: 'flow',
    points: [10, 20, 30],
    partialBucketIndexes: [],
    blocked: null,
    failed: null,
    ...over,
  }
}

function query(periodComparison: PeriodComparison): ReportQuery {
  return {
    measures: [{ key: MEASURE.key }],
    groupBy: null,
    filters: [],
    window: { kind: 'absolute', from: BUCKETS[0] as string, to: BUCKETS[2] as string },
    grain: 'day',
    periodComparison,
    chartType: 'line',
  }
}

function result(
  periodComparison: PeriodComparison,
  series: ReportSeries[],
  over: Partial<ReportResult> = {},
): ReportResult {
  return {
    query: query(periodComparison),
    asOf: AS_OF,
    buckets: BUCKETS,
    panels: [PANEL],
    series,
    truncated: false,
    truncatedAtRows: null,
    warnings: [],
    foldedGroupCount: null,
    ...over,
  }
}

function upResult(): ReportResult {
  return result('previous-period', [
    seriesOf(),
    seriesOf({ id: 's-comparison', role: 'comparison', points: [5, 10, 15] }),
  ])
}

function renderCard(
  res: ReportResult = upResult(),
  props: Partial<React.ComponentProps<typeof PanelCard>> = {},
) {
  return render(
    <MemoryRouter>
      <PanelCard
        panel={PANEL}
        result={res}
        measure={MEASURE}
        kind="line"
        coercedFrom={null}
        onRetrySeries={() => {}}
        noDataSentence={NO_DATA}
        t={t}
        language="en"
        {...props}
      />
    </MemoryRouter>,
  )
}

/** The card's one number, as an element. `60` is the sum of `[10, 20, 30]`. */
function numeral(container: HTMLElement): HTMLElement {
  const node = container.querySelector('[data-slot="metric-value"]')
  expect(node, 'the headline carries no metric-value slot').not.toBeNull()
  return node as HTMLElement
}

/** `a` comes before `b` in the document. */
function precedes(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

/* ═══════ 1 — the number is the answer, and it is a rung of its own ═══════ */

describe('the headline is a numeral rung, not body copy', () => {
  /**
   * **The defect, as an assertion.** `text-base` here was the same step as
   * `CardTitle`'s and the same step as the read sentence's — one size doing
   * three jobs, which is the arithmetic definition of no hierarchy. The step
   * has to be a KPI rung and it has to differ from the title's.
   */
  it('sets the builder panel at the page numeral step, not the card title step', () => {
    const { container } = renderCard()
    const value = numeral(container)
    expect(value.className).toContain('text-kpi')
    expect(value.className).not.toContain('text-base')

    const title = container.querySelector('[data-slot="card-title"]') as HTMLElement
    expect(title.className).toContain('text-base')
    /* Two different steps. If a later edit moves either onto the other's, the
       card is back to a number the same size as its own heading. */
    expect(value.className).not.toBe(title.className)
  })

  /**
   * **The tile takes the step below, and the switch is `framed`.** A dashboard
   * tile draws its own 16px heading, its range and its freshness above these
   * panels, and a split tile stacks nine of them — so the page's numeral there
   * would outrank the tile's own title. `--text-lg` is the ramp's sub-display
   * rung and shares `--text-kpi`'s 32px line box, so the switch changes the
   * voice and not the height.
   */
  it('drops the tile a rung, off the same signal that drops the frame', () => {
    const { container } = renderCard(upResult(), { framed: false })
    const value = numeral(container)
    expect(value.className).toContain('text-lg')
    expect(value.className).not.toContain('text-kpi')
  })

  /**
   * The tabular guarantee travels on the SLOT, pinned in `@layer base`, exactly
   * as `MetricTile` and `ChartCard` carry it. A hand-written `tabular-nums`
   * beside the size class would restate a guarantee at a call site free to omit
   * it, which is the mechanism §H4 declines to rely on.
   */
  it('carries the figures on the slot rather than on a hand-written class', () => {
    const { container } = renderCard()
    const value = numeral(container)
    expect(value.getAttribute('data-slot')).toBe('metric-value')
    expect(value.className).not.toContain('tabular-nums')
  })

  /** A money value splits, so `SAR` sets at the caption's step and not the numeral's. */
  it('sets a currency word beside the numeral, not inside it', () => {
    const money: ReportPanel = { ...PANEL, unit: 'money', currency: 'SAR' }
    render(
      <MemoryRouter>
        <PanelCard
          panel={money}
          result={result('none', [seriesOf({ unit: 'money', currency: 'SAR' })], {
            panels: [money],
          })}
          measure={{ ...MEASURE, unit: 'money', currency: 'SAR' }}
          kind="line"
          coercedFrom={null}
          onRetrySeries={() => {}}
          noDataSentence={NO_DATA}
          t={t}
          language="en"
        />
      </MemoryRouter>,
    )
    /* Two elements, not one string. `formatMoney` reads the wire's minor
       units, so a rollup of 60 halalas is `0.60` — the figure is not the point
       here; the SPLIT is. One string at 28px was measurably wider than the
       panel on the board that solved this first. */
    expect(screen.getByText('0.60')).toBeInTheDocument()
    expect(screen.getByText('SAR')).toBeInTheDocument()
  })
})

/* ══════ 2 — nothing stands between the title and the number any more ═════ */

describe('the order: title, number, plot, legend, population', () => {
  it('puts the numeral in the card header, with no prose between it and the title', () => {
    const { container } = renderCard(upResult(), { measure: RICHER })
    const header = container.querySelector('[data-slot="card-header"]') as HTMLElement
    expect(header.contains(numeral(container))).toBe(true)
    /* The three catalogue lines used to be a `CardDescription` in this header.
       Their absence from it IS the fix; their presence at the foot is asserted
       below. */
    expect(header.querySelector('[data-slot="card-description"]')).toBeNull()
    expect(within(header).queryByText(POPULATION)).not.toBeInTheDocument()
    expect(within(header).queryByText(CAPTION)).not.toBeInTheDocument()
  })

  it('runs number, then plot, then legend, then population', () => {
    const { container } = renderCard(upResult(), { measure: RICHER })
    const value = numeral(container)
    const plot = screen.getByRole('img')
    const legend = screen.getByText('19 Jun – 21 Jun')
    const population = container.querySelector('[data-slot="panel-population"]') as HTMLElement

    expect(precedes(value, plot)).toBe(true)
    expect(precedes(plot, legend)).toBe(true)
    expect(precedes(legend, population)).toBe(true)
  })
})

/* ════════════ 3 — R5-15 survived being demoted. Nothing was cut ══════════ */

describe('R5-15 — the population is still on the card, in every body', () => {
  /**
   * All three sentences, on screen, with no interaction. This is the assertion
   * that a later "tidy the foot" edit has to break in order to break the rule.
   */
  it('states the population, the caption and the base, under the plot', () => {
    const { container } = renderCard(upResult(), { measure: RICHER })
    const foot = container.querySelector('[data-slot="panel-population"]') as HTMLElement
    expect(foot).not.toBeNull()
    expect(within(foot).getByText(POPULATION)).toBeInTheDocument()
    expect(within(foot).getByText(CAPTION)).toBeInTheDocument()
    /* Derived from the response — three buckets, three readings. */
    expect(within(foot).getByText('3 of 3 buckets have a reading.')).toBeInTheDocument()
    /* Not behind a disclosure: no `<details>`, no trigger, nothing to open. */
    expect(container.querySelector('details')).toBeNull()
  })

  it('states it on a dashboard tile too — the screenshot that travels furthest', () => {
    const { container } = renderCard(upResult(), { measure: RICHER, framed: false })
    const foot = container.querySelector('[data-slot="panel-population"]') as HTMLElement
    expect(within(foot).getByText(POPULATION)).toBeInTheDocument()
    expect(within(foot).getByText(CAPTION)).toBeInTheDocument()
  })

  it('keeps the population on a FAILED series, and withholds only the base', () => {
    const { container } = renderCard(
      result('none', [seriesOf({ failed: { code: 'timeout', retryable: true } })]),
      { measure: RICHER },
    )
    const foot = container.querySelector('[data-slot="panel-population"]') as HTMLElement
    expect(within(foot).getByText(POPULATION)).toBeInTheDocument()
    /* `0 of 3` would be a measurement nobody took: there is no response to
       count readings in. The population and the caption are facts about the
       MEASURE and survive. */
    expect(within(foot).queryByText(/buckets have a reading/)).not.toBeInTheDocument()
    expect(screen.getByText(copy('rb.panel.failed'))).toBeInTheDocument()
  })

  it('keeps it on a BLOCKED series, where the reader is told what they cannot see', () => {
    const { container } = renderCard(
      result('none', [seriesOf({ blocked: 'view_finance' })]),
      { measure: RICHER },
    )
    const foot = container.querySelector('[data-slot="panel-population"]') as HTMLElement
    expect(within(foot).getByText(POPULATION)).toBeInTheDocument()
    expect(within(foot).queryByText(/buckets have a reading/)).not.toBeInTheDocument()
  })

  it('keeps it on a window with no reading at all', () => {
    const { container } = renderCard(
      result('none', [seriesOf({ points: [null, null, null] })]),
      { measure: RICHER },
    )
    const foot = container.querySelector('[data-slot="panel-population"]') as HTMLElement
    expect(within(foot).getByText(POPULATION)).toBeInTheDocument()
    expect(screen.getByText(NO_DATA)).toBeInTheDocument()
  })

  /** Three translated sentences, three isolated runs — never one concatenation. */
  it('isolates each sentence, because each carries its own numerals and names', () => {
    const { container } = renderCard(upResult(), { measure: RICHER })
    const foot = container.querySelector('[data-slot="panel-population"]') as HTMLElement
    expect(foot.tagName.toLowerCase()).toBe('p')
    expect(within(foot).getByText(POPULATION).tagName.toLowerCase()).toBe('bdi')
    expect(within(foot).getByText(CAPTION).tagName.toLowerCase()).toBe('bdi')
    expect(
      within(foot).getByText('3 of 3 buckets have a reading.').tagName.toLowerCase(),
    ).toBe('bdi')
  })
})

/* ═══════════════════ 4 — two panels, one row, one shape ══════════════════ */

describe('a row of panels reads as a set', () => {
  /**
   * The audit's third finding: *"two panels in one row have different
   * affordances, so the row reads as inconsistent rather than as a set"*. The
   * two here differ in every way a catalogue entry can — one declares a
   * caption and a board, the other declares neither — and everything above the
   * plot has to be identical anyway.
   */
  it('puts the same elements in the same order above the plot on both', () => {
    const bare = render(
      <MemoryRouter>
        <PanelCard
          panel={PANEL}
          result={upResult()}
          measure={MEASURE}
          kind="line"
          coercedFrom={null}
          onRetrySeries={() => {}}
          noDataSentence={NO_DATA}
          related
          t={t}
          language="en"
        />
      </MemoryRouter>,
    )
    const richer = render(
      <MemoryRouter>
        <PanelCard
          panel={PANEL}
          result={upResult()}
          measure={RICHER}
          kind="line"
          coercedFrom={null}
          onRetrySeries={() => {}}
          noDataSentence={NO_DATA}
          related
          t={t}
          language="en"
        />
      </MemoryRouter>,
    )

    const slots = (view: { container: HTMLElement }) =>
      Array.from(
        (view.container.querySelector('[data-slot="card-header"]') as HTMLElement).children,
      ).map((node) => node.getAttribute('data-slot') ?? 'headline')

    /* Title, corner chrome, headline — and nothing else, on both. */
    expect(slots(bare)).toEqual(['card-title', 'card-action', 'headline'])
    expect(slots(richer)).toEqual(slots(bare))
  })

  /**
   * **§P4's anchor is in the card foot on the panel that has one**, which is
   * the placement fix. As a sibling of the plot it added a row to that panel
   * alone, so one card's legend sat a row below its neighbour's. In the footer
   * it closes the legend row instead.
   */
  it('carries the board action inside the legend footer, not under the plot', () => {
    const { container } = renderCard(upResult(), { measure: RICHER, related: true })
    const action = screen.getByRole('link', {
      name: copy('rb.panel.action.open').replace(
        '{board}',
        copy(findSubTabById('management-growth')?.titleKey ?? ''),
      ),
    })
    const footers = Array.from(container.querySelectorAll('[data-slot="card-footer"]'))
    const legendFooter = footers[0] as HTMLElement
    /* The FIRST footer is the legend's, and the action is in it — beside the
       two dated chips rather than above them. */
    expect(legendFooter.className).toContain('justify-center')
    expect(legendFooter.contains(action)).toBe(true)
    expect(within(legendFooter).getByText('19 Jun – 21 Jun')).toBeInTheDocument()
    /* And after the plot, so it is still the plot's action. */
    expect(precedes(screen.getByRole('img'), action)).toBe(true)
  })

  /**
   * Equalising the two panels must not mean inventing a destination for the one
   * that declares none — an empty `displayedAsMetricKeys` is a claim.
   */
  it('offers no action at all where the measure declares no board', () => {
    renderCard(upResult(), { measure: MEASURE, related: true })
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryByText(/^Open the /)).not.toBeInTheDocument()
  })
})

/* ═════════════════════════ 5 — §9.2 / §9.5, Arabic ═══════════════════════ */

describe('under dir="rtl" the new marks behave', () => {
  function renderRtl(props: Partial<React.ComponentProps<typeof PanelCard>> = {}) {
    document.documentElement.setAttribute('dir', 'rtl')
    return renderCard(upResult(), props)
  }

  it('isolates the numeral, so 12,571.55 SAR does not reorder', () => {
    const { container } = renderRtl()
    const value = numeral(container)
    /* The `<bdi>` is WRAPPED rather than styled: a stretched `<bdi>` derives
       its own direction from its content and flushes the digits to its own
       start, which is the defect `MetricTile` records. The span keeps the
       page's direction; the `<bdi>` isolates the run and nothing more. */
    expect(value.firstElementChild?.tagName.toLowerCase()).toBe('bdi')
    document.documentElement.removeAttribute('dir')
  })

  it('leaves the board action’s glyph unmirrored — it is an object, not a direction', () => {
    const { container } = renderRtl({ measure: RICHER, related: true })
    const glyph = container.querySelector('a[data-slot="panel-action"] svg')
    expect(glyph).not.toBeNull()
    const className = glyph?.getAttribute('class') ?? ''
    expect(className).not.toMatch(/rtl:/)
    expect(className).not.toMatch(/scale-x/)
    expect(className).not.toMatch(/rotate/)
    document.documentElement.removeAttribute('dir')
  })

  it('keeps the foot and the action on logical utilities only', () => {
    const { container } = renderRtl({ measure: RICHER, related: true })
    const feet = Array.from(container.querySelectorAll('[data-slot="card-footer"]'))
    const classes = feet
      .flatMap((foot) => [foot, ...Array.from(foot.querySelectorAll('*'))])
      .map((node) => node.getAttribute('class') ?? '')
      .join(' ')
    expect(classes).not.toMatch(/\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)/)
    document.documentElement.removeAttribute('dir')
  })
})
