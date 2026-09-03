/**
 * One panel — one measure (and one group), one y-axis, one card.
 *
 * ```
 *  ┌──────────────────────────────────────────────────────┐
 *  │ Registered captains                                  │  title
 *  │ Counts every captain record, whatever its status.    │  THE POPULATION (R5-15)
 *  │ Registration only. A captain suspended yesterday…    │  the caption
 *  │ 24 of 30 buckets have a reading.                     │  THE BASE
 *  │ ────────────────────────────────────────────────     │
 *  │ 47   ↑ +8.1%                                         │  value · delta (§3.7)
 *  │ Registered captains is up 8.1% against 27 Apr – 26…  │  the derived read (§A8)
 *  │          ╱╲      ╱                                    │
 *  │  ╱╲  ╱╲╱   ╲   ╱                                      │
 *  │ ────────────────────────────────────────────────     │
 *  │ ▬ 27 May – 25 Jun    ┄ 27 Apr – 26 May                │  legend, both periods
 *  └──────────────────────────────────────────────────────┘
 * ```
 *
 * ## A number is never alone, and it comes BEFORE the picture
 *
 * §3.7's anatomy is *"title, report link, value, delta, chart, legend — in that
 * order"*, and this card used to put the value and the delta in the footer,
 * after the plot. That is a house non-conformance and not merely a parity gap:
 * a reader met the shape of a measure before its quantity, and the panel's one
 * number sat below the thing it was the summary of.
 *
 * The headline now leads the body. Under it, `trendRead` states the movement in
 * one sentence, **derived every render** from the same delta the caret is drawn
 * from — never authored, because a hand-written sentence about data is true
 * only until the data moves. Where there is no comparison it says so; it is
 * never dropped, because a dropped line leaves a bare number and no way to tell
 * a missing sentence from a missing baseline.
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
 *   §3.7        *"Deltas MUST be colour-coded and carry a direction caret;
 *               colour alone is insufficient."* The run is `MetricDelta`, the
 *               same component the metric boards use, so this panel and the
 *               board tile for the same measure state one judgement.
 *   R4-5        **not contradicted, and the reason is structural.** R4-5
 *               forbids a TONED BADGE — D7 §4.9's plate — and there is no
 *               badge here. The caret is a shape, the sign is in the text, and
 *               `overview.delta.*`'s full clause is announced `sr-only` on
 *               every delta, so hue is the fourth carrier of valence and the
 *               sole carrier of nothing. `MetricDelta`'s own header argues it
 *               in full.
 *   R5a         `text-critical-foreground` on a falling delta is a FOREGROUND
 *               on the page ground, not one of R7's toned surfaces. R5a's four
 *               places govern destructive affordances and critical banners; a
 *               metric moving the wrong way is neither, and the same treatment
 *               already ships on every metric board.
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
import { MetricDelta, formatMetricValue, trendRead } from '@/components/metrics'
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

  /* **There is a line to draw** — the one condition the headline shares with
     the plot. A blocked or failed series has no number, and a window of pure
     gaps has none either: `rollUpSeries` would return `null` for both the
     value and the delta, and a pair of em dashes above §3.7's no-data sentence
     states nothing the sentence does not state better. */
  const drawable =
    current !== null &&
    current.blocked === null &&
    current.failed === null &&
    !current.points.every((point) => point === null)

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
        {/* **§3.7's rows three and four, before the plot.** Where there is no
            line to draw the body below is the whole card, and it says what is
            wrong in words — see `drawable`. */}
        {drawable && result.buckets.length > 0 && (
          <Headline
            panel={panel}
            result={result}
            measure={measure}
            title={title.text}
            t={t}
            language={language}
          />
        )}

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
 * **The panel's one number, its period delta, and the sentence they make.**
 *
 * The rollup is the **catalogue's** declared aggregate applied across buckets
 * (`rollup.ts`), never a choice made here. An absent delta is an em dash, never
 * `0%` and never blank (AC-834) — and the em dash is `aria-hidden`, so the
 * words that replace it are the read sentence directly beneath, which names the
 * absence rather than leaving it drawn and unannounced.
 *
 * ## The copy comes from the metric boards' dictionary, on purpose
 *
 * `overview.chart.read.*` and `overview.delta.*` are resolved here rather than
 * copied into `rb.*`, on the precedent this module already set for
 * `overview.noData`: *"the board's key, not a copy of its string … so
 * 'identical everywhere' is true by construction rather than by two
 * dictionaries agreeing today"* (`ReportsScreen`, AC-844). One measure charted
 * on a board and in a report must not read differently in the two places.
 *
 * What was here before and is gone: `rb.alert.direction.good` / `.bad` rendered
 * `sr-only` beside the delta. That is **alert-threshold copy** — it words
 * whether crossing a line is good news — and a chart has no threshold, so a
 * reader was told a measure was "good" whichever way it had moved.
 */
function Headline({
  panel,
  result,
  measure,
  title,
  t,
  language,
}: {
  panel: ReportPanel
  result: ReportResult
  measure: Measure | null
  /** Already resolved by the card, so the sentence and the card title agree. */
  title: string
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

  /* The same window the legend's dashed chip names, from the same function —
     so the dates in the sentence and the dates under the plot cannot drift. */
  const from = result.buckets[0]
  const to = result.buckets[result.buckets.length - 1]
  const kind = result.query.periodComparison
  const baseline =
    comparison && kind !== 'none' && from !== undefined && to !== undefined
      ? comparisonWindow({ from, to }, kind)
      : null

  const read = trendRead({
    title,
    /* `periodDelta` returns a fraction; §3.7's delta text and the sentence both
       take percentage points. One conversion, at the boundary. */
    deltaPercent: delta === null ? null : delta * 100,
    baseline,
    language,
  })
  const sentence = isolatedRunProps({ className: 'text-xs text-muted-foreground' })

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-base font-semibold tabular-nums text-foreground">
          {formatMetricValue(now.value, panel.unit, language)}
        </span>
        <MetricDelta
          deltaPercent={delta === null ? null : delta * 100}
          higherIsBetter={measure.higherIsBetter}
          t={t}
          language={language}
        />
      </span>
      {/* Three isolated runs in one sentence — a title that may carry a group
          value, a percentage and a date range — so the paragraph is isolated
          and wraps rather than truncates, following `BreakdownList`'s
          `Caveat`. */}
      <p {...sentence.box}>
        <bdi {...sentence.run}>{t(read.key, read.params)}</bdi>
      </p>
    </div>
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
