/**
 * `AgentInsightBlockView` — AC-1190. Read-only markdown, plus a `Provenance`
 * link back to the job page.
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { AgentInsightBlock } from '@/data/types/page'
import { PageBlocksProvider, type PageBlocksValue } from '../PageBlocksContext'
import { AgentInsightBlockView } from './AgentInsightBlockView'
import { REPORTS_EN } from '@/screens/reports/copy'
import { PAGES_EN } from '@/screens/pages/copy'

const copy = (key: string) => (REPORTS_EN[key] ?? PAGES_EN[key]) as string

function noopTranslator(key: string, params?: Record<string, string | number>): string {
  const template = REPORTS_EN[key] ?? PAGES_EN[key] ?? key
  return Object.entries(params ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), template)
}
noopTranslator.plural = (key: string, params: Record<string, string | number>) => noopTranslator(key, params)

function mountBlock(block: AgentInsightBlock) {
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
        <AgentInsightBlockView block={block} />
      </PageBlocksProvider>
    </MemoryRouter>,
  )
}

describe('AC-1190 — an agent-insight block renders the analyst’s markdown, read-only', () => {
  it('renders the markdown and a Provenance link to the job page', () => {
    mountBlock({
      id: 'blk-1',
      type: 'agent-insight',
      jobId: 'JOB-7',
      findingId: 'F1',
      md: 'Cancellations **rose** 9% this week.',
      runIds: ['RUN-1'],
    })

    const bold = screen.getByText(/rose/)
    expect(bold.closest('strong')).not.toBeNull()

    const link = screen.getByRole('link', { name: copy('pg.block.agentInsight.provenance') })
    expect(link).toHaveAttribute('href', '/management/reports/analyst/JOB-7')
  })
})
