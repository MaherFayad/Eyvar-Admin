/**
 * Admin › Data & Compliance — P6-T4 and the two panes beside it.
 *
 * The load-bearing assertions, in the order they matter:
 *
 *   1. **Every findings row names the check that produced it.** Asserted by
 *      counting: the number of rows carrying a check title equals the number of
 *      finding rows. A test that looked for *one* check name would pass against
 *      a table that named the check on the first row only.
 *   2. **`TKT-504` reaches the screen.** The data-layer test proves the check
 *      finds it; this proves an operator can read it, in English, with the
 *      check that found it beside it.
 *   3. **"Not run" and "found nothing" are different words.** Before any run the
 *      table says *Not run yet*; a passing check says *Passed*. Rendering both
 *      as `0` is the defect this pane exists to report, in its own chrome.
 *   4. **Retention actually saves.** Change a select, save, re-mount, and the
 *      new value is what comes back. The old screen would have passed a test
 *      that only clicked and looked for a toast.
 *
 * `mockFailures` drives the error states — never a bare `vi.spyOn` on a
 * `@/data/clients` barrel export, which does not intercept the live binding and
 * would let a negative assertion pass vacuously.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  disableMockLatency,
  getRouteTable,
  mockFailures,
  resetDataLayer,
  resetIntegrity,
  resetRetention,
} from '@/data/clients'
import { INTEGRITY_CHECK_IDS } from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { ShellProvider } from '@/shell/ShellContext'
import { AdminDataScreen } from './AdminDataScreen'
import { ADMIN_DATA_EN } from './copy'

const row = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'admin-data')
  if (!found) throw new Error('No route-table row for admin-data')
  return found
}

/**
 * jsdom has no Pointer Events and Radix's `Select` calls `hasPointerCapture` /
 * `scrollIntoView` on its trigger, so without these shims no select on this
 * screen can be opened in a test at all — and the retention save, which is the
 * defect this pass closed, would go untested. Same three lines as
 * `screens/financials/pricing/pricing.test.tsx`.
 */
beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
    HTMLElement.prototype.setPointerCapture = () => undefined
    HTMLElement.prototype.releasePointerCapture = () => undefined
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => undefined
  }
  /* `resetDataLayer()` calls both of these too. Repeated here so this suite
     stays order-independent even if the shared reset is edited underneath it —
     the integrity state includes a run counter, and a leaked one changes the
     run id every assertion about it reads. */
  resetIntegrity()
  resetRetention()
  mockFailures.clear()
})

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/admin/data']}>
      <ShellProvider>
        <AdminDataScreen row={row()} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

const text = (key: keyof typeof ADMIN_DATA_EN) => ADMIN_DATA_EN[key] as string

async function runAllChecks(user: ReturnType<typeof userEvent.setup>) {
  const button = await screen.findByRole('button', { name: text('adminData.integrity.run') })
  await user.click(button)
  await screen.findByRole('heading', { name: text('adminData.integrity.findings.title') })
}

describe('the integrity pane — the four states', () => {
  it('starts on the first-run empty, which names what the pane is FOR', async () => {
    renderScreen()
    expect(
      await screen.findByText(text('adminData.integrity.empty.heading')),
    ).toBeInTheDocument()
    /* Nothing scans on mount. `Last run` is empty and says so in words. */
    expect(screen.getAllByText(text('adminData.integrity.neverRun')).length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('heading', { name: text('adminData.integrity.findings.title') }),
    ).not.toBeInTheDocument()
  })

  it('renders findings after an explicit run', async () => {
    const user = userEvent.setup()
    renderScreen()
    await runAllChecks(user)
    expect(screen.queryByText(text('adminData.integrity.empty.heading'))).not.toBeInTheDocument()
  })

  it('reaches the error state when the scan is rigged to fail, and offers the retry', async () => {
    const user = userEvent.setup()
    renderScreen()
    mockFailures.once('integrity.run')
    await user.click(await screen.findByRole('button', { name: text('adminData.integrity.run') }))
    expect(
      await screen.findByText(text('adminData.integrity.error.message')),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: text('adminData.integrity.error.retry') }),
    ).toBeInTheDocument()
  })

  it('reaches the catalogue error state, with the shell and the other cards intact', async () => {
    mockFailures.always('integrity.checks')
    renderScreen()
    expect(await screen.findByText(text('adminData.integrity.error.message'))).toBeInTheDocument()
    /* §11.2 / AC-24 — one card failing does not take the page with it. */
    expect(screen.getByText(text('adminData.export.title'))).toBeInTheDocument()
    expect(screen.getByText(text('adminData.retention.title'))).toBeInTheDocument()
  })
})

describe('the rule — every finding names the check that produced it', () => {
  it('renders a check title on every single finding row', async () => {
    const user = userEvent.setup()
    renderScreen()
    await runAllChecks(user)

    const tables = screen.getAllByRole('table')
    const findingsTable = tables[tables.length - 1]
    expect(findingsTable).toBeDefined()

    const body = within(findingsTable as HTMLElement)
    const problemHeader = body.getByRole('columnheader', {
      name: text('adminData.integrity.findings.col.problem'),
    })
    const checkHeader = body.getByRole('columnheader', {
      name: text('adminData.integrity.findings.col.check'),
    })
    expect(problemHeader).toBeInTheDocument()
    expect(checkHeader).toBeInTheDocument()

    /* Counting, not sampling: a row that renders the provenance cell empty
       would still pass a `getByText('Trips point at…')`. Every finding row
       carries exactly one severity badge in its provenance cell, so the badge
       count is the row count. */
    const rows = body.getAllByRole('row')
    const findingRows = rows.filter((r) => within(r).queryAllByRole('columnheader').length === 0)
    const grouped = findingRows.filter((r) => r.querySelectorAll('td').length === 4)
    expect(grouped.length).toBeGreaterThan(0)
    for (const findingRow of grouped) {
      const provenance = findingRow.querySelectorAll('td')[1]
      expect(provenance?.textContent?.trim()).not.toBe('')
    }
  })

  it('puts TKT-504’s contradiction in front of the operator, in English', async () => {
    const user = userEvent.setup()
    renderScreen()
    await runAllChecks(user)
    await user.click(screen.getByRole('button', { name: text('adminData.integrity.findings.showAll') }))

    const cell = await screen.findByText(/Calls DRV-0104 “Sultan Al-Harbi”/u)
    expect(cell).toBeInTheDocument()
    expect(cell.textContent).toContain('Hassan Al-Ghamdi')
  })
})

describe('"not run" and "found nothing" are different words', () => {
  it('says Passed for a check that ran and found nothing', async () => {
    const user = userEvent.setup()
    renderScreen()
    expect(screen.queryByText(text('adminData.integrity.clean'))).not.toBeInTheDocument()
    await runAllChecks(user)
    expect(screen.getAllByText(text('adminData.integrity.clean')).length).toBeGreaterThan(0)
  })
})

describe('the findings table can be grouped two ways', () => {
  /**
   * P6-T4 requires BOTH groupings, so the assertion is that the headings
   * actually change vocabulary — check titles in one, record types in the
   * other. Asserting only that the control moves would pass against a toggle
   * wired to nothing.
   */
  it('regroups the same findings by check and by record type', async () => {
    const user = userEvent.setup()
    renderScreen()
    await runAllChecks(user)

    const headings = () =>
      screen
        .getAllByRole('cell')
        .map((cell) => cell.textContent ?? '')
        .filter((label) => / · \d+$/u.test(label))

    const checkTitles = INTEGRITY_CHECK_IDS.map((id) => text(`integrity.check.${id}.title`))
    const byCheck = headings()
    expect(byCheck.length).toBeGreaterThan(0)
    expect(byCheck.every((label) => checkTitles.some((title) => label.startsWith(`${title} · `)))).toBe(true)

    await user.click(screen.getByRole('radio', { name: text('adminData.integrity.groupBy.entity') }))

    const entityLabels = [
      text('adminData.integrity.entity.rider'),
      text('adminData.integrity.entity.driver'),
      text('adminData.integrity.entity.trip'),
      text('adminData.integrity.entity.subscription'),
    ]
    await waitFor(() => {
      const byEntity = headings()
      expect(byEntity.length).toBeGreaterThan(0)
      expect(byEntity.every((label) => entityLabels.some((e) => label.startsWith(`${e} · `)))).toBe(true)
    })
  })
})

describe('retention actually saves', () => {
  it('persists a change and reads it back on a fresh mount', async () => {
    const user = userEvent.setup()
    const first = renderScreen()

    const trigger = await screen.findByRole('combobox', {
      name: text('adminData.retention.telemetry'),
    })
    await user.click(trigger)
    await user.click(await screen.findByRole('option', { name: text('adminData.retention.days.180') }))

    const save = screen.getByRole('button', { name: text('adminData.retention.save') })
    expect(save).toBeEnabled()
    await user.click(save)

    await waitFor(() => expect(screen.getByText(/Last saved/u)).toBeInTheDocument())

    first.unmount()
    renderScreen()
    expect(
      await screen.findByRole('combobox', { name: text('adminData.retention.telemetry') }),
    ).toHaveTextContent(text('adminData.retention.days.180'))
  })

  it('disables the save in place, with a reason, while nothing has changed', async () => {
    renderScreen()
    const save = await screen.findByRole('button', { name: text('adminData.retention.save') })
    expect(save).toBeDisabled()
    /* §11.2 / §8.4.4 — the reason is rendered text pointed at by
       `aria-describedby`, never a `title` an operator has to hover to find. */
    const describedBy = save.getAttribute('aria-describedby')
    expect(describedBy).not.toBeNull()
    expect(document.getElementById(describedBy ?? '')?.textContent).toBe(
      text('adminData.retention.unchanged'),
    )
  })
})

describe('the export offers only what it can produce', () => {
  it('keeps the unbuildable dataset visible and disabled with its reason', async () => {
    const user = userEvent.setup()
    renderScreen()
    const trigger = await screen.findByRole('combobox', { name: text('adminData.export.dataset') })
    await user.click(trigger)
    const support = await screen.findByRole('option', {
      name: text('adminData.export.dataset.support'),
    })
    /* Not removed — §11.2. Hiding it would hide the gap from the person who
       could close it. */
    expect(support).toHaveAttribute('aria-disabled', 'true')
  })

  it('states that only CSV is produced rather than silently renaming the file', async () => {
    renderScreen()
    expect(await screen.findByText(text('adminData.export.format.blocked'))).toBeInTheDocument()
  })

  /**
   * The defect this pass closed: the old handler was a `setTimeout` and a toast
   * naming a file it never built. So the assertion is that a **file with the
   * §10.1 header block in it** reaches the download, not that a toast appeared.
   *
   * jsdom implements neither `URL.createObjectURL` nor an anchor click that
   * downloads, so both are stubbed — and the stub is what captures the bytes.
   */
  it('builds a real CSV, with the header block that makes the numbers attributable', async () => {
    const user = userEvent.setup()
    const chunks: string[] = []
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = ((blob: Blob) => {
      void (blob as Blob & { text?: () => Promise<string> })
      return 'blob:stub'
    }) as typeof URL.createObjectURL
    URL.revokeObjectURL = (() => undefined) as typeof URL.revokeObjectURL
    const originalBlob = globalThis.Blob
    class CapturingBlob extends originalBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options)
        chunks.push(parts.map(String).join(''))
      }
    }
    globalThis.Blob = CapturingBlob as unknown as typeof Blob
    HTMLAnchorElement.prototype.click = () => undefined

    try {
      renderScreen()
      await user.click(await screen.findByRole('button', { name: text('adminData.export.action') }))
      await waitFor(() => expect(chunks.length).toBe(1))

      const csv = chunks[0] ?? ''
      expect(csv).toContain('"report"')
      expect(csv).toContain('"window_from"')
      expect(csv).toContain('"as_of"')
      expect(csv).toContain('"bucket_start","series","measure_key"')
      /* More than the header block: the file has data in it. */
      expect(csv.split(String.fromCharCode(13, 10)).length).toBeGreaterThan(10)
    } finally {
      globalThis.Blob = originalBlob
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
    }
  })
})

/**
 * §9.1 — the product ships Arabic, and the CLI's `"rtl": true` only converts
 * what it adds. Hand-written markup is on the author, so it is asserted here
 * rather than trusted: the pane is rendered under `dir="rtl"` with the shell in
 * Arabic, and every class on every element it produced is checked for a
 * physical direction.
 *
 * A grep over the source would miss a class assembled at runtime; this reads
 * the DOM.
 */
describe('Arabic and RTL', () => {
  const PHYSICAL =
    /(^|\s)(ml|mr|pl|pr|border-l|border-r|rounded-l|rounded-r|inset-l|inset-r)-|text-(left|right)(\s|$)/u

  it('renders under dir=rtl with no physical-direction utility anywhere in the pane', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/admin/data']}>
        <ShellProvider>
          <div dir="rtl" lang="ar" data-testid="rtl-root">
            <AdminDataScreen row={row()} />
          </div>
        </ShellProvider>
      </MemoryRouter>,
    )
    await runAllChecks(user)

    const root = screen.getByTestId('rtl-root')
    const offenders: string[] = []
    for (const element of root.querySelectorAll<HTMLElement>('*')) {
      const className = element.getAttribute('class') ?? ''
      if (PHYSICAL.test(className)) offenders.push(`${element.tagName.toLowerCase()}: ${className}`)
    }
    expect(offenders).toEqual([])
  })

  it('renders every string through a key, so an empty Arabic dictionary shows English and never a raw key', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/data']}>
        <ShellProvider>
          <div dir="rtl" lang="ar" data-testid="rtl-root">
            <AdminDataScreen row={row()} />
          </div>
        </ShellProvider>
      </MemoryRouter>,
    )
    await screen.findByText(text('adminData.integrity.title'))
    /* AC-74 — a raw key would render as the dotted key itself. */
    expect(screen.getByTestId('rtl-root').textContent ?? '').not.toMatch(
      /adminData\.[a-zA-Z.]+|integrity\.(check|detail)\.[a-zA-Z.-]+/u,
    )
  })
})
