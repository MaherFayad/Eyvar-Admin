/**
 * `BookmarkBlockView` — AC-1191. A card naming the target's title, opening
 * it; empty and error states for an unchosen or unresolved target.
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, getPage, getReport, resetDataLayer } from '@/data/clients'
import type { BookmarkBlock } from '@/data/types/page'
import { PageBlocksProvider, type PageBlocksValue } from '../PageBlocksContext'
import { BookmarkBlockView } from './BookmarkBlockView'
import { REPORTS_EN } from '@/screens/reports/copy'
import { PAGES_EN } from '@/screens/pages/copy'

const copy = (key: string) => (REPORTS_EN[key] ?? PAGES_EN[key]) as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

function noopTranslator(key: string, params?: Record<string, string | number>): string {
  const template = REPORTS_EN[key] ?? PAGES_EN[key] ?? key
  return Object.entries(params ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), template)
}
noopTranslator.plural = (key: string, params: Record<string, string | number>) => noopTranslator(key, params)

function mountBlock(block: BookmarkBlock) {
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
    editing: false,
    actions: null,
    onOpenReport: () => {},
  }
  return render(
    <MemoryRouter>
      <PageBlocksProvider value={value}>
        <BookmarkBlockView block={block} />
      </PageBlocksProvider>
    </MemoryRouter>,
  )
}

describe('AC-1191 — a bookmark block cards the target and opens it', () => {
  it('names a report target’s title and links to it', async () => {
    const report = (await getReport('RPT-4')).data
    mountBlock({ id: 'blk-1', type: 'bookmark', target: { kind: 'report', id: report.id } })

    const link = await screen.findByRole('link', { name: new RegExp(report.name) })
    expect(link).toHaveAttribute('href', `/management/reports/${report.id}`)
  })

  it('names a page target’s title and links to it', async () => {
    const all = await getPage('DSH-1')
    mountBlock({ id: 'blk-2', type: 'bookmark', target: { kind: 'page', id: all.data.id } })

    const link = await screen.findByRole('link', { name: new RegExp(all.data.title) })
    expect(link).toHaveAttribute('href', `/management/reports/pages/${all.data.id}`)
  })

  it('shows the empty sentence when no target is chosen yet', () => {
    mountBlock({ id: 'blk-3', type: 'bookmark', target: { kind: 'page', id: '' } })

    expect(screen.getByText(copy('pg.block.bookmark.empty'))).toBeInTheDocument()
  })

  it('shows an error with retry when the target does not resolve', async () => {
    mountBlock({ id: 'blk-4', type: 'bookmark', target: { kind: 'page', id: 'PAGE-DOES-NOT-EXIST' } })

    expect(await screen.findByText(copy('pg.block.bookmark.error'))).toBeInTheDocument()
  })
})
