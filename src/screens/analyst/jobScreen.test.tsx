/**
 * The job page — AC-1256 (polling stops when terminal, seam-instrumented,
 * not a spy), AC-1258 (a `done` job renders its result with the shared
 * block renderer plus Provenance), AC-1259 (`Open in builder`), AC-1260
 * (the action buttons), AC-1263 (chrome resolves through `an.*`).
 */

import { act, render, screen, within } from '@testing-library/react'
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
    /* No manual seed: `getRun` (`clients/runs.ts`) now seeds RUN-1 itself,
       for real, the first time anything asks for it (AC-1258). */
    mountJob('AGT-1')
    await screen.findByText('Why did the cancellation rate cross 6% on 24 June?')

    /* The finding's own text — content, not a copy key (§4). */
    expect(
      await screen.findByText('The rate rose from 5% to 7% between 22 and 24 June, the day the alert fired.'),
    ).toBeInTheDocument()

    expect(screen.getByText('Provenance')).toBeInTheDocument()
    /* All three of RUN-1/2/3 resolve now (AC-1258) — one link each. */
    expect(await screen.findAllByRole('link', { name: 'Open in builder' })).toHaveLength(3)
  })

  it('AC-1259 — Open in builder opens the builder on that run’s query', async () => {
    const user = userEvent.setup()
    mountJob('AGT-1')
    await user.click((await screen.findAllByRole('link', { name: 'Open in builder' }))[0]!)
    expect(await screen.findByText('the report builder')).toBeInTheDocument()
  })
})

describe('F-V2-90 — Provenance lists every run the study cites, by runId, never a silent drop', () => {
  it('resolves all three cited runs — a live session no longer shows a real citation as missing', async () => {
    /* Was: manually `recordRun`-ing two of the three and asserting the third
       stayed missing, which was the defect this AC exists to close, not a
       state to keep demonstrating. The missing-run render itself is still
       covered, in isolation, by `provenancePanel.test.tsx`. */
    mountJob('AGT-1')
    await screen.findByText('Why did the cancellation rate cross 6% on 24 June?')

    /* Scoped to the rail itself: RUN-2 also names its own cell in the
       contributors table (`caseStudyToBlocks.ts`'s `table` block,
       `01-analyst-agent.md:330`), so a page-wide query now matches twice. */
    const rail = (await screen.findByText('Provenance')).closest('div')!
    for (const runId of ['RUN-1', 'RUN-2', 'RUN-3']) {
      expect(await within(rail).findByText(runId)).toBeInTheDocument()
    }
    expect(await screen.findAllByRole('link', { name: 'Open in builder' })).toHaveLength(3)
    expect(
      screen.queryByText('This run could not be found. Its number can’t be re-checked.'),
    ).not.toBeInTheDocument()
  })
})

describe('AC-1260 — Save as page, Pin to page, Copy link, Re-run and Create alert are buttons with accessible names', () => {
  it('names every action, and pin and create alert are both enabled for a done job with a result', async () => {
    mountJob('AGT-1')
    await screen.findByText('Why did the cancellation rate cross 6% on 24 June?')

    expect(screen.getByRole('button', { name: 'Save as page' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Re-run' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Pin to page…' })).toBeEnabled()

    /* F1's own recommendation proposed a condition (`fixtures/agent.ts`),
       and its chart is a saved report (`RPT-5`, `fixtures/pages.ts`), so
       this study has something to prefill — the button is reachable. */
    await screen.findAllByRole('link', { name: 'Open in builder' })
    expect(screen.getByRole('button', { name: 'Create alert' })).toBeEnabled()
  })

  it('is disabled with a reason while the job has no result to propose an alert from', async () => {
    mountJob('AGT-7')
    await screen.findByText('Queued')

    const createAlert = screen.getByRole('button', { name: 'Create alert' })
    expect(createAlert).toBeDisabled()
    expect(screen.getByText('This study didn’t propose an alert to create.')).toBeInTheDocument()
  })

  it('opens the composer with the finding’s report, series and condition filled in, and does not save until the operator does', async () => {
    const user = userEvent.setup()
    mountJob('AGT-1')
    await screen.findAllByRole('link', { name: 'Open in builder' })

    await user.click(screen.getByRole('button', { name: 'Create alert' }))
    expect(await screen.findByText('New alert rule')).toBeInTheDocument()
    /* The condition F1's own recommendation proposed (`threshold: 6`),
       filled in without the operator typing anything. */
    expect(screen.getByRole('tab', { name: 'Threshold', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Threshold' })).toHaveValue('6')
    /* Reviewable, not committed: a name is still required before Save
       enables — an agent's proposal is never itself an action (§5). */
    expect(screen.getByRole('button', { name: 'Save rule' })).toBeDisabled()
  })

  it('Pin to page opens an inline picker, never a dialog, and pins a bookmark onto the chosen page', async () => {
    const user = userEvent.setup()
    mountJob('AGT-1')
    await screen.findByText('Why did the cancellation rate cross 6% on 24 June?')

    await user.click(screen.getByRole('button', { name: 'Pin to page…' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(await screen.findByText('Monday morning'))
    expect(await screen.findByText('Pinned to “Monday morning”.')).toBeInTheDocument()
  })

  it('Pin to page is disabled with a reason while the job has no result yet', async () => {
    mountJob('AGT-7')
    await screen.findByText('Queued')

    const pin = screen.getByRole('button', { name: 'Pin to page…' })
    expect(pin).toBeDisabled()
    expect(screen.getByText('This job has no result to pin yet.')).toBeInTheDocument()
  })

  it('Copy link toasts on success', async () => {
    const user = userEvent.setup()
    mountJob('AGT-1')
    await user.click(await screen.findByRole('button', { name: 'Copy link' }))
    expect(await screen.findByText('Link copied')).toBeInTheDocument()
  })
})

describe('AR2 — the meta line bidi-isolates the requesting operator’s raw id', () => {
  it('wraps USR-7 in a <bdi> inside the "Asked by … ·" sentence', async () => {
    mountJob('AGT-1')
    const idNode = await screen.findByText('USR-7')
    expect(idNode.tagName).toBe('BDI')
    expect(idNode.closest('p')?.textContent).toMatch(/^Asked by USR-7 ·/)
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
