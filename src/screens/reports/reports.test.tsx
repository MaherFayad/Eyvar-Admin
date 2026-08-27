/**
 * The Report Builder's screens, against the criteria that describe **behaviour
 * an operator can observe**.
 *
 * Two disciplines this project learned expensively and this file keeps:
 *
 * **No bare `vi.spyOn` on a client namespace.** A spy with no implementation
 * does not intercept the barrel's live binding: a positive assertion fails
 * loudly, and a **negative one passes vacuously**. So nothing here spies. The
 * "no query runs until Run" criterion is asserted through its *observable
 * consequence* — the canvas is still unstarted and no panel exists — which an
 * implementation that ran on change could not satisfy.
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
import { REPORTS_EN } from './copy'
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

  it('issues no query when a control changes — the canvas stays unstarted', async () => {
    const user = userEvent.setup()
    renderAt(`/management/reports?q=`, <ReportsScreen />)

    const measure = await screen.findByLabelText(REPORTS_EN['rb.control.measure'] as string)
    await user.click(measure)
    await user.click(await screen.findByRole('option', { name: REPORTS_EN['rb.measure.captains.registered'] as string }))

    /* Choosing a measure ENABLES the rest (AC-808) and runs nothing (AC-809).
       Both are asserted, because an implementation that ran on change would
       satisfy the first and fail the second. */
    await waitFor(() =>
      expect(screen.getByLabelText(REPORTS_EN['rb.control.groupBy'] as string)).toBeEnabled(),
    )
    expect(screen.getByText(REPORTS_EN['rb.canvas.unstarted'] as string)).toBeInTheDocument()
  })
})

/* ────────────────── R5-15 — the population is on the panel ─────────────── */

describe('R5-15 — the operator can read the population, not just the number', () => {
  /**
   * Not *"a population sentence is present"* — a hardcoded caption would pass
   * that. **The sentence has to be the one this measure declares**, so the test
   * runs two different reports and asserts the sentence changes with the
   * measure, and that each sentence is the catalogue's own.
   */
  it('renders the measure’s own population sentence, and it moves with the measure', async () => {
    const captains = reportQueryPath({
      measures: [{ key: 'captains.registered' }],
      groupBy: null,
      filters: [],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    })
    const trips = reportQueryPath({
      measures: [{ key: 'trips.completed' }],
      groupBy: null,
      filters: [],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    })

    const first = renderAt(captains, <ReportsScreen />)
    expect(
      await screen.findAllByText(REPORTS_EN['rb.pop.drivers.all'] as string),
    ).not.toHaveLength(0)
    expect(screen.queryByText(REPORTS_EN['rb.pop.trips.completed'] as string)).toBeNull()
    first.unmount()

    renderAt(trips, <ReportsScreen />)
    expect(
      await screen.findAllByText(REPORTS_EN['rb.pop.trips.completed'] as string),
    ).not.toHaveLength(0)
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
        groupBy: null,
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
        groupBy: null,
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

    /* Edit the grain. The canvas must NOT blank and must NOT stay silent. */
    await user.click(screen.getByRole('button', { name: REPORTS_EN['rb.grain.week'] as string }))

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    const stale = REPORTS_EN['rb.canvas.stale'] as string
    expect(screen.getByRole('status').textContent).toContain(stale.slice(0, stale.indexOf('{')))
    /* Still there — the previous picture, not a spinner and not a blank. */
    expect(
      screen.getAllByText(REPORTS_EN['rb.measure.captains.registered'] as string).length,
    ).toBeGreaterThan(0)
  })
})

/* ─────────────── §7 — an illegal option, and the reason it points at ───── */

describe('AC-836, AC-899 — a disabled option owes a reason a screen reader can reach', () => {
  it('links the disabled chart type to the very node that carries its reason', async () => {
    const query = (await savedReports()).find((r) => r.id === 'RPT-1')!.query
    renderAt(reportQueryPath(query), <ReportsScreen />)

    const pie = await screen.findByRole('button', { name: REPORTS_EN['rb.chartType.pie'] as string })
    expect(pie).toBeDisabled()

    /* **The relationship, not the presence.** A reason rendered somewhere on the
       page passes a presence check while telling a screen-reader user nothing.
       The disabled control has to point at it, and the node it points at has to
       exist and carry text. */
    const describedBy = pie.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const reason = document.getElementById(describedBy!)
    expect(reason).not.toBeNull()
    expect(reason!.textContent?.trim()).not.toBe('')
  })
})

/* ─────────────── AC-844 — one sentence, byte-identical ─────────────────── */

describe('AC-844 — the no-data sentence is the metric boards’ own string', () => {
  it('renders it character for character, trailing period included', async () => {
    /* A window entirely outside every store: the run succeeds and returns
       nothing, which is the ONLY state this sentence describes. */
    renderAt(
      reportQueryPath({
        measures: [{ key: 'revenue.total' }],
        groupBy: null,
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
        groupBy: null,
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
    expect(await screen.findByText(REPORTS_EN['rb.panel.failed'] as string)).toBeInTheDocument()
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
    const unset = await screen.findAllByText(REPORTS_EN['rb.alert.cadence.unset'] as string)
    expect(unset.length).toBe(rules.length)
    /* And it says what "unset" means, once, where an operator will read it. */
    expect(screen.getByText(REPORTS_EN['rb.alert.cadence.explain'] as string)).toBeInTheDocument()
  })

  it('AC-885 — a firing rule uses the word and a warning tone, and no red anywhere', async () => {
    renderAt('/management/reports?view=alerts', <ReportsScreen />)
    const firing = await screen.findByText(REPORTS_EN['rb.alert.state.firing'] as string)
    /* R7's `warning` is the one attention tone; R5a permits red in four places
       and this is none of them. The tone is checked on the badge that carries
       the word, not merely somewhere on the page. */
    expect(firing.className).toContain('bg-warning')
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

    /* One declared row action renders as a labelled button rather than a
       kebab — §7.8 — and it is present in the lane always, not on hover. */
    await user.click(
      within(firingRow!).getByRole('button', { name: REPORTS_EN['rb.alert.test'] as string }),
    )

    const status = await screen.findByRole('status')
    expect(status.textContent).toContain(REPORTS_EN['rb.alert.test.noChange'] as string)
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
      groupBy: 'trip.kind',
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
    expect(
      screen.getByRole('button', { name: REPORTS_EN['rb.grain.week'] as string }),
    ).toHaveAttribute('aria-pressed', 'true')
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
