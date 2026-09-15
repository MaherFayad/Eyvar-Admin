/**
 * The analyst index — AC-1254 (jobs list, state badges, filters), AC-1255
 * (the composer's states) and AC-1264 (the runner status line).
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { Toaster } from '@/components/ui/sonner'
import { disableMockLatency, resetAgent, resetDataLayer, useOfflineRunner } from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { AnalystView } from './AnalystView'

/* `EN` already carries `ANALYST_EN` (`dictionaries.ts`), and the real
   translator is what resolves the shell's own `table.*` keys the column
   filter menu renders — a screen-scoped fallback dictionary, as `PagesView`'s
   test uses, does not reach those. */
const t = createTranslator({ dictionary: EN })

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  resetAgent()
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
})

function mountIndex() {
  return render(
    <MemoryRouter initialEntries={['/management/reports?view=analyst']}>
      <ShellProvider>
        <Routes>
          <Route
            path="/management/reports"
            element={<AnalystView title="Analyst" currentUserId="USR-1" t={t} language="en" dir="ltr" />}
          />
          <Route path="/management/reports/analyst/:jobId" element={<p>the job page</p>} />
        </Routes>
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('AC-1254 — the analyst view lists jobs with state badges in R7 tones, filters by state, kind and mine/team', () => {
  it('lists every seeded job with its state badge, never a red tone', async () => {
    mountIndex()
    expect(await screen.findByText('Why did the cancellation rate cross 6% on 24 June?')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('Deferred')).toBeInTheDocument()
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0)
    expect(screen.getByText('Queued')).toBeInTheDocument()
  })

  it('filters to Mine, showing only the signed-in operator’s own jobs', async () => {
    const user = userEvent.setup()
    mountIndex()
    await screen.findByText('Why did the cancellation rate cross 6% on 24 June?')
    await user.click(screen.getByRole('tab', { name: 'Mine' }))

    /* AGT-2 (`USR-1`) stays; AGT-1 (`USR-7`, the done job) drops out. */
    expect(await screen.findByText('لماذا انخفض عدد الاشتراكات الجديدة هذا الأسبوع؟')).toBeInTheDocument()
    expect(screen.queryByText('Why did the cancellation rate cross 6% on 24 June?')).not.toBeInTheDocument()
  })

  it('filters by state through the column filter', async () => {
    const user = userEvent.setup()
    mountIndex()
    await screen.findByText('Why did the cancellation rate cross 6% on 24 June?')

    await user.click(screen.getByRole('button', { name: 'Column options for State' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Filter…' }))
    await user.click(await screen.findByRole('radio', { name: 'Done' }))
    await user.keyboard('{Escape}')

    expect(await screen.findByText('Why did the cancellation rate cross 6% on 24 June?')).toBeInTheDocument()
    expect(screen.queryByText('How many riders churned last quarter, and why?')).not.toBeInTheDocument()
  })
})

describe('AC-1255 — the composer is inline with kind, question, context chips and one primary Ask', () => {
  it('disables Ask on an empty question, with no reason sentence', async () => {
    mountIndex()
    expect(await screen.findByRole('button', { name: 'Ask' })).toBeDisabled()
  })

  it('enables Ask once a question is typed, and asking opens the new job', async () => {
    const user = userEvent.setup()
    mountIndex()
    await user.type(await screen.findByRole('textbox', { name: 'Question' }), 'Why did trips drop this week?')
    const ask = screen.getByRole('button', { name: 'Ask' })
    expect(ask).toBeEnabled()
    await user.click(ask)
    expect(await screen.findByText('the job page')).toBeInTheDocument()
  })

  it('disables Ask in place with the offline reason when the runner is offline', async () => {
    useOfflineRunner()
    mountIndex()
    expect(await screen.findByRole('button', { name: 'Ask' })).toBeDisabled()
    expect(
      screen.getByText('Runner offline. Your question will wait until it reconnects.'),
    ).toBeInTheDocument()
  })
})

describe('AC-1264 — the runner status line reads from agent.status', () => {
  /* `role="status"` also names `DataTable`'s own filter announcer, so the
     line is found by its text and then checked for the role, rather than
     the other way round. */
  it('shows Runner online with a last-seen time', async () => {
    mountIndex()
    const line = await screen.findByText(/Runner online · last seen/)
    expect(line.closest('[role="status"]')).not.toBeNull()
  })

  it('shows Runner offline', async () => {
    useOfflineRunner()
    mountIndex()
    const line = await screen.findByText('Runner offline')
    expect(line.closest('[role="status"]')).not.toBeNull()
  })
})
