/**
 * AC-1260 — `presetCondition` prefills the composer from a finding's own
 * `AlertCondition`, same as `presetReportId`/`presetSeriesId`. Rendered
 * standalone (not through `JobScreen`) so the fixture report's visibility
 * can't interfere with proving the wiring.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '@/data/clients'
import { AlertRuleDialog } from './AlertRuleDialog'
import { REPORTS_EN } from './copy'

function t(key: string, params?: Record<string, string | number>): string {
  let value = (REPORTS_EN[key] as string | undefined) ?? key
  for (const [k, v] of Object.entries(params ?? {})) value = value.replaceAll(`{${k}}`, String(v))
  return value
}
t.plural = (key: string, params: Record<string, string | number>) => t(key, params)

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
})

describe('AC-1260 — AlertRuleDialog opens with a finding’s proposed condition', () => {
  it('prefills the report, the series and the condition, without creating anything', async () => {
    const user = userEvent.setup()
    render(
      <AlertRuleDialog
        open
        onOpenChange={() => {}}
        rule={null}
        presetReportId="RPT-1"
        presetSeriesId="captains.registered#_#current"
        presetCondition={{ kind: 'static', comparator: 'gt', threshold: 6 }}
        onSaved={() => {
          throw new Error('nothing saves itself — the operator must click Save')
        }}
        today="2026-06-25"
        t={t}
        language="en"
      />,
    )

    // The report, resolved from `presetReportId` — RPT-1 is `team`-visible,
    // so this proves prefill, not a report-ownership accident.
    await waitFor(() => expect(screen.getByText('Captains vs riders · 30 days')).toBeInTheDocument())
    // The series, resolved from `presetSeriesId` once the report's series list loads.
    await waitFor(() => expect(screen.getByText('Registered captains')).toBeInTheDocument())

    // The condition kind and its own field, from `presetCondition` — never a
    // hand-typed default. `static`'s tab is selected...
    expect(screen.getByRole('tab', { name: 'Threshold', selected: true })).toBeInTheDocument()
    // ...`gt` is the chosen comparator...
    expect(screen.getByText('goes above')).toBeInTheDocument()
    // ...and `6` is the threshold text, editable, not committed.
    expect(screen.getByRole('textbox', { name: 'Threshold' })).toHaveValue('6')

    // Saving is still the operator's own act: a proposal alone does not
    // enable Save — naming the rule (the operator's own step) does.
    expect(screen.getByRole('button', { name: 'Save rule' })).toBeDisabled()
    await user.type(screen.getByLabelText('Name'), 'Cancellation rate over 6%')
    expect(screen.getByRole('button', { name: 'Save rule' })).toBeEnabled()
  })
})
