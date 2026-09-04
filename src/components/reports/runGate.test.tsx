/**
 * **N-4 — one legality gate, and both entry points behind it.**
 *
 * `plan.violations.length === 0` used to gate the debounce effect and, in a
 * second copy, the seed effect. The address effect between them had none, so a
 * link carrying a question the planner already refuses ran it — and under
 * `DATA_SOURCE === 'http'` that is a `POST /reports/run` the client knew would
 * fail. The seed's copy was then dead code, because the effect below re-ran the
 * same query ungated. The gate is now the first statement in `run`.
 *
 * ## How a run is COUNTED here, without a spy
 *
 * `vi.spyOn` on a client namespace does not intercept the barrel's live
 * binding: a negative assertion passes vacuously, which is precisely the shape
 * of every assertion in this file. So the seam's own instrument is used
 * instead — `mockFailures.once('reports.run')` arms a **single** failure that
 * the next call CONSUMES, and `peek` reports whether it is still there:
 *
 *   `peek` non-null after the wait  →  `reports.run` was never called
 *   `peek` null                     →  it was called exactly once
 *
 * That is a count taken at the seam, by the seam, and the armed failure doubles
 * as the discriminator: had the gate leaked, the canvas would carry the error
 * state rather than the refusal.
 *
 * The control case at the bottom is not optional. An instrument that cannot
 * detect a run would make every assertion above it vacuous, so a LEGAL question
 * is put through the same armed failure and must consume it.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import {
  REPORT_QUERY_PARAM,
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
/** The freshness sentence without its interpolated instant. Its presence is a run that landed. */
const AS_OF = (copy('rb.canvas.asOf').split('{')[0] as string).trim()
/** Well past the debounce, so "nothing ran" means nothing ran rather than nothing ran YET. */
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

const questionInUrl = () =>
  new URLSearchParams(screen.getByTestId('search').textContent ?? '').get(REPORT_QUERY_PARAM)

/** A legal question, composed here rather than read out of the fixtures. */
const LEGAL: ReportQuery = {
  measures: [{ key: 'captains.registered' }],
  groupBy: null,
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

/**
 * The same question with its window turned round. `window-inverted` is the
 * planner's refusal and it is chosen deliberately: it is reachable ONLY from a
 * composed link and from the date picker, so it cannot be confused with the
 * unstarted question, which carries `no-measure` and is not a refusal at all.
 */
const INVERTED: ReportQuery = {
  ...LEGAL,
  window: { kind: 'absolute', from: '2026-06-25', to: '2026-06-01' },
}

describe('an illegal question is never sent — by URL', () => {
  it('refuses a composed link locally, states why on the canvas, and requests nothing', async () => {
    mockFailures.once(RUN)
    renderAt(reportQueryPath(INVERTED))

    /* The refusal, on the canvas, in the same words `invalid-query` produces —
       a shared link that cannot be answered has to say what is wrong with it. */
    expect(await screen.findByText(copy('rb.canvas.invalid'))).toBeInTheDocument()
    /* Scoped to the canvas. The same sentence renders a second time in the
       RAIL, beside the control that composed it — that is §5.3 working, and an
       unscoped match would report it as an ambiguity rather than a pass. */
    const canvas = screen.getByRole('region', { name: copy('rb.canvas.heading') })
    expect(
      within(canvas).getByText(
        copy('rb.violation.windowInverted')
          .replace('{to}', '2026-06-01')
          .replace('{from}', '2026-06-25'),
      ),
    ).toBeInTheDocument()

    await settle()
    /* Nothing consumed the armed failure, so `reports.run` was never called.
       Had it been, the canvas would carry the error state instead. */
    expect(mockFailures.peek(RUN)).not.toBeNull()
    expect(screen.queryByText(copy('rb.canvas.error'))).toBeNull()
    expect(screen.queryByText(AS_OF, { exact: false })).toBeNull()
  })

  it('leaves the address exactly as the link wrote it', async () => {
    const path = reportQueryPath(INVERTED)
    renderAt(path)
    await screen.findByText(copy('rb.canvas.invalid'))
    await settle()
    expect(screen.getByTestId('search').textContent).toBe(path.slice(path.indexOf('?')))
  })
})

describe('an illegal question is never sent — by editing', () => {
  it('runs the legal question once, then requests nothing for the illegal edit', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(LEGAL))
    await screen.findByText(AS_OF, { exact: false })
    const asked = questionInUrl()

    /* Armed AFTER the seed has landed, so the count below is a count of what
       the EDIT caused and not of what opening the link caused. */
    mockFailures.once(RUN)

    /* A funnel with no rungs is `funnel-needs-steps`. Reached through the
       strip, which is the control an operator has. */
    const strip = await screen.findByRole('group', { name: copy('rb.control.mode') })
    await user.click(within(strip).getByRole('button', { name: copy('rb.mode.funnel') }))
    await settle()

    expect(mockFailures.peek(RUN)).not.toBeNull()
    expect(screen.queryByText(copy('rb.canvas.error'))).toBeNull()
    /* §3.2 — the primary is off rather than failing after submit, and the
       address still holds the last question that was actually asked. */
    expect(screen.getByRole('button', { name: copy('rb.control.run') })).toBeDisabled()
    expect(questionInUrl()).toBe(asked)
  })
})

describe('the instrument, and the run it must be able to see', () => {
  it('consumes the armed failure on a LEGAL composed link, and shows the error state', async () => {
    mockFailures.once(RUN)
    renderAt(reportQueryPath(LEGAL))

    /* AC-846 — the error is IN the canvas and the question is not lost. Its
       presence here is what makes every negative assertion above falsifiable. */
    expect(await screen.findByText(copy('rb.canvas.error'))).toBeInTheDocument()
    await waitFor(() => expect(mockFailures.peek(RUN)).toBeNull())
  })

  it('still opens a new report on the unstarted canvas rather than a refusal', async () => {
    /* The empty question carries `no-measure`, and R8's second kind of empty is
       not a refusal: *"choose a measure"* is the planner agreeing, not
       objecting. Nothing runs, and nothing says the report cannot run. */
    mockFailures.once(RUN)
    renderAt('/management/reports?q=')
    expect(await screen.findByText(copy('rb.canvas.unstarted'))).toBeInTheDocument()
    await settle()
    expect(mockFailures.peek(RUN)).not.toBeNull()
    expect(screen.queryByText(copy('rb.canvas.invalid'))).toBeNull()
  })
})
