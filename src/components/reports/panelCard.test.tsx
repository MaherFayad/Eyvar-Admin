/**
 * **A number is never alone** — §A8's second principle, and §3.7's own anatomy.
 *
 * Four things here cannot be seen in a screenshot and are exactly the four that
 * regress:
 *
 *   **Order.** §3.7: *"title, report link, value, delta, chart, legend — in
 *   that order."* A screenshot of a short card shows a number above a plot
 *   whichever DOM order produced it, once the footer wraps.
 *
 *   **Carriers.** The caret is a SHAPE and the valence clause is TEXT. A visual
 *   check sees the colour, which is the one carrier §7.5 forbids relying on.
 *
 *   **The absent branch.** A delta with nothing to compare against renders the
 *   no-baseline sentence and no mark (O9), not a bare number. This is the
 *   branch a fixture with a comparison in it never exercises.
 *
 *   **Derivation.** The sentence is computed from the data, so moving the data
 *   moves the sentence. A hand-written sentence would pass a presence check
 *   forever.
 *
 * The `ReportResult` below is hand-built rather than run through `runReport`,
 * for the reason `metrics.test.tsx` gives: the point is to exercise states the
 * seeded data does not contain — a flat delta, an absent comparison — and
 * waiting for a fixture to grow one is how a state ships untested.
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
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
const AS_OF = '2026-06-25T09:14:00+03:00'
const NO_DATA = EN['overview.noData'] as string

/* Three complete daily buckets. `comparisonWindow` derives the prior window
   from these, so the dates in the read sentence are the dates the legend's
   dashed chip names — asserted below rather than assumed. */
const BUCKETS = ['2026-06-19', '2026-06-20', '2026-06-21']

const MEASURE: Measure = {
  key: 'captains.registered',
  labelKey: 'rb.panel.other',
  category: 'supply',
  population: {
    resource: 'drivers',
    predicate: [],
    predicateKey: 'rb.panel.other',
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

const PANEL: ReportPanel = {
  panelId: 'p1',
  titleKey: 'rb.panel.measure',
  titleParams: { measure: 'rb.panel.other' },
  unit: 'count',
  currency: null,
  seriesIds: ['s-current', 's-comparison'],
}

/** The title the card renders and the sentence names. `rb.panel.other` is `Other`. */
const TITLE = 'Other'

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
    groupBy: [],
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
  }
}

function renderCard(res: ReportResult, measure: Measure = MEASURE) {
  return render(
    <PanelCard
      panel={PANEL}
      result={res}
      measure={measure}
      kind="line"
      coercedFrom={null}
      onRetrySeries={() => {}}
      noDataSentence={NO_DATA}
      t={t}
      language="en"
    />,
  )
}

/** Current 60 against a comparison of 30 — up 100 %. */
function upResult(): ReportResult {
  return result('previous-period', [
    seriesOf(),
    seriesOf({ id: 's-comparison', role: 'comparison', points: [5, 10, 15] }),
  ])
}

/* ───────────── §3.7's anatomy — the number comes BEFORE the picture ─────── */

describe('§3.7 — value and delta lead the card, the plot follows', () => {
  /**
   * The rule names an ORDER, and an order is a relationship: an assertion that
   * the headline merely exists passes just as well with it in the footer, which
   * is where it was.
   */
  it('renders the headline before the plot in DOM order', () => {
    renderCard(upResult())
    const headline = screen.getByText('60')
    const plot = screen.getByRole('img')
    /* `DOCUMENT_POSITION_FOLLOWING` — the plot comes after the headline. */
    expect(headline.compareDocumentPosition(plot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('leaves the legend in the footer, after the plot', () => {
    renderCard(upResult())
    const plot = screen.getByRole('img')
    const legend = screen.getByText('19 Jun – 21 Jun')
    expect(plot.compareDocumentPosition(legend) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

/* ─────────────── §7.5 — four carriers, and colour is never the one ─────── */

describe('the delta carries direction as a shape and valence as words', () => {
  it('draws a caret that is hidden from a reader, and announces the valence clause', () => {
    const { container } = renderCard(upResult())
    /* A shape, drawn as an SVG icon rather than typed as a Unicode geometric
       character — which Inter does not carry, so the browser falls through to
       a font that paints in colour. */
    const caret = container.querySelector('svg.lucide-arrow-up')
    expect(caret).not.toBeNull()
    expect(caret?.getAttribute('aria-hidden')).toBe('true')
    /* And the clause the caret's hue restates, for everyone who cannot see it.
       `higherIsBetter` is true, so a rise is better. */
    expect(screen.getByText('up, which is better')).toBeInTheDocument()
  })

  it('says a rise is WORSE when the measure says lower is better', () => {
    renderCard(upResult(), { ...MEASURE, higherIsBetter: false })
    expect(screen.getByText('up, which is worse')).toBeInTheDocument()
    expect(screen.queryByText('up, which is better')).not.toBeInTheDocument()
  })

  it('puts the sign in the text, so the delta reads with no stylesheet', () => {
    renderCard(upResult())
    expect(screen.getByText('+100%')).toBeInTheDocument()
  })

  it('never renders alert-threshold copy on a chart that has no threshold', () => {
    renderCard(upResult())
    /* `rb.alert.direction.good` words whether crossing a LINE is good news. It
       used to be announced beside this delta, which told a reader the measure
       was "good" whichever way it had moved. */
    expect(screen.queryByText(EN['rb.alert.direction.good'] as string)).not.toBeInTheDocument()
    expect(screen.queryByText(EN['rb.alert.direction.bad'] as string)).not.toBeInTheDocument()
  })
})

/* ───────────────── §A8 — the plain-English read, derived ────────────────── */

describe('the read sentence is derived, not authored', () => {
  it('states the rise, the magnitude and the baseline window', () => {
    renderCard(upResult())
    expect(screen.getByText(`${TITLE} is up 100% against 16 Jun – 18 Jun.`)).toBeInTheDocument()
  })

  it('moves when the data moves — the same card, a different comparison', () => {
    const { unmount } = renderCard(upResult())
    expect(screen.getByText(`${TITLE} is up 100% against 16 Jun – 18 Jun.`)).toBeInTheDocument()
    unmount()

    /* Same current window, a comparison twice as large: the sentence has to
       flip direction on its own. A hand-written string could not. */
    renderCard(
      result('previous-period', [
        seriesOf(),
        seriesOf({ id: 's-comparison', role: 'comparison', points: [40, 40, 40] }),
      ]),
    )
    expect(screen.getByText(`${TITLE} is down 50% against 16 Jun – 18 Jun.`)).toBeInTheDocument()
    expect(screen.getByText('down, which is worse')).toBeInTheDocument()
  })

  it('says "unchanged" at a measured zero — which is not "nothing to compare to"', () => {
    renderCard(
      result('previous-period', [
        seriesOf(),
        seriesOf({ id: 's-comparison', role: 'comparison', points: [10, 20, 30] }),
      ]),
    )
    expect(screen.getByText(`${TITLE} is unchanged against 16 Jun – 18 Jun.`)).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('names the same window the legend names, so the two cannot drift', () => {
    renderCard(upResult())
    /* The dashed chip and the sentence are two renderings of one
       `comparisonWindow` call. */
    expect(screen.getByText('16 Jun – 18 Jun')).toBeInTheDocument()
    expect(screen.getByText(`${TITLE} is up 100% against 16 Jun – 18 Jun.`)).toBeInTheDocument()
  })
})

/* ────────── the branch a card must not skip: no comparison at all ───────── */

describe('with no comparison the card says so, rather than showing a bare number', () => {
  it('renders the no-baseline sentence and no mark, never 0% (O9)', () => {
    renderCard(result('none', [seriesOf()]))
    expect(
      screen.getByText('No comparison period yet, so there is no trend to state.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })

  it('still states the number — the headline is not withheld with the delta', () => {
    renderCard(result('none', [seriesOf()]))
    expect(screen.getByText('60')).toBeInTheDocument()
  })
})

describe('a window with no line to draw states the sentence and nothing else', () => {
  it('withholds the headline rather than printing two em dashes over it', () => {
    renderCard(result('none', [seriesOf({ points: [null, null, null] })]))
    expect(screen.getByText(NO_DATA)).toBeInTheDocument()
    /* No value, no delta, and — crucially — no read sentence: there is no
       number for it to be about, and §3.7's one centred sentence is the whole
       body. */
    expect(screen.queryByText('—')).not.toBeInTheDocument()
    expect(
      screen.queryByText('No comparison period yet, so there is no trend to state.'),
    ).not.toBeInTheDocument()
  })
})

/* ─────────────────────────── §9.2 — Arabic ──────────────────────────────── */

describe('under dir="rtl" the marks behave', () => {
  function renderRtl(res: ReportResult) {
    document.documentElement.setAttribute('dir', 'rtl')
    const view = render(
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
      />,
      { baseElement: document.body },
    )
    return view
  }

  it('does not mirror the caret — up and down are magnitude, not reading order', () => {
    const { container } = renderRtl(upResult())
    const caret = container.querySelector('svg.lucide-arrow-up')
    expect(caret).not.toBeNull()
    /* §9.5's closed set of marks that do not mirror. No `rtl:` variant and
       no CSS rotation may reach it. */
    const className = caret?.getAttribute('class') ?? ''
    expect(className).not.toMatch(/rtl:/)
    expect(className).not.toMatch(/scale-x/)
    expect(className).not.toMatch(/rotate/)
    document.documentElement.removeAttribute('dir')
  })

  it('isolates the signed numeral, so +100% does not render as 100%+', () => {
    renderRtl(upResult())
    /* `+100%` opens with a bidi-NEUTRAL sign. Without a `<bdi>` the UBA moves
       it to the run's other end in an RTL paragraph. */
    const percent = screen.getByText('+100%')
    expect(percent.tagName.toLowerCase()).toBe('bdi')
    document.documentElement.removeAttribute('dir')
  })

  it('isolates the read sentence, which carries three runs in one line', () => {
    renderRtl(upResult())
    const sentence = screen.getByText(`${TITLE} is up 100% against 16 Jun – 18 Jun.`)
    /* A title, a percentage and a date range. `isolatedRunProps` puts the
       classes on the BOX and the isolation on the run — §5.4's stretched-`bdi`
       defect is unreachable that way. */
    expect(sentence.tagName.toLowerCase()).toBe('bdi')
    expect(sentence.getAttribute('class')).toBeNull()
    expect(sentence.parentElement?.tagName.toLowerCase()).toBe('p')
    document.documentElement.removeAttribute('dir')
  })
})
