/**
 * The job timeline — AC-1257 (interim findings appear as they arrive) and
 * the domain states AC-1261 names (`deferred`, `failed:timeout`,
 * `failed:evidence`, `failed:schema`).
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { JobTimeline } from './JobTimeline'
import type { AgentEvent, AgentJob } from '@/data/types/agent'

const t = createTranslator({ dictionary: EN })

function job(overrides: Partial<AgentJob>): AgentJob {
  return {
    id: 'AGT-TEST',
    kind: 'ask',
    question: 'Why did trips drop?',
    language: 'en',
    requestedBy: 'USR-1',
    state: 'running',
    failureReason: null,
    retryAt: null,
    contextObjects: [],
    resultPageId: null,
    startedAt: '2026-06-24T09:00:00.000Z',
    finishedAt: null,
    createdAt: '2026-06-24T08:59:00.000Z',
    updatedAt: '2026-06-24T09:00:00.000Z',
    ...overrides,
  }
}

const step = (id: string, tool: string, summary: string, durationMs: number): AgentEvent => ({
  kind: 'tool-call',
  id,
  jobId: 'AGT-TEST',
  tool,
  summary,
  durationMs,
  ts: '2026-06-24T09:00:00.000Z',
})

const finding = (id: string, text: string): AgentEvent => ({
  kind: 'finding',
  id,
  jobId: 'AGT-TEST',
  text,
  runIds: ['RUN-1'],
  ts: '2026-06-24T09:00:05.000Z',
})

describe('AC-1257 — interim findings from note_finding appear in the timeline as they arrive', () => {
  it('shows a finding already in the events list, and a second one appended on re-render', () => {
    const events = [step('E1', 'catalogue_measures', 'Looked up trips.completed', 400)]
    const { rerender } = render(<JobTimeline job={job({})} events={events} onRerun={() => {}} t={t} language="en" />)
    expect(screen.queryByText('Riyadh North fell week over week.')).not.toBeInTheDocument()

    rerender(
      <JobTimeline
        job={job({})}
        events={[...events, finding('F1', 'Riyadh North fell week over week.')]}
        onRerun={() => {}}
        t={t}
        language="en"
      />,
    )
    expect(screen.getByText('Riyadh North fell week over week.')).toBeInTheDocument()
  })
})

describe('AC-1261 — deferred and the three failure reasons each state what happened', () => {
  it('deferred shows the retry time', () => {
    render(
      <JobTimeline
        job={job({ state: 'deferred', retryAt: '2026-06-24T14:00:00.000Z' })}
        events={[]}
        onRerun={() => {}}
        t={t}
        language="en"
      />,
    )
    // `formatDate` reads Riyadh time (UTC+3): 14:00Z is 17:00 there.
    expect(screen.getByText('Paused. The runner is at its usage limit until 17:00.')).toBeInTheDocument()
  })

  it('failed:timeout keeps the findings already noted', () => {
    render(
      <JobTimeline
        job={job({ state: 'failed', failureReason: 'timeout' })}
        events={[finding('F1', 'Partial finding kept.')]}
        onRerun={() => {}}
        t={t}
        language="en"
      />,
    )
    expect(screen.getByText('This job ran out of time. Here is what it found before stopping.')).toBeInTheDocument()
    expect(screen.getByText('Partial finding kept.')).toBeInTheDocument()
  })

  it('failed:evidence lists the mismatched finding', () => {
    render(
      <JobTimeline
        job={job({ state: 'failed', failureReason: 'evidence' })}
        events={[finding('F1', 'Churn was concentrated among Gold plan riders.')]}
        onRerun={() => {}}
        t={t}
        language="en"
      />,
    )
    expect(screen.getByText('The analyst couldn’t substantiate its own numbers, so this job did not finish.')).toBeInTheDocument()
    expect(screen.getByText('Churn was concentrated among Gold plan riders.')).toBeInTheDocument()
  })

  it('failed:schema offers Re-run, which calls the handler', async () => {
    const user = userEvent.setup()
    const onRerun = vi.fn()
    render(
      <JobTimeline job={job({ state: 'failed', failureReason: 'schema' })} events={[]} onRerun={onRerun} t={t} language="en" />,
    )
    expect(screen.getByText('This job’s answer didn’t come back in the expected shape.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Re-run' }))
    expect(onRerun).toHaveBeenCalledOnce()
  })

  it('queued shows the waiting sentence and no steps', () => {
    render(<JobTimeline job={job({ state: 'queued', startedAt: null })} events={[]} onRerun={() => {}} t={t} language="en" />)
    expect(screen.getByText('Waiting for the runner to pick this up.')).toBeInTheDocument()
  })

  it('done collapses the steps behind Show steps', async () => {
    const user = userEvent.setup()
    render(
      <JobTimeline
        job={job({ state: 'done', finishedAt: '2026-06-24T09:05:00.000Z' })}
        events={[step('E1', 'run_report', 'Completed a query', 1800)]}
        onRerun={() => {}}
        t={t}
        language="en"
      />,
    )
    expect(screen.queryByText('Completed a query', { exact: false })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show steps' }))
    expect(await screen.findByText('Ran a report')).toBeInTheDocument()
    expect(screen.getByText('Completed a query', { exact: false })).toBeInTheDocument()
  })
})
