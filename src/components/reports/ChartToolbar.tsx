/**
 * **The row above the plot** — Amplitude §A7, and now the only place a shape is
 * chosen.
 *
 * ```
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │ Data from 25 Jun 09:14 ↻          ↗ Line chart ⌄  Daily ⌄  Compare ⌄ │
 *  │                                                   📅 Last 30 days ⌄  │
 *  └──────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## The mode strip is gone, and its five options are in the chart-type menu
 *
 * The rail used to carry a five-button strip — `Trend · Funnel · Data table ·
 * Retention · Journeys` — and the toolbar carried a *second* strip for
 * `Line · Bar · Pie · Table`. Two controls, both answering *what shape is this
 * answer*, one of them able to say `Data table` and the other `Table`.
 *
 * The business owner collapsed them: **"rather than funnel, or retention or
 * journeys, make them chart types"**, with the reason — *"we don't have funnel
 * or journey data here at all"*, so neither deserves a permanent tab beside the
 * question that actually gets asked. So there is **one** `Chart type ⌄` menu
 * with seven entries, and each resolves to a `(mode, chartType)` pair:
 *
 * | menu entry | `mode` | `chartType` |
 * |---|---|---|
 * | Line chart | `trend` | `line` |
 * | Bar chart | `trend` | `bar` |
 * | Pie chart | `trend` | `pie` |
 * | Data table | `table` | `table` |
 * | Retention | `cohort` | — |
 * | Funnel | `funnel` | — |
 * | Journeys | `journey` | — |
 *
 * **No type changed.** `ReportMode` is still five, `ChartType` still four, and
 * `serialiseReportQuery` still round-trips exactly what it did — a saved report,
 * a shared link and an alert's `route` are all unaffected. This is a
 * presentation-layer union of two controls that were always answering one
 * question, and `VISUALISATIONS` below is the entire mapping.
 *
 * Selecting one routes through `onVisualisation`, which the builder wires to
 * `switchMode` for a mode change and to `setQuery` for a chart-type change —
 * so a switch still restores that mode's cached answer and still issues no
 * request, which is the owner's other standing ruling (*"when changing between
 * those data shouldn't refresh"*).
 *
 * ## Menus, not button strips
 *
 * Amplitude's toolbar is four dropdown triggers showing the current value:
 * `Line chart ⌄`, `Daily ⌄`, `Compare ⌄`, `Last 30 days ⌄`. This row is now the
 * same four, in the same order, for a reason beyond matching a screenshot: the
 * strips had grown to fourteen visible buttons across two `LegalityOptions`
 * groups plus a four-button quick-range row, and a toolbar with fourteen
 * targets is a toolbar an operator reads rather than uses.
 *
 * **The legality machinery survives the change intact.** An illegal option is
 * still rendered, still disabled, and still carries its reason — inside the
 * menu, on the row beneath the option's own name, which is *closer* to the
 * thing it describes than the old paragraph under the strip ever was. D9 CQ-3
 * is disabled-in-place-with-a-reason, and a disabled `SelectItem` with the
 * sentence under it satisfies it more precisely than a list at the group's
 * foot did. `aria-describedby` on a `SelectItem` is not a mechanism Radix
 * exposes, so the reason is *inside* the item's own accessible subtree, which
 * makes it part of the option's announced name rather than a reference to it.
 *
 * The quick-range strip (`7 days · 30 days · 90 days · 365 days`) is **gone**,
 * not moved: it duplicated four of the nine presets the range popover already
 * offers, which is the same setting with two controls — the thing this file's
 * previous revision removed from the rail and then reintroduced here.
 */

import { useId } from 'react'
import {
  BarChartIcon,
  CloseIcon,
  FunnelIcon,
  JourneyIcon,
  LineChartIcon,
  PieChartIcon,
  CountIcon,
  RefreshIcon,
  RetentionIcon,
  TableChartIcon,
} from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  ChartType,
  QueryPlan,
  QueryViolation,
  ReportGrain,
  ReportMode,
  ReportQuery,
  ReportResult,
} from '@/data/types'
import { reportMode } from '@/data/types'
import { formatDate, type Language, type Translator } from '@/lib'
import { WindowControl } from './WindowControl'

/** §6.3's three, in the order the rail offered them. Unchanged by the move. */
/* Only the string-valued members — §1.4's `{ kind: 'fixed' }` row is the rail
   v2 owner's addition, not this file's WP; see the `Select`'s own note. */
const COMPARISONS: Exclude<ReportQuery['periodComparison'], { kind: 'fixed' }>[] = [
  'none',
  'previous-period',
  'previous-year',
]

/**
 * The twelve shapes, and the `(mode, chartType)` each one is. `chartType:
 * null` means the mode fixes its own shape. **v2 adds five** — `area`,
 * `stacked-bar`, `stacked-100`, `horizontal-bar`, `kpi` — grouped with `pie`;
 * icons reuse the registry's nearest glyph rather than minting one (`icons.ts`
 * is not this WP's file).
 */
const VISUALISATIONS = [
  { id: 'line', mode: 'trend', chartType: 'line', icon: LineChartIcon },
  { id: 'area', mode: 'trend', chartType: 'area', icon: LineChartIcon },
  { id: 'bar', mode: 'trend', chartType: 'bar', icon: BarChartIcon },
  { id: 'stacked-bar', mode: 'trend', chartType: 'stacked-bar', icon: BarChartIcon },
  { id: 'stacked-100', mode: 'trend', chartType: 'stacked-100', icon: BarChartIcon },
  { id: 'horizontal-bar', mode: 'trend', chartType: 'horizontal-bar', icon: BarChartIcon },
  { id: 'pie', mode: 'trend', chartType: 'pie', icon: PieChartIcon },
  { id: 'kpi', mode: 'trend', chartType: 'kpi', icon: CountIcon },
  { id: 'table', mode: 'table', chartType: 'table', icon: TableChartIcon },
  { id: 'cohort', mode: 'cohort', chartType: null, icon: RetentionIcon },
  { id: 'funnel', mode: 'funnel', chartType: null, icon: FunnelIcon },
  { id: 'journey', mode: 'journey', chartType: null, icon: JourneyIcon },
] as const satisfies ReadonlyArray<{
  id: string
  mode: ReportMode
  chartType: ChartType | null
  icon: typeof LineChartIcon
}>

export type VisualisationId = (typeof VISUALISATIONS)[number]['id']

/**
 * **What the query on screen currently IS, in the menu's own vocabulary.**
 *
 * A mode that fixes its own shape answers with its mode id; `trend` answers
 * with its chart type. `table` is deliberately keyed off the MODE and not off
 * `chartType === 'table'`: a trend can be coerced to a table by the planner
 * without the operator having asked for one, and a trigger that renamed itself
 * on a coercion would tell the operator they chose something they did not.
 */
const TREND_SHAPES: ReadonlyArray<VisualisationId> = [
  'area',
  'bar',
  'stacked-bar',
  'stacked-100',
  'horizontal-bar',
  'pie',
  'kpi',
]

export function visualisationOf(query: ReportQuery): VisualisationId {
  const mode = reportMode(query)
  if (mode !== 'trend') return mode
  const shape = TREND_SHAPES.find((id) => id === query.chartType)
  return shape ?? 'line'
}

export interface ChartToolbarProps {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  /**
   * **A shape was chosen.** The builder decides what that means: a different
   * `mode` goes through `switchMode` (which restores that mode's cached answer
   * and issues no request), a different `chartType` is a plain `setQuery`.
   * Split here rather than there because only the builder holds the mode
   * memory, and only this file holds the mapping.
   */
  onVisualisation: (next: { mode: ReportMode; chartType: ChartType | null }) => void
  plan: QueryPlan
  /** `null` until a run has produced one; the freshness half then renders nothing. */
  result: ReportResult | null
  /** True when the question has been edited since `result` was computed (§8.3 state 2). */
  stale: boolean
  /** Re-runs the question on screen. The same callback the canvas's error retry uses. */
  onRefresh: () => void
  /**
   * `trend` and `table` — the two modes whose answer is a series the operator
   * chooses a grain for. A funnel, a retention matrix and a journey tree each
   * have their grain decided by the mode, so those three get the range and the
   * shape menu and nothing else.
   */
  seriesMode: boolean
  /**
   * The trend rail's unstarted state (AC-807): no measure chosen, so the
   * presentation controls are off **in place** with the reason the rail gives.
   * Always `false` for the three mode reports — a retention window is what
   * decides how many columns the matrix can reach, so it must be reachable
   * before anything else is.
   *
   * **The shape menu is never gated on it.** Choosing *"show me this as a
   * funnel"* before choosing a measure is a legitimate first move, and it was
   * the mode strip's own rule (*"a mode is never illegal — its configuration
   * is"*) which survives the strip's deletion.
   */
  unstarted: boolean
  /** The day presets resolve against. Passed, never read from an ambient clock. */
  today: string
  t: Translator
  language: Language
}

export function ChartToolbar({
  query,
  onChange,
  onVisualisation,
  plan,
  result,
  stale,
  onRefresh,
  seriesMode,
  unstarted,
  today,
  t,
  language,
}: ChartToolbarProps) {
  const comparing = query.periodComparison !== 'none'
  const windowReasons = plan.violations.filter((v) => v.field === 'window')
  const mode = reportMode(query)
  const current = visualisationOf(query)
  const vizLabelId = useId()
  const grainLabelId = useId()
  const compareLabelId = useId()

  /* The planner speaks in enum values; this row owns their labels. A reason may
     never render a raw `week` at an operator. */
  const grainLabels = (params: Record<string, string | number>) => ({
    ...params,
    ...(params['grain'] !== undefined ? { grain: t(`rb.grain.${String(params['grain'])}`) } : {}),
    ...(params['minGrain'] !== undefined
      ? { minGrain: t(`rb.grain.${String(params['minGrain'])}`) }
      : {}),
  })

  /**
   * **Legality applies to a redraw, never to a way out.**
   *
   * `plan.chartTypes` describes what the CURRENT mode may be drawn as. In
   * `trend` that is exactly right: a pie of two measures is refused, in place,
   * with its reason.
   *
   * Applied to every entry it was a trap. Inside a funnel the planner marks
   * `line` and `pie` illegal — *"bar is fixed by funnel"* — so the three
   * entries that mean *leave the funnel* were all disabled, and the only way
   * back to a trend was the browser's Back button. A control whose exit is
   * greyed out by the thing you are trying to exit is worse than no control.
   *
   * So an entry is judged by the current mode's rules only while it STAYS in
   * the current mode. An entry that changes mode is always offered, and
   * `applyReportMode` fixes that mode's own shape on arrival — which is the
   * mode strip's recorded ruling, unchanged: *a mode is never illegal; its
   * configuration is.*
   */
  const chartLegality = new Map(plan.chartTypes.map((option) => [option.value, option]))
  const legalityOf = (option: (typeof VISUALISATIONS)[number]) =>
    option.chartType === null || option.mode !== mode ? null : chartLegality.get(option.chartType)

  return (
    <div
      role="group"
      aria-label={t('rb.toolbar.heading')}
      /* A card's surface and a card's hairline, and **no elevation** — R-3
         §1.3: a toolbar is chrome attached to the content beneath it, not a
         layer floating over it. */
      className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-card-border bg-card px-3 py-2"
    >
      {/* ── LEFT: the freshness and its refresh ──────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* §A7's `Data from … ↻`, in this product's own sentence. The live
            region is the CLAIM about the numbers; the button sits beside it, so
            going dirty does not announce a button label. */}
        {result && (
          <div className="flex items-center gap-1">
            <p role={stale ? 'status' : undefined} className="text-xs text-muted-foreground">
              {stale
                ? t('rb.canvas.stale', {
                    time: formatDate(result.asOf, { style: 'day-month-time', language }),
                  })
                : t('rb.canvas.asOf', {
                    time: formatDate(result.asOf, { style: 'day-month-time', language }),
                  })}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t('rb.canvas.error.retry')}
              onClick={onRefresh}
            >
              <RefreshIcon aria-hidden="true" className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ── RIGHT: shape, grain, comparison, range ───────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* ── the one shape menu ────────────────────────────────────────── */}
        <Label id={vizLabelId} className="sr-only">
          {t('rb.viz.label')}
        </Label>
        <Select
          value={current}
          onValueChange={(id) => {
            const chosen = VISUALISATIONS.find((v) => v.id === id)
            if (chosen === undefined) return
            onVisualisation({ mode: chosen.mode, chartType: chosen.chartType })
          }}
        >
          <SelectTrigger id="rb-viz" size="sm" aria-labelledby={vizLabelId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISUALISATIONS.map((option) => {
              const legality = legalityOf(option)
              const illegal = legality !== null && legality !== undefined && !legality.legal
              const Glyph = option.icon
              return (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  disabled={illegal}
                  /* Typeahead types the NAME, never the name plus its refusal —
                     a reader hunting for `Pie chart` should not have to spell
                     out why they cannot have it. */
                  textValue={t(`rb.viz.${option.id}`)}
                >
                  <span className="flex min-w-0 flex-col items-start gap-0.5">
                    <span className="flex items-center gap-1.5">
                      {/* Decorative — the label beside it carries the name, so
                          the option still announces as `Line chart`. */}
                      <Glyph data-slot="viz-glyph" aria-hidden="true" className="size-4" />
                      {t(`rb.viz.${option.id}`)}
                    </span>
                    {/* D9 CQ-3 — the reason travels INSIDE the option it
                        describes rather than in a list at the menu's foot. */}
                    {illegal && legality?.reasonKey && (
                      <span className="block text-xs text-muted-foreground">
                        {/* **The space is load-bearing.** An option's accessible
                            name is its text content, and two adjacent inline
                            spans concatenate with nothing between them — the
                            announced name came out as `Pie chartA pie shows one
                            measure`, opening with a word that is in no
                            dictionary. `block` fixes the picture; the explicit
                            space fixes the name. Both are needed: the class is
                            invisible to an accessible-name computation, and the
                            space is invisible on screen. */}
                        {' '}
                        {t(legality.reasonKey, legality.reasonParams)}
                      </span>
                    )}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        {/* ── the grain ─────────────────────────────────────────────────── */}
        {seriesMode && (
          <>
            <Label id={grainLabelId} className="sr-only">
              {t('rb.control.grain')}
            </Label>
            <Select
              value={query.grain}
              disabled={unstarted}
              onValueChange={(grain) => onChange({ ...query, grain: grain as ReportGrain })}
            >
              <SelectTrigger id="rb-grain" size="sm" aria-labelledby={grainLabelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plan.grains.map((option) => (
                  <SelectItem key={option.value} value={option.value} disabled={!option.legal}>
                    <span className="flex min-w-0 flex-col items-start gap-0.5">
                      <span>{t(`rb.grain.${option.value}`)}</span>
                      {!option.legal && option.reasonKey && (
                        <span className="text-xs text-muted-foreground">
                          {t(option.reasonKey, grainLabels(option.reasonParams))}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* ── the comparison ────────────────────────────────────────── */}
            {/* The label stays `Compare to` whether or not a comparison is on:
                it names the control, and a label that changes wording with the
                value is a label a screen-reader user hears differently every
                time they land on it. */}
            <Label id={compareLabelId} className="sr-only">
              {t('rb.control.compare')}
            </Label>
            <Select
              /* §1.4 (rail v2, out of this file's WP) adds a fifth, non-string
                 `{ kind: 'fixed' }` option with its own popover; until that
                 lands here, a fixed comparison still shows as its own row so
                 the trigger never renders `[object Object]`. */
              value={typeof query.periodComparison === 'string' ? query.periodComparison : 'fixed'}
              disabled={unstarted}
              onValueChange={(value) =>
                onChange({ ...query, periodComparison: value as ReportQuery['periodComparison'] })
              }
            >
              <SelectTrigger id="rb-compare" size="sm" aria-labelledby={compareLabelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPARISONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`rb.compare.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* §A7 — the comparison carries its own way off. Present only when
                there is one to clear, because a permanently-inert `✕` beside a
                control reads as broken rather than as unavailable. */}
            {comparing && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t('rb.toolbar.compare.clear')}
                onClick={() => onChange({ ...query, periodComparison: 'none' })}
              >
                <CloseIcon aria-hidden="true" className="size-4" />
              </Button>
            )}
          </>
        )}

        {/* ── the range ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-0.5">
          <WindowControl
            query={query}
            onChange={onChange}
            today={today}
            disabled={unstarted}
            compact
            t={t}
            language={language}
          />
          {/* The window's own violations travel with the control they name.
              **These stay visible.** Every other reason in this row moved
              inside the menu that offers the option; a window violation names
              no option — it says the range as chosen cannot answer the
              question, which is the screenshot the owner sent (*"This range
              covers 2 periods and the matrix needs 5"*). Hiding that behind a
              hover would leave an operator with an empty matrix and nothing on
              screen telling them why. */}
          {windowReasons.length > 0 && (
            <ul className="flex max-w-64 list-none flex-col gap-0.5">
              {windowReasons.map((violation: QueryViolation, index) => (
                <li key={`${violation.code}-${index}`} className="text-xs text-muted-foreground">
                  {t(violation.reasonKey, violation.reasonParams)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
