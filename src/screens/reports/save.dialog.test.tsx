/**
 * The save dialog — Amplitude §B1, principle 6, AC-856…AC-859. Asserts the
 * description/legend split, the consequence in `aria-describedby` rather than
 * a tooltip, and that a failed pin does not un-save the report (read back
 * through the client, never off the screen). D46 moved the picker from
 * `Dashboard`/`saveDashboard` to `Page`/`savePage`: a pin is now a
 * `ReportBlock` on `page.blocks`, and `pages.save` is what `mockFailures` rigs.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  disableMockLatency,
  getPage,
  listPages,
  listReports,
  mockFailures,
  resetDataLayer,
} from '@/data/clients'
import type { ReportQuery, SavedReport } from '@/data/types'
import type { Page } from '@/data/types/page'
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
  groupBy: [],
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

/** Every dashboard-kind page, read through the client rather than out of the seed module. */
async function pages(): Promise<Page[]> {
  return (await listPages({ pageSize: 100, filters: [{ field: 'kind', op: 'eq', value: 'dashboard' }] }))
    .items
}

async function firstPage(): Promise<Page> {
  const all = await pages()
  expect(all.length, 'the fixtures hold at least one dashboard page').toBeGreaterThan(0)
  return all[0] as Page
}

/** The set of report ids pinned anywhere, so "nothing was pinned" is checkable. */
async function pinnedReportIds(): Promise<string[]> {
  return (await pages())
    .flatMap((page) => page.blocks)
    .filter((block) => block.type === 'report')
    .map((block) => block.reportId)
    .sort()
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

describe('the page picker', () => {
  it('defaults to not adding the report to any page', async () => {
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

    /* Read back through the client: nothing anywhere gained a block. */
    expect(await pinnedReportIds()).toEqual(before)
  })

  it('pins the saved report to the chosen page as a report block', async () => {
    const user = userEvent.setup()
    const page = await firstPage()
    const before = page.blocks.length
    const { onSaved } = mount()

    await typeName(user, 'Pinned at save time')
    await user.click(await screen.findByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: page.title }))
    await save(user)

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    const saved = onSaved.mock.calls[0]?.[0] as SavedReport

    /* The block is read back through `getPage`, not off the screen. A block
       that appeared in the UI and not on the server is the failure worth
       catching. */
    const after = (await getPage(page.id)).data
    expect(after.blocks).toHaveLength(before + 1)
    const block = after.blocks.find((row) => row.type === 'report' && row.reportId === saved.id)
    expect(block, 'the saved report is a block on the chosen page').toBeTruthy()
    expect(block?.type === 'report' && block.title).toBe('Pinned at save time')
  })
})

/* ───── two mutations, and the second one can fail alone ─────────────────── */

describe('a failed pin does not un-save a saved report', () => {
  it('states the partial outcome and leaves the report saved', async () => {
    const user = userEvent.setup()
    const page = await firstPage()
    const { onSaved } = mount()

    await typeName(user, 'Saved but not pinned')
    await user.click(await screen.findByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: page.title }))

    /* Rigged AFTER the page list is read, so only the write fails. */
    mockFailures.always('pages.save')
    await save(user)

    /* Both halves, in the order they happened. */
    expect(await screen.findByText(copy('rb.save.addTo.failed'))).toBeVisible()

    /* And emphatically NOT the total failure, which claims nothing changed. */
    expect(screen.queryByText(copy('rb.save.failed'))).not.toBeInTheDocument()

    /* The report is on the server. This is the assertion the sentence is
       promising, and the only one that can catch a rollback. */
    const persisted = await reportNamed('Saved but not pinned')
    expect(persisted, 'the successful save was rolled back').toBeTruthy()

    /* The page did not gain a block — the dialog is not claiming a pin it
       could not make. */
    const after = (await getPage(page.id)).data
    expect(
      after.blocks.some((block) => block.type === 'report' && block.reportId === persisted?.id),
    ).toBe(false)

    /* The dialog stayed open, so the one action that resolves this is reachable
       — and the primary now says what pressing it will do. */
    expect(onSaved).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: copy('rb.save.addTo.failed.retry') }),
    ).toBeEnabled()
  })

  it('retries the pin without creating a second report', async () => {
    const user = userEvent.setup()
    const page = await firstPage()
    const { onSaved } = mount()

    await typeName(user, 'Retried once')
    await user.click(await screen.findByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: page.title }))

    mockFailures.once('pages.save')
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

    const after = (await getPage(page.id)).data
    expect(after.blocks.some((block) => block.type === 'report' && block.reportId === saved.id)).toBe(
      true,
    )
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
