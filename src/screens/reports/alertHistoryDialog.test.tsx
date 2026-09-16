/**
 * `AlertHistoryDialog`'s own row action, AC-1262 — `Explain this firing`
 * hands the analyst the firing it was asked about, the same one-shot URL
 * contract the builder overflow and the page header use (`entryContext.ts`).
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, getAlertRule, resetDataLayer } from '@/data/clients'
import type { AlertRule } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { AlertHistoryDialog } from './AlertHistoryDialog'
import { REPORTS_EN } from './copy'

const copy = (key: string) => REPORTS_EN[key] as string
const t = createTranslator({ dictionary: { ...EN, ...REPORTS_EN } })

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>
}

function renderDialog(rule: AlertRule) {
  return render(
    <MemoryRouter initialEntries={['/management/reports?view=alerts']}>
      <AlertHistoryDialog open onOpenChange={() => {}} rule={rule} t={t} language="en" />
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe('AC-1262 — Explain this firing', () => {
  it('opens the analyst with this firing already attached', async () => {
    const user = userEvent.setup()
    const rule = (await getAlertRule('ALR-1')).data
    renderDialog(rule)

    await screen.findByText(copy('rb.alert.history.col.firedAt'))
    await user.click((await screen.findAllByRole('button', { name: copy('rb.alert.history.explain') }))[0]!)

    const location = await screen.findByTestId('location')
    const search = new URLSearchParams(location.textContent!.split('?')[1])
    expect(search.get('view')).toBe('analyst')
    expect(search.get('askKind')).toBe('firing')
    expect(search.get('askId')).toBeTruthy()
    expect(search.get('askLabel')).toBeTruthy()
  })
})
