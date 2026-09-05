/**
 * Financials › Pricing & Plans — FINANCIALS-UX-PLAN §12: a plan can be added,
 * and a quick-ride class can be added and edited in the plan editor's shape.
 * Behaviour as an operator perceives it, by role, label and text.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getRouteTable,
  listPlans,
  listQuickRideTypes,
  resetDataLayer,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { PricingScreen } from './PricingScreen'
import { PlanEditorScreen } from './PlanEditorScreen'
import { QuickRideEditorScreen } from './QuickRideEditorScreen'

const pricingRow = (): SubTabRoute => {
  const row = getRouteTable().subTabs.find((each) => each.subTabId === 'financials-pricing')
  if (!row) throw new Error('No route-table row for financials-pricing')
  return row
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => undefined
  }
})

function Here() {
  const location = useLocation()
  return <span data-testid="here">{`${location.pathname}${location.search}`}</span>
}

/** The index and both editors on their real paths, so a click can travel. */
function mountApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <Here />
        <Routes>
          <Route path="/financials/pricing" element={<PricingScreen row={pricingRow()} />} />
          <Route path="/financials/pricing/plans/new" element={<PlanEditorScreen />} />
          <Route path="/financials/pricing/plans/:planId/edit" element={<PlanEditorScreen />} />
          <Route path="/financials/pricing/quick-rides/new" element={<QuickRideEditorScreen />} />
          <Route
            path="/financials/pricing/quick-rides/:typeId/edit"
            element={<QuickRideEditorScreen />}
          />
        </Routes>
      </ShellProvider>
    </MemoryRouter>,
  )
}

const here = () => screen.getByTestId('here').textContent
const label = (key: string) => EN[key] as string
const saveButton = () => screen.getByRole('button', { name: label('shell.saveBar.save') })

/** One line of a Calculations view, by the label the definition declares. */
function derivedLine(panelId: string, lineLabel: string): string {
  const panel = screen.getByTestId(panelId)
  const term = within(panel).getAllByText(lineLabel)[0] as HTMLElement
  return (term.nextElementSibling?.textContent ?? '').trim()
}

async function setText(user: ReturnType<typeof userEvent.setup>, name: string, value: string) {
  const input = screen.getByLabelText(name)
  await user.clear(input)
  if (value !== '') await user.type(input, value)
}

/* ═══════════════════════ §12 — quick-ride classes ═══════════════════════ */

describe('§12 — a quick-ride class is edited in the plan editor’s shape', () => {
  it('the Quick rides row opens the class editor on that class', async () => {
    const user = userEvent.setup()
    mountApp('/financials/pricing?view=quick-rides')
    const row = await screen.findByText('Comfort')
    await user.click(row)
    await waitFor(() => expect(here()).toBe('/financials/pricing/quick-rides/comfort/edit'))
    expect(await screen.findByText(label('fin.quickEditor.section.class'))).toBeTruthy()
    expect((screen.getByLabelText(label('fin.planEditor.nameEn.label')) as HTMLInputElement).value).toBe(
      'Comfort',
    )
  })

  it('Add class opens a blank editor, and the saved class appears in the list', async () => {
    const user = userEvent.setup()
    mountApp('/financials/pricing?view=quick-rides')
    await screen.findByText('Economy')
    await user.click(screen.getByRole('button', { name: label('fin.pricing.quick.add') }))
    await waitFor(() => expect(here()).toBe('/financials/pricing/quick-rides/new'))
    expect(await screen.findByText(label('fin.quickEditor.section.rates'))).toBeTruthy()
    expect(saveButton().hasAttribute('disabled')).toBe(true)

    await setText(user, label('fin.planEditor.nameEn.label'), 'Van')
    await setText(user, label('fin.planEditor.nameAr.label'), 'فان')
    await setText(user, label('fin.quickEditor.base.label'), '5')
    await setText(user, label('fin.quickEditor.perKm.label'), '2')
    await setText(user, label('fin.quickEditor.perMin.label'), '0.5')
    expect(saveButton().hasAttribute('disabled')).toBe(false)
    await user.click(saveButton())

    /* Back on the list, and the class is in the store in halalas. */
    await waitFor(() => expect(here()).toBe('/financials/pricing?view=quick-rides'))
    expect(await screen.findByText('Van')).toBeTruthy()
    const types = await listQuickRideTypes()
    const van = types.find((type) => type.name === 'Van')
    expect(van).toMatchObject({ nameAr: 'فان', baseFareHalalas: 500, perKmHalalas: 200, perMinHalalas: 50, active: true })
  })

  it('a rate typed on the Calculations view moves the fare and arms Save', async () => {
    const user = userEvent.setup()
    mountApp('/financials/pricing/quick-rides/economy/edit?tab=calculations')
    await screen.findByTestId('quick-calculations')
    const fareLabel = label('pricing.derived.quick.surged')
    const before = derivedLine('quick-calculations', fareLabel)
    expect(before).not.toBe('—')
    expect(saveButton().hasAttribute('disabled')).toBe(true)

    await setText(user, label('fin.quickEditor.perKm.label'), '2')
    expect(derivedLine('quick-calculations', fareLabel)).not.toBe(before)
    expect(saveButton().hasAttribute('disabled')).toBe(false)
  })

  it('the surge multiplier is a trial: the fare moves, Save stays disabled, Reset returns it', async () => {
    const user = userEvent.setup()
    mountApp('/financials/pricing/quick-rides/economy/edit?tab=calculations')
    await screen.findByTestId('quick-calculations')
    const fareLabel = label('pricing.derived.quick.surged')
    const before = derivedLine('quick-calculations', fareLabel)
    const resetLabel = label('fin.quickEditor.calc.trial.reset')
    expect(screen.queryByRole('button', { name: resetLabel })).toBeNull()

    await setText(user, label('fin.quickEditor.calc.surge.label'), '1.5')
    expect(derivedLine('quick-calculations', fareLabel)).not.toBe(before)
    expect(saveButton().hasAttribute('disabled')).toBe(true)
    /* The preview quotes the surged fare and says it carries a trial. */
    const frame = screen.getByTestId('quick-preview-frame')
    expect(within(frame).getByText(/Surge/)).toBeTruthy()
    expect(screen.getByText(label('fin.planEditor.preview.caption.trial'))).toBeTruthy()

    await user.click(screen.getByRole('button', { name: resetLabel }))
    expect(derivedLine('quick-calculations', fareLabel)).toBe(before)
  })

  it('a blank name blocks Save with the message on the input', async () => {
    const user = userEvent.setup()
    mountApp('/financials/pricing/quick-rides/economy/edit')
    await screen.findByText(label('fin.quickEditor.section.class'))
    const name = screen.getByLabelText(label('fin.planEditor.nameEn.label'))
    await user.clear(name)
    await user.tab()
    expect(saveButton().hasAttribute('disabled')).toBe(true)
    expect(name.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText(label('fin.planEditor.name.required'))).toBeTruthy()
  })
})

/* ═══════════════════════════ §12 — add a plan ═══════════════════════════ */

describe('§12 — a plan can be added', () => {
  it('Add plan opens a blank editor, and the saved plan appears in the catalogue', async () => {
    const user = userEvent.setup()
    mountApp('/financials/pricing')
    await screen.findByText('Weekly')
    await user.click(screen.getByRole('button', { name: label('fin.pricing.plan.add') }))
    await waitFor(() => expect(here()).toBe('/financials/pricing/plans/new'))
    await screen.findByText(label('fin.planEditor.section.catalogue'))
    expect(screen.getByText(label('fin.planEditor.pricing.fromRateCard'))).toBeTruthy()
    expect(saveButton().hasAttribute('disabled')).toBe(true)

    await setText(user, label('fin.planEditor.nameEn.label'), 'Season')
    await setText(user, label('fin.planEditor.nameAr.label'), 'الموسم')
    await setText(user, label('fin.planEditor.durationDays.label'), '90')
    await setText(user, label('fin.planEditor.executeDays.label'), '60')
    await setText(user, label('fin.planEditor.cancelCap.label'), '3')
    await setText(user, label('fin.planEditor.sortOrder.label'), '4')
    /* A feature line, added and filled in both languages. */
    await user.click(screen.getByRole('button', { name: label('fin.planEditor.feature.add') }))
    await setText(user, label('fin.planEditor.feature.en'), 'Priority pickup')
    await setText(user, label('fin.planEditor.feature.ar'), 'أولوية الالتقاط')
    expect(saveButton().hasAttribute('disabled')).toBe(false)
    await user.click(saveButton())

    await waitFor(() => expect(here()).toBe('/financials/pricing'))
    expect(await screen.findByText('Season')).toBeTruthy()
    const plans = await listPlans()
    const season = plans.find((plan) => plan.nameEn === 'Season')
    expect(season).toMatchObject({
      nameAr: 'الموسم',
      durationDays: 90,
      executeDays: 60,
      cancelCap: 3,
      sortOrder: 4,
      status: 'draft',
      features: [{ en: 'Priority pickup', ar: 'أولوية الالتقاط' }],
      pricingSource: 'rate-card',
    })
  })
})
