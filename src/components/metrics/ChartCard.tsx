/**
 * The §3.7 chart card, and **the place the three kinds of "no data" are kept
 * apart**.
 *
 * ```
 *  ┌──────────────────────────────────────────────────────┐
 *  │ Trips started                                     ↗  │  title + report link
 *  │ Computed 25 Jun 09:14                                │  fact 2 — this card's asOf
 *  │ ─────────────────────────────────────────────────    │
 *  │ No reading on 3 of the last 14 days.                  │  a GAP, said in words
 *  │            ╱╲      ╱                                  │
 *  │  ╱╲    ╱╲╱   ╲   ╱                                    │
 *  │ ─────────────────────────────────────────────────    │
 *  │ ▬ 12–25 Jun      ┄ 28 May–11 Jun                      │  legend, both periods
 *  └──────────────────────────────────────────────────────┘
 * ```
 *
 * ## The three kinds, and why they must not share a rendering
 *
 * | Kind | What the operator must conclude | Rendering |
 * |---|---|---|
 * | **no comparison period yet** | the number is real; there is nothing to compare it to *yet* | the plot draws; the legend's comparison chip carries the words instead of dates; the tile's delta is an em dash |
 * | **a gap mid-series** | some days have no reading — the line is **broken**, not zero | `connectNulls={false}` plus a sentence counting the gaps |
 * | **a range that is genuinely all zero** | the measurement ran and the answer was zero — often the *good* answer | the plot draws a flat baseline plus "every value in this range is zero" |
 *
 * And the fourth case, which is not one of the three: the range returned
 * nothing at all. §3.7 is exact about this one — *"a chart with no data MUST
 * keep its card, title, and report link, and MUST show one centred sentence —
 * never an empty plot or a spinner"*, and the copy is identical everywhere,
 * punctuation included.
 *
 * **Collapsing all-zero into no-data is the defect this table exists to
 * prevent.** A week with zero no-shows is the best week the ops team has had;
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
import { BreakdownList } from './BreakdownList'
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
import type { ChartCardData } from '@/screens/metrics/contract'

export interface ChartCardProps {
  card: ChartCardData
  t: Translate
  language: Language
}

export function ChartCard({ card, t, language }: ChartCardProps) {
  const title = t(card.titleKey)

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {/* Fact 2 — this card's own computation time, not the page's. */}
        <CardDescription>
          {t('overview.asOf', {
            time: formatDate(card.asOf, { style: 'day-month-time', language }),
          })}
        </CardDescription>
        {card.reportHref && (
          /* `CardAction`, not a bare div with the slot attribute: the slot is
             what switches `CardHeader` to `1fr auto`, and the COMPONENT also
             carries the `col-start-2 row-span-2` placement that puts the link
             beside the title instead of under it. */
          <CardAction>
            <Link
              to={card.reportHref}
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
        <ChartBodyView card={card} t={t} language={language} />
      </CardContent>

      {card.body.kind === 'trend' && (
        <CardFooter className="flex-wrap gap-x-4 gap-y-1.5">
          <Legend card={card} t={t} language={language} />
        </CardFooter>
      )}
    </Card>
  )
}

function ChartBodyView({ card, t, language }: ChartCardProps) {
  const { body } = card

  /* The fourth case. One centred grey sentence; card, title and report link
     all kept, exactly as §3.7 requires. Not an empty plot, not a spinner, and
     not the first-run illustration (R8). */
  if (body.kind === 'no-range-data') {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">{t('overview.noData')}</p>
    )
  }

  if (body.kind === 'breakdown') {
    /* A distribution with nothing in it. Still one grey sentence, but a
       DIFFERENT one: "no rows" and "no readings in this range" are not the
       same fact and an operator acts on them differently. */
    if (body.rows.length === 0) {
      return (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t('overview.noBreakdown')}
        </p>
      )
    }
    return <BreakdownList rows={body.rows} unit={body.unit} t={t} language={language} />
  }

  /* A trend. Both of the remaining "no data" kinds are STATED IN WORDS above a
     plot that still draws, because in both cases the measurement ran. */
  const gaps = body.points.filter((point) => point.value === null).length

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {body.allZero && (
        <p className="text-xs text-muted-foreground">{t('overview.allZero')}</p>
      )}
      {gaps > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('overview.gaps', { gaps: String(gaps), total: String(body.points.length) })}
        </p>
      )}
      <TrendChart
        body={body}
        t={t}
        language={language}
        description={t('overview.chart.description', {
          title: t(card.titleKey),
          period: t(body.period.labelKey),
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
 * period yet" reads as a chart that knows.
 */
function Legend({ card, t, language }: ChartCardProps) {
  if (card.body.kind !== 'trend') return null
  const { period, comparison } = card.body

  const range = (from: string, to: string) =>
    t('overview.legend.range', {
      from: formatDate(from, { style: 'day-month', language }),
      to: formatDate(to, { style: 'day-month', language }),
    })

  return (
    <>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Swatch dashed={false} />
        <span>{range(period.from, period.to)}</span>
      </span>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Swatch dashed />
        <span>
          {comparison
            ? range(comparison.period.from, comparison.period.to)
            : t('overview.compare.noPeriod')}
        </span>
      </span>
    </>
  )
}

/**
 * The line swatch. **Same hue for both; the dash is the whole difference**
 * (§3.7). Drawn as an SVG rather than a bordered `<span>` so the dash pattern
 * matches the plot's `strokeDasharray` exactly — a CSS dashed border and an
 * SVG dash array do not produce the same rhythm, and a legend that does not
 * match its own line is worse than no legend.
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
