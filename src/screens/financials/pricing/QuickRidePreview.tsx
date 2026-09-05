/**
 * The quick-ride editor's end column — the class **as a rider sees it** on the
 * booking sheet, drawn from form state and the same chain the Calculations
 * view reads (FINANCIALS-UX-PLAN §12, AC-396). The frame carries its own
 * language, like the plan preview (§11.4).
 */

import {
  ABSENT,
  formatCount,
  formatDecimal,
  formatMoney,
  isLanguage,
  isRtl,
  type Language,
  type Translate,
  type Translator,
} from '@/lib'
import { Button } from '@/components/ui/button'
import { ViewSwitcher } from '@/components/table/ViewSwitcher'
import type { DerivedValue } from './derived'
import { DERIVED_PROPS, derivedById, renderDerived } from './planForm'
import type { QuickRideTrial, QuickRideValues } from './quickRideForm'

export function QuickRidePreview({
  values,
  chain,
  trial,
  trialActive,
  previewLanguage,
  onSelectLanguage,
  t,
  translatorFor,
}: {
  values: QuickRideValues
  chain: DerivedValue[]
  trial: QuickRideTrial
  trialActive: boolean
  previewLanguage: Language
  onSelectLanguage: (language: Language) => void
  t: Translate
  translatorFor: (language: Language) => Translator
}) {
  const tp = translatorFor(previewLanguage)
  const fare = derivedById(chain, 'surgedFare')
  const name = (previewLanguage === 'ar' ? values.nameAr : values.name).trim()
  const surge = trial.surgeMultiplier !== null && trial.surgeMultiplier > 1
  const rate = (halalas: number | null) =>
    halalas === null ? ABSENT : formatMoney(halalas, { unit: 'none' })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {t('fin.planEditor.preview.language.label')}
        </span>
        <ViewSwitcher
          tabs={[
            { id: 'en', label: t('fin.planEditor.preview.language.en') },
            { id: 'ar', label: t('fin.planEditor.preview.language.ar') },
          ]}
          activeTab={previewLanguage}
          onSelectTab={(id) => {
            if (isLanguage(id)) onSelectLanguage(id)
          }}
        />
      </div>

      <div
        dir={isRtl(previewLanguage) ? 'rtl' : 'ltr'}
        lang={previewLanguage}
        data-testid="quick-preview-frame"
        className="mx-auto w-full max-w-64 rounded-3xl border border-border bg-muted/40 p-2"
      >
        <div className="flex min-h-140 flex-col gap-3 rounded-2xl border border-border bg-card p-3">
          <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-border" />

          <div className="flex flex-col gap-0.5">
            <span className="text-2xs uppercase tracking-wider text-muted-foreground">
              {tp('fin.quickEditor.rider.book')}
            </span>
            <span className="text-base font-semibold text-foreground">
              {name === '' ? tp('fin.quickEditor.rider.unnamed') : name}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-2xs uppercase tracking-wider text-muted-foreground">
              {tp('fin.quickEditor.rider.estimate')}
            </span>
            <span {...DERIVED_PROPS} className="text-kpi font-semibold tabular-nums text-foreground">
              <bdi>{fare === null ? ABSENT : renderDerived(fare, previewLanguage)}</bdi>
            </span>
            <span className="text-xs text-muted-foreground">
              {tp('fin.quickEditor.rider.trip', {
                km: trial.exampleKm === null ? ABSENT : formatCount(trial.exampleKm, previewLanguage),
                minutes:
                  trial.exampleMinutes === null
                    ? ABSENT
                    : formatCount(trial.exampleMinutes, previewLanguage),
              })}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {surge && trial.surgeMultiplier !== null && (
              <PreviewChip
                label={tp('fin.quickEditor.rider.surge', {
                  value: formatDecimal(trial.surgeMultiplier, 1, previewLanguage),
                })}
              />
            )}
            {!values.active && <PreviewChip label={tp('fin.quickEditor.rider.withdrawn')} />}
          </div>

          <p className="text-xs text-muted-foreground">
            {tp('fin.quickEditor.rider.rates', {
              base: rate(values.baseFareHalalas),
              km: rate(values.perKmHalalas),
              min: rate(values.perMinHalalas),
            })}
          </p>

          <div className="flex-1" />
          {/* The app's own primary, DISABLED: nothing here books a ride, so it
              competes with `Save` for nothing (rule 6). */}
          <Button variant="default" size="lg" className="w-full" disabled>
            {tp('fin.quickEditor.rider.button')}
          </Button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t('fin.quickEditor.preview.caption')}
      </p>
      {trialActive && (
        <p className="text-center text-xs text-muted-foreground">
          {t('fin.planEditor.preview.caption.trial')}
        </p>
      )}
    </div>
  )
}

function PreviewChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border-control px-2 py-0.5 text-2xs text-muted-foreground">
      {label}
    </span>
  )
}
