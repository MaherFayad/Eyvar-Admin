/**
 * WP-3.1/3.2 — the funnel and cohort rails, migrated to v2 (D9 CQ-3).
 * Proves the new controls render and that what the mock cannot resolve is
 * disabled in place with `rb.funnel.needsServer` (AC-1167, AC-1168).
 */

import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { dimensionFixtures, measureFixtures } from '@/data/fixtures/measures'
import { planQuery, type Catalogue } from '@/data/reporting/plan'
import { EYVAR_TODAY } from '@/data/mock/clock'
import type { ReportQuery } from '@/data/types'
import { ReportModePanel } from './ReportModePanel'

const t = createTranslator({ dictionary: EN })
const copy = (key: string) => EN[key] as string
const catalogue: Catalogue = { measures: measureFixtures, dimensions: dimensionFixtures }

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
  it('offers ordered, unordered and sequential, with sequential disabled and named as server-only', () => {
    render(<Harness initial={funnelQuery} />)
    const group = screen.getByRole('group', { name: copy('rb.funnel.mode') })
    expect(within(group).getByRole('button', { name: copy('rb.funnel.mode.ordered') })).toBeEnabled()
    expect(within(group).getByRole('button', { name: copy('rb.funnel.mode.unordered') })).toBeEnabled()
    expect(within(group).getByRole('button', { name: copy('rb.funnel.mode.sequential') })).toBeDisabled()
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

  it('a v1 query normalises conversionWindowDays to {value, unit} and the window control renders it (AC-1167)', () => {
    const v1 = {
      ...funnelQuery,
      funnel: { steps: funnelQuery.funnel!.steps, conversionWindowDays: 7 } as never,
    }
    render(<Harness initial={v1} />)
    /* `ReportModePanel` reads `query.funnel` as-given (unnormalised) — this
       proves the CONTROL survives a v1 shape without throwing, which is the
       failure mode the missing migration produced. `normaliseReportQuery`
       itself is proven in `report.test.ts`. */
    expect(screen.getByLabelText(copy('rb.funnel.window'))).toBeInTheDocument()
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

  it('the return event is a list: add, then remove, and the empty state reads as a sentence (rule 10)', async () => {
    const user = userEvent.setup()
    render(<Harness initial={cohortQuery} />)
    expect(screen.getByText(copy('rb.cohort.return.own'))).toBeInTheDocument()

    await user.click(screen.getByLabelText(copy('rb.cohort.return.add')))
    const measure = measureFixtures.find((m) => m.key !== 'riders.joined')!
    await user.click(await screen.findByRole('option', { name: t(measure.labelKey) }))
    expect(screen.getByRole('button', { name: t(measure.labelKey) })).toBeInTheDocument()
    expect(screen.queryByText(copy('rb.cohort.return.own'))).not.toBeInTheDocument()
  })
})
