/**
 * **The range control, against the house MUST it was failing.**
 *
 * DESIGN.md §3.7:
 *
 * > *The range popover MUST offer presets **and** explicit start/end inputs
 * > **and** two visible months, and MUST require an explicit `Apply`.*
 *
 * Four conjuncts, so four assertions — a test that checked only the presets
 * would have passed against both of the controls this replaced, which had
 * presets, two bare `type="date"` inputs, an `Apply` and **no calendar at all**.
 * That is why `two visible months` is asserted by counting grids and not by
 * looking for a calendar glyph.
 *
 * The other half of the change is a consolidation: `QueryPanel.WindowControl`
 * and `ReportModePanel.WindowField` were near-verbatim copies, so the last
 * block drives **all four rails** through the same assertions. A regression
 * that reintroduced a second implementation would have to reintroduce it
 * twice to pass this.
 *
 * Two disciplines this file keeps from its neighbours:
 *
 * **Nothing spies.** A bare `vi.spyOn` on a client namespace does not intercept
 * the barrel's live binding, so a negative assertion passes vacuously. *The
 * query did not change* is asserted through its observable consequence — the
 * trigger still states the old window, and the URL `Run` writes still carries
 * it.
 *
 * **No fixture is imported.** The queries are composed here and the expected
 * range is computed through `resolveWindow`, which is the same function the
 * control calls — so this checks the CONTROL, not a hand-copied date that would
 * rot the day `EYVAR_TODAY` moves.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import {
  EYVAR_TODAY,
  REPORT_QUERY_PARAM,
  deserialiseReportQuery,
  disableMockLatency,
  reportQueryPath,
  resetDataLayer,
  resolveWindow,
} from '@/data/clients'
import { REPORT_PRESETS } from '@/data/clients/reports'
import type { ReportMode, ReportQuery } from '@/data/types'
import { UI_STATE_KEYS, defaultUiStore, formatDate } from '@/lib'
import { REPORTS_AR } from '@/i18n/ar/reports'
import { REPORTS_EN } from './copy'
import { ReportsScreen } from './ReportsScreen'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither and Radix's popover and select both call them on
     the trigger. Same reasoning as `reports.test.tsx`; kept local per file. */
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

/** Reads the address bar out of the router, so a committed window can be read. */
function LocationProbe() {
  const location = useLocation()
  return <span data-testid="search">{location.search}</span>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <ReportsScreen />
        <LocationProbe />
      </ShellProvider>
    </MemoryRouter>,
  )
}

const base: ReportQuery = {
  measures: [],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'table',
}

/**
 * One query per rail. `trend` and `table` go to `QueryPanel`; the other three
 * go to `ReportModePanel`. Each carries the SAME window, so the four rails are
 * compared on the control and not on what they happen to be pointed at.
 */
const RAILS: Record<ReportMode, ReportQuery> = {
  trend: {
    ...base,
    measures: [{ key: 'trips.completed' }],
    grain: 'day',
    chartType: 'line',
    mode: 'trend',
  },
  table: { ...base, measures: [{ key: 'trips.completed' }], grain: 'day', mode: 'table' },
  funnel: {
    ...base,
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
  },
  cohort: {
    ...base,
    mode: 'cohort',
    cohort: {
      anchorMeasureKey: 'riders.joined',
      returnMeasureKeys: [],
      cohortGrain: 'month',
      method: 'rolling',
      brackets: null,
      horizon: 3,
    },
  },
  journey: { ...base, mode: 'journey', journey: { rootMeasureKey: 'riders.joined', depth: 2 } },
}

const MODES = Object.keys(RAILS) as ReportMode[]

/** The sentence the trigger must print for a window, built the way the control builds it. */
function rangeLabel(query: ReportQuery): string {
  const resolved = resolveWindow(query.window, EYVAR_TODAY)
  return copy('rb.control.window.range')
    .replace('{from}', formatDate(resolved.from, { style: 'day-month', language: 'en' }))
    .replace('{to}', formatDate(resolved.to, { style: 'day-month', language: 'en' }))
}

/** The one popover. Radix gives `PopoverContent` `role="dialog"`. */
async function openWindow(user: ReturnType<typeof userEvent.setup>) {
  const trigger = await screen.findByLabelText(copy('rb.control.window'))
  await user.click(trigger)
  return screen.findByRole('dialog')
}

/* ─────────────── §A7 / §3.7 — the trigger states the range ─────────────── */

describe('the trigger states the window, not just the word for it', () => {
  it('prints the preset AND the days it resolves to', async () => {
    const query = RAILS.trend
    renderAt(reportQueryPath(query))

    const trigger = await screen.findByLabelText(copy('rb.control.window'))
    /* Both facts. The preset alone leaves *which* thirty days a question only
       the popover can answer; the dates alone cannot be told apart from a
       pinned range. */
    expect(trigger).toHaveTextContent(copy('rb.preset.last-30d'))
    expect(trigger).toHaveTextContent(rangeLabel(query))
  })

  it('says Custom range, with the days, once the window is pinned', async () => {
    const query: ReportQuery = {
      ...RAILS.trend,
      window: { kind: 'absolute', from: '2026-08-01', to: '2026-08-14' },
    }
    renderAt(reportQueryPath(query))

    const trigger = await screen.findByLabelText(copy('rb.control.window'))
    expect(trigger).toHaveTextContent(copy('rb.control.window.custom'))
    expect(trigger).toHaveTextContent(rangeLabel(query))
    /* A pinned window is not one of the nine, so no preset name may appear on
       the trigger — the check that catches a fallback to `last-30d`. */
    for (const preset of REPORT_PRESETS) {
      expect(trigger).not.toHaveTextContent(copy(`rb.preset.${preset}`))
    }
  })
})

/* ──────────────── DESIGN.md §3.7 — all four conjuncts ─────────────────── */

describe('§3.7 — the range popover offers presets AND inputs AND two months AND Apply', () => {
  it('offers all thirteen presets, with a pressed state on the live one', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(RAILS.trend))
    const popover = await openWindow(user)

    for (const preset of REPORT_PRESETS) {
      expect(within(popover).getByRole('button', { name: copy(`rb.preset.${preset}`) })).toBeInTheDocument()
    }
    /* §2.7 — four calendar presets joined the original nine to match
       Amplitude's range list; the SET is asserted, not a bare count that
       would pass just as readily against the wrong nine. */
    expect(REPORT_PRESETS).toEqual([
      'today',
      'yesterday',
      'last-7d',
      'last-30d',
      'last-90d',
      'last-365d',
      'last-month',
      'last-12-months',
      'last-year',
      'this-quarter',
      'last-quarter',
      'this-year',
      'year-to-date',
    ])

    /* Asserted through `aria-pressed`, not through text: every one of the nine
       labels is on screen at once, so a text check would pass for the wrong
       preset as readily as for the right one. */
    expect(
      within(popover).getByRole('button', { name: copy('rb.preset.last-30d') }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(popover).getByRole('button', { name: copy('rb.preset.today') }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('offers explicit start and end inputs, both real date fields', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(RAILS.trend))
    const popover = await openWindow(user)

    const from = within(popover).getByLabelText(copy('rb.control.window.from'))
    const to = within(popover).getByLabelText(copy('rb.control.window.to'))
    expect(from).toHaveAttribute('type', 'date')
    expect(to).toHaveAttribute('type', 'date')
    /* Seeded from the RESOLVED window, so the fields open on the days the
       report is actually covering rather than on empty. */
    const resolved = resolveWindow(RAILS.trend.window, EYVAR_TODAY)
    expect(from).toHaveValue(resolved.from)
    expect(to).toHaveValue(resolved.to)
  })

  it('shows two months side by side', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(RAILS.trend))
    const popover = await openWindow(user)

    /* `react-day-picker` gives each month grid `role="grid"` and an
       `aria-label` naming the month, so two grids is two VISIBLE months and
       not one grid drawn twice. */
    const months = await within(popover).findAllByRole('grid')
    expect(months).toHaveLength(2)
    expect(months[0]?.getAttribute('aria-label')).not.toBe(months[1]?.getAttribute('aria-label'))
  })

  it('requires an explicit Apply — no window commits on click-through', async () => {
    const user = userEvent.setup()
    const query = RAILS.trend
    renderAt(reportQueryPath(query))
    const popover = await openWindow(user)

    const apply = within(popover).getByRole('button', { name: copy('rb.control.window.apply') })
    expect(apply).toBeInTheDocument()

    /* Typing a date changes nothing until `Apply`. The trigger is the reading
       of the live window, so it is the observable consequence to check. */
    await user.clear(within(popover).getByLabelText(copy('rb.control.window.from')))
    await user.type(within(popover).getByLabelText(copy('rb.control.window.from')), '2026-01-05')
    expect(screen.getByLabelText(copy('rb.control.window'))).toHaveTextContent(
      copy('rb.preset.last-30d'),
    )

    await user.click(apply)
    await waitFor(() =>
      expect(screen.getByLabelText(copy('rb.control.window'))).toHaveTextContent(
        copy('rb.control.window.custom'),
      ),
    )
  })

  it('keeps Apply off while the range is inverted or half-typed (§3.2)', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(RAILS.trend))
    const popover = await openWindow(user)

    const from = within(popover).getByLabelText(copy('rb.control.window.from'))
    const apply = within(popover).getByRole('button', { name: copy('rb.control.window.apply') })

    await user.clear(from)
    /* Half-typed: `from` is empty and there is no window to commit. */
    expect(apply).toBeDisabled()

    /* Inverted: a start after the end never becomes a query. */
    await user.type(from, '2027-12-31')
    expect(apply).toBeDisabled()
  })
})

/* ───────────────────────── Cancel abandons ─────────────────────────────── */

describe('Cancel abandons the draft and leaves the query where it was', () => {
  it('discards a partial selection, and does not carry it into the next open', async () => {
    const user = userEvent.setup()
    const query = RAILS.trend
    renderAt(reportQueryPath(query))

    const popover = await openWindow(user)
    const from = within(popover).getByLabelText(copy('rb.control.window.from'))
    await user.clear(from)
    await user.type(from, '2026-01-05')
    await user.click(within(popover).getByRole('button', { name: copy('rb.control.window.cancel') }))

    /* 1 — the live window is untouched. */
    await waitFor(() =>
      expect(screen.getByLabelText(copy('rb.control.window'))).toHaveTextContent(
        copy('rb.preset.last-30d'),
      ),
    )
    expect(screen.getByLabelText(copy('rb.control.window'))).toHaveTextContent(rangeLabel(query))

    /* 2 — and the abandoned draft did not survive. A control that only closed
       would reopen on `2026-01-05` and commit it on the next Apply. */
    const reopened = await openWindow(user)
    const resolved = resolveWindow(query.window, EYVAR_TODAY)
    expect(within(reopened).getByLabelText(copy('rb.control.window.from'))).toHaveValue(
      resolved.from,
    )
  })

  it('leaves the query the URL carries unchanged, as Run proves', async () => {
    const user = userEvent.setup()
    const query = RAILS.trend
    renderAt(reportQueryPath(query))

    const popover = await openWindow(user)
    await user.clear(within(popover).getByLabelText(copy('rb.control.window.to')))
    await user.type(within(popover).getByLabelText(copy('rb.control.window.to')), '2026-02-02')
    await user.click(within(popover).getByRole('button', { name: copy('rb.control.window.cancel') }))

    await user.click(await screen.findByRole('button', { name: copy('rb.control.run') }))
    await waitFor(() => {
      const search = screen.getByTestId('search').textContent ?? ''
      const encoded = new URLSearchParams(search).get(REPORT_QUERY_PARAM)
      expect(encoded).toBeTruthy()
      expect(deserialiseReportQuery(encoded ?? '')?.window).toEqual(query.window)
    })
  })
})

/* ──────────────── the preset commits what it always committed ──────────── */

describe('a preset commits the same window the old control did', () => {
  it('writes {kind: preset} and closes, without an Apply', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(RAILS.trend))

    const popover = await openWindow(user)
    await user.click(within(popover).getByRole('button', { name: copy('rb.preset.last-7d') }))

    /* The preset is a complete choice, so it commits on click — `Apply`
       governs the CUSTOM range. The popover closes on the same act. */
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByLabelText(copy('rb.control.window'))).toHaveTextContent(
      copy('rb.preset.last-7d'),
    )

    await user.click(await screen.findByRole('button', { name: copy('rb.control.run') }))
    await waitFor(() => {
      const search = screen.getByTestId('search').textContent ?? ''
      const encoded = new URLSearchParams(search).get(REPORT_QUERY_PARAM)
      expect(deserialiseReportQuery(encoded ?? '')?.window).toEqual({
        kind: 'preset',
        preset: 'last-7d',
      })
    })
  })

  it('re-seeds the date fields from the preset it just committed', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(RAILS.trend))

    const popover = await openWindow(user)
    await user.click(within(popover).getByRole('button', { name: copy('rb.preset.last-7d') }))

    /* Both replaced controls held `from`/`to` in a `useState` initialiser that
       never ran again, so reopening after a preset showed the range from
       BEFORE it — and `Apply` would then have pinned the stale one. */
    const reopened = await openWindow(user)
    const resolved = resolveWindow({ kind: 'preset', preset: 'last-7d' }, EYVAR_TODAY)
    expect(within(reopened).getByLabelText(copy('rb.control.window.from'))).toHaveValue(
      resolved.from,
    )
    expect(within(reopened).getByLabelText(copy('rb.control.window.to'))).toHaveValue(resolved.to)
  })
})

/* ─────────────────── the calendar is paid for on opening ───────────────── */

describe('the calendar is not in the document until the popover opens', () => {
  it('renders no month grid on a closed rail, and two once opened', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(RAILS.trend))
    await screen.findByLabelText(copy('rb.control.window'))

    /* `ui/calendar.tsx` pulls `react-day-picker` and `date-fns`. It sits behind
       a `lazy` boundary so a rail that is never opened never downloads one. */
    expect(screen.queryAllByRole('grid')).toHaveLength(0)

    const popover = await openWindow(user)
    expect(await within(popover).findAllByRole('grid')).toHaveLength(2)
  })
})

/* ──────────────────── one control, on every rail ───────────────────────── */

describe('both rails render the same control', () => {
  it.each(MODES)('gives %s the presets, the inputs, two months and Apply', async (mode) => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(RAILS[mode]))
    const popover = await openWindow(user)

    expect(
      within(popover).getByRole('button', { name: copy('rb.preset.last-90d') }),
    ).toBeInTheDocument()
    expect(within(popover).getByLabelText(copy('rb.control.window.from'))).toHaveAttribute(
      'type',
      'date',
    )
    expect(within(popover).getByLabelText(copy('rb.control.window.to'))).toHaveAttribute(
      'type',
      'date',
    )
    expect(await within(popover).findAllByRole('grid')).toHaveLength(2)
    expect(
      within(popover).getByRole('button', { name: copy('rb.control.window.apply') }),
    ).toBeInTheDocument()
    expect(
      within(popover).getByRole('button', { name: copy('rb.control.window.cancel') }),
    ).toBeInTheDocument()
  })

  it.each(MODES)('states the resolved range on the %s trigger', async (mode) => {
    renderAt(reportQueryPath(RAILS[mode]))
    expect(await screen.findByLabelText(copy('rb.control.window'))).toHaveTextContent(
      rangeLabel(RAILS[mode]),
    )
  })

  /**
   * The one behavioural difference between the two controls this replaced, kept
   * rather than averaged away: `QueryPanel` disabled the range while the report
   * had no measure, and `ReportModePanel` deliberately did not — a cohort's
   * window is what decides how many columns it can reach, so it has to be
   * reachable before anything else is chosen.
   */
  it('stays disabled in place on an unstarted trend, and live on an unstarted cohort', async () => {
    renderAt('/management/reports?q=')
    const trend = await screen.findByLabelText(copy('rb.control.window'))
    expect(trend).toBeInTheDocument()
    expect(trend).toBeDisabled()

    renderAt(reportQueryPath({ ...base, mode: 'cohort' }))
    await waitFor(() => {
      const controls = screen.getAllByLabelText(copy('rb.control.window'))
      expect(controls[controls.length - 1]).toBeEnabled()
    })
  })
})

/* ────────────────────────── §9.2 / §9.5 — Arabic ───────────────────────── */

describe('the popover survives dir="rtl"', () => {
  /* O10 — the glyphs are picked by the SHELL's language, so a bare `dir`
     attribute is only half of Arabic. Seeding the language store gives the
     provider the same direction the document gets. */
  const arabic = () => defaultUiStore<string>(UI_STATE_KEYS.language).write('ar')
  const ar = (key: string) => REPORTS_AR[key] as string
  async function openWindowAr(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByLabelText(ar('rb.control.window')))
    return screen.findByRole('dialog')
  }
  afterEach(() => {
    defaultUiStore<string>(UI_STATE_KEYS.language).write('en')
    document.documentElement.removeAttribute('dir')
  })

  it('isolates the range on the trigger, so the leading digit stays put', async () => {
    arabic()
    renderAt(reportQueryPath(RAILS.trend))

    /* `13 Aug – 11 Sep` opens with a digit in a bidi-NEUTRAL context. Without a
       `<bdi>` the UBA throws that run to the far end of the Arabic line and the
       range reads backwards. */
    const resolved = resolveWindow(RAILS.trend.window, EYVAR_TODAY)
    const printed = await screen.findByText(
      ar('rb.control.window.range')
        .replace('{from}', formatDate(resolved.from, { style: 'day-month', language: 'ar' }))
        .replace('{to}', formatDate(resolved.to, { style: 'day-month', language: 'ar' })),
    )
    expect(printed.tagName.toLowerCase()).toBe('bdi')
  })

  it('mirrors the from→to arrow, and keeps From before To in the DOM', async () => {
    arabic()
    const user = userEvent.setup()
    renderAt(reportQueryPath(RAILS.trend))
    const popover = await openWindowAr(user)

    /* §9.5: an arrow BETWEEN two fields whose order mirrors is a reading-order
       mark and mirrors with them — unlike a delta caret, which is magnitude.
       The fields themselves are never placed by a side: `From` leads in the
       DOM and the flex row does the mirroring. */
    expect(popover.querySelector('svg.lucide-arrow-left')).not.toBeNull()
    expect(popover.querySelector('svg.lucide-arrow-right')).toBeNull()

    const from = within(popover).getByLabelText(ar('rb.control.window.from'))
    const to = within(popover).getByLabelText(ar('rb.control.window.to'))
    expect(from.compareDocumentPosition(to) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('still draws two months, with mirroring month navigation', async () => {
    arabic()
    const user = userEvent.setup()
    renderAt(reportQueryPath(RAILS.trend))
    const popover = await openWindowAr(user)

    /* Month ORDER is not asserted here — jsdom lays nothing out, and the order
       is CSS: `months` is a `flex-row`, which follows `dir`. What is asserted
       is that both months are still built, and that the `‹ ›` carry the mirror
       `ui/calendar.tsx` gives them. */
    expect(await within(popover).findAllByRole('grid')).toHaveLength(2)
    const previous = popover.querySelector('.rdp-button_previous svg')
    const next = popover.querySelector('.rdp-button_next svg')
    expect(previous?.getAttribute('class') ?? '').toMatch(/lucide-chevron-right/)
    expect(next?.getAttribute('class') ?? '').toMatch(/lucide-chevron-left/)
  })

  it('answers every one of the popover keys in Arabic', () => {
    /* §9.3's objection is to a HALF-translated console. These six are what the
       popover says; a missing one renders English beside Arabic. */
    for (const key of [
      'rb.control.window',
      'rb.control.window.from',
      'rb.control.window.to',
      'rb.control.window.custom',
      'rb.control.window.apply',
      'rb.control.window.cancel',
      'rb.control.window.range',
    ] as const) {
      expect(REPORTS_AR[key], key).toBeTruthy()
    }
    for (const preset of REPORT_PRESETS) {
      expect(REPORTS_AR[`rb.preset.${preset}`], preset).toBeTruthy()
    }
  })
})
