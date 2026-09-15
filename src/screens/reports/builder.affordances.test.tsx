/**
 * **The four builder affordances Wave 1 added, as behaviour an operator can
 * observe.**
 *
 * Each of the four closes a gap where the design work had already been done and
 * the wiring had not:
 *
 * 1. **`Copy link`** — `rb.canvas.link.copy` / `.copied` / `.failed` were
 *    written and translated and rendered by nothing. The assertion is not
 *    *"a button exists"*: it is that what lands in the clipboard **round-trips
 *    back to the question on screen**, because a share button that copies a
 *    slightly different query is worse than no share button.
 * 2. **The refusal is stated.** A clipboard is a permission and permissions get
 *    refused. Asserted through the real `<Toaster>`, not through a spy, so a
 *    `catch {}` that swallowed the failure would fail this test.
 * 3. **The table ships with the chart.** Both are asserted *in the same render*
 *    — a test that only looked for the table would pass on the old
 *    early-return, which is precisely the defect. The chart half is now the
 *    plot itself rather than the population sentence that used to stand in for
 *    it; see the comment on that test for what moved.
 * 4. **The five modes are one interaction away, and none of them is refused.**
 *    G1 asked for all five visible without opening anything and the owner
 *    overruled it — they are entries in the one `Chart type` menu now — so what
 *    is asserted is what G1 was protecting: every mode discoverable, every mode
 *    offerable, no mode disabled by its own configuration.
 *
 * Disciplines this file keeps, in common with `reports.test.tsx`:
 * **no fixture is imported** (queries are composed here), and **nothing spies
 * on a client namespace** — the only stub is `navigator.clipboard`, which is a
 * browser capability jsdom does not implement rather than a seam of ours.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { ShellProvider } from '@/shell/ShellContext'
import {
  deserialiseReportQuery,
  disableMockLatency,
  mockFailures,
  REPORT_QUERY_PARAM,
  reportQueryPath,
  resetDataLayer,
} from '@/data/clients'
import { REPORT_MODES, normaliseReportQuery, type ReportQuery } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { REPORTS_EN } from './copy'
import { ReportsScreen } from './ReportsScreen'

const copy = (key: string) => REPORTS_EN[key] as string
const shell = (key: string) => EN[key] as string

/** A legal trend, composed here rather than read out of the seed. */
const TREND: ReportQuery = {
  measures: [{ key: 'captains.registered' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

let writeText: ReturnType<typeof vi.fn>

/**
 * **After `userEvent.setup()`, never before.** `setup()` installs its own
 * clipboard stub over `navigator.clipboard` so that `user.copy()` works, and it
 * does so at call time — a stub installed in `beforeEach` is silently replaced
 * and the test then asserts against user-event's clipboard rather than ours.
 * jsdom ships no Clipboard API of its own, so without this the production
 * `try` throws a `TypeError` on property access and the success path is never
 * exercised.
 */
function stubClipboard() {
  writeText = vi.fn(async () => {})
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  })
  return writeText
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither and Radix's menu calls both on the trigger. Same
     reasoning as `reports.test.tsx`; kept local to each file. */
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

afterEach(() => {
  /* Sonner's store is module-global and outlives a render, so a toast raised by
     one test is still on screen in the next one. */
  toast.dismiss()
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <ReportsScreen />
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/** The builder's third secondary spills into `More actions` by §8's cap of two. */
async function openCopyLink(user: ReturnType<typeof userEvent.setup>) {
  const more = await screen.findByRole('button', { name: shell('shell.moreActions') })
  await user.click(more)
  const item = await screen.findByRole('menuitem', { name: copy('rb.canvas.link.copy') })
  await user.click(item)
}

/* ───────────────────────── 1 — Copy link (G27, G28) ─────────────────────── */

describe('the builder can hand someone the question it is showing', () => {
  it('writes an absolute URL whose query deserialises back to the report on screen', async () => {
    const user = userEvent.setup()
    stubClipboard()
    renderAt(reportQueryPath(TREND))
    await screen.findByRole('button', { name: shell('shell.moreActions') })

    await openCopyLink(user)

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    const url = new URL(writeText.mock.calls[0]![0] as string)

    /* Absolute — a relative path pasted into a chat window is not a link. */
    expect(url.origin).toBe(window.location.origin)
    expect(url.pathname).toBe('/management/reports')

    /* The load-bearing half: the same question, not a similar one. Compared
       through `normaliseReportQuery` because that is the equality the data
       layer defines; a string comparison would fail on key order alone. */
    const encoded = url.searchParams.get(REPORT_QUERY_PARAM)
    expect(encoded).toBeTruthy()
    expect(deserialiseReportQuery(encoded!)).toEqual(normaliseReportQuery(TREND))
  })

  it('confirms with a toast naming what was copied (R9, R10)', async () => {
    const user = userEvent.setup()
    stubClipboard()
    renderAt(reportQueryPath(TREND))
    await screen.findByRole('button', { name: shell('shell.moreActions') })

    await openCopyLink(user)

    expect(await screen.findByText(copy('rb.canvas.link.copied'))).toBeInTheDocument()
  })

  it('states a clipboard refusal instead of failing silently, and does not throw', async () => {
    const user = userEvent.setup()
    stubClipboard().mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    renderAt(reportQueryPath(TREND))
    await screen.findByRole('button', { name: shell('shell.moreActions') })

    await openCopyLink(user)

    /* The refusal is stated. A silent `catch {}` would leave whatever was in
       the clipboard before, and the operator would paste it. */
    expect(await screen.findByText(copy('rb.canvas.link.failed'))).toBeInTheDocument()
    expect(screen.queryByText(copy('rb.canvas.link.copied'))).not.toBeInTheDocument()
  })

  it('offers no link for a question that cannot be run', async () => {
    const user = userEvent.setup()
    /* The empty question carries violations, so there is nothing answerable to
       send: the recipient would land on the invalid-query canvas. */
    renderAt('/management/reports?q=')
    const more = await screen.findByRole('button', { name: shell('shell.moreActions') })
    await user.click(more)

    const item = await screen.findByRole('menuitem', { name: copy('rb.canvas.link.copy') })
    /* Disabled IN PLACE — present and off, never removed (D9 CQ-3). */
    expect(item).toBeInTheDocument()
    expect(item).toHaveAttribute('aria-disabled', 'true')
  })
})

/* ─────────────────── 2 — the table WITH the chart (G18) ─────────────────── */

describe('a chart ships with its numbers', () => {
  it('renders the plot and the table together for a line report', async () => {
    renderAt(reportQueryPath(TREND))

    /* **The picture, asserted as the picture.** This used to look for the
       population sentence, on the reasoning that `PanelCard` rendered it and
       nothing else did — so its presence stood in for the chart's. Both halves
       of that moved: the compound-plot rewrite took `PanelCard` off the canvas'
       drawable path, and the population sentence became an `InfoHint` on the
       measure's label row. The plot is now asserted directly, which is what the
       test meant all along: the marks are inert, so the plot's accessible name
       is what a reader is told is in it, and it names the measure asked for.

       `role="group"`, not `role="img"` (`SeriesChart.tsx` §2.2): the region is
       keyboard-navigable — arrow keys walk the points — rather than a static
       picture, so it is announced and operated as a group, not an image. */
    const canvas = await screen.findByRole('region', { name: copy('rb.canvas.heading') })
    const plot = await within(canvas).findByRole('group', {
      name: copy('rb.measure.captains.registered'),
    })
    expect(plot).toHaveAccessibleName(copy('rb.measure.captains.registered'))

    /* The numbers, in the same render — under their own heading, so the table
       reads as a second view of this result rather than as another result. */
    const section = await screen.findByRole('region', { name: copy('rb.canvas.table.heading') })
    const table = within(section).getByRole('table')
    expect(within(table).getByText(copy('rb.table.series'))).toBeInTheDocument()
  })

  it('does not let the table hide a series — no row checkboxes', async () => {
    renderAt(reportQueryPath(TREND))
    const section = await screen.findByRole('region', { name: copy('rb.canvas.table.heading') })
    /* Series membership is decided by `panelId` on the wire. A checkbox here
       would let the table disagree with the picture beside it. */
    expect(within(section).queryByRole('checkbox')).not.toBeInTheDocument()
  })
})

/* ──────────────────── 3 — freshness and refresh (G8) ────────────────────── */

describe('the freshness sentence carries the way to act on it', () => {
  it('re-runs the question from beside the timestamp', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(TREND))

    /* The sentence keeps its own node: the button is beside it, not inside the
       live region. */
    expect(
      await screen.findByText(copy('rb.canvas.asOf').replace(' {time}', ''), { exact: false }),
    ).toBeInTheDocument()

    /* A re-run is only observable through its outcome, so the next one is made
       to fail: the canvas can reach its error state only if a request was
       actually issued by this button. */
    mockFailures.always('reports.run')
    await user.click(screen.getByRole('button', { name: copy('rb.canvas.error.retry') }))

    await waitFor(() => expect(screen.getByText(copy('rb.canvas.error'))).toBeInTheDocument(), {
      timeout: 3000,
    })
  })
})

/* ───────────── 4 — the five questions live in the shape menu ───────────── */

/**
 * **G1 said "all five visible without opening anything" and the owner overruled
 * it**: *"rather than funnel, or retention or journeys, make them chart types"*,
 * because *"we don't have funnel or journey data here at all"* — so neither
 * deserves a permanent tab beside the question that actually gets asked.
 *
 * What G1 was protecting is kept, and that is what these tests now hold: an
 * operator who has never opened the menu must still be able to DISCOVER that a
 * funnel, a retention matrix and a journey tree are on offer, and every one of
 * them must still be one interaction away. The strip's other promise — that a
 * mode is never disabled, because its *configuration* is what can be illegal
 * and greying out `Funnel` would hide the only control that could fix it — is
 * asserted here too.
 */
describe('all five questions are one menu away, and none of them is refused', () => {
  it('offers every mode in the shape menu, alongside the chart types', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(TREND))
    const menu = await screen.findByRole('combobox', { name: copy('rb.viz.label') })

    /* The trigger shows the live shape, which is the strip's `aria-pressed`
       promise in a menu's own vocabulary: the selection is READ OUT, not merely
       coloured (§7.5). */
    expect(menu).toHaveTextContent(copy('rb.viz.line'))

    await user.click(menu)
    for (const mode of REPORT_MODES) {
      const option = await screen.findByRole('option', {
        name: (name: string) => name.startsWith(copy(`rb.viz.${mode === 'trend' ? 'line' : mode}`)),
      })
      expect(option).toBeVisible()
      /* **A mode is never illegal — its configuration is.** Disabling
         `Funnel` because no rungs are chosen would hide the only control that
         can choose them. */
      if (mode !== 'trend') expect(option).not.toHaveAttribute('aria-disabled', 'true')
    }
  })

  it('switches the question on one pick, and the trigger says which', async () => {
    const user = userEvent.setup()
    renderAt(reportQueryPath(TREND))
    const menu = await screen.findByRole('combobox', { name: copy('rb.viz.label') })

    await user.click(menu)
    await user.click(
      await screen.findByRole('option', {
        name: (name: string) => name.startsWith(copy('rb.viz.cohort')),
      }),
    )

    /* The retention rail replaced the trend rail — the mode really changed,
       rather than only the label on the trigger. */
    expect(await screen.findByLabelText(copy('rb.cohort.anchor'))).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: copy('rb.viz.label') })).toHaveTextContent(
        copy('rb.viz.cohort'),
      ),
    )
  })
})
