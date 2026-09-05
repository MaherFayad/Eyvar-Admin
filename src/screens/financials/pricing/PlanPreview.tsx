/**
 * The plan editor's end column — the plan **as a rider sees it**, drawn from
 * the same form state and the same `derivePlan` evaluation as the Details and
 * Calculations views, so it moves on the `input` event with them (AC-396).
 * FINANCIALS-UX-PLAN §11 carries the data contract.
 */

import {
  ABSENT,
  formatCount,
  isLanguage,
  isRtl,
  type Language,
  type Translate,
  type Translator,
} from '@/lib'
import { Button } from '@/components/ui/button'
import { ViewSwitcher } from '@/components/table/ViewSwitcher'
import {
  DERIVED_PROPS,
  derivedById,
  quotedClass,
  renderDerived,
  type PlanDerived,
  type PlanValues,
} from './planForm'

export interface PlanPreviewProps {
  values: PlanValues
  derived: PlanDerived
  /** The preview's own language, independent of the console's. */
  previewLanguage: Language
  onSelectLanguage: (language: Language) => void
  /** The console's translator — the toggle and the caption are operator chrome. */
  t: Translate
  /** A translator for a language that is not the active one (`useLanguage`). */
  translatorFor: (language: Language) => Translator
  /**
   * The live rate card's own answer. `null` means we could not read it, and the
   * caption then states nothing about VAT rather than asserting it.
   */
  vatIncluded: boolean | null
}

export function PlanPreview({
  values,
  derived,
  previewLanguage,
  onSelectLanguage,
  t,
  translatorFor,
  vatIncluded,
}: PlanPreviewProps) {
  const tp = translatorFor(previewLanguage)
  const chain = derived[quotedClass(values)]
  const planTotal = derivedById(chain, 'planTotal')
  const perTrip = derivedById(chain, 'discountedPerTrip')
  const name = (previewLanguage === 'ar' ? values.nameAr : values.nameEn).trim()
  const features = values.features
    .map((feature) => (previewLanguage === 'ar' ? feature.ar : feature.en).trim())
    .filter((line) => line !== '')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span id="plan-preview-language" className="text-xs font-medium text-muted-foreground">
          {t('fin.planEditor.preview.language.label')}
        </span>
        {/* The same stadium the data column's tabs use (D12) — a segmented
            control, not a second primary. */}
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

      {/* The frame carries `dir` and `lang` itself, so the rider's reading order
          and the Arabic face are the preview's and never the console's (§9.7).
          A bordered rounded rectangle at a phone's proportion — no image, and
          every value on it is a token away from the console's own surfaces. */}
      <div
        dir={isRtl(previewLanguage) ? 'rtl' : 'ltr'}
        lang={previewLanguage}
        data-testid="plan-preview-frame"
        className="mx-auto w-full max-w-64 rounded-3xl border border-border bg-muted/40 p-2"
      >
        <div className="flex min-h-140 flex-col gap-3 rounded-2xl border border-border bg-card p-3">
          <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-border" />

          <div className="flex flex-col gap-0.5">
            <span className="text-2xs uppercase tracking-wider text-muted-foreground">
              {tp('fin.planEditor.rider.plan')}
            </span>
            <span className="text-base font-semibold text-foreground">
              {name === '' ? tp('fin.planEditor.rider.unnamed') : name}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span
              {...DERIVED_PROPS}
              className="text-kpi font-semibold tabular-nums text-foreground"
            >
              <bdi>{planTotal === null ? ABSENT : renderDerived(planTotal, previewLanguage)}</bdi>
            </span>
            <span className="text-xs text-muted-foreground">
              <bdi>{perTrip === null ? ABSENT : renderDerived(perTrip, previewLanguage)}</bdi>{' '}
              {tp('fin.planEditor.rider.perTrip')}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <PreviewChip
              label={
                values.durationDays === null
                  ? ''
                  : tp('fin.planEditor.rider.duration', {
                      days: formatCount(values.durationDays, previewLanguage),
                    })
              }
            />
            <PreviewChip
              label={
                values.executeDays === null
                  ? ''
                  : tp('fin.planEditor.rider.trips', {
                      count: formatCount(values.executeDays, previewLanguage),
                    })
              }
            />
          </div>

          {features.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-2xs uppercase tracking-wider text-muted-foreground">
                {tp('fin.planEditor.rider.included')}
              </span>
              <ul role="list" className="flex list-none flex-col gap-1">
                {features.map((line, index) => (
                  <li key={index} className="flex gap-1.5 text-xs text-foreground">
                    <span aria-hidden="true" className="text-muted-foreground">
                      ·
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(values.economyActive || values.comfortActive) && (
            <div className="flex flex-col gap-1">
              <span className="text-2xs uppercase tracking-wider text-muted-foreground">
                {tp('fin.planEditor.rider.classes')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {values.economyActive && (
                  <PreviewChip label={tp('fin.planEditor.preview.class.economy')} />
                )}
                {values.comfortActive && (
                  <PreviewChip label={tp('fin.planEditor.preview.class.comfort')} />
                )}
              </div>
            </div>
          )}

          <div className="flex-1" />
          {/* The app's own primary, and it is DISABLED — nothing on this page
              subscribes anyone, so it competes with `Save` for nothing (rule 6,
              R2). It is a real control so the preview shows the app's geometry
              rather than a picture of it. */}
          <Button variant="default" size="lg" className="w-full" disabled>
            {tp('fin.planEditor.rider.subscribe')}
          </Button>
        </div>
      </div>

      {/* The VAT sentence is the rate card's claim, not this screen's: printed
          only where `vatIncluded` is true, and silent where the data is unread
          or says otherwise. */}
      <p className="text-center text-xs text-muted-foreground">
        {vatIncluded === true
          ? t('fin.planEditor.preview.caption.vat')
          : t('fin.planEditor.preview.caption')}
      </p>
    </div>
  )
}

function PreviewChip({ label }: { label: string }) {
  if (label === '') return null
  return (
    <span className="rounded-full border border-border-control px-2 py-0.5 text-2xs text-muted-foreground">
      {label}
    </span>
  )
}
