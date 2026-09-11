/**
 * The builder's overflow — WP-2.7, §8. AC-1162: `Version history` lists the
 * last saves and `Restore` loads the query into the DRAFT, never saves. Read
 * through the client seam (`getReport`), never a fixture import.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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
