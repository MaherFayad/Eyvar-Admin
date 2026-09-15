/**
 * F-V2-87 — `BlockFrame` gave every block of one type the same accessible
 * name (`pg.block.<type>.name`), so two report blocks on one page presented
 * one identical name to a screen reader and an operator navigating by name
 * could not tell which block's menu they opened. Each block's frame, and
 * the kebab that shares its name, must now be distinguishable.
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
const menuName = (name: string) => copy('pg.edit.blockMenu').replace('{name}', name)

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

async function onePage(blocks: Block[]): Promise<string> {
  const outcome = await savePage({
    id: null,
    kind: 'note',
    title: 'Accessible name test',
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

describe('F-V2-87 — a block without its own title is named by type and position', () => {
  it('gives two untitled report blocks distinct frame and kebab names', async () => {
    const pageId = await onePage([
      { id: 'r1', type: 'report', reportId: 'RPT-4', view: 'chart', height: 'M', title: null },
      { id: 'r2', type: 'report', reportId: 'RPT-5', view: 'chart', height: 'M', title: null },
    ])
    await mountEditing(pageId)

    expect(screen.getByRole('group', { name: `${copy('pg.block.report.name')} 1` })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: `${copy('pg.block.report.name')} 2` })).toBeInTheDocument()

    /* The kebab trigger's own accessible name is built from the same `name` (BlockFrame.tsx). */
    expect(screen.getByRole('button', { name: menuName(`${copy('pg.block.report.name')} 1`) })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: menuName(`${copy('pg.block.report.name')} 2`) })).toBeInTheDocument()
  })
})

describe('F-V2-87 — a block with its own title is named by that title, not its type', () => {
  it('uses a report block’s title over the generic "Report" name', async () => {
    const pageId = await onePage([
      { id: 'r1', type: 'report', reportId: 'RPT-4', view: 'chart', height: 'M', title: 'Weekly signups' },
      { id: 'r2', type: 'report', reportId: 'RPT-5', view: 'chart', height: 'M', title: null },
    ])
    await mountEditing(pageId)

    expect(screen.getByRole('group', { name: 'Weekly signups' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: `${copy('pg.block.report.name')} 1` })).not.toBeInTheDocument()
    /* The untitled sibling still gets its own distinct fallback. */
    expect(screen.getByRole('group', { name: `${copy('pg.block.report.name')} 2` })).toBeInTheDocument()
  })

  it('uses a heading block’s own text over the generic "Heading" name', async () => {
    const pageId = await onePage([{ id: 'h1', type: 'heading', level: 2, text: 'Monday morning' }])
    await mountEditing(pageId)

    expect(screen.getByRole('group', { name: 'Monday morning' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: copy('pg.block.heading.name') })).not.toBeInTheDocument()
  })
})
