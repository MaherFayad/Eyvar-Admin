/**
 * The plan editor's **Calculations** view — result and working per line, no
 * identifier and no code face. FINANCIALS-UX-PLAN §11 carries the design and
 * the AC-397 argument; the short version is that the working is
 * `definition.expression` substituted, so the printed line and the evaluated
 * result are still one string (AC-397, AC-393).
 */

import { PLAN_EXAMPLE_INPUTS } from '@/data/types'
import { ABSENT, formatCount, formatPercent, type Language, type Translate } from '@/lib'
import { Card } from '@/components/ui/card'
import { FigureRow, type FigureOperator } from '@/screens/financials/shared/Figures'
import type { DerivedValue } from './derived'
import { DERIVED_PROPS, renderDerived, type PlanDerived, type PlanValues } from './planForm'

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

export function PlanCalculations({
  values,
  derived,
  commissionPercent,
  discountPercent,
  t,
  language,
}: {
  values: PlanValues
  derived: PlanDerived
  commissionPercent: number | null
  discountPercent: number | null
  t: Translate
  language: Language
}) {
  return (
    <div data-testid="plan-calculations" className="flex flex-col gap-4">
      {/* AC-399 / D-F4 — what the example assumes, before any of it. */}
      <Card className="gap-2">
        <div className="flex flex-col gap-1 px-(--card-spacing)">
          <h2 className="text-sm font-semibold text-foreground">
            {t('fin.planEditor.calc.assumptions')}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t('fin.planEditor.preview.column', {
              km: formatCount(PLAN_EXAMPLE_INPUTS.exampleKm, language),
              minutes: formatCount(PLAN_EXAMPLE_INPUTS.exampleMinutes, language),
              days:
                values.executeDays === null ? ABSENT : formatCount(values.executeDays, language),
            })}
          </p>
          <p className="text-xs text-muted-foreground">{t('fin.planEditor.preview.note.plan')}</p>
          {/* The two rates the chain reads, each as its own row: an
              interpolated percentage that ENDS a translated fragment is
              bidi-neutral at the line end and hops sides in Arabic, and a
              `FigureRow` value sits inside a `<bdi>` and cannot. */}
          <div className="pt-1">
            <FigureRow
              label={t('fin.planEditor.commissionPercent.label')}
              value={
                commissionPercent === null ? ABSENT : formatPercent(commissionPercent, language)
              }
            />
            <FigureRow
              label={t('fin.planEditor.discountPercent.label')}
              value={discountPercent === null ? ABSENT : formatPercent(discountPercent, language)}
            />
          </div>
        </div>
      </Card>

      {/* Two up, so each class's rows fill their own card rather than leaving
          the inline-end half of a full-width card empty, and the twelve lines
          read in one screen instead of two. `compact:` is the only narrower
          variant there is (§0.1); below it two cards would be ~370px and the
          label/amount pair stops being addable. */}
      <div className="grid grid-cols-2 gap-4 compact:grid-cols-1">
        <CalculationCard
          heading={t('fin.planEditor.preview.class.economy')}
          values={derived.economy}
          t={t}
          language={language}
        />
        <CalculationCard
          heading={t('fin.planEditor.preview.class.comfort')}
          values={derived.comfort}
          t={t}
          language={language}
        />
      </div>
    </div>
  )
}

/**
 * One vehicle class's chain. `aria-live` stays on the RESULT and not on the
 * working: the view recomputes on every keystroke, and announcing two lines per
 * step per class would make the editor unusable with a screen reader (§8.2).
 */
function CalculationCard({
  heading,
  values,
  t,
  language,
}: {
  heading: string
  values: DerivedValue[]
  t: Translate
  language: Language
}) {
  return (
    <Card className="gap-2">
      <div className="flex flex-col gap-1 px-(--card-spacing)">
        <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
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
                /* Indented past the 12px gutter and 12px gap so the working
                   starts under its own label. The paragraph is pinned because a
                   formula reads in operator order in either language, and each
                   operand is isolated because `20 min` becomes `20 دقيقة` and
                   would otherwise drag its number across the operator. */
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
