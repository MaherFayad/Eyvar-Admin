/**
 * **A chart's number is never alone** — §A8's second principle on the metric
 * boards, and §3.7's *"title, report link, value, delta, chart, legend"*.
 *
 * `ChartCard` grew a headline numeral and stopped there: a quantity with no
 * delta, no baseline and no statement of which way it had gone, on a panel
 * whose whole subject is movement. What is asserted here is what a screenshot
 * cannot show —
 *
 *   the delta exists on BOTH kinds of headline, the metric's and the series'
 *   own window total, and the two are the same anatomy;
 *
 *   the read sentence is DERIVED, so moving a point moves the sentence;
 *
 *   the no-baseline branch says so in words rather than leaving a bare number;
 *
 *   `trendRead` itself, as a pure function, at the boundaries a rendered test
 *   cannot reach cheaply.
 *
 * `metrics.test.tsx` owns the four states of a window and the tile's own delta
 * rules; nothing here restates them.
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import type { Metric, SeriesPoint, TimeSeries } from '@/data/types'
import { ChartCard } from './ChartCard'
import { seriesWindowDelta, trendRead } from './formatMetric'

const t = createTranslator({ dictionary: EN })
const AS_OF = '2026-06-25T09:14:00+03:00'
/** `chart.management.risk.openSignals`. The sentence names it. */
const TITLE = 'Open signals'

const day = (n: number, value: number | null): SeriesPoint => ({
  at: `2026-06-${String(18 + n).padStart(2, '0')}`,
  value,
})

function series(over: Partial<TimeSeries> = {}): TimeSeries {
  return {
    key: 'management.risk.openSignals',
    subTabId: 'management-risk',
    unit: 'count',
    currency: null,
    asOf: AS_OF,
    current: {
      periodStart: '2026-06-19',
      periodEnd: '2026-06-21',
      points: [day(1, 10), day(2, 20), day(3, 30)],
    },
    comparison: null,
    higherIsBetter: true,
    awaitingStore: null,
    ...over,
  }
}

function metric(over: Partial<Metric> = {}): Metric {
  return {
    key: 'management.risk.openSignals',
    subTabId: 'management-risk',
    category: 'risk',
    rank: 'supporting',
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
    caption: null,
    absenceReason: null,
    sourceResource: 'drivers',
    drilldownRoute: '/operations/people?view=captains',
    ...over,
  }
}

const ROSE = metric({
  comparison: {
    kind: 'previous-period',
    value: 40,
    periodStart: '2026-06-12',
    periodEnd: '2026-06-18',
  },
  deltaPercent: 30,
  direction: 'up',
})

function renderCard(s: TimeSeries, headline: Metric | null = null) {
  return render(
    <MemoryRouter>
      <ChartCard series={s} reportHref={null} headline={headline} t={t} language="en" />
    </MemoryRouter>,
  )
}

/* ───────────── §3.7 — value, delta, then the plot, in that order ────────── */

describe('the chart headline states a quantity AND a change', () => {
  it('draws the delta beside the metric numeral, with its caret and its clause', () => {
    const { container } = renderCard(series(), ROSE)
    expect(screen.getByText('52')).toBeInTheDocument()
    expect(screen.getByText('+30%')).toBeInTheDocument()
    const caret = container.querySelector('svg.lucide-arrow-up')
    expect(caret?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText('up, which is better')).toBeInTheDocument()
  })

  it('puts value and delta BEFORE the plot', () => {
    renderCard(series(), ROSE)
    const value = screen.getByText('52')
    const plot = screen.getByRole('img')
    expect(value.compareDocumentPosition(plot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('reads the movement in one sentence, naming the baseline window', () => {
    renderCard(series(), ROSE)
    expect(screen.getByText(`${TITLE} is up 30% against 12 Jun – 18 Jun.`)).toBeInTheDocument()
  })

  it('isolates that sentence — a title, a percentage and a date range in one line', () => {
    renderCard(series(), ROSE)
    const sentence = screen.getByText(`${TITLE} is up 30% against 12 Jun – 18 Jun.`)
    expect(sentence.tagName.toLowerCase()).toBe('bdi')
    /* §5.4 — the classes belong on the BOX, never on the `<bdi>`. */
    expect(sentence.getAttribute('class')).toBeNull()
  })
})

/* ───── the branch a card must not skip: no comparison, said in words ────── */

describe('with nothing to compare against, the card says so', () => {
  it('renders the no-baseline sentence and an em dash, never 0%', () => {
    renderCard(series(), metric())
    expect(
      screen.getByText('No comparison period yet, so there is no trend to state.'),
    ).toBeInTheDocument()
    expect(screen.getByText('—').getAttribute('aria-hidden')).toBe('true')
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })

  it('keeps the number — the value is not withheld along with the delta', () => {
    renderCard(series(), metric())
    expect(screen.getByText('52')).toBeInTheDocument()
  })

  it('treats a TARGET as no comparison PERIOD, because a target is a level', () => {
    renderCard(
      series(),
      metric({
        comparison: {
          kind: 'target',
          value: 40,
          setByUserId: 'usr-1',
          effectiveFrom: '2026-06-01',
        },
        deltaPercent: 30,
        direction: 'up',
      }),
    )
    expect(
      screen.getByText('No comparison period yet, so there is no trend to state.'),
    ).toBeInTheDocument()
    /* The delta against the target is still stated — only the PERIOD sentence
       is withheld, because there is no period to name. */
    expect(screen.getByText('+30%')).toBeInTheDocument()
  })
})

/* ── the eight charts no metric owns: the series' own declared window rule ── */

describe('a chart with no metric of its own derives both halves the same way', () => {
  const WITH_COMPARISON = series({
    windowTotal: 'sum',
    comparison: {
      periodStart: '2026-06-16',
      periodEnd: '2026-06-18',
      points: [day(-2, 5), day(-1, 10), day(0, 15)],
    },
  })

  it('states the window total, its delta and the read', () => {
    renderCard(WITH_COMPARISON)
    expect(screen.getByText('60')).toBeInTheDocument()
    expect(screen.getByText('+100%')).toBeInTheDocument()
    expect(screen.getByText(`${TITLE} is up 100% against 16 Jun – 18 Jun.`)).toBeInTheDocument()
  })

  it('reads TimeSeries.higherIsBetter, which no chart component read before', () => {
    renderCard({ ...WITH_COMPARISON, higherIsBetter: false })
    expect(screen.getByText('up, which is worse')).toBeInTheDocument()
  })

  it('says there is no trend when the series carries no comparison window', () => {
    renderCard(series({ windowTotal: 'sum' }))
    expect(screen.getByText('60')).toBeInTheDocument()
    expect(
      screen.getByText('No comparison period yet, so there is no trend to state.'),
    ).toBeInTheDocument()
  })
})

/* ─────────────────── the derivations, as pure functions ─────────────────── */

describe('trendRead is derived, and has no silent branch', () => {
  const baseline = { from: '2026-06-16', to: '2026-06-18' }

  it('turns the same title into three different sentences as the delta moves', () => {
    const keys = [12, -12, 0].map(
      (deltaPercent) => trendRead({ title: TITLE, deltaPercent, baseline, language: 'en' }).key,
    )
    expect(keys).toEqual([
      'overview.chart.read.up',
      'overview.chart.read.down',
      'overview.chart.read.flat',
    ])
  })

  it('states a MAGNITUDE, not a signed percent — the direction is in the verb', () => {
    const read = trendRead({ title: TITLE, deltaPercent: -12, baseline, language: 'en' })
    expect(read.params['delta']).toBe('12%')
  })

  it('returns the no-baseline key rather than null, on both of its causes', () => {
    expect(trendRead({ title: TITLE, deltaPercent: null, baseline, language: 'en' }).key).toBe(
      'overview.chart.read.noBaseline',
    )
    expect(trendRead({ title: TITLE, deltaPercent: 5, baseline: null, language: 'en' }).key).toBe(
      'overview.chart.read.noBaseline',
    )
  })
})

describe('seriesWindowDelta refuses every claim it cannot measure', () => {
  const points = (values: (number | null)[]) => ({ points: values.map((v, i) => day(i, v)) })

  it('applies the declared rule to BOTH windows', () => {
    expect(
      seriesWindowDelta({
        windowTotal: 'sum',
        current: points([10, 20, 30]),
        comparison: points([5, 10, 15]),
      }),
    ).toBe(100)
    expect(
      seriesWindowDelta({
        windowTotal: 'last',
        current: points([10, 20, 30]),
        comparison: points([5, 10, 15]),
      }),
    ).toBe(100)
  })

  it('is null — never 0 — where there is nothing to compare', () => {
    expect(
      seriesWindowDelta({ windowTotal: 'sum', current: points([10]), comparison: null }),
    ).toBeNull()
    /* No declared rule: the series has no window total, so it has no delta. */
    expect(
      seriesWindowDelta({ current: points([10]), comparison: points([5]) }),
    ).toBeNull()
    /* All gaps on one side. A sum over no readings is unknown, not zero. */
    expect(
      seriesWindowDelta({
        windowTotal: 'sum',
        current: points([10]),
        comparison: points([null]),
      }),
    ).toBeNull()
    /* A comparison of zero is not an infinite rise. */
    expect(
      seriesWindowDelta({ windowTotal: 'sum', current: points([10]), comparison: points([0]) }),
    ).toBeNull()
  })

  it('returns 0 for a real, measured no-change', () => {
    expect(
      seriesWindowDelta({
        windowTotal: 'sum',
        current: points([10, 20]),
        comparison: points([15, 15]),
      }),
    ).toBe(0)
  })
})
