/**
 * The plan editor — the one full-bleed screen in the product. Spec §5 row 6,
 * §8, `DESIGN.md` §8.2, **AC-390–401**.
 *
 * ## The hardest thing in this wave to get right, and it is visual
 *
 * §8.2 exists because a **derived value** and a **disabled input** were
 * confusable, and this form puts them **adjacent**: `Commission %` is a
 * disabled input (editable once Q7 lands) and `Captain share` beside it is
 * derived (never editable, because it has no input of its own). **AC-392** is
 * the criterion and the treatments are deliberately different in three ways:
 *
 * | | disabled input | derived value |
 * |---|---|---|
 * | box | a bordered field, reduced contrast | **no border, no fill** |
 * | focus | focusable, in the tab order | **not focusable, absent from tab order** |
 * | semantics | `disabled` | `aria-readonly` + a polite live region |
 *
 * **AC-391** is the second half of that: a derived value has no `tabIndex`, not
 * even `-1`, because `tabIndex={-1}` is still focusable by script and by click.
 *
 * ## One definition, printed and evaluated
 *
 * The formula panel renders `PLAN_PRICING_DEFINITIONS` and the preview strip
 * evaluates the **same `expression` strings** (`derived.ts`). So **AC-397** —
 * *"each line's expression matches its definition character for character"* —
 * holds by construction: there is no second copy to drift from. Legacy has two
 * artefacts that agree today, which is worse than disagreeing.
 *
 * ## The blank-input defect, closed
 *
 * One coercion serves the preview and the save (`parseNumericInput`, blank →
 * `null`), so the preview and the saved record cannot disagree about a blank
 * field (**AC-395**'s mechanism). A `null` propagates through the chain and
 * every dependent value renders an em dash (**AC-393**), and `Save` is blocked
 * with the error **on the cleared input** — never on a derived value, which has
 * no input of its own and cannot be invalid (**AC-394**, §8.6).
 *
 * ## What Stage A can and cannot exercise
 *
 * Q7 is open, so the pricing half is disabled. That makes **AC-395**, **AC-398**
 * and **AC-400** unreachable *through the discount field* — an operator cannot
 * clear a disabled input. The mechanism is built and live for every editable
 * formula input (`Trips in the plan`), and the percentage validation runs
 * whatever the source of the value; the day Q7 lands, the criteria become
 * reachable with no change here. Recorded in the handoff rather than claimed.
 */

import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getPlan, savePlan } from '@/data/clients'
import { PLAN_EXAMPLE_INPUTS, PLAN_PRICING_DEFINITIONS } from '@/data/types'
import type { PlanFeature, PlanKey, SubscriptionPlan } from '@/data/types'
import { useAsync, useForm, type Field } from '@/hooks'
import { ABSENT, formatCount, formatMoney, formatPercent, parseNumericInput } from '@/lib'
import { Banner } from '@/components/Banner'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { FullBleedEditorShell } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
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
import { useShell } from '@/shell/ShellContext'
import { derivePlan, type DerivedValue, type PlanClass } from './derived'

/**
 * The character limit on a plan's display copy — **AC-448**.
 *
 * **It is the server's number, not a new one.** `savePlan()` refuses a feature
 * line over this length and returns `code: 'maxLength'`, and `PlanFeature`'s
 * own type comment records the rule against the legacy line it came from. It is
 * stated here once so the count, the message and the block that raises it all
 * read the same figure — a limit typed into three strings is a limit that
 * disagrees with itself the first time it moves.
 *
 * **Enforced on a feature, advisory on a name.** The server validates feature
 * lines and validates neither name, so the name fields count against this and
 * never block a save: a client-only refusal would reject a save the API would
 * have accepted, which is a worse defect than a long name. Raised for
 * product-owner — if a plan name has a real limit it belongs beside the feature
 * rule in the data layer, and this becomes enforced the same day.
 */
const PLAN_TEXT_MAX_CHARS = 60

/* ─────────────────────────── the form's values ─────────────────────────── */

/**
 * **The catalogue half only.** The pricing half is absent from this type for
 * the same reason it is absent from `SavePlanInput`: Stage A's boundary is
 * enforced at the seam, not by a `disabled` attribute a screen could forget.
 *
 * Numbers are `number | null` because **blank is `null`** — not `0`, which is a
 * real duration, and not the previously stored value, which is a lie.
 */
interface PlanValues {
  nameEn: string
  nameAr: string
  durationDays: number | null
  executeDays: number | null
  cancelCap: number | null
  sortOrder: number | null
  status: SubscriptionPlan['status']
  features: PlanFeature[]
  economyActive: boolean
  comfortActive: boolean
}

interface PlanDerived {
  economy: DerivedValue[]
  comfort: DerivedValue[]
}

export function PlanEditorScreen() {
  const shell = useShell()
  const { t, dir, language } = shell.language
  const navigate = useNavigate()
  const { planId = '' } = useParams<{ planId: string }>()

  const plan = useAsync<SubscriptionPlan>((signal) => getPlan(planId as PlanKey, signal), {
    /* `planId` is the fetcher's only input, so one plan cannot be edited under
       another plan's id. */
    deps: [planId],
    cacheKey: 'pricing.plan',
  })

  const exit = useCallback(() => navigate('/financials/pricing'), [navigate])

  if (plan.status === 'loading') {
    return (
      <FullBleedEditorShell
        title={planId}
        onExit={exit}
        onSave={() => undefined}
        canSave={false}
        t={t}
        dir={dir}
      >
        <LoadingSkeleton pattern="P3" />
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
    <PlanEditorForm plan={plan.data} onExit={exit} t={t} dir={dir} language={language} />
  )
}

function PlanEditorForm({
  plan,
  onExit,
  t,
  dir,
  language,
}: {
  plan: SubscriptionPlan
  onExit: () => void
  t: ReturnType<typeof useShell>['language']['t']
  dir: ReturnType<typeof useShell>['language']['dir']
  language: ReturnType<typeof useShell>['language']['language']
}) {
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
     * **The single source, evaluated.** The panel below renders the same
     * definitions this reads, so a definition change moves both.
     *
     * The pricing half comes from the plan record because Stage A does not edit
     * it; the moment Q7 lands it comes from `values` and nothing else here
     * changes.
     */
    derive: (values) =>
      derivePlan({
        commissionPercent: plan.commissionPercent,
        discountPercent: plan.discountPercent,
        executeDays: values.executeDays,
        economyPerMinuteHalalas: plan.economyPerMinuteHalalas,
        economyPerKmHalalas: plan.economyPerKmHalalas,
        comfortPerMinuteHalalas: plan.comfortPerMinuteHalalas,
        comfortPerKmHalalas: plan.comfortPerKmHalalas,
      }),

    /**
     * **§8.6, in code and not in an HTML attribute.** `fp3-comm` carries
     * `max="100"` with no clamp and `fp3-disc` carries no maximum at all
     * (`:1102`), so a discount above 100 % produces a negative plan total that
     * renders in the preview and saves cleanly.
     *
     * **AC-394 / §8.6** — the message goes on the INPUT. Never on a derived
     * value: a derived value has no input of its own and cannot be invalid, and
     * `FormErrors` is keyed by editable field, so writing one there does not
     * compile.
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
         `features.2` path the form cannot key. `FormErrors` has one slot per
         editable field, so the first offence is the message; the row that
         caused it is the one whose count has gone over. */
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
      /* G9 — a completed mutation is `success`, never a bare `toast()`.
         A bare call renders the iconless neutral toast, which is the
         `info` register, for something that succeeded. */
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
        <StatusBadge tone={plan.status === 'active' ? 'success' : plan.status === 'draft' ? 'info' : 'neutral'}>
          {t(`fin.pricing.plan.status.${plan.status}`)}
        </StatusBadge>
      }
      onExit={onExit}
      onSave={submit}
      canSave={form.canSave}
      t={t}
      dir={dir}
    >
      <div className="flex flex-col gap-4">
        {banner && <Banner banner={banner} />}

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
                 order in BOTH document directions, because the content is
                 Arabic whichever language the console is in.

                 **The direction word is not spelled here on purpose.** A
                 hyphenated side-word in prose is a valid Tailwind candidate and
                 has shipped a physical CSS rule out of a doc comment three
                 times in this repo — once out of a comment written to warn
                 about it. Describe the utility; never spell it. */
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
              {/* **AC-401** — every one of these is read by the save handler.
                  `features` was round-tripped through `savePlan` with no control
                  at all: an operator could not change a line an Arabic rider
                  reads on the subscription card, and the two written copy keys
                  for the count and the length were unreachable (**AC-448**).

                  **AC-400 / §8.6** — the message lands on the field. The form
                  keys errors by editable field, so all feature lines share one
                  message; the row that caused it is the one whose count has
                  gone past its maximum, which is why the count renders on every
                  row rather than only on the offending one. */}
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
                         document direction. The side word is not spelled in
                         this comment — see the note on the name field. */
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
            <p className="text-xs text-muted-foreground">
              {t('fin.planEditor.pricing.disabled')}
            </p>

            {/* **AC-392's near half.** These are DISABLED INPUTS: a bordered
                field at reduced contrast, focusable, in the tab order, and
                carrying `disabled`. The derived values below carry none of
                those, and the two sit in the same form on purpose. */}
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

        {/* ── the worked example — DERIVED VALUES ────────────────────── */}
        <Card className="gap-3">
          <div className="flex flex-col gap-3 px-(--card-spacing)">
            <h2 className="text-sm font-semibold text-foreground">
              {t('fin.planEditor.preview.heading')}
            </h2>
            {/* **AC-399** — the column header states its literal inputs, and the
                note states that surge is excluded, because a plan leg is
                structurally excluded from surge (D-F4). */}
            <p className="text-xs text-muted-foreground">
              {t('fin.planEditor.preview.column', {
                km: String(PLAN_EXAMPLE_INPUTS.exampleKm),
                minutes: String(PLAN_EXAMPLE_INPUTS.exampleMinutes),
                days:
                  form.values.executeDays === null
                    ? ABSENT
                    : formatCount(form.values.executeDays, language),
              })}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <PreviewColumn
                heading={t('fin.planEditor.preview.class.economy')}
                values={form.derived.economy}
                t={t}
                language={language}
              />
              <PreviewColumn
                heading={t('fin.planEditor.preview.class.comfort')}
                values={form.derived.comfort}
                t={t}
                language={language}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {t('fin.planEditor.preview.note.plan')}
            </p>
          </div>
        </Card>

        {/* ── the formula panel — rendered FROM the definitions ──────── */}
        <Card className="gap-2">
          <div className="flex flex-col gap-1 px-(--card-spacing)">
            <h2 className="text-sm font-semibold text-foreground">
              {t('fin.planEditor.formula.heading')}
            </h2>
            {/* **AC-397** — the line count equals the definition count, and each
                line's expression IS its definition's, character for character.
                There is no second copy anywhere, in code or in markup. */}
            <ul role="list" className="flex list-none flex-col gap-1">
              {PLAN_PRICING_DEFINITIONS.map((definition) => (
                <li key={definition.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                  <span className="text-muted-foreground">{t(definition.labelKey)}</span>
                  <code className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-foreground">
                    <bdi>{definition.expression}</bdi>
                  </code>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </FullBleedEditorShell>
  )
}

/* ───────────────────────────── the field types ─────────────────────────── */

/**
 * **AC-448** — a text field, with the character count on the same line as its
 * help or its error.
 *
 * **One paragraph, two spans, not two paragraphs.** The line beneath a field is
 * one description: `aria-describedby` points at this element's id, so splitting
 * it would either lose the count from the description or need a second id on
 * every field in the editor. The help sits at the reading start and the count
 * trails it at the other edge, both mirroring with the document.
 *
 * The count is **localised** — both numbers pass through `formatCount`, so an
 * Arabic console renders Arabic-Indic digits. That is the half of AC-448 the
 * criterion is actually about; a count that always renders Latin digits beside
 * an Arabic field would satisfy a presence check and fail the criterion.
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
 * One half of one feature line — **AC-448**'s counted control.
 *
 * Not a `TextField`: a feature line is an element of an array and has no `Field`
 * of its own, because `useForm` keys by editable field and `features` is one
 * key. It carries the same anatomy — label, control, one description line with
 * the count trailing — so the two read as one field type on screen even though
 * only one of them is form-managed.
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
 * The numeric field, and the **one** coercion (§8.2.5).
 *
 * The raw string is held in the form's own value as a number or `null`; a blank
 * field is `null`, which flows into the derived chain and renders an em dash.
 * There is no second function with a different blank-field answer, which is the
 * whole of `gv()` versus `numval()`.
 */
function NumberField({
  field,
  label,
  onChange,
}: {
  field: Field<number | null>
  label: string
  onChange: (value: number | null) => void
}) {
  const id = field.controlProps.id
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...field.controlProps}
        inputMode="numeric"
        value={field.value === null ? '' : String(field.value)}
        /* **AC-396** — dependents update on the `input` event, with no flash,
           no colour transition and no count-up. A controlled value is what
           makes that true rather than a debounce nobody can see. */
        onChange={(event) => onChange(parseNumericInput(event.target.value))}
        onBlur={field.onBlur}
      />
      <p id={field.errorId} className="text-xs text-muted-foreground">
        {field.error ?? ''}
      </p>
    </div>
  )
}

/**
 * §4.6's **disabled** treatment — a bordered field at reduced contrast,
 * focusable and in the tab order, carrying `disabled` and a stated reason.
 *
 * **AC-392** turns on this being visibly a different thing from the derived
 * values in the card below. It is a real `input`, because it will become one.
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

/* ───────────────────────── the derived-value column ────────────────────── */

/**
 * **AC-391** — no border, no fill, not focusable, absent from the tab order,
 * `aria-readonly` and a polite live region. There is no `tabIndex` here, not
 * even `-1`.
 *
 * **AC-393** — a value with no computable result renders an em dash. Never
 * `0.00 SAR`, never blank, never a stale number.
 */
function PreviewColumn({
  heading,
  values,
  t,
  language,
}: {
  heading: string
  values: DerivedValue[]
  t: ReturnType<typeof useShell>['language']['t']
  language: ReturnType<typeof useShell>['language']['language']
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-medium text-muted-foreground">{heading}</h3>
      <dl className="flex flex-col gap-1">
        {values.map((value) => (
          <div key={value.id} className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-muted-foreground">{t(value.labelKey)}</dt>
            <dd
              aria-readonly
              aria-live="polite"
              className="text-sm font-medium tabular-nums text-foreground"
            >
              <bdi>{renderDerived(value, language)}</bdi>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function renderDerived(
  value: DerivedValue,
  language: ReturnType<typeof useShell>['language']['language'],
): string {
  if (value.value === null || !Number.isFinite(value.value)) return ABSENT
  if (value.unit === 'percent') return formatPercent(value.value, language)
  /* Halalas: the chain carries full precision until `driverEarns` rounds, so a
     mid-chain value can be fractional. `formatMoney` refuses a non-integer on
     purpose — money is never a float — so the display rounds at the boundary
     and the ARITHMETIC does not. */
  return formatMoney(Math.round(value.value))
}

export type { PlanClass }
