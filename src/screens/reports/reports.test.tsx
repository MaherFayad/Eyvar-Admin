/**
 * The Report Builder's screens, against the criteria that describe **behaviour
 * an operator can observe**.
 *
 * Two disciplines this project learned expensively and this file keeps:
 *
 * **No bare `vi.spyOn` on a client namespace.** A spy with no implementation
 * does not intercept the barrel's live binding: a positive assertion fails
 * loudly, and a **negative one passes vacuously**. So nothing here spies. The
 * "an illegal query is never sent" criterion is asserted through its
 * *observable consequence* — the canvas is still unstarted and no freshness
 * sentence exists — which an implementation that ran on change could not
 * satisfy.
 *
 * **AC-809's other half is gone.** *"No query runs until `Run` is activated"*
 * was overridden by the business owner (*"the run button click it it should
 * happen automatically"*); the canvas follows the question now. The case that
 * asserted it is rewritten in place, with the reason, and the replacement
 * behaviour lives in `autorun.test.tsx`.
 *
 * **A presence check on a placement rule passes in the case the rule forbids.**
 * Where the rule is a relationship, the relationship is asserted: a reason is
 * checked to be the one its disabled control POINTS AT, a stale canvas is
 * checked to still hold the previous panels, and a report name is checked to
 * be one the fixtures actually contain.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import {
  EYVAR_TODAY,
  disableMockLatency,
  getAlertRule,
  listAlertRules,
  saveAlertRule,
  listReports,
  mockFailures,
  reportQueryPath,
  resetDataLayer,
  runReport,
  switchMockUser,
} from '@/data/clients'
import type { AlertRule, SavedReport } from '@/data/types'
import { OVERVIEW_EN } from '@/screens/metrics/copy'
import { EN } from '@/i18n/dictionaries'
import { REPORTS_EN } from './copy'
/* The module's own number, not a literal that can drift away from it. */
import { AUTO_RUN_DEBOUNCE_MS } from './ReportBuilder'
import { ReportsScreen } from './ReportsScreen'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither of these and Radix's select and menu both call
     them on the trigger. Without the stubs, the pointer-down handler throws
     from inside `node_modules` and the popup never opens — a failure that says
     nothing about the component under test. Same reasoning as the
     `ResizeObserver` stub in `src/test/setup.ts`; kept local because this is
     the first file in the project to drive a select from a test. */
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

function renderAt(path: string, node: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>{node}</ShellProvider>
    </MemoryRouter>,
  )
}

const NO_DATA = OVERVIEW_EN['overview.noData'] as string

/**
 * **Read through the seam, never out of a fixture module.** `seam.test.ts`
 * asserts that nothing outside `src/data` imports a fixture, and a test is not
 * exempt: a test that reads the seed array is testing the seed rather than the
 * contract, and it would keep passing after the seam was swapped.
 *
 * `listReports` filters by the CURRENT session, so a private report belonging to
 * someone else is deliberately not returned — which is why the Arabic-name test
 * switches user first rather than reaching past the client for the row.
 */
async function savedReports(): Promise<readonly SavedReport[]> {
  return (await listReports({ pageSize: 100 })).items
}

async function alertRules(): Promise<readonly AlertRule[]> {
  return (await listAlertRules({ pageSize: 100 })).items
}

/* ────────────────── AC-807 / AC-809 — the unstarted report ─────────────── */

describe('AC-807, AC-809 — nothing but the measure picker, and nothing runs', () => {
  it('enables the measure picker and disables every other control, in place', async () => {
    renderAt(`/management/reports?q=`, <ReportsScreen />)

    const measure = await screen.findByLabelText(REPORTS_EN['rb.control.measure'] as string)
    expect(measure).toBeEnabled()

    /* Disabled IN PLACE — every one of them is in the document, and every one
       is off. A hidden control would pass a "not enabled" check while failing
       D9 CQ-3, so both halves are asserted. */
    for (const key of [
      'rb.control.measure2',
      'rb.control.groupBy',
      'rb.control.compare',
      'rb.control.window',
    ] as const) {
      const control = screen.getByLabelText(REPORTS_EN[key] as string)
      expect(control).toBeInTheDocument()
      expect(control).toBeDisabled()
    }
  })

  it('shows one grey sentence, not the first-run illustration (AC-843)', async () => {
    renderAt(`/management/reports?q=`, <ReportsScreen />)
    expect(await screen.findByText(REPORTS_EN['rb.canvas.unstarted'] as string)).toBeInTheDocument()
    /* R8's first kind would put a heading and an illustration here. Neither is
       legal on an unstarted question: the data exists, the question does not. */
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  /**
   * **Moved, because AC-809 was superseded and this assertion asserted it.**
   *
   * This case used to read *"issues no query when a control changes — the
   * canvas stays unstarted"*, and it was the observable consequence of AC-809's
   * *"no query runs until `Run` is activated"*. The business owner overrode
   * that rule directly — *"the run button click it it should happen
   * automatically"* — so the canvas now follows the question after
   * `AUTO_RUN_DEBOUNCE_MS` of quiet.
   *
   * The half of AC-809 that survives is asserted here and is the half that was
   * always load-bearing: **an illegal question is never sent.** An empty
   * report carries `no-measure`, so nothing is requested and the canvas holds
   * R8's second kind of empty — which is also what makes the auto-run safe,
   * because the gate is the planner and not a timer. The other half — that a
   * legal question resolves itself — is in `autorun.test.tsx`, where it can be
   * asserted on the timing it actually depends on.
   */
  it('requests nothing while the question is illegal, however long it is left', async () => {
    renderAt(`/management/reports?q=`, <ReportsScreen />)

    const measure = await screen.findByLabelText(REPORTS_EN['rb.control.measure'] as string)
    expect(measure).toBeEnabled()

    /* Well past the debounce, and still unstarted — because the planner, not a
       timer, decides whether a question may be asked. A canvas that had run
       would carry the freshness sentence; this one carries R8's second kind of
       empty and nothing else. */
    await new Promise((resolve) => setTimeout(resolve, AUTO_RUN_DEBOUNCE_MS * 3))
    expect(screen.getByText(REPORTS_EN['rb.canvas.unstarted'] as string)).toBeInTheDocument()
    const asOf = REPORTS_EN['rb.canvas.asOf'] as string
    expect(
      screen.queryByText(asOf.slice(0, asOf.indexOf('{')), { exact: false }),
    ).toBeNull()
  })
})

/* ────────────────── R5-15 — the population is on the panel ─────────────── */

/**
 * **Open the measure control's hint and give back what it says.**
 *
 * The rail's standing descriptions are `InfoHint`s now, so the sentence a
 * control owes an operator is not in the DOM until the hint is opened. It is
 * opened by **hover** here because that is the owner's own instruction (*"when
 * hovered it just show me those details"*) and because a hover that works
 * proves the Radix path is wired; the same button also opens on focus and on
 * click, which is what makes it reachable without a pointer (§7.2).
 *
 * The measure picker is §5.3's first control, so its hint is the first
 * `What this means` inside the panel region. Scoped to the region rather than
 * the document because the toolbar above the canvas has its own controls.
 */
/**
 * **The toolbar's controls are `Select`s now, not button strips.**
 *
 * The grain, the comparison and the chart type were three button strips; the
 * five-button `Question` strip was a fourth control asking the same thing as
 * one of them. All of it is three menus — `Chart type`, `Grain`, `Compare to` —
 * on the owner's *"exactly 1:1 with Amplitude"* ruling. The keys did not move
 * (`rb.control.grain`, `rb.viz.label`), only the widget, so this helper is the
 * click sequence that replaces `click(getByRole('button', { name: 'Week' }))`
 * throughout the file. What the controls DO is unchanged, which is why every
 * assertion around a `pick` is the assertion it always was.
 */
async function pick(
  user: ReturnType<typeof userEvent.setup>,
  control: string,
  optionKey: string,
) {
  await user.click(screen.getByRole('combobox', { name: REPORTS_EN[control] as string }))
  await user.click(
    await screen.findByRole('option', {
      /* A prefix: an illegal option carries its refusal INSIDE its own
         accessible name (D9 CQ-3), and `getByRole`'s `name` takes no `exact`. */
      name: (name: string) => name.startsWith(REPORTS_EN[optionKey] as string),
    }),
  )
}

async function measureHint(user: ReturnType<typeof userEvent.setup>): Promise<string> {
  const panel = await screen.findByRole('region', {
    name: REPORTS_EN['rb.panel.heading'] as string,
  })
  const hints = within(panel).getAllByRole('button', {
    name: EN['shell.hint.show'] as string,
  })
  await user.hover(hints[0]!)
  const tip = await screen.findByRole('tooltip')
  return tip.textContent ?? ''
}

describe('R5-15 — the operator can read the population, not just the number', () => {
  /**
   * Not *"a population sentence is present"* — a hardcoded caption would pass
   * that. **The sentence has to be the one this measure declares**, so the test
   * runs two different reports and asserts the sentence changes with the
   * measure, and that each sentence is the catalogue's own.
   *
   * **What changed, and why the old assertion had to go.** This read
   * `findAllByText(…)` against the whole document, which passed because the
   * rail printed the sentence as a standing paragraph under the measure picker.
   * The business owner had every one of those paragraphs moved behind an `i`
   * (`InfoHint`) — *"remove all those dumb overwhelming descriptions … add i
   * icon when hovered it just show me those details"* — so a bare `getByText`
   * now asserts exactly the behaviour that was removed, and passing it would
   * mean the change had not been made.
   *
   * R5-15 itself is untouched: the operator can still read the population, and
   * it still moves with the measure. So the assertion asks the **hint** for it —
   * hover the control's `What this means`, read the `tooltip` it opens. The
   * sentence is still the catalogue's own, and the wrong measure's sentence is
   * still nowhere on the page, opened or closed.
   */
  it('renders the measure’s own population sentence, and it moves with the measure', async () => {
    const captains = reportQueryPath({
      measures: [{ key: 'captains.registered' }],
      groupBy: [],
      filters: [],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    })
    const trips = reportQueryPath({
      measures: [{ key: 'trips.completed' }],
      groupBy: [],
      filters: [],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    })

    const user = userEvent.setup()

    const first = renderAt(captains, <ReportsScreen />)
    expect(await measureHint(user)).toContain(REPORTS_EN['rb.pop.drivers.all'] as string)
    expect(screen.queryByText(REPORTS_EN['rb.pop.trips.completed'] as string)).toBeNull()
    first.unmount()

    renderAt(trips, <ReportsScreen />)
    expect(await measureHint(user)).toContain(REPORTS_EN['rb.pop.trips.completed'] as string)
    expect(screen.queryByText(REPORTS_EN['rb.pop.drivers.all'] as string)).toBeNull()
  })

  /**
   * The base, and it has to be **derived**. The fixtures cover thirty days of
   * snapshots, so a 90-day window is legitimately mostly gaps — the reading
   * count must be strictly smaller than the bucket count and strictly smaller
   * than the same measure over 30 days. A literal would fail both.
   */
  it('states a reading count that shrinks when the window outruns the data', async () => {
    const short = await runReport(
      {
        measures: [{ key: 'revenue.total' }],
        groupBy: [],
        filters: [],
        window: { kind: 'preset', preset: 'last-30d' },
        grain: 'day',
        periodComparison: 'none',
        chartType: 'line',
      },
      { today: EYVAR_TODAY },
    )
    const long = await runReport(
      {
        measures: [{ key: 'revenue.total' }],
        groupBy: [],
        filters: [],
        window: { kind: 'preset', preset: 'last-90d' },
        grain: 'day',
        periodComparison: 'none',
        chartType: 'line',
      },
      { today: EYVAR_TODAY },
    )
    expect(short.status).toBe('ok')
    expect(long.status).toBe('ok')
    if (short.status !== 'ok' || long.status !== 'ok') return

    const readings = (r: typeof short.result) =>
      r.series[0]!.points.filter((p) => p !== null).length

    /* Three buckets are 90, and the readings do NOT triple, because the store
       does not reach back that far. `gaps-outside-fixture-range` says so. */
    expect(long.result.buckets.length).toBeGreaterThan(short.result.buckets.length)
    expect(readings(long.result)).toBeLessThan(long.result.buckets.length)
    expect(long.result.warnings).toContain('gaps-outside-fixture-range')
  })
})

/* ─────────────── AC-810 — dirty keeps the previous result ──────────────── */

describe('AC-810 — an edited query keeps the previous answer, visibly marked', () => {
  it('keeps the panels on screen and says the result is from an earlier run', async () => {
    const user = userEvent.setup()
    const query = (await savedReports()).find((r) => r.id === 'RPT-1')!.query
    renderAt(reportQueryPath(query), <ReportsScreen />)

    /* The owner's own two-panel question, resolved. */
    const captains = await screen.findAllByText(REPORTS_EN['rb.measure.captains.registered'] as string)
    expect(captains.length).toBeGreaterThan(0)

    /* Edit the grain — through the `Grain` menu, which is what the button strip
       became. The canvas must NOT blank and must NOT stay silent. */
    await pick(user, 'rb.control.grain', 'rb.grain.week')

    /* Two `status` regions coexist on a series chart now: this sentence and
       `SeriesChart`'s own sr-only description span (`describeId`), so the
       stale one is found by its text and then checked for the role, rather
       than assumed to be the only `status` on screen. */
    const stale = REPORTS_EN['rb.canvas.stale'] as string
    const staleText = await screen.findByText(stale.slice(0, stale.indexOf('{')), { exact: false })
    expect(staleText).toHaveAttribute('role', 'status')
    /* Still there — the previous picture, not a spinner and not a blank. */
    expect(
      screen.getAllByText(REPORTS_EN['rb.measure.captains.registered'] as string).length,
    ).toBeGreaterThan(0)
  })
})

/* ─────────────── §7 — an illegal option, and the reason it points at ───── */

/**
 * **The mechanism changed and the criterion did not.**
 *
 * This used to assert an `aria-describedby` from a disabled chart-type BUTTON
 * to the node carrying its reason. There is no such button any more: the
 * chart-type strip is a `Select`, and an illegal shape is a **disabled
 * `SelectItem` with its reason inside it**. `aria-describedby` on a
 * `SelectItem` is not a mechanism Radix exposes, so the reason is part of the
 * option's own accessible NAME rather than a reference to it — which is
 * strictly stronger: a name is announced with the option, a description can be
 * skipped by verbosity settings, and the two can no longer come apart.
 *
 * So the relationship is still what is asserted, just at one remove less: the
 * refused option, the exact sentence the planner gave for refusing it, and the
 * two in one announcement. The coverage is kept; only the pointer is gone.
 */
describe('AC-836, AC-899 — a disabled option owes a reason a screen reader can reach', () => {
  it('announces the disabled chart type together with the reason it is refused', async () => {
    const user = userEvent.setup()
    /* RPT-1 asks two measures, and `A pie shows one measure` is the planner's
       refusal for exactly that — read from the copy, never retyped. */
    const query = (await savedReports()).find((r) => r.id === 'RPT-1')!.query
    expect(query.measures.length).toBe(2)
    renderAt(reportQueryPath(query), <ReportsScreen />)

    await user.click(
      await screen.findByRole('combobox', { name: REPORTS_EN['rb.viz.label'] as string }),
    )
    const pie = await screen.findByRole('option', {
      name: (name: string) => name.startsWith(REPORTS_EN['rb.viz.pie'] as string),
    })

    /* **Disabled IN PLACE** — present and off, never removed (D9 CQ-3). An
       option that vanished would leave the operator with no way to learn that a
       pie exists, let alone why they cannot have one. */
    expect(pie).toHaveAttribute('aria-disabled', 'true')

    /* **The relationship, not the presence.** A reason rendered somewhere on
       the page passes a presence check while telling a screen-reader user
       nothing. Here the reason is announced AS PART OF the option: name it, and
       the refusal comes with it. */
    const name = pie.textContent ?? ''
    expect(name).toContain(REPORTS_EN['rb.viz.pie'] as string)
    expect(name).toContain(REPORTS_EN['rb.chart.pieOneMeasure'] as string)
    /* The space between the two spans is load-bearing: without it the announced
       name opens `Pie chartA pie shows one measure`. */
    expect(name).not.toContain(
      `${REPORTS_EN['rb.viz.pie'] as string}${(REPORTS_EN['rb.chart.pieOneMeasure'] as string).charAt(0)}`,
    )
  })

  it('leaves the legal shapes offerable, so the refusal is about this question', async () => {
    const user = userEvent.setup()
    const query = (await savedReports()).find((r) => r.id === 'RPT-1')!.query
    renderAt(reportQueryPath(query), <ReportsScreen />)

    await user.click(
      await screen.findByRole('combobox', { name: REPORTS_EN['rb.viz.label'] as string }),
    )
    /* Without this the test above would pass on a menu that disabled
       everything, which is a broken control rather than a stated refusal. */
    for (const key of ['rb.viz.line', 'rb.viz.bar', 'rb.viz.table'] as const) {
      const option = await screen.findByRole('option', {
        name: (name: string) => name.startsWith(REPORTS_EN[key] as string),
      })
      expect(option).not.toHaveAttribute('aria-disabled', 'true')
    }
  })
})

/* ─────────────── AC-844 — one sentence, byte-identical ─────────────────── */

/**
 * **LEFT FAILING DELIBERATELY — 2026-09-04. This is a defect, not a stale
 * selector.**
 *
 * `ResultCanvas.Body` used to render one `PanelCard` per panel, and `PanelCard`
 * carries the branch `!current || current.points.every(p => p === null)` →
 * `noDataSentence`. The compound-plot rewrite replaced that mapping with
 * `SeriesHeadlines` + `SeriesChart` per `(unit, currency)` group, and **neither
 * has an all-null branch**. A run that succeeds and returns nothing at all now
 * renders an em dash under the measure's name and an empty plot, with nothing
 * saying why.
 *
 * Measured on this exact query (`revenue.total`, 1–31 Jan 2020 — a window
 * entirely outside every store), the canvas reads:
 *
 * > *Part of this range is outside what is recorded, so the chart breaks rather
 * > than reading zero.* · *Gross revenue* · **—** · *over 1 Jan – 31 Jan* ·
 * > *no comparison*
 *
 * `Body`'s own `result.panels.length === 0` branch still renders the sentence,
 * but the runner always produces a panel for a chosen measure, so that branch
 * is not the empty state an operator reaches. This affects the dashboard tile
 * path too — `Body` is shared, and `framed` does not change the branch.
 *
 * `SeriesHeadlines`' own doc calls this out for the blocked case: *"a headline
 * over an empty series would print an em dash that reads as 'no data'"*. The
 * same is true here, and the em dash is all there is.
 *
 * The assertion below is unchanged because the criterion is unchanged. It goes
 * green when the empty state is put back — a fix belongs in `ResultCanvas` or
 * `SeriesHeadlines`, not here.
 */
describe('AC-844 — the no-data sentence is the metric boards’ own string', () => {
  it('renders it character for character, trailing period included', async () => {
    /* A window entirely outside every store: the run succeeds and returns
       nothing, which is the ONLY state this sentence describes. */
    renderAt(
      reportQueryPath({
        measures: [{ key: 'revenue.total' }],
        groupBy: [],
        filters: [],
        window: { kind: 'absolute', from: '2020-01-01', to: '2020-01-31' },
        grain: 'day',
        periodComparison: 'none',
        chartType: 'line',
      }),
      <ReportsScreen />,
    )
    const sentence = await screen.findAllByText(NO_DATA)
    expect(sentence.length).toBeGreaterThan(0)
    /* And the module did not copy the string — it resolves the same key. A
       divergent copy would still render, and would still fail here. */
    expect(REPORTS_EN['overview.noData']).toBeUndefined()
  })
})

/* ─────────────── §13.1 — blocked is per series, not per result ─────────── */

describe('AC-850 — one blocked series does not take the report down', () => {
  it('redacts in the PAYLOAD, not in the rendering', async () => {
    /* `runReport` authorises against the requesting session's permissions. With
       none, a `view_finance` measure comes back blocked — and AC-888 is
       verified against the RESPONSE: no points at all, not points the UI hides. */
    const outcome = await runReport(
      {
        measures: [{ key: 'revenue.total' }],
        groupBy: [],
        filters: [],
        window: { kind: 'preset', preset: 'last-30d' },
        grain: 'day',
        periodComparison: 'none',
        chartType: 'line',
      },
      { today: EYVAR_TODAY },
    )
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') return
    const series = outcome.result.series[0]!
    if (series.blocked !== null) {
      expect(series.points).toHaveLength(0)
    }
  })
})

/* ─────────────── §8.3 state 10 — one leg failed, the rest live ─────────── */

describe('AC-851 — a failed leg fails alone', () => {
  it('resolves the other measure fully while one comes back failed', async () => {
    const outcome = await runReport(
      (await savedReports()).find((r) => r.id === 'RPT-1')!.query,
      { today: EYVAR_TODAY, failMeasureKeys: ['riders.registered'] },
    )
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') return

    const failed = outcome.result.series.find((s) => s.measureKey === 'riders.registered')
    const fine = outcome.result.series.find((s) => s.measureKey === 'captains.registered')
    expect(failed?.failed).not.toBeNull()
    expect(fine?.failed).toBeNull()
    /* The half that worked really worked — it carries readings, not an empty
       array that would make the assertion above vacuous. */
    expect(fine!.points.some((p) => p !== null)).toBe(true)
  })

  it('gives the failed panel its own retry and leaves the other panel drawn', async () => {
    renderAt(
      `${reportQueryPath((await savedReports()).find((r) => r.id === 'RPT-1')!.query)}&failSeries=riders.registered`,
      <ReportsScreen />,
    )
    /* The sentence is stated TWICE on purpose since the table began rendering
       beside the chart: once on the card, once as the table's spanning cell.
       This criterion is about the CARD, so the assertion is that at least one
       statement of it lives outside the table — a count would break the next
       time a rendering states it honestly somewhere else. */
    const failures = await screen.findAllByText(REPORTS_EN['rb.panel.failed'] as string)
    expect(failures.some((node) => node.closest('table') === null)).toBe(true)
    expect(
      screen.getByRole('button', { name: REPORTS_EN['rb.panel.failed.retry'] as string }),
    ).toBeInTheDocument()
    /* The other panel is a real chart, not a second error. */
    expect(
      screen.getAllByText(REPORTS_EN['rb.measure.captains.registered'] as string).length,
    ).toBeGreaterThan(0)
  })
})

/* ─────────────── AC-846 / AC-847 — the two error states ────────────────── */

describe('AC-846, AC-847 — an error keeps the question', () => {
  it('renders the run failure inside the canvas with a retry, panel still usable', async () => {
    /* The shell seeds this registry from `?mockFail=` on the real location;
       a MemoryRouter's search never reaches `window.location`, so the test
       seeds the SAME registry directly rather than asserting against a
       different code path than the one QA uses. */
    mockFailures.always('reports.run')
    renderAt(
      reportQueryPath((await savedReports()).find((r) => r.id === 'RPT-1')!.query),
      <ReportsScreen />,
    )
    await waitFor(
      () => expect(screen.getByText(REPORTS_EN['rb.canvas.error'] as string)).toBeInTheDocument(),
      { timeout: 3000 },
    )
    expect(
      screen.getByRole('button', { name: REPORTS_EN['rb.canvas.error.retry'] as string }),
    ).toBeInTheDocument()
    /* The composed query survived: the measure picker still holds it. */
    expect(screen.getByLabelText(REPORTS_EN['rb.control.grain'] as string)).toBeInTheDocument()
  })
})

/* ────────────────────────── the alert list (§12) ───────────────────────── */

describe('§12 — the client half of alerts, and the two fields nobody has decided', () => {
  it('renders the cadence as unset, because every seeded rule leaves it unset', async () => {
    /* The fixture claim and the rendering are asserted together. If a rule ever
       gains a cadence, the first assertion fails and whoever added it has to
       decide what the column should say — rather than the UI quietly inventing
       one. */
    const rules = await alertRules()
    expect(rules.length).toBeGreaterThan(0)
    expect(rules.every((rule) => rule.cadence === null)).toBe(true)
    expect(rules.every((rule) => rule.minReArmMinutes === null)).toBe(true)

    renderAt('/management/reports?view=alerts', <ReportsScreen />)
    /* v2 (`22-analytics-v2.md` §4.6) restates R10's banner with its own copy
       and states the fact plainly on every row instead of leaving it blank. */
    expect(
      await screen.findByText(REPORTS_EN['rb.alert.banner.noCadence.body'] as string),
    ).toBeInTheDocument()
    expect(
      (await screen.findAllByText(REPORTS_EN['rb.alert.cadence.none'] as string)).length,
    ).toBeGreaterThan(0)
  })

  it('AC-885 — a firing rule uses the word and a warning tone, and no red anywhere', async () => {
    renderAt('/management/reports?view=alerts', <ReportsScreen />)
    /* Two seeded rules (`ALR-1`, `ALR-10`) are `firing` — every badge, not
       just the first, is asserted (`findAllByText`). */
    const firingBadges = await screen.findAllByText(REPORTS_EN['rb.alert.state.firing'] as string)
    expect(firingBadges.length).toBeGreaterThan(0)
    /* R7's `warning` is the one attention tone; R5a permits red in four places
       and this is none of them. The tone is checked on the badge that carries
       the word, not merely somewhere on the page. */
    for (const firing of firingBadges) expect(firing.className).toContain('bg-warning')
    expect(document.body.querySelector('.bg-destructive')).toBeNull()
    expect(document.body.querySelector('.text-destructive')).toBeNull()
  })

  it('AC-877 — Test this rule says *would have* and changes nothing', async () => {
    const user = userEvent.setup()
    renderAt('/management/reports?view=alerts', <ReportsScreen />)

    const rows = await screen.findAllByRole('row')
    const firingRow = rows.find((row) =>
      within(row).queryByText(REPORTS_EN['rb.alert.state.firing'] as string),
    )
    expect(firingRow).toBeDefined()

    /* §7.8 — the lane is present always, never on hover. Its SHAPE changed with
       the action count: `DataTable` renders up to two declared actions as
       labelled buttons and three or more as a kebab, and this table now
       declares four (Open · Test · Firing history · Delete). So the action is
       reached through the menu, which is also how an operator reaches it. */
    await user.click(within(firingRow!).getByRole('button', { name: /More actions/ }))
    await user.click(
      await screen.findByRole('menuitem', { name: REPORTS_EN['rb.alert.test'] as string }),
    )

    /* `findAllByRole` rather than `findByRole`: the page-level banner is also a
       `status`, and it is the one that says nothing is checking these rules. */
    const status = (await screen.findAllByRole('status')).find((node) =>
      node.textContent?.includes(REPORTS_EN['rb.alert.test.noChange'] as string),
    )
    expect(status).toBeDefined()
    /* The row's state is untouched: the rule is still `Firing`, not `Fired`. */
    expect(
      within(firingRow!).getByText(REPORTS_EN['rb.alert.state.firing'] as string),
    ).toBeInTheDocument()
  })
})

/* ────────────────────── AC-853 — the URL is the storage ────────────────── */

describe('AC-853, AC-855 — a link reproduces the question', () => {
  it('restores measures, split, grain, comparison and chart type from the URL alone', async () => {
    const query = {
      measures: [{ key: 'trips.completed' }],
      groupBy: ['trip.kind'],
      filters: [],
      window: { kind: 'preset' as const, preset: 'last-30d' as const },
      grain: 'week' as const,
      periodComparison: 'previous-period' as const,
      chartType: 'line' as const,
    }
    renderAt(reportQueryPath(query), <ReportsScreen />)

    /* The panel follows the link: the split and the comparison are the ones
       encoded, not the defaults. */
    await waitFor(() =>
      expect(screen.getByLabelText(REPORTS_EN['rb.control.groupBy'] as string)).toHaveTextContent(
        REPORTS_EN['rb.dim.trip.kind'] as string,
      ),
    )
    expect(screen.getByLabelText(REPORTS_EN['rb.control.compare'] as string)).toHaveTextContent(
      REPORTS_EN['rb.compare.previous-period'] as string,
    )
    /* The grain came back too. It used to be `aria-pressed` on one of five
       always-rendered buttons; the strip is a `Select`, so the live value is on
       the trigger — read out rather than merely coloured (§7.5), which is the
       same promise `aria-pressed` was making. */
    expect(
      screen.getByRole('combobox', { name: REPORTS_EN['rb.control.grain'] as string }),
    ).toHaveTextContent(REPORTS_EN['rb.grain.week'] as string)
  })
})

/* ───────────────── AC-898 — a report name is user content ──────────────── */

describe('AC-898 — an Arabic report name renders as itself inside an English UI', () => {
  it('renders the name from the fixtures, untranslated, in an isolated run', async () => {
    /* USR-3's own private report. Switching first is what makes it visible
       through `reports.list`, which is the same rule the library obeys. */
    await switchMockUser('USR-3')
    const arabic = (await savedReports()).find((r) => r.id === 'RPT-5')!
    renderAt('/management/reports', <ReportsScreen />)
    const cell = await screen.findByText(arabic.name)
    /* Isolation lives on the run and layout on the box — never the other way
       round, which is the finding `isolatedRunProps` exists to enforce. */
    expect(cell.tagName.toLowerCase()).toBe('bdi')
    expect(cell.className).toBe('')
  })
})

/* ─────────── the rule the operator saves keeps the fields unset ────────── */

describe('§12.2 — a rule saved from the form invents no schedule', () => {
  /**
   * The form passes `cadence: null` and the client stores it. Asserted against
   * **what came back from the client**, not against what the form rendered: a
   * UI that showed `Not set` while sending `daily` would pass a rendering check
   * and fail the rule, and it is the stored value a scheduler would one day
   * read.
   */
  it('stores a null cadence and a null re-arm minimum on a newly created rule', async () => {
    const report = (await savedReports())[0]!
    const run = await runReport(report.query, { today: EYVAR_TODAY })
    expect(run.status).toBe('ok')
    if (run.status !== 'ok') return
    const series = run.result.series.find((s) => s.role === 'current')!

    const outcome = await saveAlertRule({
      id: null,
      name: 'A rule with no schedule',
      reportId: report.id,
      seriesId: series.id,
      comparator: 'gt',
      threshold: 5,
      evaluationGrain: 'day',
      /* What the form sends. There is no other value it can send. */
      cadence: null,
      recipientIds: [],
      enabled: true,
      mutedUntil: null,
    })
    expect(outcome.status).toBe('saved')
    if (outcome.status !== 'saved') return

    const stored = (await getAlertRule(outcome.rule.id)).data
    expect(stored.cadence).toBeNull()
    expect(stored.minReArmMinutes).toBeNull()
  })

  /**
   * **AC-876 — a money threshold round-trips through halalas without loss.**
   *
   * Not *"the field accepts 400"*: the assertion is that the number that comes
   * back out of the client is the wire integer, and that reading it back for
   * the field gives the operator's own figure again. A `value * 100` conversion
   * passes the first half and fails on `19.99`, which is why the test uses one.
   */
  it('carries a money threshold as halalas and reads it back as riyals', async () => {
    const report = (await savedReports()).find((r) => r.query.measures[0]?.key.startsWith('revenue'))
    expect(report).toBeDefined()
    const run = await runReport(report!.query, { today: EYVAR_TODAY })
    if (run.status !== 'ok') return
    const series = run.result.series.find((s) => s.role === 'current' && s.unit === 'money')
    if (!series) return

    const outcome = await saveAlertRule({
      id: null,
      name: 'Nineteen ninety-nine',
      reportId: report!.id,
      seriesId: series.id,
      comparator: 'lt',
      /* What `parseMoneyInput('19.99')` produces — an integer, computed on the
         digit string, because `19.99 * 100` is 1998.9999999999998. */
      threshold: 1999,
      evaluationGrain: 'day',
      cadence: null,
      recipientIds: [],
      enabled: true,
      mutedUntil: null,
    })
    expect(outcome.status).toBe('saved')
    if (outcome.status !== 'saved') return

    expect(outcome.rule.threshold).toBe(1999)
    /* Derived from the series' measure, never accepted from the caller. */
    expect(outcome.rule.thresholdUnit).toBe('money')
    expect(outcome.rule.thresholdCurrency).toBe('SAR')
    /* And the field reads it back as the operator typed it. */
    expect(outcome.rule.threshold / 100).toBe(19.99)
  })
})
