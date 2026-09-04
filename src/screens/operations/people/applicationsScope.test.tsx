/**
 * **T3.1 — the applications queue lands on open work** (X7, Q-32).
 *
 * The queue used to open on all 51 applications with the decided ones first,
 * because `slaDueAt asc` puts a stopped clock at the top. One test per claim:
 * the default scope, the widened order, and the two cells a decided row leaves
 * blank instead of stating not-applicable twice (O9).
 */

import { MemoryRouter } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { ApplicationsView } from './ApplicationsView'

const t = createTranslator({ dictionary: EN })
const en = (key: string) => EN[key] as string

const DECIDED = [
  en('people.applicantStatus.approved'),
  en('people.applicantStatus.rejected'),
  en('people.applicantStatus.withdrawn'),
]

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

function mount() {
  return render(
    <MemoryRouter initialEntries={['/operations/people?view=applications']}>
      <ApplicationsView
        chrome={{
          tabs: [{ id: 'applications', label: 'Applications' }],
          activeTab: 'applications',
          onSelectTab: () => {},
          onTotal: () => {},
        }}
        t={t}
        language="en"
        canWrite
        currentUserId="USR-001"
      />
    </MemoryRouter>,
  )
}

/** The `Status` cell of every body row, in the order the queue drew them. */
async function statuses(): Promise<string[]> {
  const table = await screen.findByRole('table')
  const index = within(table)
    .getAllByRole('columnheader')
    .findIndex((th) => th.textContent?.includes(en('people.col.status')))
  expect(index, 'no Status column').toBeGreaterThan(-1)
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((tr) => tr.querySelectorAll('td')[index]?.textContent?.trim() ?? '')
}

describe('T3.1 — the queue opens on its open work', () => {
  it('puts an undecided application in the first row on load', async () => {
    mount()
    const rows = await statuses()
    expect(rows.length).toBeGreaterThan(0)
    expect(DECIDED, `first row read "${rows[0]}"`).not.toContain(rows[0])
  })

  it('shows no decided application at all until the scope is widened', async () => {
    mount()
    const rows = await statuses()
    expect(rows.filter((status) => DECIDED.includes(status))).toEqual([])
  })

  it('widens through the scope chip and puts every decided row below the open ones', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByRole('table')
    expect(screen.getByText(en('people.scope.open'))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: en('people.scope.showDecided') }))

    const rows = await screen.findByText(en('people.scope.every')).then(() => statuses())
    const decidedAt = rows.flatMap((s, i) => (DECIDED.includes(s) ? [i] : []))
    const openAt = rows.flatMap((s, i) => (DECIDED.includes(s) ? [] : [i]))
    expect(decidedAt.length, 'the widened scope shows decided rows').toBeGreaterThan(0)
    expect(openAt.length, 'and still shows the open ones').toBeGreaterThan(0)
    expect(Math.min(...decidedAt)).toBeGreaterThan(Math.max(...openAt))
  })

  it('leaves SLA and Owner blank on a decided row and states the decision once', async () => {
    /* O9 — not-applicable is blank, never a dash repeated down two columns.
       The decision badge is the row's one carrier of what happened. */
    const user = userEvent.setup()
    mount()
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: en('people.scope.showDecided') }))
    await screen.findByText(en('people.scope.every'))

    const table = await screen.findByRole('table')
    const headers = within(table).getAllByRole('columnheader')
    const at = (label: string) => headers.findIndex((th) => th.textContent?.includes(label))
    const sla = at(en('people.col.sla'))
    const owner = at(en('people.col.owner'))
    const status = at(en('people.col.status'))
    const decision = at(en('people.col.decision'))

    const decidedRow = within(table)
      .getAllByRole('row')
      .slice(1)
      .find((tr) => DECIDED.includes(tr.querySelectorAll('td')[status]?.textContent?.trim() ?? ''))
    expect(decidedRow, 'no decided row in the widened scope').toBeDefined()

    const cells = decidedRow!.querySelectorAll('td')
    expect(cells[sla]?.textContent?.trim()).toBe('')
    expect(cells[owner]?.textContent?.trim()).toBe('')
    expect(cells[decision]?.textContent?.trim()).not.toBe('')
  })

  it('prints no em dash anywhere on the default view', async () => {
    /* X14 — 50 of them on the first screen was the finding this task closes. */
    const { container } = mount()
    await screen.findByRole('table')
    expect(container.textContent).not.toContain('—')
  })
})
