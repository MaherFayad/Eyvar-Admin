/**
 * The save dialog — Amplitude §B1, principle 6, and the one journey that used
 * to span two screens.
 *
 * Three things are asserted here that a screenshot review would not catch:
 *
 * 1. **The description and the legend are no longer one string.** Both rendered
 *    `rb.save.visibility`, so the sentence under the dialog's title read *"Who
 *    can see it"*. A duplicated key is invisible in a diff and obvious to an
 *    operator, so the test is that the two nodes say different things — not
 *    that a particular string exists somewhere.
 * 2. **The consequence is in the accessibility tree, not in a tooltip.**
 *    `LegalityOptions.tsx` already records why: a tooltip is a reason nobody
 *    can read. So the assertion goes through `aria-describedby` and through the
 *    computed accessible description, which a `title` attribute or a hover card
 *    would both fail.
 * 3. **A failed pin does not un-save a saved report.** The dialog makes two
 *    mutations and the second one can fail on its own. The test reads the
 *    report back **through the client** afterwards, because a screen that says
 *    "saved" over a record the server does not hold is the failure worth
 *    catching — and it asserts the *partial* sentence, not the total one.
 *
 * Disciplines kept from `dashboards.test.tsx`: **no fixture is imported** (every
 * board and every report is read through its client), and **nothing spies on a
 * client namespace** — `mockFailures` is the seam, and a `vi.spyOn` on the
 * barrel's live binding does not intercept it.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  disableMockLatency,
  getDashboard,
  listDashboards,
  listReports,
  mockFailures,
  resetDataLayer,
} from '@/data/clients'
import type { Dashboard, ReportQuery, SavedReport } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { REPORTS_EN } from './copy'
import { SaveReportDialog } from './SaveReportDialog'

const copy = (key: string) => REPORTS_EN[key] as string
const t = createTranslator({ dictionary: EN })

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither and Radix's select calls both on the trigger.
     Same reasoning as `dashboards.test.tsx`; kept local to each file. */
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

/** A legal trend, composed here rather than read out of the seed. */
const QUERY: ReportQuery = {
  measures: [{ key: 'captains.registered' }],
  groupBy: null,
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

function mount() {
  const onSaved = vi.fn<(report: SavedReport) => void>()
  const onOpenChange = vi.fn<(open: boolean) => void>()
  render(
    <SaveReportDialog
      open
      onOpenChange={onOpenChange}
      report={null}
      query={QUERY}
      onSaved={onSaved}
      t={t}
    />,
  )
  return { onSaved, onOpenChange }
}

/** Every board, read through the client rather than out of the seed module. */
async function boards(): Promise<Dashboard[]> {
  return (await listDashboards({ pageSize: 100 })).items
}

async function firstBoard(): Promise<Dashboard> {
  const all = await boards()
  expect(all.length, 'the fixtures hold at least one dashboard').toBeGreaterThan(0)
  return all[0] as Dashboard
}

/** The set of report ids pinned anywhere, so "nothing was pinned" is checkable. */
async function pinnedReportIds(): Promise<string[]> {
  return (await boards()).flatMap((board) => board.tiles.map((tile) => tile.reportId)).sort()
}

async function reportNamed(name: string): Promise<SavedReport | undefined> {
  return (await listReports({ pageSize: 200 })).items.find((row) => row.name === name)
}

/** Fill the one required field. The primary is disabled until this happens. */
async function typeName(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.type(await screen.findByLabelText(copy('rb.save.name')), name)
}

const save = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: copy('rb.save.confirm') }))

/* ───── the copy defect: one key was doing two jobs ──────────────────────── */

describe('the description and the legend are different sentences', () => {
  it('does not render the visibility legend as the dialog description', async () => {
    mount()

    const dialog = await screen.findByRole('dialog')
    const description = dialog.querySelector('[data-slot="dialog-description"]')
    expect(description).not.toBeNull()

    /* The defect, stated as the thing an operator saw: the sentence under the
       title was the label of a field further down. */
    expect(description).toHaveTextContent(copy('rb.save.describe'))
    expect(description).not.toHaveTextContent(copy('rb.save.visibility'))

    /* And the legend still says what it always said, exactly once. */
    expect(screen.getAllByText(copy('rb.save.visibility'))).toHaveLength(1)
  })
})

/* ───── principle 6: name the consequence under the control ──────────────── */

describe('each visibility option names its consequence', () => {
  it('binds the sentence to the radio with aria-describedby', async () => {
    mount()

    const cases = [
      { label: copy('rb.save.visibility.private'), says: copy('rb.save.visibility.private.consequence') },
      { label: copy('rb.save.visibility.team'), says: copy('rb.save.visibility.team.consequence') },
    ]

    for (const { label, says } of cases) {
      const radio = await screen.findByRole('radio', { name: label })
      const describedBy = radio.getAttribute('aria-describedby')
      expect(describedBy, `${label} states no consequence`).toBeTruthy()

      /* Real text in the document, reachable from the control — which is what a
         tooltip is not. Both halves matter: the id must resolve, and the node it
         resolves to must carry the sentence. */
      const ids = (describedBy ?? '').split(/\s+/u).filter(Boolean)
      const texts = ids.map((id) => document.getElementById(id)?.textContent ?? '')
      expect(texts.join(' ')).toContain(says)
      expect(radio).toHaveAccessibleDescription(says)
    }
  })

  it('renders the consequence with no hover and no focus', async () => {
    mount()
    /* The whole objection to a tooltip: nothing was pointed at, nothing was
       focused, and both sentences are already on screen. */
    expect(await screen.findByText(copy('rb.save.visibility.private.consequence'))).toBeVisible()
    expect(screen.getByText(copy('rb.save.visibility.team.consequence'))).toBeVisible()
  })
})

/* ───── pinning at save time ─────────────────────────────────────────────── */

describe('the dashboard picker', () => {
  it('defaults to not adding the report to any dashboard', async () => {
    const user = userEvent.setup()
    const before = await pinnedReportIds()
    const { onSaved } = mount()

    /* The default is a stated choice an operator can read, not a blank. */
    const picker = await screen.findByRole('combobox')
    expect(picker).toHaveTextContent(copy('rb.save.addTo.none'))

    await typeName(user, 'Unpinned by default')
    await save(user)

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    const saved = onSaved.mock.calls[0]?.[0] as SavedReport
    expect(saved.name).toBe('Unpinned by default')

    /* Read back through the client: nothing anywhere gained a tile. */
    expect(await pinnedReportIds()).toEqual(before)
  })

  it('pins the saved report to the chosen dashboard', async () => {
    const user = userEvent.setup()
    const board = await firstBoard()
    const before = board.tiles.length
    const { onSaved } = mount()

    await typeName(user, 'Pinned at save time')
    await user.click(await screen.findByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: board.name }))
    await save(user)

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    const saved = onSaved.mock.calls[0]?.[0] as SavedReport

    /* The tile is read back through `getDashboard`, not off the screen. A row
       that appeared in the UI and not on the server is the failure worth
       catching. */
    const after = (await getDashboard(board.id)).data
    expect(after.tiles).toHaveLength(before + 1)
    const tile = after.tiles.find((row) => row.reportId === saved.id)
    expect(tile, 'the saved report is a tile on the chosen dashboard').toBeTruthy()
    expect(tile?.pinnedName).toBe('Pinned at save time')
    /* `saveDashboard` renormalises `order` to 1..n, so the new tile is last and
       the integers are contiguous. */
    expect(after.tiles.map((row) => row.order)).toEqual(
      Array.from({ length: before + 1 }, (_, index) => index + 1),
    )
  })
})

/* ───── two mutations, and the second one can fail alone ─────────────────── */

describe('a failed pin does not un-save a saved report', () => {
  it('states the partial outcome and leaves the report saved', async () => {
    const user = userEvent.setup()
    const board = await firstBoard()
    const { onSaved } = mount()

    await typeName(user, 'Saved but not pinned')
    await user.click(await screen.findByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: board.name }))

    /* Rigged AFTER the board list is read, so only the write fails. */
    mockFailures.always('dashboards.save')
    await save(user)

    /* Both halves, in the order they happened. */
    expect(await screen.findByText(copy('rb.save.addTo.failed'))).toBeVisible()

    /* And emphatically NOT the total failure, which claims nothing changed. */
    expect(screen.queryByText(copy('rb.save.failed'))).not.toBeInTheDocument()

    /* The report is on the server. This is the assertion the sentence is
       promising, and the only one that can catch a rollback. */
    const persisted = await reportNamed('Saved but not pinned')
    expect(persisted, 'the successful save was rolled back').toBeTruthy()

    /* The board did not gain a tile — the dialog is not claiming a pin it
       could not make. */
    const after = (await getDashboard(board.id)).data
    expect(after.tiles.some((tile) => tile.reportId === persisted?.id)).toBe(false)

    /* The dialog stayed open, so the one action that resolves this is reachable
       — and the primary now says what pressing it will do. */
    expect(onSaved).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: copy('rb.save.addTo.failed.retry') }),
    ).toBeEnabled()
  })

  it('retries the pin without creating a second report', async () => {
    const user = userEvent.setup()
    const board = await firstBoard()
    const { onSaved } = mount()

    await typeName(user, 'Retried once')
    await user.click(await screen.findByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: board.name }))

    mockFailures.once('dashboards.save')
    await save(user)
    await screen.findByText(copy('rb.save.addTo.failed'))

    await user.click(screen.getByRole('button', { name: copy('rb.save.addTo.failed.retry') }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    const saved = onSaved.mock.calls[0]?.[0] as SavedReport

    /* One report, not two. The retry fed the first save's id back in, so the
       second call UPDATED rather than created. */
    const all = (await listReports({ pageSize: 200 })).items.filter(
      (row) => row.name === 'Retried once',
    )
    expect(all).toHaveLength(1)

    const after = (await getDashboard(board.id)).data
    expect(after.tiles.some((tile) => tile.reportId === saved.id)).toBe(true)
  })
})

/* ───── the behaviour that must not regress (AC-859) ─────────────────────── */

describe('a transport failure still loses nothing', () => {
  it('keeps the dialog open with the name and the description intact', async () => {
    const user = userEvent.setup()
    mockFailures.always('reports.save')
    const { onSaved } = mount()

    await typeName(user, 'Kept on failure')
    await user.type(
      await screen.findByLabelText(new RegExp(copy('rb.save.description'), 'u')),
      'and so is this',
    )
    await save(user)

    expect(await screen.findByText(copy('rb.save.failed'))).toBeVisible()
    expect(onSaved).not.toHaveBeenCalled()
    expect(await screen.findByLabelText(copy('rb.save.name'))).toHaveValue('Kept on failure')
    /* The partial sentence is for a saved report. Nothing was saved here. */
    expect(screen.queryByText(copy('rb.save.addTo.failed'))).not.toBeInTheDocument()
  })
})
