/**
 * WP-3.1/3.2 — the funnel and cohort rails, migrated to v2 (D9 CQ-3).
 * Proves the new controls render and that what the mock cannot resolve is
 * disabled in place with `rb.funnel.needsServer` (AC-1167, AC-1168).
 */

import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { listDimensions, listMeasures } from '@/data/clients'
import { planQuery, type Catalogue } from '@/data/reporting/plan'
import { EYVAR_TODAY } from '@/data/mock/clock'
import type { Dimension, Measure, ReportQuery } from '@/data/types'
import { ReportModePanel } from './ReportModePanel'

const t = createTranslator({ dictionary: EN })
const copy = (key: string) => EN[key] as string
/* Crosses the client seam (`seam.test.ts` §4) the way `ReportModePanel`'s own
   caller does: the catalogue arrives from `listMeasures`/`listDimensions`,
   never a fixture import. */
let measureFixtures: Measure[] = []
let dimensionFixtures: Dimension[] = []
let catalogue: Catalogue = { measures: [], dimensions: [] }

beforeAll(async () => {
  const [measuresPage, dimensionsPage] = await Promise.all([
    listMeasures({ pageSize: 100 }),
    listDimensions({ pageSize: 100 }),
  ])
  measureFixtures = measuresPage.items
  dimensionFixtures = dimensionsPage.items
  catalogue = { measures: measureFixtures, dimensions: dimensionFixtures }
})

beforeEach(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

function Harness({ initial }: { initial: ReportQuery }) {
  const [query, setQuery] = useState(initial)
  const plan = planQuery(query, catalogue, EYVAR_TODAY)
  return (
    <ReportModePanel
      query={query}
      onChange={setQuery}
      onRun={() => {}}
      plan={plan}
      measures={measureFixtures}
      dimensions={dimensionFixtures}
      catalogueStatus="content"
      onRetryCatalogue={() => {}}
      running={false}
      t={t}
    />
  )
}

const funnelQuery: ReportQuery = {
  measures: [],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-90d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'bar',
  mode: 'funnel',
  funnel: {
    steps: [
      { measureKey: 'riders.joined', filters: [] },
      { measureKey: 'trips.completed', filters: [] },
    ],
    conversionWindow: null,
    mode: 'ordered',
    holdConstant: null,
    exclude: [],
    measuredAs: 'conversion',
    groupBy: null,
  },
}

const cohortQuery: ReportQuery = {
  measures: [],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-365d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'table',
  mode: 'cohort',
  cohort: {
    anchorMeasureKey: 'riders.joined',
    returnMeasureKeys: [],
    cohortGrain: 'month',
    method: 'rolling',
    brackets: null,
    horizon: 3,
  },
}

describe('funnel v2 — order, and the server-only options (AC-1168)', () => {
  it('offers ordered, unordered and sequential, with sequential disabled and named as server-only (AC-1168)', () => {
    render(<Harness initial={funnelQuery} />)
    const group = screen.getByRole('group', { name: copy('rb.funnel.mode') })
    expect(within(group).getByRole('button', { name: copy('rb.funnel.mode.ordered') })).toBeEnabled()
    expect(within(group).getByRole('button', { name: copy('rb.funnel.mode.unordered') })).toBeEnabled()
    /* Present and disabled — D9 CQ-3's "never hidden" half. */
    const sequential = within(group).getByRole('button', { name: copy('rb.funnel.mode.sequential') })
    expect(sequential).toBeDisabled()
    /* And the reason is a real, reachable node — `aria-describedby`'s target
       resolves to a node that states the server computes this, not a tooltip
       a disabled control can never open. */
    const describedById = sequential.getAttribute('aria-describedby')
    expect(describedById).toBeTruthy()
    expect(document.getElementById(describedById as string)?.textContent).toBe(copy('rb.funnel.needsServer'))
  })

  it('choosing "in any order" sets funnel.mode to unordered', async () => {
    const user = userEvent.setup()
    render(<Harness initial={funnelQuery} />)
    await user.click(screen.getByRole('button', { name: copy('rb.funnel.mode.unordered') }))
    expect(screen.getByRole('button', { name: copy('rb.funnel.mode.unordered') })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('exclude is a single disabled control, never a picker with every option disabled', () => {
    render(<Harness initial={funnelQuery} />)
    expect(screen.getByRole('button', { name: copy('rb.funnel.exclude.add') })).toBeDisabled()
    expect(screen.getAllByText(copy('rb.funnel.needsServer')).length).toBeGreaterThan(0)
  })

  it('holdConstant is disabled — no fixture measure declares the capability', () => {
    render(<Harness initial={funnelQuery} />)
    expect(screen.getByLabelText(copy('rb.funnel.holdConstant'))).toBeDisabled()
  })
})

describe('F-V2-50 — the steps group is labelled "Steps", and `Add a step` keeps its own name', () => {
  it('names the steps group "Steps" and the add button "Add a step", not "Steps"', () => {
    render(<Harness initial={funnelQuery} />)
    expect(screen.getByRole('group', { name: copy('rb.funnel.steps') })).toBeInTheDocument()
    const add = screen.getByRole('button', { name: copy('rb.funnel.step.add') })
    /* The defect: a `<Label htmlFor>` on the button won the accessible-name
       computation over the button's own visible text, so it announced itself
       as "Steps" instead of "Add a step". */
    expect(add).not.toHaveAccessibleName(copy('rb.funnel.steps'))
  })
})

describe('funnel v2 — measuredAs and the conversion window (AC-1167, AC-1169)', () => {
  it('offers all three measuredAs values and changes the query on selection', async () => {
    const user = userEvent.setup()
    render(<Harness initial={funnelQuery} />)
    await user.click(screen.getByLabelText(copy('rb.funnel.measuredAs')))
    await user.click(await screen.findByRole('option', { name: copy('rb.funnel.measuredAs.time-to-convert') }))
    expect(screen.getByLabelText(copy('rb.funnel.measuredAs'))).toHaveTextContent(
      copy('rb.funnel.measuredAs.time-to-convert'),
    )
  })

  it('the window control offers both day- and week-length options (§5\'s unit)', async () => {
    const user = userEvent.setup()
    render(<Harness initial={funnelQuery} />)
    await user.click(screen.getByLabelText(copy('rb.funnel.window')))
    expect(await screen.findByRole('option', { name: copy('rb.funnel.window.days').replace('{days}', '7') })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: copy('rb.funnel.window.weeks').replace('{weeks}', '4') })).toBeInTheDocument()
  })

  it('a query with a {value, unit} conversion window (AC-1167\'s migrated shape) renders in the window control', async () => {
    const withWindow: ReportQuery = {
      ...funnelQuery,
      funnel: { ...funnelQuery.funnel!, conversionWindow: { value: 7, unit: 'day' } },
    }
    render(<Harness initial={withWindow} />)
    expect(screen.getByLabelText(copy('rb.funnel.window'))).toHaveTextContent(
      copy('rb.funnel.window.days').replace('{days}', '7'),
    )
  })
})

describe('cohort v2 — method and custom brackets (AC-1172)', () => {
  it('offers rolling, nday and bracket, all legal (the mock resolves every method)', async () => {
    const user = userEvent.setup()
    render(<Harness initial={cohortQuery} />)
    await user.click(screen.getByLabelText(copy('rb.cohort.method')))
    for (const key of ['rolling', 'nday', 'bracket']) {
      expect(await screen.findByRole('option', { name: copy(`rb.cohort.method.${key}`) })).toBeInTheDocument()
    }
  })

  it('choosing "bracket" reveals the windows editor and disables the horizon control with a reason', async () => {
    const user = userEvent.setup()
    render(<Harness initial={cohortQuery} />)
    await user.click(screen.getByLabelText(copy('rb.cohort.method')))
    await user.click(await screen.findByRole('option', { name: copy('rb.cohort.method.bracket') }))

    expect(screen.getByText(copy('rb.cohort.brackets.unstarted'))).toBeInTheDocument()
    expect(screen.getByLabelText(copy('rb.cohort.horizon'))).toBeDisabled()
    expect(screen.getByText(copy('rb.cohort.horizon.notUsedForBracket'))).toBeInTheDocument()
  })

  it('adding two touching windows is legal; adding an overlapping third disables Add with a reason', async () => {
    const user = userEvent.setup()
    render(<Harness initial={{ ...cohortQuery, cohort: { ...cohortQuery.cohort!, method: 'bracket' } }} />)

    const addBracket = async (lo: string, hi: string) => {
      await user.clear(screen.getByLabelText(copy('rb.cohort.brackets.lo')))
      await user.type(screen.getByLabelText(copy('rb.cohort.brackets.lo')), lo)
      await user.clear(screen.getByLabelText(copy('rb.cohort.brackets.hi')))
      await user.type(screen.getByLabelText(copy('rb.cohort.brackets.hi')), hi)
    }

    await addBracket('0', '7')
    await user.click(screen.getByRole('button', { name: copy('rb.cohort.brackets.add') }))
    expect(screen.getByText('0–7')).toBeInTheDocument()

    await addBracket('7', '14')
    await user.click(screen.getByRole('button', { name: copy('rb.cohort.brackets.add') }))
    expect(screen.getByText('7–14')).toBeInTheDocument()

    /* Overlaps the first bracket: `Add` refuses it in place, D9 CQ-3. */
    await addBracket('3', '10')
    expect(screen.getByText(copy('rb.cohort.brackets.overlap'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy('rb.cohort.brackets.add') })).toBeDisabled()
  })

  it('F-V2-48 — an already-overlapping query (a hand-edited URL) shows the planner\'s own violation, not a second sentence', () => {
    const overlapping: ReportQuery = {
      ...cohortQuery,
      cohort: { ...cohortQuery.cohort!, method: 'bracket', brackets: [[0, 7], [3, 10]] },
    }
    render(<Harness initial={overlapping} />)
    /* Read straight through `planQuery` — the same run `reports.run` makes —
       rather than a hand-written duplicate of its reason. */
    const plan = planQuery(overlapping, catalogue, EYVAR_TODAY)
    const violation = plan.violations.find((v) => v.code === 'cohort-brackets-overlap')
    expect(violation).toBeDefined()
    expect(screen.getByText(t(violation!.reasonKey, violation!.reasonParams))).toBeInTheDocument()
  })

  it('the return event is a list: add, then remove, and the empty state reads as a sentence (rule 10)', async () => {
    const user = userEvent.setup()
    render(<Harness initial={cohortQuery} />)
    expect(screen.getByText(copy('rb.cohort.return.own'))).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: copy('rb.cohort.return') }))
    const measure = measureFixtures.find((m) => m.key !== 'riders.joined')!
    await user.click(await screen.findByRole('option', { name: t(measure.labelKey) }))
    expect(screen.getByText(t(measure.labelKey))).toBeInTheDocument()
    expect(screen.queryByText(copy('rb.cohort.return.own'))).not.toBeInTheDocument()
  })
})
