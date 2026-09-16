/**
 * `ProvenancePanel` on its own — F-V2-90, the four states (`states.md`) and
 * the missing-run branch a `JobScreen` integration test cannot isolate
 * deterministically from the async fetch pipeline.
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { ProvenancePanel } from './ProvenancePanel'

const t = createTranslator({ dictionary: EN })

const OK_QUERY = {
  measures: [{ key: 'trips.completed' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset' as const, preset: 'last-30d' as const },
  grain: 'day' as const,
  periodComparison: 'none' as const,
  chartType: 'line' as const,
}

function mount(props: Omit<React.ComponentProps<typeof ProvenancePanel>, 't' | 'language'>) {
  return render(
    <MemoryRouter>
      <ProvenancePanel {...props} t={t} language="en" />
    </MemoryRouter>,
  )
}

describe('ProvenancePanel — the four states', () => {
  it('loading', () => {
    mount({ status: 'loading', runs: [] })
    expect(screen.getByText('Loading the runs this study cites')).toBeInTheDocument()
  })

  it('empty — the job made no run', () => {
    mount({ status: 'empty', runs: [] })
    expect(screen.getByText('This job didn’t run a report.')).toBeInTheDocument()
  })

  it('error, with a retry', () => {
    let retried = false
    mount({ status: 'error', runs: [], onRetry: () => { retried = true } })
    expect(screen.getByText('The runs behind this study didn’t load.')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Try again' }).click()
    expect(retried).toBe(true)
  })

  it('content — a resolved run shows its id, window, asOf and a working link; a missing one is marked, not dropped', () => {
    mount({
      status: 'content',
      runs: [
        { runId: 'RUN-1', status: 'ok', query: OK_QUERY, asOf: '2026-06-24T09:00:00Z' },
        { runId: 'RUN-9', status: 'missing' },
      ],
    })

    expect(screen.getByText('RUN-1')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open in builder' })).toBeInTheDocument()

    expect(screen.getByText('RUN-9')).toBeInTheDocument()
    expect(screen.getByText('This run could not be found. Its number can’t be re-checked.')).toBeInTheDocument()
  })
})
