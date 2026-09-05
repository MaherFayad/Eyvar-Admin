/**
 * Financials › Pricing & Plans, Stage A — **AC-389**, **AC-390**, **AC-394**,
 * **AC-396**, **AC-399**, **AC-401**, **AC-410**, **AC-411**, **AC-414**,
 * **AC-448**.
 *
 * **No spies.** AC-410's content is an absence — *"no control on any Financials
 * surface raises a surge multiplier"* — and a spy with no implementation would
 * make that absence unfalsifiable. It is asserted instead by enumerating every
 * control the surge card renders and checking what each one does, and by
 * confirming the one write it does offer (a suspension) works. An absence
 * proved beside its present sibling is an absence somebody checked.
 *
 * **AC-402–408 (Stage B) are absent, not stubbed (Q7), and nothing in this file
 * asserts them.** The `Approve` control on a draft rate card is disabled with a
 * reason and commits nothing; that is asserted here as *the disabled state*,
 * never as an approval path.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getLiveRateCard,
  getPlan,
  getRouteTable,
  listCancellationRules,
  listPlans,
  listRevenueByPlan,
  listSurgeSuspensions,
  listSurgeWindows,
  resetDataLayer,
} from '@/data/clients'
import { PLAN_EXAMPLE_INPUTS, type PlanKey, type SubTabRoute } from '@/data/types'
import { formatMoney } from '@/lib'
import { AR, EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { AppLayout } from '@/shell/AppLayout'
import { PricingScreen } from './PricingScreen'
import { PlanEditorScreen } from './PlanEditorScreen'

const pricingRow = (): SubTabRoute => {
  const row = getRouteTable().subTabs.find((each) => each.subTabId === 'financials-pricing')
  if (!row) throw new Error('No route-table row for financials-pricing')
  return row
}

/**
 * jsdom has no Pointer Events, and Radix's `Select` calls
 * `hasPointerCapture` / `scrollIntoView` on the trigger. Without these three
 * shims the status select cannot be opened in a test at all — which would mean
 * **AC-401's hardest clause silently going untested**, since `status` is the
 * one control `savePlan()` reads from nothing in legacy (§8.6).
 */
beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
    HTMLElement.prototype.setPointerCapture = () => undefined
    HTMLElement.prototype.releasePointerCapture = () => undefined
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => undefined
  }
})

function mountPricing(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <PricingScreen row={pricingRow()} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

function mountEditor(planId = 'monthly') {
  return render(
    <MemoryRouter initialEntries={[`/financials/pricing/plans/${planId}/edit`]}>
      <ShellProvider>
        <Routes>
          <Route path="/financials/pricing/plans/:planId/edit" element={<PlanEditorScreen />} />
        </Routes>
      </ShellProvider>
    </MemoryRouter>,
  )
}

const calculationsTab = () =>
  screen.getByRole('tab', { name: EN['fin.planEditor.tab.calculations'] as string })
const detailsTab = () =>
  screen.getByRole('tab', { name: EN['fin.planEditor.tab.details'] as string })

/**
 * The plan total as the rider preview prints it. The preview stands beside both
 * tabs of the data column, so it is the derived value an editor test can read
 * without leaving the field it just typed in (§11).
 */
function previewTotal(): string {
  const frame = screen.getByTestId('plan-preview-frame')
  return (frame.querySelector('[aria-readonly="true"]')?.textContent ?? '').trim()
}

/** Every non-blank text node under `root`, each one as a reader sees it. */
function textNodesIn(root: HTMLElement): string[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const out: string[] = []
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = (node.textContent ?? '').trim()
    if (text !== '') out.push(text)
  }
  return out
}

/** One line of the Calculations view, by the label the definition declares. */
function derivedLine(label: string): string {
  const panel = screen.getByTestId('plan-calculations')
  const term = within(panel).getAllByText(label)[0] as HTMLElement
  return (term.nextElementSibling?.textContent ?? '').trim()
}

/* ═════════════════════ AC-389 — four views, one route ═══════════════════ */

describe('AC-389 — four views on one route, as view tabs', () => {
  /**
   * *"…with `Subscription plans` default. None is a navigation level and none
   * appears in the path."*
   *
   * The path clause is the load-bearing one: switching views must leave
   * `/financials/pricing` alone and move only `?view=`. A test that only
   * counted four tabs would pass against four routes.
   */
  it('the four views are tabs, the default is Subscription plans, and the path never moves', async () => {
    const user = userEvent.setup()
    let location = ''
    render(
      <MemoryRouter initialEntries={['/financials/pricing']}>
        <ShellProvider>
          <Routes>
            <Route
              path="/financials/pricing"
              element={
                <>
                  <PricingScreen row={pricingRow()} />
                  <LocationProbe onChange={(next) => (location = next)} />
                </>
              }
            />
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('Monthly')).toBeTruthy())

    /* The default view, with no `?view=` in the URL at all. */
    expect(location).toBe('/financials/pricing')
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
      EN['view.pricing.subscriptionPlans'],
      EN['view.pricing.quickRides'],
      EN['view.pricing.rateCard'],
      EN['view.pricing.cancellationFees'],
    ])
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')

    /* Switching a view moves the search param and NOT the path. */
    await user.click(tabs[2] as HTMLElement)
    await waitFor(() => expect(location).toBe('/financials/pricing?view=rate-card'))
    expect(location.startsWith('/financials/pricing?')).toBe(true)
    expect(location).not.toContain('/rate-card/')
  })
})

/* ══════════════════ AC-390 — the editor leaves the layout ═══════════════ */

describe('AC-390 — the plan editor is outside the app layout', () => {
  /**
   * *"Entering the plan editor unmounts the rail, the sub-tab column and the
   * app top bar. Exiting returns to `/financials/pricing` with both columns
   * restored."*
   *
   * Composed the way `routes.tsx` composes it — the editor route **outside**
   * `<AppLayout>` and the pricing route inside — so this asserts the routing
   * decision rather than a screen's own markup. The rail's presence is checked
   * on both sides of the transition, which is what makes the absence in the
   * middle a fact rather than a query that never matched.
   */
  it('the rail and sub-tab column are gone in the editor and back on exit', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/financials/pricing']}>
        <ShellProvider>
          <Routes>
            <Route path="/financials/pricing/plans/:planId/edit" element={<PlanEditorScreen />} />
            <Route element={<AppLayout />}>
              <Route path="/financials/pricing" element={<PricingScreen row={pricingRow()} />} />
            </Route>
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('Monthly')).toBeTruthy())

    /* Inside the layout: navigation landmarks exist. */
    const navsBefore = screen.getAllByRole('navigation').length
    expect(navsBefore).toBeGreaterThan(0)

    /* Into the editor, through the row's own control. The row declares two
       actions now — `Open revenue` is the row-click target and `Edit` is the
       catalogue's own act — so the editor is reached by name. */
    const monthly = screen.getByText('Monthly').closest('tr') as HTMLElement
    const edit = within(monthly).getByRole('button', {
      name: EN['fin.pricing.plan.action.edit'] as string,
    })
    await user.click(edit)

    await waitFor(() =>
      expect(screen.getByText(EN['fin.planEditor.section.catalogue'] as string)).toBeTruthy(),
    )
    /* Full bleed: no rail, no sub-tab column, no app top bar. */
    expect(screen.queryAllByRole('navigation')).toHaveLength(0)

    /* Out again, and both columns are back. */
    await user.click(screen.getByRole('button', { name: EN['shell.topbar.back'] as string }))
    await waitFor(() => expect(screen.getByText('Monthly')).toBeTruthy())
    expect(screen.getAllByRole('navigation').length).toBe(navsBefore)
  })
})

/* ═════════════ AC-394 / AC-396 / AC-399 / AC-401 / AC-448 ═══════════════ */

describe('the plan editor', () => {
  /**
   * **AC-396** — *"typing in any input the formula reads updates every dependent
   * derived value on the `input` event."*
   *
   * The assertion is that the derived value **moves while typing**, before any
   * blur or submit. A derived column that only recomputed on blur would pass a
   * presence check and fail this.
   */
  it('AC-396 — a dependent derived value moves on the input event', async () => {
    const user = userEvent.setup()
    mountEditor()
    await waitFor(() =>
      expect(screen.getByText(EN['fin.planEditor.section.catalogue'] as string)).toBeTruthy(),
    )

    /* **The rider preview is the always-visible derived value** (§11): the form
       and the worked example are two views of one column now, so a derived
       value sharing a tab with the input could not witness "on the `input`
       event" without a click in between. The preview stands beside both tabs
       and reads the same `derivePlan` result. */
    const before = previewTotal()
    expect(before).not.toBe('')

    const trips = screen.getByLabelText(EN['fin.planEditor.executeDays.label'] as string)
    await user.clear(trips)
    await user.type(trips, '30')

    /* No blur, no submit — the value has already moved. */
    expect(previewTotal()).not.toBe(before)

    /* And the worked example, on the other tab, agrees with it. */
    await user.click(calculationsTab())
    expect(derivedLine(EN['pricing.derived.planTotal'] as string)).toBe(previewTotal())
  })

  /**
   * **AC-394** — *"with a numeric input cleared, `Save` is blocked and the error
   * renders on the cleared input, not on any derived value."*
   *
   * Three clauses. The third is the one §8.6 exists for: a derived value has no
   * input of its own and cannot be invalid, so the error must not land on one.
   * `aria-invalid` is counted across the whole form, so an error written onto a
   * preview cell would be caught.
   */
  it('AC-394 — a cleared number blocks Save and puts the error on the input', async () => {
    const user = userEvent.setup()
    mountEditor()
    await waitFor(() =>
      expect(screen.getByText(EN['fin.planEditor.section.catalogue'] as string)).toBeTruthy(),
    )

    const trips = screen.getByLabelText(EN['fin.planEditor.executeDays.label'] as string)
    await user.clear(trips)
    await user.tab()

    /* Every dependent derived value is an em dash — never `0.00 SAR` and never
       a stale number (**AC-393's screen half**). Asserted in both places a
       derived value now renders: the preview beside the form, and the worked
       example on the Calculations tab. */
    expect(previewTotal()).toBe('—')
    await user.click(calculationsTab())
    expect(derivedLine(EN['pricing.derived.planTotal'] as string)).toBe('—')
    await user.click(detailsTab())

    await user.click(screen.getByRole('button', { name: EN['shell.saveBar.save'] as string }))

    /* Blocked, with the message on the input. */
    await waitFor(() => expect(screen.getByText(EN['fin.planEditor.number.required'] as string)).toBeTruthy())
    expect(trips.getAttribute('aria-invalid')).toBe('true')

    /* And on nothing that is not an input. */
    for (const invalid of document.querySelectorAll('[aria-invalid="true"]')) {
      expect(invalid.tagName).toBe('INPUT')
    }
    for (const derived of document.querySelectorAll('[aria-readonly="true"]')) {
      expect(derived.getAttribute('aria-invalid')).toBeNull()
    }
  })

  /**
   * **AC-399** — *"the worked example is computed from the same definitions as
   * the preview strip, and its column header states its literal inputs
   * (`10 km · 20 min × exec days`). Its note states that surge is excluded."*
   *
   * The `exec days` half is the one that can rot: it must be the **live**
   * value of the trips input, not the plan's stored one, so the header is read
   * again after the input changes.
   */
  it('AC-399 — the worked example states its literal inputs and excludes surge', async () => {
    const user = userEvent.setup()
    mountEditor()
    await waitFor(() =>
      expect(screen.getByText(EN['fin.planEditor.section.catalogue'] as string)).toBeTruthy(),
    )
    /* The worked example is the Calculations view of the data column now (§11);
       the criterion is unchanged and is asserted where it renders. */
    await user.click(calculationsTab())

    const plan = await getPlan('monthly' as PlanKey)
    /* `10 km ·` and not `10 km`: the working under each line now states the
       same literal input (`20 min × 0.95 + 10 km × 1.10`), which is the point
       of it, so the header is matched on the separator only it carries. */
    const header = screen.getByText(
      new RegExp(`${PLAN_EXAMPLE_INPUTS.exampleKm} km ·`),
    )
    expect(header.textContent).toContain(`${PLAN_EXAMPLE_INPUTS.exampleMinutes} min`)
    expect(header.textContent).toContain(String(plan.executeDays))

    /* The note, in words. */
    expect(screen.getByText(EN['fin.planEditor.preview.note.plan'] as string)).toBeTruthy()

    /* And the header follows the input rather than the record. */
    await user.click(detailsTab())
    const trips = screen.getByLabelText(EN['fin.planEditor.executeDays.label'] as string)
    await user.clear(trips)
    await user.type(trips, '44')
    await user.click(calculationsTab())
    expect(
      screen.getByText(new RegExp(`${PLAN_EXAMPLE_INPUTS.exampleKm} km ·`)).textContent,
    ).toContain('44')
  })

  /**
   * **AC-401** — *"every editable control in the editor is read by the save
   * handler. Changing any control, saving, and reloading the record shows the
   * changed value."*
   *
   * Every editable control is changed in one pass — two texts, four numbers,
   * the select and both switches — because the criterion is *every*, and
   * `savePlan()` reading `status` from nothing is the exact §8.6 defect this
   * catches. The reload is a real `getPlan()`, not the form's own state.
   */
  it('AC-401 — every editable control survives a save and a reload', async () => {
    const user = userEvent.setup()
    mountEditor()
    await waitFor(() =>
      expect(screen.getByText(EN['fin.planEditor.section.catalogue'] as string)).toBeTruthy(),
    )
    const before = await getPlan('monthly' as PlanKey)

    const setNumber = async (label: string, value: string) => {
      const input = screen.getByLabelText(label)
      await user.clear(input)
      await user.type(input, value)
    }

    await user.clear(screen.getByLabelText(EN['fin.planEditor.nameEn.label'] as string))
    await user.type(screen.getByLabelText(EN['fin.planEditor.nameEn.label'] as string), 'Monthly Plus')
    await user.clear(screen.getByLabelText(EN['fin.planEditor.nameAr.label'] as string))
    await user.type(screen.getByLabelText(EN['fin.planEditor.nameAr.label'] as string), 'شهري بلس')
    await setNumber(EN['fin.planEditor.durationDays.label'] as string, '45')
    await setNumber(EN['fin.planEditor.executeDays.label'] as string, '33')
    await setNumber(EN['fin.planEditor.cancelCap.label'] as string, '4')
    await setNumber(EN['fin.planEditor.sortOrder.label'] as string, '9')

    /* The status select — §8.6's `:1105`, read by nothing in legacy. */
    await user.click(screen.getByLabelText(EN['fin.planEditor.status.label'] as string))
    await user.click(await screen.findByRole('option', { name: EN['fin.pricing.plan.status.archived'] as string }))

    /* Both switches, flipped away from whatever they were. */
    await user.click(screen.getByLabelText(EN['fin.planEditor.economyActive.label'] as string))
    await user.click(screen.getByLabelText(EN['fin.planEditor.comfortActive.label'] as string))

    await user.click(screen.getByRole('button', { name: EN['shell.saveBar.save'] as string }))

    await waitFor(async () => {
      const after = await getPlan('monthly' as PlanKey)
      expect(after.nameEn).toBe('Monthly Plus')
      expect(after.nameAr).toBe('شهري بلس')
      expect(after.durationDays).toBe(45)
      expect(after.executeDays).toBe(33)
      expect(after.cancelCap).toBe(4)
      expect(after.sortOrder).toBe(9)
      expect(after.status).toBe('archived')
      expect(after.economyActive).toBe(!before.economyActive)
      expect(after.comfortActive).toBe(!before.comfortActive)
    })
  })

  /**
   * **AC-448** — *"the plan editor's Arabic name field renders right-to-left in
   * **both** document directions, and its character-count hint is localised."*
   *
   * The first clause is asserted in both directions, which is the whole point:
   * a field that inherited the document's direction would pass in Arabic and
   * fail in English.
   */
  it('AC-448 — the Arabic name field is right-to-left in both document directions', async () => {
    for (const dir of ['ltr', 'rtl']) {
      document.documentElement.setAttribute('dir', dir)
      const { unmount } = mountEditor()
      await waitFor(() =>
        expect(screen.getByText(EN['fin.planEditor.section.catalogue'] as string)).toBeTruthy(),
      )
      const arabic = screen.getByLabelText(EN['fin.planEditor.nameAr.label'] as string)
      expect(arabic.getAttribute('dir'), `document dir=${dir}`).toBe('rtl')

      /* And the English field does NOT carry it, so the attribute above is a
         decision about the content and not a blanket. */
      const english = screen.getByLabelText(EN['fin.planEditor.nameEn.label'] as string)
      expect(english.getAttribute('dir')).toBeNull()
      unmount()
    }
    document.documentElement.removeAttribute('dir')
  })

  /**
   * **AC-448's second clause** — *"…and its character-count hint is localised."*
   *
   * **Expected RED.** The Arabic name field renders `fin.planEditor.nameAr.help`
   * — *"Both names are required. This one is what an Arabic rider sees."* —
   * and no count. `fin.planEditor.feature.count` (`{count} of 60`) and
   * `feature.tooLong` are written and translated, but the editor renders **no
   * feature editor at all**, so the only counted field in the spec is absent
   * and the hint has nothing to attach to.
   *
   * Reported as an implementation gap rather than a copy gap: the key exists.
   */
  it('AC-448 — the Arabic name field carries a character-count hint', async () => {
    expect(EN['fin.planEditor.feature.count'], 'the count hint is written').toBeTruthy()
    mountEditor()
    await waitFor(() =>
      expect(screen.getByText(EN['fin.planEditor.section.catalogue'] as string)).toBeTruthy(),
    )
    const arabic = screen.getByLabelText(EN['fin.planEditor.nameAr.label'] as string)
    const field = arabic.parentElement as HTMLElement
    const hint = field.querySelector('p')?.textContent ?? ''
    expect(hint, 'a hint is rendered beneath the Arabic name').not.toBe('')
    expect(hint, 'the hint states a character count').toMatch(/\d+\s*(of|\/)\s*\d+/)
  })
})

/* ═══════════ FINANCIALS-UX-PLAN §11 — two columns, one tab row ══════════ */

describe('§11 — the plan editor is two columns and two views', () => {
  /**
   * The data column holds the record in two views and the choice lives in
   * `?tab=`. Both halves are asserted: the view actually swaps, and the URL
   * moves with it — a pair of tabs that switched only local state would pass a
   * count and lose the operator's place on a reload.
   */
  it('the two tabs swap the data column and carry the choice in ?tab=', async () => {
    const user = userEvent.setup()
    let location = ''
    render(
      <MemoryRouter initialEntries={['/financials/pricing/plans/weekly/edit']}>
        <ShellProvider>
          <Routes>
            <Route
              path="/financials/pricing/plans/:planId/edit"
              element={
                <>
                  <PlanEditorScreen />
                  <LocationProbe onChange={(next) => (location = next)} />
                </>
              }
            />
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(screen.getByText(EN['fin.planEditor.section.catalogue'] as string)).toBeTruthy(),
    )

    /* The default view carries no parameter at all. */
    expect(location).toBe('/financials/pricing/plans/weekly/edit')
    expect(detailsTab().getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByTestId('plan-calculations')).toBeNull()

    await user.click(calculationsTab())
    await waitFor(() =>
      expect(location).toBe('/financials/pricing/plans/weekly/edit?tab=calculations'),
    )
    expect(screen.getByTestId('plan-calculations')).toBeTruthy()
    /* The form is gone, not merely scrolled past. */
    expect(screen.queryByText(EN['fin.planEditor.section.catalogue'] as string)).toBeNull()

    await user.click(detailsTab())
    await waitFor(() => expect(location).toBe('/financials/pricing/plans/weekly/edit'))
    expect(screen.getByText(EN['fin.planEditor.section.catalogue'] as string)).toBeTruthy()
  })

  /**
   * The owner's objection to the panel this replaces was that it printed the
   * evaluator's own names — `exampleMinutes × perMinuteHalalas` — at a Finance
   * lead. Nothing in the view may read like source: no camel case, and no
   * `Halalas`, which is the unit the arithmetic runs in and the operator prices
   * in major units.
   */
  it('the Calculations view prints no identifier and no halalas', async () => {
    const user = userEvent.setup()
    mountEditor('weekly')
    await waitFor(() =>
      expect(screen.getByText(EN['fin.planEditor.section.catalogue'] as string)).toBeTruthy(),
    )
    await user.click(calculationsTab())

    const panel = screen.getByTestId('plan-calculations')
    /* Per TEXT NODE, not per container: `textContent` on a card welds the
       heading `Economy` to the first label `Captain share` and would fail on a
       boundary no reader can see. */
    const lines = textNodesIn(panel)
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      expect(line, 'no camel-case identifier and no halalas').not.toMatch(/[a-z][A-Z]|Halalas/)
    }

    /* And it is not empty of arithmetic: every definition still renders its own
       working, substituted from the same expression (AC-397). */
    expect(within(panel).getAllByText(EN['pricing.derived.gross'] as string).length).toBe(2)
    const text = panel.textContent ?? ''
    expect(text).toContain('20 min')
    expect(text).toContain('10 km')
  })

  /**
   * The end column is the plan as a rider sees it, and it is drawn from form
   * state rather than from the record — so an unsaved edit shows there.
   */
  it('the rider preview follows the form, not the record', async () => {
    const user = userEvent.setup()
    mountEditor('weekly')
    await waitFor(() =>
      expect(screen.getByText(EN['fin.planEditor.section.catalogue'] as string)).toBeTruthy(),
    )
    const frame = screen.getByTestId('plan-preview-frame')
    expect(within(frame).getByText('Weekly')).toBeTruthy()

    const name = screen.getByLabelText(EN['fin.planEditor.nameEn.label'] as string)
    await user.clear(name)
    await user.type(name, 'Weekly Plus')
    expect(within(frame).getByText('Weekly Plus')).toBeTruthy()

    /* A feature line the rider reads follows too. */
    const feature = screen.getAllByLabelText(EN['fin.planEditor.feature.en'] as string)[0] as HTMLElement
    await user.clear(feature)
    await user.type(feature, 'Airport runs included')
    expect(within(frame).getByText('Airport runs included')).toBeTruthy()
  })

  /**
   * The preview's language is its own. Asserted as the frame's `dir` and by the
   * Arabic name appearing in it — with the console left in English, which is
   * the whole point: a toggle that moved the console would pass a `dir` check
   * and fail the criterion.
   */
  it('the EN / AR toggle flips the preview alone', async () => {
    const user = userEvent.setup()
    mountEditor('weekly')
    await waitFor(() =>
      expect(screen.getByText(EN['fin.planEditor.section.catalogue'] as string)).toBeTruthy(),
    )

    const frame = () => screen.getByTestId('plan-preview-frame')
    expect(frame().getAttribute('dir')).toBe('ltr')
    expect(frame().getAttribute('lang')).toBe('en')

    await user.click(
      screen.getByRole('tab', { name: EN['fin.planEditor.preview.language.ar'] as string }),
    )
    expect(frame().getAttribute('dir')).toBe('rtl')
    expect(frame().getAttribute('lang')).toBe('ar')
    /* The Arabic name and an Arabic feature line, from the form. */
    expect(within(frame()).getByText('الباقة الأسبوعية')).toBeTruthy()
    expect(within(frame()).getByText(AR['fin.planEditor.rider.subscribe'] as string)).toBeTruthy()
    /* The console did not move with it. */
    expect(screen.getByText(EN['fin.planEditor.section.catalogue'] as string)).toBeTruthy()

    await user.click(
      screen.getByRole('tab', { name: EN['fin.planEditor.preview.language.en'] as string }),
    )
    expect(frame().getAttribute('dir')).toBe('ltr')
  })

  /**
   * The caption states what the frame is, and the VAT half is the RATE CARD's
   * claim: printed because the live card says `vatIncluded`, and it would say
   * nothing if the card did not.
   */
  it('the caption states the VAT rule the live rate card declares', async () => {
    const card = await getLiveRateCard()
    expect(card.vatIncluded, 'the fixture makes the VAT sentence reachable').toBe(true)
    mountEditor('weekly')
    await waitFor(() =>
      expect(screen.getByText(EN['fin.planEditor.preview.caption.vat'] as string)).toBeTruthy(),
    )
  })
})

/* ═══════════════════ AC-410 / AC-411 — surge, one way ═══════════════════ */

describe('surge — operations may only suspend', () => {
  /**
   * **AC-410** — *"no control on any Financials surface raises a surge
   * multiplier. Operations may only suspend."*
   *
   * Asserted by enumerating: the multipliers render as **text** with no input,
   * no select and no stepper anywhere near them, and the only interactive
   * controls on the card are the per-zone suspend triggers. The presence of
   * those triggers is what stops this being a vacuous sweep of an empty card.
   */
  it('AC-410 — the multipliers are read-only text and the only write is a suspension', async () => {
    mountPricing('/financials/pricing?view=rate-card')
    await waitFor(() =>
      expect(screen.getByText(EN['fin.pricing.surge.heading'] as string)).toBeTruthy(),
    )

    const windows = await listSurgeWindows()
    expect(windows.length).toBeGreaterThan(0)

    const card = screen
      .getByText(EN['fin.pricing.surge.heading'] as string)
      .closest('div[class*="flex-col"]') as HTMLElement

    /* Every multiplier is on screen, as text in the row's value cell. */
    for (const window of windows) {
      expect(card.textContent, `${window.label}'s multiplier is stated`).toContain(
        `${window.multiplier}×`,
      )
    }

    /* No control anywhere on the card can set one. */
    expect(card.querySelectorAll('input')).toHaveLength(0)
    expect(within(card).queryAllByRole('spinbutton')).toHaveLength(0)
    expect(within(card).queryAllByRole('combobox')).toHaveLength(0)
    expect(within(card).queryAllByRole('slider')).toHaveLength(0)

    /* And the card is not simply empty: it carries a live control per zone. */
    expect(within(card).getAllByRole('button').length).toBeGreaterThan(0)
    expect(screen.getByText(EN['fin.pricing.surge.readOnly'] as string)).toBeTruthy()
  })

  /**
   * **AC-411** — *"suspending surge requires a reason; the confirmation's
   * primary action is disabled until one is entered."*
   *
   * Both states in one test: disabled empty, enabled once typed. Only the pair
   * proves the reason is what gates it.
   */
  it('AC-411 — the suspension primary is disabled until a reason is entered', async () => {
    const user = userEvent.setup()
    mountPricing('/financials/pricing?view=rate-card')
    await waitFor(() =>
      expect(screen.getByText(EN['fin.pricing.surge.heading'] as string)).toBeTruthy(),
    )

    const before = await listSurgeSuspensions()
    const card = screen
      .getByText(EN['fin.pricing.surge.heading'] as string)
      .closest('div[class*="flex-col"]') as HTMLElement
    const zoneButtons = within(card).getAllByRole('button')
    await user.click(zoneButtons[zoneButtons.length - 1] as HTMLElement)

    const dialog = await screen.findByRole('dialog')
    const confirm = within(dialog).getByRole('button', {
      name: EN['fin.pricing.surge.suspend.confirm'] as string,
    })
    expect(confirm).toBeDisabled()

    await user.type(
      within(dialog).getByLabelText(EN['fin.pricing.surge.suspend.reason.label'] as string),
      'Flooding on the ring road',
    )
    expect(confirm).toBeEnabled()

    await user.click(confirm)
    await waitFor(async () => {
      const after = await listSurgeSuspensions()
      expect(after.length).toBe(before.length + 1)
      expect(after[after.length - 1]?.reason).toBe('Flooding on the ring road')
    })
  })
})

/* ═══════════════ AC-414 — a rule that is stored and not applied ═════════ */

describe('AC-414 — a cancellation rule with no enforcement path', () => {
  /**
   * *"…renders a visible `Not enforced` state naming that it is stored but not
   * applied. It never renders as though it were live."*
   *
   * The second sentence is the one worth testing: **every** unenforced rule
   * carries the state and **no** enforced rule does. A screen that labelled all
   * eight would pass the first clause and fail this.
   */
  it('every unenforced rule says so, and no enforced rule does', async () => {
    mountPricing('/financials/pricing?view=cancellation-fees')
    await waitFor(() =>
      expect(screen.getByText(EN['fin.pricing.cancel.notEnforced.title'] as string)).toBeTruthy(),
    )

    const rules = await listCancellationRules()
    const unenforced = rules.filter((rule) => !rule.hasEnforcement)
    const enforced = rules.filter((rule) => rule.hasEnforcement)
    expect(unenforced.length).toBeGreaterThan(0)
    expect(enforced.length).toBeGreaterThan(0)

    expect(screen.getAllByText(EN['fin.pricing.cancel.notEnforced'] as string)).toHaveLength(
      unenforced.length,
    )

    /* And the page states the standing condition once, with its count. */
    expect(screen.getAllByText(EN['fin.pricing.cancel.notEnforced.body'] as string)).toHaveLength(1)
  })
})

/** Reports the current location string to its caller on every render. */
function LocationProbe({ onChange }: { onChange: (next: string) => void }) {
  const { pathname, search } = useLocation()
  onChange(`${pathname}${search}`)
  return null
}

/* ═══════════ FINANCIALS-UX-PLAN §5.4 — the plan's money, and where ═══════ */

describe('§5.4 — the catalogue row carries its money and points at the money page', () => {
  /**
   * **The join is `SubscriptionPlan.id === RevenueByPlanRow.planId`.** Read
   * from both clients here rather than typed, so a row that ever stated another
   * plan's gross fails. `quick-ride` is a revenue row and not a plan, so it has
   * no row in this catalogue and is asserted absent.
   */
  it('every plan row states Gross this period from listRevenueByPlan', async () => {
    const plans = await listPlans()
    const revenue = await listRevenueByPlan()
    expect(plans.length).toBeGreaterThan(0)

    mountPricing('/financials/pricing?view=subscription-plans')
    await waitFor(() => expect(screen.getByText('Monthly')).toBeTruthy())

    expect(screen.getByRole('columnheader', {
      name: EN['fin.pricing.plan.col.gross'] as string,
    })).toBeTruthy()

    for (const plan of plans) {
      const row = screen.getByText(plan.nameEn).closest('tr') as HTMLElement
      const gross = revenue.find((each) => each.planId === plan.id)
      expect(gross, `${plan.id} joins a revenue row`).toBeTruthy()
      expect(
        within(row).getByText(formatMoney(gross!.grossHalalas, { unit: 'none' })),
      ).toBeTruthy()
    }

    /* `quick-ride` is a revenue row and not a plan, so no row in the catalogue
       carries it. (The words also name a VIEW on this screen, hence the scope.) */
    for (const row of screen.getAllByRole('row')) {
      expect(row.textContent).not.toContain('Quick rides')
    }
  })

  /**
   * **R2-4** — the lane holds the one mutating act; opening the plan's money
   * page is the ROW, by click and by `Enter` through the same handler.
   */
  it('R2-4 — the row opens Revenue and the lane holds Edit alone', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/financials/pricing']}>
        <ShellProvider>
          <Routes>
            <Route path="/financials/pricing" element={<PricingScreen row={pricingRow()} />} />
            <Route path="/financials/revenue" element={<Here />} />
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('Monthly')).toBeTruthy())

    const monthly = screen.getByText('Monthly').closest('tr') as HTMLElement
    /* One control in the lane, and it is the catalogue's own act. */
    expect(within(monthly).getAllByRole('button')).toHaveLength(1)
    expect(
      within(monthly).getByRole('button', { name: EN['fin.pricing.plan.action.edit'] as string }),
    ).toBeTruthy()

    await user.click(monthly)
    await waitFor(() =>
      expect(screen.getByTestId('here').textContent).toBe(
        '/financials/revenue?view=by-plan&plan=monthly',
      ),
    )
  })

  /** **R2-4** — and the keyboard arrives at the same place through the same door. */
  it('R2-4 — Enter on the focused row opens the same page the click does', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/financials/pricing']}>
        <ShellProvider>
          <Routes>
            <Route path="/financials/pricing" element={<PricingScreen row={pricingRow()} />} />
            <Route path="/financials/revenue" element={<Here />} />
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('Monthly')).toBeTruthy())

    const monthly = screen.getByText('Monthly').closest('tr') as HTMLElement
    monthly.focus()
    await user.keyboard('{Enter}')
    await waitFor(() =>
      expect(screen.getByTestId('here').textContent).toBe(
        '/financials/revenue?view=by-plan&plan=monthly',
      ),
    )
  })
})

/** Renders the location it was reached at, so a navigation is a readable fact. */
function Here() {
  const location = useLocation()
  return <span data-testid="here">{`${location.pathname}${location.search}`}</span>
}
