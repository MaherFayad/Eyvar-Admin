/**
 * Support › Contact Centre, the inbox. One test per acceptance criterion,
 * AC-CC-04 to AC-CC-11 (CONTACT-CENTRE-REDESIGN-PLAN.md §4), the composer's
 * refusals, the four states of each pane, and the Phase C parity cases the
 * console's own suite established (plan §5). Every conversation comes back
 * through the client; no fixture is imported.
 */

import { act, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  advanceRealtime,
  claimConversation,
  disableMockLatency,
  getConversation,
  getRouteTable,
  getTicket,
  listConversations,
  mockFailures,
  receiveInboundMessage,
  reopenConversation,
  resetDataLayer,
  switchMockUser,
  transferConversation,
  useEmptyConversationQueue,
} from '@/data/clients'
import { EYVAR_NOW } from '@/data/mock/clock'
import type { Conversation, Message, SubTabRoute } from '@/data/types'
import { formatCount } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useShell, ShellProvider } from '@/shell/ShellContext'
import { resetDrafts } from './drafts'
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
/** A sentence as a whole-string regex, for matchers that take one. */
const literal = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

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
    /* Twenty messages in runs of three, the fourth run split by the day: eight
       groups, so eight name lines (four each), not twenty. The name line is the
       one header an operator reads per group; the avatar beside it is decorative. */
    expect(screen.getAllByText('Nora Al-Harbi')).toHaveLength(4)
    expect(screen.getAllByText(copy('inbox.thread.you', { name: 'Sarah Al-Rashid' }))).toHaveLength(4)
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
  it('renders Create ticket as a ghost, the other three in More actions, and Send as the one default variant', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
    const header = screen.getByRole('banner')
    /* CNV-102 is held, past its resolution deadline and unticketed: §4.1's fourth row (D8-b). */
    expect(within(header).getByRole('button', { name: copy('conversations.ticket.create') })).toHaveAttribute('data-variant', 'ghost')
    expect(within(header).queryByRole('button', { name: copy('conversations.transfer') })).toBeNull()
    expect(within(header).queryAllByRole('button').filter((b) => b.getAttribute('data-variant') === 'default')).toHaveLength(0)
    await user.click(within(header).getByRole('button', { name: copy('inbox.header.more') }))
    expect(await screen.findByRole('menuitem', { name: copy('conversations.transfer') })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: copy('conversations.snooze') })).toBeInTheDocument()
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
    /* The toolbar is two controls: `Insert template` at the start, `Send` at the end. */
    expect(toolbar.children).toHaveLength(2)
    expect(toolbar.firstElementChild).toHaveAccessibleName(copy('ticket.template.insert'))
    expect(toolbar.lastElementChild).toBe(send)
    expect(send.className).toContain('ms-auto')
  })
})

/* ═══════════════════════ AC-CC-11 · the register ══════════════════════ */

describe('AC-CC-11 the register is unmistakable', () => {
  it('names the register in the tab, the placeholder and the button, fills no button in the note register, and returns to Reply after a note', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
    /* The placeholder is blank while the thread loads (§5), so the field must be live first. */
    await waitFor(() => expect(composerField(name)).toBeEnabled())
    expect(screen.getByRole('tab', { name: copy('inbox.composer.label', { name }) })).toHaveAttribute('aria-selected', 'true')
    expect(composerField(name)).toHaveAttribute('placeholder', copy('inbox.composer.placeholder.reply', { name }))

    await user.click(screen.getByRole('tab', { name: copy('conversations.composer.note') }))
    const noteField = screen.getByRole('textbox', { name: copy('conversations.composer.note') })
    expect(screen.getByRole('tab', { name: copy('conversations.composer.note') })).toHaveAttribute('aria-selected', 'true')
    expect(noteField).toHaveAttribute('placeholder', copy('inbox.composer.placeholder.note'))
    expect(screen.queryByRole('button', { name: copy('conversations.composer.send') })).toBeNull()
    const addNote = screen.getByRole('button', { name: copy('conversations.composer.addNote') })
    expect(addNote).toHaveAttribute('data-variant', 'secondary')
    expect(screen.getAllByRole('button').filter((b) => b.getAttribute('data-variant') === 'default')).toHaveLength(0)

    await user.type(noteField, 'Billing shows the escrow is stuck.{Enter}')
    expect(await screen.findByText('Billing shows the escrow is stuck.')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: copy('inbox.composer.label', { name }) })).toHaveAttribute('aria-selected', 'true'),
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
    await screen.findByRole('textbox', { name: copy('conversations.composer.note') })
    expect(screen.getByRole('tab', { name: copy('conversations.composer.note') })).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(copy('inbox.composer.announce.note')))
    /* The same chord toggles back, and the announcement names the customer. */
    await user.keyboard('{Control>}{Shift>}n{/Shift}{/Control}')
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: copy('inbox.composer.label', { name }) })).toHaveAttribute('aria-selected', 'true'),
    )
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(copy('inbox.composer.announce.reply', { name })))
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
    expect(screen.getAllByRole('tab')).toHaveLength(1)
    expect(screen.getByRole('textbox', { name: copy('conversations.composer.note') })).toBeInTheDocument()
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

/* ═══════════════════════ Phase C · parity with the console ═══════════════════ */
/* Plan §5: what `ConversationPane` and `ConversationConsoleScreen` did, redone
   against the inbox. Where the inbox deliberately differs (the list never
   leaves the screen; the header, not the row, carries the claim) the assertion
   follows design 12, and the QA verdict lists the change. */

const header = () => screen.getByRole('banner')
const headerButton = (label: string) => within(header()).getByRole('button', { name: label })
const rail = () => screen.getByRole('complementary', { name: copy('inbox.header.details') })
const thread = (name: string) => within(screen.getByRole('region', { name: copy('inbox.thread.label', { name }) }))
const openThread = async (name: string) =>
  within(await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) }))
const listPane = () => within(screen.getByRole('region', { name: copy('inbox.list.label') }))
const folders = () => within(screen.getByRole('navigation', { name: copy('inbox.folders.label') }))

async function byId(id: string): Promise<Conversation> {
  const page = await listConversations({ pageSize: 200 })
  const found = page.items.find((each) => each.id === id)
  if (!found) throw new Error(`No conversation ${id}`)
  return found
}

/** The thread has landed and the composer is live: the only state a reply can be typed in. */
async function liveComposer(name: string): Promise<HTMLElement> {
  await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
  await waitFor(() => expect(composerField(name)).toBeEnabled())
  return composerField(name)
}

/** A header action, wherever §4.1's table put it: as a visible button or inside `More actions`. */
async function trigger(user: ReturnType<typeof userEvent.setup>, label: string) {
  const visible = within(header()).queryByRole('button', { name: label })
  if (visible !== null) {
    await user.click(visible)
    return
  }
  await user.click(headerButton(copy('inbox.header.more')))
  await user.click(await screen.findByRole('menuitem', { name: label }))
}

describe('Phase C · claim, take over and release', () => {
  /** AC-939: one press, no dialog, reversible (D18). */
  it('claims from the header without a confirmation, and the composer goes live', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-101')
    renderInbox(at('CNV-101'))
    await screen.findByText(copy('conversations.composer.unclaimed'))
    await user.click(headerButton(copy('queue.claim')))
    expect(screen.queryByRole('dialog')).toBeNull()
    await liveComposer(name)
    expect(within(header()).queryByRole('button', { name: copy('queue.claim') })).toBeNull()
    expect(within(rail()).getByRole('button', { name: copy('queue.release') })).toBeInTheDocument()
  })

  /** AC-940 / AC-203: a take-over confirms, and the dialog names the holder. */
  it('confirms a take-over and names the operator who holds it, and cancelling changes nothing', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-103') // held by Lina Al-Otaibi
    renderInbox(at('CNV-103'))
    await screen.findByText(copy('conversations.composer.heldBy', { name: 'Lina Al-Otaibi' }))
    await user.click(headerButton(copy('queue.takeOver')))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getAllByText(/Lina Al-Otaibi/).length).toBeGreaterThan(0)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(composerField(name)).toBeDisabled()
    expect(headerButton(copy('queue.takeOver'))).toBeInTheDocument()
  })

  /** Design 12 §7: `c` claims the selected conversation from anywhere outside a field. */
  it('claims the selected conversation on c', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-101')
    renderInbox(at('CNV-101'))
    await screen.findByText(copy('conversations.composer.unclaimed'))
    await waitFor(() => rowFor(name).focus())
    await user.keyboard('c')
    await liveComposer(name)
  })

  it('releases from the rail, and the composer is refused again', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    await liveComposer(name)
    await user.click(within(rail()).getByRole('button', { name: copy('queue.release') }))
    expect(await screen.findByText(copy('conversations.composer.unclaimed'))).toBeInTheDocument()
    expect(headerButton(copy('queue.claim'))).toBeInTheDocument()
  })
})

describe('Phase C · sending', () => {
  /** §8.6.3 / §8.6.4 / R10: no dialog, no toast, the bubble is the confirmation. */
  it('sends without a confirmation or a toast, and clears the field', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    const field = await liveComposer(name)
    await user.type(field, 'Raising this with billing now.')
    await user.click(screen.getByRole('button', { name: copy('conversations.composer.send') }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await thread(name).findByText('Raising this with billing now.')).toBeInTheDocument()
    await waitFor(() => expect(composerField(name)).toHaveValue(''))
    expect(screen.queryByText(copy('queue.toast.claimed'))).toBeNull()
  })

  /** §8.6.3: an empty field disables `Send` and renders no reason, so the field carries no description at all. */
  it('disables Send on an empty field without explaining why', async () => {
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    const field = await liveComposer(name)
    expect(screen.getByRole('button', { name: copy('conversations.composer.send') })).toBeDisabled()
    expect(field).toHaveAccessibleDescription('')
    for (const key of ['unclaimed', 'closed', 'noHandle', 'threadError']) {
      expect(screen.queryByText(copy(`conversations.composer.${key}`))).toBeNull()
    }
  })

  /** SUPPORT-UX-PLAN §7.3: a template lands in the field and nothing is sent. */
  it('inserts a template without sending', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    const field = await liveComposer(name)
    const before = (await getConversation('CNV-102')).messages.length
    await user.click(screen.getByRole('button', { name: copy('ticket.template.insert') }))
    await user.click(await screen.findByRole('menuitem', { name: /Acknowledge and hold/ }))
    expect((field as HTMLTextAreaElement).value).toContain('I have this in front of me now')
    expect((await getConversation('CNV-102')).messages.length).toBe(before)
  })

  /** §8.7: the customer's typing is one muted line above the composer. */
  it('shows that the customer is typing once they have read the reply', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    const field = await liveComposer(name)
    await user.type(field, 'Checking now.{Enter}')
    await thread(name).findByText('Checking now.')
    /* sent → delivered → read → typing are scripted on the socket; the thread's own tick drains them too. */
    act(() => {
      advanceRealtime(4)
    })
    expect(await screen.findByText(copy('conversations.typing', { name }))).toBeInTheDocument()
  })
})

describe('Phase C · the refusal sentence per state', () => {
  it('names the holder on a conversation another operator holds', async () => {
    const name = await nameOf('CNV-103')
    renderInbox(at('CNV-103'))
    const reason = await screen.findByText(copy('conversations.composer.heldBy', { name: 'Lina Al-Otaibi' }))
    expect(composerField(name)).toBeDisabled()
    const send = screen.getByRole('button', { name: copy('conversations.composer.send') })
    expect(send).toBeDisabled()
    expect(send.getAttribute('aria-describedby')).toContain(reason.id)
  })

  it('refuses a closed conversation, and Reopen is the header primary', async () => {
    const name = await nameOf('CNV-114')
    renderInbox(at('CNV-114'))
    await openThread(name)
    const send = await screen.findByRole('button', { name: copy('conversations.composer.send') })
    await waitFor(() => expect(send).toHaveAccessibleDescription(literal(copy('conversations.composer.closed'))))
    expect(composerField(name)).toBeDisabled()
    expect(headerButton(copy('conversations.reopen'))).toHaveAttribute('data-variant', 'default')
  })

  /** §8.6.3 / D19: WhatsApp has no composer at all, and one sentence in its place. */
  it('renders no composer on a WhatsApp conversation', async () => {
    const name = await nameOf('CNV-105')
    renderInbox(at('CNV-105'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
    expect(await screen.findByText(copy('conversations.composer.whatsapp'))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy('conversations.composer.send') })).toBeNull()
    expect(screen.queryByRole('button', { name: copy('conversations.composer.addNote') })).toBeNull()
    expect(screen.queryByRole('textbox', { name: copy('inbox.composer.label', { name }) })).toBeNull()
  })

  /** Parity with the console (`ConversationPane.tsx:491`): a held call refuses the field with the call sentence. */
  it('refuses the note field on a held call with the call sentence, and offers no Reply tab', async () => {
    await reopenConversation('CNV-106')
    await claimConversation('CNV-106')
    const name = await nameOf('CNV-106')
    renderInbox(at('CNV-106'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
    expect(await screen.findByText(copy('conversations.composer.phone'))).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: copy('conversations.composer.note') })).toBeDisabled()
    expect(screen.queryByRole('tab', { name: copy('inbox.composer.label', { name }) })).toBeNull()
  })
})

describe('Phase C · failed messages', () => {
  /** §8.6.2 (D-1): the note's not-sent line and the failure's delivery line never share a slot; D-3: never the code. */
  it('separates a note’s not-sent line from a failed message’s delivery line', async () => {
    const name = await nameOf('CNV-110')
    renderInbox(at('CNV-110'))
    const pane = await openThread(name)
    const notSent = await pane.findByText(copy('conversations.thread.notSent'))
    const failed = pane.getByText(/No email address on file for this rider/)
    expect(notSent.closest('li')).not.toBe(failed.closest('li'))
    expect(screen.queryByText(/no_handle/)).toBeNull()
  })

  /** §8.6.7: `Send again`, and the actual fix on `no_handle`. */
  it('offers Send again and Add an email address on a failed message', async () => {
    const name = await nameOf('CNV-110')
    renderInbox(at('CNV-110'))
    const pane = await openThread(name)
    expect(await pane.findByRole('button', { name: copy('conversations.thread.sendAgain') })).toBeInTheDocument()
    expect(pane.getByRole('link', { name: copy('conversations.thread.addEmail') })).toBeInTheDocument()
  })

  /** §8.6.7 both halves: restore does not send; the next press retries under the same id. */
  it('restores a failed message into the composer, then retries it as one line', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-104') // CMSG-1031 bounced; the customer has an address
    renderInbox(at('CNV-104'))
    await screen.findByText(copy('conversations.composer.unclaimed'))
    await user.click(headerButton(copy('queue.claim')))
    const field = await liveComposer(name)
    const failed = /I have attached the fare breakdown/
    await user.click(thread(name).getByRole('button', { name: copy('conversations.thread.sendAgain') }))
    expect((field as HTMLTextAreaElement).value).toMatch(failed)
    expect(screen.getByText(copy('conversations.composer.restored'))).toBeInTheDocument()
    expect(thread(name).getAllByText(failed)).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: copy('conversations.composer.send') }))
    await waitFor(() => expect(composerField(name)).toHaveValue(''))
    expect(thread(name).getAllByText(failed)).toHaveLength(1)
  })

  it('refuses the retry where there is no address, and offers the actual fix', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-110')
    renderInbox(at('CNV-110'))
    await screen.findByText(copy('conversations.composer.unclaimed'))
    await user.click(headerButton(copy('queue.claim')))
    expect(await screen.findByText(copy('conversations.composer.noHandle'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy('conversations.composer.send') })).toBeDisabled()
    expect(thread(name).getByRole('link', { name: copy('conversations.thread.addEmail') })).toBeInTheDocument()
  })
})

describe('Phase C · tickets, calls, snooze, close, transfer and reopen', () => {
  /** AC-947 / AC-S-14: the party arrives locked, the two records point at each other, the rail links the ticket. */
  it('raises a ticket from the conversation, linked both ways, and the rail links it', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-101')
    renderInbox(at('CNV-101'))
    await screen.findByText(copy('conversations.composer.unclaimed'))
    await user.click(headerButton(copy('queue.claim')))
    await liveComposer(name)
    await trigger(user, copy('conversations.ticket.create'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByPlaceholderText(copy('ticket.new.requester.placeholder'))).toBeNull()
    await user.click(within(dialog).getAllByRole('combobox')[0]!)
    await user.click(await screen.findByRole('option', { name: 'Captain late for pickup' }))
    await user.type(within(dialog).getByLabelText(copy('ticket.new.subject')), 'Late again')
    await user.click(within(dialog).getByRole('button', { name: copy('ticket.new.confirm') }))
    await expect.poll(async () => (await byId('CNV-101')).ticketId).not.toBeNull()
    const linked = await byId('CNV-101')
    const ticket = await getTicket(linked.ticketId!)
    expect(ticket.conversationId).toBe('CNV-101')
    expect(ticket.channel).toBe(linked.channel)
    expect(
      await within(rail()).findByRole('link', { name: copy('conversations.ticket.open', { id: ticket.id }) }),
    ).toBeInTheDocument()
  })

  /** O6 / D22: snoozing parks it until the chosen time and pauses both clocks. */
  it('snoozes a held conversation until a chosen time from the pane', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    await liveComposer(name)
    await trigger(user, copy('conversations.snooze'))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: copy('conversations.snooze.option.2h') }))
    await user.click(within(dialog).getByRole('button', { name: copy('conversations.snooze.confirm') }))
    await expect.poll(async () => (await byId('CNV-102')).status).toBe('snoozed')
    const snoozed = await byId('CNV-102')
    expect(Date.parse(snoozed.snoozedUntil!) - Date.parse(EYVAR_NOW)).toBe(2 * 60 * 60_000)
    expect(await within(rail()).findByText(/Snoozed until/)).toBeInTheDocument()
  })

  it('closes with a reason, then offers Reopen as the header primary', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-108')
    renderInbox(at('CNV-108'))
    await liveComposer(name)
    await trigger(user, copy('conversations.close'))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('combobox'))
    await user.click((await screen.findAllByRole('option'))[0]!)
    await user.click(within(dialog).getByRole('button', { name: copy('conversations.close.confirm') }))
    await expect.poll(async () => (await byId('CNV-108')).status).toBe('closed')
    expect(await within(header()).findByRole('button', { name: copy('conversations.reopen') })).toHaveAttribute(
      'data-variant',
      'default',
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: copy('conversations.composer.send') })).toHaveAccessibleDescription(
        literal(copy('conversations.composer.closed')),
      ),
    )
  })

  /** §3.5: reopening does not claim, so the header offers `Claim` next. */
  it('reopens a closed conversation, and does not claim it', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-114')
    renderInbox(at('CNV-114'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
    await user.click(headerButton(copy('conversations.reopen')))
    expect(await within(header()).findByRole('button', { name: copy('queue.claim') })).toBeInTheDocument()
    expect(within(header()).queryByRole('button', { name: copy('conversations.reopen') })).toBeNull()
  })

  it('transfers with a note, and the composer passes to the receiving operator', async () => {
    const user = userEvent.setup()
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    await liveComposer(name)
    await trigger(user, copy('conversations.transfer'))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(copy('conversations.transfer.noteLabel')), 'Escrow is stuck; billing has it.')
    await user.click(within(dialog).getByRole('combobox'))
    const [first] = await screen.findAllByRole('option')
    const target = first!.textContent!.split(' · ')[0]!
    await user.click(first!)
    await user.click(within(dialog).getByRole('button', { name: copy('conversations.transfer.confirm') }))
    await expect.poll(async () => (await byId('CNV-102')).claim?.ownerName).toBe(target)
    expect(await screen.findByText(copy('conversations.composer.heldBy', { name: target }))).toBeInTheDocument()
    expect(composerField(name)).toBeDisabled()
  })

  /** Plan §5: a call logged on a phone conversation lands as a system line in the thread (S-3). */
  it('logs a call on a phone conversation, and the system line appears in the thread', async () => {
    const user = userEvent.setup()
    await reopenConversation('CNV-106')
    await claimConversation('CNV-106')
    const name = await nameOf('CNV-106')
    const systemLines = async () => (await byId('CNV-106')).messages.filter((m) => m.authorKind === 'system')
    const before = (await systemLines()).length
    renderInbox(at('CNV-106'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
    await trigger(user, copy('conversations.logCall'))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(copy('ticket.logCall.notes')), 'Agreed a 15 SAR credit.')
    await user.click(within(dialog).getByRole('button', { name: copy('ticket.logCall.confirm') }))
    await expect.poll(async () => (await systemLines()).length).toBe(before + 1)
    const logged = (await systemLines()).at(-1)!
    expect(await thread(name).findByText(literal(logged.body))).toBeInTheDocument()
  })
})

describe('Phase C · the list', () => {
  /** AC-936 / AC-963: opens on Unassigned; a first-response breach outranks a longer wait. */
  it('opens on Unassigned and paints breached-first, then oldest-waiting', async () => {
    renderInbox()
    await screen.findByRole('link', { name: /Bandar Al-Harbi/ })
    expect(folders().getByRole('link', { name: new RegExp(copy('view.conversations.unassigned')) })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const names = rowLinks().map((link) => link.textContent ?? '')
    const index = (name: string) => names.findIndex((text) => text.includes(name))
    /* CNV-107 (breached, waiting 6 m) above CNV-110 (unbreached, waiting 19 m). */
    expect(index('Khaled Al-Zahrani')).toBeGreaterThanOrEqual(0)
    expect(index('Khaled Al-Zahrani')).toBeLessThan(index('Bandar Al-Harbi'))
  })

  /** AC-937: no messages says so, never a blank line. */
  it('states that a conversation with no messages has none', async () => {
    renderInbox()
    expect(await listPane().findByText(copy('conversations.preview.none'))).toBeInTheDocument()
  })

  /** AC-10, redrawn for three panes: nothing to return to, because the folder and the list never left. */
  it('lands on the folder a ?view= deep link names, and keeps it while a thread is open', async () => {
    const user = userEvent.setup()
    renderInbox(['/support/contact-centre?view=waiting'])
    const waiting = new RegExp(copy('view.conversations.waiting'))
    await screen.findByRole('link', { name: /Layla Al-Faraj/ })
    expect(folders().getByRole('link', { name: waiting })).toHaveAttribute('aria-current', 'page')
    await user.click(rowFor('Layla Al-Faraj'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name: 'Layla Al-Faraj' }) })
    expect(rowFor('Layla Al-Faraj')).toHaveAttribute('aria-current', 'page')
    expect(rowFor('Layla Al-Faraj').getAttribute('href')).toContain('view=waiting')
    expect(folders().getByRole('link', { name: waiting })).toHaveAttribute('aria-current', 'page')
    expect(within(list()).queryByRole('link', { name: /Mohammed Al-Qahtani/ })).toBeNull() // active, not waiting
  })

  it('opens a conversation from its own path', async () => {
    const name = await nameOf('CNV-110')
    renderInbox(at('CNV-110'))
    expect(await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })).toBeInTheDocument()
    expect(within(rail()).getByText(copy('conversations.rail.thisConversation'))).toBeInTheDocument()
  })

  /** Design 12 §3.1 / §7: `x` checks the focused row, and the bar's `Claim` claims the checked set. */
  it('claims the checked rows from the list', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('link', { name: /Khaled Al-Zahrani/ })
    rowFor('Khaled Al-Zahrani').focus()
    await user.keyboard('x')
    expect(screen.getByRole('checkbox', { name: copy('inbox.row.select', { name: 'Khaled Al-Zahrani' }) })).toBeChecked()
    await user.click(listPane().getByRole('button', { name: copy('queue.claim') }))
    await expect.poll(async () => (await byId('CNV-107')).claim?.ownerId).toBe('USR-1')
    await waitFor(() => expect(within(list()).queryByRole('link', { name: /Khaled Al-Zahrani/ })).toBeNull())
  })
})

describe('Phase C · the concurrent-chat cap', () => {
  /** AC-967 / AC-968: a fourth chat is refused in place with the number; an email is not. */
  it('refuses a fourth chat in place with the number, and still allows an email', async () => {
    await switchMockUser('USR-3')
    expect((await listConversations({ view: 'mine', channel: 'chat', pageSize: 1 })).total).toBe(1)
    await transferConversation('CNV-107', 'USR-3')
    await transferConversation('CNV-111', 'USR-3')
    expect((await listConversations({ view: 'mine', channel: 'chat', pageSize: 1 })).total).toBe(3)

    const chat = await nameOf('CNV-101')
    const { unmount } = renderInbox(at('CNV-101'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name: chat }) })
    await waitFor(() => expect(headerButton(copy('queue.claim'))).toBeDisabled())
    const reason = screen.getByText(copy('conversations.cap.reached', { count: 3 }))
    expect(headerButton(copy('queue.claim')).getAttribute('aria-describedby')).toContain(reason.id)
    unmount()

    const email = await nameOf('CNV-110')
    renderInbox(at('CNV-110'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name: email }) })
    await waitFor(() => expect(headerButton(copy('queue.claim'))).toBeEnabled())
  })

  /** D22: the cap does not apply to an Owner. */
  it('does not apply the cap to an Owner', async () => {
    await claimConversation('CNV-107')
    expect((await listConversations({ view: 'mine', channel: 'chat', pageSize: 1 })).total).toBe(3)
    const name = await nameOf('CNV-101')
    renderInbox(at('CNV-101'))
    await screen.findByRole('region', { name: copy('inbox.thread.label', { name }) })
    await waitFor(() => expect(headerButton(copy('queue.claim'))).toBeEnabled())
  })
})

describe('Phase C · the thread', () => {
  /** AC-938: the count is `messageCount`, never the loaded page's length. */
  it('renders the message count from messageCount and offers Load earlier', async () => {
    const conversation = await byId('CNV-108')
    expect(conversation.messages.length).toBeLessThan(conversation.messageCount)
    renderInbox(at('CNV-108'))
    const details = await screen.findByRole('complementary', { name: copy('inbox.header.details') })
    expect(
      await within(details).findByText(
        copy('conversations.thread.count.other', { count: formatCount(conversation.messageCount, 'en') }),
      ),
    ).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: copy('conversations.thread.loadEarlier') })).toBeInTheDocument()
  })

  /** §8.6.6 / R10: the delivery word on the newest outbound only. */
  it('renders a delivery word on one message, not on every message that has one', async () => {
    const name = await nameOf('CNV-108')
    renderInbox(at('CNV-108'))
    await screen.findByRole('button', { name: copy('conversations.thread.loadEarlier') })
    const words = ['sent', 'delivered', 'read'].map((key) => copy(`conversations.delivery.${key}`))
    expect(words.flatMap((word) => thread(name).queryAllByText(word))).toHaveLength(1)
  })

  /** Plan §5 realtime: `message.created` lands in the open thread without a refetch. */
  it('appends a message that arrives on the socket to the open thread', async () => {
    const name = await nameOf('CNV-102')
    renderInbox(at('CNV-102'))
    await liveComposer(name)
    act(() => {
      receiveInboundMessage('CNV-102', 'Still waiting on that refund.')
    })
    expect(await thread(name).findByText('Still waiting on that refund.')).toBeInTheDocument()
  })
})
