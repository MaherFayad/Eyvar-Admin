/**
 * The block kebab menu — AC-1198. Every action offered, disabled in place
 * with a reason when inapplicable, never hidden.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { Toaster } from '@/components/ui/sonner'
import { disableMockLatency, resetDataLayer } from '@/data/clients'
import { savePage } from '@/data/clients/pages'
import type { Block } from '@/data/types/page'
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

async function onePage(blocks: Block[]): Promise<string> {
  const outcome = await savePage({
    id: null,
    kind: 'note',
    title: 'Menu test',
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

async function openMenu(user: ReturnType<typeof userEvent.setup>, blockName: string, index = 0) {
  /* A block's trigger is named after its own title, falling back to type plus
     position when it has none (F-V2-87) — so `blockName` is "Solo" or
     "Divider 1", not the bare type. `index` remains for genuine ties. */
  const trigger = screen.getAllByRole('button', { name: copy('pg.edit.blockMenu').replace('{name}', blockName) })[index]!
  await user.click(trigger)
  return screen.findByRole('menu')
}

describe('AC-1198 — Move to column… is disabled in place, with a reason, when the page has no columns block', () => {
  it('AC-1198 — the reason renders on the disabled item itself, never inside an unopenable submenu', async () => {
    const user = userEvent.setup()
    const pageId = await onePage([{ id: 'h1', type: 'heading', level: 2, text: 'Solo' }])
    await mountEditing(pageId)

    const menu = await openMenu(user, 'Solo')
    const submenu = within(menu).getByRole('menuitem', { name: copy('pg.edit.moveToColumn') })
    expect(submenu).toHaveAttribute('aria-disabled', 'true')

    /* `BlockMenu.tsx` renders the `pg.edit.moveToColumn.none` reason as a
       second line on the disabled item itself, not inside a `DropdownMenuSub`
       — Radix never opens a sub whose trigger is disabled, so a reason
       written there would stay unreachable. */
    await user.hover(submenu)
    expect(await screen.findByText(copy('pg.edit.moveToColumn.none'))).toBeInTheDocument()
  })
})

describe('AC-1198 — Turn into… is disabled in place, with a reason, for a block with no legal target', () => {
  it('AC-1198 — the reason renders on the disabled item itself, never inside an unopenable submenu', async () => {
    const user = userEvent.setup()
    const pageId = await onePage([{ id: 'd1', type: 'divider' }])
    await mountEditing(pageId)

    const menu = await openMenu(user, 'Divider 1')
    const submenu = within(menu).getByRole('menuitem', { name: copy('pg.edit.turnInto') })
    expect(submenu).toHaveAttribute('aria-disabled', 'true')

    await user.hover(submenu)
    expect(await screen.findByText(copy('pg.edit.turnInto.none'))).toBeInTheDocument()
  })

  it('offers Turn into for a text block, listing heading and callout', async () => {
    const user = userEvent.setup()
    const pageId = await onePage([{ id: 't1', type: 'text', md: 'Some text' }])
    await mountEditing(pageId)

    const menu = await openMenu(user, 'Text 1')
    const submenu = within(menu).getByRole('menuitem', { name: copy('pg.edit.turnInto') })
    expect(submenu).not.toHaveAttribute('aria-disabled', 'true')
    await user.hover(submenu)

    expect(await screen.findByRole('menuitem', { name: copy('pg.block.heading.name') })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: copy('pg.block.callout.name') })).toBeInTheDocument()
  })
})

describe('AC-1198 — every action is offered, none of them hidden', () => {
  it('lists move up/down, move to column, duplicate, turn into, and delete for a text block', async () => {
    const user = userEvent.setup()
    const pageId = await onePage([{ id: 't1', type: 'text', md: 'Some text' }])
    await mountEditing(pageId)

    const menu = await openMenu(user, 'Text 1')
    for (const label of [
      copy('pg.edit.moveUp'),
      copy('pg.edit.moveDown'),
      copy('pg.edit.moveToColumn'),
      copy('pg.edit.duplicate'),
      copy('pg.edit.turnInto'),
      copy('pg.edit.delete'),
    ]) {
      expect(within(menu).getByRole('menuitem', { name: label })).toBeInTheDocument()
    }
  })

  it('lists Height and View only for a report block', async () => {
    const user = userEvent.setup()
    const pageId = await onePage([{ id: 'r1', type: 'report', reportId: 'RPT-4', view: 'chart', height: 'M', title: null }])
    await mountEditing(pageId)

    const menu = await openMenu(user, 'Report 1')
    expect(within(menu).getByRole('menuitem', { name: copy('pg.edit.height') })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: copy('pg.edit.view') })).toBeInTheDocument()
  })

  it('AC-1198 — Move up on the first block (and Move down on the last) is disabled in place', async () => {
    const user = userEvent.setup()
    const pageId = await onePage([
      { id: 'h1', type: 'heading', level: 2, text: 'First' },
      { id: 'h2', type: 'heading', level: 2, text: 'Second' },
    ])
    await mountEditing(pageId)

    const menu = await openMenu(user, 'First')
    /* `blockOps.moveBlock` is a documented no-op at either end (AC-1199), and
       `BlockMenu.tsx` disables `Move up`/`Move down` to say so, exactly as
       `moveToColumn`/`turnInto` already did. */
    expect(within(menu).getByRole('menuitem', { name: copy('pg.edit.moveUp') })).toHaveAttribute('aria-disabled', 'true')
  })
})
