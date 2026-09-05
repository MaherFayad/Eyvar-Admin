/**
 * The plan editor's **Calculations** view: result and working per line, with
 * every number the chain reads as an input above it (FINANCIALS-UX-PLAN §11,
 * §11.8). The working is `definition.expression` substituted (AC-397). Trips
 * is the form's field; the rest are trial values that never reach `savePlan()`.
 */

import type { ReactNode } from 'react'
import type { Field } from '@/hooks'
import {
  formatMoney,
  parseMoneyInput,
  parseNumericInput,
  type Language,
  type Translate,
} from '@/lib'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FigureRow, type FigureOperator } from '@/screens/financials/shared/Figures'
import type { DerivedValue, PlanClass } from './derived'
import { NumberField, TrialField, type TrialRange } from './fields'
import { DERIVED_PROPS, renderDerived, type PlanDerived, type PlanTrial } from './planForm'

/**
 * What each line does to the running total (§H5). `null` reserves the gutter
 * and draws no sign. Keyed by definition id, so a new definition arrives with a
 * reserved gutter rather than inheriting somebody else's sign.
 */
const LINE_OPERATOR: Readonly<Record<string, FigureOperator | null>> = {
  driverSharePercent: null,
  grossPerTrip: null,
  discountedPerTrip: null,
  planTotal: 'equals',
  driverEarns: 'subtract',
  platformKeeps: 'equals',
}

/** The two lines a card is *about*: the subtotal, and what is left of it. */
const EMPHASISED: ReadonlySet<string> = new Set(['planTotal', 'platformKeeps'])

/** Spec §8.5 — a percentage is enforced to 0–100 in code. */
const PERCENT_RANGE: TrialRange = { min: 0, max: 100 }
const NON_NEGATIVE: TrialRange = { min: 0, max: null }

export function PlanCalculations({
  trial,
  trialKey,
  trialActive,
  onChangeTrial,
  onResetTrial,
  tripsField,
  onChangeTrips,
  derived,
  t,
  language,
}: {
  trial: PlanTrial
  /** Changes on reset, so every trial field remounts on the plan's numbers. */
  trialKey: number
  trialActive: boolean
  onChangeTrial: (patch: Partial<PlanTrial>) => void
  onResetTrial: () => void
  tripsField: Field<number | null>
  onChangeTrips: (value: number | null) => void
  derived: PlanDerived
  t: Translate
  language: Language
}) {
  const numberField = (
    id: string,
    key: keyof PlanTrial,
    label: string,
    range: TrialRange,
    message: string,
  ) => (
    <TrialField
      key={`${id}-${trialKey}`}
      id={id}
      label={label}
      initial={trial[key] === null ? '' : String(trial[key])}
      parse={parseNumericInput}
      range={range}
      message={message}
      onChange={(value) => onChangeTrial({ [key]: value })}
    />
  )
  /* A rate is typed in major units and held in halalas, like every money
     input (§8.3); the text starts as `formatMoney` prints the plan's rate. */
  const rateField = (id: string, key: keyof PlanTrial, label: string) => (
    <TrialField
      key={`${id}-${trialKey}`}
      id={id}
      label={label}
      initial={trial[key] === null ? '' : formatMoney(trial[key], { unit: 'none' })}
      parse={parseMoneyInput}
      range={NON_NEGATIVE}
      message={t('fin.planEditor.calc.nonNegative')}
      onChange={(value) => onChangeTrial({ [key]: value })}
    />
  )
  const nonNegative = t('fin.planEditor.calc.nonNegative')
  const percentRange = t('fin.planEditor.percent.range')

  return (
    <div data-testid="plan-calculations" className="flex flex-col gap-4">
      {/* AC-399 / D-F4 — what the example assumes, before any of it, and each
          assumption is the control that changes it (§11.8). */}
      <Card className="gap-3">
        <div className="flex flex-col gap-3 px-(--card-spacing)">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-foreground">
                {t('fin.planEditor.calc.assumptions')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('fin.planEditor.calc.trial.help')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('fin.planEditor.preview.note.plan')}
              </p>
            </div>
            {trialActive && (
              <Button onClick={onResetTrial}>
                {t('fin.planEditor.calc.trial.reset')}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-3 compact:grid-cols-2">
            {numberField(
              'plan-trial-km',
              'exampleKm',
              t('fin.planEditor.calc.distance.label'),
              NON_NEGATIVE,
              nonNegative,
            )}
            {numberField(
              'plan-trial-minutes',
              'exampleMinutes',
              t('fin.planEditor.calc.duration.label'),
              NON_NEGATIVE,
              nonNegative,
            )}
            {/* The same field as on Details: a trip count is catalogue data and
                is saved with the plan, so it is the form's, not a trial. */}
            <NumberField
              field={tripsField}
              label={t('fin.planEditor.executeDays.label')}
              onChange={onChangeTrips}
            />
            {numberField(
              'plan-trial-commission',
              'commissionPercent',
              t('fin.planEditor.commissionPercent.label'),
              PERCENT_RANGE,
              percentRange,
            )}
            {numberField(
              'plan-trial-discount',
              'discountPercent',
              t('fin.planEditor.discountPercent.label'),
              PERCENT_RANGE,
              percentRange,
            )}
          </div>
        </div>
      </Card>

      {/* Two up, so each class's rows fill their own card and the twelve lines
          read in one screen. Below `compact:` (§0.1) they stack, because two
          cards at ~370px stop being addable. */}
      <div className="grid grid-cols-2 gap-4 compact:grid-cols-1">
        <CalculationCard
          heading={t('fin.planEditor.preview.class.economy')}
          rates={
            <>
              {rateField(
                'plan-trial-economy-minute',
                'economyPerMinuteHalalas',
                t('fin.planEditor.calc.rate.minute'),
              )}
              {rateField(
                'plan-trial-economy-km',
                'economyPerKmHalalas',
                t('fin.planEditor.calc.rate.km'),
              )}
            </>
          }
          values={derived.economy}
          t={t}
          language={language}
        />
        <CalculationCard
          heading={t('fin.planEditor.preview.class.comfort')}
          rates={
            <>
              {rateField(
                'plan-trial-comfort-minute',
                'comfortPerMinuteHalalas',
                t('fin.planEditor.calc.rate.minute'),
              )}
              {rateField(
                'plan-trial-comfort-km',
                'comfortPerKmHalalas',
                t('fin.planEditor.calc.rate.km'),
              )}
            </>
          }
          values={derived.comfort}
          t={t}
          language={language}
        />
      </div>
    </div>
  )
}

/**
 * One vehicle class's chain, its two rates above the rows they feed. `aria-live`
 * stays on the result, not the working: the view recomputes on every keystroke
 * and two announcements per step would be unusable with a screen reader (§8.2).
 */
function CalculationCard({
  heading,
  rates,
  values,
  t,
  language,
}: {
  heading: string
  rates: ReactNode
  values: DerivedValue[]
  t: Translate
  language: Language
}) {
  return (
    <Card className="gap-3">
      <div className="flex flex-col gap-3 px-(--card-spacing)">
        <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
        <div className="grid grid-cols-2 gap-3">{rates}</div>
        <ul role="list" className="flex list-none flex-col">
          {values.map((value) => (
            <li key={value.id} className="flex flex-col">
              <FigureRow
                label={t(value.labelKey)}
                value={<span {...DERIVED_PROPS}>{renderDerived(value, language)}</span>}
                operator={LINE_OPERATOR[value.id] ?? null}
                emphasis={EMPHASISED.has(value.id)}
              />
              {value.substitutedParts !== null && (
                /* Indented past the gutter so the working starts under its own
                   label. Pinned LTR because a formula reads in operator order in
                   either language; each operand is isolated because `20 min`
                   becomes `20 دقيقة` and would drag its number across the
                   operator (§11.5). */
                <p
                  dir="ltr"
                  className="max-w-md ps-6 pb-1 text-start text-xs tabular-nums text-muted-foreground"
                >
                  {value.substitutedParts.map((part, at) =>
                    part.operand ? <bdi key={at}>{part.text}</bdi> : <span key={at}>{part.text}</span>,
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

export type { PlanClass }
