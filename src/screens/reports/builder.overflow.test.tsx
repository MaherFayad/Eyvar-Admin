/**
 * The builder's overflow — WP-2.7, §8. AC-1162: `Version history` lists the
 * last saves and `Restore` loads the query into the DRAFT, never saves. Read
 * through the client seam (`getReport`), never a fixture import.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { ShellProvider } from '@/shell/ShellContext'
import { disableMockLatency, getReport, resetDataLayer } from '@/data/clients'
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
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

function renderBuilder(report: SavedReport) {
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
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/* RPT-18 ships with one prior version (`fixtures/reports.ts`), so this opens
   on real content rather than a state manufactured for the test. */
async function rpt18(): Promise<SavedReport> {
  return (await getReport('RPT-18')).data
}

function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>
}

function renderBuilderAt(report: SavedReport | null) {
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
        <LocationProbe />
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('AC-1262 — the overflow’s Ask the analyst hands the report over as context', () => {
  it('opens the analyst on this report, with the report already attached', async () => {
    const user = userEvent.setup()
    const report = await rpt18()
    renderBuilderAt(report)

    await user.click(await screen.findByRole('button', { name: shellCopy('shell.moreActions') }))
    await user.click(await screen.findByRole('menuitem', { name: copy('rb.overflow.ask') }))

    const location = await screen.findByTestId('location')
    expect(location.textContent).toContain('/management/reports?')
    const search = new URLSearchParams(location.textContent!.split('?')[1])
    expect(search.get('view')).toBe('analyst')
    expect(search.get('askKind')).toBe('report')
    expect(search.get('askId')).toBe(report.id)
    expect(search.get('askLabel')).toBe(report.name)
  })

  it('is disabled with a reason for an unsaved question', async () => {
    const user = userEvent.setup()
    renderBuilderAt(null)

    await user.click(await screen.findByRole('button', { name: shellCopy('shell.moreActions') }))
    const ask = await screen.findByRole('menuitem', { name: copy('rb.overflow.ask') })
    expect(ask).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(copy('rb.overflow.ask.needsSaved'))).toBeInTheDocument()
  })
})

describe('AC-1162 — Version history', () => {
  it('lists the last saves and Restore loads the query into the draft without saving', async () => {
    const user = userEvent.setup()
    const report = await rpt18()
    renderBuilder(report)

    await user.click(await screen.findByRole('button', { name: shellCopy('shell.moreActions') }))
    await user.click(await screen.findByRole('menuitem', { name: copy('rb.overflow.versions') }))

    /* The panel, under the header — not a dialog (`role="dialog"` absent). */
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText(copy('rb.overflow.versions.heading'))).toBeInTheDocument()
    const restore = await screen.findByRole('button', { name: copy('rb.overflow.versions.restore') })

    await user.click(restore)

    /* The confirmation names what happened, in words a screen-reader hears. */
    expect(
      await screen.findByText(new RegExp(copy('rb.overflow.versions.restored').split('{')[0]!, 'u')),
    ).toBeInTheDocument()

    /* AC-1162's own claim: nothing was saved. The server copy is unchanged —
       same version count, same `updatedAt` — because `Restore` only called
       `setQuery`, never `saveReport`. */
    const after = await rpt18()
    expect(after.updatedAt).toBe(report.updatedAt)
    expect((after.versions ?? []).length).toBe((report.versions ?? []).length)
  })
})
