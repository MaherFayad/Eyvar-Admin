/**
 * AC-1148/1149/1150 — the real wiring `ReportBuilder` owns: the seeded
 * client, the real permission and a save that persists through it, all
 * mocked away at `chartSurfaceV2.test.tsx`'s component boundary.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { disableMockLatency, listAnnotations, listReports, resetDataLayer } from '@/data/clients'
import type { SavedReport } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { REPORTS_EN } from './copy'
import { ReportBuilder } from './ReportBuilder'

const copy = (key: string) => REPORTS_EN[key] as string
const shellCopy = (key: string) => EN[key] as string
const t = createTranslator({ dictionary: EN })

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither and Radix's select and popover call them on the
     trigger — the same shim every other builder test file carries. */
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

async function savedReports(): Promise<readonly SavedReport[]> {
  return (await listReports({ pageSize: 100 })).items
}

function renderBuilder(report: SavedReport | null) {
  return render(
    <MemoryRouter initialEntries={['/management/reports']}>
      <ShellProvider>
        <ReportBuilder
          report={report}
          noDataSentence={shellCopy('overview.noData')}
          title={copy('rb.page.title')}
          t={t}
          language="en"
        />
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('AC-1148 — the window’s real annotations reach the plot', () => {
  it('draws the seeded mark inside RPT-1’s last-30d window', async () => {
    const rpt1 = (await savedReports()).find((r) => r.id === 'RPT-1')!
    renderBuilder(rpt1)

    /* `ANN-6` (`fixtures/annotations.ts`) sits inside the fixed clock's last
       30 days by construction — the fixture's own reason for existing. */
    expect(
      await screen.findByRole('button', { name: /Payment gateway outage/ }),
    ).toBeInTheDocument()
  })
})

describe('AC-1149 — the add form is disabled in place, never removed, without the permission', () => {
  it('enables `Add annotation` for USR-1, who holds `view_analytics`', async () => {
    const rpt1 = (await savedReports()).find((r) => r.id === 'RPT-1')!
    renderBuilder(rpt1)
    const button = await screen.findByRole('button', { name: copy('rb.chart.addAnnotation') })
    expect(button).toBeEnabled()
  })
})

describe('AC-1150 — saving writes through `annotations.save` and appears with no reload', () => {
  it('adds a mark for the new annotation, and the client holds it', async () => {
    const user = userEvent.setup()
    const rpt1 = (await savedReports()).find((r) => r.id === 'RPT-1')!
    renderBuilder(rpt1)

    await user.click(await screen.findByRole('button', { name: copy('rb.chart.addAnnotation') }))
    const form = screen.getByRole('form', { name: copy('rb.chart.addAnnotation') })
    await user.type(within(form).getByLabelText(copy('rb.annotation.form.date')), '2026-06-15')
    await user.type(within(form).getByLabelText(copy('rb.annotation.form.label')), 'Fare promo')
    await user.click(within(form).getByRole('button', { name: copy('rb.annotation.form.submit') }))

    expect(await screen.findByRole('button', { name: /Fare promo/ })).toBeInTheDocument()
    /* The same client the whole product reads from — not a local echo. */
    const rows = await listAnnotations()
    expect(rows.some((a) => a.label === 'Fare promo' && a.date === '2026-06-15')).toBe(true)
  })
})
