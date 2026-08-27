/**
 * The §3.7 chart card, and **the place the kinds of "no data" are kept apart**.
 *
 * ```
 *  ┌──────────────────────────────────────────────────────┐
 *  │ Revenue                                           ↗  │  title + report link
 *  │ Computed 25 Jun 09:14                                │  fact 2 — this card's asOf
 *  │ ─────────────────────────────────────────────────    │
 *  │ No reading on 2 of 7 days.                            │  a GAP, said in words
 *  │            ╱╲      ╱                                  │
 *  │  ╱╲    ╱╲╱   ╲   ╱                                    │
 *  │ ─────────────────────────────────────────────────    │
 *  │ ▬ 19 – 25 Jun    ┄ 12 – 18 Jun                        │  legend, both periods
 *  └──────────────────────────────────────────────────────┘
 * ```
 *
 * ## The four states of a window, and why none may borrow another's rendering
 *
 * `SeriesWindow`'s own doc comment draws the line and this component is where
 * it becomes pixels:
 *
 * | Window | Means | Renders as |
 * |---|---|---|
 * | `points: []` | **no data for this range at all** | §3.7's one centred grey sentence; card, title and report link kept |
 * | some `value: null` | **a gap** — the day is in the range and has no reading | the line BREAKS, and the gaps are counted in a sentence |
 * | every `value: null` | we know the days and have no readings for any of them | the same gap sentence, at full count — not the no-data sentence, because we know which days are missing |
 * | every `value: 0` | the measurement ran and the answer was **zero** | a flat baseline plus "every value in this range is zero" |
 *
 * and a fifth, on the comparison side: `comparison: null` — there is no
 * comparison period. The legend chip does not disappear; it says so.
 *
 * **Collapsing all-zero into no-data is the defect this table exists to
 * prevent.** A week with zero incidents is the best week Support has had;
 * telling them the data is missing hides a good result behind an error-shaped
 * sentence, and they will go looking for a broken pipeline that is working.
 *
 * Rules applied
 *   §3.7        title, report link, plot, legend — in that order. The legend
 *               names BOTH periods explicitly with dates.
 *   §3.7        the no-data sentence is identical everywhere including its
 *               trailing period; it is one copy key, used once.
 *   R8          an empty card gets **one grey sentence**, never the first-run
 *               illustration — a chart with no data does not mean the resource
 *               has never existed.
 *   §11.2/V8    a card that FAILED is not this component's job: `ErrorState`
 *               `scope="card"` renders that, with a required retry. Empty is
 *               not error and they do not share a shape.
 *   §7.2        the report link is an `<a>` with a visible ring and an
 *               accessible name; the `↗` is a mark and is hidden.
 *   §9.2        the card mirrors. The PLOT does not — see `TrendChart`.
 */

import { ArrowUpRightIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TrendChart } from './TrendChart'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatDate, type Language, type Translate } from '@/lib'
import type { SeriesWindow, TimeSeries } from '@/data/types'

export interface ChartCardProps {
  series: TimeSeries
  /**
   * §3.7's report icon target. `TimeSeries` carries no route of its own, so the
   * board passes the `drilldownRoute` of the metric with the same key — which
   * is the surface that owns the number, by definition.
   */
  reportHref: string | null
  t: Translate
  language: Language
}

export function ChartCard({ series, reportHref, t, language }: ChartCardProps) {
  const title = t(`chart.${series.key}`)

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {/* Fact 2 — this card's own computation time, not the board's. */}
        <CardDescription>
          {t('overview.asOf', {
            time: formatDate(series.asOf, { style: 'day-month-time', language }),
          })}
        </CardDescription>
        {reportHref && (
          /* `CardAction`, not a bare div carrying the slot attribute: the slot
             is what switches `CardHeader` to `1fr auto`, and the COMPONENT also
             carries the `col-start-2 row-span-2` placement that puts the link
             beside the title instead of under it. */
          <CardAction>
            <Link
              to={reportHref}
              aria-label={t('overview.report.open', { report: title })}
              className="inline-flex size-6 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* A mark. It points out of the card, not forwards through
                  prose, so it does not mirror (§9.5). */}
              <ArrowUpRightIcon aria-hidden="true" className="size-4" />
            </Link>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="min-w-0">
        <Body series={series} t={t} language={language} />
      </CardContent>

      {series.current.points.length > 0 && (
        <CardFooter className="flex-wrap gap-x-4 gap-y-1.5">
          <Legend series={series} t={t} language={language} />
        </CardFooter>
      )}
    </Card>
  )
}

function Body({
  series,
  t,
  language,
}: {
  series: TimeSeries
  t: Translate
  language: Language
}) {
  const points = series.current.points

  /* No data for this range at all. §3.7 is exact: *"a chart with no data MUST
     keep its card, title, and report link, and MUST show one centred sentence
     — never an empty plot or a spinner"*, and the copy is identical
     everywhere, punctuation included. Not the first-run illustration (R8). */
  if (points.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{t('overview.noData')}</p>
  }

  /* The remaining states all draw a plot, because in all of them the
     measurement RAN. What differs is the sentence above it. */
  const gaps = points.filter((point) => point.value === null).length
  const allZero = points.every((point) => point.value === 0)

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {allZero && <p className="text-xs text-muted-foreground">{t('overview.allZero')}</p>}
      {gaps > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('overview.gaps', { gaps: String(gaps), total: String(points.length) })}
        </p>
      )}
      <TrendChart
        series={series}
        t={t}
        language={language}
        description={t('overview.chart.description', {
          title: t(`chart.${series.key}`),
          from: formatDate(series.current.periodStart, { style: 'day-month', language }),
          to: formatDate(series.current.periodEnd, { style: 'day-month', language }),
        })}
      />
    </div>
  )
}

/**
 * §3.7's legend: *"two chips: a solid line swatch + the current period and a
 * dotted line swatch + the comparison period"*, each naming its period **with
 * dates**. Bottom of the card.
 *
 * When there is no comparison period the chip does not disappear — it says so.
 * A missing chip reads as a chart that forgot; a chip that says "no comparison
 * period yet" reads as a chart that knows. `TimeSeries.comparison` is `null`
 * for most of this dataset and the reason is on the record: the legacy app
 * holds one point in time (`:6979`).
 */
function Legend({
  series,
  t,
  language,
}: {
  series: TimeSeries
  t: Translate
  language: Language
}) {
  const range = (window: SeriesWindow) =>
    t('overview.legend.range', {
      from: formatDate(window.periodStart, { style: 'day-month', language }),
      to: formatDate(window.periodEnd, { style: 'day-month', language }),
    })

  return (
    <>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Swatch dashed={false} />
        {/* `<bdi>`: `19 Jun – 25 Jun` is a numeral run around a neutral en
            dash, and it reorders to `Jun – 25 Jun 19` in an Arabic paragraph
            without isolation. §9.2 — the numeral run does not mirror. */}
        <bdi>{range(series.current)}</bdi>
      </span>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Swatch dashed />
        <bdi>
          {series.comparison ? range(series.comparison) : t('overview.noCompare.no-history')}
        </bdi>
      </span>
    </>
  )
}

/**
 * The line swatch. **Same hue for both; the dash is the whole difference**
 * (§3.7). Drawn as an SVG rather than a bordered `<span>` so the dash pattern
 * matches the plot's `strokeDasharray` exactly — a CSS dashed border and an SVG
 * dash array do not produce the same rhythm, and a legend that does not match
 * its own line is worse than no legend.
 */
function Swatch({ dashed }: { dashed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="2"
      viewBox="0 0 16 2"
      className="shrink-0 overflow-visible"
    >
      <line
        x1="0"
        y1="1"
        x2="16"
        y2="1"
        stroke={dashed ? 'var(--chart-comparison)' : 'var(--chart-series)'}
        strokeWidth="1.5"
        strokeDasharray={dashed ? '4 3' : undefined}
      />
    </svg>
  )
}
