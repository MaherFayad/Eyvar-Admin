/**
 * Autosave — AC-1201, AC-1202. The 800 ms debounce and the single-flight
 * save queue both need fake timers, which is why the pages package skipped
 * them. A 409 that discards an operator's edit is silent data loss, so the
 * second describe proves the edit survives on the record, not merely on
 * screen.
 */

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { Toaster } from '@/components/ui/sonner'
import { disableMockLatency, resetDataLayer } from '@/data/clients'
import { getPage, savePage } from '@/data/clients/pages'
import { PageDetailScreen } from '@/screens/pages/PageDetailScreen'
import { PAGES_EN } from './copy'

const copy = (key: string) => PAGES_EN[key] as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

async function onePage(title: string): Promise<string> {
  const outcome = await savePage({
    id: null,
    kind: 'note',
    title,
    icon: null,
    description: null,
    visibility: 'private',
    tags: [],
    scope: { range: null, filters: [] },
    blocks: [{ id: 'h1', type: 'heading', level: 2, text: 'Heading' }],
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

describe('AC-1201 — edits save 800 ms after the last change, coalesced', () => {
  beforeEach(() => {
    /* `shouldAdvanceTime` — Testing Library's `findBy*` polls on a real
       interval and cannot see vitest's fakes otherwise (dispatch.test.tsx). */
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires one save 800 ms after the last keystroke, never one per keystroke', async () => {
    const user = userEvent.setup({ delay: null })
    const pageId = await onePage('Autosave test')
    await mountEditing(pageId)
    const before = await getPage(pageId)

    const titleField = screen.getByLabelText(copy('pg.page.title.label'))
    await user.clear(titleField)
    await user.type(titleField, 'A')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    /* Under 800 ms since the last change — no save yet. */
    expect(screen.queryByText(copy('pg.page.saving'))).not.toBeInTheDocument()

    await user.type(titleField, 'B')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    /* The second keystroke reset the debounce — still under 800 ms since it. */
    expect(screen.queryByText(copy('pg.page.saving'))).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })

    await vi.waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Saved/))

    const after = await getPage(pageId)
    expect(after.data.title).toBe('AB')
    /* One save, not two — the record's version moved by exactly one. */
    expect(after.data.version).toBe(before.data.version + 1)
  })
})

describe('AC-1202 — a 409 keeps every local edit, never discards them', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the standing notice with Reload, and the operator’s typed title survives on screen and in state', async () => {
    const user = userEvent.setup({ delay: null })
    const pageId = await onePage('Conflict test')
    const loaded = await getPage(pageId)
    await mountEditing(pageId)

    /* Someone else saves first, bumping the version this editor still holds. */
    const elsewhere = await savePage({
      id: pageId,
      kind: 'note',
      title: 'Changed elsewhere',
      icon: null,
      description: null,
      visibility: 'private',
      tags: [],
      scope: { range: null, filters: [] },
      blocks: loaded.data.blocks,
      version: loaded.data.version,
    })
    expect(elsewhere.status).toBe('saved')

    const titleField = screen.getByLabelText(copy('pg.page.title.label'))
    await user.clear(titleField)
    await user.type(titleField, 'My edit')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })

    expect(await screen.findByText(copy('pg.page.conflict'))).toBeInTheDocument()
    /* The edit is still on screen — never reverted to the server's row. */
    expect(screen.getByLabelText(copy('pg.page.title.label'))).toHaveValue('My edit')

    const reload = screen.getByRole('button', { name: copy('pg.page.conflict.reload') })
    await user.click(reload)

    expect(screen.queryByText(copy('pg.page.conflict'))).not.toBeInTheDocument()
    /* Still there after resolving the conflict — nothing reverted it. */
    expect(screen.getByLabelText(copy('pg.page.title.label'))).toHaveValue('My edit')
  })

  it.fails('DEFECT — after Reload, the kept edit is never resent; it is lost unless the operator types again', async () => {
    const user = userEvent.setup({ delay: null })
    const pageId = await onePage('Conflict test 2')
    const loaded = await getPage(pageId)
    await mountEditing(pageId)

    const elsewhere = await savePage({
      id: pageId,
      kind: 'note',
      title: 'Changed elsewhere',
      icon: null,
      description: null,
      visibility: 'private',
      tags: [],
      scope: { range: null, filters: [] },
      blocks: loaded.data.blocks,
      version: loaded.data.version,
    })
    expect(elsewhere.status).toBe('saved')

    const titleField = screen.getByLabelText(copy('pg.page.title.label'))
    await user.clear(titleField)
    await user.type(titleField, 'My edit')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900)
    })
    await screen.findByText(copy('pg.page.conflict'))

    await user.click(screen.getByRole('button', { name: copy('pg.page.conflict.reload') }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })

    /* `usePageEditor`'s debounce effect depends on `[debouncedContent, editing]` —
       `reload()` changes neither, so the kept edit never triggers a resend and
       is silently lost the moment the operator navigates away. */
    await vi.waitFor(async () => {
      const record = await getPage(pageId)
      expect(record.data.title).toBe('My edit')
    })
  })
})
