/**
 * **The builder's chrome — the toolbar, the mode strip, the title block and the
 * overflow**, as behaviour an operator can observe.
 *
 * Everything here is a *fidelity* change rather than a functional one, which is
 * exactly why it needs tests: nothing about the numbers moved, so nothing about
 * the numbers would fail if the row above the plot quietly went back to being
 * two copies of the same control in a rail.
 *
 * The five things asserted, and why each one is the thing that breaks:
 *
 * 1. **The toolbar is BEFORE the canvas in the DOM.** A row that looks right
 *    and reads last is a row a keyboard operator meets after scrolling past
 *    twelve panels. Position is asserted through `compareDocumentPosition`, not
 *    through a class name.
 * 2. **Each moved control exists exactly once.** The failure mode of "move a
 *    control" is "copy a control": two windows on one screen can disagree, and
 *    whichever one the operator did not touch is the one that ran.
 * 3. **Every mode tab has a decorative glyph and keeps its name.** An icon that
 *    is not `aria-hidden` puts `lucide-line-chart` into the button's accessible
 *    name, and the strip stops being five named questions.
 * 4. **The badge tracks dirtiness**, including dirtiness that is *not* the
 *    query — renaming a saved report makes it a draft.
 * 5. **PDF is listed, off, and says why (D9 CQ-3); PNG works once a chart
 *    exists (AC-1159) and is off only before then.** Hidden is not the same as
 *    unavailable, and an operator hunting for an export this product does not
 *    have is the cost of hiding it.
 *
 * Disciplines kept from `reports.test.tsx`: **no fixture module is imported**
 * (records come through the client seam) and **nothing spies on a client
 * namespace**.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { disableMockLatency, listReports, reportQueryPath, resetDataLayer } from '@/data/clients'
import type { ReportQuery, SavedReport } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { REPORTS_EN } from './copy'
import { ReportBuilder } from './ReportBuilder'

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

const copy = (key: string) => REPORTS_EN[key] as string
const shellCopy = (key: string) => EN[key] as string
const t = createTranslator({ dictionary: EN })

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither and Radix's menu, select and popover all call them
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

/** Read through the seam. A test that reads the seed array tests the seed. */
async function savedReports(): Promise<readonly SavedReport[]> {
  return (await listReports({ pageSize: 100 })).items
}

/**
 * The builder, mounted directly.
 *
 * `ReportsScreen` is the wrapper this normally arrives through, and it takes
 * its report from the URL. Mounting the builder itself is what lets one test
 * hold a SAVED record and the next hold none, which is the whole subject of the
 * badge assertions.
 */
function renderBuilder(report: SavedReport | null) {
  return renderBuilderAt('/management/reports', report)
}

/** As `renderBuilder`, at a chosen path — a seeded `?q=` runs on arrival, with no debounce to wait out. */
function renderBuilderAt(path: string, report: SavedReport | null) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <ReportBuilder
          report={report}
          noDataSentence={shellCopy('overview.noData')}
          title={copy('rb.page.title')}
          t={t}
          language="en"
        />
      </ShellProvider>
    </MemoryRouter>,
  )
}

const toolbar = () => screen.getByRole('group', { name: copy('rb.toolbar.heading') })

/* ─────────────── 1 — the toolbar sits above the canvas ─────────────────── */

describe('§A7 — the presentation controls are a row above the plot', () => {
  it('renders the toolbar BEFORE the canvas in document order', async () => {
    renderBuilder(null)

    const row = toolbar()
    const canvas = await screen.findByRole('region', { name: copy('rb.canvas.heading') })

    /* Reading order, not visual order: `order-*` and `flex-col-reverse` can put
       a row on top while leaving it last for a keyboard and a screen reader. */
    expect(row.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps the rail — the question — beside the answer, not merged into it', async () => {
    renderBuilder(null)
    const rail = await screen.findByRole('region', { name: copy('rb.panel.heading') })
    expect(rail).toBeInTheDocument()
    /* The measure picker is still the rail's, because it changes the QUESTION. */
    expect(within(rail).getByLabelText(copy('rb.control.measure'))).toBeInTheDocument()
  })
})

/* ──────────── 2 — moved, which is not the same as copied ───────────────── */

describe('the moved controls exist exactly once, in the toolbar', () => {
  /* `rb.control.chartType` left this list because the control did: the shape
     is chosen in the one `rb.viz.label` menu now, which also swallowed the mode
     strip. The other three are unchanged and must still be in the toolbar
     exactly once — a setting with two controls has two controls that disagree. */
  const MOVED = [
    'rb.control.window',
    'rb.control.grain',
    'rb.viz.label',
    'rb.control.compare',
  ] as const

  it.each(MOVED)('%s renders once, and it is inside the toolbar', async (key) => {
    renderBuilder(null)
    await screen.findByRole('region', { name: copy('rb.canvas.heading') })

    /* `getAllBy`, deliberately: `getBy` would throw on a duplicate with a
       message about the query rather than about the defect. */
    const found = screen.getAllByLabelText(copy(key))
    expect(found, 'a setting with two controls has two controls that disagree').toHaveLength(1)
    expect(toolbar()).toContainElement(found[0] as HTMLElement)
  })

  it('leaves none of them behind in the rail', async () => {
    renderBuilder(null)
    const rail = await screen.findByRole('region', { name: copy('rb.panel.heading') })
    for (const key of MOVED) {
      expect(within(rail).queryByLabelText(copy(key))).toBeNull()
    }
  })

  /* **The quick-range strip is gone and this asserts that it stays gone.**
     It offered four of the nine presets the range popover already carries —
     the same setting with two controls, which is the exact defect the MOVED
     list above exists to catch, shipped one row along. */
  it('leaves no second range control beside the range popover', async () => {
    renderBuilder(null)
    await screen.findByRole('region', { name: copy('rb.canvas.heading') })
    expect(screen.queryByRole('group', { name: copy('rb.toolbar.range') })).toBeNull()
    expect(within(toolbar()).getAllByLabelText(copy('rb.control.window'))).toHaveLength(1)
  })
})

/* ──────────── 3 — one shape menu, seven entries, seven glyphs ─────────── */

/**
 * The five-button mode strip and the four-button chart-type strip were two
 * controls answering *what shape is this answer*, one of them able to say
 * `Data table` and the other `Table`. They are one menu now, on the owner's
 * ruling — *"rather than funnel, or retention or journeys, make them chart
 * types"* — and these tests hold that menu to what both strips promised: every
 * entry offered, every entry named by its label, every entry carrying a
 * decorative glyph that does not leak into the name.
 */
describe('§A1 — the one shape menu carries an icon per entry', () => {
  const ENTRIES = ['line', 'bar', 'pie', 'table', 'cohort', 'funnel', 'journey'] as const

  /**
   * The option's accessible name OPENS with its label and may continue with
   * the reason it is refused — D9 CQ-3 puts that sentence inside the option's
   * own subtree. `getByRole`'s `name` takes no `exact` flag, so a prefix is
   * expressed as a predicate.
   */
  const named = (entry: (typeof ENTRIES)[number]) => (name: string) =>
    name.startsWith(copy(`rb.viz.${entry}`))

  it('offers all seven, and none of them is hidden behind a legality rule', async () => {
    const user = userEvent.setup()
    renderBuilder(null)
    await screen.findByRole('region', { name: copy('rb.canvas.heading') })

    await user.click(screen.getByRole('combobox', { name: copy('rb.viz.label') }))
    for (const entry of ENTRIES) {
      expect(await screen.findByRole('option', { name: named(entry) })).toBeInTheDocument()
    }
  })

  it.each(ENTRIES)('gives %s a hidden glyph that stays out of the name', async (entry) => {
    const user = userEvent.setup()
    renderBuilder(null)
    await screen.findByRole('region', { name: copy('rb.canvas.heading') })

    await user.click(screen.getByRole('combobox', { name: copy('rb.viz.label') }))
    const option = await screen.findByRole('option', { name: named(entry) })

    /* **Not `querySelector('svg')`.** `SelectItem` renders its own check
       indicator first, so the bare selector asserted `size-4` about a
       primitive's tick and passed for the wrong reason. `data-slot` names the
       one glyph this test is about. */
    const glyph = option.querySelector('[data-slot="viz-glyph"]')
    expect(glyph, 'every entry carries one').not.toBeNull()
    expect(glyph).toHaveAttribute('aria-hidden', 'true')
    /* One set, one size (§1.5). `size-4` is 16px. */
    expect(glyph?.getAttribute('class') ?? '').toContain('size-4')
  })

  it('leaves no mode strip behind in the rail', async () => {
    renderBuilder(null)
    await screen.findByRole('region', { name: copy('rb.canvas.heading') })
    expect(screen.queryByRole('group', { name: copy('rb.control.mode') })).toBeNull()
  })
})

/* ──────────────────── 4 — DRAFT until it is SAVED ──────────────────────── */

describe('§A5 — the badge says whether what is on screen has been written down', () => {
  it('reads Draft on a report that has never been saved', () => {
    renderBuilder(null)
    expect(screen.getByText(copy('rb.state.draft'))).toBeInTheDocument()
    expect(screen.queryByText(copy('rb.state.saved'))).toBeNull()
  })

  it('reads Saved on a clean record, and Draft the moment the title is edited', async () => {
    const user = userEvent.setup()
    const report = (await savedReports())[0] as SavedReport
    renderBuilder(report)

    expect(screen.getByText(copy('rb.state.saved'))).toBeInTheDocument()

    /* **Dirtiness is not only the query.** A renamed report is a report the
       server does not have, and a badge that only watched the query would call
       it clean. */
    await user.type(screen.getByLabelText(copy('rb.title.label')), '!')

    expect(await screen.findByText(copy('rb.state.draft'))).toBeInTheDocument()
    expect(screen.queryByText(copy('rb.state.saved'))).toBeNull()
  })

  it('seeds the title and the description from the record, and asks a question', async () => {
    const report = (await savedReports())[0] as SavedReport
    renderBuilder(report)

    expect(screen.getByLabelText(copy('rb.title.label'))).toHaveValue(report.name)
    /* §A5's placeholder is a QUESTION, and it is the only place a report says
       why it exists. */
    expect(screen.getByLabelText(copy('rb.description.label'))).toHaveAttribute(
      'placeholder',
      copy('rb.description.placeholder'),
    )
  })
})

/* ─────────────── 5 — blocked exports are listed, not hidden ────────────── */

describe('§A6 / D9 CQ-3 — an export this product cannot do is disabled with a reason', () => {
  it('shows PNG and PDF off before anything has run, and states why PDF stays off', async () => {
    const user = userEvent.setup()
    renderBuilder(null)

    await user.click(await screen.findByRole('button', { name: shellCopy('shell.moreActions') }))
    await user.click(await screen.findByRole('menuitem', { name: copy('rb.export.menu') }))

    const png = await screen.findByRole('menuitem', { name: copy('rb.export.png') })
    const pdf = await screen.findByRole('menuitem', { name: copy('rb.export.pdf') })

    /* Present AND off — both halves, because a "not enabled" check alone passes
       on a control that was removed. Nothing has run yet, so PNG has no chart
       to rasterise — the same reason CSV stays off here too. */
    expect(png).toHaveAttribute('aria-disabled', 'true')
    expect(pdf).toHaveAttribute('aria-disabled', 'true')

    /* PDF's own reason, in the menu, where the operator is looking. Amplitude
       greys these out and says nothing; this sentence is the difference. */
    expect(screen.getByText(copy('rb.export.pdf.blocked'))).toBeInTheDocument()
  })

  it('AC-1159 — enables PNG once a chart exists, PDF stays off', async () => {
    const user = userEvent.setup()
    renderBuilderAt(reportQueryPath(TREND), null)
    /* The seeded question runs on arrival. Waited through the TABLE beneath
       the chart, not the plot itself: jsdom lays out nothing, so Recharts'
       `ResponsiveContainer` never measures a size and never draws an `<svg>`
       (AGENT-BRIEF's own trap) — but the numbers-beneath section is plain
       markup and is the honest signal that `status` reached `content`. */
    await screen.findByRole('region', { name: copy('rb.canvas.table.heading') })

    await user.click(await screen.findByRole('button', { name: shellCopy('shell.moreActions') }))
    await user.click(await screen.findByRole('menuitem', { name: copy('rb.export.menu') }))

    expect(await screen.findByRole('menuitem', { name: copy('rb.export.png') })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('menuitem', { name: copy('rb.export.pdf') })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })
})

/* ────────────────────── 6 — the row survives Arabic ────────────────────── */

describe('§9.1 / §9.5 — the toolbar renders right-to-left', () => {
  afterEach(() => document.documentElement.removeAttribute('dir'))

  it('keeps every control, and mirrors none of the chart or calendar glyphs', async () => {
    document.documentElement.setAttribute('dir', 'rtl')
    renderBuilder(null)
    await screen.findByRole('region', { name: copy('rb.canvas.heading') })

    const row = toolbar()
    /* Present under `rtl`, in the same reading order — the layout is logical,
       so nothing here is placed by a physical side. */
    expect(within(row).getByLabelText(copy('rb.control.window'))).toBeInTheDocument()
    expect(within(row).getByLabelText(copy('rb.control.grain'))).toBeInTheDocument()
    expect(within(row).getByLabelText(copy('rb.control.chartType'))).toBeInTheDocument()

    /* §9.5's closed set: a chart glyph and a calendar are OBJECTS, not
       reading-order marks. `panelCard.test.tsx` holds the same line for the
       delta caret, and `shell/icons.tsx` records that the per-glyph mirror
       opt-in has no call sites. Nothing added here may open one. */
    for (const svg of row.querySelectorAll('svg')) {
      const className = svg.getAttribute('class') ?? ''
      expect(className, svg.getAttribute('class') ?? '').not.toMatch(/scale-x/)
    }
  })
})
