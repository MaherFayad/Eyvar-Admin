/**
 * **The shape control is a lens, not a new question.**
 *
 * The business owner, looking at it: *"when changing between those data
 * shouldn't refresh either you retain the choices I made"*.
 *
 * There is one `query`, one `ranQuery` and one `result` on the builder, and the
 * mode control rewrote all three — so `Trend → Funnel → Trend` threw the
 * trend's answer away, blanked the canvas to `unstarted`, and let the debounce
 * ask for it again. With auto-run on, that was every switch.
 *
 * **The control changed shape on 2026-09-04 and the behaviour did not.** The
 * five-button `Question` strip is deleted; its five options are entries in the
 * one `Chart type` menu, each resolving to a `(mode, chartType)` pair. A mode
 * entry still routes through `switchMode`, so every request count below is over
 * the same seam — and the counts themselves are the owner's own ruling, so they
 * are the one thing in this file that must never be relaxed to make a selector
 * work.
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

import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
const STALE_PREFIX = (copy('rb.canvas.stale').split('{')[0] as string).trim()
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

/**
 * **The mode strip is gone; its five options are entries in the `Chart type`
 * menu.** Same behaviour, one control instead of two — the owner collapsed a
 * five-button strip and a four-button chart-type strip that were both answering
 * *what shape is this answer*. `Trend` is reached as `Line chart`, because a
 * trend has to arrive wearing a chart type.
 *
 * Nothing about the REQUEST COUNTING below moved: `switchMode` is still what a
 * mode entry routes through, so *"a round trip costs no request"* is asserted
 * over exactly the same seam it always was.
 */
async function pick(
  user: ReturnType<typeof userEvent.setup>,
  control: string,
  optionKey: string,
) {
  await user.click(screen.getByRole('combobox', { name: copy(control) }))
  await user.click(
    await screen.findByRole('option', {
      /* A prefix: an illegal option carries its refusal INSIDE its own
         accessible name (D9 CQ-3), and `getByRole`'s `name` takes no `exact`. */
      name: (name: string) => name.startsWith(copy(optionKey)),
    }),
  )
}

const mode = (user: ReturnType<typeof userEvent.setup>, key: string) =>
  pick(user, 'rb.viz.label', `rb.viz.${key}`)

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
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

const FUNNEL: ReportQuery = {
  measures: [],
  groupBy: [],
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
    conversionWindow: null,
    mode: 'ordered',
    holdConstant: null,
    exclude: [],
    measuredAs: 'conversion',
    groupBy: null,
  },
}

describe('a round trip through another mode costs no request', () => {
  it('gives the trend back from memory — Trend → Funnel → Trend asks nothing', async () => {
    /* Two real 2100 ms waits left this test's only margin exposed to whatever
       else the process was doing at the same real-clock moment — the same
       class of flake `pageEditorAutosave.test.tsx` (AC-1201) fixed by driving
       the debounce with fake timers instead of waiting it out. The guarantee
       is a REQUEST COUNT, not an elapsed duration, so nothing about it moves. */
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const user = userEvent.setup({ delay: null })
      renderAt(reportQueryPath(TREND))
      await screen.findByText(AS_OF, { exact: false })
      const columns = columnCount()
      expect(columns).toBeGreaterThan(0)

      /* Armed after the seed has landed, so what follows counts the SWITCHES. */
      mockFailures.once(RUN)

      await mode(user, 'funnel')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(AUTO_RUN_DEBOUNCE_MS * 6)
      })
      await mode(user, 'line')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(AUTO_RUN_DEBOUNCE_MS * 6)
      })

      expect(mockFailures.peek(RUN)).not.toBeNull()
      /* And the answer is back on screen, not a skeleton and not the unstarted
         sentence: the same freshness line over the same number of buckets. */
      expect(screen.getByText(AS_OF, { exact: false })).toBeInTheDocument()
      expect(columnCount()).toBe(columns)
      expect(questionInUrl()?.grain).toBe('day')
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps a funnel’s rungs across a trip through Trend', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(FUNNEL))
    await screen.findByText(copy('rb.funnel.heading'))

    mockFailures.once(RUN)
    /* A funnel carries no `measures`, so the trend it becomes is `no-measure` —
       R8's second kind of empty. Nothing runs, which is the point: the funnel's
       configuration has to survive a mode that could not run at all. */
    await mode(user, 'line')
    await settle()
    await mode(user, 'funnel')
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

    /* One pick, on the grain. The answer that comes back has to be this one.
       The grain is a `Select` now, not a button strip — same key, same value,
       same effect on the question. */
    await pick(user, 'rb.control.grain', 'rb.grain.week')
    await waitFor(() => expect(questionInUrl()?.grain).toBe('week'), { timeout: 4000 })
    await waitFor(() => expect(columnCount()).not.toBe(atDay))
    const atWeek = columnCount()

    mockFailures.once(RUN)
    await mode(user, 'funnel')
    await settle()
    await mode(user, 'line')
    await settle()

    expect(mockFailures.peek(RUN)).not.toBeNull()
    expect(columnCount()).toBe(atWeek)
    expect(questionInUrl()?.grain).toBe('week')
    /* **The trigger SHOWS the restored lens** — which is what `aria-pressed`
       said while the grain was a button strip. The selection is read out rather
       than merely coloured (§7.5), so the control still tells an operator which
       grain came back with the remembered answer. */
    expect(screen.getByRole('combobox', { name: copy('rb.control.grain') })).toHaveTextContent(
      copy('rb.grain.week'),
    )
  })
})

/**
 * **The same ruling, one control along.**
 *
 * `Trend → Funnel → Trend` and `Line → Bar` were the same complaint —
 * *"when changing between those data shouldn't refresh"* — because both
 * controls were the shape of the answer rather than the question. Now that both
 * are entries in one menu, they get one fix: `askedOf` excludes `chartType`
 * from the *has this been asked* comparison, because `chartType` reaches
 * `planReportQuery` and no resolver. A line and a bar over one question are the
 * same numbers drawn twice.
 *
 * Untested until 2026-09-04, which is how it shipped as a defect in the first
 * place.
 */
describe('a redraw is not a re-ask — changing the chart type costs no request', () => {
  it('draws the same numbers as a bar without asking for them again', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(TREND))
    await screen.findByText(AS_OF, { exact: false })

    /* Armed after the seed has landed, so this counts the REDRAW. */
    mockFailures.once(RUN)
    await mode(user, 'bar')
    await settle()

    /* Nothing consumed it. Had the redraw issued a request, the canvas would
       be carrying the error state instead of the picture. */
    expect(mockFailures.peek(RUN)).not.toBeNull()
    expect(screen.queryByText(copy('rb.canvas.error'))).toBeNull()
    expect(screen.getByText(AS_OF, { exact: false })).toBeInTheDocument()
  })

  it('does not call the answer stale, because the question did not change', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(TREND))
    await screen.findByText(AS_OF, { exact: false })

    await mode(user, 'bar')
    await settle()

    /* `Showing the previous run` is a claim that the numbers no longer answer
       what is on screen. They do — only the shape they are drawn in moved — so
       that sentence must not appear at all. A blanket `role="status"` query
       would also catch §4.3's always-mounted active-bucket description on the
       chart region (`SeriesChart.tsx`), which says nothing about freshness and
       is legitimately present here; the staleness sentence is the claim under
       test, so it is named directly. */
    expect(screen.queryByText(STALE_PREFIX, { exact: false })).toBeNull()
  })

  it('still amends the address, because the chart type IS part of a saved report', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(TREND))
    await screen.findByText(AS_OF, { exact: false })

    await mode(user, 'bar')

    /* `askedOf` drops the chart type; `serialiseReportQuery` keeps it. A shared
       link, a saved report and an alert's route all carry the shape the
       operator chose — the exclusion is about what a RUN depends on, and
       nothing else. */
    await waitFor(() => expect(questionInUrl()?.chartType).toBe('bar'))
    expect(questionInUrl()?.measures).toEqual(TREND.measures)
  })
})

describe('the control — a mode with nothing remembered still runs, once', () => {
  it('issues exactly one request the first time a mode is opened', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(TREND))
    await screen.findByText(AS_OF, { exact: false })

    mockFailures.once(RUN)
    await mode(user, 'table')

    /* It ran: the armed failure was consumed and the canvas says so. Without
       this case every `peek` assertion above would be unfalsifiable. */
    expect(await screen.findByText(copy('rb.canvas.error'))).toBeInTheDocument()
    await waitFor(() => expect(mockFailures.peek(RUN)).toBeNull())
  })
})
