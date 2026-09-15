/**
 * `Turn into…` — AC-1206. Converts text ↔ heading ↔ callout and report ↔
 * metric without losing the referenced report id.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
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
    title: 'Turn into test',
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
      </ShellProvider>
    </MemoryRouter>,
  )
  const editButton = await screen.findByRole('button', { name: copy('pg.edit.enter') })
  await userEvent.click(editButton)
  await screen.findByRole('button', { name: copy('pg.edit.done') })
  return utils
}

describe('AC-1206 — Turn into converts text ↔ heading ↔ callout', () => {
  it('turns a text block into a heading, keeping its words', async () => {
    const user = userEvent.setup()
    const pageId = await onePage([{ id: 't1', type: 'text', md: 'A note' }])
    await mountEditing(pageId)

    /* F-V2-87 — a title-less block's frame name is "Text 1" (type + position), not the bare type name. */
    await user.click(screen.getByRole('button', { name: copy('pg.edit.blockMenu').replace('{name}', 'Text 1') }))
    await screen.findByRole('menuitem', { name: copy('pg.edit.moveUp') })
    /* Keyboard, not hover+click — a Radix `DropdownMenuSub` has no stable
       geometry in jsdom, so a synthetic pointer click on a nested item
       reliably lands on the parent menu instead (§7.3's own concern, proven
       the hard way). This is the only block on the page, so `Move up`,
       `Move down` and `Move to column…` are all disabled in place (AC-1198)
       and Radix's roving focus skips them: `Duplicate · Turn into…` — two
       steps down, then in. */
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}')
    await screen.findByRole('menuitem', { name: copy('pg.block.heading.name') })
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('heading', { name: 'A note' })).toBeInTheDocument()
  })
})

describe('AC-1206 — Turn into converts report ↔ metric without losing the reportId', () => {
  it('turns a report block into a metric block on the same report', async () => {
    const user = userEvent.setup()
    const pageId = await onePage([{ id: 'r1', type: 'report', reportId: 'RPT-4', view: 'chart', height: 'M', title: null }])
    await mountEditing(pageId)

    /* F-V2-87 — an untitled report block's frame name is "Report 1" (type + position). */
    await user.click(screen.getByRole('button', { name: copy('pg.edit.blockMenu').replace('{name}', 'Report 1') }))
    await screen.findByRole('menuitem', { name: copy('pg.edit.moveUp') })
    /* Same single-block page, same skip of the three disabled items —
       `Duplicate · Turn into…` — two steps down, then in. */
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}')
    await screen.findByRole('menuitem', { name: copy('pg.block.metric.name') })
    await user.keyboard('{Enter}')

    /* Still resolves the SAME report — `New subscriptions by plan`. */
    expect(await screen.findByText('New subscriptions by plan')).toBeInTheDocument()
    /* F-V2-87 — a metric block has no title field, so it always falls back to "Metric 1". */
    expect(screen.getByRole('group', { name: `${copy('pg.block.metric.name')} 1` })).toBeInTheDocument()
  })
})
