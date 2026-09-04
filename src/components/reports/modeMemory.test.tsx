/**
 * **The Question strip is a lens, not a new question.**
 *
 * The business owner, looking at it: *"when changing between those data
 * shouldn't refresh either you retain the choices I made"*.
 *
 * There is one `query`, one `ranQuery` and one `result` on the builder, and the
 * strip rewrote all three — so `Trend → Funnel → Trend` threw the trend's
 * answer away, blanked the canvas to `unstarted`, and let the debounce ask for
 * it again. With auto-run on, that was every click of the strip.
 *
 * ## Counting requests at the seam, without a spy
 *
 * `vi.spyOn` on a client namespace does not intercept the barrel's live
 * binding, so a negative assertion passes vacuously — and *"nothing was
 * requested"* is the whole of this file. The seam's own instrument is used
 * instead: `mockFailures.once('reports.run')` arms a SINGLE failure that the
 * next call consumes, and `peek` says whether it is still armed.
 *
 *   `peek` non-null after the wait  →  `reports.run` was never called
 *   `peek` null                     →  it was called, exactly once
 *
 * The third block is the control: a mode with NO cached answer must consume it,
 * or every "nothing ran" above would be unfalsifiable.
 *
 * A note on what is NOT asserted here: `run` deliberately keeps the previous
 * picture up while a re-run is in flight (§8.3 state 2), so a refetch of the
 * same question is invisible in the DOM. That is why this is a seam count and
 * why the browser probe (`scratch/mode-switch.mjs`) measures the other half —
 * that the canvas never blanks and the lens never resets.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import {
  REPORT_QUERY_PARAM,
  deserialiseReportQuery,
  disableMockLatency,
  mockFailures,
  reportQueryPath,
  resetDataLayer,
} from '@/data/clients'
import type { ReportQuery } from '@/data/types'
import { AUTO_RUN_DEBOUNCE_MS } from '@/screens/reports/ReportBuilder'
import { ReportsScreen } from '@/screens/reports/ReportsScreen'
import { REPORTS_EN } from '@/screens/reports/copy'

const RUN = 'reports.run'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  mockFailures.clear()
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

const copy = (key: string) => REPORTS_EN[key] as string
const AS_OF = (copy('rb.canvas.asOf').split('{')[0] as string).trim()
const settle = () => new Promise((resolve) => setTimeout(resolve, AUTO_RUN_DEBOUNCE_MS * 6))

function Probe() {
  const location = useLocation()
  return <span data-testid="search">{location.search}</span>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <ReportsScreen />
        <Probe />
      </ShellProvider>
    </MemoryRouter>,
  )
}

function questionInUrl(): ReportQuery | null {
  const encoded = new URLSearchParams(screen.getByTestId('search').textContent ?? '').get(
    REPORT_QUERY_PARAM,
  )
  return encoded ? deserialiseReportQuery(encoded) : null
}

const strip = () => screen.findByRole('group', { name: copy('rb.control.mode') })
const mode = async (key: string) =>
  within(await strip()).getByRole('button', { name: copy(`rb.mode.${key}`) })

/** The result canvas, so a sentence in the rail is never read as one on it. */
const canvas = () => screen.getByRole('region', { name: copy('rb.canvas.heading') })

/**
 * One column per bucket in the §A11 numbers table. It is the cheapest visible
 * consequence of the GRAIN, which is what makes it the right observable for
 * *"the edited answer came back, not the pre-edit one"*.
 */
function columnCount(): number {
  const table = canvas().querySelector('table')
  return table ? table.querySelectorAll('thead th').length : 0
}

const TREND: ReportQuery = {
  measures: [{ key: 'captains.registered' }],
  groupBy: null,
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

const FUNNEL: ReportQuery = {
  measures: [],
  groupBy: null,
  filters: [],
  window: { kind: 'preset', preset: 'last-365d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'bar',
  mode: 'funnel',
  funnel: {
    steps: [
      { measureKey: 'riders.joined', filters: [] },
      { measureKey: 'trips.completed', filters: [] },
    ],
    conversionWindowDays: null,
  },
}

describe('a round trip through another mode costs no request', () => {
  it('gives the trend back from memory — Trend → Funnel → Trend asks nothing', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(TREND))
    await screen.findByText(AS_OF, { exact: false })
    const columns = columnCount()
    expect(columns).toBeGreaterThan(0)

    /* Armed after the seed has landed, so what follows counts the SWITCHES. */
    mockFailures.once(RUN)

    await user.click(await mode('funnel'))
    await settle()
    await user.click(await mode('trend'))
    await settle()

    expect(mockFailures.peek(RUN)).not.toBeNull()
    /* And the answer is back on screen, not a skeleton and not the unstarted
       sentence: the same freshness line over the same number of buckets. */
    expect(screen.getByText(AS_OF, { exact: false })).toBeInTheDocument()
    expect(columnCount()).toBe(columns)
    expect(questionInUrl()?.grain).toBe('day')
  })

  it('keeps a funnel’s rungs across a trip through Trend', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(FUNNEL))
    await screen.findByText(copy('rb.funnel.heading'))

    mockFailures.once(RUN)
    /* A funnel carries no `measures`, so the trend it becomes is `no-measure` —
       R8's second kind of empty. Nothing runs, which is the point: the funnel's
       configuration has to survive a mode that could not run at all. */
    await user.click(await mode('trend'))
    await settle()
    await user.click(await mode('funnel'))
    await settle()

    expect(mockFailures.peek(RUN)).not.toBeNull()
    expect(screen.getByText(copy('rb.funnel.heading'))).toBeInTheDocument()
    /* Read back through the data layer's own encoding rather than off the
       panel: the address is the storage adapter, and a mode restored from
       memory has to write what it restored (AC-855). */
    const back = questionInUrl()
    expect(back?.mode).toBe('funnel')
    expect(back?.funnel?.steps.map((s) => s.measureKey)).toEqual([
      'riders.joined',
      'trips.completed',
    ])
  })

  it('hands back the EDITED answer, not the one from before the edit', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(TREND))
    await screen.findByText(AS_OF, { exact: false })
    const atDay = columnCount()

    /* One click, on the grain. The answer that comes back has to be this one. */
    await user.click(screen.getByRole('button', { name: copy('rb.grain.week') }))
    await waitFor(() => expect(questionInUrl()?.grain).toBe('week'), { timeout: 4000 })
    await waitFor(() => expect(columnCount()).not.toBe(atDay))
    const atWeek = columnCount()

    mockFailures.once(RUN)
    await user.click(await mode('funnel'))
    await settle()
    await user.click(await mode('trend'))
    await settle()

    expect(mockFailures.peek(RUN)).not.toBeNull()
    expect(columnCount()).toBe(atWeek)
    expect(questionInUrl()?.grain).toBe('week')
    expect(
      screen.getByRole('button', { name: copy('rb.grain.week') }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('the control — a mode with nothing remembered still runs, once', () => {
  it('issues exactly one request the first time a mode is opened', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(TREND))
    await screen.findByText(AS_OF, { exact: false })

    mockFailures.once(RUN)
    await user.click(await mode('table'))

    /* It ran: the armed failure was consumed and the canvas says so. Without
       this case every `peek` assertion above would be unfalsifiable. */
    expect(await screen.findByText(copy('rb.canvas.error'))).toBeInTheDocument()
    await waitFor(() => expect(mockFailures.peek(RUN)).toBeNull())
  })
})
