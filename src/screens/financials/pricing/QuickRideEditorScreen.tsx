/**
 * The quick-ride class editor, in the plan editor's shape (FINANCIALS-UX-PLAN
 * §12): Details / Calculations in `?tab=`, the booking sheet as a rider sees
 * it, and a blank form at `/quick-rides/new`. The three rates are the record's
 * own and are saved (spec §4.3, `manage_plans`); trip, surge and commission
 * are trial numbers that never reach the save (§11.8).
 */

import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  createQuickRideType,
  getLiveRateCard,
  getQuickRideType,
  saveQuickRideType,
} from '@/data/clients'
import type { QuickRideType, RateCard } from '@/data/types'
import { useAsync, useForm, type Field } from '@/hooks'
import { invalidate } from '@/hooks/requestCache'
import { formatCount, type Language } from '@/lib'
import { Banner } from '@/components/Banner'
import { ErrorState } from '@/components/ErrorState'
import { FullBleedEditorShell } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ViewSwitcher } from '@/components/table/ViewSwitcher'
import { useShell } from '@/shell/ShellContext'
import { deriveQuickRide } from './derived'
import { MoneyField } from './fields'
import { QuickRideCalculations } from './QuickRideCalculations'
import { QuickRidePreview } from './QuickRidePreview'
import {
  isQuickTrialActive,
  trialFromRateCard,
  valuesFromType,
  type QuickRideDerived,
  type QuickRideTrial,
  type QuickRideValues,
} from './quickRideForm'

type EditorTab = 'details' | 'calculations'
const EDITOR_TABS: readonly EditorTab[] = ['details', 'calculations']
const DEFAULT_TAB: EditorTab = 'details'
const LIST_PATH = '/financials/pricing?view=quick-rides'

/** `?tab=`, the default carrying no parameter — the plan editor's rule (§11.2). */
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

export function QuickRideEditorScreen() {
  const shell = useShell()
  const { t, dir, language, translatorFor } = shell.language
  const navigate = useNavigate()
  const { typeId } = useParams<{ typeId: string }>()
  const creating = typeId === undefined

  const type = useAsync<QuickRideType | null>(
    (signal) => (typeId === undefined ? Promise.resolve(null) : getQuickRideType(typeId, signal)),
    { deps: [typeId], cacheKey: 'pricing.quickRide' },
  )
  /* The commission the fare splits at and the surge cap are the rate card's;
     read separately so a card that cannot be read costs the defaults, not the
     editor. */
  const rateCard = useAsync<RateCard>((signal) => getLiveRateCard(signal), {
    cacheKey: 'pricing.rateCards',
  })
  const card = rateCard.status === 'content' ? rateCard.data : null

  const exit = useCallback(() => navigate(LIST_PATH), [navigate])

  if (type.status === 'loading') {
    return (
      <FullBleedEditorShell
        title={typeId ?? t('fin.quickEditor.create.title')}
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

  if (type.status === 'error' || (!creating && type.data === null)) {
    return (
      <FullBleedEditorShell
        title={typeId ?? ''}
        onExit={exit}
        onSave={() => undefined}
        canSave={false}
        t={t}
        dir={dir}
      >
        <ErrorState
          scope="page"
          message={t('fin.error.read')}
          action={{ label: t('fin.error.retry'), onClick: type.refetch }}
        />
      </FullBleedEditorShell>
    )
  }

  return (
    <QuickRideForm
      type={type.data ?? null}
      card={card}
      onExit={exit}
      t={t}
      dir={dir}
      language={language}
      translatorFor={translatorFor}
    />
  )
}

function QuickRideForm({
  type,
  card,
  onExit,
  t,
  dir,
  language,
  translatorFor,
}: {
  /** `null` is the create form. */
  type: QuickRideType | null
  card: RateCard | null
  onExit: () => void
  t: ReturnType<typeof useShell>['language']['t']
  dir: ReturnType<typeof useShell>['language']['dir']
  language: Language
  translatorFor: ReturnType<typeof useShell>['language']['translatorFor']
}) {
  const { tab, selectTab } = useEditorTab()
  const [previewLanguage, setPreviewLanguage] = useState<Language>(language)

  /* The trial follows the rate card until the operator touches it: `null`
     means "the card's numbers", so a card that lands late is still honoured. */
  const cardCommission = card?.commission.onDemandPercent ?? null
  const surgeCap = card === null ? null : Math.max(...Object.values(card.surge.capByCity))
  const baseTrial = useMemo(() => trialFromRateCard(cardCommission), [cardCommission])
  const [trialEdits, setTrialEdits] = useState<QuickRideTrial | null>(null)
  const [resetCount, setResetCount] = useState(0)
  const trial = trialEdits ?? baseTrial
  const trialActive = isQuickTrialActive(trial, baseTrial)
  const trialKey = `${resetCount}-${cardCommission ?? 'none'}`
  const changeTrial = useCallback(
    (patch: Partial<QuickRideTrial>) => setTrialEdits({ ...trial, ...patch }),
    [trial],
  )
  const resetTrial = useCallback(() => {
    setTrialEdits(null)
    setResetCount((count) => count + 1)
  }, [])

  const renderOperand = useCallback(
    (name: string, formatted: string): string => {
      if (name === 'exampleMinutes') return t('fin.planEditor.calc.unit.minutes', { value: formatted })
      if (name === 'exampleKm') return t('fin.planEditor.calc.unit.km', { value: formatted })
      return formatted
    },
    [t],
  )

  const form = useForm<QuickRideValues, QuickRideDerived>({
    initialValues: valuesFromType(type),
    derive: useCallback(
      (values: QuickRideValues): QuickRideDerived => ({
        chain: deriveQuickRide(
          {
            baseFareHalalas: values.baseFareHalalas,
            perKmHalalas: values.perKmHalalas,
            perMinHalalas: values.perMinHalalas,
            surgeMultiplier: trial.surgeMultiplier,
            commissionPercent: trial.commissionPercent,
            exampleMinutes: trial.exampleMinutes,
            exampleKm: trial.exampleKm,
          },
          renderOperand,
        ),
      }),
      [trial, renderOperand],
    ),
    validate: (values) => {
      const errors: Partial<Record<keyof QuickRideValues, string>> = {}
      if (!values.name.trim()) errors.name = t('fin.planEditor.name.required')
      if (!values.nameAr.trim()) errors.nameAr = t('fin.planEditor.name.required')
      for (const rate of ['baseFareHalalas', 'perKmHalalas', 'perMinHalalas'] as const) {
        const value = values[rate]
        if (value === null) errors[rate] = t('fin.planEditor.number.required')
        else if (value < 0) errors[rate] = t('fin.planEditor.calc.nonNegative')
      }
      return errors
    },
    onSubmit: async (values) => {
      const input = {
        name: values.name.trim(),
        nameAr: values.nameAr.trim(),
        baseFareHalalas: values.baseFareHalalas ?? 0,
        perKmHalalas: values.perKmHalalas ?? 0,
        perMinHalalas: values.perMinHalalas ?? 0,
        active: values.active,
      }
      if (type === null) {
        await createQuickRideType(input)
        invalidate('pricing.quickRide')
        toast.success(t('fin.quickEditor.toast.created'))
        onExit()
        return
      }
      await saveQuickRideType(type.id, input)
      invalidate('pricing.quickRide')
      toast.success(t('fin.quickEditor.toast.saved'))
    },
  })

  const submit = useCallback(() => void form.submit(), [form])

  const banner = useMemo(() => {
    if (form.failure === null) return null
    if (form.failure.kind === 'validation') {
      const count = form.failure.issues.length
      return {
        id: 'fin.quickEditor.invalid',
        tone: 'critical' as const,
        title:
          count === 1
            ? t('fin.planEditor.banner.invalid.title')
            : t('fin.planEditor.banner.invalid.titleMany', { count: formatCount(count, language) }),
        body: t('fin.planEditor.banner.invalid.body'),
      }
    }
    return {
      id: 'fin.quickEditor.rejected',
      tone: 'critical' as const,
      title: t('fin.quickEditor.banner.rejected.title'),
      body: t('fin.planEditor.banner.rejected.body'),
    }
  }, [form.failure, t, language])

  return (
    <FullBleedEditorShell
      title={type === null ? t('fin.quickEditor.create.title') : form.values.name || type.id}
      badge={
        type === null ? undefined : (
          <StatusBadge tone={type.active ? 'success' : 'neutral'}>
            {type.active ? t('fin.pricing.quick.yes') : t('fin.pricing.quick.no')}
          </StatusBadge>
        )
      }
      onExit={onExit}
      onSave={submit}
      canSave={form.canSave}
      aside={
        <QuickRidePreview
          values={form.values}
          chain={form.derived.chain}
          trial={trial}
          trialActive={trialActive}
          previewLanguage={previewLanguage}
          onSelectLanguage={setPreviewLanguage}
          t={t}
          translatorFor={translatorFor}
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
          <div className="flex flex-col gap-4">
            <Card className="gap-3">
              <div className="flex flex-col gap-3 px-(--card-spacing)">
                <h2 className="text-sm font-semibold text-foreground">
                  {t('fin.quickEditor.section.class')}
                </h2>
                <TextField
                  id={form.field('name').controlProps.id}
                  field={form.field('name')}
                  label={t('fin.planEditor.nameEn.label')}
                  onChange={(value) => form.setValue('name', value)}
                />
                <TextField
                  id={form.field('nameAr').controlProps.id}
                  field={form.field('nameAr')}
                  label={t('fin.planEditor.nameAr.label')}
                  help={t('fin.planEditor.nameAr.help')}
                  dir="rtl"
                  onChange={(value) => form.setValue('nameAr', value)}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    id="quick-active"
                    checked={form.values.active}
                    onCheckedChange={(value) => form.setValue('active', value)}
                  />
                  <Label htmlFor="quick-active">{t('fin.quickEditor.active.label')}</Label>
                </div>
              </div>
            </Card>

            <Card className="gap-3">
              <div className="flex flex-col gap-3 px-(--card-spacing)">
                <h2 className="text-sm font-semibold text-foreground">
                  {t('fin.quickEditor.section.rates')}
                </h2>
                <p className="text-xs text-muted-foreground">{t('fin.quickEditor.rates.help')}</p>
                <div className="grid grid-cols-3 gap-3 compact:grid-cols-1">
                  <MoneyField
                    field={form.field('baseFareHalalas')}
                    label={t('fin.quickEditor.base.label')}
                    onChange={(value) => form.setValue('baseFareHalalas', value)}
                  />
                  <MoneyField
                    field={form.field('perKmHalalas')}
                    label={t('fin.quickEditor.perKm.label')}
                    onChange={(value) => form.setValue('perKmHalalas', value)}
                  />
                  <MoneyField
                    field={form.field('perMinHalalas')}
                    label={t('fin.quickEditor.perMin.label')}
                    onChange={(value) => form.setValue('perMinHalalas', value)}
                  />
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <QuickRideCalculations
            trial={trial}
            trialKey={trialKey}
            trialActive={trialActive}
            onChangeTrial={changeTrial}
            onResetTrial={resetTrial}
            surgeCap={surgeCap}
            field={form.field}
            setValue={form.setValue}
            chain={form.derived.chain}
            t={t}
            language={language}
          />
        )}
      </div>
    </FullBleedEditorShell>
  )
}

function TextField({
  id,
  field,
  label,
  help,
  dir,
  onChange,
}: {
  id: string
  field: Field<string>
  label: string
  help?: string
  dir?: 'rtl'
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...field.controlProps}
        dir={dir}
        value={String(field.value)}
        onChange={(event) => onChange(event.target.value)}
        onBlur={field.onBlur}
      />
      <p id={field.errorId} className="text-xs text-muted-foreground">
        {field.error ?? help ?? ''}
      </p>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-control w-48 rounded-full" />
      {[0, 1].map((card) => (
        <div key={card} className="rounded-xl border border-border bg-card p-3">
          <Skeleton className="mb-3 h-3.5 w-24" />
          {[0, 1, 2].map((field) => (
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

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-control w-20 self-end rounded-full" />
      <Skeleton className="mx-auto min-h-140 w-full max-w-64 rounded-3xl" />
    </div>
  )
}
