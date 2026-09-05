/**
 * The quick-ride editor's **Calculations** view (FINANCIALS-UX-PLAN §12): the
 * example trip, surge and commission as trial inputs, then the class's three
 * rates above the working they feed. Surge is in, because the quick-ride fare
 * carries it (spec §8.5). The working is `definition.expression` substituted
 * (AC-397); a blank or out-of-range input renders the em dash (AC-393).
 */

import type { Field } from '@/hooks'
import { formatCount, parseNumericInput, type Language, type Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FigureRow, type FigureOperator } from '@/screens/financials/shared/Figures'
import type { DerivedValue } from './derived'
import { MoneyField, TrialField, type TrialRange } from './fields'
import { DERIVED_PROPS, renderDerived } from './planForm'
import type { QuickRideTrial, QuickRideValues } from './quickRideForm'

const LINE_OPERATOR: Readonly<Record<string, FigureOperator | null>> = {
  driverSharePercent: null,
  baseFare: null,
  surgedFare: 'equals',
  driverEarns: 'subtract',
  platformKeeps: 'equals',
}

const EMPHASISED: ReadonlySet<string> = new Set(['surgedFare', 'platformKeeps'])

const PERCENT_RANGE: TrialRange = { min: 0, max: 100 }
const NON_NEGATIVE: TrialRange = { min: 0, max: null }
/** A multiplier below 1 is a discount, which surge is not; the cap is the card's. */
const MULTIPLIER_RANGE: TrialRange = { min: 1, max: null }

export function QuickRideCalculations({
  trial,
  trialKey,
  trialActive,
  onChangeTrial,
  onResetTrial,
  surgeCap,
  field,
  setValue,
  chain,
  t,
  language,
}: {
  trial: QuickRideTrial
  trialKey: string
  trialActive: boolean
  onChangeTrial: (patch: Partial<QuickRideTrial>) => void
  onResetTrial: () => void
  /** The live rate card's highest city cap, or `null` when the card could not be read. */
  surgeCap: number | null
  field: <K extends keyof QuickRideValues & string>(name: K) => Field<QuickRideValues[K]>
  setValue: <K extends keyof QuickRideValues & string>(name: K, next: QuickRideValues[K]) => void
  chain: DerivedValue[]
  t: Translate
  language: Language
}) {
  const trialField = (
    id: string,
    key: keyof QuickRideTrial,
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
  const nonNegative = t('fin.planEditor.calc.nonNegative')

  return (
    <div data-testid="quick-calculations" className="flex flex-col gap-4">
      <Card className="gap-3">
        <div className="flex flex-col gap-3 px-(--card-spacing)">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-foreground">
                {t('fin.planEditor.calc.assumptions')}
              </h2>
              <p className="text-xs text-muted-foreground">{t('fin.quickEditor.calc.trial.help')}</p>
              <p className="text-xs text-muted-foreground">
                {surgeCap === null
                  ? t('fin.quickEditor.calc.surge.note')
                  : t('fin.quickEditor.calc.surge.note.cap', {
                      cap: formatCount(surgeCap, language),
                    })}
              </p>
            </div>
            {trialActive && (
              <Button onClick={onResetTrial}>{t('fin.quickEditor.calc.trial.reset')}</Button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3 compact:grid-cols-2">
            {trialField(
              'quick-trial-km',
              'exampleKm',
              t('fin.planEditor.calc.distance.label'),
              NON_NEGATIVE,
              nonNegative,
            )}
            {trialField(
              'quick-trial-minutes',
              'exampleMinutes',
              t('fin.planEditor.calc.duration.label'),
              NON_NEGATIVE,
              nonNegative,
            )}
            {trialField(
              'quick-trial-surge',
              'surgeMultiplier',
              t('fin.quickEditor.calc.surge.label'),
              MULTIPLIER_RANGE,
              t('fin.quickEditor.calc.surge.range'),
            )}
            {trialField(
              'quick-trial-commission',
              'commissionPercent',
              t('fin.planEditor.commissionPercent.label'),
              PERCENT_RANGE,
              t('fin.planEditor.percent.range'),
            )}
          </div>
        </div>
      </Card>

      {/* The class's own rates, above the working. These are the form's fields
          (§12): a change here is a change to the record, and Save arms. */}
      <Card className="gap-3">
        <div className="flex flex-col gap-3 px-(--card-spacing)">
          <h3 className="text-sm font-semibold text-foreground">
            {t('fin.quickEditor.calc.heading')}
          </h3>
          <div className="grid grid-cols-3 gap-3 compact:grid-cols-1">
            <MoneyField
              field={field('baseFareHalalas')}
              label={t('fin.quickEditor.base.label')}
              onChange={(value) => setValue('baseFareHalalas', value)}
            />
            <MoneyField
              field={field('perKmHalalas')}
              label={t('fin.quickEditor.perKm.label')}
              onChange={(value) => setValue('perKmHalalas', value)}
            />
            <MoneyField
              field={field('perMinHalalas')}
              label={t('fin.quickEditor.perMin.label')}
              onChange={(value) => setValue('perMinHalalas', value)}
            />
          </div>
          <ul role="list" className="flex list-none flex-col">
            {chain.map((value) => (
              <li key={value.id} className="flex flex-col">
                <FigureRow
                  label={t(value.labelKey)}
                  value={<span {...DERIVED_PROPS}>{renderDerived(value, language)}</span>}
                  operator={LINE_OPERATOR[value.id] ?? null}
                  emphasis={EMPHASISED.has(value.id)}
                />
                {value.substitutedParts !== null && (
                  /* Pinned LTR with each operand isolated, as the plan's
                     working is (§11.5). */
                  <p
                    dir="ltr"
                    className="max-w-md ps-6 pb-1 text-start text-xs tabular-nums text-muted-foreground"
                  >
                    {value.substitutedParts.map((part, at) =>
                      part.operand ? (
                        <bdi key={at}>{part.text}</bdi>
                      ) : (
                        <span key={at}>{part.text}</span>
                      ),
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  )
}
