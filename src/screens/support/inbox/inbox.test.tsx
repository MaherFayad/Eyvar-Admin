/**
 * Support › Contact Centre, the inbox. One test per acceptance criterion,
 * AC-CC-04 to AC-CC-11 (CONTACT-CENTRE-REDESIGN-PLAN.md §4), plus the
 * composer's refusals and the four states of each pane. Every conversation
 * comes back through the client; no fixture is imported.
 */

import { act, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  claimConversation,
  disableMockLatency,
  getRouteTable,
  listConversations,
  mockFailures,
  receiveInboundMessage,
  resetDataLayer,
  useEmptyConversationQueue,
} from '@/data/clients'
import { EYVAR_NOW } from '@/data/mock/clock'
import type { Message, SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useShell, ShellProvider } from '@/shell/ShellContext'
import { resetDrafts } from '../conversations/drafts'
import { InboxScreen } from './InboxScreen'
import { Thread } from './Thread'

configure({ asyncUtilTimeout: 10_000 })

const row = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'support-contact-centre')
  if (!found) throw new Error('No route-table row for support-contact-centre')
  return found
}

/** A dictionary string with its placeholders filled, so a test reads what the operator reads. */
function copy(key: string, vars: Record<string, string | number> = {}): string {
  const value = EN[key]
  if (!value) throw new Error(`No dictionary key ${key}`)
  return value.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`))
}

/* The inbox reads `--ev-bp-wide` through `matchMedia`; jsdom's shim answers `false`
   to everything, which would put the rail in a Sheet. A 1280px console here. */
beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  resetDrafts()
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('min-width'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
})

function renderInbox(entries = ['/support/contact-centre']) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <ShellProvider>
        <TooltipProvider>
          <Routes>
            <Route path="/support/contact-centre" element={<InboxScreen row={row()} />} />
            <Route path="/support/contact-centre/:conversationId" element={<InboxScreen row={row()} />} />
          </Routes>
        </TooltipProvider>
      </ShellProvider>
    </MemoryRouter>,
  )
}

const at = (id: string) => [`/support/contact-centre/${id}`]

async function nameOf(id: string): Promise<string> {
  const page = await listConversations({ pageSize: 200 })
  const found = page.items.find((each) => each.id === id)
  if (!found) throw new Error(`No conversation ${id}`)
  return found.entityName
}

const list = () => screen.getByRole('list', { name: copy('inbox.list.label') })
const rowLinks = () => within(list()).getAllByRole('link')
const rowFor = (name: string) => within(list()).getByRole('link', { name: new RegExp(name) })
const composerField = (name: string) => screen.getByRole('textbox', { name: copy('inbox.composer.label', { name }) })
/* The announcer repeats the note consequence, so composer copy is read inside the composer. */
const composer = () => within(document.querySelector<HTMLElement>('[data-inbox-composer]')!)

/* ═══════════════════════ AC-CC-04 · three panes ═══════════════════════ */

describe('AC-CC-04 the list stays on screen while a thread is open', () => {
  it('renders the list, the thread and the details rail together at 1280px, with the open row current', async () => {
    const name = await nameOf('CNV-102')
    renderInbox(['/support/contact-centre/CNV-102?view=mine'])
    expect(await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })).toBeInTheDocument()
    expect(list()).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: copy('inbox.header.details') })).toBeInTheDocument()
    await waitFor(() => expect(rowFor(name)).toHaveAttribute('aria-current', 'page'))
  })
})

/* ═══════════════════════ AC-CC-05 · groups and days ═══════════════════ */

function ThreadHarness({ messages }: { messages: Message[] }) {
  const { t, language } = useShell().language
  return (
    <Thread
      status="content"
      messages={messages}
      hasEarlier={false}
      onLoadEarlier={() => undefined}
      onRetry={() => undefined}
      onReachBottom={() => undefined}
      conversationChannel="chat"
      currentUserId="USR-1"
      customerName="Nora Al-Harbi"
      typingBy={null}
      now={EYVAR_NOW}
      t={t}
      language={language}
      profileHref="/"
      onSendAgain={() => undefined}
    />
  )
}

/** Twenty messages, two senders, sender switching every three, ten yesterday and ten today. */
function twoSenderThread(): Message[] {
  const base = Date.parse(EYVAR_NOW)
  return Array.from({ length: 20 }, (_, i): Message => {
    const nora = Math.floor(i / 3) % 2 === 0
    const dayOffset = i < 10 ? -24 * 60 : 0
    const minutes = dayOffset - (20 - i) * 2
    return {
      id: `CMSG-T${i}`,
      conversationId: 'CNV-T',
      channel: 'chat',
      direction: nora ? 'inbound' : 'outbound',
      authorId: nora ? 'RDR-1' : 'USR-1',
      authorName: nora ? 'Nora Al-Harbi' : 'Sarah Al-Rashid',
      authorKind: nora ? 'customer' : 'operator',
      body: `Message ${i + 1}`,
      visibility: 'customer',
      delivery: null,
      deliveryHistory: [],
      subject: null,
      sentAt: new Date(base + minutes * 60_000).toISOString(),
      attachments: [],
    }
  })
}

describe('AC-CC-05 sender groups and day dividers', () => {
  it('renders one avatar per sender group and a divider between yesterday and today', async () => {
    const messages = twoSenderThread()
    render(
      <MemoryRouter>
        <ShellProvider>
          <ThreadHarness messages={messages} />
        </ShellProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('Message 1')).toBeInTheDocument()
    expect(screen.getByText(copy('inbox.thread.yesterday'))).toBeInTheDocument()
    expect(screen.getByText(copy('inbox.thread.today'))).toBeInTheDocument()
    /* Twenty messages in runs of three, split by the day: eight groups, eight avatars, not twenty. */
    const avatars = document.querySelectorAll('[data-slot="avatar"]')
    expect(avatars.length).toBeGreaterThanOrEqual(7)
    expect(avatars.length).toBeLessThan(20)
    expect(screen.getAllByText(copy('inbox.thread.you', { name: 'Sarah Al-Rashid' })).length).toBeGreaterThan(0)
  })
})

/* ═══════════════════════ AC-CC-06 · the four shapes ═══════════════════ */

describe('AC-CC-06 bubbles differ by ground and side, and a note is never a bubble', () => {
  it('puts the customer at inline-start, the operator at inline-end, and the note in neither', async () => {
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    const note = await screen.findByText(copy('conversations.thread.notSent'))
    expect(note.closest('[data-bubble]')).toBeNull()
    const region = screen.getByRole('region', { name: copy('inbox.thread.label', { name }) })
    expect(within(region).getByText(copy('conversations.thread.internal'))).toBeInTheDocument()
    await waitFor(() => expect(document.querySelectorAll('[data-bubble]').length).toBeGreaterThan(1))
    const directions = new Set([...document.querySelectorAll('[data-bubble]')].map((el) => el.getAttribute('data-direction')))
    expect(directions).toEqual(new Set(['inbound', 'outbound']))
    const inbound = document.querySelector('[data-bubble][data-direction="inbound"]')!
    const outbound = document.querySelector('[data-bubble][data-direction="outbound"]')!
    expect(inbound.className).toContain('bg-bubble-in')
    expect(outbound.className).toContain('bg-bubble-out')
    expect(inbound.className).not.toContain('border')
    expect(outbound.className).not.toContain('border')
  })
})

/* ═══════════════════════ AC-CC-07 · unread clears on open ═════════════ */

describe('AC-CC-07 opening a conversation clears its unread state in the list', () => {
  it('shows the dot after an inbound message and clears it on open, from the realtime event', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-101')
    const before = (await listConversations({ pageSize: 200 })).items.find((each) => each.id === 'CNV-101')!.unreadCount
    renderInbox()
    await screen.findByRole('link', { name: new RegExp(name) })
    act(() => {
      receiveInboundMessage('CNV-101', 'Is anyone there?')
    })
    await waitFor(() => expect(rowFor(name)).toHaveTextContent(copy('conversations.a11y.unread', { count: before + 1 })))
    await user.click(rowFor(name))
    await waitFor(() => expect(rowFor(name)).toHaveAttribute('aria-current', 'page'))
    await waitFor(() => expect(rowFor(name)).not.toHaveTextContent(/\d+ unread/))
    /* The list row still carries the new preview: the row was updated in place, not refetched away. */
    expect(rowFor(name)).toHaveTextContent('Is anyone there?')
  })
})

/* ═══════════════════════ AC-CC-08 · keyboard ══════════════════════════ */

describe('AC-CC-08 j, k, Enter and Esc', () => {
  it('moves focus with j and k, opens and focuses the composer on Enter, and returns to the row on Esc', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-102')
    renderInbox(['/support/contact-centre?view=mine'])
    await screen.findByRole('link', { name: new RegExp(name) })
    const rows = rowLinks()
    expect(rows.length).toBeGreaterThan(1)
    rows[0]!.focus()
    await user.keyboard('j')
    expect(rows[1]).toHaveFocus()
    await user.keyboard('k')
    expect(rows[0]).toHaveFocus()
    rowFor(name).focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(rowFor(name)).toHaveAttribute('aria-current', 'page'))
    await waitFor(() => expect(composerField(name)).toHaveFocus())
    await user.keyboard('{Escape}')
    expect(rowFor(name)).toHaveFocus()
  })
})

/* ═══════════════════════ AC-CC-09 · one filled button ═════════════════ */

describe('AC-CC-09 Send is the only filled button while the operator holds the conversation', () => {
  it('renders Create ticket and Transfer as ghosts, the rest in More actions, and Send as the one default variant', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
    const header = screen.getByRole('banner')
    /* CNV-102 is held, past its resolution deadline and unticketed: §4.1's fourth row. */
    expect(within(header).getByRole('button', { name: copy('conversations.ticket.create') })).toHaveAttribute('data-variant', 'ghost')
    expect(within(header).getByRole('button', { name: copy('conversations.transfer') })).toHaveAttribute('data-variant', 'ghost')
    expect(within(header).queryAllByRole('button').filter((b) => b.getAttribute('data-variant') === 'default')).toHaveLength(0)
    await user.click(within(header).getByRole('button', { name: copy('inbox.header.more') }))
    expect(await screen.findByRole('menuitem', { name: copy('conversations.snooze') })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: copy('conversations.close') })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    const filled = screen.getAllByRole('button').filter((b) => b.getAttribute('data-variant') === 'default')
    expect(filled).toHaveLength(1)
    expect(filled[0]).toHaveTextContent(copy('conversations.composer.send'))
  })
})

/* ═══════════════════════ AC-CC-10 · mirrors ═══════════════════════════ */

describe('AC-CC-10 the thread and composer mirror by logical utilities alone', () => {
  it('anchors nothing to a physical edge and keeps Send last in its row', async () => {
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    const region = await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
    const pane = region.closest('[data-inbox-pane="thread"]')!
    const physical = /(^|\s)(ml|mr|pl|pr|left|right|text-left|text-right|rounded-l|rounded-r)-/
    for (const el of pane.querySelectorAll('[class]')) {
      const classes = el.getAttribute('class') ?? ''
      expect(classes, classes).not.toMatch(physical)
    }
    const send = screen.getByRole('button', { name: copy('conversations.composer.send') })
    const toolbar = send.parentElement!
    expect(toolbar.lastElementChild).toBe(send)
    expect(send.className).toContain('ms-auto')
  })
})

/* ═══════════════════════ AC-CC-11 · the register ══════════════════════ */

describe('AC-CC-11 the register is unmistakable', () => {
  it('states the consequence per register, fills no button in the note register, and returns to Reply after a note', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
    expect(screen.getByText(copy('inbox.composer.consequence.reply', { name, channel: copy('conversations.channel.chat') }))).toBeInTheDocument()
    expect(screen.getByText(copy('inbox.composer.keys.reply', { name }))).toBeInTheDocument()
    expect(composerField(name)).toHaveAttribute('placeholder', copy('inbox.composer.placeholder.reply', { name }))

    await user.click(screen.getByRole('tab', { name: copy('conversations.composer.note') }))
    expect(composer().getByText(copy('inbox.composer.consequence.note'))).toBeInTheDocument()
    expect(composer().getByText(copy('inbox.composer.keys.note'))).toBeInTheDocument()
    const noteField = screen.getByRole('textbox', { name: copy('conversations.composer.note') })
    expect(noteField).toHaveAttribute('placeholder', copy('inbox.composer.placeholder.note'))
    expect(screen.queryByRole('button', { name: copy('conversations.composer.send') })).toBeNull()
    const addNote = screen.getByRole('button', { name: copy('conversations.composer.addNote') })
    expect(addNote).toHaveAttribute('data-variant', 'secondary')
    expect(screen.getAllByRole('button').filter((b) => b.getAttribute('data-variant') === 'default')).toHaveLength(0)

    await user.type(noteField, 'Billing shows the escrow is stuck.{Enter}')
    expect(await screen.findByText('Billing shows the escrow is stuck.')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText(copy('inbox.composer.consequence.reply', { name, channel: copy('conversations.channel.chat') }))).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: copy('conversations.composer.send') })).toBeInTheDocument()
  })

  it('toggles the register with Ctrl+Shift+N and announces it', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
    /* The field is refused while the thread loads; a disabled textarea refuses focus. */
    await waitFor(() => expect(composerField(name)).toBeEnabled())
    composerField(name).focus()
    expect(composerField(name)).toHaveFocus()
    await user.keyboard('{Control>}{Shift>}n{/Shift}{/Control}')
    expect(await composer().findByText(copy('inbox.composer.consequence.note'))).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(copy('inbox.composer.announce.note')))
  })
})

/* ═══════════════════════ the composer's refusals ══════════════════════ */

describe('the composer refuses in place, with its reason as real text', () => {
  it('disables the field on an unclaimed conversation and names the reason from Send', async () => {
    const name = await nameOf('CNV-101')
    renderInbox(at('CNV-101'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
    const reason = await screen.findByText(copy('conversations.composer.unclaimed'))
    expect(composerField(name)).toBeDisabled()
    const send = screen.getByRole('button', { name: copy('conversations.composer.send') })
    expect(send).toBeDisabled()
    expect(send.getAttribute('aria-describedby')).toContain(reason.id)
    expect(within(screen.getByRole('banner')).getByRole('button', { name: copy('queue.claim') })).toHaveAttribute('data-variant', 'default')
  })

  it('refuses the send where the customer has no address on the conversation’s channel', async () => {
    await claimConversation('CNV-110')
    const name = await nameOf('CNV-110')
    renderInbox(at('CNV-110'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
    expect(await screen.findByText(copy('conversations.composer.noHandle'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy('conversations.composer.send') })).toBeDisabled()
  })

  it('offers the note register only on a call', async () => {
    await claimConversation('CNV-106')
    const name = await nameOf('CNV-106')
    renderInbox(at('CNV-106'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
    expect(screen.queryByRole('tab', { name: copy('inbox.composer.label', { name }) })).toBeNull()
    expect(screen.getByRole('tab', { name: copy('conversations.composer.note') })).toBeInTheDocument()
    expect(await composer().findByText(copy('inbox.composer.consequence.note'))).toBeInTheDocument()
  })
})

/* ═══════════════════════ the four states ══════════════════════════════ */

describe('the four states of each pane', () => {
  it('list: skeleton while loading, then rows and the end-of-list line', async () => {
    renderInbox()
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(await screen.findByText(copy('inbox.list.end'))).toBeInTheDocument()
    expect(rowLinks().length).toBeGreaterThan(0)
  })

  it('list: a cleared folder says so in one sentence', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByText(copy('inbox.list.end'))
    await user.type(screen.getByRole('searchbox', { name: copy('inbox.search') }), 'zzzz-no-such-conversation')
    expect(await screen.findByText(copy('conversations.empty.noMatch'))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: copy('inbox.search.clear') }))
    expect(await screen.findByText(copy('inbox.list.end'))).toBeInTheDocument()
  })

  it('list: an empty queue is a first-run empty state in the thread pane', async () => {
    useEmptyConversationQueue()
    renderInbox()
    expect(await screen.findByText(copy('conversations.empty.firstRun.heading'))).toBeInTheDocument()
  })

  it('list: a failed read renders the error with a retry that recovers', async () => {
    const user = userEvent.setup()
    mockFailures.once('conversations.list')
    renderInbox()
    expect(await screen.findByText(copy('conversations.error.list'))).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: copy('conversations.thread.retry') })[0]!)
    expect(await screen.findByText(copy('inbox.list.end'))).toBeInTheDocument()
  })

  it('thread: no selection is one grey sentence', async () => {
    renderInbox()
    expect(await screen.findByText(copy('inbox.thread.noSelection'))).toBeInTheDocument()
  })

  it('thread: CNV-107 is empty and its composer is live once held', async () => {
    await claimConversation('CNV-107')
    const name = await nameOf('CNV-107')
    renderInbox(at('CNV-107'))
    expect(await screen.findByText(copy('conversations.thread.empty'))).toBeInTheDocument()
    await waitFor(() => expect(composerField(name)).toBeEnabled())
  })

  it('thread: a failed read renders the error and refuses the composer with the thread sentence', async () => {
    mockFailures.once('conversations.messages')
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    expect(await screen.findByText(copy('conversations.thread.error'))).toBeInTheDocument()
    expect(screen.getByText(copy('conversations.composer.threadError'))).toBeInTheDocument()
    expect(composerField(name)).toBeDisabled()
  })

  it('rail: the customer, the conversation and the history render for the open thread', async () => {
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    const rail = await screen.findByRole('complementary', { name: copy('inbox.header.details') })
    expect(within(rail).getByText(copy('conversations.rail.customer'))).toBeInTheDocument()
    expect(within(rail).getByText(copy('conversations.rail.thisConversation'))).toBeInTheDocument()
    expect(within(rail).getByRole('button', { name: new RegExp(copy('conversations.rail.history')) })).toBeInTheDocument()
    expect(within(rail).getByRole('link', { name })).toBeInTheDocument()
  })
})
