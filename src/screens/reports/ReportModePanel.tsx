/**
 * **The rail, for the three modes whose question is not a series over time.**
 *
 * ```
 *  ┌──────────────────────┐
 *  │ Question   [Funnel ▾]│  ← the mode switcher, on every mode
 *  ├──────────────────────┤
 *  │ Steps                │
 *  │  1  Riders who joined│
 *  │     + quick rides    │  ← per-rung filters, which a query-level
 *  │  2  Trips completed  │    filter cannot express (AC-814)
 *  │  [Add a step]        │
 *  │ Time to convert      │
 *  │ Date range           │
 *  │ [Run]                │
 *  └──────────────────────┘
 * ```
 *
 * ## Why this is a second panel and not a branch inside `QueryPanel`
 *
 * `QueryPanel` asks §5.3's nine questions in §5.3's order, and the first of
 * them — *measure* — is the one a funnel, a cohort and a journey do not have.
 * Their configuration lives in `query.funnel` / `.cohort` / `.journey`, which is
 * exactly why P7-T1 put it there rather than overloading `measures`. Branching
 * inside `QueryPanel` would put four unrelated shapes behind one set of
 * controls and leave every one of them disabled on `measures.length === 0`,
 * which is how the window control — the thing a cohort most needs — ends up
 * greyed out on a cohort report.
 *
 * So the builder renders `QueryPanel` for `trend` and `table` **unchanged**,
 * and this for the other three. One mode switcher above both, and one `Run`.
 *
 * ## It computes no legality, exactly as `QueryPanel` computes none
 *
 * Every reason on screen is a `QueryViolation` from `planReportQuery` — the
 * same pure function `reports.run` calls — rendered beside the control its
 * `field` names. A rule implemented here as well as there is a rule that will
 * disagree with itself, and a hand-edited URL has to be refused with the
 * sentence the greyed control carries (AC-825).
 *
 * ## Switching mode does not compose an illegal query
 *
 * `applyReportMode` (in `reporting/plan.ts`, beside the constants that decide
 * it) fixes the chart and collapses the grain when the new mode does, and seeds
 * an unstarted configuration. Without it an operator's first sight of `funnel`
 * is two violations they did not cause — §3.2's rule is to validate by
 * disabling the primary, not by an error after the fact.
 *
 * Rules applied
 *   §5.3        control order; nothing runs until `Run` (AC-809).
 *   D9 CQ-3     illegal options disabled in place with a reason, never hidden.
 *   §3.2        `Run` is off while the query carries a violation.
 *   R3          `Run` is the panel's one primary.
 *   §7.2        every control is a real focusable element with the primitive's
 *               own ring; every reason is readable, not a tooltip on a disabled
 *               control.
 *   §9.1        logical spacing throughout; nothing placed by a physical side.
 */

import { useId, useState } from 'react'
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
import { LegalityOptions, WindowControl } from '@/components/reports'
import {
  MAX_COHORT_HORIZON,
  MAX_FUNNEL_STEPS,
  MAX_JOURNEY_DEPTH,
  MIN_COHORT_HORIZON,
  MIN_JOURNEY_DEPTH,
} from '@/data/clients/reports'
import {
  REPORT_MODES,
  reportMode,
  type CohortGrain,
  type Dimension,
  type FilterSpec,
  type FunnelStep,
  type Measure,
  type QueryPlan,
  type QueryViolation,
  type ReportMode,
  type ReportQuery,
} from '@/data/types'
import type { Language, Translator } from '@/lib'

/** Shared by both rails, so a mode card and a query card sit on one surface. */
const CARD = 'flex flex-col gap-4 rounded-xl border border-border bg-card p-3 shadow-1'

/** Radix forbids an empty-string item value; this is the "unset" sentinel. */
const NONE = '__none__'

export interface ReportModePanelProps {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  onRun: () => void
  plan: QueryPlan
  measures: readonly Measure[]
  dimensions: readonly Dimension[]
  /** The catalogue's own four states. Everything already chosen keeps rendering. */
  catalogueStatus: 'loading' | 'error' | 'empty' | 'content'
  onRetryCatalogue: () => void
  /** The day presets resolve against. Passed, never read from an ambient clock. */
  today: string
  running: boolean
  t: Translator
  language: Language
}

export function ReportModePanel({
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
}: ReportModePanelProps) {
  const mode = reportMode(query)
  const reasons = (field: QueryViolation['field']) => plan.violations.filter((v) => v.field === field)

  return (
    <section aria-label={t('rb.panel.heading')} className={`${CARD} w-72 shrink-0 overflow-y-auto`}>
      {catalogueStatus === 'loading' ? (
        /* A skeleton list, not a spinner over the panel. The mode switcher above
           it is rendered by the builder and stays usable (§8.1). */
        <LoadingSkeleton pattern="P1" rows={4} label={t('rb.catalogue.loading')} />
      ) : catalogueStatus === 'error' ? (
        /* AC-847 — the error is IN the picker and its retry re-requests only the
           catalogue. The rest of the screen renders. */
        <ErrorState
          scope="card"
          card={false}
          message={t('rb.catalogue.error')}
          action={{ label: t('rb.catalogue.retry'), onClick: onRetryCatalogue }}
        />
      ) : measures.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('rb.catalogue.empty')}</p>
      ) : mode === 'funnel' ? (
        <FunnelFields
          query={query}
          onChange={onChange}
          measures={measures}
          dimensions={dimensions}
          reasons={reasons('funnel')}
          t={t}
        />
      ) : mode === 'cohort' ? (
        <CohortFields
          query={query}
          onChange={onChange}
          plan={plan}
          measures={measures}
          reasons={reasons('cohort')}
          t={t}
        />
      ) : (
        <JourneyFields
          query={query}
          onChange={onChange}
          measures={measures}
          reasons={reasons('journey')}
          t={t}
        />
      )}

      {/* §5.3 item 5, from the one shared control — see `WindowControl.tsx`.
          **Never `disabled` here**, which is the concrete reason this panel
          exists: a cohort's window decides how many columns it can reach, and
          `QueryPanel` turns the range off while `measures` is empty. */}
      <WindowControl
        id="rb-mode-window"
        query={query}
        onChange={onChange}
        today={today}
        t={t}
        language={language}
      />
      <Reasons items={reasons('window')} t={t} />
      {/* The grain is not a control here and it is not hidden either: the mode
          decided it, and the sentence says which mode and what it decided. */}
      <Reasons items={reasons('grain')} t={t} />

      {/* R3 — the panel's one primary, and the ONLY thing that issues a
          request. §3.2: an illegal query disables it rather than failing after
          submit. */}
      <Button
        type="button"
        onClick={onRun}
        disabled={running || plan.violations.length > 0}
        className="w-full"
      >
        {t('rb.control.run')}
      </Button>
    </section>
  )
}

/* ─────────────────────────── the mode switcher ─────────────────────────── */

export interface ModeFieldProps {
  query: ReportQuery
  onChange: (mode: ReportMode) => void
  t: Translator
}

/**
 * **Five questions, all five always offered.**
 *
 * A mode is never illegal — its *configuration* is, and that reason belongs
 * beside the configuration control, not beside the mode. So this is a plain
 * picker and not a `LegalityOptions`: greying out `Funnel` because no rungs
 * have been chosen would hide the only control that can choose them.
 *
 * Each option carries one line saying what the question is, because *Retention*
 * and *Journeys* are not self-evident to an operator who has not used an
 * analytics tool before, and a mode switched into by mistake costs a `Run`.
 *
 * ## Why a strip and not a `Select`
 *
 * It **was** a `Select`, and a `Select` shows one of five: an operator who had
 * never opened it could not know that a funnel, a retention matrix or a journey
 * tree were on offer at all. That is the same failure this module refuses
 * everywhere else — *disabled in place, never hidden* — applied to the one
 * control that chooses which question is being asked.
 *
 * So it is the `role="group"` button row `LegalityOptions` already uses, with
 * the same `aria-pressed` selection, for the same reason: individually
 * focusable buttons keep every option one Tab away, and the selection is
 * *announced* rather than merely coloured (§7.5). `group` rather than
 * `radiogroup` because a radio group takes one tab stop and owns arrow-key
 * navigation, which is a second interaction model for a five-item strip.
 *
 * No icons: no icon set has been specified for these five, and inventing one
 * would be five design decisions taken in a component.
 */
export function ModeField({ query, onChange, t }: ModeFieldProps) {
  const mode = reportMode(query)
  const labelId = useId()
  return (
    <div className={`${CARD} w-72 shrink-0`}>
      <div className="flex flex-col gap-1.5">
        <Label id={labelId}>{t('rb.control.mode')}</Label>
        <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1">
          {REPORT_MODES.map((value) => {
            const selected = value === mode
            return (
              <Button
                key={value}
                type="button"
                size="xs"
                variant={selected ? 'secondary' : 'ghost'}
                aria-pressed={selected}
                onClick={() => onChange(value)}
              >
                {t(`rb.mode.${value}`)}
              </Button>
            )
          })}
        </div>
        {/* The hint stays under the strip and describes the SELECTED mode —
            five hints at once is a paragraph, not a switcher. */}
        <p className="text-xs text-muted-foreground">{t(`rb.mode.${mode}.hint`)}</p>
      </div>
    </div>
  )
}

/* ────────────────────────────── the funnel ─────────────────────────────── */

function FunnelFields({
  query,
  onChange,
  measures,
  dimensions,
  reasons,
  t,
}: {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  measures: readonly Measure[]
  dimensions: readonly Dimension[]
  reasons: QueryViolation[]
  t: Translator
}) {
  const spec = query.funnel ?? { steps: [], conversionWindowDays: null }
  const steps = spec.steps

  const setSteps = (next: FunnelStep[]) => onChange({ ...query, funnel: { ...spec, steps: next } })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rb-funnel-add">{t('rb.funnel.steps')}</Label>

        {steps.length === 0 ? (
          /* R8's second kind of empty, inside a control: the data exists and
             the question has not been asked. One grey sentence, no illustration. */
          <p className="text-xs text-muted-foreground">{t('rb.funnel.steps.unstarted')}</p>
        ) : (
          <ol className="flex list-none flex-col gap-3">
            {steps.map((step, index) => (
              <li key={`${step.measureKey}-${index}`} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {t('rb.funnel.step', { position: index + 1 })}
                  </span>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    aria-label={t('rb.funnel.step.remove', { position: index + 1 })}
                    onClick={() => setSteps(steps.filter((_, i) => i !== index))}
                  >
                    {t('rb.funnel.step.removeLabel')}
                  </Button>
                </div>

                <Select
                  value={step.measureKey}
                  onValueChange={(key) =>
                    setSteps(
                      steps.map((s, i) =>
                        /* Changing a rung's measure drops its filters: they were
                           fields of the old population and keeping them would
                           silently narrow the new one by a field it may not
                           even have (§3.4). */
                        i === index ? { measureKey: key, filters: [] } : s,
                      ),
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('rb.control.measure.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <MeasureItems measures={measures} t={t} />
                  </SelectContent>
                </Select>

                <StepFilters
                  step={step}
                  measure={measures.find((m) => m.key === step.measureKey) ?? null}
                  dimensions={dimensions}
                  onChange={(filters) =>
                    setSteps(steps.map((s, i) => (i === index ? { ...s, filters } : s)))
                  }
                  position={index + 1}
                  t={t}
                />
              </li>
            ))}
          </ol>
        )}

        <Button
          id="rb-funnel-add"
          type="button"
          variant="secondary"
          /* Disabled IN PLACE at the ceiling, with the reason under it — never
             a button that silently does nothing on the seventh click, which is
             what `ReportStudio:210` did (`if (events.length >= 6) return`). */
          disabled={steps.length >= MAX_FUNNEL_STEPS || measures.length === 0}
          onClick={() => {
            const used = new Set(steps.map((s) => s.measureKey))
            const next = measures.find((m) => !used.has(m.key)) ?? measures[0]
            if (next) setSteps([...steps, { measureKey: next.key, filters: [] }])
          }}
        >
          {t('rb.funnel.step.add')}
        </Button>
        {steps.length >= MAX_FUNNEL_STEPS && (
          <p className="text-xs text-muted-foreground">
            {t('rb.funnel.step.atMax', { max: MAX_FUNNEL_STEPS })}
          </p>
        )}
        <Reasons items={reasons} t={t} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rb-funnel-window">{t('rb.funnel.window')}</Label>
        <Select
          value={spec.conversionWindowDays === null ? NONE : String(spec.conversionWindowDays)}
          onValueChange={(value) =>
            onChange({
              ...query,
              funnel: {
                ...spec,
                conversionWindowDays: value === NONE ? null : Number(value),
              },
            })
          }
        >
          <SelectTrigger id="rb-funnel-window" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* `null` first, because it is the default and the only one that
                needs no business decision (`FunnelSpec`). */}
            <SelectItem value={NONE}>{t('rb.funnel.window.range')}</SelectItem>
            {[1, 7, 30, 90].map((days) => (
              <SelectItem key={days} value={String(days)}>
                {t('rb.funnel.window.days', { days })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t('rb.funnel.window.explain')}</p>
      </div>
    </div>
  )
}

/**
 * **A rung's own filters** — *joined anywhere, then took a Quick Ride*.
 *
 * The same `FilterSpec` vocabulary and the same `eq` the query-level filters
 * use. There is no second filter model (AC-814); what is different is the
 * scope, and that is the whole reason the field exists: a query-level filter
 * applies to every rung, and *requested in Riyadh then completed anywhere* is a
 * different funnel from *requested and completed in Riyadh*.
 */
function StepFilters({
  step,
  measure,
  dimensions,
  onChange,
  position,
  t,
}: {
  step: FunnelStep
  measure: Measure | null
  dimensions: readonly Dimension[]
  onChange: (filters: FilterSpec[]) => void
  position: number
  t: Translator
}) {
  const [field, setField] = useState('')
  const [value, setValue] = useState('')
  const fields = measure?.filterableFields ?? []
  const labelFor = (key: string) => t(dimensions.find((d) => d.key === key)?.labelKey ?? key)

  return (
    <div className="flex flex-col gap-1.5">
      {step.filters.length > 0 && (
        <ul className="flex list-none flex-wrap gap-1">
          {step.filters.map((filter) => (
            <li key={filter.field}>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                aria-label={t('rb.funnel.filter.remove', {
                  field: labelFor(filter.field),
                  position,
                })}
                onClick={() => onChange(step.filters.filter((f) => f.field !== filter.field))}
              >
                <bdi>{String(filter.value)}</bdi>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {fields.length === 0 ? (
        /* A refusal stated, not an empty menu (§10 rule of `copy.md`). */
        <p className="text-xs text-muted-foreground">{t('rb.control.filters.noneForMeasure')}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Select value={field} onValueChange={setField}>
            <SelectTrigger className="w-full" aria-label={t('rb.funnel.filter.field', { position })}>
              <SelectValue placeholder={t('rb.control.filters.field')} />
            </SelectTrigger>
            <SelectContent>
              {fields.map((key) => (
                <SelectItem key={key} value={key}>
                  {labelFor(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={value}
            aria-label={t('rb.funnel.filter.value', { position })}
            placeholder={t('rb.control.filters.value')}
            onChange={(event) => setValue(event.target.value)}
          />
          <Button
            type="button"
            size="xs"
            variant="secondary"
            disabled={field === '' || value.trim() === ''}
            onClick={() => {
              onChange([
                ...step.filters.filter((f) => f.field !== field),
                { field, op: 'eq', value: value.trim() },
              ])
              setValue('')
            }}
          >
            {t('rb.control.filters.apply')}
          </Button>
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────── the cohort ─────────────────────────────── */

function CohortFields({
  query,
  onChange,
  plan,
  measures,
  reasons,
  t,
}: {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  plan: QueryPlan
  measures: readonly Measure[]
  reasons: QueryViolation[]
  t: Translator
}) {
  const spec = query.cohort ?? {
    anchorMeasureKey: null,
    returnMeasureKey: null,
    cohortGrain: 'month' as CohortGrain,
    horizon: 3,
  }
  const set = (patch: Partial<typeof spec>) => onChange({ ...query, cohort: { ...spec, ...patch } })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rb-cohort-anchor">{t('rb.cohort.anchor')}</Label>
        <Select
          value={spec.anchorMeasureKey ?? ''}
          onValueChange={(key) => set({ anchorMeasureKey: key })}
        >
          <SelectTrigger id="rb-cohort-anchor" className="w-full">
            <SelectValue placeholder={t('rb.cohort.anchor.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <MeasureItems measures={measures} t={t} />
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t('rb.cohort.anchor.explain')}</p>
        <Reasons items={reasons} t={t} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rb-cohort-return">{t('rb.cohort.return')}</Label>
        <Select
          value={spec.returnMeasureKey ?? NONE}
          onValueChange={(key) => set({ returnMeasureKey: key === NONE ? null : key })}
        >
          <SelectTrigger id="rb-cohort-return" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* The default reads as a sentence, not as a blank: *still here*
                means the person did anything at all (`copy.md` rule 10). */}
            <SelectItem value={NONE}>{t('rb.cohort.return.own')}</SelectItem>
            <MeasureItems measures={measures} t={t} />
          </SelectContent>
        </Select>
      </div>

      {/* Day and week stay on screen, disabled, carrying the reason the engine
          gives — D9 CQ-3, and the one place an operator learns the rule. */}
      <LegalityOptions
        label={t('rb.cohort.grain')}
        options={plan.cohortGrains}
        value={spec.cohortGrain}
        onChange={(cohortGrain: CohortGrain) => set({ cohortGrain })}
        labelFor={(grain) => t(`rb.cohortGrain.${grain}`)}
        resolveParams={(params) => ({
          ...params,
          ...(params['grain'] !== undefined
            ? { grain: t(`rb.cohortGrain.${String(params['grain'])}`) }
            : {}),
        })}
        t={t}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rb-cohort-horizon">{t('rb.cohort.horizon')}</Label>
        <Select value={String(spec.horizon)} onValueChange={(v) => set({ horizon: Number(v) })}>
          <SelectTrigger id="rb-cohort-horizon" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* The picker's range IS the planner's range, read from the same
                constants — a control offering a horizon the run refuses is a
                control that lies about itself. */}
            {Array.from(
              { length: MAX_COHORT_HORIZON - MIN_COHORT_HORIZON + 1 },
              (_, i) => i + MIN_COHORT_HORIZON,
            ).map((horizon) => (
              <SelectItem key={horizon} value={String(horizon)}>
                {t('rb.cohort.horizon.value', { horizon })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t('rb.cohort.horizon.explain')}</p>
      </div>
    </div>
  )
}

/* ───────────────────────────── the journey ─────────────────────────────── */

function JourneyFields({
  query,
  onChange,
  measures,
  reasons,
  t,
}: {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  measures: readonly Measure[]
  reasons: QueryViolation[]
  t: Translator
}) {
  const spec = query.journey ?? { rootMeasureKey: null, depth: 2 }
  const set = (patch: Partial<typeof spec>) => onChange({ ...query, journey: { ...spec, ...patch } })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rb-journey-root">{t('rb.journey.root')}</Label>
        <Select
          value={spec.rootMeasureKey ?? ''}
          onValueChange={(key) => set({ rootMeasureKey: key })}
        >
          <SelectTrigger id="rb-journey-root" className="w-full">
            <SelectValue placeholder={t('rb.journey.root.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <MeasureItems measures={measures} t={t} />
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t('rb.journey.root.explain')}</p>
        <Reasons items={reasons} t={t} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rb-journey-depth">{t('rb.journey.depth')}</Label>
        <Select value={String(spec.depth)} onValueChange={(v) => set({ depth: Number(v) })}>
          <SelectTrigger id="rb-journey-depth" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from(
              { length: MAX_JOURNEY_DEPTH - MIN_JOURNEY_DEPTH + 1 },
              (_, i) => i + MIN_JOURNEY_DEPTH,
            ).map((depth) => (
              <SelectItem key={depth} value={String(depth)}>
                {t('rb.journey.depth.value', { depth })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t('rb.journey.depth.explain')}</p>
      </div>
    </div>
  )
}

/* ───────────────────────────── shared parts ────────────────────────────── */

/** The measure list, grouped by the metrics library's own six categories. */
function MeasureItems({ measures, t }: { measures: readonly Measure[]; t: Translator }) {
  const byCategory = new Map<string, Measure[]>()
  for (const measure of measures) {
    const held = byCategory.get(measure.category)
    if (held) held.push(measure)
    else byCategory.set(measure.category, [measure])
  }
  return (
    <>
      {[...byCategory.entries()].map(([category, rows]) => (
        <SelectGroup key={category}>
          <SelectLabel>{t(`rb.category.${category}`)}</SelectLabel>
          {rows.map((measure) => (
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
 * A violation, as the sentence it names — beside the control its `field` names.
 *
 * **The planner's `reasonParams` carry the machine's vocabulary** (`bar`,
 * `funnel`, `day`, and a measure's `labelKey`), because the data layer holds no
 * display string and must not. Interpolating them raw produces *"bar is fixed
 * by funnel"*, which is two identifiers wearing a sentence and is untranslatable
 * besides. The screen owns the labels, so the screen maps them.
 */
export function Reasons({ items, t }: { items: readonly QueryViolation[]; t: Translator }) {
  if (items.length === 0) return null
  return (
    <ul className="flex list-none flex-col gap-0.5">
      {items.map((violation) => (
        <li key={`${violation.code}-${violation.field}`} className="text-xs text-muted-foreground">
          {t(violation.reasonKey, resolveReasonParams(violation.reasonParams, t))}
        </li>
      ))}
    </ul>
  )
}

/** The enum-to-label map every reason sentence in this module goes through. */
export function resolveReasonParams(
  params: Record<string, string | number>,
  t: Translator,
): Record<string, string | number> {
  const out: Record<string, string | number> = { ...params }
  if (params['grain'] !== undefined) out['grain'] = t(`rb.grain.${String(params['grain'])}`)
  if (params['minGrain'] !== undefined) out['minGrain'] = t(`rb.grain.${String(params['minGrain'])}`)
  if (params['chart'] !== undefined) out['chart'] = t(`rb.chartType.${String(params['chart'])}`)
  if (params['mode'] !== undefined) out['mode'] = t(`rb.mode.${String(params['mode'])}`)
  /* A measure param is a `labelKey`, not a label — the catalogue carries keys. */
  if (params['measure'] !== undefined) out['measure'] = t(String(params['measure']))
  /* `key` is deliberately NOT resolved. `rb.violation.unknownMeasure` carries
     the key of a measure that does not exist — translating it would throw on
     the one sentence whose whole job is to name something unknown. */
  return out
}
