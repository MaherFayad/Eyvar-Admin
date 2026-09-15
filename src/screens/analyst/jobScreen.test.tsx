/**
 * The job page — AC-1256 (polling stops when terminal, seam-instrumented,
 * not a spy), AC-1258 (a `done` job renders its result with the shared
 * block renderer plus Provenance), AC-1259 (`Open in builder`), AC-1260
 * (the action buttons), AC-1263 (chrome resolves through `an.*`).
 */

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { Toaster } from '@/components/ui/sonner'
import { disableMockLatency, resetDataLayer, useOfflineRunner } from '@/data/clients'
import { JobScreen } from './JobScreen'

/* AC-1256's own words: "asserted with the seam instrument, not a spy" — the
   real client, counted at the module boundary, on `board.screen.test.tsx`'s
   own pattern, rather than `vi.spyOn` over an imported object. */
let eventsCalls = 0
vi.mock('@/data/clients', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/clients')>()
  return {
    ...actual,
    listAgentJobEvents: async (...args: Parameters<typeof actual.listAgentJobEvents>) => {
      eventsCalls += 1
      return actual.listAgentJobEvents(...args)
    },
  }
})

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  eventsCalls = 0
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
  /* jsdom has no Clipboard API at all — `navigator.clipboard` is `undefined`
     — so the property is minted fresh rather than spied on. */
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: () => Promise.resolve() },
  })
})

function mountJob(jobId: string) {
  return render(
    <MemoryRouter initialEntries={[`/management/reports/analyst/${jobId}`]}>
      <ShellProvider>
        <Routes>
          <Route path="/management/reports/analyst/:jobId" element={<JobScreen />} />
          <Route path="/management/reports" element={<p>the report builder</p>} />
        </Routes>
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('AC-1256 — the job page polls events every 2 s while running and stops when the state is terminal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('polls again while the job is running', async () => {
    mountJob('AGT-2')
    await screen.findByText('لماذا انخفض عدد الاشتراكات الجديدة هذا الأسبوع؟')
    const afterMount = eventsCalls
    expect(afterMount).toBeGreaterThan(0)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100)
    })
    expect(eventsCalls).toBeGreaterThan(afterMount)
  })

  it('never polls again once the job is done', async () => {
    mountJob('AGT-1')
    await screen.findByText('Why did the cancellation rate cross 6% on 24 June?')
    const settled = eventsCalls

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(eventsCalls).toBe(settled)
  })
})

describe('AC-1258 — a done job renders its result with the block renderer and a Provenance panel', () => {
  it('renders the case study’s own blocks and lists the run it cited', async () => {
    mountJob('AGT-1')
    await screen.findByText('Why did the cancellation rate cross 6% on 24 June?')

    /* The finding's own text — content, not a copy key (§4). */
    expect(
      await screen.findByText('The rate rose from 5% to 7% between 22 and 24 June, the day the alert fired.'),
    ).toBeInTheDocument()

    expect(screen.getByText('Provenance')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Open in builder' })).toBeInTheDocument()
  })

  it('AC-1259 — Open in builder opens the builder on that run’s query', async () => {
    const user = userEvent.setup()
    mountJob('AGT-1')
    await user.click(await screen.findByRole('link', { name: 'Open in builder' }))
    expect(await screen.findByText('the report builder')).toBeInTheDocument()
  })
})

describe('AC-1260 — Save as page, Copy link, Re-run and the deferred actions are buttons with accessible names', () => {
  it('names every action, and states the reason for the two not yet wired', async () => {
    mountJob('AGT-1')
    await screen.findByText('Why did the cancellation rate cross 6% on 24 June?')

    expect(screen.getByRole('button', { name: 'Save as page' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Re-run' })).toBeEnabled()

    const pin = screen.getByRole('button', { name: 'Pin to page…' })
    expect(pin).toBeDisabled()
    expect(screen.getByText('Pinning this to another page isn’t wired yet.')).toBeInTheDocument()

    const createAlert = screen.getByRole('button', { name: 'Create alert' })
    expect(createAlert).toBeDisabled()
    expect(screen.getByText('Creating an alert from a finding isn’t wired yet.')).toBeInTheDocument()
  })

  it('Copy link toasts on success', async () => {
    const user = userEvent.setup()
    mountJob('AGT-1')
    await user.click(await screen.findByRole('button', { name: 'Copy link' }))
    expect(await screen.findByText('Link copied')).toBeInTheDocument()
  })
})

describe('AC-1263 — the chrome around the agent’s prose is a keyed sentence with an Arabic entry', () => {
  it('shows the Done badge and the queued sentence for a queued job, both as real copy', async () => {
    mountJob('AGT-7')
    expect(await screen.findByText('Queued')).toBeInTheDocument()
    expect(screen.getByText('Waiting for the runner to pick this up.')).toBeInTheDocument()
  })
})

describe('AC-1267 — a scheduled job stays queued with the runner offline, and the job page states why', () => {
  it('shows the offline reason instead of the ordinary waiting sentence when the runner is offline', async () => {
    useOfflineRunner()
    mountJob('AGT-7')
    expect(await screen.findByText('Queued')).toBeInTheDocument()
    expect(await screen.findByText('The runner is offline. This will stay queued until it reconnects.')).toBeInTheDocument()
    expect(screen.queryByText('Waiting for the runner to pick this up.')).not.toBeInTheDocument()
    // Nothing marked it failed — it is queued, plainly.
    expect(screen.queryByText('Failed')).not.toBeInTheDocument()
  })
})
