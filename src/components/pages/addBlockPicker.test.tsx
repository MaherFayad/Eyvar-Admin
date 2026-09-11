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

const copy = (key: string) => PAGES_EN[key] as string

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

    const frames = screen.getAllByRole('group')
    expect(frames[0]).toHaveAttribute('aria-label', copy('pg.block.divider.name'))
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
