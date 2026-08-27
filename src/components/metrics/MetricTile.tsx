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
 *  │ Excludes pending applicants. │   12px --ev-text-2, R4-4 §4.2's caption
 *  │ ↑ +8.1%  vs 1–25 May         │   neutral chip + grey trailing phrase
 *  └──────────────────────────────┘
 * ```
 *
 * Rules applied
 *   R4-4 §4.2   the **caption** is the third text line and states what a reader
 *               must know to read the number correctly and nothing else: a
 *               scope limit, a denominator, or the direction that counts as
 *               good where the label does not make it obvious. Never a value,
 *               never a status, never the delta, never an action, never a
 *               link. One line, **≤38 characters** (R5-4 §4.1 — the 60 was
 *               measured wrong against a box a caption never gets), truncates,
 *               never wraps.
 *   R5-1 §1.3   **a tile whose `value` is absent states why, in the line where
 *               its delta would be.** No new line, no new geometry, no change
 *               to §4.9's tile order. Two consequences that were stated so they
 *               would not be discovered: the **caption does not render** while
 *               the value is absent (a denominator with no numerator is noise,
 *               and a tile carries one explanation, not two), and
 *               `comparison.reason` is not shown on such a tile either — it is
 *               the right thing to say when a value exists and a comparison
 *               does not, and this tile has no value.
 *
 *               R5-1 §1.4 is the reason this is NOT a caption kind: the caption
 *               qualifies a number that exists and sits above the delta line,
 *               so a slot that sometimes qualifies a number and sometimes
 *               explains that there is no number has to be READ to find out
 *               which. §4.2 gains no absence kind.
 *
 *               A measure with no store at all does not render as a tile at
 *               all (R4-11 §11.2) — not an em dash, not a skeleton. That is
 *               the fixture's decision and it never reaches this file.
 *   AC-605      a comparison of kind `target` with no statable percentage
 *               renders the em dash **plus its target**, not the no-history
 *               sentence. AC-605 governs `none` and this is not `none`. See
 *               `ComparisonLine` for the defect this closes.
 *
 *               **R5-2 rewrote it and added the half that was missing: the
 *               absence is announced to a screen reader, not only drawn**
 *               (V-8). The `none` branch already satisfied that — its reason is
 *               visible text. The `target` branch hid its em dash with nothing
 *               replacing it, so it takes a companion phrase for a reader.
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
 *               `focus-within` proxy, and there is no stretched-pseudo-element
 *               arbitrary value in the tree. A tile with no destination is a
 *               plain card and is not in the tab order — a focus stop that
 *               does nothing is worse than no focus stop.
 *
 *               **The sentence above used to NAME that arbitrary value, in
 *               backticks, and Tailwind emitted a rule for it.** v4 scans
 *               comments and tests as plain text, so a class written to say
 *               *"we do not use this"* shipped in `dist/assets/*.css` — found
 *               by grepping the built stylesheet, which is the only place it
 *               was ever visible. Do not write a class name in prose here.
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
import {
  ABSENT,
  formatDate,
  invariant,
  isolatedRunProps,
  type Language,
  type Translate,
} from '@/lib'
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
            does not poison copy-paste and assertions. This is that job.

            **The `<bdi>` is INSIDE the box now, and that fixes a defect no
            source audit could see.** `<bdi>` derives its own `direction` from
            its content, so a STRETCHED one — this is a child of a column
            flex, so it is full width — aligned `42` to ITS start. Under
            `dir="rtl"` the value flushed LEFT while its own label flushed
            RIGHT, on every tile on all eight boards. The span keeps the
            page's direction; the `<bdi>` isolates the run and nothing more. */}
        {/* **The em dash a `null` value renders is `aria-hidden` (R5-1 §10,
            state D).** It is a MARK standing in for a number, and on its own it
            says nothing — which is V-2's whole finding. What a reader is given
            instead is the reason, on the line below, in words. On a tile that
            has a value this attribute is absent and the number is announced
            normally. */}
        <span
          aria-hidden={metric.value === null || undefined}
          className="text-lg font-semibold tabular-nums text-foreground"
        >
          <bdi>{formatMetricValue(metric.value, metric.unit, language)}</bdi>
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
        {/* R4-4 §4.2 — the caption's slot is the THIRD text line: glyph, value,
            label, caption, delta chip. It states a scope limit, a denominator,
            or the direction that counts as good where the label does not make
            it obvious — and nothing else; ≤38 characters, **one line, truncates
            and never wraps**, because a caption that wraps changes the tile's
            height and D7 §4.9's grid is one object read across. Nineteen of
            the fifty-six seeded tiles carry one and nothing drew them.

            **`value === null` suppresses it, and that is R5-1 §1.3's first
            named consequence rather than a nicety.** A denominator with no
            numerator is noise, and a tile must carry ONE explanation. The
            explanation on such a tile is the absence reason on the line below,
            which answers the more important question. AC-641 / AC-674 /
            AC-675's *"cannot ship without a caption"* is an obligation on the
            tile **in its content state**. */}
        {metric.value !== null && metric.caption && (
          /* **`<bdi>`, and it is not decoration** — same reason as the value
             above. A caption is a *denominator*, so nearly every one of them
             is a numeral run inside a sentence: `7 days, 3 blocks, 2 tiers.`,
             `1 of 4 cities is live.`, `Ceiling is 3%.` Under `dir="rtl"` the
             UBA moved the leading `7` to the far end and the tile read
             `days, 3 blocks, 2 tiers 7` — caught by eye at 1280 in Arabic,
             invisible to every source audit. Isolation fixes it in both
             languages: `<bdi>` takes its direction from the first STRONG
             character, so an Arabic caption still lays out RTL. */
          <span className="truncate text-xs text-muted-foreground">
            <bdi>{t(metric.caption)}</bdi>
          </span>
        )}
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
      /* `h-full` IS LOAD-BEARING, not tidiness. `Card` below carries `h-full`,
         which resolves against THIS anchor — and an anchor that sizes to its
         content makes that percentage resolve to the content height, so a
         linked tile stops filling its grid cell. Measured: a captioned tile
         142px beside an uncaptioned 120px, ragged on all eight boards at both
         widths in both languages. Risk's one UNLINKED tile measured
         `gapBelow = 0`, which is what proved the grid was right and the anchor
         was wrong. */
      className="group/tile block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
  /* One bag, both places the trailing phrase is drawn. */
  const againstBox = isolatedRunProps({ className: 'text-xs text-muted-foreground' })

  /**
   * **No value at all — R5-1 §1.3, and the reason it lives HERE.**
   *
   * When the value is absent the delta is *entailed* to be absent: you cannot
   * compute a change from nothing. So the tile has exactly one line on which to
   * say one thing, and before this it said the less important of the two —
   * `— No comparison period yet` under a value that was itself an em dash, with
   * the sentence explaining the LOWER dash and nothing explaining the upper
   * one. That is V-2, and it is ambiguity by construction rather than by taste:
   * there is no reading of that tile, including the correct one, in which the
   * value's absence is explained.
   *
   * `comparison.reason` is not deleted by this and is not shown here. It is
   * still the right thing to say when a value exists and a comparison does not.
   *
   * `absenceReason` is non-null if and only if `value === null`, so a tile that
   * breaks the biconditional is a FIXTURE defect and says so by name rather
   * than resolving to a translation key that never existed — which would send
   * whoever reads the stack trace to the dictionary, which is the wrong file.
   */
  if (metric.value === null) {
    invariant(
      metric.absenceReason !== null,
      `Metric ${metric.key} has no value and no absenceReason (R5-1 §1.3)`,
    )
    return (
      <span className="flex flex-wrap items-baseline gap-1.5">
        <span aria-hidden="true" className="text-sm text-muted-foreground">
          {ABSENT}
        </span>
        {/* Visible text, so V-8 is satisfied without a companion: a reader
            hears the reason rather than silence where a number would be. */}
        <span className="text-xs text-muted-foreground">
          {t(`overview.absent.${metric.absenceReason}`)}
        </span>
      </span>
    )
  }

  /**
   * **A target that exists, and no percentage to state against it.** This
   * branch is new and it fixes a real defect: the test below used to be
   * `comparison.kind === 'none' || deltaPercent === null`, which printed
   * *"No comparison period yet"* underneath a number somebody had set an
   * explicit goal for.
   *
   * `clients/metrics.ts` documents the one break in the biconditional that
   * caused it: a value that is not zero against a target of **zero** has no
   * percentage — there is no percentage change from nothing — so `deltaPercent`
   * is `null` while the comparison survives, on purpose, *"so the tile can
   * still render `vs 0 target`"*.
   *
   * The casualty was `admin.overview.operatorsWithoutTwoFactor`: target `0`,
   * set by `USR-1`, **the only owned target on any board**, three of five
   * operators without two-factor including the one who moves money. The tile
   * said the console had no history when what it had was a goal it was
   * missing.
   *
   * **AC-605 is unaffected and that is the point.** It governs a tile *"whose
   * comparison is `none`"* — em dash plus one of exactly three reason strings —
   * and this tile's comparison is `target`. It was inside AC-605 by accident;
   * it is outside it by design.
   */
  if (comparison.kind === 'target' && deltaPercent === null) {
    return (
      <span className="flex flex-wrap items-baseline gap-1.5">
        {/* §3.7's em dash. The magnitude of the miss is not statable; the
            target is, and the value is on the line above it. */}
        <span aria-hidden="true" className="text-sm text-muted-foreground">
          {ABSENT}
        </span>
        {/* **V-8, and it is the only branch that needed it.** `— vs 0 target`
            hides its em dash from a reader and puts nothing in its place, so
            the tile announced the target and said nothing at all about the
            delta — an absence drawn and not announced. The `none` branch above
            and the absent-value branch above that both carry their reason as
            visible text and are already announced; this one is the hole.
            R5-2 names it as an obligation on AC-605 rather than leaving it a
            gap. */}
        <span className="sr-only">{t('overview.compare.targetNoDelta.sr')}</span>
        {/* `isolatedRunProps` rather than a `<bdi>` carrying the classes
            itself: the helper's `run` bag types `className` as `never`, so the
            box is the only place a class can land and §5.4's stretched-`<bdi>`
            defect cannot be reintroduced here by a later edit. */}
        <span {...againstBox.box}>
          <bdi {...againstBox.run}>{againstLabel(comparison, metric, t, language)}</bdi>
        </span>
      </span>
    )
  }

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
      <span {...againstBox.box}>
        <bdi {...againstBox.run}>{againstLabel(comparison, metric, t, language)}</bdi>
      </span>
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
