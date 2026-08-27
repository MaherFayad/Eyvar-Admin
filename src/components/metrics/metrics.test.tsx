/**
 * The metric layer's behaviour, against the rules that are easy to break and
 * impossible to see in a screenshot.
 *
 * Two things are tested here rather than by eye, and both are §3.7:
 *
 *   **The kinds of "no data" do not collapse into each other.** A screenshot
 *   shows whichever kind the current fixture happens to produce; only a test
 *   can show that the other three still render differently. `SeriesWindow`'s
 *   own doc comment draws the distinctions and this is where they become
 *   assertions.
 *
 *   **The delta is an em dash exactly when there is no comparison.** §3.7:
 *   *"when no comparison is possible the delta MUST be an em-dash, never `0%`
 *   and never blank"*. `0%` is the OTHER answer and must survive, which is the
 *   assertion people forget.
 *
 * The fixtures below are hand-built `Metric` / `TimeSeries` values, not reads
 * through the client. That is deliberate: the point is to exercise states the
 * seeded data does not currently contain — a gap mid-series, an all-null
 * window, a `0%` delta — and waiting for a fixture to grow one is how a state
 * ships untested.
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import type { Metric, SeriesPoint, TimeSeries } from '@/data/types'
import { ChartCard } from './ChartCard'
import { MetricTile } from './MetricTile'

const t = createTranslator({ dictionary: EN })
const AS_OF = '2026-06-25T09:14:00+03:00'

function metric(over: Partial<Metric> = {}): Metric {
  return {
    key: 'management.overview.activeCaptains',
    subTabId: 'management-overview',
    category: 'supply',
    value: 52,
    unit: 'count',
    currency: null,
    asOf: AS_OF,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    deltaPercent: null,
    direction: null,
    higherIsBetter: true,
    /* Added by mock-data-engineer with R4-4's `Metric.caption`, which is a
       REQUIRED field: this factory would not compile without a default. It is
       a default and nothing else — no assertion in this file was touched, and
       a tile with a caption is unbuilt and untested. Flagged in the wave-4
       handoff. */
    caption: null,
    sourceResource: 'drivers',
    drilldownRoute: '/operations/people?view=captains',
    ...over,
  }
}

function series(points: SeriesPoint[], over: Partial<TimeSeries> = {}): TimeSeries {
  return {
    key: 'management.risk.openSignals',
    subTabId: 'management-risk',
    unit: 'count',
    currency: null,
    asOf: AS_OF,
    current: { periodStart: '2026-06-19', periodEnd: '2026-06-25', points },
    comparison: null,
    higherIsBetter: false,
    ...over,
  }
}

const day = (n: number, value: number | null): SeriesPoint => ({
  at: `2026-06-${String(18 + n).padStart(2, '0')}`,
  value,
})

function renderTile(m: Metric) {
  return render(
    <MemoryRouter>
      <MetricTile metric={m} boardAsOf={AS_OF} t={t} language="en" />
    </MemoryRouter>,
  )
}

function renderCard(s: TimeSeries, reportHref: string | null = null) {
  return render(
    <MemoryRouter>
      <ChartCard series={s} reportHref={reportHref} t={t} language="en" />
    </MemoryRouter>,
  )
}

describe('MetricTile — §3.7 delta rules', () => {
  it('renders an em dash and the reason when there is no comparison, never 0%', () => {
    renderTile(metric())
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('No comparison period yet')).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })

  it('names WHICH kind of missing comparison it is', () => {
    renderTile(metric({ comparison: { kind: 'none', reason: 'no-target' } }))
    expect(screen.getByText('No target set')).toBeInTheDocument()
  })

  it('renders 0% — "measured, did not move" is not "nothing to compare to"', () => {
    renderTile(
      metric({
        comparison: {
          kind: 'previous-period',
          value: 52,
          periodStart: '2026-05-01',
          periodEnd: '2026-05-25',
        },
        deltaPercent: 0,
        direction: 'flat',
      }),
    )
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('uses U+2212 for a negative delta, never a hyphen-minus (§8.3.2)', () => {
    renderTile(
      metric({
        comparison: {
          kind: 'previous-period',
          value: 60,
          periodStart: '2026-05-01',
          periodEnd: '2026-05-25',
        },
        deltaPercent: -12.5,
        direction: 'down',
      }),
    )
    expect(screen.getByText('−12.5%')).toBeInTheDocument()
    expect(screen.queryByText('-12.5%')).not.toBeInTheDocument()
  })

  it('carries the direction as a WORD as well as a caret (§7.5), and spends higherIsBetter on it', () => {
    renderTile(
      metric({
        higherIsBetter: false,
        comparison: {
          kind: 'previous-period',
          value: 40,
          periodStart: '2026-05-01',
          periodEnd: '2026-05-25',
        },
        deltaPercent: 30,
        direction: 'up',
      }),
    )
    expect(screen.getByText('up, which is worse')).toBeInTheDocument()
  })

  it('names the comparison period with dates (§3.7)', () => {
    renderTile(
      metric({
        comparison: {
          kind: 'previous-period',
          value: 40,
          periodStart: '2026-05-01',
          periodEnd: '2026-05-25',
        },
        deltaPercent: 30,
        direction: 'up',
      }),
    )
    expect(screen.getByText('vs 1 May – 25 May')).toBeInTheDocument()
  })

  it('renders an em dash for a value that could not be computed, not a zero', () => {
    renderTile(metric({ value: null }))
    /* Two em dashes: the value and the delta. Neither may be `0`. */
    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('is a link when it has a drilldown and NOT in the tab order when it does not (AC-16, §7.4)', () => {
    const { unmount } = renderTile(metric())
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/operations/people?view=captains',
    )
    unmount()
    renderTile(metric({ drilldownRoute: null }))
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('ChartCard — the four states of a window (§3.7, SeriesWindow)', () => {
  it('an EMPTY window gets §3.7’s sentence, verbatim, with the card and title kept', () => {
    renderCard(series([]), '/management/risk')
    expect(screen.getByText('There was no data found for this date range.')).toBeInTheDocument()
    expect(screen.getByText('Open signals')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the Open signals report' })).toBeInTheDocument()
  })

  it('an ALL-ZERO window says the values are zero — not that the data is missing', () => {
    renderCard(series([day(1, 0), day(2, 0), day(3, 0)]))
    expect(screen.getByText('Every value in this range is zero.')).toBeInTheDocument()
    expect(
      screen.queryByText('There was no data found for this date range.'),
    ).not.toBeInTheDocument()
  })

  it('a window with GAPS counts them in words and does not call itself zero', () => {
    renderCard(series([day(1, 4), day(2, null), day(3, 6), day(4, null)]))
    expect(screen.getByText('No reading on 2 of 4 days.')).toBeInTheDocument()
    expect(screen.queryByText('Every value in this range is zero.')).not.toBeInTheDocument()
  })

  it('an ALL-NULL window is a full house of gaps, not an empty range', () => {
    renderCard(series([day(1, null), day(2, null), day(3, null)]))
    expect(screen.getByText('No reading on 3 of 3 days.')).toBeInTheDocument()
    expect(
      screen.queryByText('There was no data found for this date range.'),
    ).not.toBeInTheDocument()
  })

  it('keeps the comparison legend chip and says why it is empty (§3.7)', () => {
    renderCard(series([day(1, 4), day(2, 5)]))
    expect(screen.getByText('19 Jun – 25 Jun')).toBeInTheDocument()
    expect(screen.getByText('No comparison period yet')).toBeInTheDocument()
  })

  it('names BOTH periods with dates when a comparison exists (§3.7)', () => {
    renderCard(
      series([day(1, 4), day(2, 5)], {
        comparison: {
          periodStart: '2026-06-12',
          periodEnd: '2026-06-18',
          points: [day(1, 3), day(2, 3)],
        },
      }),
    )
    expect(screen.getByText('19 Jun – 25 Jun')).toBeInTheDocument()
    expect(screen.getByText('12 Jun – 18 Jun')).toBeInTheDocument()
  })

  it('gives the plot a text alternative naming the metric and the range (§7.5)', () => {
    renderCard(series([day(1, 4), day(2, 5)]))
    expect(
      screen.getByRole('img', { name: 'Open signals, 19 Jun to 25 Jun' }),
    ).toBeInTheDocument()
  })

  it('pins the plot LTR so the time axis does not reverse in Arabic (§9.2)', () => {
    renderCard(series([day(1, 4), day(2, 5)]))
    expect(screen.getByRole('img')).toHaveAttribute('dir', 'ltr')
  })

  it('drops the legend on an empty window — there is no line to name', () => {
    renderCard(series([]))
    expect(screen.queryByText('19 Jun – 25 Jun')).not.toBeInTheDocument()
  })
})
