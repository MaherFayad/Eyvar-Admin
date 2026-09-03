/**
 * The composition panel — **a form whose value is a `ReportQuery`.**
 *
 * The order below is the order the question is asked in, not the order the
 * fields happen to sit in the type (§5.3):
 *
 * ```
 *  1  Measure          required, first, and the ONLY control enabled on an
 *                      empty report (AC-807)
 *  2  Second measure   offers only measures legal to pair with the first
 *  3  Split by         offers only dimensions legal for EVERY measure
 *  4  Filters          the existing FilterSpec vocabulary, scoped to the
 *                      intersection. An empty intersection disables it and
 *                      says why (AC-813)
 *  5  Date range       the nine presets, or an explicit pair of dates
 *  6  Grain            illegal grains disabled IN PLACE with a reason
 *  7  Compare to       a SEPARATE control carrying the PERIOD comparison only
 *  8  Chart type       illegal types disabled in place with a reason
 *  9  Run              the explicit commit. Nothing re-runs on keystroke
 * ```
 *
 * ## This component computes no legality
 *
 * Every disabled option comes from `QueryPlan`, which `planReportQuery`
 * produces synchronously and which `reports.run` calls before it resolves
 * anything. A rule implemented here as well as there is a rule that will
 * disagree with itself; a rule that needed a round trip could not satisfy
 * AC-809 (*changing a control issues no request*) or AC-817 (*an over-long
 * grain is disabled **before** the query runs*). So the panel reads a plan and
 * renders it, and a hand-edited URL is refused by the same code path that greys
 * out the option (AC-825).
 *
 * ## Two controls share a word and they are not the same control
 *
 * A second **measure** (§6.1) and a previous **period** (§6.3) both get called
 * *compare*. They are separate controls here, and they compose: changing the
 * compare-to control never changes the number of measures, and adding a measure
 * never changes the compare-to setting (**AC-829**). Two measures and a period
 * comparison is four series, which is the ceiling.
 *
 * ## The refusal, and why it is not a warning
 *
 * The second-measure picker offers only measures with the same temporality and
 * the same unit. §6.2: *"a warning that can be dismissed is a warning that will
 * be dismissed, and the resulting chart gets screenshotted into a board deck
 * where the warning does not travel."* The predicate is `pairableWith`, the
 * same one `catalogue.measures` filters on server-side, so the picker and the
 * run agree by construction. An empty list is a real answer and says so.
 *
 * Rules applied
 *   §5.3        control order, and every control but the measure picker
 *               disabled in place on an unstarted report.
 *   D9 CQ-3     disabled with a reason, never hidden.
 *   §3.2        validate by disabling the primary, not by an error after
 *               submit: `Run` is off while the query carries a violation, and
 *               each violation renders beside the control it belongs to.
 *   §7.2        every control is reachable by keyboard with a visible focus
 *               ring, and every disabled reason is available to a screen
 *               reader (AC-899).
 *   §9.1        logical spacing throughout; nothing is placed by a side.
 *   R3          `Run` is the panel's one primary.
 */

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { pairableWith } from '@/data/clients'
import type {
  Dimension,
  Measure,
  QueryPlan,
  ReportGrain,
  ReportQuery,
  ChartType,
} from '@/data/types'
import type { Language, Translator } from '@/lib'
import { LegalityOptions } from './LegalityOptions'
import { WindowControl } from './WindowControl'

const COMPARISONS: ReportQuery['periodComparison'][] = ['none', 'previous-period', 'previous-year']

/** The sentinel a `Select` uses for "none". Radix forbids an empty-string item value. */
const NONE = '__none__'

export interface QueryPanelProps {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  onRun: () => void
  plan: QueryPlan
  measures: readonly Measure[]
  dimensions: readonly Dimension[]
  /** The catalogue's own four states. The panel stays usable for what is already chosen. */
  catalogueStatus: 'loading' | 'error' | 'empty' | 'content'
  onRetryCatalogue: () => void
  /** The day presets resolve against. Passed, never read from an ambient clock. */
  today: string
  running: boolean
  t: Translator
  language: Language
}

export function QueryPanel({
  query,
  onChange,
  onRun,
  plan,
  measures,
  dimensions,
  catalogueStatus,
  onRetryCatalogue,
  today,
  running,
  t,
  language,
}: QueryPanelProps) {
  const byKey = useMemo(() => new Map(measures.map((m) => [m.key, m])), [measures])
  const first = query.measures[0] ? byKey.get(query.measures[0].key) ?? null : null
  const second = query.measures[1] ? byKey.get(query.measures[1].key) ?? null : null
  const unstarted = query.measures.length === 0

  /* While the catalogue is still arriving every measure is "unknown" to the
     planner, which is true and useless: the operator has not made a mistake and
     the sentence would flash under a control they are not looking at. The
     violation is suppressed, never the control's disabled state. */
  const violationsFor = (field: string) =>
    catalogueStatus !== 'content' && field === 'measures'
      ? []
      : plan.violations.filter((v) => v.field === field)

  /* The planner speaks in enum values; the panel owns their labels. */
  const grainLabels = (params: Record<string, string | number>) => ({
    ...params,
    ...(params['grain'] !== undefined ? { grain: t(`rb.grain.${String(params['grain'])}`) } : {}),
    ...(params['minGrain'] !== undefined
      ? { minGrain: t(`rb.grain.${String(params['minGrain'])}`) }
      : {}),
  })

  /* §6.2's refusal, as the list the picker offers. Same predicate as the
     server-side `pairableWith` filter, so the two cannot disagree. */
  const pairable = first ? pairableWith(first, measures) : []

  const setMeasures = (keys: string[]) => onChange({ ...query, measures: keys.map((key) => ({ key })) })

  /**
   * **AC-812** — adding a second measure whose legal dimensions do not include
   * the current split clears the split **and states that it did**. Silently
   * keeping an illegal split would send a query the run then refuses; silently
   * dropping it without saying so changes the operator's question behind their
   * back.
   */
  const chooseSecond = (key: string | null) => {
    const nextKeys = key === null ? [query.measures[0]?.key ?? ''] : [query.measures[0]?.key ?? '', key]
    const next = { ...query, measures: nextKeys.filter(Boolean).map((k) => ({ key: k })) }
    const chosen = nextKeys.map((k) => byKey.get(k)).filter((m): m is Measure => Boolean(m))
    const stillLegal =
      next.groupBy === null ||
      chosen.every((m) => m.dimensions.some((d) => d.key === next.groupBy))
    onChange(stillLegal ? next : { ...next, groupBy: null })
    if (!stillLegal) setClearedSplit(true)
  }

  const [clearedSplit, setClearedSplit] = useState(false)

  return (
    <section
      aria-label={t('rb.panel.heading')}
      /* The panel scrolls on its own. It is a PERSISTENT composition surface
         beside a canvas that can be twelve panels tall; tying the two together
         would put `Run` below a scroll the operator did not ask for. */
      className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card p-3 shadow-1"
    >
      {/* ── 1 · measure ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rb-measure">{t('rb.control.measure')}</Label>
        {catalogueStatus === 'loading' ? (
          /* A skeleton list, not a spinner. The rest of the panel keeps
             rendering what has already been chosen (§8.1). */
          <LoadingSkeleton pattern="P1" rows={3} label={t('rb.catalogue.loading')} />
        ) : catalogueStatus === 'error' ? (
          /* AC-847 — the error is IN the picker, and its retry re-requests only
             the catalogue. The rest of the screen renders. */
          <ErrorState
            scope="card"
            card={false}
            message={t('rb.catalogue.error')}
            action={{ label: t('rb.catalogue.retry'), onClick: onRetryCatalogue }}
          />
        ) : measures.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('rb.catalogue.empty')}</p>
        ) : (
          <Select
            value={query.measures[0]?.key ?? ''}
            onValueChange={(key) => setMeasures([key, ...(query.measures[1] ? [query.measures[1].key] : [])])}
          >
            <SelectTrigger id="rb-measure" className="w-full">
              <SelectValue placeholder={t('rb.control.measure.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <MeasureItems measures={measures} t={t} />
            </SelectContent>
          </Select>
        )}
        <Reasons items={violationsFor('measures')} t={t} />
        {/* R5-15 made visible at the point of choosing: the population of the
            measure the operator has actually picked. */}
        {first && <p className="text-xs text-muted-foreground">{t(first.population.predicateKey)}</p>}
      </div>

      {/* ── 2 · second measure ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rb-measure-2">{t('rb.control.measure2')}</Label>
        <Select
          value={query.measures[1]?.key ?? NONE}
          disabled={unstarted || pairable.length === 0}
          onValueChange={(key) => chooseSecond(key === NONE ? null : key)}
        >
          <SelectTrigger id="rb-measure-2" className="w-full">
            <SelectValue placeholder={t('rb.control.measure2.none')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t('rb.control.measure2.none')}</SelectItem>
            <MeasureItems measures={pairable} t={t} />
          </SelectContent>
        </Select>
        {unstarted ? (
          <p className="text-xs text-muted-foreground">{t('rb.control.disabled.unstarted')}</p>
        ) : pairable.length === 0 ? (
          /* A refusal stated, not an empty menu. R4-1 §1.3's own sentence. */
          <p className="text-xs text-muted-foreground">{t('rb.control.measure2.empty')}</p>
        ) : null}
        {second && <p className="text-xs text-muted-foreground">{t(second.population.predicateKey)}</p>}
      </div>

      {/* ── 3 · split by ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rb-groupby">{t('rb.control.groupBy')}</Label>
        <Select
          value={query.groupBy ?? NONE}
          disabled={unstarted || plan.legalDimensions.length === 0}
          onValueChange={(key) => {
            setClearedSplit(false)
            onChange({ ...query, groupBy: key === NONE ? null : key })
          }}
        >
          <SelectTrigger id="rb-groupby" className="w-full">
            <SelectValue placeholder={t('rb.control.groupBy.none')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t('rb.control.groupBy.none')}</SelectItem>
            {plan.legalDimensions.map((key) => (
              <SelectItem key={key} value={key}>
                {t(dimensions.find((d) => d.key === key)?.labelKey ?? key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {unstarted ? (
          <p className="text-xs text-muted-foreground">{t('rb.control.disabled.unstarted')}</p>
        ) : plan.legalDimensions.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('rb.control.groupBy.empty')}</p>
        ) : null}
        {clearedSplit && (
          <p role="status" className="text-xs text-muted-foreground">
            {t('rb.control.groupBy.cleared', { measure: second ? t(second.labelKey) : '' })}
          </p>
        )}
        <Reasons items={violationsFor('groupBy')} t={t} />
      </div>

      {/* ── 4 · filters ──────────────────────────────────────────────────── */}
      <Filters
        query={query}
        onChange={onChange}
        legalFields={plan.legalFilterFields}
        dimensions={dimensions}
        unstarted={unstarted}
        twoMeasures={query.measures.length > 1}
        t={t}
      />

      {/* ── 5 · date range ───────────────────────────────────────────────── */}
      <WindowControl
        query={query}
        onChange={onChange}
        today={today}
        disabled={unstarted}
        t={t}
        language={language}
      />
      <Reasons items={violationsFor('window')} t={t} />

      {/* ── 6 · grain ────────────────────────────────────────────────────── */}
      <LegalityOptions
        label={t('rb.control.grain')}
        options={plan.grains}
        value={query.grain}
        onChange={(grain: ReportGrain) => onChange({ ...query, grain })}
        labelFor={(grain) => t(`rb.grain.${grain}`)}
        resolveParams={grainLabels}
        disabled={unstarted}
        disabledReason={t('rb.control.disabled.unstarted')}
        t={t}
      />

      {/* ── 7 · compare to — a SEPARATE control (§6.3, AC-829) ───────────── */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rb-compare">{t('rb.control.compare')}</Label>
        <Select
          value={query.periodComparison}
          disabled={unstarted}
          onValueChange={(value) =>
            onChange({ ...query, periodComparison: value as ReportQuery['periodComparison'] })
          }
        >
          <SelectTrigger id="rb-compare" className="w-full">
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
      </div>

      {/* ── 8 · chart type ───────────────────────────────────────────────── */}
      <LegalityOptions
        label={t('rb.control.chartType')}
        options={plan.chartTypes}
        value={query.chartType}
        onChange={(chartType: ChartType) => onChange({ ...query, chartType })}
        labelFor={(chart) => t(`rb.chartType.${chart}`)}
        disabled={unstarted}
        disabledReason={t('rb.control.disabled.unstarted')}
        t={t}
      />

      {/* ── 9 · run ──────────────────────────────────────────────────────── */}
      <Button
        type="button"
        variant="default"
        onClick={onRun}
        disabled={running || plan.violations.length > 0}
      >
        {t('rb.control.run')}
      </Button>
    </section>
  )
}

/**
 * The catalogue, grouped the way §3.7's metrics-library sidebar groups.
 *
 * Grouped rather than flat because a fourteen-item list of measure names is a
 * list an operator scans; a list under `Revenue` / `Captains` / `Riders` is one
 * they navigate. `MetricCategory` is the data layer's closed six and nothing
 * here invents a seventh.
 */
function MeasureItems({ measures, t }: { measures: readonly Measure[]; t: Translator }) {
  const byCategory = new Map<string, Measure[]>()
  for (const measure of measures) {
    const bucket = byCategory.get(measure.category) ?? []
    bucket.push(measure)
    byCategory.set(measure.category, bucket)
  }
  return (
    <>
      {[...byCategory.entries()].map(([category, group]) => (
        <SelectGroup key={category}>
          <SelectLabel>{t(`rb.category.${category}`)}</SelectLabel>
          {group.map((measure) => (
            <SelectItem key={measure.key} value={measure.key}>
              {t(measure.labelKey)}
            </SelectItem>
          ))}
        </SelectGroup>
      ))}
    </>
  )
}

/**
 * §3.4 — the **existing** filter vocabulary, scoped per measure.
 *
 * The emitted object is a `FilterSpec { field, op, value }`, byte-identical in
 * shape to one an index table emits (AC-814). There is no second filter model
 * and `columnFilter.ts` is explicit that there must never be one.
 *
 * **The field list is the intersection across every measure in the query**, and
 * for two measures over two resources that intersection is empty. *"That is the
 * correct behaviour, not a bug"*: a filter that cannot apply to both series
 * must not silently apply to one.
 *
 * **What the catalogue does not yet declare is a control KIND per field**
 * (F-5 gives `filterableFields: string[]` and nothing else), so the control is
 * an equality match on a typed value. Guessing a kind per field name would be
 * inventing a catalogue property in a component — raised in the handoff instead.
 */
function Filters({
  query,
  onChange,
  legalFields,
  dimensions,
  unstarted,
  twoMeasures,
  t,
}: {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  legalFields: readonly string[]
  dimensions: readonly Dimension[]
  unstarted: boolean
  twoMeasures: boolean
  t: Translator
}) {
  const [field, setField] = useState<string>('')
  const [value, setValue] = useState('')

  const labelFor = (key: string) => t(dimensions.find((d) => d.key === key)?.labelKey ?? key, undefined)

  const add = () => {
    if (field === '' || value.trim() === '') return
    onChange({
      ...query,
      filters: [
        ...query.filters.filter((f) => f.field !== field),
        { field, op: 'eq', value: value.trim() },
      ],
    })
    setValue('')
  }

  const disabled = unstarted || legalFields.length === 0

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="rb-filter-field">{t('rb.control.filters')}</Label>

      {query.filters.length > 0 && (
        <ul className="flex list-none flex-wrap gap-1">
          {query.filters.map((filter) => (
            <li key={filter.field}>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                aria-label={t('rb.control.filters.remove', { field: labelFor(filter.field) })}
                onClick={() =>
                  onChange({ ...query, filters: query.filters.filter((f) => f.field !== filter.field) })
                }
              >
                <bdi>{String(filter.value)}</bdi>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Select value={field} disabled={disabled} onValueChange={setField}>
        <SelectTrigger id="rb-filter-field" className="w-full">
          <SelectValue placeholder={t('rb.control.filters.field')} />
        </SelectTrigger>
        <SelectContent>
          {legalFields.map((key) => (
            <SelectItem key={key} value={key}>
              {labelFor(key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        aria-label={t('rb.control.filters.value')}
        value={value}
        disabled={disabled || field === ''}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button type="button" size="xs" variant="secondary" disabled={disabled || field === '' || value.trim() === ''} onClick={add}>
        {t('rb.control.filters.apply')}
      </Button>

      {unstarted ? (
        <p className="text-xs text-muted-foreground">{t('rb.control.filters.unstarted')}</p>
      ) : legalFields.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {/* Two different facts: two measures that share no field, and one
              measure that has none. The split-by sentence used to stand in for
              both and was wrong about the second. */}
          {twoMeasures ? t('rb.control.filters.empty') : t('rb.control.filters.noneForMeasure')}
        </p>
      ) : null}
    </div>
  )
}

/** A violation renders beside the control it names, in the layer's own words. */
function Reasons({
  items,
  t,
}: {
  items: ReadonlyArray<{ code: string; reasonKey: string; reasonParams: Record<string, string | number> }>
  t: Translator
}) {
  if (items.length === 0) return null
  return (
    <ul className="flex list-none flex-col gap-0.5">
      {/* Two measures can carry the SAME violation code — an unresolved pair is
          two `unknown-measure`s — so the key pairs the code with its position.
          A code-only key silently drops the second sentence. */}
      {items.map((item, index) => (
        <li key={`${item.code}-${index}`} className="text-xs text-muted-foreground">
          {t(item.reasonKey, item.reasonParams)}
        </li>
      ))}
    </ul>
  )
}
