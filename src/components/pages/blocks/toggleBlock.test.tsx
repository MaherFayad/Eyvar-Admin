/**
 * `ToggleBlockView` — AC-1192. `<button aria-expanded>`, and its content
 * leaves the accessibility tree (`hidden`) when closed — not merely hidden
 * visually.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ToggleBlock } from '@/data/types/page'
import { PageBlocksProvider, type PageBlocksValue, type PageEditorActions } from '../PageBlocksContext'
import { ToggleBlockView } from './ToggleBlockView'
import { REPORTS_EN } from '@/screens/reports/copy'
import { PAGES_EN } from '@/screens/pages/copy'

const copy = (key: string) => (REPORTS_EN[key] ?? PAGES_EN[key]) as string

function noopTranslator(key: string, params?: Record<string, string | number>): string {
  const template = REPORTS_EN[key] ?? PAGES_EN[key] ?? key
  return Object.entries(params ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), template)
}
noopTranslator.plural = (key: string, params: Record<string, string | number>) => noopTranslator(key, params)

function mountBlock(block: ToggleBlock, onToggleOpen: PageEditorActions['onToggleOpen']) {
  const actions = { onToggleOpen } as unknown as PageEditorActions
  const value: PageBlocksValue = {
    pageId: 'PAGE-TEST',
    blocks: [block],
    measures: [],
    dimensions: [],
    scope: { range: null, filters: [] },
    today: '2026-06-25',
    noDataSentence: 'No data.',
    t: noopTranslator as PageBlocksValue['t'],
    language: 'en',
    dir: 'ltr',
    /* `false` — a toggle carries its visible label (the button's accessible
       name) only outside edit mode; edit mode swaps it for an `<Input>`. */
    editing: false,
    actions,
    onOpenReport: () => {},
  }
  return render(
    <MemoryRouter>
      <PageBlocksProvider value={value}>
        <ToggleBlockView block={block} />
      </PageBlocksProvider>
    </MemoryRouter>,
  )
}

describe('AC-1192 — a toggle block is a real disclosure', () => {
  it('is a <button aria-expanded>, true when open, and its content is in the a11y tree', () => {
    mountBlock({ id: 'blk-1', type: 'toggle', title: 'Details', open: true, blocks: [{ id: 'h1', type: 'heading', level: 2, text: 'Inside' }] }, () => {})

    const button = screen.getByRole('button', { name: 'Details' })
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('heading', { name: 'Inside' })).toBeInTheDocument()
  })

  it('hides its content from the accessibility tree — not merely visually — when closed', () => {
    mountBlock({ id: 'blk-2', type: 'toggle', title: 'Details', open: false, blocks: [{ id: 'h1', type: 'heading', level: 2, text: 'Inside' }] }, () => {})

    const button = screen.getByRole('button', { name: 'Details' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    /* `hidden`, not `opacity-0`/`sr-only` — the heading is not queryable at all. */
    expect(screen.queryByRole('heading', { name: 'Inside' })).not.toBeInTheDocument()
    expect(screen.getByText('Inside')).not.toBeVisible()
  })

  it('calls onToggleOpen with the flipped state on click', async () => {
    const user = userEvent.setup()
    const onToggleOpen = vi.fn()
    mountBlock({ id: 'blk-3', type: 'toggle', title: 'Details', open: false, blocks: [] }, onToggleOpen)

    await user.click(screen.getByRole('button', { name: 'Details' }))

    expect(onToggleOpen).toHaveBeenCalledWith('blk-3', true)
  })
})
