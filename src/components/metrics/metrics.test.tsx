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
 * Three more arrived with R4-4 and are tested the same way:
 *
 *   **The caption renders, and it is not the label.** Nineteen seeded tiles
 *   carry a `caption` and nothing drew them; three tiles in
 *   `05-metrics-content.md` cannot ship without one (AC-641, AC-674, AC-675).
 *
 *   **A target with no statable percentage is not "no comparison".** The tile
 *   used to print *"No comparison period yet"* beside a target somebody had
 *   set. See `ComparisonLine`.
 *
 *   **The ranked list**, slot by slot, against R4-4 §4.1's normative anatomy —
 *   including the two things a screenshot cannot show: that a `null`
 *   `secondaryValue` renders an em dash rather than a zero when its column
 *   exists at all, and that a row with no destination is not a focus stop.
 *
 * The fixtures below are hand-built `Metric` / `TimeSeries` values, not reads
 * through the client. That is deliberate: the point is to exercise states the
 * seeded data does not currently contain — a gap mid-series, an all-null
 * window, a `0%` delta — and waiting for a fixture to grow one is how a state
 * ships untested.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import type {
  Metric,
  MetricBreakdown,
  MetricBreakdownRow,
  SeriesPoint,
  TimeSeries,
} from '@/data/types'
import { BreakdownList } from './BreakdownList'
import { ChartCard } from './ChartCard'
import { MetricTile } from './MetricTile'
import { metricValence } from './formatMetric'

const t = createTranslator({ dictionary: EN })
const AS_OF = '2026-06-25T09:14:00+03:00'

function metric(over: Partial<Metric> = {}): Metric {
  return {
    key: 'management.overview.activeCaptains',
    subTabId: 'management-overview',
    category: 'supply',
    /* §H4 — the default a tile renders at, so a test that does not care about
       rank exercises the common case rather than the headline one. */
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
    /* Added by mock-data-engineer with R4-4's `Metric.caption`, which is a
       REQUIRED field: this factory would not compile without a default. It is
       a default and nothing else — no assertion in this file was touched, and
       a tile with a caption was unbuilt and untested at the time.

       **Kept, and the reason is now on the record.** The alternative offered
       was to revert it and leave `tsc` red, which would have made every test
       in this file unrunnable to protect a boundary the edit did not cross: a
       required field needs a default in a factory, the default is the same
       `null` that thirty-seven seeded tiles carry, no assertion moved, and
       the comment discloses it. The caption is built and asserted below now, so
       the gap the note flagged is closed rather than inherited. */
    caption: null,
    /* R5-1 §1.3. Non-null **if and only if** `value === null`, so the default
       beside a default `value` of 52 is `null` and a test that sets one sets
       both. `MetricTile` asserts the biconditional rather than falling back. */
    absenceReason: null,
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
    /* R5-11a §19.1. A named store, and a closed union — not a boolean and not
       a free string, because `''` and `'TODO'` satisfy a free string, name
       nothing, and pass every check. That is `breakdown.row.entity`'s failure
       mode exactly. */
    awaitingStore: null,
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

/* T9.9 — what explains the plot rather than reports it lives behind the hint
   beside the card's title. Opened by click, which is what a touch reaches. */
async function readChartHint(): Promise<string> {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: EN['shell.hint.show'] as string }))
  return (await screen.findByRole('tooltip')).textContent ?? ''
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
    renderTile(metric({ value: null, absenceReason: 'not-captured' }))
    /* **ONE em dash, and it used to be two.** The delta drew its own beside the
       value's, so an absent metric read `—  — Not captured yet`: two marks
       for one absence, with nothing distinguishing them. The delta now stands
       ON the numeral's baseline rather than under it (see `comparisonParts`),
       and a second dash inside that line would read as a RANGE — `— —` —
       which is a different claim entirely.

       What R5-1 §1.3 requires is unchanged and is asserted below: the mark is
       not a zero, and the reason is in words. */
    expect(screen.getAllByText('—')).toHaveLength(1)
    expect(screen.getByText('Not captured yet')).toBeVisible()
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
    /* **MOVED, and the destination is unchanged.** §3.7 requires an empty card
       to keep its card, title AND REPORT LINK, which is exactly what is
       asserted. What changed is the link's SHAPE: §E7 replaces the header's
       icon-only `↗` with a named `Open analysis →` at the foot of the card, so
       the accessible name is now built from the visible words plus the report
       title rather than from an `aria-label` that replaced them. */
    expect(
      screen.getByRole('link', { name: 'Open analysis for Open signals' }),
    ).toBeInTheDocument()
  })

  it('an ALL-ZERO window says the values are zero — not that the data is missing', () => {
    renderCard(series([day(1, 0), day(2, 0), day(3, 0)]))
    expect(screen.getByText('Every value in this range is zero.')).toBeInTheDocument()
    expect(
      screen.queryByText('There was no data found for this date range.'),
    ).not.toBeInTheDocument()
  })

  it('a window with GAPS counts them in words and does not call itself zero', async () => {
    renderCard(series([day(1, 4), day(2, null), day(3, 6), day(4, null)]))
    expect(await readChartHint()).toContain('No reading on 2 of 4 days.')
    expect(screen.queryByText('Every value in this range is zero.')).not.toBeInTheDocument()
  })

  it('an ALL-NULL window is a full house of gaps, not an empty range', async () => {
    renderCard(series([day(1, null), day(2, null), day(3, null)]))
    expect(await readChartHint()).toContain('No reading on 3 of 3 days.')
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

/* ═══════════════════ MetricTile — R4-4's caption and target ══════════════ */

describe('MetricTile — R4-4 §4.2, the caption', () => {
  it('renders the caption as a THIRD line, distinct from the label', () => {
    renderTile(metric({ caption: 'caption.quickRidesOnly' }))
    expect(screen.getByText('Quick rides only.')).toBeInTheDocument()
    /* The label is still there. A caption that replaced the label would pass a
       naive "is the string on screen" check and be a defect. */
    expect(screen.getByText('Active captains')).toBeInTheDocument()
  })

  it('renders no caption line at all when the tile has none', () => {
    const { container } = renderTile(metric({ caption: null }))
    /* Most tiles carry none; an empty element in the flow would still take the
       gap between the label and the chip and shift the grid by one row. */
    expect(container.querySelectorAll('span.truncate')).toHaveLength(0)
  })

  /**
   * **Caught by eye at 1280 under `dir="rtl"`, not by any source rule.** Nearly
   * every caption is a denominator, so nearly every caption is a numeral run:
   * the UBA moved the leading `7` of `7 days, 3 blocks, 2 tiers.` to the far
   * end and the tile read `days, 3 blocks, 2 tiers 7`.
   */
  it('isolates the caption for bidi — a denominator is a numeral run (§9.2, AC-73)', () => {
    const { container } = renderTile(metric({ caption: 'caption.rotaSlots' }))
    const caption = container.querySelector('span.truncate > bdi')
    expect(caption?.textContent).toBe('7 days, 3 blocks, 2 tiers.')
  })
})

describe('MetricTile — a target that exists is never "no comparison period yet"', () => {
  /**
   * `admin.overview.operatorsWithoutTwoFactor`: value `3`, target `0`, set by
   * `USR-1` — **the only owned target on any board**. A value that is not zero
   * against a target of zero has no percentage, so `deltaPercent` is `null`
   * while the comparison survives, deliberately (`clients/metrics.ts`).
   */
  const againstZeroTarget = metric({
    key: 'admin.overview.operatorsWithoutTwoFactor',
    value: 3,
    higherIsBetter: false,
    comparison: { kind: 'target', value: 0, setByUserId: 'USR-1', effectiveFrom: '2026-01-01' },
    deltaPercent: null,
    direction: 'up',
  })

  it('names the target instead of claiming there is no history', () => {
    renderTile(againstZeroTarget)
    expect(screen.getByText('vs 0 target')).toBeInTheDocument()
    expect(screen.queryByText('No comparison period yet')).not.toBeInTheDocument()
    expect(screen.queryByText('No target set')).not.toBeInTheDocument()
  })

  it('still shows §3.7’s em dash where the percentage would be, never 0%', () => {
    renderTile(againstZeroTarget)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })

  it('leaves AC-605 exactly where it was — a comparison of kind `none` is unchanged', () => {
    renderTile(metric({ comparison: { kind: 'none', reason: 'insufficient-data' } }))
    expect(screen.getByText('Too little data to compare')).toBeInTheDocument()
  })

  it('renders a real 0% when the value is ON a zero target — that is not an em dash', () => {
    renderTile(
      metric({
        value: 0,
        comparison: { kind: 'target', value: 0, setByUserId: 'USR-1', effectiveFrom: '2026-01-01' },
        deltaPercent: 0,
        direction: 'flat',
      }),
    )
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('vs 0 target')).toBeInTheDocument()
  })

  /**
   * **V-8 / R5-2 — the half of AC-605 that was missing, and it was missing on
   * exactly one branch.**
   *
   * `— vs 0 target` hides its em dash from a screen reader and puts nothing in
   * its place, so this tile announced its target and said nothing at all about
   * the delta: an absence drawn and not announced. The `none` branch and the
   * absent-value branch both carry their reason as visible text and need no
   * companion.
   *
   * Asserted through the accessibility tree rather than by looking for a class,
   * so it stays true if the way we hide text ever changes: the em dash must be
   * out of the tree and the sentence must be in it.
   */
  it('announces the absent delta to a screen reader, not only draws it (V-8)', () => {
    const { container } = renderTile(againstZeroTarget)
    expect(screen.getByText('No percentage change to state')).toBeInTheDocument()
    /* The mark itself stays out of the tree — it says nothing on its own. */
    const dash = screen.getByText('—')
    expect(dash).toHaveAttribute('aria-hidden', 'true')
    /* And the companion is not drawn. */
    const sr = container.querySelector('.sr-only')
    expect(sr?.textContent).toBe('No percentage change to state')
  })

  it('puts the companion on NO other branch — the other two speak for themselves', () => {
    const { unmount } = renderTile(metric({ comparison: { kind: 'none', reason: 'no-history' } }))
    expect(screen.queryByText('No percentage change to state')).not.toBeInTheDocument()
    unmount()
    renderTile(metric({ value: null, absenceReason: 'not-captured' }))
    expect(screen.queryByText('No percentage change to state')).not.toBeInTheDocument()
  })
})

/**
 * **R5-1 — the tile with no value, which is V-2 and state D of §10.**
 *
 * The defect, stated so the tests below are readable as its inverse: the tile
 * carried **two em dashes and one sentence**. `— / Impersonation sessions /
 * — No comparison period yet`. The sentence sat beside the LOWER dash and
 * explained it. The upper dash — larger, first in reading order, in the slot
 * the eye goes to first — had nothing. There is no reading of that tile in
 * which the value's absence is explained, including the correct one.
 *
 * **Most of V-2 is not tested here because most of V-2 is not a component
 * question.** R4-11 §11.2 already ruled that a measure with no store at all
 * does not render as a tile — not an em dash, not a skeleton, not a ghost cell
 * — and four to six of the eight flagged tiles are that class. Those are
 * removed from the fixtures, and a tile that never reaches this component
 * cannot be asserted about in it. What is left is the residue: *we measure it,
 * today there is nothing.*
 */
describe('MetricTile — a value that is absent says why (R5-1)', () => {
  /**
   * **This is the real tile, and it is the one where two rulings claim the same
   * line.** `support.overview.contactsPerThousandTrips` carries
   * `comparison: { kind: 'none', reason: 'no-history' }` **and** `value: null`.
   * R5-2 wants `No comparison period yet` on that line; R5-1 §1.3 wants
   * `Not captured yet`. One line, two obligations.
   *
   * §10's state table settles it: **states B and C carry a value and state D
   * does not**, so the absence reason wins whenever the value is absent, and
   * the comparison reason is suppressed alongside the caption. The branch order
   * in `ComparisonLine` is what encodes that — the absent-value test runs
   * first — and it is the reason these two facts are seeded together here
   * rather than in two tidy fixtures that would never collide.
   */
  const notCaptured = metric({
    key: 'support.overview.contactsPerThousandTrips',
    value: null,
    absenceReason: 'not-captured',
    comparison: { kind: 'none', reason: 'no-history' },
    caption: 'caption.quickRidesOnly',
  })

  it('states the reason where the DELTA would be, not in the caption', () => {
    renderTile(notCaptured)
    expect(screen.getByText('Not captured yet')).toBeInTheDocument()
    /* §4.2 gains no absence kind: a caption qualifies a number that exists, and
       a slot that sometimes qualifies a number and sometimes explains that
       there is no number has to be read to find out which. */
    expect(screen.queryByText('Quick rides only.')).not.toBeInTheDocument()
  })

  /**
   * The first of R5-1 §1.3's two named consequences. A denominator with no
   * numerator is noise and a tile must carry ONE explanation, not two.
   * AC-641 / AC-674 / AC-675's *"cannot ship without a caption"* is an
   * obligation on the tile **in its content state** — which is why the same
   * tile with a value renders the caption and this one does not.
   */
  it('suppresses the caption while the value is absent, and only while it is', () => {
    const { unmount } = renderTile(notCaptured)
    expect(screen.queryByText('Quick rides only.')).not.toBeInTheDocument()
    unmount()
    renderTile(metric({ ...notCaptured, value: 41, absenceReason: null }))
    expect(screen.getByText('Quick rides only.')).toBeInTheDocument()
  })

  /**
   * The second consequence. `comparison.reason` is not deleted and is not shown
   * here — it is still the right thing to say when a value EXISTS and a
   * comparison does not. On this tile it answers the less important of the two
   * questions, which is precisely the defect.
   */
  it('does not fall back to the no-comparison reason, which explains the wrong dash', () => {
    renderTile(notCaptured)
    expect(screen.queryByText('No comparison period yet')).not.toBeInTheDocument()
    expect(screen.getByText('Not captured yet')).toBeInTheDocument()
  })

  /**
   * The same collision from the other side, so the precedence is asserted and
   * not merely observed: the identical comparison on a tile that HAS a value
   * still renders its reason. Absence does not delete `comparison.reason`; it
   * outranks it for one line on one kind of tile.
   */
  it('leaves the no-comparison reason intact on a tile that has a value', () => {
    renderTile(metric({ ...notCaptured, value: 41, absenceReason: null }))
    expect(screen.getByText('No comparison period yet')).toBeInTheDocument()
    expect(screen.queryByText('Not captured yet')).not.toBeInTheDocument()
  })

  it('says something different for a value that cannot be COMPUTED', () => {
    renderTile(metric({ value: null, absenceReason: 'not-computable' }))
    expect(screen.getByText('Nothing to measure yet')).toBeInTheDocument()
    expect(screen.queryByText('Not captured yet')).not.toBeInTheDocument()
  })

  /**
   * §10 state D draws the value's em dash as `aria-hidden`. It is a mark
   * standing in for a number and on its own it says nothing — which is the
   * finding. What a reader is given instead is the reason, in words, and it is
   * visible text so V-8 is satisfied without a companion.
   */
  it('keeps the value’s em dash out of the accessibility tree, and the reason in it', () => {
    const { container } = renderTile(notCaptured)
    const dashes = screen.getAllByText('—')
    /* One, not two — see the count's own test above for why the delta stopped
       drawing a second one. */
    expect(dashes).toHaveLength(1)
    /* `closest`, not the element itself: the value's mark is an isolated run
       inside its box and the box is what carries the attribute (§5.4 — the
       isolate never carries anything but the isolation). What matters is that
       the dash is not reachable, not which element says so. */
    for (const dash of dashes) expect(dash.closest('[aria-hidden="true"]')).not.toBeNull()
    /* **NARROWED, and only in what it excludes.** The claim is *the FIGURE
       explains its absence in visible words and hides nothing behind a
       screen-reader-only run* — the whole `.sr-only` selector stood in for
       "the figure" while the figure was the only thing this tile rendered.
       §E4 moved the drilldown out of the figure and onto its own named action
       (`Open analysis`), whose accessible name legitimately carries the report
       title as a hidden trailing run so that §7.2's label-in-name holds. That
       run is not part of the figure and is not about the em dash. Everything
       the assertion was protecting is still asserted, over exactly the box it
       was always about. */
    const hidden = [...container.querySelectorAll('.sr-only')].filter(
      (node) => node.closest('[data-slot="open-analysis"]') === null,
    )
    expect(hidden).toHaveLength(0)
    expect(screen.getByText('Not captured yet')).toBeVisible()
  })

  /**
   * `absenceReason` is non-null **if and only if** `value === null`. A tile that
   * breaks the biconditional is a FIXTURE defect and must say so by name, not
   * resolve to a translation key that never existed — which would send whoever
   * reads the stack trace to the dictionary, which is the wrong file.
   */
  it('fails by name on a fixture that has no value and no reason', () => {
    expect(() => renderTile(metric({ value: null, absenceReason: null }))).toThrow(
      /absenceReason/u,
    )
  })
})

/* ══════════════ BreakdownList — R4-4 §4.1, slot by slot ══════════════════ */

function row(over: Partial<MetricBreakdownRow> = {}): MetricBreakdownRow {
  return {
    id: 'DRV-0103',
    /* R5-7 — a captain's name is **data**. The default is an entity, because
       that is the arm V-4 lives on and the arm most rows take. */
    label: { kind: 'text', text: 'Khalid Mansour' },
    subLabelKey: null,
    subLabelParams: null,
    value: 20,
    unit: 'percent',
    currency: null,
    /* R5-5 — `secondaryValue` and `secondaryUnit` are withdrawn from the row,
       not deprecated. Nothing here carries them and nothing may. */
    barFraction: null,
    drilldownRoute: '/operations/people?view=captains',
    ...over,
  }
}

function breakdown(over: Partial<MetricBreakdown> = {}): MetricBreakdown {
  return {
    key: 'performance.captainsByLateShare',
    dimension: 'captain',
    rowsShown: 5,
    rowsTotal: 6,
    bar: false,
    /* R5-9 §20. Null on every list but `support.contactReasons`, and
       conditional even there — a caveat that is always true is a property of
       the list and belongs in the heading. The three fields exist only
       together, so a caveat cannot be written without naming the number behind
       it. */
    caveat: null,
    awaitingStore: null,
    rows: [row()],
    ...over,
  }
}

function renderList(b: MetricBreakdown) {
  return render(
    <MemoryRouter>
      <BreakdownList breakdown={b} t={t} language="en" />
    </MemoryRouter>,
  )
}

describe('BreakdownList — the anatomy', () => {
  it('states its dimension, ranking and cut-off above the rows (AC-690)', () => {
    renderList(breakdown())
    expect(screen.getByText('Top 5 captains by late-trip share')).toBeInTheDocument()
  })

  it('labels the list with its own heading, so the rows are counted and named (§7.5)', () => {
    renderList(breakdown())
    expect(
      screen.getByRole('list', { name: 'Top 5 captains by late-trip share' }),
    ).toBeInTheDocument()
  })

  it('renders the cut-off sentence, with the dimension, only when there is a cut-off (AC-696)', () => {
    const { unmount } = renderList(breakdown())
    expect(screen.getByText('Showing the top 5 of 6 captains.')).toBeInTheDocument()
    unmount()
    /* AC-691 — fewer rows than the cut-off renders all of them and says nothing
       about the ones that do not exist. No `and 0 more`. */
    renderList(breakdown({ rowsShown: 5, rowsTotal: 5 }))
    expect(screen.queryByText(/Showing the top/)).not.toBeInTheDocument()
  })

  it('renders one grey sentence for zero rows, and never the first-run illustration (AC-692)', () => {
    const { container } = renderList(breakdown({ rows: [], rowsTotal: 0 }))
    expect(screen.getByText('Nothing to rank for this period.')).toBeInTheDocument()
    expect(screen.queryByRole('heading')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('carries NO mutating control on any row, ever (AC-694)', () => {
    renderList(breakdown({ bar: true, rows: [row({ barFraction: 0.5 })] }))
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('links a row only where a destination exists, and is not a focus stop where it does not (AC-693)', () => {
    const { unmount } = renderList(breakdown())
    expect(screen.getByRole('link')).toHaveAttribute('href', '/operations/people?view=captains')
    unmount()
    renderList(breakdown({ rows: [row({ drilldownRoute: null })] }))
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Khalid Mansour')).toBeInTheDocument()
  })

  /**
   * A row label is a **proper noun beside a number**, which is `<bdi>`'s own
   * worked example. The name's direction is data, not the page's: one seed
   * below the cut is a 46-character Arabic rider name in an otherwise Latin
   * fixture, and it is one fixture edit away from row one.
   */
  it('isolates the row label for bidi, because a name’s direction is data (§9.2)', () => {
    const { container } = renderList(breakdown())
    /* The `<bdi>` sits INSIDE the flex-1 box, never as the box: a stretched
       `<bdi>` takes its own direction and aligns its text to ITS start, which
       flushed every label to the wrong edge under `dir="rtl"`. */
    const label = container.querySelector('span.flex-1 > bdi')
    expect(label?.textContent).toBe('Khalid Mansour')
  })
})

describe('BreakdownList — the figures', () => {
  /**
   * `risk.highValueRidersAtRisk` rendered `884.00 SAR 63` — two numbers,
   * neither named, which is B-1. The lifetime value is the measure the list is
   * ranked by and stays the numeric column; the trip count becomes a noun
   * phrase in the sub-label, where it names itself.
   */
  it('formats the ONE value from its own unit, and the second fact names itself', () => {
    renderList(
      breakdown({
        key: 'risk.highValueRidersAtRisk',
        dimension: 'rider',
        rows: [
          row({
            label: { kind: 'text', text: 'Abdulaziz Al-Suwailem' },
            value: 88_400,
            unit: 'money',
            currency: 'SAR',
            subLabelKey: 'breakdown.sub.churnHighTrips',
            subLabelParams: { trips: 63 },
          }),
        ],
      }),
    )
    expect(screen.getByText('884.00 SAR')).toBeInTheDocument()
    /* Not a bare `63` in a column of its own. */
    expect(screen.getByText('High churn risk · 63 trips')).toBeInTheDocument()
    expect(screen.queryByText('63')).not.toBeInTheDocument()
  })

  /**
   * **R5-5 — the secondary numeric column is withdrawn, and this is the test
   * that proves it did not survive as a hidden slot.**
   *
   * `zones.citiesHealth` was the case that justified the column being nullable
   * and it is now the case that kills it. Three of four cities have no
   * failure-rate reading at all. As a column that is an em dash — the same
   * unexplained mark V-2 is about. As a phrase it is simply not stated, and
   * `Not launched` says why. A city with no reading and a city with a reading
   * of zero are different facts and only the phrase form renders that.
   *
   * So the assertion is the inverse of the one it replaces: on a list where
   * three of four rows have no second fact, **no em dash appears anywhere.**
   */
  it('renders ONE numeric column and no em dash where a second used to sit', () => {
    renderList(
      breakdown({
        key: 'zones.citiesHealth',
        dimension: 'city',
        rowsShown: 4,
        rowsTotal: 4,
        rows: [
          row({
            id: 'CITY-RUH',
            label: { kind: 'text', text: 'Riyadh' },
            value: 6,
            unit: 'count',
            subLabelKey: 'breakdown.sub.cityLiveUnserved',
            /* A BARE number. The component formats it. */
            subLabelParams: { rate: 45 },
            drilldownRoute: null,
          }),
          row({
            id: 'CITY-JED',
            label: { kind: 'text', text: 'Jeddah' },
            value: 0,
            unit: 'count',
            subLabelKey: 'breakdown.sub.cityNotLive',
            drilldownRoute: null,
          }),
        ],
      }),
    )
    expect(screen.getByText('6')).toBeInTheDocument()
    /* Jeddah's PRIMARY is a real, measured zero and must survive as `0`. */
    expect(screen.getByText('0')).toBeInTheDocument()
    /* The second number is a noun phrase now, and it names itself. */
    expect(screen.getByText('Live · 45% of requests unserved')).toBeInTheDocument()
    expect(screen.getByText('Not launched')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  /**
   * **The value is FORMATTED before interpolation — R5-5 §11.4, note 1 — and
   * the component is what formats it.**
   *
   * `subLabelParams` carries bare numbers. The precedent is
   * `overview.compare.target`: `MetricComparison.value` is a `number` and
   * `MetricTile` runs it through a formatter before handing it to `t()`. A
   * pre-formatted `'45%'` in the fixture could never render Arabic-Indic
   * digits, because formatting is a function of the language and the language
   * is not known where the data is seeded.
   *
   * **What AC-713 forbids is a per-cent sign assembled by CONCATENATION.** One
   * produced by `formatPercent` is not that. So the assertion below is that the
   * sign arrives at all — `45%`, not `45` — and that a count beside it does
   * NOT pick one up.
   */
  it('formats each sub-label param by its own unit before interpolating', () => {
    const { unmount } = renderList(
      breakdown({
        rows: [
          row({
            subLabelKey: 'breakdown.sub.lateOfTrips',
            subLabelParams: { late: 4, total: 20 },
          }),
        ],
      }),
    )
    expect(screen.getByText('4 of 20 trips ran late')).toBeInTheDocument()
    unmount()

    renderList(
      breakdown({
        rows: [
          row({
            subLabelKey: 'breakdown.sub.cityLiveUnserved',
            subLabelParams: { rate: 45 },
          }),
        ],
      }),
    )
    expect(screen.getByText('Live · 45% of requests unserved')).toBeInTheDocument()
  })

  /**
   * The unit is a property of the **key**, not of the row — `zones.citiesHealth`
   * ranks on a count of zones and its sub-label states a percentage — so the
   * component holds a table of them. A seventh parameter name defaulting
   * silently to a count is how `45` ships where `45%` was meant, so an unknown
   * name fails by name instead.
   */
  it('fails by name on a sub-label parameter with no declared unit', () => {
    expect(() =>
      renderList(
        breakdown({
          rows: [row({ subLabelKey: 'breakdown.sub.lateOfTrips', subLabelParams: { newThing: 3 } })],
        }),
      ),
    ).toThrow(/newThing/u)
  })

  /**
   * **V-9, which stopped being latent the moment the sub-label changed.** It
   * was the one slot in this file with no isolation, and it rendered correctly
   * only because every sub-label used to be a pure strong-LTR run. Under R5-5
   * every sub-label leads with or contains a numeral, so under a right-to-left
   * page the UBA would move the leading `3` to the far end and the row would
   * read `past their SLA 3`. It ships in the same pass as the copy change,
   * because one without the other is a new defect.
   */
  it('isolates the sub-label, which now leads with a numeral (V-9)', () => {
    const { container } = renderList(
      breakdown({
        rows: [
          row({
            subLabelKey: 'breakdown.sub.queuePastSla',
            subLabelParams: { past: 3 },
          }),
        ],
      }),
    )
    /* The box carries the classes and the run carries none — a stretched
       isolate flushes to its own direction, which is §5.4's finding. */
    const box = container.querySelector('span.truncate.text-xs')
    expect(box?.firstElementChild?.tagName).toBe('BDI')
    expect(box?.textContent).toBe('3 past their SLA')
  })
})

/**
 * **R5-7 — the label union, and the two renderings it makes possible.**
 *
 * Before it, every row label was isolated defensively because the component
 * could not tell a translated label from a person's name. Now it can, and the
 * treatment is applied by analysis: an entity name gets the isolation AND the
 * auto direction on its truncating box — which is V-4's fix, because on a
 * right-to-left page a box carrying the page direction ellipsises a Latin run
 * at its HEAD, turning `Abdulaziz Al-Suwailem` into an unrecognisable tail. A
 * translated label must NOT get that treatment: it belongs on the page
 * direction, and before the union there was no way to say so.
 */
describe('BreakdownList — the row label is a union (R5-7 / V-4)', () => {
  it('renders an entity name as data — it never reaches the translator', () => {
    renderList(breakdown({ rows: [row({ label: { kind: 'text', text: 'breakdown.empty' } })] }))
    /* The literal string, NOT the dictionary entry for that key. A component
       that translated a `text` label would render the sentence instead. */
    expect(screen.getByText('breakdown.empty')).toBeInTheDocument()
    expect(screen.queryByText('Nothing to rank for this period.')).not.toBeInTheDocument()
  })

  it('translates a KEY label, and a key label is not isolated', () => {
    renderList(
      breakdown({
        key: 'admin.rotaGapsByDay',
        dimension: 'rota-day',
        rows: [row({ label: { kind: 'key', key: 'breakdown.rotaDay.fri', params: null } })],
      }),
    )
    const keyed = screen.getByText('Friday')
    expect(keyed.querySelector('bdi')).toBeNull()
    expect(keyed).not.toHaveAttribute('dir')
  })

  it('gives ONLY an entity name the auto direction on its truncating box (V-4)', () => {
    const { container } = renderList(
      breakdown({ rows: [row({ label: { kind: 'text', text: 'Abdulaziz Al-Suwailem' } })] }),
    )
    const entity = container.querySelector('span.flex-1')
    expect(entity).toHaveAttribute('dir', 'auto')
    /* The isolate is INSIDE the box and carries no class of its own — §5.4. */
    expect(entity?.firstElementChild?.tagName).toBe('BDI')
    expect(entity?.firstElementChild).not.toHaveAttribute('class')
    expect(entity?.textContent).toBe('Abdulaziz Al-Suwailem')
  })
})

/**
 * **R5-9 §18.1 — the caveat line.**
 *
 * AC-674 says the uncoded-contacts tile *"gates the breakdown below it: if a
 * tenth of contacts are uncoded, the reason-code ranking is not trustworthy and
 * no product fix should be prioritised from it."* Neither existing slot could
 * carry that. The caption is a TILE slot and R5-1 suppresses it exactly when
 * the tile's value is absent — so the one caveat that must render while a
 * number is missing sat on the one slot that switches off then — and a banner
 * is page-scoped, capped at one per board, and Support's is spoken for by the
 * SOS critical.
 */
/**
 * **R5-11a §19.1 — the third absence, on both card types.**
 *
 * Three sentences, and §18.3 is explicit that conflating any two of them is the
 * V-2 defect in a new slot:
 *
 * | Situation | Sentence |
 * |---|---|
 * | We ranked; this window had nothing to rank | `Nothing to rank for this period.` |
 * | We queried; this date range returned nothing | `There was no data found for this date range.` |
 * | Nothing is captured, so no ranking or query is possible | `Nothing is recorded here yet.` |
 *
 * The first two were already distinguishable. The third needed a field, because
 * which one is true is **provenance** — `rows.length === 0` and
 * `points.length === 0` are what the first two look like too. Inferring it from
 * `rowsTotal` was the wrong route and was declined: `rowsTotal` counts rankable
 * rows and is not a claim about a store.
 *
 * **The card renders and keeps its title, where a tile with no store does not
 * render at all** (R4-11 §11.2). The asymmetry is structural rather than
 * aesthetic: **a tile has no body and a card does.** Deleting the card deletes
 * the heading, and the heading is the only thing on the screen that names what
 * is missing — `Top 5 contact reasons, per 1,000 trips` over
 * `Nothing is recorded here yet.` is the sentence that gets the contact log
 * built. An absent card is not.
 */
describe('the third absence — a card awaiting a store (R5-11a)', () => {
  it('keeps the breakdown’s title and says nothing is RECORDED, not nothing to RANK', () => {
    renderList(
      breakdown({
        key: 'support.contactReasons',
        dimension: 'reason-code',
        rows: [],
        rowsTotal: 0,
        awaitingStore: 'contact-log',
      }),
    )
    expect(screen.getByText('Top 5 contact reasons, per 1,000 trips')).toBeInTheDocument()
    expect(screen.getByText('Nothing is recorded here yet.')).toBeInTheDocument()
    expect(screen.queryByText('Nothing to rank for this period.')).not.toBeInTheDocument()
  })

  it('keeps the chart’s title and does not claim the date range came back empty', () => {
    renderCard(series([], { awaitingStore: 'contact-log' }))
    expect(screen.getByText('Nothing is recorded here yet.')).toBeInTheDocument()
    expect(
      screen.queryByText('There was no data found for this date range.'),
    ).not.toBeInTheDocument()
  })

  /**
   * The store name is an engineering fact in an operator's register. Nobody can
   * act on `contact-log`, and R5-11's sentence is byte-identical wherever it
   * renders — interpolating a store name would break that.
   */
  it('never renders the store’s name to an operator', () => {
    const { container } = renderList(
      breakdown({ rows: [], rowsTotal: 0, awaitingStore: 'payments-by-entity' }),
    )
    expect(container.textContent).not.toMatch(/payments-by-entity/u)
  })

  /**
   * A card awaiting a store renders **no caveat and no cut-off**, because both
   * are claims about a ranking that did not happen. §19.1's precedence, in
   * order: awaiting-a-store → no rows → caveat + rows + cut-off.
   */
  it('renders no caveat and no cut-off while it is awaiting a store', () => {
    renderList(
      breakdown({
        rows: [],
        rowsShown: 5,
        rowsTotal: 14,
        awaitingStore: 'contact-log',
        caveat: {
          key: 'breakdown.caveat.uncodedRanking',
          params: { share: 12 },
          gatedBy: 'support.overview.uncodedContactShare',
        },
      }),
    )
    expect(screen.getByText('Nothing is recorded here yet.')).toBeInTheDocument()
    expect(screen.queryByText(/ranking is incomplete/u)).not.toBeInTheDocument()
    expect(screen.queryByText(/Showing the top/u)).not.toBeInTheDocument()
  })

  /**
   * **The converse is deliberately not asserted anywhere.** Empty with
   * `awaitingStore === null` is the legitimate *nothing to rank* case, and
   * collapsing the two is the defect the field exists to prevent.
   */
  it('still says nothing to RANK when a store exists and the window was empty', () => {
    renderList(breakdown({ rows: [], rowsTotal: 0, awaitingStore: null }))
    expect(screen.getByText('Nothing to rank for this period.')).toBeInTheDocument()
    expect(screen.queryByText('Nothing is recorded here yet.')).not.toBeInTheDocument()
  })
})

describe('BreakdownList — the caveat line (R5-9)', () => {
  const gated = () =>
    breakdown({
      key: 'support.contactReasons',
      dimension: 'reason-code',
      caveat: {
        key: 'breakdown.caveat.uncodedRanking',
        params: { share: 12 },
        /* **`gatedBy` is what makes §18.1's guard structural rather than a
           thing a reviewer has to remember.** It names the metric on THIS board
           whose value raises the caveat; the condition and the threshold are
           that metric's own `value` and `comparison`, and are not restated
           here, because a second copy of a threshold is a second thing to
           drift. The component never evaluates it — the data layer decides
           whether the caveat is raised, same division as `selectNotice`. */
        gatedBy: 'support.overview.uncodedContactShare',
      },
    })

  it('renders no caveat line on a list that declares none', () => {
    renderList(breakdown())
    expect(screen.queryByText(/ranking is incomplete/u)).not.toBeInTheDocument()
  })

  it('formats its parameter before interpolating, like every other numeric param', () => {
    renderList(gated())
    expect(
      screen.getByText('12% of contacts are uncoded, so this ranking is incomplete.'),
    ).toBeInTheDocument()
  })

  /**
   * **The position IS the ruling.** *A gate that appears after the thing it
   * gates is not a gate.* A reader who scans five rows and forms a conclusion
   * before reaching a footer has already been misled, which is the whole
   * failure AC-674 exists to prevent — so asserting the string is present is
   * not enough, and asserting it precedes the list is the assertion that
   * matters.
   */
  it('sits above the first row, not beside the cut-off sentence', () => {
    const { container } = renderList(gated())
    const caveat = screen.getByText(/ranking is incomplete/u)
    const list = container.querySelector('ul[aria-labelledby]')
    expect(list).not.toBeNull()
    /* DOCUMENT_POSITION_FOLLOWING: the list comes after the caveat. */
    expect(caveat.compareDocumentPosition(list!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  /**
   * **It wraps; it does not truncate**, and that is the one geometric departure
   * from the caption, deliberately. A caption sits in a grid cell read across,
   * where a variable height breaks the row. A caveat sits in a card body where
   * nothing is read across it, and a truncated caveat is worse than no caveat
   * because the half that survives still looks authoritative.
   */
  it('wraps rather than truncating — the one geometric difference from a caption', () => {
    renderList(gated())
    const box = screen.getByText(/ranking is incomplete/u).closest('p')
    expect(box?.className ?? '').not.toMatch(/truncate|line-clamp/u)
  })

  it('is isolated, because it leads with a numeral in English', () => {
    renderList(gated())
    const box = screen.getByText(/ranking is incomplete/u).closest('p')
    expect(box?.firstElementChild?.tagName).toBe('BDI')
    expect(box?.firstElementChild).not.toHaveAttribute('class')
  })
})

describe('BreakdownList — the bar (R5-6)', () => {
  /* A list whose rows differ, so `max > min` and the bar is legal. */
  const ranked = (over = {}) => ({
    bar: true,
    rows: [row({ id: 'a', value: 40, barFraction: 1 }), row({ id: 'b', value: 10, barFraction: 0.25 })],
    ...over,
  })

  it('draws a bar only when the LIST permits one, whatever a row carries', () => {
    const { container, unmount } = renderList(breakdown(ranked({ bar: false })))
    expect(container.querySelector('.bg-chart-series')).toBeNull()
    unmount()
    const withBar = renderList(breakdown(ranked()))
    expect(withBar.container.querySelectorAll('.bg-chart-series')).toHaveLength(2)
  })

  /**
   * **R5-6 — `max > min` is a rendering condition, not only a seeding one.**
   *
   * `admin.rotaGapsByDay` is the worked case and V-13 closes on it: seven rows
   * all valued 6, so every bar is full, so seven identical bands cost 20px of
   * row height each and carry no comparison at all. The finding they encode
   * survives without them — *nobody is on call at any hour of any day* is what
   * the seven equal numbers say, and they say it.
   *
   * The fixture sets `bar: false` on that list. This asserts the component does
   * not depend on the fixture remembering, because a contract is not a runtime.
   */
  it('draws no bar when every row is worth the same, even where the list permits one', () => {
    const { container } = renderList(
      breakdown({
        key: 'admin.rotaGapsByDay',
        dimension: 'rota-day',
        bar: true,
        rows: [
          row({ id: 'fri', value: 6, barFraction: 1 }),
          row({ id: 'sat', value: 6, barFraction: 1 }),
        ],
      }),
    )
    expect(container.querySelector('.bg-chart-series')).toBeNull()
    /* And the row keeps the SHORTER uniform height, which is the 20px a row
       the audit said the band was costing. */
    expect(container.querySelector('.h-row-media')).toBeNull()
    expect(container.querySelector('.h-row')).not.toBeNull()
  })

  /**
   * **The token, and it is the whole of R5-6.** `--chart-fill` is `--ev-blue`
   * at 10 % on white and measures **1.142 : 1** against the card — a band, not
   * a mark. `--chart-series` is `--ev-blue` itself at **4.574 : 1**. The
   * reference's own ranked bar is a saturated fill at full strength; a pale
   * area fill is what sits under a line, where the line does the delimiting,
   * and a ranked bar has no line above it.
   *
   * Asserted as a NEGATIVE as well, because the failure mode this guards is a
   * revert that leaves both tokens reachable.
   */
  it('paints the bar with the series token and never with the area fill', () => {
    const { container } = renderList(breakdown(ranked()))
    expect(container.querySelector('.bg-chart-series')).not.toBeNull()
    expect(container.querySelector('.bg-chart-fill')).toBeNull()
  })

  it('sizes the bar with a LOGICAL inline size, so it grows from the inline-start in Arabic', () => {
    const { container } = renderList(
      breakdown({ bar: true, rows: [row({ value: 40, barFraction: 1 }), row({ id: 'b', value: 10, barFraction: 0.25 })] }),
    )
    const fills = container.querySelectorAll<HTMLElement>('.bg-chart-series')
    /* Share-of-max: the top row is always full, and the second is its share of
       the leader. The denominator is the fixture's; what this asserts is that
       the component passes the fraction through untouched. */
    expect(fills[0]?.style.inlineSize).toBe('100%')
    expect(fills[1]?.style.inlineSize).toBe('25%')
    expect(fills[0]?.style.width).toBe('')
  })

  it('hides the bar from a screen reader — it restates the number beside it (§7.5)', () => {
    const { container } = renderList(breakdown(ranked()))
    expect(
      container.querySelector('.bg-chart-series')?.closest('[aria-hidden="true"]'),
    ).not.toBeNull()
  })

  it('gives a barred row the taller uniform height, and an unbarred row the shorter one', () => {
    const { container, unmount } = renderList(breakdown({ bar: false }))
    expect(container.querySelector('.h-row')).not.toBeNull()
    expect(container.querySelector('.h-row-media')).toBeNull()
    unmount()
    const media = renderList(breakdown(ranked()))
    expect(media.container.querySelector('.h-row-media')).not.toBeNull()
  })
})

/* ══════════ the valence carrier — R4-5 amended, 2026-09-02 ══════════ */

describe('metricValence — `higherIsBetter` reaches the sighted operator', () => {
  it('reads a rise as better only where rising IS better', () => {
    /* The file's own example: churn up is bad, renewal up is good. */
    expect(metricValence(12, true)).toBe('better')
    expect(metricValence(12, false)).toBe('worse')
    expect(metricValence(-12, true)).toBe('worse')
    expect(metricValence(-12, false)).toBe('better')
  })

  it('has no valence at zero', () => {
    /* Nothing moved, so nothing improved or worsened. Returning a valence here
       would paint every flat metric green or red, which is the failure people
       cite when they argue against coloured deltas at all. */
    expect(metricValence(0, true)).toBeNull()
    expect(metricValence(0, false)).toBeNull()
  })

  it('drives the WORD and the caret from one derivation', () => {
    /* The point of the amendment: what a reader sees and what a screen reader
       hears cannot disagree, because they come from the same function. */
    for (const delta of [-30, -1, 1, 30]) {
      for (const higherIsBetter of [true, false]) {
        const valence = metricValence(delta, higherIsBetter)
        const rising = delta > 0
        expect(valence).toBe(rising === higherIsBetter ? 'better' : 'worse')
      }
    }
  })
})
