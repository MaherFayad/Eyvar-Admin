/**
 * AC-1205 — the builder mounted with `?pinTo=<pageId>` (`ReportPickerPanel`'s
 * `New report` link) should offer `Save and pin`, saving the report and
 * appending a `report` block to the page in one step.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { disableMockLatency, resetDataLayer } from '@/data/clients'
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

function mountBuilder(pinTo: string) {
  return render(
    <MemoryRouter initialEntries={[`/management/reports?q=&pinTo=${pinTo}`]}>
      <ShellProvider>
        <ReportsScreen />
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('AC-1205 — a builder opened with ?pinTo= offers "Save and pin"', () => {
  it.fails('DEFECT — the builder never reads ?pinTo= and never offers "Save and pin"; the ordinary Save dialog opens instead', async () => {
    const user = userEvent.setup()
    mountBuilder('DSH-1')

    await user.click(await screen.findByRole('button', { name: copy('rb.save') }))

    /* `ReportBuilder.tsx` never reads `pinTo` from the URL at all — grep
       confirms it. The dialog that opens is the ordinary `Save this report`
       one, with no `Save and pin` affordance anywhere in it. */
    expect(await screen.findByRole('button', { name: /save and pin/i })).toBeInTheDocument()
  })
})
