/**
 * **The numbers above the plot.** Amplitude §A8, asked for in one sentence:
 *
 * > *"for charts I need numbers above the chart"*
 *
 * ```
 *  ● Riyadh                 ● Jeddah                 ● Dammam
 *  1,204  ↑ 12.4%           980  ↓ 3.1%              412  ↑ 0.8%
 *  over 27 May – 25 Jun     over 27 May – 25 Jun     over 27 May – 25 Jun
 *  from 27 Apr              from 27 Apr              from 27 Apr
 * ```
 *
 * One column per series, in the plot's own draw order and the plot's own
 * colours — the dot above the number is `seriesColor(i)` and so is the line, so
 * a reader maps a figure to a line by matching a hue rather than by counting
 * legend entries. That mapping is the entire justification for a row of numbers
 * over a chart; without it this is a second, redundant table.
 *
 * ## The rollup is the catalogue's, and a refusal is rendered as a refusal
 *
 * `declaredAggregate` decides how a series collapses to one number, on
 * `pairRefusal`'s triple — and returns `null` where the catalogue entry is not
 * about these numbers. That case is not hypothetical: a retention series
 * carries `measureKey: 'riders.joined'` (a `count`) while declaring
 * `unit: 'percent'`, and summing it produced the `1,200% total` that shipped in
 * `ResultTable` and again in `PanelCard`. **A column with no honest aggregate
 * renders its name and an em dash**, never a plausible sum. `rollup.ts` states
 * the rule; this file only obeys it.
 *
 * ## Why this is not `PanelCard.Headline` moved
 *
 * `Headline` is one panel's number inside one panel's card, and it renders a
 * full read *sentence* beneath the numeral — right for a card that stands
 * alone. Six of those sentences side by side is a paragraph, so this row keeps
 * the two facts a reader actually needs (what window, against what) as two
 * short lines and drops the prose. Same rollup, same delta, same `MetricDelta`
 * component; different density. `Headline` still ships for the single-panel
 * card and for dashboard tiles.
 *
 * ## Wrapping, not scrolling
 *
 * The row wraps to a second line rather than scrolling sideways. A horizontal
 * scrollport above a chart hides series behind an edge, and the one thing this
 * row must never do is make a series in the plot unfindable in the numbers.
 */

import { MetricDelta } from '@/components/metrics'
import type { CurrencyCode, Measure, MetricUnit, ReportPanel, ReportResult } from '@/data/types'
import { comparisonWindow } from '@/data/clients'
import { formatDate, type Language, type Translate } from '@/lib'
import { PanelNumeral } from './PanelCard'
import { declaredAggregate, periodDelta, rollUpSeries } from './rollup'
import { seriesColor, seriesDash } from './SeriesChart'

export interface SeriesHeadlinesProps {
  /** The same panels, in the same order, that `SeriesChart` was handed. */
  panels: readonly ReportPanel[]
  result: ReportResult
  /** Already resolved by the caller from `panelTitle`, so plot and row agree. */
  titles: readonly string[]
  /** The palette index per panel — the same array the plot indexes. */
  colorIndexes: readonly number[]
  measuresByKey: Readonly<Record<string, Measure>>
  unit: MetricUnit
  currency: CurrencyCode | null
  t: Translate
  language: Language
}

export function SeriesHeadlines({
  panels,
  result,
  titles,
  colorIndexes,
  measuresByKey,
  unit,
  currency,
  t,
  language,
}: SeriesHeadlinesProps) {
  /* The window these numbers cover, and the window their delta is measured
     against — computed once for the row rather than once per column, because
     every column shares both and repeating the arithmetic is how two columns
     end up naming different dates. */
  const from = result.buckets[0]
  const to = result.buckets[result.buckets.length - 1]
  const kind = result.query.periodComparison
  const range =
    from === undefined || to === undefined
      ? null
      : t('rb.control.window.range', {
          from: formatDate(from, { style: 'day-month', language }),
          to: formatDate(to, { style: 'day-month', language }),
        })
  const baseline =
    kind !== 'none' && from !== undefined && to !== undefined
      ? comparisonWindow({ from, to }, kind)
      : null

  const columns = panels.map((panel, index) => {
    const current =
      result.series.find((s) => s.panelId === panel.panelId && s.role === 'current') ?? null
    const comparison =
      result.series.find((s) => s.panelId === panel.panelId && s.role === 'comparison') ?? null
    const measure = current ? (measuresByKey[current.measureKey] ?? undefined) : undefined

    /* `null` is a refusal to state a number, not a fallback to a sum. See the
       header, and `rollup.ts` for the defect that made it a rule. */
    const aggregate = current ? declaredAggregate(current, measure) : null
    const now =
      current && aggregate !== null ? rollUpSeries(current, aggregate, result.buckets.length) : null

    const priorAggregate = comparison ? declaredAggregate(comparison, measure) : null
    const before =
      comparison && priorAggregate !== null
        ? rollUpSeries(comparison, priorAggregate, result.buckets.length)
        : null

    return {
      panelId: panel.panelId,
      title: titles[index] ?? '',
      color: seriesColor(colorIndexes[index] ?? index),
      /* On the palette's second lap the plot draws a dotted line. A dot cannot
         be dotted, so it is drawn hollow — same hue, different treatment, which
         is the same rule the plot follows. See `seriesDash`. */
      hollow: seriesDash(colorIndexes[index] ?? index) !== undefined,
      value: now?.value ?? null,
      delta: periodDelta(now?.value ?? null, before?.value ?? null),
      /* Its own measure's direction. A split by district is one measure, but
         two measures in one plot are two directions, and reading one of them
         off the other is how a fall in refunds turns red. */
      higherIsBetter: measure?.higherIsBetter ?? true,
      /* A series the viewer may not read states that, and states nothing
         else — §13.1 keeps the numbers out of the payload, and a headline over
         an empty series would print an em dash that reads as "no data". */
      blocked: current?.blocked ?? null,
    }
  })

  return (
    <ul
      role="list"
      className="flex list-none flex-wrap items-start gap-x-10 gap-y-4 px-1"
    >
      {columns.map((column) => (
        <li key={column.panelId} className="flex min-w-0 max-w-64 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            {/* The plot's own hue, and the reason this row is worth having.
                Decorative: the name is right beside it. */}
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={
                column.hollow
                  ? { border: `2px solid ${column.color}` }
                  : { background: column.color }
              }
            />
            {/* A group value is user content and carries its own direction. */}
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              <bdi>{column.title}</bdi>
            </span>
          </span>

          {column.blocked !== null ? (
            /* §13.1 — the viewer knows a series exists, knows they may not see it,
                 and knows which permission to ask for. The same key the panel
                 card uses, so redaction reads identically wherever it lands. */
            <p role="status" className="text-sm text-muted-foreground">
              {t('rb.panel.blocked', { permission: column.blocked })}
            </p>
          ) : (
            <>
              <PanelNumeral
                value={column.value}
                unit={unit}
                currency={currency}
                framed
                language={language}
              >
                {/* **The em dash is for a delta that could not be computed,
                    not for one nobody asked for.**

                    AC-834 is that an absent delta reads as an em dash rather
                    than as `0%` or as blank — and it holds here: with a
                    comparison window on, a series whose baseline is zero or
                    whose aggregate is refused still renders `—`, which is the
                    case that rule exists for.

                    With no comparison window at all there is nothing absent to
                    mark. The line below already says `no comparison` in words,
                    and a dash beside every number saying the same thing a
                    second time is the noise the owner asked to be rid of. */}
                {baseline !== null && (
                  <MetricDelta
                    deltaPercent={column.delta === null ? null : column.delta * 100}
                    higherIsBetter={column.higherIsBetter}
                    t={t}
                    language={language}
                  />
                )}
              </PanelNumeral>

              {/* Two facts, two lines, no prose: what the number covers, and
                  what its delta is measured against. A date opens with a digit,
                  which the UBA throws to the far end of an Arabic line without
                  an isolate — hence `<bdi>` on both. */}
              {range !== null && (
                <p className="text-xs text-muted-foreground">
                  <bdi>{t('rb.headline.window', { range })}</bdi>
                </p>
              )}
              {/* **What the delta is measured against — and nothing where there
                  is no delta.**

                  `no comparison` printed under every column was four copies of
                  one fact that the toolbar's own `No comparison` already
                  states, on a card where the split had four series and a tile
                  had room for two. That is the noise the owner asked to be rid
                  of, arriving from inside a component rather than from a rail.

                  It is not an absence being hidden: with no comparison window
                  there is no baseline to name, the delta beside the number is
                  already suppressed for the same reason, and the control that
                  turns one on is two inches away saying what it is set to. */}
              {baseline !== null && (
                <p className="text-xs text-muted-foreground">
                  <bdi>
                    {t('rb.headline.from', {
                      date: formatDate(baseline.from, { style: 'day-month', language }),
                    })}
                  </bdi>
                </p>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
