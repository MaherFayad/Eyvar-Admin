/**
 * The alerts surface, against the four corrections the parity review asked for.
 *
 * Each of these was a **gap between what the product knows and what the screen
 * says**, so each assertion is about the relationship rather than about
 * presence:
 *
 * - the banner is asserted to be **before** the table in document order, not
 *   merely somewhere on the page, because *below pagination* is exactly where
 *   the two sentences it replaces already were;
 * - the cleared notification is asserted to carry **no** alert role and none of
 *   the destructive tokens, because `notificationId: null` is a seeded ordinary
 *   state and a presence check would pass while it rendered as a failure;
 * - the preselected report is read off the picker's **rendered value**, because
 *   a prop that arrived and was ignored by the reset effect would still pass a
 *   props assertion.
 *
 * Everything is read through the client seam (`listAlertRules`,
 * `listAlertFirings`), never out of a fixture module — `seam.test.ts` forbids
 * the second and a test that reads the seed is testing the seed.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { Toaster } from '@/components/ui/sonner'
import {
  disableMockLatency,
  listAlertFirings,
  listAlertRules,
  listReports,
  resetDataLayer,
} from '@/data/clients'
import type { AlertFiring, AlertRule, SavedReport } from '@/data/types'
import { EN as SHELL_EN } from '@/i18n/dictionaries'
import { REPORTS_EN } from './copy'
import { ReportsScreen } from './ReportsScreen'

const EN = (key: string) => REPORTS_EN[key] as string
const HINT = SHELL_EN['shell.hint.show'] as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither, and Radix's select, menu and dialog all call them
     on the trigger. Same stubs `reports.test.tsx` carries, and the same reason:
     without them the pointer-down handler throws from inside `node_modules` and
     the popup never opens. */
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
        {/* Mounted here rather than in `App`, so a toast is observable. */}
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

async function alertRules(): Promise<readonly AlertRule[]> {
  return (await listAlertRules({ pageSize: 100 })).items
}

async function firingsOf(ruleId: string): Promise<readonly AlertFiring[]> {
  return (await listAlertFirings(ruleId, { pageSize: 100 })).items
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
 * Four declared row actions put the lane behind a kebab (`DataTable` renders up
 * to two directly and three or more as a menu), so every action on this table is
 * reached through it.
 */
async function chooseRowAction(
  user: ReturnType<typeof userEvent.setup>,
  row: HTMLElement,
  label: string,
) {
  await user.click(within(row).getByRole('button', { name: /More actions/ }))
  await user.click(await screen.findByRole('menuitem', { name: label }))
}

/* ───────────── the correction outranks the badge, not the reverse ───────── */

describe('nothing is checking these rules, said where it is read', () => {
  it('states it in one banner ABOVE the table, and drops both trailing footnotes', async () => {
    renderAt('/management/reports?view=alerts')

    const banner = await screen.findByText(EN('rb.alerts.banner.title'))
    const table = await screen.findByRole('table')

    /* **Placement is the whole finding.** The two sentences this replaces were
       already on the page — after the table and below pagination — so a
       presence check would have passed against the defect. `Node.DOCUMENT_
       POSITION_FOLLOWING` is the assertion that the banner comes first. */
    expect(
      banner.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    /* §5.2 — ONE page-level banner, and T9.15 leaves it one sentence: the
       re-arm rule explains rather than acts, so it is behind the hint (X15). */
    const region = banner.closest('[data-slot="alert"]') ?? banner.parentElement
    expect(region?.textContent).toContain(EN('rb.alerts.banner.body'))
    expect(region?.textContent).not.toContain(EN('rb.alert.rearm.explain'))

    /* The old footnote is gone from this screen entirely. It is still a live
       key — it is the sentence beside the disabled cadence field in the rule
       form — so this asserts its absence HERE, which is what moved. */
    expect(screen.queryByText(EN('rb.alert.cadence.explain'))).toBeNull()
  })

  it('keeps the re-arm rule one keystroke away, on the banner', async () => {
    const user = userEvent.setup()
    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')

    const banner = screen.getByText(EN('rb.alerts.banner.title'))
    const region = (banner.closest('[data-slot="alert"]') ?? banner.parentElement) as HTMLElement
    await user.hover(within(region).getByRole('button', { name: HINT }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent(EN('rb.alert.rearm.explain'))
  })

  it('says nothing about the schedule on a row, because the banner says it (R10)', async () => {
    const rules = await alertRules()
    expect(rules.some((rule) => rule.cadence === null)).toBe(true)

    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')

    /* The badge is a true statement about the last recorded state; the banner
       above qualifies the present tense once, for the page. */
    const firing = rules.find((rule) => rule.state === 'firing')
    expect(firing).toBeDefined()
    const row = await rowNamed(firing!.name)
    const stateCell = within(row).getByText(EN('rb.alert.state.firing')).closest('td')
    expect(stateCell?.textContent).toBe(EN('rb.alert.state.firing'))
  })

  it('O9 — leaves Last reading blank on a rule nothing has read', async () => {
    const rules = await alertRules()
    const unread = rules.filter((rule) => rule.lastValue === null)
    expect(unread.length).toBeGreaterThan(0)

    renderAt('/management/reports?view=alerts')
    const table = await screen.findByRole('table')
    const headers = within(table).getAllByRole('columnheader')
    const index = headers.findIndex((h) =>
      h.textContent?.includes(EN('rb.alerts.col.lastValue')),
    )
    expect(index).toBeGreaterThan(-1)

    for (const rule of unread) {
      const row = await rowNamed(rule.name)
      expect(within(row).getAllByRole('cell')[index]!.textContent).toBe('')
    }
  })

  it('says “never checked” rather than the no-data placeholder', async () => {
    const rules = await alertRules()
    const never = rules.filter((rule) => rule.lastEvaluatedAt === null)
    expect(never.length).toBeGreaterThan(0)

    renderAt('/management/reports?view=alerts')
    await screen.findByRole('table')
    expect((await screen.findAllByText(EN('rb.alert.lastEvaluated.never'))).length).toBe(
      never.length,
    )
  })
})

/* ─────────────────────────── the firing history ─────────────────────────── */

describe('a rule ships with its firings', () => {
  it('opens the history and lists every seeded firing of that rule', async () => {
    const user = userEvent.setup()
    const rules = await alertRules()
    const fired = rules.find((rule) => rule.state === 'firing')
    expect(fired).toBeDefined()
    const firings = await firingsOf(fired!.id)
    expect(firings.length).toBeGreaterThan(1)

    renderAt('/management/reports?view=alerts')
    await chooseRowAction(user, await rowNamed(fired!.name), EN('rb.alert.history'))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading')).toHaveTextContent(fired!.name)

    /* One body row per firing. `+ 1` is the header row. */
    await waitFor(() =>
      expect(within(dialog).getAllByRole('row').length).toBe(firings.length + 1),
    )
    /* §8.3 — append-only. No selection, and no per-row action to perform on a
       past crossing. `mode: 'ledger'` refuses both at compile time; this is the
       observable half of that. */
    expect(within(dialog).queryByRole('checkbox')).toBeNull()
    expect(within(dialog).queryByRole('button', { name: /More actions/ })).toBeNull()
  })

  it('renders a cleared notification as an ordinary state, never as an error', async () => {
    const user = userEvent.setup()
    const rules = await alertRules()
    const fired = rules.find((rule) => rule.state === 'firing')
    const firings = await firingsOf(fired!.id)

    /* The seeded case this test exists for. If the fixture ever loses it, this
       fails here rather than passing vacuously below. */
    expect(firings.some((firing) => firing.notificationId === null)).toBe(true)
    expect(firings.some((firing) => firing.notificationId !== null)).toBe(true)

    renderAt('/management/reports?view=alerts')
    await chooseRowAction(user, await rowNamed(fired!.name), EN('rb.alert.history'))

    const dialog = await screen.findByRole('dialog')
    const cleared = await within(dialog).findByText(
      EN('rb.alert.history.notification.cleared'),
    )
    expect(
      within(dialog).getByText(EN('rb.alert.history.notification.present')),
    ).toBeInTheDocument()

    /* **The assertion that matters.** `notificationId: null` means the
       notification was cleared, not that anything failed. So the cell carries
       no alert role, no error state, and none of R5a's red — which it would if
       it had been rendered through the error path or given a tone. */
    const cell = cleared.closest('td')
    expect(cell?.querySelector('[role="alert"]')).toBeNull()
    expect(cell?.className).not.toContain('destructive')
    expect(cleared.className).not.toContain('destructive')
    expect(within(dialog).queryByRole('alert')).toBeNull()
    expect(within(dialog).queryByText(EN('rb.alert.history.error'))).toBeNull()
  })
})

/* ──────────────────── delete, and a toast on both writes ────────────────── */

describe('a rule can be deleted, and every mutation says so', () => {
  it('confirms by name, removes the rule and toasts once', async () => {
    const user = userEvent.setup()
    const before = await alertRules()
    const victim = before.find((rule) => rule.state === 'error')
    expect(victim).toBeDefined()

    renderAt('/management/reports?view=alerts')
    await chooseRowAction(user, await rowNamed(victim!.name), EN('rb.alert.delete'))

    /* §5.3 — the confirmation NAMES the rule, and its body says what stays. */
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText(EN('rb.alert.delete.confirm.title').replace('{name}', victim!.name)),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(EN('rb.alert.delete.confirm.body'))).toBeInTheDocument()

    await user.click(
      within(dialog).getByRole('button', { name: EN('rb.alert.delete.confirm.action') }),
    )

    /* R9 — one line, naming the object. */
    await waitFor(() =>
      expect(
        screen.getByText(EN('rb.alert.toast.deleted').replace('{name}', victim!.name)),
      ).toBeInTheDocument(),
    )
    /* The record, not merely the screen. */
    const after = await alertRules()
    expect(after.some((rule) => rule.id === victim!.id)).toBe(false)
    await waitFor(() => expect(screen.queryByText(victim!.name)).toBeNull())
  })
})

/* ─────────────── an alert is an action on the report you hold ───────────── */

describe('Create alert, from the report library', () => {
  it('opens the rule form with that row’s report already chosen', async () => {
    const user = userEvent.setup()
    const reports = await savedReports()
    const report = reports[0]
    expect(report).toBeDefined()

    renderAt('/management/reports')
    await chooseRowAction(user, await rowNamed(report!.name), EN('rb.library.createAlert'))

    const dialog = await screen.findByRole('dialog')
    /* A create, not an edit — and the picker is READ, not the prop: a preset
       the reset effect ignored would still have been passed. */
    expect(within(dialog).getByRole('heading')).toHaveTextContent(EN('rb.alert.form.title'))
    await waitFor(() =>
      expect(within(dialog).getByLabelText(EN('rb.alert.form.report'))).toHaveTextContent(
        report!.name,
      ),
    )
    /* And the picker is live, so the preset is a starting point rather than a
       lock: an operator who pressed the action on the wrong row can still
       change it.

       NOT asserted here: the absence of `rb.alert.form.report.unsaved`. That
       key does double duty in `AlertRuleDialog` — it is AC-874's reason under a
       disabled picker AND the dialog's description until a series and a
       threshold exist — so it renders on a perfectly well-chosen saved report
       and the assertion would be about the wrong thing. Reported as a copy
       defect rather than worked around silently. */
    expect(within(dialog).getByLabelText(EN('rb.alert.form.report'))).toBeEnabled()
  })
})

/* ─────────── the state filter, which could never fire before ────────────── */

describe('the State filter reaches the client', () => {
  it('narrows the list to one state, through `filters` and not through `?view=`', async () => {
    const all = await alertRules()
    const firing = await listAlertRules({
      pageSize: 100,
      filters: [{ field: 'state', op: 'eq', value: 'firing' }],
    })

    /* The old branch read `params.view`, which on this screen is always the
       reports sub-tab id `alerts` — so it could never fire AND it collided with
       the tab strip. Both halves are asserted: the filter narrows, and the
       sub-tab id does not. */
    expect(firing.items.length).toBeGreaterThan(0)
    expect(firing.items.length).toBeLessThan(all.length)
    expect(firing.items.every((rule) => rule.state === 'firing')).toBe(true)

    const byView = await listAlertRules({ pageSize: 100, view: 'alerts' })
    expect(byView.items.length).toBe(all.length)
  })
})
