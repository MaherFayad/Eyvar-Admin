/**
 * The metric tile — `DESIGN.md` §3.7, geometry from
 * `design/03-navattic-language.md` §4.9, which is the treatment in the drawer
 * of reference frame `79a31934` (a 3-up stat row: glyph, value, label, chip).
 *
 * ```
 *  ┌──────────────────────────────┐   white, 1px --ev-hairline, r8, no shadow
 *  │ ◉                            │   16px glyph, --ev-text-2, ABOVE the value
 *  │ 4,218                        │   17px/600 --ev-ink  (--text-lg)
 *  │ Active captains              │   12px --ev-text-2, BELOW the value
 *  │ ▲ 12%  vs previous 14 days   │   neutral chip + grey trailing phrase
 *  └──────────────────────────────┘
 * ```
 *
 * Rules applied
 *   §4.9        glyph above, value 17px/600 (`--text-lg`, **not** a display
 *               size — the reference solves 13-17 and 17 is chosen so the value
 *               out-weighs its label), label 12px below, delta in a chip.
 *   §4.9 / V6   **the delta chip is NEUTRAL and never takes the success or
 *               critical tone.** A number going up is not, by itself, good
 *               news; R7's tones carry status and a delta is a quantity. The
 *               reference renders `0%` neutral beside every metric.
 *   §3.7        every metric with a comparison MUST show a delta; where no
 *               comparison is possible the delta is an **em dash**, never `0%`
 *               and never blank. `0%` is reserved for "measured, did not move".
 *   §3.7 / §7.5 a delta carries a **direction caret** as well as a number.
 *               Under D7 the chip has no colour at all, so the caret is not
 *               redundancy — it is the only carrier, and the direction is also
 *               a word for a screen reader.
 *   §3.7 / D-08 / **AC-16** — the tile deep-links to the surface that owns the
 *               number. The legacy exec tiles are not clickable at all.
 *   §7.2 / §7.4 a linked tile **is** an `<a>` wrapping the card, not a `<div>`
 *               with a stretched pseudo-element: the focusable element and the
 *               visible box are then the same object, the ring needs no
 *               `focus-within` proxy, and there is no `content-['…']`
 *               arbitrary value in the tree. A tile with no destination is a
 *               plain card and is not in the tab order — a focus stop that
 *               does nothing is worse than no focus stop.
 *   contract    **nothing here computes.** `changePercent` arrives signed from
 *               the data layer; this file picks a glyph and a string for it.
 *   fact 2      `asOf` renders only when this metric is STALER than the page's
 *               own line. Thirty-four timestamps is noise; the two that
 *               disagree with the page are signal.
 */

import {
  ActivityIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BanknoteIcon,
  CarIcon,
  ClockIcon,
  DatabaseIcon,
  FileClockIcon,
  FlagIcon,
  GaugeIcon,
  InboxIcon,
  LayersIcon,
  MapPinIcon,
  RepeatIcon,
  RouteIcon,
  ScaleIcon,
  Share2Icon,
  StarIcon,
  TagIcon,
  TicketIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ABSENT, formatDate, type Language, type Translate } from '@/lib'
import type { Comparison, Metric, MetricIcon } from '@/screens/metrics/contract'
import { formatMetricValue, formatSignedPercent } from './formatMetric'

/**
 * The icon vocabulary, resolved. `lucide-react` is monochrome SVG drawing on
 * `currentColor`, so the glyph takes `--ev-text-2` from its parent and cannot
 * introduce a colour — which the literal Unicode marks this replaced could and
 * did, by falling through Inter to a colour-emoji font.
 */
const ICONS: Record<MetricIcon, typeof ActivityIcon> = {
  money: BanknoteIcon,
  subscription: LayersIcon,
  captain: CarIcon,
  trip: RouteIcon,
  trend: TrendingUpIcon,
  gauge: GaugeIcon,
  rating: StarIcon,
  duration: ClockIcon,
  continuity: RepeatIcon,
  flag: FlagIcon,
  signal: ActivityIcon,
  churn: TrendingDownIcon,
  rider: UsersIcon,
  promo: TagIcon,
  referral: Share2Icon,
  zone: MapPinIcon,
  city: MapPinIcon,
  expansion: TrendingUpIcon,
  inbox: InboxIcon,
  request: RepeatIcon,
  ticket: TicketIcon,
  dispute: ScaleIcon,
  team: UsersIcon,
  audit: FileClockIcon,
  data: DatabaseIcon,
}

export interface MetricTileProps {
  metric: Metric
  /** The page's own freshness line. A tile older than this says so. */
  pageAsOf: string
  t: Translate
  language: Language
}

export function MetricTile({ metric, pageAsOf, t, language }: MetricTileProps) {
  const label = t(metric.labelKey)
  const value = formatMetricValue(metric.value, language)
  const isStale = new Date(metric.asOf).getTime() < new Date(pageAsOf).getTime()
  const Icon = metric.icon ? ICONS[metric.icon] : null

  const tile = (
    <Card
      className={cn(
        'h-full gap-1.5',
        metric.href && 'transition-colors group-hover/tile:bg-muted',
      )}
    >
      <div className="flex flex-col gap-1.5 px-(--card-spacing)">
        {/* Decoration. It repeats nothing the label does not already say, so it
            is hidden rather than described (§7.5). 16px, `--ev-text-2`. */}
        {Icon && <Icon aria-hidden="true" className="size-4 text-muted-foreground" />}
        {/* R4 — tabular figures, so a row of tiles scans down its digits. */}
        <span className="text-lg font-semibold tabular-nums text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
        <ComparisonLine comparison={metric.comparison} t={t} language={language} />
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

  if (!metric.href) return tile

  return (
    /* §7.2 — the ring sits on the anchor and matches the card's own radius, so
       it traces the tile rather than a rectangle inside it. */
    <Link
      to={metric.href}
      className="group/tile block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {tile}
    </Link>
  )
}

/**
 * §3.7's delta line, and the three shapes it has.
 *
 * The union is why this cannot be got wrong: there is no way to render a
 * comparison without having said which kind it is, and "no comparison period
 * yet" cannot silently become `0%`.
 */
function ComparisonLine({
  comparison,
  t,
  language,
}: {
  comparison: Comparison
  t: Translate
  language: Language
}) {
  if (comparison.kind === 'previous-period') {
    const change = comparison.changePercent
    const Caret = change > 0 ? ArrowUpIcon : change < 0 ? ArrowDownIcon : null
    const direction =
      change > 0
        ? t('overview.delta.up')
        : change < 0
          ? t('overview.delta.down')
          : t('overview.delta.flat')
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        <Badge tone="neutral">
          {/* §3.7's direction caret. A MARK: up and down encode magnitude, not
              reading direction, so it does not mirror (§9.5). Drawn as an icon
              rather than as `▲`, which Inter does not carry — a Unicode
              geometric shape falls through to whatever font does have it, and
              on Windows that font paints in colour. */}
          {Caret && <Caret aria-hidden="true" className="size-3" />}
          <span className="tabular-nums">
            {formatSignedPercent(comparison.changePercent, language)}
          </span>
          {/* The direction as a word, for anyone who cannot see the caret. */}
          <span className="sr-only">{direction}</span>
        </Badge>
        <span className="text-xs text-muted-foreground">{t(comparison.periodLabelKey)}</span>
      </span>
    )
  }

  if (comparison.kind === 'target') {
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        {/* Still neutral. A target that is met is not a `success` badge: R7's
            tones are lifecycle status, and `met` is carried by the word. */}
        <Badge tone="neutral">
          <span className="tabular-nums">{formatMetricValue(comparison.target, language)}</span>
        </Badge>
        <span className="text-xs text-muted-foreground">
          {comparison.met ? t('overview.target.met') : t('overview.target.missed')}
        </span>
      </span>
    )
  }

  /* §3.7 — an em dash, never `0%` and never blank, plus the reason in words.
     `no-previous-period` and `not-comparable` read very differently to an
     operator: one will resolve itself next week and the other will not.
     `ABSENT` rather than a literal, so 34 screens spell it the same way. */
  return (
    <span className="flex flex-wrap items-baseline gap-1.5">
      <span aria-hidden="true" className="text-sm text-muted-foreground">
        {ABSENT}
      </span>
      <span className="text-xs text-muted-foreground">
        {comparison.reason === 'no-previous-period'
          ? t('overview.compare.noPeriod')
          : t('overview.compare.notComparable')}
      </span>
    </span>
  )
}
