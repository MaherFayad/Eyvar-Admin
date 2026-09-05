/**
 * The plan editor — the one full-bleed screen. Spec §5 row 6, §8, `DESIGN.md`
 * §8.2, **AC-390–401**, FINANCIALS-UX-PLAN §11, which carries the two-column
 * design, the tab and the AC-397 argument.
 */

/**
 * §8.2's distinction, which this form puts side by side: a **disabled input**
 * is a bordered field at reduced contrast, focusable and in the tab order; a
 * **derived value** has no box, no `tabIndex` at all (**AC-391** — `-1` is
 * still focusable by script) and carries `DERIVED_PROPS`. **AC-392** is that
 * the two never read as the same thing.
 */

/**
 * One coercion serves the preview and the save (`parseNumericInput`, blank →
 * `null`), so they cannot disagree about a blank field (**AC-395**). A `null`
 * propagates and every dependent renders an em dash (**AC-393**); `Save` is
 * blocked with the error on the cleared INPUT, never on a derived value
 * (**AC-394**, §8.6). Q7 keeps the pricing half disabled, so AC-398 and AC-400
 * stay unreachable through the discount field.
 */

import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getLiveRateCard, getPlan, savePlan } from '@/data/clients'
import type { PlanKey, RateCard, SubscriptionPlan } from '@/data/types'
import { useAsync, useForm, type Field } from '@/hooks'
import { formatCount, formatMoney, formatPercent, type Language } from '@/lib'
import { Banner } from '@/components/Banner'
import { ErrorState } from '@/components/ErrorState'
import { FullBleedEditorShell } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ViewSwitcher } from '@/components/table/ViewSwitcher'
import { useShell } from '@/shell/ShellContext'
import { derivePlan, type PlanClass } from './derived'
import { NumberField } from './fields'
import { PlanCalculations } from './PlanCalculations'
import { PlanPreview } from './PlanPreview'
import {
  isTrialActive,
  trialFromPlan,
  type PlanDerived,
  type PlanTrial,
  type PlanValues,
} from './planForm'

/**
 * The character limit on a plan's display copy — **AC-448**. It is the server's
 * number: `savePlan()` refuses a longer feature line with `code: 'maxLength'`.
 * Enforced on a feature, advisory on a name, because the server validates the
 * first and neither validates nor refuses the second.
 */
const PLAN_TEXT_MAX_CHARS = 60

type EditorTab = 'details' | 'calculations'

const EDITOR_TABS: readonly EditorTab[] = ['details', 'calculations']
const DEFAULT_TAB: EditorTab = 'details'

/**
 * Which view of the record is open, in `?tab=`. The default view carries no
 * parameter, so the editor's own address is the plain one — the same rule
 * `?view=` follows on the index screens (AC-389).
 */
function useEditorTab(): { tab: EditorTab; selectTab: (id: string) => void } {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab = EDITOR_TABS.find((each) => each === raw) ?? DEFAULT_TAB

  const selectTab = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params)
      if (id === DEFAULT_TAB) next.delete('tab')
      else next.set('tab', id)
      setParams(next)
    },
    [params, setParams],
  )

  return { tab, selectTab }
}

export function PlanEditorScreen() {
  const shell = useShell()
  const { t, dir, language, translatorFor } = shell.language
  const navigate = useNavigate()
  const { planId = '' } = useParams<{ planId: string }>()

  const plan = useAsync<SubscriptionPlan>((signal) => getPlan(planId as PlanKey, signal), {
    /* `planId` is the fetcher's only input, so one plan cannot be edited under
       another plan's id. */
    deps: [planId],
    cacheKey: 'pricing.plan',
  })

  /* The rider preview states whether prices include VAT, and that is the RATE
     CARD's claim rather than this screen's. Read separately so a rate card that
     cannot be read costs the sentence and not the editor. */
  const rateCard = useAsync<RateCard>((signal) => getLiveRateCard(signal), {
    cacheKey: 'pricing.rateCards',
  })
  const vatIncluded = rateCard.status === 'content' ? (rateCard.data?.vatIncluded ?? null) : null

  const exit = useCallback(() => navigate('/financials/pricing'), [navigate])

  if (plan.status === 'loading') {
    return (
      <FullBleedEditorShell
        title={planId}
        onExit={exit}
        onSave={() => undefined}
        canSave={false}
        aside={<PreviewSkeleton />}
        t={t}
        dir={dir}
      >
        <FormSkeleton />
      </FullBleedEditorShell>
    )
  }

  if (plan.status === 'error' || plan.data === null) {
    return (
      <FullBleedEditorShell
        title={planId}
        onExit={exit}
        onSave={() => undefined}
        canSave={false}
        t={t}
        dir={dir}
      >
        <ErrorState
          scope="page"
          message={t('fin.error.read')}
          action={{ label: t('fin.error.retry'), onClick: plan.refetch }}
        />
      </FullBleedEditorShell>
    )
  }

  return (
    <PlanEditorForm
      plan={plan.data}
      onExit={exit}
      t={t}
      dir={dir}
      language={language}
      translatorFor={translatorFor}
      vatIncluded={vatIncluded}
    />
  )
}

function PlanEditorForm({
  plan,
  onExit,
  t,
  dir,
  language,
  translatorFor,
  vatIncluded,
}: {
  plan: SubscriptionPlan
  onExit: () => void
  t: ReturnType<typeof useShell>['language']['t']
  dir: ReturnType<typeof useShell>['language']['dir']
  language: Language
  translatorFor: ReturnType<typeof useShell>['language']['translatorFor']
  vatIncluded: boolean | null
}) {
  const { tab, selectTab } = useEditorTab()
  /* The preview's language is the PREVIEW's, not the console's, and it starts
     where the console is so an Arabic operator opens on the screen they read. */
  const [previewLanguage, setPreviewLanguage] = useState<Language>(language)

  /* §11.8 — the numbers the Calculations view can change. Not form state: a
     trial never dirties the form and never reaches `savePlan()`, so Q7's
     pricing boundary holds at the seam. `trialKey` remounts the fields on
     reset so their text adopts the plan's numbers. */
  const [trial, setTrial] = useState<PlanTrial>(() => trialFromPlan(plan))
  const [trialKey, setTrialKey] = useState(0)
  const trialActive = isTrialActive(trial, plan)
  const changeTrial = useCallback(
    (patch: Partial<PlanTrial>) => setTrial((current) => ({ ...current, ...patch })),
    [],
  )
  const resetTrial = useCallback(() => {
    setTrial(trialFromPlan(plan))
    setTrialKey((key) => key + 1)
  }, [plan])

  /**
   * How one substituted operand is written for a reader. `20` becomes `20 min`
   * because the expression it came from reads `exampleMinutes`; a rate stays a
   * bare number because the label above it already says what it is.
   */
  const renderOperand = useCallback(
    (name: string, formatted: string): string => {
      if (name === 'exampleMinutes') return t('fin.planEditor.calc.unit.minutes', { value: formatted })
      if (name === 'exampleKm') return t('fin.planEditor.calc.unit.km', { value: formatted })
      if (name === 'executeDays') return t('fin.planEditor.calc.unit.trips', { value: formatted })
      return formatted
    },
    [t],
  )

  const form = useForm<PlanValues, PlanDerived>({
    initialValues: {
      nameEn: plan.nameEn,
      nameAr: plan.nameAr,
      durationDays: plan.durationDays,
      executeDays: plan.executeDays,
      cancelCap: plan.cancelCap,
      sortOrder: plan.sortOrder,
      status: plan.status,
      features: plan.features.map((feature) => ({ ...feature })),
      economyActive: plan.economyActive,
      comfortActive: plan.comfortActive,
    },

    /**
     * **The single source, evaluated.** The Calculations view prints the same
     * definitions this reads and the preview quotes their results, so a
     * definition change moves all three.
     */
    derive: useCallback(
      (values: PlanValues) =>
        derivePlan({ ...trial, executeDays: values.executeDays }, renderOperand),
      [trial, renderOperand],
    ),

    /**
     * **AC-394 / §8.6** — the message goes on the INPUT. A derived value has no
     * input of its own and cannot be invalid, and `FormErrors` is keyed by
     * editable field, so writing one there does not compile.
     */
    validate: (values) => {
      const errors: Partial<Record<keyof PlanValues, string>> = {}
      if (!values.nameEn.trim()) errors.nameEn = t('fin.planEditor.name.required')
      if (!values.nameAr.trim()) errors.nameAr = t('fin.planEditor.name.required')
      for (const field of ['durationDays', 'executeDays', 'cancelCap', 'sortOrder'] as const) {
        if (values[field] === null) errors[field] = t('fin.planEditor.number.required')
      }
      /* **The same two rules `savePlan()` enforces**, checked here so the
         refusal is on the field at render rather than arriving as a 422 with a
         `features.2` path the form cannot key. */
      for (const feature of values.features) {
        if (!feature.en.trim() || !feature.ar.trim()) {
          errors.features = t('fin.planEditor.feature.required')
          break
        }
        if (feature.en.length > PLAN_TEXT_MAX_CHARS || feature.ar.length > PLAN_TEXT_MAX_CHARS) {
          errors.features = t('fin.planEditor.feature.tooLong', {
            max: formatCount(PLAN_TEXT_MAX_CHARS, language),
          })
          break
        }
      }
      return errors
    },

    onSubmit: async (values) => {
      /* **AC-401** — every editable control is read by the save handler,
         including `status`, which `savePlan()` reads from nothing today (§8.6).
         The nulls cannot arrive here: `validate` blocks the save. */
      await savePlan(plan.id, {
        nameEn: values.nameEn.trim(),
        nameAr: values.nameAr.trim(),
        durationDays: values.durationDays ?? 0,
        executeDays: values.executeDays ?? 0,
        cancelCap: values.cancelCap ?? 0,
        sortOrder: values.sortOrder ?? 0,
        status: values.status,
        features: values.features,
        economyActive: values.economyActive,
        comfortActive: values.comfortActive,
      })
      /* G9 — a completed mutation is `success`, never a bare `toast()`. */
      toast.success(t('fin.planEditor.toast.saved'))
    },
  })

  const submit = useCallback(() => void form.submit(), [form])

  /* §10.4 / **AC-400** — one page-level critical banner naming what to fix,
     beside the message on each input. One banner, never two (R10). */
  const banner = useMemo(() => {
    if (form.failure === null) return null
    if (form.failure.kind === 'validation') {
      const count = form.failure.issues.length
      return {
        id: 'fin.planEditor.invalid',
        tone: 'critical' as const,
        title:
          count === 1
            ? t('fin.planEditor.banner.invalid.title')
            : t('fin.planEditor.banner.invalid.titleMany', {
                count: formatCount(count, language),
              }),
        body: t('fin.planEditor.banner.invalid.body'),
      }
    }
    return {
      id: 'fin.planEditor.rejected',
      tone: 'critical' as const,
      title: t('fin.planEditor.banner.rejected.title'),
      body: t('fin.planEditor.banner.rejected.body'),
    }
  }, [form.failure, t, language])

  return (
    <FullBleedEditorShell
      title={form.values.nameEn || plan.id}
      badge={
        <StatusBadge
          tone={
            plan.status === 'active' ? 'success' : plan.status === 'draft' ? 'info' : 'neutral'
          }
        >
          {t(`fin.pricing.plan.status.${plan.status}`)}
        </StatusBadge>
      }
      onExit={onExit}
      onSave={submit}
      canSave={form.canSave}
      aside={
        /* §2.5's inspector, and the answer to "show me what I am editing":
           what the edit in progress does, shown while it is being made. */
        <PlanPreview
          values={form.values}
          derived={form.derived}
          previewLanguage={previewLanguage}
          onSelectLanguage={setPreviewLanguage}
          t={t}
          translatorFor={translatorFor}
          vatIncluded={vatIncluded}
          trialActive={trialActive}
        />
      }
      t={t}
      dir={dir}
    >
      <div className="flex flex-col gap-4">
        {banner && <Banner banner={banner} />}

        <ViewSwitcher
          tabs={[
            { id: 'details', label: t('fin.planEditor.tab.details') },
            { id: 'calculations', label: t('fin.planEditor.tab.calculations') },
          ]}
          activeTab={tab}
          onSelectTab={selectTab}
        />

        {tab === 'details' ? (
          <PlanDetails
            form={form}
            plan={plan}
            t={t}
            language={language}
          />
        ) : (
          <PlanCalculations
            trial={trial}
            trialKey={trialKey}
            trialActive={trialActive}
            onChangeTrial={changeTrial}
            onResetTrial={resetTrial}
            tripsField={form.field('executeDays')}
            onChangeTrips={(value) => form.setValue('executeDays', value)}
            derived={form.derived}
            t={t}
            language={language}
          />
        )}
      </div>
    </FullBleedEditorShell>
  )
}

/* ────────────────────────────── the Details view ────────────────────────── */

function PlanDetails({
  form,
  plan,
  t,
  language,
}: {
  form: ReturnType<typeof useForm<PlanValues, PlanDerived>>
  plan: SubscriptionPlan
  t: ReturnType<typeof useShell>['language']['t']
  language: Language
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* ── the catalogue half — editable ──────────────────────────── */}
      <Card className="gap-3">
        <div className="flex flex-col gap-3 px-(--card-spacing)">
          <h2 className="text-sm font-semibold text-foreground">
            {t('fin.planEditor.section.catalogue')}
          </h2>

          <TextField
            field={form.field('nameEn')}
            label={t('fin.planEditor.nameEn.label')}
            onChange={(value) => form.setValue('nameEn', value)}
          />
          <TextField
            field={form.field('nameAr')}
            label={t('fin.planEditor.nameAr.label')}
            help={t('fin.planEditor.nameAr.help')}
            onChange={(value) => form.setValue('nameAr', value)}
            /* **AC-448** — the Arabic name field renders in Arabic reading
               order in BOTH document directions, because the content is Arabic
               whichever language the console is in. The direction word is not
               spelled in prose here: a hyphenated side-word is a valid Tailwind
               candidate and has shipped a physical CSS rule out of a comment. */
            dir="rtl"
            count={t('fin.planEditor.name.count', {
              count: formatCount(form.values.nameAr.length, language),
              max: formatCount(PLAN_TEXT_MAX_CHARS, language),
            })}
          />

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              field={form.field('durationDays')}
              label={t('fin.planEditor.durationDays.label')}
              onChange={(value) => form.setValue('durationDays', value)}
            />
            <NumberField
              field={form.field('executeDays')}
              label={t('fin.planEditor.executeDays.label')}
              onChange={(value) => form.setValue('executeDays', value)}
            />
            <NumberField
              field={form.field('cancelCap')}
              label={t('fin.planEditor.cancelCap.label')}
              onChange={(value) => form.setValue('cancelCap', value)}
            />
            <NumberField
              field={form.field('sortOrder')}
              label={t('fin.planEditor.sortOrder.label')}
              onChange={(value) => form.setValue('sortOrder', value)}
            />
          </div>

          {/* §8.6 — the status select at `:1105` is read by nothing in
              `savePlan()`, so an operator can change it, see it change, save,
              and lose it. It is wired (**AC-401**). */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="plan-status">{t('fin.planEditor.status.label')}</Label>
            <Select
              value={form.values.status}
              onValueChange={(value) =>
                form.setValue('status', value as SubscriptionPlan['status'])
              }
            >
              <SelectTrigger id="plan-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['draft', 'active', 'archived'] as const).map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`fin.pricing.plan.status.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-4">
            <SwitchField
              id="plan-economy"
              label={t('fin.planEditor.economyActive.label')}
              checked={form.values.economyActive}
              onChange={(value) => form.setValue('economyActive', value)}
            />
            <SwitchField
              id="plan-comfort"
              label={t('fin.planEditor.comfortActive.label')}
              checked={form.values.comfortActive}
              onChange={(value) => form.setValue('comfortActive', value)}
            />
          </div>
        </div>
      </Card>

      {/* ── the feature points — the counted fields §8.6 names ─────── */}
      {form.values.features.length > 0 && (
        <Card className="gap-3">
          <div className="flex flex-col gap-3 px-(--card-spacing)">
            <h2 className="text-sm font-semibold text-foreground">
              {t('fin.planEditor.section.features')}
            </h2>
            {/* **AC-400 / §8.6** — the message lands on the field. The form keys
                errors by editable field, so all feature lines share one message;
                the row that caused it is the one whose count has gone past its
                maximum, which is why the count renders on every row. */}
            {form.values.features.map((feature, index) => (
              <div key={index} className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('fin.planEditor.feature.label', {
                    index: formatCount(index + 1, language),
                  })}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <FeatureField
                    id={`plan-feature-${index}-en`}
                    label={t('fin.planEditor.feature.en')}
                    value={feature.en}
                    count={t('fin.planEditor.feature.count', {
                      count: formatCount(feature.en.length, language),
                      max: formatCount(PLAN_TEXT_MAX_CHARS, language),
                    })}
                    invalid={feature.en.length > PLAN_TEXT_MAX_CHARS}
                    onChange={(value) =>
                      form.setValue(
                        'features',
                        form.values.features.map((each, at) =>
                          at === index ? { ...each, en: value } : each,
                        ),
                      )
                    }
                  />
                  <FeatureField
                    id={`plan-feature-${index}-ar`}
                    label={t('fin.planEditor.feature.ar')}
                    value={feature.ar}
                    count={t('fin.planEditor.feature.count', {
                      count: formatCount(feature.ar.length, language),
                      max: formatCount(PLAN_TEXT_MAX_CHARS, language),
                    })}
                    invalid={feature.ar.length > PLAN_TEXT_MAX_CHARS}
                    /* The same reading-order decision as the Arabic name, and
                       for the same reason: the content is Arabic in either
                       document direction. */
                    dir="rtl"
                    onChange={(value) =>
                      form.setValue(
                        'features',
                        form.values.features.map((each, at) =>
                          at === index ? { ...each, ar: value } : each,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))}
            {form.errors.features !== undefined && (
              <p className="text-xs text-destructive">{form.errors.features}</p>
            )}
          </div>
        </Card>
      )}

      {/* ── the pricing half — §4.6's DISABLED treatment ───────────── */}
      <Card className="gap-3">
        <div className="flex flex-col gap-3 px-(--card-spacing)">
          <h2 className="text-sm font-semibold text-foreground">
            {t('fin.planEditor.section.pricing')}
          </h2>
          <p className="text-xs text-muted-foreground">{t('fin.planEditor.pricing.disabled')}</p>

          {/* **AC-392's near half.** These are DISABLED INPUTS: a bordered field
              at reduced contrast, focusable, in the tab order, and carrying
              `disabled`. The derived values in the Calculations view carry none
              of those, and the contrast is the point. */}
          <div className="grid grid-cols-2 gap-3">
            <DisabledField
              id="plan-commission"
              label={t('fin.planEditor.commissionPercent.label')}
              value={formatPercent(plan.commissionPercent, language)}
            />
            <DisabledField
              id="plan-discount"
              label={t('fin.planEditor.discountPercent.label')}
              value={formatPercent(plan.discountPercent, language)}
            />
            <DisabledField
              id="plan-economy-minute"
              label={t('fin.planEditor.economyPerMinute.label')}
              value={formatMoney(plan.economyPerMinuteHalalas)}
            />
            <DisabledField
              id="plan-economy-km"
              label={t('fin.planEditor.economyPerKm.label')}
              value={formatMoney(plan.economyPerKmHalalas)}
            />
            <DisabledField
              id="plan-comfort-minute"
              label={t('fin.planEditor.comfortPerMinute.label')}
              value={formatMoney(plan.comfortPerMinuteHalalas)}
            />
            <DisabledField
              id="plan-comfort-km"
              label={t('fin.planEditor.comfortPerKm.label')}
              value={formatMoney(plan.comfortPerKmHalalas)}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ─────────────────────────────── the four states ────────────────────────── */

/** The data column's loading shape: the tab row, then three cards of fields. */
function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-control w-48 rounded-full" />
      {[0, 1].map((card) => (
        <div key={card} className="rounded-xl border border-border bg-card p-3">
          <Skeleton className="mb-3 h-3.5 w-24" />
          {[0, 1, 2, 3].map((field) => (
            <div key={field} className="mb-3 flex flex-col gap-1 last:mb-0">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-control w-full rounded-lg" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** The end column's loading shape: the toggle, then the phone. */
function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-control w-20 self-end rounded-full" />
      <Skeleton className="mx-auto min-h-140 w-full max-w-64 rounded-3xl" />
    </div>
  )
}

/* ───────────────────────────── the field types ─────────────────────────── */

/**
 * **AC-448** — a text field, with the character count on the same line as its
 * help or its error. One paragraph, two spans: `aria-describedby` points at one
 * id, so splitting it would lose the count from the description. The count is
 * localised, which is the half of AC-448 the criterion is about.
 */
function TextField({
  field,
  label,
  help,
  count,
  onChange,
  dir,
}: {
  field: Field<string>
  label: string
  help?: string
  /** Already formatted and translated. Absent means this field is not counted. */
  count?: string
  onChange: (value: string) => void
  dir?: 'rtl'
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={field.controlProps.id}>{label}</Label>
      <Input
        {...field.controlProps}
        dir={dir}
        value={field.value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={field.onBlur}
      />
      <p
        id={field.errorId}
        className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground"
      >
        <span>{field.error ?? help ?? ''}</span>
        {count !== undefined && <span className="tabular-nums">{count}</span>}
      </p>
    </div>
  )
}

/**
 * One half of one feature line — **AC-448**'s counted control. Not a
 * `TextField`: a feature line is an element of an array and has no `Field` of
 * its own, because `useForm` keys by editable field and `features` is one key.
 */
function FeatureField({
  id,
  label,
  value,
  count,
  invalid,
  dir,
  onChange,
}: {
  id: string
  label: string
  value: string
  count: string
  invalid: boolean
  dir?: 'rtl'
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        dir={dir}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-count`}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={`${id}-count`} className="text-end text-xs text-muted-foreground tabular-nums">
        {count}
      </p>
    </div>
  )
}

/**
 * §4.6's **disabled** treatment — a bordered field at reduced contrast,
 * focusable and in the tab order, carrying `disabled`. **AC-392** turns on this
 * being visibly a different thing from a derived value.
 */
function DisabledField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} disabled readOnly aria-describedby={`${id}-reason`} />
    </div>
  )
}

function SwitchField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  )
}

export type { PlanClass }
