/**
 * **Wave 2's two chart-chrome items, and the three claims a screenshot cannot
 * make** — the Amplitude-parity plan §A9, §A10 and §A11 / principle 5.
 *
 * Each of these is a statement the rendering asserts and the eye cannot check:
 *
 *   **The comparison row names its own day.** The two windows are zipped by
 *   INDEX — a like-for-like previous period has different dates by definition,
 *   so joining on the date would drop every comparison point — and until
 *   `Row.comparisonLabel` the tooltip printed the dashed reading under the
 *   current window's date, unmarked. A screenshot of that tooltip looks
 *   correct. It is the wrong day.
 *
 *   **The tooltip mirrors and the plot does not.** §9.2 pins `dir="ltr"` on
 *   the plot area and the SVG axis group and on nothing else; Recharts renders
 *   the tooltip INSIDE that pinned div rather than in a portal, so the card
 *   inherited it and laid Arabic copy out left-to-right. Both halves are
 *   asserted, because a fix that unpinned the plot would pass a test that only
 *   checked the tooltip.
 *
 *   **The export says what it is a slice of.** `components/table/csv.ts` exists
 *   because *"a CSV of bare numbers with no window is unattributable the moment
 *   it reaches a spreadsheet"*. A file that downloads is not a file that is
 *   attributable, and only its text can say which it is.
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTranslator, resetAnnouncer, currentAnnouncement } from '@/lib'
import { AR, EN } from '@/i18n/dictionaries'
import type { MetricBreakdown, MetricBreakdownRow, SeriesPoint, TimeSeries } from '@/data/types'
import { BreakdownList, type BreakdownScope } from './BreakdownList'
import { ChartCard } from './ChartCard'
import { TrendChart, TrendTooltip } from './TrendChart'

/* The download is the one impure edge in the export path. Mocked so the FILE
   can be asserted — the point of the feature is the text, not the click. */
vi.mock('@/screens/reports/csv', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/screens/reports/csv')>()
  return { ...actual, downloadCsv: vi.fn() }
})
import { downloadCsv } from '@/screens/reports/csv'

const t = createTranslator({ dictionary: EN })
const tAr = createTranslator({ dictionary: AR })
const AS_OF = '2026-06-25T09:14:00+03:00'

const point = (day: number, value: number | null): SeriesPoint => ({
  at: `2026-06-${String(day).padStart(2, '0')}`,
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
      points: [point(19, 12), point(20, 14), point(21, 9)],
    },
    comparison: {
      periodStart: '2026-06-12',
      periodEnd: '2026-06-14',
      points: [point(12, 20), point(13, 22), point(14, 18)],
    },
    higherIsBetter: false,
    awaitingStore: null,
    ...over,
  }
}

/* ════════════ §A10 — the tooltip names the right day, twice ═══════════════ */

/** What Recharts hands the `content` element: one entry per drawn series. */
const payloadFor = (over: Partial<Record<'current' | 'comparison', number | null>> = {}) => [
  {
    dataKey: 'current' as const,
    value: over.current ?? 9,
    payload: { label: '21 Jun', comparisonLabel: '14 Jun', current: 9, comparison: 18 },
  },
  {
    dataKey: 'comparison' as const,
    value: over.comparison ?? 18,
    payload: { label: '21 Jun', comparisonLabel: '14 Jun', current: 9, comparison: 18 },
  },
]

describe('TrendTooltip — the comparison row names its OWN day (§A10)', () => {
  it('states the comparison bucket, and it is not the current bucket', () => {
    render(<TrendTooltip active payload={payloadFor()} unit="count" t={t} language="en" />)

    /* The heading is the current window's day, once. */
    expect(screen.getByText('21 Jun')).toBeInTheDocument()
    /* And the dashed row carries the day it was actually measured on. */
    expect(screen.getByText('on 14 Jun')).toBeInTheDocument()
    /* The defect this replaces: one date over two readings from two days. */
    expect(screen.queryByText('on 21 Jun')).not.toBeInTheDocument()
  })

  it('gives the current row no second date — the heading already is its day', () => {
    render(<TrendTooltip active payload={payloadFor()} unit="count" t={t} language="en" />)
    /* Exactly one `on {date}` line, and it belongs to the comparison. */
    expect(screen.getAllByText(/^on /u)).toHaveLength(1)
  })

  it('says nothing about a day it has none for', () => {
    /* A comparison window shorter than the current one: this index falls off
       its end, so there is no date to name and none is invented. */
    render(
      <TrendTooltip
        active
        payload={[
          {
            dataKey: 'current',
            value: 9,
            payload: { label: '21 Jun', comparisonLabel: null, current: 9, comparison: null },
          },
        ]}
        unit="count"
        t={t}
        language="en"
      />,
    )
    expect(screen.queryByText(/^on /u)).not.toBeInTheDocument()
  })

  it('renders a gap as an em dash, never as a zero', () => {
    render(
      <TrendTooltip
        active
        payload={[
          {
            dataKey: 'current',
            value: null,
            payload: { label: '21 Jun', comparisonLabel: null, current: null, comparison: null },
          },
        ]}
        unit="count"
        t={t}
        language="en"
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('renders nothing when it is not active — no empty card under the cursor', () => {
    const { container } = render(<TrendTooltip unit="count" t={t} language="en" />)
    expect(container).toBeEmptyDOMElement()
  })
})

/* ════════════ §9.2 — the tooltip mirrors, the plot does not ═══════════════ */

describe('the direction pin (§9.2)', () => {
  it('gives the tooltip card the PAGE direction, in both languages', () => {
    const { container: ar } = render(
      <TrendTooltip active payload={payloadFor()} unit="count" t={tAr} language="ar" />,
    )
    expect(ar.firstElementChild).toHaveAttribute('dir', 'rtl')

    const { container: en } = render(
      <TrendTooltip active payload={payloadFor()} unit="count" t={t} language="en" />,
    )
    expect(en.firstElementChild).toHaveAttribute('dir', 'ltr')
  })

  it('leaves the PLOT pinned to ltr in Arabic — the rule the tooltip is the exception to', () => {
    const { container } = render(
      <TrendChart series={series()} description="Open signals" t={tAr} language="ar" />,
    )
    const plot = container.querySelector('[role="img"]')
    expect(plot).toHaveAttribute('dir', 'ltr')
    /* And nothing inside it re-declares a direction: a reversed time axis makes
       the axis and its numerals run in opposite directions, which is the defect
       the rule names. */
    expect(plot?.querySelector('[dir="rtl"]')).toBeNull()
  })

  it('mirrors nothing by transform — a caret or a mark is not flipped (§9.5)', () => {
    const { container } = render(
      <MemoryRouter>
        <ChartCard series={series()} reportHref="/management/risk" t={tAr} language="ar" />
      </MemoryRouter>,
    )
    /* **NARROWED to everything but the `Open analysis` action, and the
       narrowing is the rule rather than an exception to it.**

       §9.5's line is not *nothing flips*; it is *a mark that encodes a
       direction of READING flips, and a mark that encodes anything else does
       not*. When this was written the card carried two marks and both were on
       the far side of that line: a delta caret, which is a magnitude on the
       vertical axis, and the header's arrow, which pointed out of the card.

       §E7 replaced that arrow with `Open analysis`, whose trailing arrow IS a
       reading mark -- *"and then, the analysis"* -- so in Arabic it points the
       other way. It is the one element allowed to, and this proves it is the
       ONLY one by removing it and re-checking the rest of the card. The claim
       is therefore stronger than it was, not weaker: it now says which element
       mirrors as well as which do not. */
    const action = container.querySelector('[data-slot="open-analysis"]')
    expect(action, 'the one mark that may mirror is missing').not.toBeNull()
    expect(action?.querySelector('svg')?.getAttribute('class')).toMatch(/rtl:rotate-180/u)
    action?.remove()

    const html = container.innerHTML
    /* `rtl:` variants, a mirrored transform and a rotation are the three ways a
       glyph gets flipped for Arabic. None of the three belongs on a chart:
       a delta caret is a magnitude on the vertical axis and the `↗` points out
       of the card, so neither is a direction of reading. */
    expect(html).not.toMatch(/\brtl:/u)
    expect(html).not.toMatch(/\b-?scale-x-/u)
    expect(html).not.toMatch(/\brotate-/u)
  })
})

/* ════════════ §A9 — the scale names its unit ══════════════════════════════ */

describe('the legend names the unit the scale is in (§A9)', () => {
  const renderCard = (over: Partial<TimeSeries>, language: 'en' | 'ar' = 'en') =>
    render(
      <MemoryRouter>
        <ChartCard
          series={series(over)}
          reportHref={null}
          t={language === 'ar' ? tAr : t}
          language={language}
        />
      </MemoryRouter>,
    )

  it('names riyals on a money series — the one chart whose marks are rescaled', () => {
    /* `TrendChart` divides money marks by 100, so a revenue plot's scale reads
       `300 / 200` with no currency anywhere on the panel. This is the sentence
       that makes those two numbers mean something. */
    renderCard({ unit: 'money', currency: 'SAR' })
    expect(screen.getByText('Measured in riyals')).toBeInTheDocument()
  })

  it('names the unit of every other measure from the series, not from a default', () => {
    const cases: Array<[TimeSeries['unit'], string]> = [
      ['count', 'Measured in counts'],
      ['percent', 'Measured in per cent'],
      ['minutes', 'Measured in minutes'],
      ['rating', 'Measured in rating points'],
      ['ratio', 'Measured in multiples'],
    ]
    for (const [unit, sentence] of cases) {
      const { unmount } = renderCard({ unit })
      expect(screen.getByText(sentence), `${unit} names no unit`).toBeInTheDocument()
      unmount()
    }
  })

  it('sits in the legend row and not inside the SVG (§9.2)', () => {
    /* §9.2 forbids giving the axis group a direction, so an Arabic axis title
       would neither shape nor align. The noun belongs to the chrome, which
       mirrors. */
    const { container } = renderCard({ unit: 'money', currency: 'SAR' }, 'ar')
    const line = screen.getByText('وحدة القياس: الريالات')
    expect(line.closest('svg')).toBeNull()
    expect(container.querySelector('[data-slot="card-footer"]')?.contains(line)).toBe(true)
  })

  it('says nothing when there is no plot to put a scale under', () => {
    renderCard({ current: { periodStart: '2026-06-19', periodEnd: '2026-06-21', points: [] } })
    expect(screen.queryByText(/^Measured in/u)).not.toBeInTheDocument()
  })
})

/* ════════════ §A11 / principle 5 — the export ═════════════════════════════ */

function row(over: Partial<MetricBreakdownRow> = {}): MetricBreakdownRow {
  return {
    id: 'ZON-01',
    label: { kind: 'text', text: 'Al Narjis' },
    subLabelKey: null,
    subLabelParams: null,
    value: 42,
    unit: 'percent',
    currency: null,
    barFraction: null,
    drilldownRoute: null,
    ...over,
  }
}

function breakdown(over: Partial<MetricBreakdown> = {}): MetricBreakdown {
  return {
    key: 'performance.captainsByLateShare',
    dimension: 'captain',
    rowsShown: 5,
    rowsTotal: 14,
    bar: false,
    caveat: null,
    awaitingStore: null,
    rows: [row(), row({ id: 'ZON-02', label: { kind: 'text', text: 'Al Yasmin' }, value: 31 })],
    ...over,
  }
}

const SCOPE: BreakdownScope = {
  subTabId: 'management-performance',
  period: { start: '2026-06-19', end: '2026-06-25' },
}

function renderList(b: MetricBreakdown, scope: BreakdownScope | null = SCOPE) {
  return render(
    <MemoryRouter>
      <BreakdownList breakdown={b} scope={scope} t={t} language="en" />
    </MemoryRouter>,
  )
}

/** Click `Export CSV` and hand back the text that reached `downloadCsv`. */
function exported(b: MetricBreakdown = breakdown()): { filename: string; text: string } {
  renderList(b)
  fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
  const call = vi.mocked(downloadCsv).mock.calls.at(-1)
  expect(call, 'nothing was handed to downloadCsv').toBeDefined()
  return { filename: call?.[0] ?? '', text: call?.[1] ?? '' }
}

describe('BreakdownList — the export (§A11, principle 5)', () => {
  beforeEach(() => {
    vi.mocked(downloadCsv).mockClear()
    resetAnnouncer()
  })

  it('states the board and the sub-tab it was read from', () => {
    const { text } = exported()
    expect(text).toContain('"table","metrics-management-performance"')
    expect(text).toContain('"filter","board eq management"')
    expect(text).toContain('"filter","sub_tab eq performance"')
    /* And which of the board's lists it is. */
    expect(text).toContain('"view","performance.captainsByLateShare"')
  })

  it('states the window the figures cover', () => {
    const { text } = exported()
    expect(text).toContain('"filter","window between 2026-06-19 2026-06-25"')
  })

  it('says point-in-time rather than leaving the window blank', () => {
    /* A board made entirely of point-in-time figures has no range. A blank
       field reads as a window somebody forgot to record. */
    renderList(breakdown(), { subTabId: 'operations-overview', period: null })
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
    expect(vi.mocked(downloadCsv).mock.calls.at(-1)?.[1]).toContain(
      '"filter","window eq point-in-time"',
    )
  })

  it('states rowsShown of rowsTotal, so a slice cannot pass for the whole ranking', () => {
    const { text } = exported()
    expect(text).toContain('"rows","2"')
    expect(text).toContain('"total_matching","14"')
  })

  it('quotes a value containing a comma, so the columns do not shift', () => {
    /* The reason `components/table/csv.ts` quotes every field: this dataset
       carries names written in Arabic and names carrying commas, and one
       unquoted comma silently moves every column to its right. */
    const { text } = exported(
      breakdown({ rows: [row({ label: { kind: 'text', text: 'Al Narjis, Riyadh' } })] }),
    )
    expect(text).toContain('"Al Narjis, Riyadh"')
    expect(text).not.toContain(',Al Narjis, Riyadh,')
  })

  it('doubles an embedded quote — RFC 4180, not an escape character', () => {
    const { text } = exported(
      breakdown({ rows: [row({ label: { kind: 'text', text: 'The "Ring Road" zone' } })] }),
    )
    expect(text).toContain('"The ""Ring Road"" zone"')
  })

  it('exports the value unformatted, and money in integer halalas', () => {
    /* §8.3.1 holds all the way to the file: `884.00 SAR` is text a spreadsheet
       cannot sum, and the operator gets a column they have to retype. */
    const { text } = exported(
      breakdown({ rows: [row({ value: 88_400, unit: 'money', currency: 'SAR' })] }),
    )
    expect(text).toContain('"88400","money","SAR"')
    expect(text).not.toContain('884.00')
  })

  it('names the ranking rather than a sort direction it cannot know', () => {
    /* Three of the seven lists rank ascending — `least likely to renew` is one
       — so `value desc` would be false on those. `rank asc` is true of all. */
    const { text } = exported()
    expect(text).toContain('"sort","rank asc"')
    expect(text).toContain('"1"')
  })

  it('gives the file an ASCII name, so a translated heading never reaches disk', () => {
    const { filename } = exported()
    expect(filename).toMatch(/^[\w.-]+\.csv$/u)
    expect(filename).toContain('metrics-management-performance')
  })

  it('announces the outcome rather than toasting it (§13.6)', async () => {
    exported()
    await vi.waitFor(() => expect(currentAnnouncement()).toBe('Exported 2 rows'))
  })

  it('offers no export where the file could not say what it is a slice of', () => {
    /* No scope, no attribution, no button. An unattributable CSV is the defect
       `components/table/csv.ts` was written to prevent. */
    renderList(breakdown(), null)
    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument()
  })

  it('offers no export where there is nothing ranked to export', () => {
    renderList(breakdown({ rows: [] }))
    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument()
    /* R5-11 — and not on a list awaiting a store either: a file of no rows
       under a heading claiming a ranking is a claim the data cannot make. */
    renderList(breakdown({ awaitingStore: 'contact-log' }))
    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument()
  })

  it('is reachable by keyboard with a visible ring (§7.2)', () => {
    renderList(breakdown())
    const button = screen.getByRole('button', { name: 'Export CSV' })
    button.focus()
    expect(button).toHaveFocus()
    expect(button.className).toMatch(/focus-visible:/u)
  })
})
