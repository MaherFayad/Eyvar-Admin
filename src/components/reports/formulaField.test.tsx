/**
 * The formula field — AC-1104 … AC-1107, AC-1155, and the R5a no-red rule.
 * `formulaViolation` (`plan.ts`) is exercised through the real `planQuery`, so
 * a parse error's position and every semantic refusal come from the same code
 * path `reports.run` refuses with — not a hand-copied string here.
 */

import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EYVAR_TODAY, planReportQuery } from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import type { Measure, ReportQuery } from '@/data/types'
import { FormulaField, type FormulaFieldProps } from './FormulaField'

const t = createTranslator({ dictionary: EN })

function measure(overrides: Partial<Measure> = {}): Measure {
  return {
    key: 'trips.completed',
    labelKey: 'rb.measure.trips.completed',
    category: 'service',
    population: {
      resource: 'trips',
      predicate: [],
      predicateKey: 'rb.pop.trips.completed',
      timeField: 'endedAt',
      valueField: null,
      coverage: { from: '2025-01-01', to: EYVAR_TODAY },
    },
    temporality: 'flow',
    bucketAggregate: 'count',
    additive: true,
    unit: 'count',
    currency: null,
    higherIsBetter: true,
    minGrain: 'day',
    dimensions: [],
    filterableFields: [],
    permission: null,
    captionKey: null,
    displayedAsMetricKeys: [],
    ...overrides,
  }
}

const A = measure()
const B = measure({ key: 'trips.fareCollected', labelKey: 'rb.measure.trips.fareCollected', unit: 'money', currency: 'SAR' })

const BASE: ReportQuery = {
  measures: [{ key: A.key }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

function violationsFor(query: ReportQuery) {
  return planReportQuery(query, { measures: [A, B], dimensions: [] }, EYVAR_TODAY).violations.filter(
    (v) => v.field === 'formula',
  )
}

/** A thin stateful wrapper — the field writes `onChange`, this re-derives the plan, exactly as `QueryPanel` does. */
function Controlled(props: Partial<FormulaFieldProps> & { initial?: ReportQuery }) {
  const [query, setQuery] = useState(props.initial ?? BASE)
  return (
    <FormulaField
      query={query}
      onChange={(next) => {
        setQuery(next)
        props.onChange?.(next)
      }}
      firstMeasure={props.firstMeasure ?? A}
      secondMeasure={props.secondMeasure ?? (query.measures[1] ? B : null)}
      hasSplit={props.hasSplit ?? query.groupBy.length > 0}
      violations={violationsFor(query)}
      unstarted={props.unstarted ?? false}
      showParts={props.showParts ?? false}
      onShowPartsChange={props.onShowPartsChange ?? (() => {})}
      t={t}
    />
  )
}

describe('the formula field', () => {
  it('is disabled with the unstarted reason until a measure is chosen', () => {
    render(<Controlled firstMeasure={null} secondMeasure={null} unstarted />)
    expect(screen.getByLabelText(t('rb.control.formula'))).toBeDisabled()
  })

  it('shows A and B as read-only chips, B unset by default', () => {
    render(<Controlled />)
    expect(screen.getByText(t(A.labelKey), { exact: false })).toBeTruthy()
    expect(screen.getByText(t('rb.control.formula.refB.unset'))).toBeInTheDocument()
    /* Read-only context, never a control an operator can Tab into with nothing to activate. */
    expect(screen.queryByRole('button', { name: new RegExp(t(A.labelKey)) })).toBeNull()
  })

  it('AC-1104 / AC-1155 — a bad expression names the position and expected token', async () => {
    const user = userEvent.setup()
    render(<Controlled />)

    const field = screen.getByLabelText(t('rb.control.formula'))
    await user.type(field, 'A /')

    expect(field).toHaveAttribute('aria-invalid', 'true')
    const describedBy = field.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const error = document.getElementById(describedBy!)
    /* `A /` fails right after the `/` at position 3, awaiting the missing operand. */
    expect(error?.textContent).toContain('3')
  })

  it('AC-1155 — a valid formula states its result unit, with no error', () => {
    render(<Controlled initial={{ ...BASE, formula: { expression: 'A', label: 'A' } }} />)
    const field = screen.getByLabelText(t('rb.control.formula'))
    expect(field).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByText(t('rb.control.formula.unit', { unit: t('rb.unit.count') }))).toBeInTheDocument()
  })

  it('AC-1106 — `B` without a second measure reads as a sentence, not a code', () => {
    render(<Controlled initial={{ ...BASE, formula: { expression: 'A / B', label: 'A / B' } }} />)
    expect(screen.getByText(t('rb.violation.formulaUnknownRef'))).toBeInTheDocument()
  })

  it('AC-1106 — mixed units are refused with `formula-unit`', () => {
    render(
      <Controlled
        initial={{
          ...BASE,
          measures: [{ key: A.key }, { key: B.key }],
          formula: { expression: 'A * B', label: 'A * B' },
        }}
      />,
    )
    expect(screen.getByText(t('rb.violation.formulaUnit'))).toBeInTheDocument()
  })

  it('never carries a red border — the field error is words, not colour (R5a)', () => {
    render(<Controlled initial={{ ...BASE, formula: { expression: 'A /', label: 'A /' } }} />)
    const field = screen.getByLabelText(t('rb.control.formula'))
    expect(field.className).not.toMatch(/border-destructive/)
  })

  it('the expression input is dir="ltr" unconditionally — a formula is code, not prose', () => {
    render(<Controlled />)
    expect(screen.getByLabelText(t('rb.control.formula'))).toHaveAttribute('dir', 'ltr')
  })

  it('AC-1103 — "Show A and B too" never touches the query', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Controlled initial={{ ...BASE, formula: { expression: 'A', label: 'A' } }} onChange={onChange} />)
    await user.click(screen.getByRole('checkbox', { name: t('rb.control.formula.showParts') }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
