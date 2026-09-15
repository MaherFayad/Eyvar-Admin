/**
 * AC-1205 — the builder mounted with `?pinTo=<pageId>` (`ReportPickerPanel`'s
 * `New report` link) offers `Save and pin`, saving the report and appending a
 * `report` block to the page in one step.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { disableMockLatency, listReports, reportQueryPath, resetDataLayer } from '@/data/clients'
import { ReportsScreen } from '@/screens/reports/ReportsScreen'
import { REPORTS_EN } from '@/screens/reports/copy'

const copy = (key: string) => REPORTS_EN[key] as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
})

/**
 * A **composed** question, not an empty one. An unstarted trend has no measure,
 * which is a real `no-measure` violation, and §3.2 disables `Save` on it — so a
 * fixture that mounts `?q=` proves nothing about pinning either way.
 */
async function composedQuery() {
  const saved = await listReports()
  return saved.items.find((r) => r.id === 'RPT-1')!.query
}

function mountBuilder(search: string) {
  return render(
    <MemoryRouter initialEntries={[search]}>
      <ShellProvider>
        <ReportsScreen />
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('AC-1205 — a builder opened with ?pinTo= offers "Save and pin"', () => {
  it('offers "Save and pin" as the dialog’s one primary', async () => {
    const user = userEvent.setup()
    mountBuilder(`${reportQueryPath(await composedQuery())}&pinTo=DSH-1`)

    await user.click(await screen.findByRole('button', { name: copy('rb.save') }))

    expect(await screen.findByRole('button', { name: /save and pin/i })).toBeInTheDocument()
  })

  it('leaves the ordinary Save alone when no page asked for a pin', async () => {
    const user = userEvent.setup()
    mountBuilder(reportQueryPath(await composedQuery()))

    await user.click(await screen.findByRole('button', { name: copy('rb.save') }))

    /* The dialog is the same dialog; only its primary's word changes, so the
       absence of the pin wording is what proves `pinTo` drove it. */
    expect(await screen.findByRole('button', { name: copy('rb.save.confirm') })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save and pin/i })).toBeNull()
  })
})
