/**
 * The add-block affordance — AC-1196 (the `+` picker) and AC-1197 (the `/`
 * slash command in a text block). One picker, two entry points (§3.2/§3.3).
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { Toaster } from '@/components/ui/sonner'
import { disableMockLatency, resetDataLayer } from '@/data/clients'
import { savePage } from '@/data/clients/pages'
import { PageDetailScreen } from '@/screens/pages/PageDetailScreen'
import { PAGES_EN } from '@/screens/pages/copy'
import { REPORTS_EN } from '@/screens/reports/copy'

const copy = (key: string) => (PAGES_EN[key] ?? REPORTS_EN[key]) as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
})

async function onePage(blocks: Parameters<typeof savePage>[0]['blocks']): Promise<string> {
  const outcome = await savePage({
    id: null,
    kind: 'note',
    title: 'Picker test',
    icon: null,
    description: null,
    visibility: 'private',
    tags: [],
    scope: { range: null, filters: [] },
    blocks,
  })
  if (outcome.status !== 'saved') throw new Error('fixture page did not save')
  return outcome.page.id
}

async function mountEditing(pageId: string) {
  const utils = render(
    <MemoryRouter initialEntries={[`/management/reports/pages/${pageId}`]}>
      <ShellProvider>
        <Routes>
          <Route path="/management/reports/pages/:pageId" element={<PageDetailScreen />} />
        </Routes>
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
  const editButton = await screen.findByRole('button', { name: copy('pg.edit.enter') })
  await userEvent.click(editButton)
  await screen.findByRole('button', { name: copy('pg.edit.done') })
  return utils
}

describe('AC-1196 — the add-block affordance sits between every pair of blocks and at the end', () => {
  it('is a real, keyboard-reachable button that opens the picker with search', async () => {
    const user = userEvent.setup()
    const pageId = await onePage([{ id: 'h1', type: 'heading', level: 2, text: 'Only heading' }])
    await mountEditing(pageId)

    /* Two gaps for one block: above it, and after it. */
    const affordances = screen.getAllByRole('button', { name: copy('pg.edit.addBlock') })
    expect(affordances.length).toBe(2)
    for (const button of affordances) expect(button.tagName).toBe('BUTTON')

    await user.click(affordances[1]!)

    /* No accessible name reaches this combobox (`AddBlockPicker`'s
       `CommandInput` carries no `aria-label` and cmdk's own label element is
       empty) — the placeholder is the only handle; a genuine a11y gap, noted
       in the QA report rather than worked around silently. */
    const search = await screen.findByPlaceholderText(copy('pg.picker.search'))
    expect(search).toHaveFocus()
    expect(screen.getByRole('option', { name: new RegExp(copy('pg.block.callout.name')) })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: new RegExp(copy('pg.block.divider.name')) })).toBeInTheDocument()
  })

  it('inserts the chosen block type at the gap it was opened from', async () => {
    const user = userEvent.setup()
    const pageId = await onePage([{ id: 'h1', type: 'heading', level: 2, text: 'Only heading' }])
    await mountEditing(pageId)

    const affordances = screen.getAllByRole('button', { name: copy('pg.edit.addBlock') })
    await user.click(affordances[0]!)
    await user.click(await screen.findByRole('option', { name: new RegExp(copy('pg.block.divider.name')) }))

    /* F-V2-87 — a divider has no title of its own, so its frame name is
       "Divider 1" (type + 1-indexed position), not the bare type name. */
    const frames = screen.getAllByRole('group')
    expect(frames[0]).toHaveAttribute('aria-label', `${copy('pg.block.divider.name')} 1`)
  })
})

/* The defect this file exists to catch: picking `report`/`metric` used to
   mount `ReportPickerPanel` and unmount it in the same tick (a Radix
   dismiss-layer race, BlockList.tsx's `onOpenChange` guard), so the block
   was never added. Each test proves the panel survives long enough to pick
   a report AND that the resulting block carries that report's id — jsdom
   cannot see the portal-teardown race itself (see the harness), but it can
   catch a regression that brings back "the panel never opens". */
describe('AC-1204 — Report and Metric hand off to the report picker, and the pick lands on the page', () => {
  it('adds a report block, by pointer, for the chosen report', async () => {
    const user = userEvent.setup()
    const pageId = await onePage([])
    await mountEditing(pageId)

    await user.click(screen.getByRole('button', { name: copy('pg.edit.addBlock') }))
    await user.click(await screen.findByRole('option', { name: new RegExp(copy('pg.block.report.name')) }))

    const search = await screen.findByPlaceholderText(copy('rb.dashboards.search'))
    await user.click(await screen.findByRole('button', { name: 'New subscriptions by plan' }))

    expect(search).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'New subscriptions by plan' })).toBeInTheDocument()
  })

  it('adds a metric block, by keyboard, for the chosen report', async () => {
    const user = userEvent.setup()
    const pageId = await onePage([])
    await mountEditing(pageId)

    screen.getByRole('button', { name: copy('pg.edit.addBlock') }).focus()
    await user.keyboard('{Enter}')
    await user.keyboard('Metric')
    await user.keyboard('{Enter}')

    const search = await screen.findByPlaceholderText(copy('rb.dashboards.search'))
    await user.type(search, 'Completed trips')
    const reportRow = await screen.findByRole('button', { name: 'Completed trips by pickup district' })
    reportRow.focus()
    await user.keyboard('{Enter}')

    expect(search).not.toBeInTheDocument()
    /* Unlike `ReportBlockView`, `MetricBlockView`'s title is plain text, not
       a link button — it opens nothing on its own (§3 renderer table). */
    expect(await screen.findByText('Completed trips by pickup district')).toBeInTheDocument()
  })
})

describe('AC-1197 — typing "/" at the start of a line in a text block opens the same picker', () => {
  it('AC-1197 — opens the picker, whose search field is the same textarea', async () => {
    const user = userEvent.setup()
    const pageId = await onePage([{ id: 't1', type: 'text', md: '' }])
    await mountEditing(pageId)

    screen.debug(undefined, 50000)
    const textarea = await screen.findByRole('textbox', { name: copy('pg.block.text.name') })
    await user.click(textarea)
    await user.keyboard('/')

    expect(await screen.findByRole('textbox', { name: copy('pg.picker.search') })).toBeInTheDocument()
  })
})
