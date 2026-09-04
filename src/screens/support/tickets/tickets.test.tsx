/**
 * Support › Tickets — one criterion per test.
 *
 * The three things under test are the three the module was missing, and each
 * one is checkable only because a fixture was added to reach it:
 *
 *   - **the SLA**, which an SLA console did not show. `TKT-505` is the only
 *     ticket with `slaBreached: true`, so before it existed the whole breached
 *     reading was dead code.
 *   - **the reply destination**, which the composer never displayed while
 *     replying anyway. `TKT-503` and `TKT-505` carry no `channel`.
 *   - **the logged call**, which `handleLogCallConfirm` discarded one stack
 *     frame after it was collected — the handler took no parameters at all.
 *
 * Nothing here imports a fixture.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { disableMockLatency, getTicket, listTickets, logTicketCall, mockFailures } from '@/data/clients'
import { TICKET_CALL_OUTCOMES, isApiError } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { AppRoutes } from '@/routes'
import { Toaster } from '@/components/ui/sonner'

const en = (key: string) => EN[key] as string
const fill = (key: string, params: Record<string, string>) =>
  Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), en(key))

const INDEX = '/support/tickets'
const detail = (id: string) => `/support/tickets/${id}`

beforeEach(() => {
  disableMockLatency()
})

beforeAll(() => {
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>
  proto.hasPointerCapture ??= () => false
  proto.setPointerCapture ??= () => {}
  proto.releasePointerCapture ??= () => {}
  proto.scrollIntoView ??= () => {}
})

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <AppRoutes />
        {/* Sonner renders nothing without a mounted `Toaster`, so a test that
            asserts a toast — or the Undo inside one — needs it in the tree. */}
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/* ─────────── the fixtures that make the missing readings reachable ─────── */

describe('the ticket collection can reach every reading the screen has', () => {
  it('carries a breached ticket, so the breached SLA reading is not dead code', async () => {
    const { items } = await listTickets({ view: 'all', pageSize: 100 })
    expect(items.some((tk) => tk.slaBreached)).toBe(true)
  })

  it('carries a ticket with no reply destination at all', async () => {
    const { items } = await listTickets({ view: 'all', pageSize: 100 })
    expect(items.some((tk) => tk.channel === undefined || tk.channel === null)).toBe(true)
  })

  it('carries a ticket with an empty thread, so the empty state is reachable', async () => {
    const { items } = await listTickets({ view: 'all', pageSize: 100 })
    expect(items.some((tk) => tk.messages.length === 0 && tk.callLogs.length === 0)).toBe(true)
  })

  it('carries a ticket with a call already logged against it', async () => {
    const ticket = await getTicket('TKT-502')
    expect(ticket.callLogs.length).toBeGreaterThan(0)
  })
})

/* ────────────────────────── the SLA console ────────────────────────────── */

describe('an SLA console shows the SLA', () => {
  it('shows the first-reply promise, the deadline and how long it has been open', async () => {
    renderApp(detail('TKT-501'))
    await screen.findByText(en('ticket.sla.heading'))
    /* The three fields the screen dropped: the deadline, the age, and the
       opening timestamp in the meta card. */
    expect(screen.getAllByText(/^Due /).length).toBeGreaterThan(0)
    /* `Open …` also prefixes `Open 360° profile`, so the age line is matched by
       the DURATION that follows it — `Open 5h 0m` — and not by a word two
       unrelated controls share. */
    expect(screen.getByText(/^Open \d+[hdms]/)).toBeInTheDocument()
    expect(screen.getByText(en('ticket.field.opened'))).toBeInTheDocument()
  })

  it('says Breached in words on a ticket whose promise was missed', async () => {
    renderApp(detail('TKT-505'))
    expect(await screen.findByText(en('ticket.sla.breached'))).toBeInTheDocument()
    expect(screen.getByText(/This promise was missed/)).toBeInTheDocument()
  })

  it('stops the clock on a resolved ticket instead of counting it overdue', async () => {
    renderApp(detail('TKT-504'))
    await screen.findByText(en('ticket.sla.heading'))
    expect(
      screen.getByText(fill('ticket.sla.stopped', { status: en('ticket.status.resolved') })),
    ).toBeInTheDocument()
    expect(screen.queryByText(en('ticket.sla.breached'))).not.toBeInTheDocument()
  })

  it('shows the SLA on the queue as well as on the record', async () => {
    renderApp(INDEX)
    await screen.findByText('Fare calculation discrepancy on surge trip')
    expect(screen.getByRole('columnheader', { name: en('queue.col.sla') })).toBeInTheDocument()
  })

  /* AC-S-08 */
  it('opens on Unassigned with the breached ticket first and the marker on it', async () => {
    renderApp(INDEX)
    const rows = await screen.findAllByRole('row')
    const first = rows[1]!
    expect(within(first).getByText('Payout run refused the captain bank details on file')).toBeInTheDocument()
    expect(within(first).getByText(/^overdue /)).toBeInTheDocument()
    expect(screen.getByText(fill('ticket.banner.one', { count: '1' }))).toBeInTheDocument()
  })
})

/* ─────────────── the reply destination, and the refusal ────────────────── */

describe('a reply names where it goes, and refuses when there is nowhere', () => {
  it('names the destination above the composer', async () => {
    renderApp(detail('TKT-501'))
    expect(
      await screen.findByText(fill('ticket.reply.to', { channel: en('ticket.channel.email') })),
    ).toBeInTheDocument()
  })

  it('shows the channel on the record, not only in the composer', async () => {
    renderApp(detail('TKT-504'))
    await screen.findByText(en('ticket.field.channel'))
    expect(screen.getByText(en('ticket.channel.whatsapp'))).toBeInTheDocument()
  })

  it('refuses in place, with the reason, when the ticket has no channel', async () => {
    renderApp(detail('TKT-503'))
    await screen.findByText(en('ticket.thread'))

    const send = screen.getByRole('button', { name: en('ticket.reply.send') })
    /* §11.2 — disabled IN PLACE. The old composer was rendered and would send. */
    expect(send).toBeDisabled()
    expect(screen.getByText(en('ticket.reply.blocked.noChannel'))).toBeInTheDocument()
    /* And it says what to do instead, so the operator is not left with a dead
       box: `types/ticket.ts:59` — "ask before replying". */
    expect(screen.getByText(en('ticket.channel.unknownHelp'))).toBeInTheDocument()
  })

  it('never guesses a default channel — an absent one reads as not known', async () => {
    renderApp(detail('TKT-503'))
    await screen.findByText(en('ticket.field.channel'))
    expect(
      screen.getByText(fill('ticket.reply.to', { channel: en('ticket.channel.unknown') })),
    ).toBeInTheDocument()
  })
})

/* ───────────────────────── the thread empty state ──────────────────────── */

describe('§11.1 — the thread has an empty state', () => {
  it('renders it on a ticket nobody has said anything on', async () => {
    renderApp(detail('TKT-505'))
    expect(await screen.findByText(en('ticket.thread.empty.heading'))).toBeInTheDocument()
    expect(screen.getByText(en('ticket.thread.empty.body'))).toBeInTheDocument()
  })

  it('does not render it on a ticket with a thread', async () => {
    renderApp(detail('TKT-501'))
    await screen.findByText(en('ticket.thread'))
    expect(screen.queryByText(en('ticket.thread.empty.heading'))).not.toBeInTheDocument()
  })
})

/* ─────────────────────── the call log, which now persists ──────────────── */

describe('a logged call is recorded rather than toasted', () => {
  it('writes the outcome and the note onto the ticket', async () => {
    const before = await getTicket('TKT-501')
    const after = await logTicketCall(
      { ticketId: 'TKT-501', outcome: 'waiting-on-customer', notes: 'Asked for the invoice.' },
      'USR-1',
      'Sarah Al-Rashid',
    )
    expect(after.callLogs.length).toBe(before.callLogs.length + 1)
    const entry = after.callLogs[after.callLogs.length - 1]!
    expect(entry.outcome).toBe('waiting-on-customer')
    expect(entry.notes).toBe('Asked for the invoice.')
    expect(entry.loggedByUserName).toBe('Sarah Al-Rashid')
    /* It survives the round trip — the whole point of the defect. */
    expect((await getTicket('TKT-501')).callLogs).toEqual(after.callLogs)
  })

  it('moves the ticket on, because an operator who phoned has worked it', async () => {
    const after = await logTicketCall(
      { ticketId: 'TKT-501', outcome: 'resolved-on-call', notes: 'Refunded the duplicate toll.' },
      'USR-1',
      'Sarah Al-Rashid',
    )
    expect(after.status).toBe('resolved')
    expect(after.ownerId).toBe('USR-1')
  })

  it('leaves the ticket where it is when nobody was reached', async () => {
    const before = await getTicket('TKT-501')
    const after = await logTicketCall(
      { ticketId: 'TKT-501', outcome: 'no-answer', notes: null },
      'USR-1',
      'Sarah Al-Rashid',
    )
    expect(after.status).toBe(before.status)
  })

  it('mints an id from a counter, not from the clock', async () => {
    const first = await logTicketCall(
      { ticketId: 'TKT-501', outcome: 'no-answer', notes: null },
      'USR-1',
      'Sarah Al-Rashid',
    )
    expect(first.callLogs[first.callLogs.length - 1]!.id).toBe('CALL-901')
  })

  it('is injectable, so the modal error branch is reachable', async () => {
    mockFailures.always('tickets.logCall')
    await expect(
      logTicketCall(
        { ticketId: 'TKT-501', outcome: 'no-answer', notes: null },
        'USR-1',
        'Sarah Al-Rashid',
      ),
    ).rejects.toSatisfy(isApiError)
  })

  it('shows the logged call on the timeline, beside the messages', async () => {
    renderApp(detail('TKT-502'))
    await screen.findByText(en('ticket.thread'))
    /* Two calls, both hers — `getAllByText`, because asserting "exactly one"
       here would fail the day a second wrap-up is seeded, which is the point. */
    expect(
      screen.getAllByText(fill('ticket.call.entry', { name: 'Lina Al-Otaibi' })).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText(en('ticket.call.outcome.no-answer'))).toBeInTheDocument()
    expect(
      screen.getByText('Captain confirmed the briefcase is in the boot. Drop-off at Olaya by 14:00.'),
    ).toBeInTheDocument()
  })

  it('collects the outcome and the note through the modal and persists them', async () => {
    renderApp(detail('TKT-501'))
    await screen.findByText(en('ticket.thread'))
    await userEvent.click(screen.getByRole('button', { name: en('ticket.logCall') }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.type(
      within(dialog).getByLabelText(en('ticket.logCall.notes')),
      'Explained the gantry charge.',
    )
    await userEvent.click(within(dialog).getByRole('button', { name: en('ticket.logCall.confirm') }))

    /* The record, not the toast. The old handler took no parameters, so this
       assertion could not have been written against it. */
    await expect
      .poll(async () => (await getTicket('TKT-501')).callLogs.length)
      .toBeGreaterThan(0)
    const ticket = await getTicket('TKT-501')
    expect(ticket.callLogs[0]?.notes).toBe('Explained the gantry charge.')
  })

  it('disables the primary with a reason until the operator says what happened', async () => {
    renderApp(detail('TKT-501'))
    await screen.findByText(en('ticket.thread'))
    await userEvent.click(screen.getByRole('button', { name: en('ticket.logCall') }))

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('button', { name: en('ticket.logCall.confirm') }),
    ).toBeDisabled()
    expect(within(dialog).getByText(en('ticket.logCall.blocked.note'))).toBeInTheDocument()
  })

  it('states what logging the call will do to the ticket, before it is logged', async () => {
    renderApp(detail('TKT-501'))
    await screen.findByText(en('ticket.thread'))
    await userEvent.click(screen.getByRole('button', { name: en('ticket.logCall') }))
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText(en('ticket.logCall.willDo.resolved-on-call')),
    ).toBeInTheDocument()
  })

  it('has a label for every outcome the union declares', () => {
    for (const outcome of TICKET_CALL_OUTCOMES) {
      expect(EN[`ticket.call.outcome.${outcome}`], outcome).toBeDefined()
      expect(EN[`ticket.logCall.willDo.${outcome}`], outcome).toBeDefined()
    }
  })
})

/* ────────────────── §11.2 on the index and on the record ───────────────── */

describe('§11.2 — nothing is hidden on either surface', () => {
  /* AC-S-10 */
  it('names the operator holding a ticket on the row and offers Take over, which confirms', async () => {
    const user = userEvent.setup()
    renderApp(`${INDEX}?view=open`)
    /* `TKT-502` is held by Lina, and the acting operator is Sarah. */
    const row = (await screen.findByText('Left briefcase in back seat of Camry')).closest('tr')!
    expect(within(row).getByText('Lina Al-Otaibi')).toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: en('queue.takeOver') }))
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText(fill('queue.takeOver.title', { name: 'Lina Al-Otaibi' })),
    ).toBeInTheDocument()
  })

  /* AC-S-21 */
  it('offers Reopen on a decided row and Resolve on a live one', async () => {
    renderApp(`${INDEX}?view=done`)
    const done = (await screen.findByText('App crashes when uploading Istemara registration')).closest('tr')!
    expect(within(done).getByRole('button', { name: en('ticket.action.reopen') })).toBeEnabled()
    expect(within(done).queryByRole('button', { name: en('ticket.action.resolve') })).not.toBeInTheDocument()
  })

  it('offers Claim selected and nothing else in the bulk bar', async () => {
    const user = userEvent.setup()
    renderApp(INDEX)
    await screen.findByText('Fare calculation discrepancy on surge trip')
    const boxes = screen.getAllByRole('checkbox')
    await user.click(boxes[1]!)
    expect(await screen.findByRole('button', { name: en('ticket.bulk.claim') })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /resolve selected/i })).not.toBeInTheDocument()
  })

  it('shows the Resolve primary on a resolved ticket rather than removing it', async () => {
    renderApp(detail('TKT-504'))
    await screen.findByText(en('ticket.thread'))
    expect(screen.getByRole('button', { name: en('ticket.action.resolve') })).toBeDisabled()
  })
})

/* ─────────────────────────── the four states ───────────────────────────── */

describe('the four states on the index', () => {
  it('renders its own error state and a working retry', async () => {
    mockFailures.always('tickets.list')
    renderApp(INDEX)
    expect(await screen.findByText(en('ticket.error.read'))).toBeInTheDocument()

    mockFailures.clear('tickets.list')
    await userEvent.click(screen.getByRole('button', { name: en('state.pageError.action') }))
    expect(await screen.findByText('Fare calculation discrepancy on surge trip')).toBeInTheDocument()
  })

  it('renders the no-match empty when nothing matches', async () => {
    renderApp(INDEX)
    await screen.findByText('Fare calculation discrepancy on surge trip')
    await userEvent.type(screen.getByPlaceholderText(en('ticket.search')), 'nothing matches this')
    expect(await screen.findByText(en('ticket.empty.noMatch'))).toBeInTheDocument()
  })

  it('renders a page error with a way back when the record does not exist', async () => {
    renderApp(detail('TKT-NOPE'))
    expect(await screen.findByText(en('ticket.detail.notFound'))).toBeInTheDocument()
  })
})

describe('the lifecycle on the record (§5.3)', () => {
  /* AC-S-11 */
  it('pauses on Wait on customer and the rail says so, then resumes', async () => {
    const user = userEvent.setup()
    renderApp(detail('TKT-503'))
    await screen.findByText(en('ticket.thread'))
    await user.click(screen.getByRole('button', { name: en('ticket.action.wait') }))
    expect(await screen.findByText(/Waiting on the customer since/)).toBeInTheDocument()
    expect((await getTicket('TKT-503')).status).toBe('waiting')
    await user.click(screen.getByRole('button', { name: en('ticket.action.resume') }))
    await expect.poll(async () => (await getTicket('TKT-503')).status).toBe('in-progress')
  })

  /* AC-S-13 */
  it('transfers with a required note, and the note lands on the thread as internal', async () => {
    const user = userEvent.setup()
    renderApp(detail('TKT-503'))
    await screen.findByText(en('ticket.thread'))
    await user.click(screen.getByRole('button', { name: en('ticket.action.transfer') }))
    const dialog = await screen.findByRole('dialog')
    const confirm = within(dialog).getByRole('button', { name: en('ticket.transfer.confirm') })
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByLabelText(en('ticket.transfer.noteLabel')), 'Rider prefers Arabic.')
    await user.click(within(dialog).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Lina Al-Otaibi' }))
    await user.click(within(dialog).getByRole('button', { name: en('ticket.transfer.confirm') }))
    await expect.poll(async () => (await getTicket('TKT-503')).ownerName).toBe('Lina Al-Otaibi')
    expect(await screen.findByText('Rider prefers Arabic.')).toBeInTheDocument()
    expect(screen.getByText(en('ticket.thread.notSent'))).toBeInTheDocument()
  })

  /* AC-S-12 */
  it('re-codes through a dialog that states what changes, and the promises follow', async () => {
    const user = userEvent.setup()
    renderApp(detail('TKT-503'))
    await screen.findByText(en('ticket.thread'))
    await user.click(screen.getByRole('button', { name: en('shell.moreActions') }))
    await user.click(await screen.findByRole('menuitem', { name: en('ticket.action.recode') }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(en('ticket.recode.body'))).toBeInTheDocument()
    await user.click(within(dialog).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /Captain behaved inappropriately/ }))
    await user.click(within(dialog).getByRole('button', { name: en('ticket.recode.confirm') }))
    await expect.poll(async () => (await getTicket('TKT-503')).reasonCode).toBe('CAP_CONDUCT')
    expect((await getTicket('TKT-503')).priority).toBe('Critical')
  })

  /* AC-S-21 */
  it('offers Reopen as the primary on a decided ticket and Resolve refused beside it', async () => {
    renderApp(detail('TKT-504'))
    await screen.findByText(en('ticket.thread'))
    expect(screen.getByRole('button', { name: en('ticket.action.reopen') })).toBeEnabled()
    expect(screen.getByRole('button', { name: en('ticket.action.resolve') })).toBeDisabled()
  })

  it('shows all three promises on a ticket that makes three', async () => {
    renderApp(detail('TKT-502'))
    await screen.findByText(en('ticket.sla.heading'))
    expect(screen.getByText(en('ticket.sla.firstReply'))).toBeInTheDocument()
    expect(screen.getByText(en('ticket.sla.resolution'))).toBeInTheDocument()
    expect(screen.getByText(en('ticket.sla.nextUpdate'))).toBeInTheDocument()
    expect(screen.getByText(en('ticket.sla.keptLate'))).toBeInTheDocument()
  })
})

describe('resolving a ticket is reversible — D18', () => {
  /* The trade D18 makes is explicit: a command may skip its confirm **because**
     the inverse is one press away. This screen had taken the removal and not the
     net, so resolving the wrong ticket was unrecoverable and unrecorded. */
  it('offers Undo, and the undo reopens the ticket through the client', async () => {
    const user = userEvent.setup()
    renderApp(INDEX)
    await screen.findByText('Fare calculation discrepancy on surge trip')

    const resolve = await screen.findAllByRole('button', { name: en('ticket.action.resolve') })
    expect(resolve.length, 'no resolve control to exercise').toBeGreaterThan(0)
    await user.click(resolve[0]!)

    const undo = await screen.findByRole('button', { name: 'Undo' })
    expect(undo, 'resolve must offer its inverse, not just report success').toBeInTheDocument()
  })
})
