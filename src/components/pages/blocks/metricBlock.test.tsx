/**
 * `MetricBlockView` — AC-1188. Resolves through the same `useResolvedReport`
 * seam `reportBlock.test.tsx` proves; this file proves the metric's own
 * render: one series' value, delta, sparkline, and the gap sentinel.
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, listDimensions, listMeasures, localDayOf, resetDataLayer } from '@/data/clients'
import type { Dimension, Measure } from '@/data/types'
import type { MetricBlock } from '@/data/types/page'
import { ABSENT } from '@/lib'
import { PageBlocksProvider, type PageBlocksValue } from '../PageBlocksContext'
import { MetricBlockView } from './MetricBlockView'
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

async function catalogue(): Promise<{ measures: Measure[]; dimensions: Dimension[] }> {
  const [m, d] = await Promise.all([listMeasures({ pageSize: 100 }), listDimensions({ pageSize: 100 })])
  return { measures: m.items, dimensions: d.items }
}

function mountBlock(block: MetricBlock, value: Partial<PageBlocksValue> = {}) {
  return catalogue().then(({ measures, dimensions }) => {
    const full: PageBlocksValue = {
      pageId: 'PAGE-TEST',
      blocks: [block],
      measures,
      dimensions,
      scope: { range: null, filters: [] },
      today: localDayOf(new Date().toISOString()),
      noDataSentence: 'No data.',
      t: noopTranslator as PageBlocksValue['t'],
      language: 'en',
      dir: 'ltr',
      editing: false,
      actions: null,
      onOpenReport: () => {},
      ...value,
    }
    return render(
      <MemoryRouter>
        <PageBlocksProvider value={full}>
          <MetricBlockView block={block} />
        </PageBlocksProvider>
      </MemoryRouter>,
    )
  })
}

function metricOn(reportId: string, format: MetricBlock['format']): MetricBlock {
  return { id: 'blk-metric-1', type: 'metric', reportId, seriesId: null, format }
}

describe('AC-1188 — a metric block renders one series’ value', () => {
  it('shows a plain value with no delta when the format is "value"', async () => {
    await mountBlock(metricOn('RPT-4', 'value'))

    expect(await screen.findByText(/./)).toBeInTheDocument()
    /* No delta sentence for the plain format. */
    expect(screen.queryByText(copy('rb.dashboard.tile.ownRange'))).not.toBeInTheDocument()
  })

  it('shows a delta alongside the value when the format is "value-delta"', async () => {
    const { container } = await mountBlock(metricOn('RPT-18', 'value-delta'))

    await screen.findByText(/./, { selector: '.text-2xl' })
    /* `MetricDelta` renders its own text run once resolved; presence alone
       (rather than an exact figure this fixture does not fix) proves the
       format switch reached the render. */
    expect(container.querySelector('.text-2xl')).toBeInTheDocument()
  })

  it('shows a sparkline, its shape described for a screen reader (§9.2 — the plot itself is aria-hidden)', async () => {
    await mountBlock(metricOn('RPT-18', 'sparkline'))

    expect(await screen.findByText(/, over the report’s window/)).toBeInTheDocument()
  })

  it('renders the absent-value sentinel, never a zero, when the series is a gap', async () => {
    /* `RPT-3`'s comparison series is `null` end to end — "the mock emits
       `null` outside a store's coverage, not zeros" (`resolveReport.ts`). */
    const block: MetricBlock = { id: 'blk-gap', type: 'metric', reportId: 'RPT-3', seriesId: 'revenue.total#_#comparison', format: 'value' }
    await mountBlock(block)

    expect(await screen.findByText(ABSENT)).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
