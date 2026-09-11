/**
 * `AlertStatusBlockView` — AC-1189. `getAlertRule` per id, R7 tones
 * (`firing` = warning), last value and last evaluated, each rule its own
 * list row.
 */

import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '@/data/clients'
import type { AlertStatusBlock } from '@/data/types/page'
import { PageBlocksProvider, type PageBlocksValue } from '../PageBlocksContext'
import { AlertStatusBlockView } from './AlertStatusBlockView'
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

function mountBlock(block: AlertStatusBlock) {
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
    <PageBlocksProvider value={value}>
      <AlertStatusBlockView block={block} />
    </PageBlocksProvider>,
  )
}

describe('AC-1189 — an alert-status block shows each rule’s live state', () => {
  it('shows the firing rule’s state badge in the warning tone (R7), its last value and last evaluated', async () => {
    mountBlock({ id: 'blk-1', type: 'alert-status', ruleIds: ['ALR-1'] })

    const row = (await screen.findByText('Cancellation rate over 6%')).closest('li') as HTMLElement
    const badge = within(row).getByText(copy('rb.alert.state.firing'))
    expect(badge.closest('[data-tone]')).toHaveAttribute('data-tone', 'warning')
    expect(within(row).getByText('7')).toBeInTheDocument()
  })

  it('shows a different rule’s state in its own tone, on the same block', async () => {
    mountBlock({ id: 'blk-2', type: 'alert-status', ruleIds: ['ALR-2'] })

    const row = (await screen.findByText('Gross revenue below SAR 400 a day')).closest('li') as HTMLElement
    const badge = within(row).getByText(copy('rb.alert.state.armed'))
    expect(badge.closest('[data-tone]')).toHaveAttribute('data-tone', 'success')
  })

  it('shows one row per rule id, in order', async () => {
    mountBlock({ id: 'blk-3', type: 'alert-status', ruleIds: ['ALR-1', 'ALR-2'] })

    const rows = await screen.findAllByRole('listitem')
    expect(rows.length).toBe(2)
    expect(within(rows[0]!).getByText('Cancellation rate over 6%')).toBeInTheDocument()
  })

  it('shows the empty sentence when no rule is chosen yet', async () => {
    mountBlock({ id: 'blk-4', type: 'alert-status', ruleIds: [] })

    expect(await screen.findByText(copy('pg.block.alertStatus.empty'))).toBeInTheDocument()
  })
})
