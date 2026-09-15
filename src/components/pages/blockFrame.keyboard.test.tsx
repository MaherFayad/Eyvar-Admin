/**
 * Keyboard on a focused block frame — AC-1198, AC-1199, AC-1200. The
 * non-negotiable path: every editor action works from the keyboard alone.
 */

import { render, screen, within } from '@testing-library/react'
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
})

async function twoHeadingPage(): Promise<string> {
  const outcome = await savePage({
    id: null,
    kind: 'note',
    title: 'Keyboard test',
    icon: null,
    description: null,
    visibility: 'private',
    tags: [],
    scope: { range: null, filters: [] },
    blocks: [
      { id: 'first', type: 'heading', level: 2, text: 'First' },
      { id: 'second', type: 'heading', level: 2, text: 'Second' },
    ],
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

/**
 * F-V2-87 gave each frame the block's own title as its accessible name, so
 * two headings no longer share one name — read order off `data-block-id`
 * (present on every frame in edit mode) rather than a name lookup.
 */
function blockFrames(): HTMLElement[] {
  return screen.getAllByRole('group').filter((frame) => frame.hasAttribute('data-block-id'))
}

function frameOrder(): string[] {
  return blockFrames().map((frame) => within(frame).getByRole('heading').textContent ?? '')
}

describe('Alt+ArrowDown / Alt+ArrowUp move the focused block — AC-1199', () => {
  it('moves the first block below the second, and back', async () => {
    const pageId = await twoHeadingPage()
    await mountEditing(pageId)

    expect(frameOrder()).toEqual(['First', 'Second'])

    const frames = blockFrames()
    frames[0]!.focus()
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}')

    expect(frameOrder()).toEqual(['Second', 'First'])
  })
})

describe('Ctrl+D duplicates the focused block — AC-1199', () => {
  it('inserts a copy immediately after it', async () => {
    const pageId = await twoHeadingPage()
    await mountEditing(pageId)

    const frames = blockFrames()
    frames[0]!.focus()
    await userEvent.keyboard('{Control>}d{/Control}')

    expect(frameOrder()).toEqual(['First', 'First', 'Second'])
  })
})

describe('Delete removes the focused block and offers Undo — AC-1199, AC-1200', () => {
  it('removes the block, then Undo restores it', async () => {
    const pageId = await twoHeadingPage()
    await mountEditing(pageId)

    const frames = blockFrames()
    frames[0]!.focus()
    await userEvent.keyboard('{Delete}')

    expect(frameOrder()).toEqual(['Second'])
    expect(await screen.findByText(copy('pg.edit.deleted.toast'))).toBeInTheDocument()

    const undoButton = screen.getByRole('button', { name: copy('pg.edit.deleted.undo') })
    await userEvent.click(undoButton)

    expect(frameOrder()).toEqual(['First', 'Second'])
  })
})
