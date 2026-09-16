/**
 * The formula field (AC-1104 … AC-1107, AC-1155). `dir="ltr"` always — a
 * formula is code, not prose. No red (R5a): the error is a sentence plus
 * `aria-invalid`, overriding `Input`'s shared red border at this one site.
 * Legality comes from `plan.violations` alone.
 */

import { useId } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InfoHint, hintLines } from '@/components/InfoHint'
import { cn } from '@/lib/utils'
import { formulaUnit } from '@/data/reporting/formula'
import type { Measure, QueryViolation, ReportQuery } from '@/data/types'
import type { Translator } from '@/lib'

export interface FormulaFieldProps {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  firstMeasure: Measure | null
  secondMeasure: Measure | null
  /** `query.groupBy.length > 0` — `PCT` needs a split to have parts. */
  hasSplit: boolean
  /** Already filtered to `field === 'formula'` by the caller. */
  violations: readonly QueryViolation[]
  unstarted: boolean
  /** View-only (§2.2): redraws A and B as dashed context series, never in `ReportQuery`. */
  showParts: boolean
  onShowPartsChange: (value: boolean) => void
  t: Translator
}

export function FormulaField({
  query,
  onChange,
  firstMeasure,
  secondMeasure,
  hasSplit,
  violations,
  unstarted,
  showParts,
  onShowPartsChange,
  t,
}: FormulaFieldProps) {
  const id = useId()
  const expression = query.formula?.expression ?? ''
  const violation = violations[0] ?? null
  const disabled = unstarted || !firstMeasure

  const setExpression = (next: string) => {
    onChange({
      ...query,
      /* An empty field is "no formula", not an expression that fails to parse
         — writing `{ expression: '' }` would hand `formulaUnit` a string that
         is always a parse error, and the field would show one the moment a
         measure is chosen. */
      formula: next.trim() === '' ? undefined : { expression: next, label: next },
    })
  }

  const unitResult =
    !violation && firstMeasure && expression.trim() !== ''
      ? formulaUnit(expression, {
          A: refInfo(firstMeasure),
          B: secondMeasure ? refInfo(secondMeasure) : undefined,
          hasSplit,
        })
      : null

  const errorId = `${id}-error`
  const unitId = `${id}-unit`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id}>{t('rb.control.formula')}</Label>
        <InfoHint t={t}>
          {hintLines([disabled ? t('rb.control.disabled.unstarted') : t('rb.control.formula.hint')])}
        </InfoHint>
      </div>

      <Input
        id={id}
        dir="ltr"
        className="text-start font-mono text-sm tabular-nums aria-invalid:border-input"
        placeholder={t('rb.control.formula.placeholder')}
        value={expression}
        disabled={disabled}
        aria-invalid={violation !== null}
        aria-describedby={violation ? errorId : unitResult?.ok ? unitId : undefined}
        onChange={(event) => setExpression(event.target.value)}
      />

      {!disabled && (
        <div className="flex flex-wrap items-center gap-1.5">
          <ReferenceChip index={0} label={t(firstMeasure!.labelKey)} set />
          <ReferenceChip
            index={1}
            label={secondMeasure ? t(secondMeasure.labelKey) : t('rb.control.formula.refB.unset')}
            set={Boolean(secondMeasure)}
          />
        </div>
      )}

      {violation && (
        <p id={errorId} className="text-xs text-muted-foreground">
          {t(violation.reasonKey, violation.reasonParams)}
        </p>
      )}
      {!violation && unitResult?.ok && (
        <p id={unitId} className="text-xs text-muted-foreground">
          {t('rb.control.formula.unit', { unit: t(`rb.unit.${unitResult.unit}`) })}
        </p>
      )}

      {!disabled && expression.trim() !== '' && (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox
            checked={showParts}
            onCheckedChange={(checked) => onShowPartsChange(checked === true)}
          />
          {t('rb.control.formula.showParts')}
        </label>
      )}
    </div>
  )
}

function refInfo(measure: Measure) {
  return {
    unit: measure.unit,
    currency: measure.currency,
    additive: measure.additive,
    temporality: measure.temporality,
  }
}

/**
 * A `<span>`, never a `Badge` — badges are reserved for lifecycle state (R7).
 * `rounded-lg` is the control radius (`--radius-lg`), deliberately not the 4px
 * badge radius (`rounded-sm`): this is not a status pill.
 */
function ReferenceChip({ index, label, set }: { index: 0 | 1; label: string; set: boolean }) {
  const letter = index === 0 ? 'A' : 'B'
  return (
    <span
      title={set ? label : undefined}
      className={cn(
        'inline-flex max-w-40 items-center gap-1 truncate rounded-lg border border-border bg-muted px-1.5 py-0.5 text-xs',
        !set && 'text-muted-foreground',
      )}
    >
      {set && (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: `var(--chart-s${index + 1})` }}
        />
      )}
      {letter} · <bdi className="truncate">{label}</bdi>
    </span>
  )
}
