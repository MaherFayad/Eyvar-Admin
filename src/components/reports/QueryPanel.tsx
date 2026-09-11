/**
 * The composition panel — **a form whose value is a `ReportQuery`.**
 *
 * The order below is the order the question is asked in, not the order the
 * fields happen to sit in the type (§5.3):
 *
 * measure, second measure, formula (§1.1), transform (§1.3), split by,
 * segments (§1.2), filters (AC-813), `Refresh` — NOT a commit; see below.
 *
 * ## Item 5 stopped being the commit
 *
 * The canvas follows the question: `ReportBuilder` re-runs 350ms after the last
 * edit, whenever the plan is legal. So this button no longer *makes the report
 * happen* — it asks the same question again, for an operator who wants the
 * numbers as of now rather than as of their last edit, and for one who would
 * rather not wait out the debounce. It kept its key (`rb.control.run`) and lost
 * its word.
 *
 * It is still `disabled` while the query carries a violation, and that is the
 * same §3.2 rule it always was: **an illegal question is not asked**, by the
 * button or by the debounce. Nothing about the legality machinery moved.
 *
 * ## Four controls left this panel and did not come back
 *
 * §5.3 items 5-8 — **date range, grain, compare-to and chart type** — are now
 * `ChartToolbar`'s, on the row directly above the plot (Amplitude §A7). The
 * order above is still §5.3's order; four of its rows moved rather than
 * changed. The reason is a split, not a tidy-up: this panel asks *what am I
 * asking*, and those four answer *how am I looking at it*. Nothing is rendered
 * twice — a setting with two controls is a setting whose two controls will
 * disagree on screen.
 *
 * `Second measure` (§6.1) stays here: it changes the QUESTION. `Compare to`
 * (§6.3) leaves. AC-829's independence between the two is unaffected, because
 * neither ever wrote the other's field.
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
 * ## The rail stopped being a wall of prose
 *
 * Every control here used to carry a standing
 * `<p className="text-xs text-muted-foreground">` under it — the population
 * predicate, the *why this is off* sentence, the violation list. Eight
 * paragraphs in a 288px column. The owner's instruction was to move them behind
 * an `i`, and that is all that happened: **every sentence keeps its key and its
 * words and changes carrier only** (`InfoHint`). The label row absorbs the icon
 * without growing.
 *
 * Two things did **not** move, and the line between them is *does this describe
 * the control, or is it the control's state*:
 *
 * - `rb.control.groupBy.cleared` is `role="status"`. It reports something that
 *   happened **behind the operator's back** — AC-812 cleared their split when
 *   they added a second measure. An announcement they have to open is not an
 *   announcement.
 * - the `LoadingSkeleton` and `ErrorState` branches in the measure picker are
 *   states, not descriptions, and AC-847's retry has to be on the page.
 *
 * Rules applied
 *   §5.3        control order, and every control but the measure picker
 *               disabled in place on an unstarted report.
 *   D9 CQ-3     disabled with a reason, never hidden.
 *   §3.2        validate by disabling the primary, not by an error after
 *               submit: `Refresh` is off while the query carries a violation,
 *               the auto-run is gated on the same predicate, and each violation
 *               renders beside the control it belongs to.
 *   §7.2        every control is reachable by keyboard with a visible focus
 *               ring, and every disabled reason is available to a screen
 *               reader (AC-899).
 *   §9.1        logical spacing throughout; nothing is placed by a side.
 *   R3          `Refresh` is the panel's one primary.
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
import { InfoHint, hintLines } from '@/components/InfoHint'
import { FormulaField } from './FormulaField'
import { SegmentPicker } from './SegmentPicker'
import { TransformControls } from './TransformControls'
import { ComparisonControl, ComparisonDisplayToggle } from './WindowControl'
import { pairableWith } from '@/data/clients'
import { REPORT_GROUP_BY_MAX } from '@/data/types/report'
import { reportMode, type BucketAggregate, type Dimension, type Measure, type MeasureRef, type QueryPlan, type ReportQuery } from '@/data/types'
import type { Language, Translator } from '@/lib'

/** The sentinel a `Select` uses for "none". Radix forbids an empty-string item value. */
const NONE = '__none__'

export interface QueryPanelProps {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  /**
   * Re-run the question on screen, now. **Not the commit** — the builder's
   * debounce is. It is `'ask'` on the builder's side, so it is the one run that
   * spends a history entry, because it is the one an operator performed
   * deliberately.
   */
  onRun: () => void
  plan: QueryPlan
  measures: readonly Measure[]
  dimensions: readonly Dimension[]
  /** The catalogue's own four states. The panel stays usable for what is already chosen. */
  catalogueStatus: 'loading' | 'error' | 'empty' | 'content'
  onRetryCatalogue: () => void
  running: boolean
  /**
   * WP-2.6b — `ComparisonControl`'s fixed-range popover needs both, and
   * `ChartToolbar` has not swapped it in for its own inline `Compare to`
   * select yet (its own note: "ready for `ChartToolbar` (WP-2.7)"). Wired
   * here as the stopgap so a fixed comparison is reachable at all; see the
   * handoff for which file removes the duplicate once WP-2.7 lands.
   */
  today: string
  language: Language
  t: Translator
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
  running,
  today,
  language,
  t,
}: QueryPanelProps) {
  const byKey = useMemo(() => new Map(measures.map((m) => [m.key, m])), [measures])
  const first = query.measures[0] ? byKey.get(query.measures[0].key) ?? null : null
  const second = query.measures[1] ? byKey.get(query.measures[1].key) ?? null : null
  const unstarted = query.measures.length === 0
  /* §9 — `periodComparison` is only asked of a trend or a table (`plan.ts`'s own `isSeriesMode`). */
  const mode = reportMode(query)
  const isSeriesMode = mode === 'trend' || mode === 'table'

  /* While the catalogue is still arriving every measure is "unknown" to the
     planner, which is true and useless: the operator has not made a mistake and
     the sentence would flash under a control they are not looking at. The
     violation is suppressed, never the control's disabled state. */
  const violationsFor = (field: string) =>
    catalogueStatus !== 'content' && field === 'measures'
      ? []
      : plan.violations.filter((v) => v.field === field)

  /* §6.2's refusal, as the list the picker offers. Same predicate as the
     server-side `pairableWith` filter, so the two cannot disagree. */
  const pairable = first ? pairableWith(first, measures) : []

  /* Replaces the first measure. **Keeps the second ref exactly as it was** —
     including its `aggregate` (G1) — because picking a new first measure says
     nothing about the second one; rebuilding both from bare keys would silently
     drop an operator's `Measured as` choice on a ref nobody touched. */
  const setFirstMeasure = (key: string) => {
    const secondRef = query.measures[1]
    onChange({ ...query, measures: secondRef ? [{ key }, secondRef] : [{ key }] })
  }

  /**
   * AC-812 — an illegal split clears **and says so**. Keeps the first ref as
   * it was, same reason as `setFirstMeasure`: choosing a second measure must
   * not wipe the first's `aggregate`.
   */
  const chooseSecond = (key: string | null) => {
    const firstRef = query.measures[0]
    if (!firstRef) return
    const nextMeasures: MeasureRef[] = key === null ? [firstRef] : [firstRef, { key }]
    const next = { ...query, measures: nextMeasures }
    const chosen = nextMeasures.map((m) => byKey.get(m.key)).filter((m): m is Measure => Boolean(m))
    /* G4: `groupBy` is an array now (≤ `REPORT_GROUP_BY_MAX`). Every level has
       to survive the same legality check a single level always got. */
    const stillLegal = next.groupBy.every((g) => chosen.every((m) => m.dimensions.some((d) => d.key === g)))
    onChange(stillLegal ? next : { ...next, groupBy: [] })
    if (!stillLegal && next.groupBy.length > 0) setClearedSplit(true)
  }

  /** G1 (§2.1) — `undefined` writes back to "no override", the catalogue's own `bucketAggregate`. */
  const setMeasureAggregate = (index: 0 | 1, aggregate: BucketAggregate | undefined) => {
    const ref = query.measures[index]
    if (!ref) return
    const nextRef: MeasureRef = aggregate === undefined ? { key: ref.key } : { key: ref.key, aggregate }
    onChange({ ...query, measures: query.measures.map((r, i) => (i === index ? nextRef : r)) })
  }

  const [clearedSplit, setClearedSplit] = useState(false)
  /** §2.2 — view-only: redraws A/B as dashed context series, never in `ReportQuery`. */
  const [showParts, setShowParts] = useState(false)

  return (
    <section
      aria-label={t('rb.panel.heading')}
      /* The panel scrolls on its own. It is a PERSISTENT composition surface
         beside a canvas that can be twelve panels tall; tying the two together
         would put `Run` below a scroll the operator did not ask for. */
      className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto rounded-xl border border-card-border bg-card p-3"
    >
      {/* ── 1 · measure ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        {/* The hint is a SIBLING of the `<Label>`, never a child: a `<button>`
            inside a `<label>` joins the field's accessible name, and the
            picker would be called "Measure What this means". */}
        <div className="flex items-center gap-1.5">
          <Label htmlFor="rb-measure">{t('rb.control.measure')}</Label>
          <InfoHint t={t}>
            {hintLines([
              /* R5-15 at the point of choosing: the population of the measure
                 the operator has actually picked. */
              first && t(first.population.predicateKey),
              /* `rb.catalogue.empty` is a description of the picker, not a
                 branch of it — the `LoadingSkeleton` and `ErrorState` below
                 are the branches that stay on the page. */
              catalogueStatus !== 'loading' &&
                catalogueStatus !== 'error' &&
                measures.length === 0 &&
                t('rb.catalogue.empty'),
              ...reasonSentences(violationsFor('measures'), t),
            ])}
          </InfoHint>
        </div>
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
          /* The sentence moved to the hint on the label row above; there is no
             picker to render and nothing else belongs here. */
          null
        ) : (
          <Select value={query.measures[0]?.key ?? ''} onValueChange={setFirstMeasure}>
            <SelectTrigger id="rb-measure" className="w-full">
              <SelectValue placeholder={t('rb.control.measure.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <MeasureItems measures={measures} t={t} />
            </SelectContent>
          </Select>
        )}
        {/* G1 (§2.1) — beside the measure it describes; present only when the
            catalogue offers more than one aggregate. */}
        {first && (
          <MeasuredAsControl
            id="rb-measure-aggregate"
            measure={first}
            value={query.measures[0]?.aggregate}
            onChange={(aggregate) => setMeasureAggregate(0, aggregate)}
            t={t}
          />
        )}
      </div>

      {/* ── 2 · second measure ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="rb-measure-2">{t('rb.control.measure2')}</Label>
          <InfoHint t={t}>
            {hintLines([
              unstarted
                ? t('rb.control.disabled.unstarted')
                : /* A refusal stated, not an empty menu. R4-1 §1.3's own
                     sentence. */
                  pairable.length === 0 && t('rb.control.measure2.empty'),
              second && t(second.population.predicateKey),
            ])}
          </InfoHint>
        </div>
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
        {second && (
          <MeasuredAsControl
            id="rb-measure-2-aggregate"
            measure={second}
            value={query.measures[1]?.aggregate}
            onChange={(aggregate) => setMeasureAggregate(1, aggregate)}
            t={t}
          />
        )}
      </div>

      {/* ── 4 · formula (22-analytics-v2.md §1.1) ───────────────────────── */}
      <FormulaField
        query={query}
        onChange={onChange}
        firstMeasure={first}
        secondMeasure={second}
        hasSplit={query.groupBy.length > 0}
        violations={violationsFor('formula')}
        unstarted={unstarted}
        showParts={showParts}
        onShowPartsChange={setShowParts}
        t={t}
      />

      {/* ── 5 · transform (§1.3) ─────────────────────────────────────────── */}
      <TransformControls
        query={query}
        onChange={onChange}
        options={plan.transformOptions}
        bucketCount={plan.bucketCount}
        unstarted={unstarted}
        t={t}
      />

      {/* ── 6 · split by (G4 — up to `REPORT_GROUP_BY_MAX` levels) ────────── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="rb-groupby">{t('rb.control.groupBy')}</Label>
          <InfoHint t={t}>
            {hintLines([
              unstarted
                ? t('rb.control.disabled.unstarted')
                : plan.legalDimensions.length === 0 && t('rb.control.groupBy.empty'),
              ...reasonSentences(violationsFor('groupBy'), t),
            ])}
          </InfoHint>
        </div>
        <Select
          value={query.groupBy[0] ?? NONE}
          disabled={unstarted || plan.legalDimensions.length === 0}
          onValueChange={(key) => {
            setClearedSplit(false)
            const level1 = key === NONE ? undefined : key
            const level2 = query.groupBy[1]
            const next =
              level1 === undefined ? [] : level2 && level2 !== level1 ? [level1, level2] : [level1]
            onChange({ ...query, groupBy: next })
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
        {/* **Stays on the page, and is not a hint.** A live region reports what
            AC-812 did behind the operator's back; an announcement they have to
            open is not an announcement. */}
        {clearedSplit && (
          <p role="status" className="text-xs text-muted-foreground">
            {t('rb.control.groupBy.cleared', { measure: second ? t(second.labelKey) : '' })}
          </p>
        )}

        {/* The second level. Always present, disabled in place until a first
            split exists — D9 CQ-3, same rule every other row in this panel
            follows. */}
        <SecondSplitControl
          query={query}
          onChange={onChange}
          legalDimensions={plan.legalDimensions}
          dimensions={dimensions}
          unstarted={unstarted}
          t={t}
        />

        {/* WP-2.6b gap 3: the third level is refused **in place**, not hidden —
            `REPORT_GROUP_BY_MAX` is a standing cap, not a catalogue fact, so
            this button is permanently disabled and always says why. */}
        <div className="flex flex-col gap-0.5">
          <Button type="button" variant="secondary" size="xs" disabled aria-describedby="rb-groupby-3-reason">
            {t('rb.control.groupBy3.add')}
          </Button>
          <p id="rb-groupby-3-reason" className="text-xs text-muted-foreground">
            {t('rb.violation.tooManyGroupLevels', { max: REPORT_GROUP_BY_MAX })}
          </p>
        </div>
      </div>

      {/* ── 7 · segments (§1.2) ──────────────────────────────────────────── */}
      <SegmentPicker
        query={query}
        onChange={onChange}
        legalFilterFields={plan.legalFilterFields}
        dimensions={dimensions}
        measures={measures}
        violations={violationsFor('segments')}
        unstarted={unstarted}
        t={t}
      />

      {/* ── 8 · filters ──────────────────────────────────────────────────── */}
      <Filters
        query={query}
        onChange={onChange}
        legalFields={plan.legalFilterFields}
        dimensions={dimensions}
        unstarted={unstarted}
        twoMeasures={query.measures.length > 1}
        t={t}
      />

      {/* ── 9 · compare to (WP-2.6b stopgap — see `QueryPanelProps.today`) ── */}
      {/* `ChartToolbar`'s own `Compare to` still lacks `previous-quarter` and
          the fixed row, and `Show as` is not on screen anywhere. Both exist
          as `WindowControl` exports with nowhere to render; this is that
          somewhere until WP-2.7 swaps them into the toolbar and this section
          comes back out. Series modes only — a funnel, a cohort and a
          journey have no `periodComparison` (`plan.ts`'s `isSeriesMode`). */}
      {isSeriesMode && (
        <div className="flex flex-col gap-1.5">
          <ComparisonControl query={query} onChange={onChange} today={today} disabled={unstarted} t={t} language={language} />
          {query.periodComparison !== 'none' && (
            <ComparisonDisplayToggle query={query} onChange={onChange} disabled={unstarted} t={t} />
          )}
        </div>
      )}

      {/* **The date range, the grain and the chart type are `ChartToolbar`'s.**
          They are decisions about *how the answer is read*, and §A7 puts them
          on the row above the plot they change. See `ChartToolbar.tsx`. */}
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

/** `BucketAggregate` → its copy key's suffix. The two hyphenated values are the only irregulars. */
function aggregateKeySuffix(aggregate: BucketAggregate): string {
  if (aggregate === 'end-of-period') return 'endOfPeriod'
  if (aggregate === 'cumulative-count') return 'cumulativeCount'
  return aggregate
}

/**
 * G1 (§2.1) — **the catalogue stays the authority.** Renders nothing unless
 * `measure.bucketAggregateOptions` has more than one entry; there is no
 * fallback single-option render, because a control with one legal choice is
 * not a choice.
 */
function MeasuredAsControl({
  id,
  measure,
  value,
  onChange,
  t,
}: {
  id: string
  measure: Measure
  value: BucketAggregate | undefined
  onChange: (aggregate: BucketAggregate | undefined) => void
  t: Translator
}) {
  const options = measure.bucketAggregateOptions
  if (!options || options.length < 2) return null
  const current = value ?? measure.bucketAggregate

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{t('rb.control.measuredAs')}</Label>
      <Select
        value={current}
        onValueChange={(next) => {
          const aggregate = next as BucketAggregate
          onChange(aggregate === measure.bucketAggregate ? undefined : aggregate)
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {t(`rb.control.measuredAs.${aggregateKeySuffix(option)}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * WP-2.6b gap 3 (G4) — the split's second level. Disabled in place (D9 CQ-3)
 * until a first level is chosen, rather than hidden: an operator who has not
 * split yet still sees that a second level exists.
 */
function SecondSplitControl({
  query,
  onChange,
  legalDimensions,
  dimensions,
  unstarted,
  t,
}: {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  legalDimensions: readonly string[]
  dimensions: readonly Dimension[]
  unstarted: boolean
  t: Translator
}) {
  const level1 = query.groupBy[0]
  const disabled = unstarted || !level1
  const options = level1 ? legalDimensions.filter((key) => key !== level1) : []

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="rb-groupby-2">{t('rb.control.groupBy2')}</Label>
        <InfoHint t={t}>
          {hintLines([
            unstarted
              ? t('rb.control.disabled.unstarted')
              : !level1
                ? t('rb.control.groupBy2.needsFirst')
                : options.length === 0 && t('rb.control.groupBy.empty'),
          ])}
        </InfoHint>
      </div>
      <Select
        value={query.groupBy[1] ?? NONE}
        disabled={disabled || options.length === 0}
        onValueChange={(key) => {
          if (!level1) return
          onChange({ ...query, groupBy: key === NONE ? [level1] : [level1, key] })
        }}
      >
        <SelectTrigger id="rb-groupby-2" className="w-full">
          <SelectValue placeholder={t('rb.control.groupBy2.none')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t('rb.control.groupBy2.none')}</SelectItem>
          {options.map((key) => (
            <SelectItem key={key} value={key}>
              {t(dimensions.find((d) => d.key === key)?.labelKey ?? key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
      <div className="flex items-center gap-1.5">
        <Label htmlFor="rb-filter-field">{t('rb.control.filters')}</Label>
        <InfoHint t={t}>
          {hintLines([
            unstarted
              ? t('rb.control.filters.unstarted')
              : legalFields.length === 0 &&
                /* Two different facts: two measures that share no field, and
                   one measure that has none. The split-by sentence used to
                   stand in for both and was wrong about the second. */
                (twoMeasures
                  ? t('rb.control.filters.empty')
                  : t('rb.control.filters.noneForMeasure')),
          ])}
        </InfoHint>
      </div>

      {query.filters.length > 0 && (
        <ul className="flex list-none flex-wrap gap-1">
          {query.filters.map((filter) => (
            <li key={filter.field}>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                onClick={() =>
                  onChange({ ...query, filters: query.filters.filter((f) => f.field !== filter.field) })
                }
              >
                <bdi>{String(filter.value)}</bdi>
                {/* **SC 2.5.3, Label in Name.** This was an `aria-label` reading
                    `Remove the City filter` over a chip whose visible text is
                    `Riyadh` — the two shared not one character, so a voice-control
                    operator looking straight at the chip said "click Riyadh" and
                    nothing happened; the only phrase that worked was one nothing
                    on screen showed them.

                    An `aria-label` REPLACES the subtree, so it can never be a
                    superset of it. Dropping it and appending the context as
                    hidden text makes the name `Riyadh Remove the City filter` —
                    which opens with the visible label, unbroken. Same rule as
                    `shell.notifications.markReadA11y`: the visible label first
                    and whole, the distinguishing half after it. The key is
                    unchanged; only the carrier moved. */}
                <span className="sr-only">
                  {t('rb.control.filters.remove', { field: labelFor(filter.field) })}
                </span>
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
    </div>
  )
}

/**
 * A violation, as the sentence it names — for the hint on the control its
 * `field` names.
 *
 * **It was a `<ul>` of `<li>`s under the control** and it is a list of strings
 * now, because the sentences render inside a tooltip and `<ul>` is not phrasing
 * content, so it cannot live inside the `<bdi>` that isolates them. Nothing
 * else changed: same keys, same params, same order.
 *
 * **Two violations can carry the same code** — an unresolved pair is two
 * `unknown-measure`s — so nothing here dedupes. `hintLines` keys by index for
 * exactly that reason. (Contrast `LegalityOptions`, which dedupes on the
 * resolved *sentence*: there, two options genuinely share one reason.)
 */
function reasonSentences(
  items: ReadonlyArray<{ code: string; reasonKey: string; reasonParams: Record<string, string | number> }>,
  t: Translator,
): string[] {
  return items.map((item) => t(item.reasonKey, item.reasonParams))
}
