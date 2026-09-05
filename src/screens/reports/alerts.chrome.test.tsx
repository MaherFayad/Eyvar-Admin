/**
 * **The chrome of the alerts and library surfaces** — the Amplitude pass (§H,
 * §A6, §B4), held to the rules that pass did **not** waive.
 *
 * Every assertion here is about a *pair*, because every finding this file
 * guards is a case where one half could ship without the other and still look
 * finished:
 *
 * - a state renders a glyph **and** its word, and the word is asserted
 *   explicitly — so the day someone decides five glyphs are self-evident and
 *   drops the badge, this fails rather than the colour-blind operator finding
 *   out;
 * - the *"nothing is checking these rules"* banner still renders while any rule
 *   carries `cadence: null` — it is a recorded decision (AC-453), not chrome,
 *   and a visual pass is exactly the sort of change that quietly removes it;
 * - the library's type glyph is asserted **against the saved `chartType`**, not
 *   merely present, because a glyph that is always the line chart is decoration
 *   pretending to be information;
 * - the history's empty state is asserted to be an **illustration** and not a
 *   scaled-up lucide icon (§1.5), which is the one shortcut that would have
 *   made requirement 4 a one-liner and would read as a broken image.
 *
 * Everything is read through the client seam (`listAlertRules`,
 * `listAlertFirings`, `listReports`), never out of a fixture module —
 * `seam.test.ts` forbids the second and a test that reads the seed is testing
 * the seed.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import {
  disableMockLatency,
  listAlertFirings,
  listAlertRules,
  listReports,
  resetDataLayer,
} from '@/data/clients'
import type { AlertRule, SavedReport } from '@/data/types'
import { EN as SHELL_EN } from '@/i18n/dictionaries'
import { REPORTS_EN } from './copy'
import { ReportsScreen } from './ReportsScreen'

const EN = (key: string) => REPORTS_EN[key] as string
const HINT = SHELL_EN['shell.hint.show'] as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither, and Radix's select, menu and dialog all call them
     on the trigger. The same stubs `alerts.corrections.test.tsx` carries. */
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <ReportsScreen />
      </ShellProvider>
    </MemoryRouter>,
  )
}

async function alertRules(): Promise<readonly AlertRule[]> {
  return (await listAlertRules({ pageSize: 100 })).items
}

async function savedReports(): Promise<readonly SavedReport[]> {
  return (await listReports({ pageSize: 100 })).items
}

/** The row whose identity cell holds this name, reached the way an operator does. */
async function rowNamed(name: string): Promise<HTMLElement> {
  const rows = await screen.findAllByRole('row')
  const row = rows.find((candidate) => within(candidate).queryByText(name))
  expect(row, `no row named ${name}`).toBeDefined()
  return row as HTMLElement
}

/**
 * Four declared row actions put the lane behind an overflow menu (`DataTable`
 * renders up to two directly and three or more as a menu), so every action on
 * these two tables is reached through it — which is also how an operator
 * reaches it.
 */
async function openRowOverflow(
  user: ReturnType<typeof userEvent.setup>,
  row: HTMLElement,
): Promise<void> {
  await user.click(within(row).getByRole('button', { name: /More actions/ }))
}

/* ───────────── a state is a shape AND a word, never one of them ──────────── */

describe('every alert state carries a glyph beside its word', () => {
  it('renders both for every state the list actually holds', async () => {
    const rules = await alertRules()
    const states = [...new Set(rules.map((rule) => rule.state))]
    /* If the seed ever collapses to one state this fails here rather than
       passing vacuously on a single row. */
    expect(states.length).toBeGreaterThan(1)

    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')

    for (const state of states) {
      /* **The word, asserted first and asserted explicitly.** This is the whole
         point of the pair: the glyph is redundancy, and a test that only found
         the glyph would let someone drop the badge and call it tidier. */
      expect(
        (await screen.findAllByText(EN(`rb.alert.state.${state}`))).length,
      ).toBeGreaterThan(0)

      /* The glyph, found by a data attribute rather than by lucide's own
         `lucide-shield-check` class — that class is the library's, and
         asserting on it would turn a lucide upgrade into a UI test failure. */
      expect(
        document.querySelectorAll(`[data-state-glyph="${state}"]`).length,
        `no glyph for state ${state}`,
      ).toBeGreaterThan(0)
    }
  })

  it('puts the glyph in the same cell as the word it qualifies', async () => {
    const rules = await alertRules()
    const firing = rules.find((rule) => rule.state === 'firing')
    expect(firing).toBeDefined()

    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')

    const row = await rowNamed(firing!.name)
    const cell = within(row).getByText(EN('rb.alert.state.firing')).closest('td')
    expect(cell).not.toBeNull()
    /* A glyph three columns away is not redundancy, it is a second unrelated
       mark — so the pair is asserted inside one cell. */
    expect(cell!.querySelector('[data-state-glyph="firing"]')).not.toBeNull()
  })

  it('never lets a glyph carry a state on its own — every one is aria-hidden', async () => {
    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')

    const glyphs = document.querySelectorAll('[data-state-glyph]')
    expect(glyphs.length).toBeGreaterThan(0)
    for (const glyph of glyphs) {
      /* §1.5 — the glyph is decorative and the label beside it carries the
         name. A glyph that announced itself would be a second, differently
         worded state for a screen-reader user. */
      expect(glyph.getAttribute('aria-hidden')).toBe('true')
      expect(glyph.tagName.toLowerCase()).toBe('svg')
    }
  })

  it('T9.15 — states the threshold once, with no unit line repeating it', async () => {
    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')

    expect(
      await screen.findByRole('columnheader', { name: EN('rb.alerts.col.threshold') }),
    ).toBeInTheDocument()
    /* The value carries its own unit, so the 12px line under it was a second
       reading of one fact and half the row's height (X15). */
    expect(
      screen.queryByText(
        EN('rb.alert.form.threshold.unit').replace('{unit}', EN('rb.unit.count')),
      ),
    ).toBeNull()
  })

  it('T9.15 — keeps the state cell to one badge and no wrapped paragraph', async () => {
    const rules = await alertRules()
    const suspended = rules.find((rule) => rule.state === 'suspended')
    expect(suspended, 'no seeded suspended rule').toBeDefined()

    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')

    const row = await rowNamed(suspended!.name)
    const cell = within(row).getByText(EN('rb.alert.state.suspended')).closest('td')
    expect(cell).not.toBeNull()
    /* The server's reason is an explanation, so it is behind the hint rather
       than four 12px lines inside a cell (X15). */
    expect(cell!.textContent).not.toContain(EN(suspended!.stateReasonKey!))
    expect(
      within(cell as HTMLElement).getByRole('button', { name: HINT }),
    ).toBeInTheDocument()
  })

  it('T9.15 — names the muted and the disabled glyph without printing a word', async () => {
    const rules = await alertRules()
    const muted = rules.find((rule) => rule.mutedUntil !== null)
    const off = rules.find((rule) => !rule.enabled)
    expect(muted ?? off, 'no seeded muted or disabled rule').toBeDefined()

    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')

    for (const [rule, kind] of [
      [muted, 'muted'],
      [off, 'disabled'],
    ] as const) {
      if (!rule) continue
      const row = await rowNamed(rule.name)
      const note = row.querySelector(`[data-state-note="${kind}"]`)
      expect(note, `no ${kind} glyph on ${rule.name}`).not.toBeNull()
      /* A tooltip names it, and the name is on the element so it survives with
         the tooltip shut and with no pointer (§7.5). */
      expect(note!.getAttribute('aria-label')).toBeTruthy()
      expect((note as HTMLElement).tabIndex).toBe(0)
      expect(note!.querySelector(`[data-state-glyph="${kind}"]`)).not.toBeNull()
    }
  })

  it('T9.15 — leaves the rule sentence out of the identity cell', async () => {
    const rules = await alertRules()
    const rule = rules[0]!

    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')

    const cell = within(await rowNamed(rule.name)).getByText(rule.name).closest('td')
    expect(cell).not.toBeNull()
    /* One line: the name. The sentence reads in full in the row's `title` and
       in the rule's own dialog. */
    expect(cell!.textContent).toBe(rule.name)
    expect(cell!.querySelector('[title]')?.getAttribute('title')).toContain(
      EN('rb.alert.comparator.' + rule.comparator),
    )
  })
})

/* ──────────── the recorded decision the visual pass may not lose ─────────── */

describe('“nothing is checking these rules” survives the chrome', () => {
  it('still renders while any rule carries a null cadence', async () => {
    const rules = await alertRules()
    expect(rules.some((rule) => rule.cadence === null)).toBe(true)

    renderAt('/management/reports?view=alerts')

    /* R10 — a standing condition is a banner, and this one is the honest
       surface for `cadence: null`. It is asserted with its body, because a
       title alone would pass against a banner reduced to a heading. */
    const banner = await screen.findByText(EN('rb.alerts.banner.title'))
    expect(screen.getByText(EN('rb.alerts.banner.body'))).toBeInTheDocument()

    /* And still ABOVE the table, which is the placement the correction needs to
       outrank a badge on every row. */
    const table = await screen.findByRole('table')
    expect(banner.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    /* T9.15/R10 — the banner says it once, so no row repeats it. */
    expect(rules.some((rule) => rule.cadence === null)).toBe(true)
    expect(screen.queryByText(EN('rb.alert.cadence.unset'))).toBeNull()
  })

  it('T9.15 — offers Test a rule on the banner and answers by name', async () => {
    const user = userEvent.setup()
    const rules = await alertRules()
    /* The banner's action reads the first rule nothing checks that §13.3 lets
       it read — the same rule the screen picks. */
    const target = rules.find((rule) => rule.cadence === null && rule.state !== 'suspended')
    expect(target, 'no seeded rule the banner could test').toBeDefined()

    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')

    await user.click(
      await screen.findByRole('button', { name: EN('rb.alerts.banner.action') }),
    )

    /* One list, several writers, so every outcome names the rule it answers
       for. AC-877: a test changes nothing and tells nobody. */
    const answers = await screen.findAllByRole('status')
    const list = answers.find((node) => node.tagName.toLowerCase() === 'ul')
    expect(list, 'no test-result list').toBeDefined()
    expect(within(list as HTMLElement).getAllByRole('listitem')).toHaveLength(1)
    expect(list!.textContent).toContain(target!.name)
  })

  it('T9.15 — leaves the Checked cell blank while the banner is showing', async () => {
    const rules = await alertRules()
    const unset = rules.find((rule) => rule.cadence === null)
    expect(unset).toBeDefined()

    renderAt('/management/reports?view=alerts')
    const table = await screen.findByRole('table')

    const headers = within(table).getAllByRole('columnheader')
    const index = headers.findIndex((h) => h.textContent?.includes(EN('rb.alerts.col.cadence')))
    expect(index).toBeGreaterThan(-1)

    const row = await rowNamed(unset!.name)
    /* O9 — an absence the banner already states is blank, never a dash and
       never a repeated word. */
    expect(within(row).getAllByRole('cell')[index]!.textContent).toBe('')
  })
})

/* ─────────────────── the overflow, and what is inside it ─────────────────── */

describe('the row overflow carries the row’s actions', () => {
  it('names every alert action inside the menu', async () => {
    const user = userEvent.setup()
    const rules = await alertRules()
    const rule = rules[0]
    expect(rule).toBeDefined()

    renderAt('/management/reports?view=alerts')
    await openRowOverflow(user, await rowNamed(rule!.name))

    /* Four declared actions, each reachable by its accessible name. `Delete
       alert` is R5a use #1 and is deliberately in here rather than on the page
       header, and none of the four is the row-click target except `Open`. */
    for (const label of [
      EN('rb.library.open'),
      EN('rb.alert.test'),
      EN('rb.alert.history'),
      EN('rb.alert.delete'),
    ]) {
      expect(await screen.findByRole('menuitem', { name: label })).toBeInTheDocument()
    }
  })

  it('names every library action inside the menu, including Create alert', async () => {
    const user = userEvent.setup()
    const reports = await savedReports()
    const report = reports[0]
    expect(report).toBeDefined()

    renderAt('/management/reports')
    await openRowOverflow(user, await rowNamed(report!.name))

    for (const label of [
      EN('rb.library.open'),
      EN('rb.library.createAlert'),
      EN('rb.library.delete'),
    ]) {
      expect(await screen.findByRole('menuitem', { name: label })).toBeInTheDocument()
    }
  })
})

/* ───────────────── the library row knows what kind it is ─────────────────── */

describe('the library carries a type glyph per row', () => {
  it('matches the glyph to the report’s saved chartType', async () => {
    const reports = await savedReports()
    expect(reports.length).toBeGreaterThan(0)

    renderAt('/management/reports')
    await screen.findByRole('table')

    for (const report of reports) {
      const row = await rowNamed(report.name)
      const glyph = row.querySelector('[data-chart-kind]')
      expect(glyph, `no type glyph on ${report.name}`).not.toBeNull()
      /* **Derived, and asserted as derived.** A glyph that were always the line
         chart would pass a presence check and tell the operator nothing. */
      expect(glyph!.getAttribute('data-chart-kind')).toBe(report.query.chartType)
      /* Decorative — the kind is named in words on the quiet line beneath. */
      expect(glyph!.getAttribute('aria-hidden')).toBe('true')
      expect(within(row).getByText(EN(`rb.chartType.${report.query.chartType}`))).toBeInTheDocument()
    }
  })

  it('T9.13 — keeps the description on the row, as its title rather than prose', async () => {
    const reports = await savedReports()
    const described = reports.find((report) => report.description !== null)
    expect(described).toBeDefined()

    renderAt('/management/reports')
    await screen.findByRole('table')

    const row = await rowNamed(described!.name)
    /* Amplitude's library row is a name, not a paragraph: the description
       reads on hover here and in full on the report's own header. */
    expect(within(row).queryByText(described!.description!)).toBeNull()
    expect(row.querySelector(`[title="${described!.description!}"]`)).not.toBeNull()
  })
})

/* ───────────── the ledger's empty: an illustration, not a big icon ───────── */

describe('a rule that has never fired', () => {
  it('renders a drawn illustration, and not a scaled-up lucide icon', async () => {
    const user = userEvent.setup()
    const rules = await alertRules()

    let barren: AlertRule | undefined
    for (const rule of rules) {
      const firings = await listAlertFirings(rule.id, { pageSize: 10 })
      if (firings.items.length === 0) {
        barren = rule
        break
      }
    }
    /* The seeded case this test exists for. If every rule ever gains a firing
       this fails here rather than passing vacuously. */
    expect(barren, 'no seeded rule without firings').toBeDefined()

    renderAt('/management/reports?view=alerts')
    await openRowOverflow(user, await rowNamed(barren!.name))
    await user.click(await screen.findByRole('menuitem', { name: EN('rb.alert.history') }))

    const dialog = await screen.findByRole('dialog')
    await waitFor(() =>
      expect(within(dialog).getByText(EN('rb.alert.history.empty'))).toBeInTheDocument(),
    )
    /* §11.1 — the heading names what the section is FOR, never the absence of
       rows, and the sentence beneath it is the fact. */
    expect(within(dialog).getByText(EN('rb.alert.history.empty.heading'))).toBeInTheDocument()

    const art = dialog.querySelector('[data-illustration="alert-history"]')
    expect(art, 'no illustration in the empty state').not.toBeNull()

    /* **This is the assertion that matters.** `<BellIcon className="size-36"/>`
       would satisfy "there is a bell here" and would ship a 2px stroke blown up
       nine times, which reads as a broken image — §1.5 sizes the icon set at
       16px for exactly that reason, and this pass did not waive it. So: drawn
       at the size it is read at (the same 160×96 box `EmptyState`'s own art
       uses), several shapes rather than one path, and carrying none of lucide's
       classes. */
    expect(art!.tagName.toLowerCase()).toBe('svg')
    expect(art!.getAttribute('viewBox')).toBe('0 0 160 96')
    expect(art!.children.length).toBeGreaterThan(2)
    expect(art!.getAttribute('class') ?? '').not.toContain('lucide')
    expect(art!.querySelector('.lucide')).toBeNull()

    /* And the table's chrome is gone with it: a search field over a list that
       has no rows is a toolbar for narrowing nothing. */
    expect(within(dialog).queryByRole('table')).toBeNull()
    expect(
      within(dialog).queryByPlaceholderText(EN('rb.alert.history.search')),
    ).toBeNull()
  })
})

/* ───────────── §A6 — the bell, and the report it arrives with ────────────── */

describe('the alert path from a report is first-class', () => {
  it('opens the rule form with a bell on its title and the report named', async () => {
    const user = userEvent.setup()
    const reports = await savedReports()
    const report = reports[0]
    expect(report).toBeDefined()

    renderAt('/management/reports')
    await openRowOverflow(user, await rowNamed(report!.name))
    await user.click(await screen.findByRole('menuitem', { name: EN('rb.library.createAlert') }))

    const dialog = await screen.findByRole('dialog')
    /* A create, not an edit — and the glyph does not change the heading's
       accessible name, because it is `aria-hidden`. */
    const heading = within(dialog).getByRole('heading')
    expect(heading).toHaveTextContent(EN('rb.alert.form.title'))
    const bell = heading.querySelector('svg')
    expect(bell).not.toBeNull()
    expect(bell!.getAttribute('aria-hidden')).toBe('true')

    /* **The report, NAMED.** The old fallback told an operator standing on a
       perfectly well saved report to *"save this one first"*; the description
       now says which report the rule will watch. Read off the rendered
       description rather than off the prop, because a preset the reset effect
       ignored would still have been passed. */
    await waitFor(() =>
      expect(
        within(dialog).getByText(
          EN('rb.alert.form.preset').replace('{name}', report!.name),
        ),
      ).toBeInTheDocument(),
    )
    expect(within(dialog).queryByText(EN('rb.alert.form.report.unsaved'))).toBeNull()
  })
})
