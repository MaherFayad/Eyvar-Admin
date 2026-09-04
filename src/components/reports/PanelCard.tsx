/**
 * One panel — one measure (and one group), one y-axis, one card.
 *
 * ```
 *  ┌──────────────────────────────────────────────────────┐
 *  │ Registered captains                          📈  ⋯   │  title · chrome (§A12/§1.5)
 *  │ 47   ↑ +8.1%                                         │  THE ANSWER — 28px (§A8)
 *  │ Registered captains is up 8.1% against 27 Apr – 26…  │  the derived read (§A8)
 *  │          ╱╲      ╱                                    │
 *  │  ╱╲  ╱╲╱   ╲   ╱                                      │
 *  │ ────────────────────────────────────────────────     │
 *  │  ▬ 27 May – 25 Jun  ┄ [Previous] 27 Apr…  ⊞ Open …   │  legend + action (§A9/§P4)
 *  │  Counts every captain record, whatever its status.   │  THE POPULATION (R5-15)
 *  │  Registration only… 24 of 30 buckets have a reading. │  caption · base
 *  │ ────────────────────────────────────────────────     │
 *  │ This measure also appears on                         │
 *  │ ┌──────────────┐ ┌──────────────┐                    │  the related strip (§A12)
 *  │ │ 📊 Growth    │ │ 📊 Overview  │                    │  opt-in, real destinations
 *  │ └──────────────┘ └──────────────┘                    │
 *  └──────────────────────────────────────────────────────┘
 * ```
 *
 * ## The number is the answer; everything else is support
 *
 * This card shipped its one number at `text-base` — **16px, the same step as
 * its own title and the same step as the paragraph under it** — under three
 * lines of catalogue prose. A rendered audit put it plainly: *"the report
 * canvas has no hierarchy … nothing on this canvas tells the eye where to
 * land"*, and *"the panels read as documentation, not as an answer"*. The
 * metric boards had already answered the same question for the same class of
 * figure and answered it differently, so one product held two verdicts on how
 * big the number a screen is about should be.
 *
 * The boards' answer is now this card's answer. `ChartCard` — a chart with a
 * headline, which is exactly what a panel is — sets its numeral at
 * `--text-kpi`, puts the delta on its baseline and the derived sentence under
 * it, and gives the slot above the number to **one short line, or none**. This
 * card does the same, and the three lines of prose move to the foot.
 *
 * **Two rungs, off `framed`, because the two callers are different surfaces.**
 * `--text-kpi` (28) is the PAGE's numeral and the builder panel is the page's
 * answer. A dashboard tile is a reading inside a frame that already carries a
 * heading, a range and a freshness line — and a nine-panel split tile would put
 * nine 28px numerals inside one 16px tile title, which inverts the tile's own
 * hierarchy rather than establishing the panel's. So the tile takes the step
 * below, `--text-lg` (20) — the ramp's sub-display rung, already the ledger
 * balance and the zone figures. **In Latin both steps have a 32px line box**,
 * so the switch changes the weight of the voice and not the height of the card;
 * in Arabic the KPI rung takes the +4 the whole ramp takes there and the
 * builder's quantity row measures 36 against the tile's 32, which is the
 * language's own line box rather than a wrap (measured,
 * `scratch/panel-states.mjs`).
 *
 * Neither rung is minted here and neither is `--text-kpi-hero`: that token's
 * own note pins 40 to the `--ev-hero` band and records that *"no surface in the
 * product carries both a 36 and a 40"*. A card is not the band.
 *
 * Measured in Chromium rather than assumed (`scratch/panel-hierarchy.mjs`,
 * 1280 / 1440 / 1920, before and after) — the builder panel runs 298–602px wide
 * and the tile panel 327–514px, and the numeral fits with its delta on one
 * baseline at every one of them.
 *
 * ## The TITLE drops a step too, and only on a tile
 *
 * A tile draws its own report name at `--text-base`. A panel title at the same
 * step inside it ranks the part level with the whole, so a reader arriving at a
 * board has two 16px headings on one card and no order between them. `text-sm`
 * on the tile branch gives the tile a real ladder — **report name 16, the
 * answer 20, the panel name 14, the prose 12** — which is the order a reader
 * needs: *which tile · what it says · which panel said it*. The builder keeps
 * 16, because there the panel title IS the heading of the thing on screen and
 * nothing above it competes.
 *
 * It is a one-line change and it was held back once, because
 * `DistributionCard` draws the sibling panel of a pie tile from its own file
 * and would have kept 16 — a line tile and a pie tile sit side by side on
 * `DSH-1` (positions 2 and 3), and two panel titles at two steps in one row is
 * a worse inconsistency than one step too high in both. **Both files now take
 * the switch from the same prop**, and `distribution.test.tsx` asserts them
 * together so they cannot separate again.
 *
 * Measured after, on `DSH-1` at 1280 / 1440 / 1920 in both languages
 * (`scratch/dist-ladder.mjs`): every tile on the board, line and pie alike,
 * reads 16 / 14 / 20 / 12 in Latin and 16 / 14 / 20 / 13 in Arabic.
 *
 * ## The population moved to the foot. It did not move out of the card
 *
 * **R5-15 is not waived and nothing is deleted.** The rule is that an aggregate
 * declares its population; the failure it closes is a number quoted without the
 * rows it counted. What it does not say is that the declaration must be the
 * first thing read — and three sentences of catalogue prose between a title and
 * its number is what made this panel read as a definition rather than an
 * answer.
 *
 * So all three lines — the population predicate, the measure's caption, and the
 * **base** (how many of the window's complete buckets carry a reading) — render
 * unconditionally in the card's foot, under the plot, as one grey paragraph.
 * Not behind a disclosure: a disclosure would need a label this product has no
 * string for, and a fact a reader has to click for is a fact that does not
 * travel in the screenshot. On screen, always, with no interaction — which is
 * the same guarantee the rule had before, reached in two seconds instead of
 * being waded through.
 *
 * Each sentence keeps its own `<bdi>` rather than being concatenated into one
 * string: they are three separate translated sentences, each with its own
 * numeral or proper-noun runs, and joining them would need a fourth key.
 *
 * The paragraph itself is `PanelProse`, exported, because `DistributionCard`
 * owes the same tile the same footnote in the same step and its BASE counts a
 * different thing (groups, not buckets).
 *
 * ## The rollup belongs to the SERIES, not to the panel's measure key
 *
 * The headline read `measure.bucketAggregate` and applied it to whatever
 * numbers the series carried. `ResultTable`'s summary column did the same and
 * shipped **`1,200% total`** — twelve retention percentages summed under a
 * `count` measure's declaration, because `resolveCohort` re-declares the series
 * to `unit: 'percent'` while its anchor `riders.joined` declares `count`. The
 * same computation with the same inputs was here, set at `--text-kpi`.
 *
 * `declaredAggregate` now decides, and where the catalogue entry is not about
 * these numbers there is **no numeral, no delta and no read sentence**. The
 * BASE stays, because `readings of eligible` is measured whatever the aggregate
 * is — see `readingBase`. `cohortHeadline.test.tsx` renders `RPT-7` through the
 * client and pins both halves.
 *
 * ## A row of panels reads as a set
 *
 * Two panels side by side used to differ in three ways at once — a different
 * number of prose lines above the number, and therefore a plot that started
 * 34px lower on one card than the other (measured: 173px against 139px at
 * 1440); and an action row, `Open the Growth board`, that existed on the panel
 * whose measure declared a board and nowhere else, pushing that card's legend
 * down a row.
 *
 * Both are gone. Above the plot every panel now carries exactly the same three
 * things — title, numeral, one derived sentence — so the numerals in a row sit
 * on one line and the plots start at one height. And §P4's anchor moved out of
 * `PanelChart` into **the card's foot, beside the legend**: the panel that has
 * a destination shows it as the last chip in the same centred row, and the
 * panel that has none simply has one chip fewer at the same height. That is the
 * treatment `ChartCard` already gives `Open analysis →`, so the report panel
 * and the board card now put the same affordance in the same place.
 *
 * An empty `displayedAsMetricKeys` is still a claim (`measure.ts:281–291`) and
 * still renders nothing: equalising the two panels must not mean inventing a
 * destination for the one that declares none.
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
 * ## What is opt-in, and why — this card has TWO callers
 *
 * `DashboardTile` renders `ResultCanvas`, which renders this card, so anything
 * added here lands on a dashboard tile unless it is asked for. A tile is a
 * *reading*; the builder is a *workspace*. So the **related-boards strip**
 * (`related`) is off by default: a strip of navigation cards under every tile
 * on a nine-tile dashboard is eighteen links nobody asked for, and it is also
 * the only part of this file that needs a `Router` in scope.
 *
 * The corner chrome is NOT opt-in. A chart-type glyph and an overflow are what
 * §C5 puts on an Amplitude tile as well as on its chart, and both are derived
 * from props this card already has.
 *
 * ## `framed` — the second caller already draws the frame
 *
 * A dashboard tile is itself a `Card`, so this card's own hairline, radius and
 * shadow landed **inside** the tile's, 12px in: two frames per tile, which is
 * the single biggest reason that board read looser than the reference. It was
 * previously neutralised from outside by a structural selector on the tile root
 * (`[&_[data-slot=card]]:border-0` and friends) — a rule that reached into this
 * component's internals and would have rotted the moment the markup moved.
 *
 * `framed={false}` replaces it: **no `Card`, no `data-slot="card"`, and the
 * same internal layout.** The plain container keeps the flex column, the gap
 * and `--card-spacing` at the value the card sets, so every header, body and
 * footer inset is unchanged and only the frame and the block padding go. The
 * default is `true`, so the builder and every other caller are untouched.
 *
 * Rules applied
 *   §3.7        title, plot, legend, in that order; the legend names BOTH
 *               periods explicitly with dates (AC-832).
 *   §A9         the legend is **centred beneath the plot** and the comparison
 *               entry carries Amplitude's `[Previous]` marker before the name.
 *               A top-N breakdown opens it with a `Top {n}` pill.
 *   §A10        the tooltip is a card and names a real destination — the
 *               resolution is here (`relatedBoards`), the rendering is
 *               `PanelChart.PanelTooltip`.
 *   §A12        the closing card strip is `displayedAsMetricKeys`, which is a
 *               real, deliberately-directional back-reference — **not** a
 *               similarity model, which would have to be invented.
 *   §1.5        one icon set (lucide), 16px, `currentColor`, every glyph
 *               `aria-hidden` with the control's own label carrying the name.
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
 *               badge on the delta. The caret is a shape, the sign is in the
 *               text, and `overview.delta.*`'s full clause is announced
 *               `sr-only` on every delta, so hue is the fourth carrier of
 *               valence and the sole carrier of nothing. The one `Badge` here
 *               is the `Top {n}` pill, which carries no valence at all.
 *   R5a         `text-critical-foreground` on a falling delta is a FOREGROUND
 *               on the page ground, not one of R7's toned surfaces. R5a's four
 *               places govern destructive affordances and critical banners; a
 *               metric moving the wrong way is neither, and the same treatment
 *               already ships on every metric board.
 *   §9.2        the card mirrors; the plot does not (`PanelChart`).
 */

import { useRef, type ReactNode, type Ref } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3Icon,
  LayoutDashboardIcon,
  LineChartIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MetricDelta, trendRead } from '@/components/metrics'
/* **A deep import, on the path four files in `screens/reports` already take**
   (`AlertsView`, `AlertRuleDialog`, `AlertHistoryDialog`, `ReportModeCanvas`
   all reach `formatMetric` directly). `splitMetricValue` is not on the metrics
   barrel and that file has another owner; nothing here edits it. The split is
   what lets a money value set its digits at the numeral's size and its
   currency word at the caption's — which is the register the boards use, and
   the reason `8,075.70 SAR` does not push its own delta onto a second line. */
import { splitMetricValue } from '@/components/metrics/formatMetric'
import { comparisonWindow, findSubTabById, OTHER_GROUP } from '@/data/clients'
import type { CurrencyCode, Measure, MetricUnit, ReportPanel, ReportResult, ReportSeries } from '@/data/types'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
import { cn } from '@/lib/utils'
import { PanelChart, seriesOfPanel } from './PanelChart'
/* **The aggregate predicate, from the file that already owns it.**

   `ResultTable` wrote `declaredAggregate` when its summary column shipped
   `1,200% total`, and its doc names this file's headline and base as the same
   defect — so this is the call it was exported for rather than a fourth copy
   of the same test. Its clean home is `rollup.ts`, beside `rollUpSeries`; that
   lift needs an edit to `ResultTable` as well and that file has another owner,
   so it is named in the handoff instead of taken here.

   The import is a CYCLE — `ResultTable` already imports `panelTitle` from this
   file. It is safe as written and not as a general licence: both symbols are
   hoisted `function` declarations and neither module calls the other at
   evaluation time, so whichever is entered first completes. `ResultCanvas`
   already imports both statically, so nothing new lands in a chunk. The lift
   to `rollup.ts` removes it. */
import { declaredAggregate } from './rollup'
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
  /**
   * **§A12's closing strip, opted into rather than assumed.** Off by default,
   * for the reason the file header gives — and because the strip and §P4's
   * action row are the only things here that render a `<Link>`, so a caller
   * outside a `Router` is unaffected by either.
   *
   * **It gates §P4's datapoint action too, and that is one decision rather than
   * two.** `ResultCanvas.Body` records this as *the* builder-versus-tile
   * signal: the builder is a workspace, where a mark that can be acted on
   * should be, and a tile is a reading whose title is already the way out. Two
   * predicates for one question is how a panel ends up announcing an action it
   * does not carry. The action's PLACE — the card foot, beside the legend — is
   * settled in `BoardAction`; this decides only whether it exists.
   */
  related?: boolean
  /**
   * **Whether this panel draws its own frame — and which numeral rung it
   * takes.** `true` by default: the card IS the panel wherever it is the
   * outermost surface. A caller that already drew a frame around it passes
   * `false` and gets the same panel with no hairline, no radius, no elevation
   * and no block padding of its own.
   *
   * It is the size switch as well, and that is deliberately ONE prop rather
   * than two. Frame and rung answer the same question — *is this panel the
   * page, or is it a reading inside somebody else's frame?* — and a second
   * prop would let a caller draw a tile's frame around a page's numeral. See
   * the file header for the two rungs and why they are those two.
   */
  framed?: boolean
  /**
   * **There is no `onExpand` here, and its removal is the finding.**
   *
   * This card carried one — a prop, its plumbing and an `Expand this panel`
   * item in the overflow, all gated on a handler. `ResultCanvas` is this
   * component's ONLY caller and it neither accepted nor forwarded it, so no
   * production path could make it non-`undefined` and the menu item could not
   * render. A translated string (`rb.panel.expand`) shipped with it, reachable
   * from nothing.
   *
   * It was deleted rather than wired because **the expand already exists at
   * the level that has a destination**. §C5 puts it at the *tile's* corner and
   * `DashboardTile` draws it there (`rb.dashboard.tile.expand`), opening the
   * report the tile pins. A panel is one y-axis of that report; it has no route
   * of its own, so a per-panel expand on a two-panel tile would be two controls
   * pointing at one place with no way to say which panel was expanded. The
   * builder, this component's other caller, IS the expanded view.
   */
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
  related = false,
  framed = true,
  t,
  language,
}: PanelCardProps) {
  const current = seriesOfPanel(result, panel, 'current')
  const comparison = seriesOfPanel(result, panel, 'comparison')

  const title = panelTitle(panel, t)
  const boards = relatedBoards(measure)
  /* §A10's footer names ONE destination, because a tooltip is not a menu. The
     first is the first the catalogue declares, and the strip below the card
     lists them all. */
  const firstBoard = boards[0]

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

  /* §A9's legend row, and the condition the foot's spacing keys on. Named
     rather than repeated so the population block below cannot disagree with it
     about whether a hairline has already been drawn. */
  const hasLegend =
    current !== null &&
    current.blocked === null &&
    current.failed === null &&
    result.buckets.length > 0

  /* §P4's anchor lives in the foot and the plot's click delegates to it, so the
     ref is owned here and handed to both. `null` for every panel whose measure
     declares no board — see `boardPath` on `PanelChart`. */
  const actionRef = useRef<HTMLAnchorElement>(null)
  const boardPath = related && firstBoard ? firstBoard.path : null

  return (
    /* `h-full` — a small multiple whose cards end at different heights is a set
       the eye reads as unrelated, and the row is one object read across. The
       grid cell already stretches; the frame has to accept the height. */
    <PanelFrame framed={framed} className="h-full min-w-0">
      <CardHeader>
        {/* **The panel title drops a step on a tile, and only on a tile.** See
            the file header for the measurement; the mechanism is that
            `CardTitle` merges its own `text-base` against whatever arrives, so
            one class here moves the whole rung and nothing restates 16.

            The previous note here refused this change on the grounds that
            `DistributionCard` draws the sibling panel of a pie tile from its
            own file and would have kept 16. That file now takes the same
            switch from the same prop, so the refusal's reason is gone. */}
        <CardTitle className={framed ? undefined : 'text-sm'}>
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

        {/* §A12 / §C5 — the shape this panel is drawn in, and the way to act on
            the panel, in its corner. `CardAction` is the card's own slot for
            it, so the header stays a two-column grid rather than a hand-built
            flex row with a physical side. */}
        <CardAction className="flex items-center gap-0.5">
          <ChartKindGlyph kind={kind} t={t} />
          <PanelActions
            measureKey={current?.measureKey ?? null}
            onRetrySeries={onRetrySeries}
            t={t}
          />
        </CardAction>

        {/* **§3.7's rows three and four, and the slot the catalogue prose used
            to hold.** The number sits directly under the title, where
            `ChartCard` puts it and where §A8 draws it — nothing between the
            name of the thing and the quantity of it. Where there is no line to
            draw, the body below is the whole card and says what is wrong in
            words; see `drawable`. */}
        {drawable && result.buckets.length > 0 && (
          <Headline
            panel={panel}
            result={result}
            measure={measure}
            title={title.text}
            framed={framed}
            t={t}
            language={language}
          />
        )}
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
            title={title.text}
            boardLabel={firstBoard ? t(firstBoard.titleKey) : null}
            /* §P4 — the destination the tooltip names, as a route the series'
               own click can follow and the keyboard can tab to. `related` is
               the builder-versus-tile signal (see the prop); `firstBoard` is
               already resolved against the route table, so this is a real path
               or it is `null` and there is no affordance at all. */
            boardPath={boardPath}
            /* The anchor the click activates. It is in the foot, so the plot
               cannot own it any more — see the file header. */
            actionRef={actionRef}
            t={t}
            language={language}
          />
        )}
      </CardContent>

      {hasLegend && (
        /* §A9 — **centred**, which is the whole visual difference from what was
           here. A legend pinned to the inline start of a card reads as a list;
           one centred under the plot reads as a caption on the plot, which is
           what it is.

           §P4's action closes the row as one more chip. It is here rather than
           one row under the plot for the reason the file header gives: the
           panel that has a destination and the panel that has none must be the
           same height, or a row of two stops reading as one object. */
        <CardFooter className="flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          <Legend
            result={result}
            hasComparison={comparison !== null}
            t={t}
            language={language}
          />
          {boardPath !== null && firstBoard && (
            <BoardAction
              ref={actionRef}
              label={t(firstBoard.titleKey)}
              path={boardPath}
              t={t}
            />
          )}
        </CardFooter>
      )}

      {measure && (
        /* **R5-15, demoted and still unconditional.** Under the plot, never
           behind a click. `border-t-0 pt-0` where the legend has already drawn
           the foot's hairline — a second rule 20px below the first reads as a
           section break inside one card. */
        <CardFooter
          className={cn(
            'flex-col items-start gap-0.5',
            hasLegend && 'border-t-0 pt-0',
          )}
        >
          <Population panel={panel} result={result} measure={measure} t={t} />
        </CardFooter>
      )}

      {related && boards.length > 0 && (
        <CardFooter className="border-t border-border pt-3">
          <RelatedBoards boards={boards} t={t} />
        </CardFooter>
      )}
    </PanelFrame>
  )
}

/**
 * **The panel's outer surface — a `Card`, or the same box without one.**
 *
 * The unframed branch is deliberately *not* a `Card` with its frame utilities
 * overridden: it carries no `data-slot="card"`, so a caller that has already
 * drawn a frame can count the frames inside itself and get one.
 *
 * What it keeps is everything that is layout rather than decoration — the flex
 * column, the inter-block gap, the card's text size and colour, and
 * `--card-spacing` at the value `Card` sets for its default size. Every
 * `CardHeader`, `CardContent` and `CardFooter` beneath reads its inset from
 * that variable, so the internals are identical either way and only the
 * hairline, the radius, the elevation and the block padding are absent.
 *
 * Exported because `DistributionCard` is the same panel drawn a different way
 * and owes the same tile the same single frame.
 */
export function PanelFrame({
  framed,
  className,
  children,
}: {
  framed: boolean
  className?: string
  children: ReactNode
}) {
  if (framed) return <Card className={className}>{children}</Card>
  return (
    <div
      data-slot="panel-frame"
      className={cn(
        'flex flex-col gap-(--card-spacing) text-sm text-card-foreground',
        '[--card-spacing:--spacing(3)]',
        className,
      )}
    >
      {children}
    </div>
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

/* ─────────────────────── §A12 — the real back-reference ──────────────────── */

/** One board this measure is already displayed on. Resolved, never guessed. */
export interface RelatedBoard {
  subTabId: string
  path: string
  titleKey: string
}

/**
 * **`displayedAsMetricKeys` → the boards that show this measure.**
 *
 * Amplitude closes a chart with a `Related Charts` strip driven by a similarity
 * model. This product has no such model and **inventing one is the failure this
 * whole module is written against** — a strip of "related" charts nobody
 * computed is a recommendation with no basis, presented with the confidence of
 * one that has.
 *
 * What it has instead is better, and it is F-9's back-reference:
 * `Measure.displayedAsMetricKeys` names the board tiles that display *this same
 * measure over this same population*, pointing tile → measure so *"a tile move
 * is a rename here, not a broken saved report"*. Its own doc is explicit that
 * **an empty array is a claim** — it says no tile shows this measure — and that
 * a same-named figure over a *different* population is deliberately absent,
 * because listing it *"would make R5-14's cross-check runnable and false"*
 * (`measure.ts:281–291`). So an empty array renders **nothing**, never a
 * placeholder and never a fallback strip of whatever else is nearby.
 *
 * A metric key is `{workspace}.{board}.{metric}`, and the board it belongs to
 * is the sub-tab of the same name. The candidate is **looked up in the route
 * table** rather than trusted: a key that names no route resolves to `null` and
 * is dropped, so this can never render a link to a destination that does not
 * exist. `panel.chrome.test.tsx` runs the whole catalogue through it.
 *
 * Deduplicated by sub-tab: two tiles for one measure on one board is one board.
 */
export function relatedBoards(measure: Measure | null): RelatedBoard[] {
  if (measure === null) return []
  const seen = new Set<string>()
  const out: RelatedBoard[] = []
  for (const metricKey of measure.displayedAsMetricKeys) {
    const segments = metricKey.split('.')
    if (segments.length < 2) continue
    const subTabId = `${segments[0]}-${segments[1]}`
    if (seen.has(subTabId)) continue
    const route = findSubTabById(subTabId)
    if (route === null) continue
    seen.add(subTabId)
    out.push({ subTabId, path: route.path, titleKey: route.titleKey })
  }
  return out
}

/**
 * The strip itself — small cards, one per board, each a real anchor.
 *
 * A card rather than a bare link because §A12's shape is a card strip, and an
 * anchor rather than a `div` with an `onClick` because it is navigation and
 * navigation is what an anchor is for: it lands in the tab order with the
 * primitive's own ring, it opens in a new tab on the modifier every operator
 * already knows, and its destination is in the status bar before the click.
 */
export function RelatedBoards({ boards, t }: { boards: readonly RelatedBoard[]; t: Translator }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-xs text-muted-foreground">{t('rb.related.heading')}</p>
      <ul role="list" className="flex list-none flex-wrap gap-2">
        {boards.map((board) => (
          <li key={board.subTabId}>
            <Link
              to={board.path}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <LayoutDashboardIcon aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{t(board.titleKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ────────────────────────── §1.5 — the card's chrome ─────────────────────── */

/** One glyph per shape. Decorative twice over: the label names it, and the plot is the thing. */
function ChartKindGlyph({ kind, t }: { kind: 'line' | 'bar'; t: Translator }) {
  const Glyph = kind === 'bar' ? BarChart3Icon : LineChartIcon
  const label = t('rb.panel.chartKind', { chartType: t(`rb.chartType.${kind}`) })
  return (
    /* `title` on the SVG would be a tooltip only a mouse can reach. The label
       is `sr-only` text beside an `aria-hidden` glyph, which every reader gets
       — §7.5's rule that colour, and shape, are never the sole carrier. */
    <span className="flex items-center text-muted-foreground">
      <Glyph aria-hidden="true" className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

/**
 * §A12's `⋯` — and **every item in it does something that already existed.**
 *
 * `Reload this measure` is `onRetrySeries`, which re-requests this measure
 * alone (AC-851) and which both callers already wire. Nothing else is offered:
 * an overflow stocked with plausible-sounding items that resolve to nothing is
 * the menu equivalent of a fabricated number — and an item gated on a handler
 * no caller can supply is the same thing with a green type-check on top. That
 * is what `Expand` was; see `PanelCardProps`.
 */
function PanelActions({
  measureKey,
  onRetrySeries,
  t,
}: {
  measureKey: string | null
  onRetrySeries: (measureKey: string) => void
  t: Translator
}) {
  if (measureKey === null) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs" aria-label={t('rb.panel.actions')}>
          <MoreHorizontalIcon aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onRetrySeries(measureKey)}>
          <RefreshCwIcon aria-hidden="true" className="size-4" />
          {t('rb.panel.reload')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * **§A10's `Click for Actions`, kept as an anchor rather than an instruction —
 * and moved to the card's foot so a row of panels is one height.**
 *
 * Amplitude ends every tooltip with *"Click for Actions"* and the whole model
 * behind it is that a datapoint is a jumping-off point. The instruction itself
 * is one a Recharts tooltip **cannot keep** — the wrapper is not a
 * pointer-events target, so a link inside it is unclickable with a mouse and
 * unreachable by keyboard, which is §7.2's exact failure dressed as an
 * affordance. So the tooltip names the destination and this is the thing that
 * goes there:
 *
 *   - a real `<a>`, so it lands in the tab order with the ring, states its
 *     destination in the status bar and opens in a new tab on the modifier;
 *   - **the keyboard equivalent of the datapoint click**, and the one the
 *     chart's own click delegates to (`PanelChart.openBoard`, through the ref
 *     this card owns);
 *   - **absent** where the measure names no board. `relatedBoards` resolves
 *     every candidate against the route table, so a rendered one is reachable
 *     and an unrendered one was a claim rather than an oversight.
 *
 * **It sits in the legend row, not under the plot, and that placement is the
 * fix rather than a preference.** Rendered as a sibling of the plot it added a
 * row to exactly the panels whose measure declared a board — so in a two-panel
 * report one card's legend sat 24px below its neighbour's and the row read as
 * two unrelated cards. As the last chip of the footer it takes no height of its
 * own, and the panel without a destination is the same card with one chip
 * fewer. `ChartCard` puts `Open analysis →` in the same slot.
 *
 * **It is worded as an imperative, and the strip at the card foot is not.**
 * §A12's `This measure also appears on …` is a statement about the catalogue;
 * this is the datapoint's own action and says `Open the Growth board`. Two
 * different sentences because they are two different things — one names where
 * else the measure lives, one is the thing the click does.
 *
 * The glyph is an object, not a direction, so §9.5 leaves it unmirrored; the
 * board name travels in a `<bdi>` because a translated title beside Latin
 * chrome is exactly the run the UBA reorders.
 */
function BoardAction({
  ref,
  label,
  path,
  t,
}: {
  ref: Ref<HTMLAnchorElement>
  label: string
  path: string
  t: Translator
}) {
  return (
    <Link
      ref={ref}
      to={path}
      data-slot="panel-action"
      className="flex items-center gap-1.5 rounded-md text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <LayoutDashboardIcon aria-hidden="true" className="size-4 shrink-0" />
      <bdi>{t('rb.panel.action.open', { board: label })}</bdi>
    </Link>
  )
}

/**
 * **R5-15's three sentences, at the foot of the card.**
 *
 * The population predicate names which rows are counted; the caption qualifies
 * what the count does and does not include; the **base** states how many of the
 * window's complete buckets actually carry a reading. All three are the
 * catalogue's own, and the base is derived from the response every render, so a
 * window that outruns the data reports fewer readings rather than a figure
 * somebody typed.
 *
 * They used to sit between the title and the number, which is what made the
 * panel read as a definition of a measure rather than an answer about one. The
 * file header carries the argument; what matters here is that **none of them is
 * conditional on anything but the data existing** — R5-15 is met by a sentence
 * on screen, not by a sentence a reader can open.
 *
 * One paragraph rather than three stacked lines, because at the foot they are a
 * footnote and a footnote wraps. Each sentence keeps its own `<bdi>`: they are
 * separate translated strings carrying separate numeral and proper-noun runs,
 * and concatenating them into one would need a fourth key.
 *
 * The base is withheld — and only the base — where the series is blocked or
 * failed: there is no response to count readings in, and `0 of 30` would be a
 * measurement nobody took. The population and the caption are facts about the
 * measure and survive both.
 *
 * **The base does NOT go away when the headline does**, and the reason is that
 * they are different facts. See `readingBase`.
 */
function Population({
  panel,
  result,
  measure,
  t,
}: {
  panel: ReportPanel
  result: ReportResult
  measure: Measure
  t: Translator
}) {
  const current = seriesOfPanel(result, panel, 'current')
  const counted =
    current !== null && current.blocked === null && current.failed === null
      ? readingBase(current, measure, result.buckets.length)
      : null

  return (
    <PanelProse
      predicate={t(measure.population.predicateKey)}
      caption={measure.captionKey ? t(measure.captionKey) : null}
      base={
        counted
          ? t('rb.panel.readings', { readings: counted.readings, total: counted.eligible })
          : null
      }
    />
  )
}

/**
 * **R5-15's base, and it is aggregate-independent — which is why it survives a
 * series the catalogue does not describe.**
 *
 * `rollUpSeries` counts readings and eligible buckets *before* it combines
 * anything (`rollup.ts`): `readings` is how many complete buckets carried a
 * point and `eligible` is how many were not partial. Both are properties of the
 * POINTS and of §3.5's partial-bucket rule. Only `value` belongs to the
 * aggregate, and this function does not read it.
 *
 * So the two facts separate cleanly. Where `declaredAggregate` says the
 * catalogue entry is not about these numbers — the cohort case, `unit:
 * 'percent'` over a `count` measure — the HEADLINE goes away, because the
 * headline *is* the aggregate. The base stays, because *"24 of 30 buckets have
 * a reading"* was measured either way, and withholding a fact that was measured
 * because a different one could not be is the opposite of the rule.
 *
 * The aggregate handed to `rollUpSeries` is therefore the declared one where
 * there is one and `'count'` where there is not — a branch whose result is
 * discarded on the line it is produced. It is written out rather than hidden so
 * the next reader can see that this call takes no position on the rollup.
 */
function readingBase(
  series: ReportSeries,
  measure: Measure,
  bucketCount: number,
): { readings: number; eligible: number } {
  const { readings, eligible } = rollUpSeries(
    series,
    declaredAggregate(series, measure) ?? 'count',
    bucketCount,
  )
  return { readings, eligible }
}

/**
 * **The three catalogue sentences, as one grey footnote — drawn once for both
 * panel shapes.**
 *
 * `PanelCard` states buckets (`rb.panel.readings`) and `DistributionCard`
 * states groups (`rb.panel.parts`), so the BASE differs and the markup must
 * not: a line tile and a pie tile sit side by side on DSH-1, and two footnotes
 * at two steps in one row is what made that board read as two products. The
 * caller resolves its own strings; this owns the slot, the step and the
 * isolation.
 *
 * Each sentence keeps its own `<bdi>`: they are separate translated strings
 * carrying separate numeral and proper-noun runs, and concatenating them into
 * one would need a fourth key.
 */
export function PanelProse({
  predicate,
  caption,
  base,
}: {
  predicate: string
  /** `null` where the measure declares none — never an empty string. */
  caption: string | null
  /** `null` where there is no response to count readings in. */
  base: string | null
}) {
  return (
    <p data-slot="panel-population" className="text-xs text-muted-foreground">
      <bdi>{predicate}</bdi>
      {caption !== null && <> <bdi>{caption}</bdi></>}
      {base !== null && <> <bdi>{base}</bdi></>}
    </p>
  )
}

/**
 * **The panel's headline quantity — one component, both panel shapes.**
 *
 * §A8's numeral row: the figure, its unit word where the figure has one, and
 * whatever the caller puts on the same baseline after them. `PanelCard` puts a
 * period delta there; `DistributionCard` puts nothing, because a part-of-whole
 * has no time axis to have moved along (see its header).
 *
 * **Two rungs, off `framed`.** `--text-kpi` (28) is the PAGE's numeral and the
 * builder panel is the page's answer; a dashboard tile is a reading inside a
 * frame that already carries a 16px heading, so it takes the step below,
 * `--text-lg` (20). In Latin both have a 32px line box, so the switch changes
 * the weight of the voice and not the height of the card. The file header
 * carries the argument and the measurements.
 *
 * **The size is the class; the tabular figures are not.** `font-variant-numeric`
 * is pinned in `@layer base` on `[data-slot="metric-value"]` — `MetricTile` and
 * `ChartCard` both state why a hand-written `tabular-nums` beside the size
 * restates a guarantee at a call site free to omit it. The `<bdi>` is wrapped
 * rather than styled: a stretched `<bdi>` derives its own direction from its
 * content and flushes the digits to its own start, which is the defect
 * `MetricTile` records.
 *
 * `items-baseline` so a 13px delta sits on the numeral's baseline rather than
 * at its optical centre; wrapping is allowed so a six-figure money value and a
 * delta degrade to a stack rather than overflowing a 268px panel.
 */
export function PanelNumeral({
  value,
  unit,
  currency,
  framed,
  language,
  children,
}: {
  /** Already rolled up by the caller, under a rule the caller can defend. `null` is an em dash. */
  value: number | null
  unit: MetricUnit
  currency: CurrencyCode | null
  /** The builder-versus-tile signal — it picks the rung. */
  framed: boolean
  language: Language
  /** On the numeral's baseline, after the unit. A delta, or nothing. */
  children?: ReactNode
}) {
  const shown = splitMetricValue(value, unit, currency, language)
  return (
    <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span
        data-slot="metric-value"
        className={cn('font-semibold text-foreground', framed ? 'text-kpi' : 'text-lg')}
      >
        <bdi>{shown.value}</bdi>
      </span>
      {shown.unit && <span className="text-2xs text-muted-foreground">{shown.unit}</span>}
      {children}
    </span>
  )
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
 * ## The aggregate belongs to the SERIES, and a catalogue key is not proof
 *
 * This read `measure.bucketAggregate` — the aggregate of whatever measure the
 * PANEL is keyed to — and applied it to whatever numbers the series carried.
 * The two are not the same claim. `resolveCohort` emits **retention
 * percentages** against `measureKey: 'riders.joined'`, whose catalogue entry
 * declares `bucketAggregate: 'count'` over `unit: 'count'`; the honest reading
 * of that pair is *the catalogue entry is not about these numbers*, and the
 * unguarded one is a sum of twelve percentages set at 28px. `ResultTable`'s
 * summary column shipped exactly that figure — `1,200% total` — and its note
 * names this component's headline as the second copy of the same defect.
 *
 * So `declaredAggregate` decides, on `pairRefusal`'s own triple
 * (`temporality`, `unit`, `currency`), whether the catalogue entry describes
 * this run of numbers. Where it does not there is **no numeral, no delta and no
 * read sentence** — this returns `null` and the card is title, plot, legend,
 * prose. That is the table's answer applied at a bigger size: an absent number
 * is legible as absent, and an invented one is indistinguishable from a
 * measured one once it is on screen.
 *
 * The COMPARISON is tested separately and on its own series. Two windows may be
 * subtracted only when the catalogue describes both; a delta between a number
 * the catalogue explains and one it does not is the same fabrication with a
 * caret on it.
 *
 * **The base does not go with it.** `readings of eligible` is measured
 * regardless of how the buckets combine — see `readingBase`, which is why R5-15
 * still renders on a panel that has no headline.
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
  framed,
  t,
  language,
}: {
  panel: ReportPanel
  result: ReportResult
  measure: Measure | null
  /** Already resolved by the card, so the sentence and the card title agree. */
  title: string
  /** The builder-versus-tile signal. It picks the numeral's rung — see below. */
  framed: boolean
  t: Translator
  language: Language
}) {
  const current = seriesOfPanel(result, panel, 'current')
  const comparison = seriesOfPanel(result, panel, 'comparison')
  if (!current || !measure) return null

  /* The aggregate this SERIES declares, not the one its measure key names. See
     the note above; `null` is a refusal to state a headline, not a fallback. */
  const aggregate = declaredAggregate(current, measure)
  if (aggregate === null) return null

  const now = rollUpSeries(current, aggregate, result.buckets.length)
  /* Tested on its own series. A comparison that re-declares any of the triple
     is a different run of numbers, and subtracting it would be the same
     fabrication with a caret on it. */
  const priorAggregate = comparison ? declaredAggregate(comparison, measure) : null
  const before =
    comparison && priorAggregate !== null
      ? rollUpSeries(comparison, priorAggregate, result.buckets.length)
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
    /* **One grid item, explicitly in the first column.** `CardHeader` is a
       two-column grid once a `CardAction` is in it, and an unplaced second
       child lands in the SECOND column — which would set the card's own read of
       itself in the corner beside the overflow menu. `ChartCard` hit exactly
       this and records it; this follows rather than re-deriving it. */
    <div className="col-start-1 flex min-w-0 flex-col gap-1">
      <PanelNumeral
        value={now.value}
        unit={panel.unit}
        currency={panel.currency}
        framed={framed}
        language={language}
      >
        <MetricDelta
          deltaPercent={delta === null ? null : delta * 100}
          higherIsBetter={measure.higherIsBetter}
          t={t}
          language={language}
        />
      </PanelNumeral>
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
 * **How many groups survived the fold — or `null` when nothing was folded.**
 *
 * §A9's `TOP 4` pill is true only when the picture IS a top-N. `foldedGroupCount`
 * is the canvas's own record that §7.4 folded the smallest groups into `Other`;
 * where it is `null` every group the split produced is on screen, and a pill
 * saying `Top 4` over four-of-four would be a cap nobody applied.
 *
 * `Other` is excluded from the count: it is the fold, not one of the survivors.
 */
function topGroupCount(result: ReportResult): number | null {
  if (result.foldedGroupCount === null) return null
  const kept = result.panels.filter((p) => {
    const group = p.titleParams['group']
    return group !== undefined && String(group) !== OTHER_GROUP
  })
  return kept.length > 0 ? kept.length : null
}

/**
 * §3.7's legend, laid out to §A9: a mark and a name per series, **centred
 * beneath the plot**, with the comparison entry carrying Amplitude's
 * `[Previous]` marker before its name.
 *
 * Two deliberate departures from §A9, both on the same rule:
 *
 * **The mark is a line, not a dot.** Amplitude gives each series a coloured
 * dot, which works because their series differ by hue. §3.7 rules that this
 * product's comparison is *the same hue, dashed* — so two dots would be two
 * identical dots, ranking nothing and telling a reader the solid line and the
 * dashed one are the same thing. The swatch is drawn as an SVG rather than a
 * bordered element so the dash pattern matches the plot's exactly; a CSS dashed
 * border and an SVG dash array do not produce the same rhythm, and a legend
 * that does not match its own line is worse than no legend.
 *
 * **Each entry names a PERIOD WITH DATES, not a series name.** §3.7 requires
 * it (AC-832) and it is strictly more than Amplitude's `[Previous] All Users`
 * tells you. The marker is added in front of it rather than replacing it.
 *
 * When there is no comparison the second chip does not disappear — it says so,
 * and it drops the `[Previous]` marker, because there is no previous period for
 * the marker to point at. A missing chip reads as a chart that forgot; a chip
 * that says there is no comparison period reads as a chart that knows.
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
  const top = topGroupCount(result)

  const range = (a: string, b: string) =>
    t('rb.legend.range', {
      from: formatDate(a, { style: 'day-month', language }),
      to: formatDate(b, { style: 'day-month', language }),
    })

  return (
    <>
      {top !== null && (
        /* §A9's `TOP 4`. A `Badge`, which is this product's pill — never
           interactive (§12.1), and `neutral` because a cap is a fact about the
           picture and not a state anybody has to act on. */
        <Badge tone="neutral">{t('rb.panel.top', { count: top })}</Badge>
      )}
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Swatch dashed={false} />
        {/* A numeral run around a neutral en dash reorders in an Arabic
            paragraph without isolation (§9.2). */}
        <bdi>{range(from, to)}</bdi>
      </span>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Swatch dashed />
        {hasComparison && prior && (
          /* Square brackets are bidi-neutral and would swap ends of an Arabic
             line unisolated, so the marker is its own isolated run. */
          <bdi className="font-medium">{t('rb.panel.legend.previous')}</bdi>
        )}
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
 * matches the plot's exactly.
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
