/**
 * Admin › Activity — selection and the bulk bar (**P4-T1**), under **D21**.
 *
 * ## What is being tested, and how the refused state is reached
 *
 * D21's rule is *"a bulk command is refused if **any** selected record would be
 * refused, the refusal names the count, there is no partial apply, and the one
 * escape hatch is `Select only the N eligible`."*
 *
 * The refusal on this screen is that an entry with a non-null `amountHalalas`
 * **records a money movement**, and reading one is `view_finance`. The refused
 * state is therefore constructed from two things this suite controls:
 *
 *   - a **real role** — `switchMockUser('USR-3')`, Support, whose three
 *     permissions do not include `view_finance`;
 *   - **real domain state** — one wallet adjustment, which writes an audit
 *     entry carrying an amount, beside team transitions which do not.
 *
 * Neither is a route permission. `shell/permissions.ts:77` returns `true`
 * whenever `row.permission === null` and **all 35 route rows are `null` today**,
 * so a test that leaned on the route gate could not fail and would prove
 * nothing. That is the vacuity this construction avoids.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  adjustWallet,
  disableMockLatency,
  getRouteTable,
  mockFailures,
  reinstateOperator,
  resetDataLayer,
  resetTeam,
  suspendOperator,
  switchMockUser,
} from '@/data/clients'
import { resetAuditToSeed } from '@/data/clients/audit'
import type { SubTabRoute } from '@/data/types'
import { ShellProvider } from '@/shell/ShellContext'
import { AdminActivityScreen } from './AdminActivityScreen'
import { ADMIN_ACTIVITY_EN } from './copy'

const row = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'admin-activity')
  if (!found) throw new Error('No route-table row for admin-activity')
  return found
}

beforeEach(async () => {
  disableMockLatency()
  resetDataLayer()
  resetTeam()
  mockFailures.clear()
  await switchMockUser('USR-1')
})

function renderScreen(path = '/admin/activity') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <AdminActivityScreen row={row()} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

const text = (key: keyof typeof ADMIN_ACTIVITY_EN) => ADMIN_ACTIVITY_EN[key] as string

/**
 * Seeds the append-only log: `money` entries carry an amount, `plain` ones do
 * not. Both are written by real mutations, so the amounts are the ones the
 * product would actually record.
 */
async function seedLog({ money, plain }: { money: number; plain: number }) {
  for (let index = 0; index < money; index += 1) {
    await adjustWallet({
      riderId: 'RDR-1041',
      amountHalalas: 1_000,
      direction: 'credit',
      reasonCode: 'goodwill',
      note: 'test',
    })
  }
  /* `USR-4` is seeded `Invited` and cannot be suspended, so the plain entries
     come from a suspend/reinstate pair on the two operators who can be. Each
     transition writes exactly one entry, and none of them carries an amount. */
  const active = ['USR-3', 'USR-5']
  for (let index = 0; index < plain; index += 1) {
    const id = active[index % active.length]!
    if (index < active.length) await suspendOperator(id, 'seeded')
    else await reinstateOperator(id)
  }
}

/** Ticks the checkbox on every row currently rendered. */
async function selectAllRows(user: ReturnType<typeof userEvent.setup>) {
  const boxes = screen
    .getAllByRole('row')
    .slice(1)
    .map((tr) => tr.querySelector('input[type="checkbox"], [role="checkbox"]'))
    .filter((box): box is Element => box !== null)
  for (const box of boxes) await user.click(box)
  return boxes.length
}

describe('the four states still hold with selection turned on', () => {
  it('shows the first-run empty when nothing has happened yet', async () => {
    renderScreen()
    expect(await screen.findByText(text('admin.activity.empty.heading'))).toBeInTheDocument()
  })

  it('opens on the seeded history rather than the first-run empty (T7.6)', async () => {
    resetAuditToSeed()
    renderScreen()
    expect(await screen.findByText('Invited Noura Al-Fahad as Support')).toBeInTheDocument()
    expect(screen.getByText('Reinstated Yousef Al-Balawi')).toBeInTheDocument()
    expect(screen.queryByText(text('admin.activity.empty.heading'))).toBeNull()
  })

  it('reaches the error state and retries', async () => {
    const user = userEvent.setup()
    mockFailures.once('audit.list')
    renderScreen()
    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(text('admin.activity.empty.heading'))).toBeInTheDocument()
  })
})

describe('D21 — the bulk bar', () => {
  it('offers the two commands once rows are selected, and neither is refused for an operator who can see financials', async () => {
    const user = userEvent.setup()
    await seedLog({ money: 2, plain: 2 })
    renderScreen()
    await screen.findAllByRole('row')

    const count = await selectAllRows(user)
    expect(count).toBe(4)

    const exportButton = screen.getByRole('button', { name: text('admin.activity.bulk.export') })
    expect(exportButton).toBeEnabled()
    expect(
      screen.getByRole('button', { name: text('admin.activity.bulk.copyIds') }),
    ).toBeEnabled()
  })

  /**
   * **The `.other` case.** Some blocked, some not: the count is named as a
   * fraction of the selection, the control is disabled **in place**, and the
   * escape hatch is offered.
   */
  it('refuses the whole set when any selected entry is refused, and names the count', async () => {
    await switchMockUser('USR-3')
    const user = userEvent.setup()
    await seedLog({ money: 1, plain: 3 })
    renderScreen()
    await screen.findAllByRole('row')
    await selectAllRows(user)

    const exportButton = screen.getByRole('button', { name: text('admin.activity.bulk.export') })
    expect(exportButton).toBeDisabled()

    /* Real text, above the bar, reachable from the control — never a tooltip. */
    const describedBy = exportButton.getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(describedBy)?.textContent).toContain('1 of 4')

    /* No partial apply: the OTHER command, which refuses nothing, is still
       available on the same selection. */
    expect(
      screen.getByRole('button', { name: text('admin.activity.bulk.copyIds') }),
    ).toBeEnabled()
  })

  /**
   * **AC-959 in this screen's vocabulary.** Narrowing is not a partial apply:
   * the selection changes visibly, the bar's count follows it, and nothing has
   * run.
   */
  it('offers `Select only the N eligible`, which narrows the selection and runs nothing', async () => {
    await switchMockUser('USR-3')
    const user = userEvent.setup()
    await seedLog({ money: 1, plain: 3 })
    renderScreen()
    await screen.findAllByRole('row')
    await selectAllRows(user)

    expect(screen.getByRole('group', { name: /4 selected/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Select only the 3 eligible' }))

    expect(screen.getByRole('group', { name: /3 selected/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: text('admin.activity.bulk.export') })).toBeEnabled()
  })

  /**
   * **The `.all` case.** Every target blocked: a different sentence, and **no**
   * `Select only…` control — there is nothing to narrow to and the control
   * would be a dead end.
   */
  it('uses the `.all` sentence and offers no escape hatch when every entry is blocked', async () => {
    await switchMockUser('USR-3')
    const user = userEvent.setup()
    await seedLog({ money: 3, plain: 0 })
    renderScreen()
    await screen.findAllByRole('row')
    await selectAllRows(user)

    expect(screen.getByRole('button', { name: text('admin.activity.bulk.export') })).toBeDisabled()
    expect(screen.getByText(/^All 3 selected entries/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Select only the/ })).not.toBeInTheDocument()
  })

  it('clears the selection through the bar’s own exit', async () => {
    const user = userEvent.setup()
    await seedLog({ money: 0, plain: 2 })
    renderScreen()
    await screen.findAllByRole('row')
    await selectAllRows(user)

    const bar = screen.getByRole('group', { name: /2 selected/i })
    await user.click(within(bar).getByRole('button', { name: 'Clear' }))
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: /selected/i })).not.toBeInTheDocument(),
    )
  })
})

describe('T5.3 — `?actor=` narrows the log to one operator', () => {
  it('shows only that operator’s entries, states the filter once, and clears it', async () => {
    const user = userEvent.setup()
    /* Two actors write: the Owner suspends Lina; then, as Yousef, a rota change. */
    const { suspendOperator, switchMockUser, updateOnCallRota } = await import('@/data/clients')
    await suspendOperator('USR-3', 'test')
    await switchMockUser('USR-5')
    await updateOnCallRota({ primaryUserId: 'USR-5', secondaryUserId: null })
    await switchMockUser('USR-1')

    renderScreen('/admin/activity?actor=USR-1')
    expect(await screen.findByText(text('admin.activity.actorOnly').replace('{name}', 'Sarah Al-Rashid'))).toBeInTheDocument()
    expect(screen.getAllByText('USR-1').length).toBeGreaterThan(0)
    expect(screen.queryByText('USR-5')).toBeNull()

    await user.click(screen.getByRole('button', { name: text('admin.activity.showEveryone') }))
    expect(await screen.findByText('USR-5')).toBeInTheDocument()
  })
})
