/**
 * One panel — one measure (and one group), one y-axis, one card.
 *
 * ```
 *  ┌──────────────────────────────────────────────────────┐
 *  │ Registered captains                            47 —  │  title · headline · delta
 *  │ Counts every captain record, whatever its status.    │  THE POPULATION (R5-15)
 *  │ Registration only. A captain suspended yesterday…    │  the caption
 *  │ 24 of 30 buckets have a reading.                     │  THE BASE
 *  │ ────────────────────────────────────────────────     │
 *  │          ╱╲      ╱                                    │
 *  │  ╱╲  ╱╲╱   ╲   ╱                                      │
 *  │ ────────────────────────────────────────────────     │
 *  │ ▬ 27 May – 25 Jun    ┄ 27 Apr – 26 May                │  legend, both periods
 *  └──────────────────────────────────────────────────────┘
 * ```
 *
 * ## The population is on the card, not in the definition
 *
 * **R5-15** requires an aggregate to declare its population, and a report
 * builder is where the failure that rule closes multiplies — every composed
 * measure is a new aggregate. Declaring it in the catalogue makes it *present*;
 * this card makes it *visible*. The sentence under the title names which rows
 * are counted, and the line under that states the **base**: how many of the
 * window's complete buckets actually carry a reading. A number whose base is
 * only in its definition gets quoted without it, and the screenshot travels
 * further than the definition does.
 *
 * ## Four bodies, and none may borrow another's
 *
 * | Condition | Body |
 * |---|---|
 * | `blocked` | the permission named. **Per series, not per result** — the other half of a two-measure report renders normally (§13.1, AC-850) |
 * | `failed` | this panel's own retry. Retrying it re-requests **this measure only** (AC-851) |
 * | no reading anywhere | §3.7's sentence, byte-identical, card and title kept (AC-844) |
 * | otherwise | the plot |
 *
 * A gap is not a zero and neither is an empty window: the middle two are
 * different sentences and collapsing them is how an outage reads as a collapse
 * in demand.
 *
 * Rules applied
 *   §3.7        title, plot, legend, in that order; the legend names BOTH
 *               periods explicitly with dates (AC-832).
 *   §7.3        a coerced chart type says so **inline in this card** — not a
 *               page banner (R5 sends critical state there and this is not
 *               critical) and not a toast (R10: a toast is a transient
 *               confirmation and this is a standing condition).
 *   R4-5        the delta chip is **neutral, always**. `higherIsBetter` words a
 *               sentence; it never colours a number.
 *   R5a         no red anywhere. A firing threshold is carried by the word and
 *               a `warning`-tone badge, and neither belongs on this card.
 *   §9.2        the card mirrors; the plot does not (`PanelChart`).
 */

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatMetricValue, formatSignedPercent } from '@/components/metrics'
import { comparisonWindow, OTHER_GROUP } from '@/data/clients'
import type { Measure, ReportPanel, ReportResult } from '@/data/types'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
import { PanelChart, seriesOfPanel } from './PanelChart'
import { periodDelta, rollUpSeries } from './rollup'

export interface PanelCardProps {
  panel: ReportPanel
  result: ReportResult
  /** The catalogue entry behind this panel. Its population is what the card states. */
  measure: Measure | null
  /** `line` or `bar` — already coerced to the legal type by the planner. */
  kind: 'line' | 'bar'
  /** Non-null when the planner coerced the chart type; the note renders inline. */
  coercedFrom: string | null
  /** Re-requests THIS measure only. AC-851. */
  onRetrySeries: (measureKey: string) => void
  /** §3.7's sentence, resolved by the caller so it stays byte-identical everywhere. */
  noDataSentence: string
  t: Translator
  language: Language
}

export function PanelCard({
  panel,
  result,
  measure,
  kind,
  coercedFrom,
  onRetrySeries,
  noDataSentence,
  t,
  language,
}: PanelCardProps) {
  const current = seriesOfPanel(result, panel, 'current')
  const comparison = seriesOfPanel(result, panel, 'comparison')

  const title = panelTitle(panel, t)

  return (
    /* `h-full` — a small multiple whose cards end at different heights is a set
       the eye reads as unrelated, and the row is one object read across. The
       grid cell already stretches; the card has to accept the height. */
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle>
          {/* A group value is USER CONTENT — a district name, a plan key. It is
              never translated and it carries its own direction, so it travels
              inside an isolated run while the layout stays on the box. */}
          {title.groupValue === null ? (
            title.text
          ) : (
            <span {...isolatedRunProps({ className: 'min-w-0' }).box}>
              <bdi {...isolatedRunProps().run}>{title.text}</bdi>
            </span>
          )}
        </CardTitle>
        <CardDescription className="flex flex-col gap-0.5">
          {/* **R5-15, visible.** Which rows this number counts. */}
          {measure && <span>{t(measure.population.predicateKey)}</span>}
          {measure?.captionKey && <span>{t(measure.captionKey)}</span>}
          {current && !current.blocked && !current.failed && (
            <Base panel={panel} result={result} measure={measure} t={t} />
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex min-w-0 flex-col gap-2">
        {coercedFrom && (
          /* §7.3 — the note is attached to the object it describes. */
          <p className="text-xs text-muted-foreground">
            {t('rb.warning.chartCoerced', { chartType: t(`rb.chartType.${kind}`), requested: t(`rb.chartType.${coercedFrom}`) })}
          </p>
        )}

        {current?.blocked ? (
          /* §13.1 — the viewer knows a series exists, knows they may not see
             it, and knows which permission to ask for. Silent redaction would
             produce a wrong picture that looks complete. */
          <p role="status" className="py-10 text-center text-sm text-muted-foreground">
            {t('rb.panel.blocked', { permission: current.blocked })}
          </p>
        ) : current?.failed ? (
          <div role="alert" className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">{t('rb.panel.failed')}</p>
            <Button variant="ghost" onClick={() => onRetrySeries(current.measureKey)}>
              {t('rb.panel.failed.retry')}
            </Button>
          </div>
        ) : !current || current.points.every((point) => point === null) ? (
          /* §3.7's sentence, punctuation included, card and title retained. */
          <p className="py-10 text-center text-sm text-muted-foreground">{noDataSentence}</p>
        ) : (
          <PanelChart
            panel={panel}
            result={result}
            kind={kind}
            description={t('rb.panel.chart.description', {
              title: title.text,
              from: formatDate(result.buckets[0] ?? '', { style: 'day-month', language }),
              to: formatDate(result.buckets[result.buckets.length - 1] ?? '', {
                style: 'day-month',
                language,
              }),
            })}
            t={t}
            language={language}
          />
        )}
      </CardContent>

      {current && !current.blocked && !current.failed && result.buckets.length > 0 && (
        <CardFooter className="flex-wrap items-center gap-x-4 gap-y-1.5">
          <Headline panel={panel} result={result} measure={measure} t={t} language={language} />
          <Legend
            result={result}
            hasComparison={comparison !== null}
            t={t}
            language={language}
          />
        </CardFooter>
      )}
    </Card>
  )
}

/**
 * §7.4's fold, named rather than string-matched. `Other` is always last and
 * **renders even at zero**, so it is visible that something was folded; the
 * canvas states how many.
 */
export function panelTitle(panel: ReportPanel, t: Translator): { text: string; groupValue: string | null } {
  const measureLabel = t(String(panel.titleParams['measure'] ?? ''))
  const group = panel.titleParams['group']
  if (group === undefined) return { text: t(panel.titleKey, { measure: measureLabel }), groupValue: null }
  const groupValue = String(group)
  const groupLabel = groupValue === OTHER_GROUP ? t('rb.panel.other') : groupValue
  return {
    text: t(panel.titleKey, { measure: measureLabel, group: groupLabel }),
    groupValue: groupLabel,
  }
}

/** **The base.** Derived from the response, so a hardcoded figure would not follow the window. */
function Base({
  panel,
  result,
  measure,
  t,
}: {
  panel: ReportPanel
  result: ReportResult
  measure: Measure | null
  t: Translator
}) {
  const current = seriesOfPanel(result, panel, 'current')
  if (!current || !measure) return null
  const { readings, eligible } = rollUpSeries(current, measure.bucketAggregate, result.buckets.length)
  return <span>{t('rb.panel.readings', { readings, total: eligible })}</span>
}

/**
 * The panel's one number, and its period delta.
 *
 * The rollup is the **catalogue's** declared aggregate applied across buckets
 * (`rollup.ts`), never a choice made here. The delta is neutral in every
 * direction — R4-5 — and an absent one is an em dash, never `0%` and never
 * blank (AC-834).
 */
function Headline({
  panel,
  result,
  measure,
  t,
  language,
}: {
  panel: ReportPanel
  result: ReportResult
  measure: Measure | null
  t: Translator
  language: Language
}) {
  const current = seriesOfPanel(result, panel, 'current')
  const comparison = seriesOfPanel(result, panel, 'comparison')
  if (!current || !measure) return null

  const now = rollUpSeries(current, measure.bucketAggregate, result.buckets.length)
  const before = comparison
    ? rollUpSeries(comparison, measure.bucketAggregate, result.buckets.length)
    : null
  const delta = periodDelta(now.value, before?.value ?? null)

  return (
    <span className="flex items-baseline gap-2">
      <span className="text-base font-semibold tabular-nums text-foreground">
        {formatMetricValue(now.value, panel.unit, language)}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">
        {delta === null ? formatMetricValue(null, panel.unit, language) : formatSignedPercent(delta * 100, language)}
      </span>
      <span className="sr-only">
        {measure.higherIsBetter ? t('rb.alert.direction.good') : t('rb.alert.direction.bad')}
      </span>
    </span>
  )
}

/**
 * §3.7's legend: a solid swatch and the current period, a dashed swatch and the
 * comparison period, **each naming its period with dates** (AC-832).
 *
 * When there is no comparison the chip does not disappear — it says so. A
 * missing chip reads as a chart that forgot; a chip that says there is no
 * comparison period reads as a chart that knows.
 */
function Legend({
  result,
  hasComparison,
  t,
  language,
}: {
  result: ReportResult
  hasComparison: boolean
  t: Translator
  language: Language
}) {
  const from = result.buckets[0]
  const to = result.buckets[result.buckets.length - 1]
  if (from === undefined || to === undefined) return null

  const kind = result.query.periodComparison
  const prior =
    kind === 'none' ? null : comparisonWindow({ from, to }, kind)

  const range = (a: string, b: string) =>
    t('rb.legend.range', {
      from: formatDate(a, { style: 'day-month', language }),
      to: formatDate(b, { style: 'day-month', language }),
    })

  return (
    <>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Swatch dashed={false} />
        {/* A numeral run around a neutral en dash reorders in an Arabic
            paragraph without isolation (§9.2). */}
        <bdi>{range(from, to)}</bdi>
      </span>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Swatch dashed />
        <bdi>
          {hasComparison && prior ? range(prior.from, prior.to) : t('rb.legend.noCompare')}
        </bdi>
      </span>
    </>
  )
}

/**
 * The line swatch. **Same hue for both; the dash is the whole difference**
 * (§3.7). Drawn as an SVG rather than a bordered element so the dash pattern
 * matches the plot's exactly — a CSS dashed border and an SVG dash array do not
 * produce the same rhythm, and a legend that does not match its own line is
 * worse than no legend.
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
