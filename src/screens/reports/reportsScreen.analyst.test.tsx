/**
 * `ReportsScreen`'s own wiring for `?view=analyst` (WP-7.4) — the fourth
 * view used to render a "not built yet" empty state; AC-1254 is that it now
 * renders the real index.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { disableMockLatency, resetAgent, resetDataLayer } from '@/data/clients'
import { ReportsScreen } from './ReportsScreen'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  resetAgent()
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <ReportsScreen />
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('AC-1254 — `?view=analyst` renders the analyst index, not the old empty state', () => {
  it('shows the ask composer and the jobs list', async () => {
    renderAt('/management/reports?view=analyst')
    expect(await screen.findByText('Ask the analyst')).toBeInTheDocument()
    expect(await screen.findByRole('textbox', { name: 'Question' })).toBeInTheDocument()
    expect(await screen.findByText('Why did the cancellation rate cross 6% on 24 June?')).toBeInTheDocument()
  })

  it('the Analyst tab is one of the four view tabs and switches to it', async () => {
    const user = userEvent.setup()
    renderAt('/management/reports')
    await user.click(await screen.findByRole('tab', { name: 'Analyst' }))
    expect(await screen.findByRole('textbox', { name: 'Question' })).toBeInTheDocument()
  })
})
