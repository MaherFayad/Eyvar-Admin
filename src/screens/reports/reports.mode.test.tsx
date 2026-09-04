/**
 * **P7-T3 / P7-T4 / P7-T5, as tests an operator's behaviour can be read off.**
 *
 * The merge had exactly one way to fail that nobody would notice: keep
 * `ReportStudio`'s five modes and lose `ReportBuilder`'s URL-as-storage,
 * producing a builder whose output cannot be sent to anyone. **AC-853 · AC-854
 * · AC-855 exist for that failure**, so the first block below is one round-trip
 * per mode: a link opens the report *in that mode*, it runs itself, and `Run`
 * writes a link that deserialises back to the same question.
 *
 * Two disciplines this project learned expensively and this file keeps:
 *
 * **No bare `vi.spyOn` on a client namespace.** A spy with no implementation
 * does not intercept the barrel's live binding: a positive assertion fails
 * loudly and a **negative one passes vacuously**. Nothing here spies.
 *
 * **No fixture is imported.** `seam.test.ts` forbids it outside `src/data`, and
 * a test that reads the seed array is testing the seed rather than the
 * contract. The queries below are composed here; the saved reports and
 * dashboards are read through their clients.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import {
  REPORT_QUERY_PARAM,
  deserialiseReportQuery,
  disableMockLatency,
  listDashboards,
  reportQueryPath,
  resetDataLayer,
} from '@/data/clients'
import { normaliseReportQuery, type ReportMode, type ReportQuery } from '@/data/types'
import { DashboardDetailScreen } from './DashboardDetailScreen'
import { REPORTS_EN } from './copy'
import { ReportsScreen } from './ReportsScreen'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither and Radix's select calls both on the trigger.
     Same reasoning as `reports.test.tsx`; kept local to each file. */
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

/** Reads the address bar out of the router, so a push can be asserted on. */
function LocationProbe() {
  const location = useLocation()
  return <span data-testid="search">{location.search}</span>
}

function renderAt(path: string, node: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        {node}
        <LocationProbe />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/* ────────────────────────── the five questions ─────────────────────────── */

const base: ReportQuery = {
  measures: [],
  groupBy: null,
  filters: [],
  window: { kind: 'preset', preset: 'last-365d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'table',
}

const QUERIES: Record<ReportMode, ReportQuery> = {
  trend: {
    ...base,
    measures: [{ key: 'trips.completed' }],
    window: { kind: 'preset', preset: 'last-30d' },
    grain: 'day',
    chartType: 'line',
    mode: 'trend',
  },
  table: {
    ...base,
    measures: [{ key: 'trips.completed' }],
    window: { kind: 'preset', preset: 'last-30d' },
    grain: 'day',
    mode: 'table',
  },
  funnel: {
    ...base,
    chartType: 'bar',
    mode: 'funnel',
    funnel: {
      steps: [
        { measureKey: 'riders.joined', filters: [] },
        { measureKey: 'trips.completed', filters: [] },
      ],
      conversionWindowDays: null,
    },
  },
  cohort: {
    ...base,
    mode: 'cohort',
    cohort: {
      anchorMeasureKey: 'riders.joined',
      returnMeasureKey: null,
      cohortGrain: 'month',
      horizon: 3,
    },
  },
  journey: {
    ...base,
    mode: 'journey',
    journey: { rootMeasureKey: 'riders.joined', depth: 2 },
  },
}

const MODES = Object.keys(QUERIES) as ReportMode[]

/**
 * **The five modes are entries in the one `Chart type` menu now**, not a
 * five-button strip beside a four-button chart-type strip. Seven entries, each
 * resolving to a `(mode, chartType)` pair — so a trend is reached by the chart
 * type it is drawn as, and the four modes that fix their own shape are reached
 * by their own name. `ReportMode` did not change and neither did the URL.
 */
const VIZ_OF: Record<ReportMode, string> = {
  /* `trend` has three entries; the one this file's trend carries is `line`. */
  trend: 'line',
  table: 'table',
  funnel: 'funnel',
  cohort: 'cohort',
  journey: 'journey',
}

/** The one control that says which of the five questions is on screen. */
const shapeMenu = () => screen.findByRole('combobox', { name: copy('rb.viz.label') })

/* ─────────── AC-853 / AC-854 / AC-855 — every mode is a link ───────────── */

describe('AC-853, AC-855 — every one of the five modes survives the URL', () => {
  it.each(MODES)('opens a %s from a link alone, in that mode', async (mode) => {
    renderAt(reportQueryPath(QUERIES[mode]), <ReportsScreen />)

    /* The mode switcher is on screen in every mode and reads the mode the link
       carried — the operator can see which of the five questions they are
       looking at, and change it.

       **Asserted on the trigger's text, which is now the discriminating
       observable.** It used to be `aria-pressed` on one of five always-rendered
       buttons, because a text check would have matched all five. A closed menu
       renders exactly one label — the live one — so reading it IS the check
       `aria-pressed` used to be, and it is the same §7.5 promise: the selection
       is read out, not merely coloured. */
    const menu = await shapeMenu()
    await waitFor(() =>
      expect(menu).toHaveTextContent(copy(`rb.viz.${VIZ_OF[mode]}`)),
    )
  })

  it.each(MODES)('runs a %s that arrived composed, without a second click', async (mode) => {
    /* AC-855's whole point: the person who was sent the link sees the report,
       not an unstarted canvas. Four of the five modes carry no `measures`, so
       this is the assertion that catches a seed keyed on the wrong field. */
    renderAt(reportQueryPath(QUERIES[mode]), <ReportsScreen />)
    expect(
      await screen.findByText(copy('rb.canvas.asOf').replace(' {time}', ''), { exact: false }),
    ).toBeInTheDocument()
  })

  it.each(MODES)('writes a link from %s that deserialises back to the same question', async (mode) => {
    const user = userEvent.setup()
    const query = QUERIES[mode]
    renderAt(reportQueryPath(query), <ReportsScreen />)

    /* `Run` is the ONE thing that pushes a history entry — one entry per
       question asked, which is what makes Back mean anything (AC-854). */
    const run = await screen.findByRole('button', { name: copy('rb.control.run') })
    await user.click(run)

    await waitFor(() => {
      const search = screen.getByTestId('search').textContent ?? ''
      const encoded = new URLSearchParams(search).get(REPORT_QUERY_PARAM)
      expect(encoded).toBeTruthy()
      /* Lossless up to `normaliseReportQuery` — the one thing that collapses
         is the default mode, which is what keeps a pre-P7 link byte-identical. */
      expect(deserialiseReportQuery(encoded ?? '')).toEqual(normaliseReportQuery(query))
    })
  })
})

/* ───────────────────── the three surfaces, on screen ───────────────────── */

describe('P7-T3 — each mode renders its own answer, not a trend', () => {
  it('draws a funnel as ordered rungs with the drop-off between them', async () => {
    renderAt(reportQueryPath(QUERIES.funnel), <ReportsScreen />)

    const canvas = await screen.findByRole('region', { name: copy('rb.canvas.heading') })
    expect(await within(canvas).findByText(copy('rb.funnel.heading'))).toBeInTheDocument()

    /* Two rungs, in step order, each naming its own measure. The order is the
       funnel; a set that rendered them by rank would be a bar chart. */
    expect(within(canvas).getByText(/Step 1/)).toBeInTheDocument()
    expect(within(canvas).getByText(/Step 2/)).toBeInTheDocument()

    /* The conversion is labelled as being against step 1, because the drop-off
       beside it is against the previous step and the two are different numbers. */
    expect(within(canvas).getAllByText(/of step 1/).length).toBeGreaterThan(0)
  })

  it('draws a cohort matrix with a column per interval and a size per row', async () => {
    renderAt(reportQueryPath(QUERIES.cohort), <ReportsScreen />)

    const canvas = await screen.findByRole('region', { name: copy('rb.canvas.heading') })
    const table = await within(canvas).findByRole('table')

    /* M0…M3 — the horizon the query asked for, and the exact vocabulary
       `reporting/cohorts.ts` computes in. */
    for (const interval of ['M0', 'M1', 'M2', 'M3']) {
      expect(within(table).getByRole('columnheader', { name: interval })).toBeInTheDocument()
    }
    /* R5-15 — a percentage never travels without the base it is a share of. */
    expect(
      within(table).getByRole('columnheader', { name: copy('rb.cohort.col.size') }),
    ).toBeInTheDocument()
  })

  it('draws a journey as paths, and counts the people who went nowhere', async () => {
    renderAt(reportQueryPath(QUERIES.journey), <ReportsScreen />)

    const canvas = await screen.findByRole('region', { name: copy('rb.canvas.heading') })
    expect(await within(canvas).findByText(copy('rb.journey.heading'))).toBeInTheDocument()

    /* Dropping the subjects who did nothing is how a journey diagram claims a
       100 % continuation rate, so they are counted and stated. */
    expect(within(canvas).getByText(/did nothing else inside this range/)).toBeInTheDocument()
  })

  it('keeps the trend on the chart canvas, unchanged', async () => {
    renderAt(reportQueryPath(QUERIES.trend), <ReportsScreen />)
    const canvas = await screen.findByRole('region', { name: copy('rb.canvas.heading') })
    /* The measure picker is the trend rail's first control and the three
       subject modes do not have one — this is what separates the two rails. */
    expect(await screen.findByLabelText(copy('rb.control.measure'))).toBeInTheDocument()
    expect(within(canvas).queryByText(copy('rb.funnel.heading'))).not.toBeInTheDocument()
  })
})

/* ───────────── switching mode composes a legal question, in place ──────── */

describe('P7-T3 — the mode switcher does not compose an illegal query', () => {
  it('moves a trend to a funnel and asks for steps, not for a chart type', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(QUERIES.trend), <ReportsScreen />)

    /* Through the `Chart type` menu — the mode strip is deleted and its five
       options live there. A mode entry is never disabled: *a mode is never
       illegal, its configuration is*, and greying out `Funnel` would hide the
       only control that could fix the funnel. */
    await user.click(await shapeMenu())
    await user.click(
      await screen.findByRole('option', {
        name: (name: string) => name.startsWith(copy('rb.viz.funnel')),
      }),
    )

    /* The funnel rail, with the reason the planner gives for an empty one —
       disabled in place with a sentence, never a blank panel (D9 CQ-3). */
    expect(await screen.findByText(copy('rb.funnel.steps.unstarted'))).toBeInTheDocument()
    /* **The sentence moved carriers, and the criterion did not.**

       It used to print as a paragraph under the `Steps` group. The owner asked
       for the rails to stop doing that — *"remove all those dumb overwhelming
       descriptions you are adding everywhere and add i icon when hovered"* — so
       every field group's reasons are now an `InfoHint` on its label row, and
       a tooltip's content is not in the DOM until it opens.

       What D9 CQ-3 actually requires is unchanged and is what is asserted:
       the planner's own sentence, reachable, naming why the funnel is refused.
       So the hint is opened and the sentence read out of it, rather than the
       assertion being softened to something a blank panel would also pass. */
    const hints = screen.getAllByRole('button', { name: copy('rb.hint.show') })
    let reason: HTMLElement | null = null
    for (const hint of hints) {
      await user.hover(hint)
      const tip = await screen.findByRole('tooltip')
      if (/A funnel needs at least 2 steps/.test(tip.textContent ?? '')) {
        reason = tip
        break
      }
      await user.unhover(hint)
    }
    expect(reason, 'the planner’s refusal is reachable from the Steps group').not.toBeNull()

    /* §3.2 — the primary is off while the question carries a violation,
       rather than failing after submit. */
    expect(screen.getByRole('button', { name: copy('rb.control.run') })).toBeDisabled()
  })
})

/* ─────────────────────── P7-T5 — the dashboards view ───────────────────── */

describe('P7-T5 — the third view exists and is reachable', () => {
  it('renders the dashboards list at `?view=dashboards` instead of the library', async () => {
    renderAt('/management/reports?view=dashboards', <ReportsScreen />)
    /* It used to fall through the screen's two-value guard and render the
       report library — unreachable rather than broken. */
    expect(await screen.findByRole('button', { name: copy('rb.dashboards.new') })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy('rb.library.new') })).not.toBeInTheDocument()
  })

  it('offers all three views as tabs, so none of them is a URL you have to know', async () => {
    renderAt('/management/reports?view=dashboards', <ReportsScreen />)
    for (const key of ['rb.view.reports', 'rb.view.dashboards', 'rb.view.alerts'] as const) {
      expect(await screen.findByRole('tab', { name: copy(key) })).toBeInTheDocument()
    }
  })

  it('renders one dashboard’s tiles, and the missing one says what it used to be', async () => {
    /* Read through the client, never out of the fixture module. The dangling
       tile is the state §11.3 requires and only a fixture can reach (AC-869). */
    const dashboards = (await listDashboards({ pageSize: 50 })).items
    const withMissing = dashboards.find((d) => d.tiles.some((tile) => tile.reportId === 'RPT-DELETED'))
    expect(withMissing, 'a dashboard with a dangling tile').toBeTruthy()

    render(
      <MemoryRouter initialEntries={[`/management/reports/dashboards/${withMissing!.id}`]}>
        <ShellProvider>
          <Routes>
            <Route
              path="/management/reports/dashboards/:dashboardId"
              element={<DashboardDetailScreen />}
            />
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText(copy('rb.dashboard.tile.missing'))).toBeInTheDocument()
    /* `pinnedName` is a display fallback and this is the only case it is read
       in — so a tile whose report has vanished can still say what it was. */
    const gone = withMissing!.tiles.find((tile) => tile.reportId === 'RPT-DELETED')!
    expect(screen.getByText(gone.pinnedName)).toBeInTheDocument()
  })

  it('gives a dashboard with no tiles the first-run empty for that dashboard', async () => {
    const dashboards = (await listDashboards({ pageSize: 50 })).items
    const empty = dashboards.find((d) => d.tiles.length === 0)
    expect(empty, 'a dashboard with no tiles').toBeTruthy()

    render(
      <MemoryRouter initialEntries={[`/management/reports/dashboards/${empty!.id}`]}>
        <ShellProvider>
          <Routes>
            <Route
              path="/management/reports/dashboards/:dashboardId"
              element={<DashboardDetailScreen />}
            />
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )

    /* R8's FIRST kind, and it is about THIS dashboard rather than about there
       being no dashboards: a heading, a line and an action (AC-865). */
    expect(await screen.findByText(copy('rb.dashboard.empty.heading'))).toBeInTheDocument()
    /* Two of them, deliberately: the page header carries the same action for
       a board that already has tiles, and R8 requires the empty state to carry
       one of its own rather than point at the header. */
    expect(
      screen.getAllByRole('button', { name: copy('rb.dashboard.empty.action') }).length,
    ).toBeGreaterThan(0)
  })

  it('moves a tile with a button, because §7 does not exempt drag-and-drop', async () => {
    const dashboards = (await listDashboards({ pageSize: 50 })).items
    const many = dashboards.find((d) => d.tiles.length > 1)
    expect(many, 'a dashboard with more than one tile').toBeTruthy()
    const first = [...many!.tiles].sort((a, b) => a.order - b.order)[0]!

    render(
      <MemoryRouter initialEntries={[`/management/reports/dashboards/${many!.id}`]}>
        <ShellProvider>
          <Routes>
            <Route
              path="/management/reports/dashboards/:dashboardId"
              element={<DashboardDetailScreen />}
            />
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )

    /* AC-871 — a real button with an accessible name that says which tile it
       moves, present always rather than on hover (§7.3). */
    const down = await screen.findByRole('button', {
      name: copy('rb.dashboard.tile.moveDown').replace('{name}', first.pinnedName),
    })
    expect(down).toBeEnabled()

    /* `Move up` on the FIRST tile is disabled in place, not missing: a control
       that disappears at the end of a list teaches nothing about the list. */
    expect(
      screen.getByRole('button', {
        name: copy('rb.dashboard.tile.moveUp').replace('{name}', first.pinnedName),
      }),
    ).toBeDisabled()
  })
})
