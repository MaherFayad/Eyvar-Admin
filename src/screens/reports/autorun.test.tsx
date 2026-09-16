/**
 * **The two sentences the business owner said out loud**, as behaviour an
 * operator can observe:
 *
 * > *"I shouldn't keep choosing all values over and over again everytime I
 * > change one tab"*
 *
 * > *"the run button click it it should happen automatically"*
 *
 * Everything in this file is one of those two, or a guard that stops the fix
 * for one of them from costing something else.
 *
 * ## Why the first one is asserted twice, on two different kinds of value
 *
 * `?view=` used to be written as a **fresh** search string — `''` for `reports`
 * and `'?view=' + v` for the other two — which threw away every other parameter
 * in both directions. Two different things live in those parameters and both
 * were lost:
 *
 * 1. **The composed report** (`?q=`), which is the whole storage adapter §9.2
 *    gives this module.
 * 2. **The index table's own question** — `useUrlTableState` keeps the library's
 *    search text, sort, page and filter chips in the address, so a tab switch
 *    wiped those too. That is the literal reading of the owner's sentence: they
 *    are values an operator chose, on a tab, and they did not survive leaving
 *    it.
 *
 * ## No spies, and no fixture imports
 *
 * The disciplines `reports.test.tsx` records apply here unchanged. A run is
 * asserted through its **observable consequence** — the freshness sentence, the
 * panels, the question in the address bar — never through a spy on a client
 * namespace, which passes vacuously on a negative assertion.
 */

import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import {
  REPORT_QUERY_PARAM,
  deserialiseReportQuery,
  disableMockLatency,
  listReports,
  reportQueryPath,
  resetDataLayer,
} from '@/data/clients'
import { normaliseReportQuery, type ReportQuery, type SavedReport } from '@/data/types'
import { PAGES_EN } from '@/screens/pages/copy'
import { REPORTS_EN } from './copy'
import { AUTO_RUN_DEBOUNCE_MS } from './ReportBuilder'
import { ReportsScreen } from './ReportsScreen'

const copy = (key: string) => REPORTS_EN[key] as string
const pagesCopy = (key: string) => PAGES_EN[key] as string

/** The debounce plus room for the mock to resolve, for a `waitFor` that must outlast it. */
const SETTLE = AUTO_RUN_DEBOUNCE_MS * 8

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither and Radix's select, menu and popover all call them
     on the trigger. Kept local, exactly as every other file in this module. */
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

/**
 * The address, and a way back through it.
 *
 * `MemoryRouter` has no `window.history`, so `Back` is a `navigate(-1)` from
 * inside the tree. It is the same call the browser button makes and it walks
 * the same stack, which is the thing under test in the history block.
 */
function Probe() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <span data-testid="search">{location.search}</span>
      <button type="button" onClick={() => navigate(-1)}>
        history-back
      </button>
    </>
  )
}

function renderAt(entries: string[], index = entries.length - 1) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={index}>
      <ShellProvider>
        <ReportsScreen />
        <Probe />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/** What the address currently says the question is. `null` when it carries none. */
function questionInUrl(): ReportQuery | null {
  const search = screen.getByTestId('search').textContent ?? ''
  const encoded = new URLSearchParams(search).get(REPORT_QUERY_PARAM)
  return encoded ? deserialiseReportQuery(encoded) : null
}

function rawParam(name: string): string | null {
  const search = screen.getByTestId('search').textContent ?? ''
  return new URLSearchParams(search).get(name)
}

/**
 * The library table's free-text search parameter.
 *
 * `ReportLibrary` passes `urlKey: 'lib'` to `useIndexTable`, and
 * `tableScope('', 'lib')` is `'lib'`, so the parameter is `lib.q`. Spelled out
 * here rather than imported because the point of the constant is that it is
 * **not** `REPORT_QUERY_PARAM` — a test that derived both from one source could
 * not fail if they collided again.
 */
const LIBRARY_SEARCH_PARAM = 'lib.q'

/** Read through the seam. A test that reads the seed array tests the seed. */
async function savedReports(): Promise<readonly SavedReport[]> {
  return (await listReports({ pageSize: 100 })).items
}

/** The freshness sentence, without its interpolated instant. Its presence is a run. */
const AS_OF = (copy('rb.canvas.asOf').split('{')[0] as string).trim()

/**
 * **The toolbar's controls are menus now, not button strips.**
 *
 * The five-button mode strip and the four-button chart-type strip were one
 * question asked twice, so they are one `Chart type` menu — and the grain and
 * the quick-range strips went the same way, on the owner's *"1:1 with
 * Amplitude"* ruling. These two helpers are the click sequence that replaces
 * `click(getByRole('button', { name: 'Week' }))` throughout this file; the
 * assertions around them are unchanged, which is the point: what the controls
 * DO did not move, only what they look like.
 */
async function pick(
  user: ReturnType<typeof userEvent.setup>,
  control: string,
  optionKey: string,
) {
  await user.click(screen.getByRole('combobox', { name: copy(control) }))
  await user.click(
    await screen.findByRole('option', {
      /* A prefix: an illegal option carries its refusal inside its own
         accessible name (D9 CQ-3), and `getByRole`'s `name` takes no
         `exact` flag. */
      name: (name: string) => name.startsWith(copy(optionKey)),
    }),
  )
}

const pickGrain = (user: ReturnType<typeof userEvent.setup>, grain: string) =>
  pick(user, 'rb.control.grain', `rb.grain.${grain}`)

const pickShape = (user: ReturnType<typeof userEvent.setup>, viz: string) =>
  pick(user, 'rb.viz.label', `rb.viz.${viz}`)

const tab = (view: 'reports' | 'pages' | 'alerts') =>
  screen.findByRole('tab', { name: copy(`rb.view.${view}`) })

/* ════════════════ 1 — a tab change costs the operator nothing ════════════ */

describe('the owner’s first sentence — changing a tab keeps every value', () => {
  it('keeps the library’s own search text across Pages and back', async () => {
    const user = userEvent.setup()
    renderAt(['/management/reports'])

    /* A value the operator chose, on this tab. `useUrlTableState` keeps it in
       the address, which is exactly why the old `search: ''` destroyed it. */
    const search = await screen.findByPlaceholderText(copy('rb.library.search'))
    await user.type(search, 'growth')
    /* **`lib.q`, not `q`.** The library declares `urlKey: 'lib'`, because
       `tableScope('', '')` is `''` and this is the one table in the sub-tab
       mounted under the DEFAULT view — unscoped, its search parameter was
       character-for-character `REPORT_QUERY_PARAM`. The two questions now have
       two names; this assertion is what stops them sharing one again. */
    await waitFor(() => expect(rawParam(LIBRARY_SEARCH_PARAM)).toBe('growth'), { timeout: SETTLE })
    expect(rawParam(REPORT_QUERY_PARAM)).toBeNull()

    await user.click(await tab('pages'))
    /* Still in the address on the other tab — a view is a control, not a new
       page, and it does not get to clear the one it left. */
    expect(await screen.findByRole('button', { name: pagesCopy('pg.index.new') })).toBeInTheDocument()
    expect(rawParam(LIBRARY_SEARCH_PARAM)).toBe('growth')

    await user.click(await tab('reports'))

    /* The control itself, not merely the parameter: the operator sees the word
       they typed, in the box they typed it in. */
    expect(await screen.findByPlaceholderText(copy('rb.library.search'))).toHaveValue('growth')
  })

  it('keeps a composed report across a view switch, in both directions', async () => {
    const user = userEvent.setup()
    const query = (await savedReports()).find((r) => r.id === 'RPT-1')!.query
    /* Landing on the Pages tab **with a question retained** is the state the
       old code could not represent at all: `?q=` won over `?view=`, so this
       address rendered the builder and the tab strip looked broken.
       `?view=dashboards` is the pre-D46 alias (AC-1210) and still resolves
       here, exercised alongside the retained question. */
    renderAt([`${reportQueryPath(query)}&view=dashboards`])

    expect(await screen.findByRole('button', { name: pagesCopy('pg.index.new') })).toBeInTheDocument()
    expect(questionInUrl()).toEqual(normaliseReportQuery(query))

    /* → Alerts. Still carried. */
    await user.click(await tab('alerts'))
    await waitFor(() => expect(questionInUrl()).toEqual(normaliseReportQuery(query)))

    /* → Reports. The builder comes back **on the same question**, and it comes
       back answered rather than unstarted. */
    await user.click(await tab('reports'))
    expect(await screen.findByText(AS_OF, { exact: false })).toBeInTheDocument()
    expect(questionInUrl()).toEqual(normaliseReportQuery(query))
  })

  it('does not mistake the library’s search box for a composed report', async () => {
    /* **This used to be a test about a guard; it is now a test about a name.**

       `useUrlTableState` wrote an index table's free-text search as a bare `q`
       under the default view, so `?q=` had two writers on one address and
       typing a single letter into the library's search box rendered an empty
       builder over the list. `ReportLibrary` now declares `urlKey: 'lib'`, so
       the collision is gone at the source rather than caught downstream.

       `ReportsScreen`'s guard stays and is what this asserts: a `?q=` that does
       not deserialise is nobody's question, so the screen renders the LIBRARY —
       never a builder built from garbage. The search box is empty because
       `growth` is no longer the library's parameter, which is the fix. */
    renderAt(['/management/reports?q=growth'])
    expect(await screen.findByPlaceholderText(copy('rb.library.search'))).toHaveValue('')
    expect(screen.queryByLabelText(copy('rb.control.measure'))).toBeNull()
  })

  it('still opens the builder on an EMPTY ?q=, which is New report', async () => {
    renderAt(['/management/reports?q='])
    expect(await screen.findByLabelText(copy('rb.control.measure'))).toBeInTheDocument()
  })
})

/* ═════════════════ 2 — the canvas follows the question ═══════════════════ */

describe('the owner’s second sentence — the report runs itself', () => {
  it('re-runs on a changed control, with nothing clicked but the control', async () => {
    const user = userEvent.setup()
    const query = (await savedReports()).find((r) => r.id === 'RPT-1')!.query
    renderAt([reportQueryPath(query)])

    expect(await screen.findByText(AS_OF, { exact: false })).toBeInTheDocument()

    /* One click, on the grain — and nothing else. No `Refresh`. */
    await pickGrain(user, 'week')

    await waitFor(() => expect(questionInUrl()?.grain).toBe('week'), { timeout: SETTLE })
    /* And the answer on screen belongs to it: the address is amended by the
       run, not by the click, so a `q` that says `week` is a run that happened. */
    expect(screen.getByText(AS_OF, { exact: false })).toBeInTheDocument()
  })

  it('never runs an illegal question, and never writes one to the address', async () => {
    const user = userEvent.setup()
    const query = (await savedReports()).find((r) => r.id === 'RPT-1')!.query
    renderAt([reportQueryPath(query)])
    await screen.findByText(AS_OF, { exact: false })

    /* A funnel with no rungs is `funnel-needs-steps`. The plan refuses it, so
       the debounce must too — the gate is the planner, not a timer. */
    await pickShape(user, 'funnel')

    expect(await screen.findByText(copy('rb.funnel.steps.unstarted'))).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, AUTO_RUN_DEBOUNCE_MS * 3))

    /* The address still holds the last question that was actually asked. An
       auto-run that ignored the plan would have overwritten it with a funnel
       nobody can answer, and a shared link would carry violations the recipient
       did not cause. */
    expect(questionInUrl()).toEqual(normaliseReportQuery(query))
    /* §3.2 — the primary is off rather than failing after submit. */
    expect(screen.getByRole('button', { name: copy('rb.control.run') })).toBeDisabled()
  })

  it('keeps the previous picture up while the new numbers are on their way', async () => {
    const user = userEvent.setup()
    const query = (await savedReports()).find((r) => r.id === 'RPT-1')!.query
    renderAt([reportQueryPath(query)])

    const measure = copy('rb.measure.captains.registered')
    expect((await screen.findAllByText(measure)).length).toBeGreaterThan(0)

    await pickGrain(user, 'week')

    /* §8.3 state 2, and the reason auto-run does not blank the canvas: the
       panels stay, the sentence says they are the previous run's, and the
       numbers are replaced in place. A skeleton here would be AC-810's blanked
       canvas, ninety times an hour. */
    expect(screen.getAllByText(measure).length).toBeGreaterThan(0)
    /* Scoped by text, not by role alone: `SeriesChart`'s own sr-only
       description span is also `role="status"` on a series chart, so two
       such regions coexist and only this one carries the stale sentence. */
    const stale = copy('rb.canvas.stale')
    const staleText = await screen.findByText(stale.slice(0, stale.indexOf('{')), { exact: false })
    expect(staleText).toHaveAttribute('role', 'status')

    await waitFor(() => expect(questionInUrl()?.grain).toBe('week'), { timeout: SETTLE })
    /* And it settles: `stale` is an in-flight state now, not a standing one.
       `SeriesChart`'s own `status` region is not stale-specific and stays
       mounted, so the STALE SENTENCE going away is what is asserted. */
    await waitFor(
      () => expect(screen.queryByText(stale.slice(0, stale.indexOf('{')), { exact: false })).toBeNull(),
      { timeout: SETTLE },
    )
  })

  it('runs a question that arrived composed exactly once, and writes nothing', async () => {
    const query = (await savedReports()).find((r) => r.id === 'RPT-1')!.query
    const path = reportQueryPath(query)
    renderAt([path])

    expect(await screen.findByText(AS_OF, { exact: false })).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, AUTO_RUN_DEBOUNCE_MS * 3))

    /* The seed does not amend the address — it was seeded FROM it — so the
       search is byte-identical to the link that was opened. A second fire would
       have re-serialised it. */
    expect(screen.getByTestId('search').textContent).toBe(path.slice(path.indexOf('?')))
  })
})

/* ══════════════════ 3 — Back walks questions, not clicks ═════════════════ */

describe('history — an auto-run replaces, a deliberate act pushes', () => {
  it('leaves one Back between an edited report and where the operator came from', async () => {
    /* The guarantee is how many history entries three edits cost, not how
       long they take to settle — so fake timers drive the debounce instead
       of real waits, which risked the suite's time ceiling under load. Same
       fix as `pageEditorAutosave.test.tsx` (AC-1201). */
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const user = userEvent.setup({ delay: null })
      const query = (await savedReports()).find((r) => r.id === 'RPT-1')!.query
      renderAt(['/management/reports', reportQueryPath(query)])
      await screen.findByText(AS_OF, { exact: false })

      /* Three edits — three auto-runs, and all three REPLACE. Pushing here would
         make `Back` walk the operator's own clicks. */
      await pickGrain(user, 'week')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(AUTO_RUN_DEBOUNCE_MS * 6)
      })
      await waitFor(() => expect(questionInUrl()?.grain).toBe('week'))
      /* The quick-range strip is gone — it duplicated four of the nine presets
         the range popover already carries. The popover IS the range control now,
         and this is the same edit through it. */
      await user.click(screen.getByRole('button', { name: copy('rb.control.window') }))
      await user.click(await screen.findByRole('button', { name: copy('rb.preset.last-7d') }))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(AUTO_RUN_DEBOUNCE_MS * 6)
      })
      await waitFor(() =>
        expect(questionInUrl()?.window).toEqual({ kind: 'preset', preset: 'last-7d' }),
      )
      await pickShape(user, 'bar')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(AUTO_RUN_DEBOUNCE_MS * 6)
      })
      await waitFor(() => expect(questionInUrl()?.chartType).toBe('bar'))

      await user.click(screen.getByRole('button', { name: 'history-back' }))

      /* One press, and the operator is back on the library they opened the report
         from — not three presses through their own grain, range and chart type. */
      expect(await screen.findByRole('button', { name: copy('rb.library.new') })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('spends a history entry on Refresh, because a person asked for that one', async () => {
    const user = userEvent.setup()
    const query = (await savedReports()).find((r) => r.id === 'RPT-1')!.query
    renderAt(['/management/reports', reportQueryPath(query)])
    await screen.findByText(AS_OF, { exact: false })

    await user.click(screen.getByRole('button', { name: copy('rb.control.run') }))
    await waitFor(() => expect(questionInUrl()).toEqual(normaliseReportQuery(query)))

    /* The deliberate re-run pushed, so the first Back is still the builder and
       only the second reaches the library. That is the whole difference between
       `push` and `replace`, asserted without reading either word. */
    await user.click(screen.getByRole('button', { name: 'history-back' }))
    expect(await screen.findByLabelText(copy('rb.control.measure'))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'history-back' }))
    expect(await screen.findByRole('button', { name: copy('rb.library.new') })).toBeInTheDocument()
  })

  it('amends the address rather than composing one, so ?failSeries= survives a run', async () => {
    const user = userEvent.setup()
    const query = (await savedReports()).find((r) => r.id === 'RPT-1')!.query
    /* §8.3 state 10's seam. It rides in the address, and a run that rebuilt the
       search string from scratch deleted it — which made the partial-failure
       state unreachable the moment the operator touched a control. */
    renderAt([`${reportQueryPath(query)}&failSeries=riders.registered`])
    expect((await screen.findAllByText(copy('rb.panel.failed'))).length).toBeGreaterThan(0)

    await pickGrain(user, 'week')
    await waitFor(() => expect(questionInUrl()?.grain).toBe('week'), { timeout: SETTLE })

    expect(rawParam('failSeries')).toBe('riders.registered')
  })
})

/* ═══════════ 4 — nothing the product already knows is thrown away ════════ */

describe('the lens never edits the question', () => {
  it('keeps measures, split and filters through chart type, grain, range and comparison', async () => {
    const user = userEvent.setup()
    const query = (await savedReports()).find((r) => r.id === 'RPT-1')!.query
    renderAt([reportQueryPath(query)])
    await screen.findByText(AS_OF, { exact: false })

    await pickShape(user, 'bar')
    await waitFor(() => expect(questionInUrl()?.chartType).toBe('bar'), { timeout: SETTLE })
    await pickGrain(user, 'week')
    await waitFor(() => expect(questionInUrl()?.grain).toBe('week'), { timeout: SETTLE })
    /* The quick-range strip is gone — it duplicated four of the nine presets
       the range popover already carries. The popover IS the range control now,
       and this is the same edit through it. */
    await user.click(screen.getByRole('button', { name: copy('rb.control.window') }))
    await user.click(await screen.findByRole('button', { name: copy('rb.preset.last-7d') }))
    await waitFor(
      () => expect(questionInUrl()?.window).toEqual({ kind: 'preset', preset: 'last-7d' }),
      { timeout: SETTLE },
    )

    /* Four changes of *how the answer is read*, and not one of them touched
       *what was asked* (AC-829, and the owner's first sentence one more time). */
    const now = questionInUrl()!
    expect(now.measures).toEqual(query.measures)
    expect(now.groupBy).toEqual(query.groupBy ?? null)
    expect(now.filters).toEqual(query.filters)
  })

  it('gives the chart type and the grain back when a mode round trip returns', async () => {
    const user = userEvent.setup()
    const query = (await savedReports()).find((r) => r.id === 'RPT-1')!.query
    renderAt([reportQueryPath(query)])
    await screen.findByText(AS_OF, { exact: false })

    /* A lens the operator picked, on purpose. */
    await pickGrain(user, 'week')
    await waitFor(() => expect(questionInUrl()?.grain).toBe('week'), { timeout: SETTLE })

    /* A funnel is bars at one total — `applyReportMode` decides both, and it
       must, or the operator's first sight of the mode is two violations they
       did not cause. */
    await pickShape(user, 'funnel')
    await screen.findByText(copy('rb.funnel.steps.unstarted'))

    await pickShape(user, 'line')

    /* Back on the trend, wearing the lens they chose — not the funnel's. This
       used to come back as bars at `Total`, so the operator re-picked two
       controls they never changed. */
    /* The trigger SHOWS the live value, which is what `aria-pressed` said on
       the strip: the restored lens is read out, not merely coloured (§7.5). */
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: copy('rb.control.grain') })).toHaveTextContent(
        copy('rb.grain.week'),
      ),
    )
    expect(screen.getByRole('combobox', { name: copy('rb.viz.label') })).toHaveTextContent(
      copy(`rb.viz.${query.chartType}`),
    )
    /* And the question itself survived the round trip untouched. */
    await waitFor(() => expect(questionInUrl()?.measures).toEqual(query.measures), {
      timeout: SETTLE,
    })
  })
})
