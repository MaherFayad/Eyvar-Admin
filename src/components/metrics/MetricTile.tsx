/**
 * The metric tile — `DESIGN.md` §3.7, geometry from
 * `design/03-navattic-language.md` §4.9, which is the treatment in the drawer
 * of reference frame `79a31934`: a 3-up stat row of glyph, value, label, chip.
 *
 * ```
 *  ┌──────────────────────────────┐   white, 1px --ev-hairline, r8, no shadow
 *  │ ⛁                            │   16px icon, --ev-text-2, ABOVE the value
 *  │ 47                           │   17px/600 --ev-ink  (--text-lg)
 *  │ Active subscriptions         │   12px --ev-text-2, BELOW the value
 *  │ ↑ +8.1%  vs 1–25 May         │   neutral chip + grey trailing phrase
 *  └──────────────────────────────┘
 * ```
 *
 * Rules applied
 *   §4.9        icon above, value 17px/600 (`--text-lg`, **not** a display
 *               size — the reference solves 13-17 and 17 is chosen so the
 *               value out-weighs its label), label 12px below, delta in a chip.
 *   §4.9 / V6   **the delta chip is NEUTRAL and never takes the success or
 *               critical tone.** A number going up is not, by itself, good
 *               news; R7's tones carry status and a delta is a quantity. The
 *               reference renders `0%` neutral beside every metric.
 *
 *               **This overrides §3.7's "deltas MUST be colour-coded", and the
 *               data layer expects the colour**: `Metric.higherIsBetter` says
 *               its purpose is to drive it. D7 is later and narrower and wins
 *               on the visual half; the FIELD is still used, for the direction
 *               phrase a screen reader hears. Raised in the wave-4 handoff so
 *               the disagreement is on the record rather than in this file.
 *   §3.7        every metric with a comparison shows a delta; where none is
 *               possible the delta is an **em dash**, never `0%` and never
 *               blank. `deltaPercent === null` iff `comparison.kind === 'none'`
 *               — the client asserts the biconditional, so branching on either
 *               gives the same answer and this file branches on the union.
 *   §3.7 / §7.5 a delta carries a **direction caret** as well as a number.
 *               Under D7 the chip has no colour at all, so the caret is not
 *               redundancy — it is the only visual carrier, and the direction
 *               and whether it is good news are also words for a screen reader.
 *   §3.7 / D-08 / **AC-16** — the tile deep-links to the surface that owns the
 *               number, from `Metric.drilldownRoute`. The legacy exec tiles are
 *               not clickable at all.
 *   §7.2 / §7.4 a linked tile **is** an `<a>` wrapping the card, not a `<div>`
 *               with a stretched pseudo-element: the focusable element and the
 *               visible box are then the same object, the ring needs no
 *               `focus-within` proxy, and there is no `content-['…']`
 *               arbitrary value in the tree. A tile with no destination is a
 *               plain card and is not in the tab order — a focus stop that
 *               does nothing is worse than no focus stop.
 *   fact 2      `asOf` renders only when this metric is STALER than the
 *               board's own line. Six timestamps per page is noise; the one
 *               that disagrees with the page is signal.
 */

import {
  ArrowDownIcon,
  ArrowUpIcon,
  BanknoteIcon,
  GaugeIcon,
  LayersIcon,
  ShieldAlertIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ABSENT, formatDate, type Language, type Translate } from '@/lib'
import type { Metric, MetricCategory, MetricComparison } from '@/data/types'
import { formatMetricValue, formatSignedPercent } from './formatMetric'

/**
 * §4.9's leading glyph, chosen by the metric's **category** — the one field on
 * `Metric` that is about what kind of number it is.
 *
 * `lucide-react` is monochrome SVG drawing on `currentColor`, so the icon takes
 * `--ev-text-2` from its parent and cannot introduce a colour. The first cut of
 * this used literal Unicode marks (`◍`, `⚑`, `⌁`) and that was a defect: Inter
 * carries few of them, the browser fell through to `Segoe UI Emoji`, and the
 * tiles painted MULTICOLOUR glyphs — a colour entering the page from a font
 * fallback, which no token audit can see.
 *
 * Six categories, six icons, and the record type means a seventh category is a
 * compile error rather than a blank tile.
 */
const CATEGORY_ICON: Record<MetricCategory, LucideIcon> = {
  revenue: BanknoteIcon,
  subscriptions: LayersIcon,
  supply: UsersIcon,
  demand: GaugeIcon,
  service: GaugeIcon,
  risk: ShieldAlertIcon,
}

export interface MetricTileProps {
  metric: Metric
  /** The board's own freshness line. A metric older than this says so. */
  boardAsOf: string
  t: Translate
  language: Language
}

export function MetricTile({ metric, boardAsOf, t, language }: MetricTileProps) {
  const label = t(`metric.${metric.key}`)
  const Icon = CATEGORY_ICON[metric.category]
  const isStale = new Date(metric.asOf).getTime() < new Date(boardAsOf).getTime()

  const tile = (
    <Card
      className={cn('h-full gap-1.5', metric.drilldownRoute && 'transition-colors group-hover/tile:bg-muted')}
    >
      <div className="flex flex-col gap-1.5 px-(--card-spacing)">
        {/* Decoration. It repeats nothing the label does not already say, so
            it is hidden rather than described (§7.5). 16px, `--ev-text-2`. */}
        <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
        {/* R4 — tabular figures, so a row of tiles scans down its digits.
            **`<bdi>`, and it is not decoration.** `42,186.50 SAR` is two LTR
            runs, and in an Arabic paragraph the UBA moves the trailing `SAR`
            to the front — the tile rendered `SAR 42,186.50` before this. The
            same happens to `+8.1%`, whose leading sign is bidi-neutral and
            hops to the end. `money.ts` names the isolation as the COMPONENT's
            job, deliberately, so that embedding U+2068/U+2069 in the string
            does not poison copy-paste and assertions. This is that job. */}
        <bdi className="text-lg font-semibold tabular-nums text-foreground">
          {formatMetricValue(metric.value, metric.unit, language)}
        </bdi>
        <span className="text-xs text-muted-foreground">{label}</span>
        <ComparisonLine metric={metric} t={t} language={language} />
        {isStale && (
          <span className="text-xs text-muted-foreground">
            {t('overview.asOf', {
              time: formatDate(metric.asOf, { style: 'day-month-time', language }),
            })}
          </span>
        )}
      </div>
    </Card>
  )

  if (!metric.drilldownRoute) return tile

  return (
    /* §7.2 — the ring sits on the anchor and matches the card's own radius, so
       it traces the tile rather than a rectangle inside it. */
    <Link
      to={metric.drilldownRoute}
      className="group/tile block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {tile}
    </Link>
  )
}

/**
 * §3.7's delta line, and the three shapes a `MetricComparison` has.
 *
 * The union is why this cannot be got wrong: there is no way to render a
 * comparison without having said which kind it is, and "no comparison period
 * yet" cannot silently become `0%`.
 */
function ComparisonLine({
  metric,
  t,
  language,
}: {
  metric: Metric
  t: Translate
  language: Language
}) {
  const { comparison, deltaPercent } = metric

  /* §3.7 — an em dash, never `0%` and never blank, plus the reason in words.
     The three reasons read very differently to an operator: one resolves itself
     next month, one is a setting nobody has filled in, and one will not resolve
     until the volume is there. `types/metrics.ts` names all three. */
  if (comparison.kind === 'none' || deltaPercent === null) {
    return (
      <span className="flex flex-wrap items-baseline gap-1.5">
        <span aria-hidden="true" className="text-sm text-muted-foreground">
          {ABSENT}
        </span>
        <span className="text-xs text-muted-foreground">
          {t(`overview.noCompare.${comparison.kind === 'none' ? comparison.reason : 'no-history'}`)}
        </span>
      </span>
    )
  }

  const Caret = deltaPercent > 0 ? ArrowUpIcon : deltaPercent < 0 ? ArrowDownIcon : null
  /* `higherIsBetter` is the field D7 stopped us spending on colour. It is spent
     here instead: a screen reader hears "up, better" or "up, worse", which is
     the whole of what a green or red delta would have said, and it says it in
     a way that survives §7.5's never-colour-alone rule for free. */
  const direction =
    deltaPercent === 0
      ? t('overview.delta.flat')
      : t(
          deltaPercent > 0
            ? metric.higherIsBetter
              ? 'overview.delta.upBetter'
              : 'overview.delta.upWorse'
            : metric.higherIsBetter
              ? 'overview.delta.downWorse'
              : 'overview.delta.downBetter',
        )

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge tone="neutral">
        {/* §3.7's direction caret. A MARK: up and down encode magnitude, not
            reading direction, so it does not mirror (§9.5). Drawn as an icon
            rather than as `▲`, which Inter does not carry — a Unicode
            geometric shape falls through to whatever font does have it, and on
            Windows that font paints in colour. */}
        {Caret && <Caret aria-hidden="true" className="size-3" />}
        {/* Isolated for the same reason as the value — see the `<bdi>` above.
            `+8.1%` renders `8.1%+` without it under `dir="rtl"`. */}
        <bdi className="tabular-nums">{formatSignedPercent(deltaPercent, language)}</bdi>
        <span className="sr-only">{direction}</span>
      </Badge>
      <bdi className="text-xs text-muted-foreground">
        {againstLabel(comparison, metric, t, language)}
      </bdi>
    </span>
  )
}

/**
 * What the delta is measured against, in words.
 *
 * §3.7 requires the comparison period to be **named with dates**, which is only
 * possible because `MetricComparison` carries them — a bare `previousValue:
 * number` could not fill in `1–25 May`.
 */
function againstLabel(
  comparison: MetricComparison,
  metric: Metric,
  t: Translate,
  language: Language,
): string {
  if (comparison.kind === 'target') {
    return t('overview.compare.target', {
      target: formatMetricValue(comparison.value, metric.unit, language),
    })
  }
  if (comparison.kind === 'previous-period') {
    return t('overview.compare.period', {
      from: formatDate(comparison.periodStart, { style: 'day-month', language }),
      to: formatDate(comparison.periodEnd, { style: 'day-month', language }),
    })
  }
  return ''
}
