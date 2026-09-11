/**
 * Text block editing — AC-1203. The formatting bar wraps the selection with
 * markdown syntax, and the preview renders once the block loses focus.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { disableMockLatency, resetDataLayer } from '@/data/clients'
import { savePage } from '@/data/clients/pages'
import { PageDetailScreen } from '@/screens/pages/PageDetailScreen'
import { PAGES_EN } from './copy'

const copy = (key: string) => PAGES_EN[key] as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

async function textPage(md: string): Promise<string> {
  const outcome = await savePage({
    id: null,
    kind: 'note',
    title: 'Text editing test',
    icon: null,
    description: null,
    visibility: 'private',
    tags: [],
    scope: { range: null, filters: [] },
    blocks: [{ id: 't1', type: 'text', md }],
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
      </ShellProvider>
    </MemoryRouter>,
  )
  const editButton = await screen.findByRole('button', { name: copy('pg.edit.enter') })
  await userEvent.click(editButton)
  await screen.findByRole('button', { name: copy('pg.edit.done') })
  return utils
}

describe('AC-1203 — the formatting bar wraps the selection with markdown syntax', () => {
  it('wraps a selected run in ** when Bold is clicked', async () => {
    const user = userEvent.setup()
    const pageId = await textPage('urgent')
    await mountEditing(pageId)

    /* Empty-md blocks start already focused (`TextBlockView`'s own rule),
       but this fixture has content, so it opens on click. */
    await user.click(screen.getByText('urgent'))
    const textarea = (await screen.findByPlaceholderText(copy('pg.block.text.name'))) as HTMLTextAreaElement
    textarea.setSelectionRange(0, 'urgent'.length)

    await user.click(screen.getByRole('button', { name: copy('pg.editor.bold') }))

    expect(textarea).toHaveValue('**urgent**')
  })
})

describe('AC-1203 — the preview renders once the block loses focus', () => {
  it('shows the rendered markdown, not the raw textarea, after blur', async () => {
    const user = userEvent.setup()
    const pageId = await textPage('**urgent**')
    await mountEditing(pageId)

    await user.click(screen.getByText(/urgent/))
    await screen.findByPlaceholderText(copy('pg.block.text.name'))

    /* Focus elsewhere on the page — the block's own `onBlur` fires. */
    await user.click(screen.getByLabelText(copy('pg.page.title.label')))

    expect(screen.queryByPlaceholderText(copy('pg.block.text.name'))).not.toBeInTheDocument()
    const strong = screen.getByText('urgent')
    expect(strong.closest('strong')).not.toBeNull()
  })
})
