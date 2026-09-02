/**
 * The conversation client, held to the same four seam properties every other
 * client is (`seam.test.ts`), plus the two this resource adds:
 *
 *   - **a failed send never looks like a delivered one**, and
 *   - **an internal note is never a reply**.
 *
 * The state table at the top of `fixtures/conversations.ts` is the contract
 * these tests enforce: QA must reach every state without hand-editing a
 * fixture, so every row of that table has an assertion here.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, knownOperations, mockFailures, seedMockFailuresFromLocation } from '../config'
import { isApiError } from '../types/common'
import { deliveryIsWellFormed } from '../types/conversation'
import type { Conversation, Message } from '../types/conversation'
import { resetTickets } from './tickets'
import {
  CONVERSATION_OPERATIONS,
  CONVERSATION_QUEUE_TOPIC,
  claimConversation,
  closeConversation,
  conversationAssignee,
  conversationTopic,
  customerVisible,
  getConversation,
  getConversationFacets,
  listAgentPresence,
  listConversationMessages,
  listConversations,
  releaseConversation,
  createTicketForConversation,
  reopenConversation,
  replyConversation,
  retryMessage,
  resetConversations,
  sendTypingIndicator,
  setMyPresence,
  subscribeToConversation,
  subscribeToConversationQueue,
  transferConversation,
  useEmptyConversationQueue,
} from './conversations'
import {
  drainRealtime,
  flushRealtime,
  pendingRealtimeCount,
  resetRealtime,
  type RealtimeEnvelope,
} from './realtime'

const ALL = { pageSize: 100 } as const

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
  resetConversations()
  /* `createTicketForConversation` writes into the **ticket** store too, and
     `resetConversations` cannot reach it. Without this, a ticket minted by one
     case survives into the next pointing at a conversation that has been reset
     to `ticketId: null` — which is exactly the two-way link this pass exists to
     keep whole, broken by the test harness rather than by the code. */
  resetTickets()
  resetRealtime()
})

/** Every call this client exposes, with the operation id that fails it. */
const CLIENTS: Array<{ op: string; call: () => Promise<unknown> }> = [
  { op: CONVERSATION_OPERATIONS.list, call: () => listConversations() },
  { op: CONVERSATION_OPERATIONS.get, call: () => getConversation('CNV-101') },
  { op: CONVERSATION_OPERATIONS.messages, call: () => listConversationMessages('CNV-108') },
  { op: CONVERSATION_OPERATIONS.facets, call: () => getConversationFacets() },
  { op: CONVERSATION_OPERATIONS.presence, call: () => listAgentPresence() },
  { op: CONVERSATION_OPERATIONS.claim, call: () => claimConversation('CNV-101') },
  { op: CONVERSATION_OPERATIONS.release, call: () => releaseConversation('CNV-102') },
  { op: CONVERSATION_OPERATIONS.transfer, call: () => transferConversation('CNV-101', 'USR-3') },
  { op: CONVERSATION_OPERATIONS.close, call: () => closeConversation('CNV-101', 'resolved') },
  { op: CONVERSATION_OPERATIONS.reply, call: () => replyConversation('CNV-101', { body: 'hello' }) },
  /* `CMSG-1031` on `CNV-104` is the seeded `bounced` message — the one row a
     retry has something to retry. */
  { op: CONVERSATION_OPERATIONS.retry, call: () => retryMessage('CNV-104', 'CMSG-1031') },
  { op: CONVERSATION_OPERATIONS.reopen, call: () => reopenConversation('CNV-113') },
  {
    op: CONVERSATION_OPERATIONS.createTicket,
    call: () =>
      createTicketForConversation('CNV-101', {
        category: 'billing',
        reasonCode: 'FARE_DISPUTE',
        priority: 'High',
      }),
  },
  { op: CONVERSATION_OPERATIONS.typing, call: () => sendTypingIndicator('CNV-101', true) },
]

describe('1 — async always', () => {
  it.each(CLIENTS)('$op returns a Promise', async ({ call }) => {
    const result = call()
    expect(result).toBeInstanceOf(Promise)
    await result
  })
})

describe('2 — failure is injectable per client', () => {
  it.each(CLIENTS)('$op can be made to fail', async ({ op, call }) => {
    mockFailures.always(op)
    await expect(call()).rejects.toSatisfy(isApiError)
    mockFailures.clear(op)
    resetConversations()
    await expect(call()).resolves.not.toThrow()
  })

  it('seeds every conversation operation from ?mockFail=', async () => {
    expect(seedMockFailuresFromLocation('?mockFail=conversations.list,conversations.reply')).toEqual([
      'conversations.list',
      'conversations.reply',
    ])
    await expect(listConversations()).rejects.toSatisfy(isApiError)
    await expect(replyConversation('CNV-101', { body: 'x' })).rejects.toSatisfy(isApiError)
  })

  it('registers every operation id, so a QA panel can list them', async () => {
    await Promise.allSettled(CLIENTS.map(({ call }) => call()))
    const known = knownOperations()
    for (const op of Object.values(CONVERSATION_OPERATIONS)) expect(known, op).toContain(op)
  })

  it('surfaces not-found as a 404 naming the id that was searched', async () => {
    await getConversation('CNV-NOPE').catch((e) => {
      expect(e.status).toBe(404)
      expect(e.message).toContain('CNV-NOPE')
      expect(e.retryable).toBe(false)
    })
  })
})

describe('3 — deterministic', () => {
  it.each([
    { name: 'list', call: () => listConversations(ALL) },
    { name: 'get', call: () => getConversation('CNV-104') },
    { name: 'messages', call: () => listConversationMessages('CNV-108') },
    { name: 'presence', call: () => listAgentPresence() },
  ])('$name returns identical data on two calls', async ({ call }) => {
    expect(await call()).toStrictEqual(await call())
  })

  it('mints message ids from a seeded sequence, not from the clock', async () => {
    const first = await replyConversation('CNV-101', { body: 'one' })
    expect(first.id).toBe('CMSG-9001')
    expect(first.sentAt).toBe('2026-06-25T09:14:00+03:00')
    resetConversations()
    const again = await replyConversation('CNV-101', { body: 'one' })
    expect(again.id).toBe('CMSG-9001')
  })
})

describe('the states QA has to be able to reach without editing a fixture', () => {
  it('reaches an unassigned queue ordered oldest-waiting first', async () => {
    const page = await listConversations({ view: 'unassigned', ...ALL })
    expect(page.items.length).toBeGreaterThan(1)
    expect(page.items.every((c) => conversationAssignee(c) === null)).toBe(true)
    const waits = page.items.map((c) => (c.waitingSince ? Date.parse(c.waitingSince) : Infinity))
    expect(waits).toStrictEqual([...waits].sort((a, b) => a - b))
  })

  it('carries a conversation claimed by me and one claimed by another operator', async () => {
    const page = await listConversations(ALL)
    const mine = page.items.filter((c) => conversationAssignee(c)?.id === 'USR-1')
    const theirs = page.items.filter(
      (c) => conversationAssignee(c) !== null && conversationAssignee(c)?.id !== 'USR-1',
    )
    expect(mine.map((c) => c.id)).toContain('CNV-102')
    expect(theirs.map((c) => c.id)).toContain('CNV-103')
  })

  it('carries a claim gone stale, which counts as unheld', async () => {
    const stale = await getConversation('CNV-112')
    expect(stale.claim?.state).toBe('claimed')
    expect(stale.claim?.ownerId).toBe('USR-5')
    /* Idle 42 minutes, past the 30-minute window — free, and claimable with no
       take-over, exactly as on every other queue. */
    expect(conversationAssignee(stale)).toBeNull()
    await expect(claimConversation('CNV-112')).resolves.toBeDefined()
  })

  it('reaches every channel', async () => {
    const page = await listConversations(ALL)
    const channels = new Set(page.items.map((c) => c.channel))
    for (const channel of ['chat', 'email', 'whatsapp', 'phone']) {
      expect(channels.has(channel as never), channel).toBe(true)
    }
  })

  it('reaches every status', async () => {
    const page = await listConversations(ALL)
    const statuses = new Set(page.items.map((c) => c.status))
    for (const status of ['waiting', 'active', 'snoozed', 'closed']) {
      expect(statuses.has(status as never), status).toBe(true)
    }
  })

  it('reaches every delivery state', async () => {
    const page = await listConversations(ALL)
    const states = new Set(
      page.items.flatMap((c) => c.messages.map((m) => m.delivery?.state).filter(Boolean)),
    )
    for (const state of ['queued', 'sent', 'delivered', 'read', 'failed']) {
      expect(states.has(state as never), state).toBe(true)
    }
  })

  it('carries a failed send that is not mistakable for a delivered one', async () => {
    const bounced = await getConversation('CNV-104')
    const failed = bounced.messages.find((m) => m.delivery?.state === 'failed')
    expect(failed).toBeDefined()
    expect(failed!.delivery!.failureCode).toBe('bounced')
    expect(failed!.delivery!.failureMessage).toBeTruthy()
  })

  it('carries an internal note, and it is a property of the message', async () => {
    const page = await listConversations(ALL)
    const notes = page.items.flatMap((c) => c.messages.filter((m) => m.visibility === 'internal'))
    expect(notes.length).toBeGreaterThan(0)
    /* Not inferable from the author: the same operator wrote both kinds. */
    const authors = new Set(notes.map((m) => m.authorKind))
    expect(authors).toEqual(new Set(['operator']))
    const visible = page.items.flatMap((c) => customerVisible(c.messages))
    expect(visible.some((m) => m.authorKind === 'operator')).toBe(true)
  })

  it('never puts an internal note in the list preview', async () => {
    const page = await listConversations(ALL)
    for (const c of page.items) {
      const internalBodies = c.messages.filter((m) => m.visibility === 'internal').map((m) => m.body)
      expect(internalBodies, c.id).not.toContain(c.lastMessagePreview)
    }
    /* A phone thread is *all* internal, so it has no preview at all. */
    const phone = await getConversation('CNV-106')
    expect(phone.lastMessagePreview).toBeNull()
  })

  it('reaches a long thread that pages, and its count is not messages.length', async () => {
    const long = await getConversation('CNV-108')
    expect(long.messageCount).toBe(64)
    expect(long.messages.length).toBeLessThan(long.messageCount)
    expect(long.hasMoreBefore).toBe(true)

    const page1 = await listConversationMessages('CNV-108', { pageSize: 25 })
    expect(page1.total).toBe(64)
    expect(page1.totalPages).toBe(3)
    /* Newest first — page 1 is the bottom of the thread, which is what a chat opens on. */
    const times = page1.items.map((m) => Date.parse(m.sentAt))
    expect(times).toStrictEqual([...times].sort((a, b) => b - a))
  })

  it('reaches an empty conversation — no messages, and nothing pretending otherwise', async () => {
    const empty = await getConversation('CNV-107')
    expect(empty.messages).toEqual([])
    expect(empty.messageCount).toBe(0)
    expect(empty.lastMessageAt).toBeNull()
    expect(empty.lastMessagePreview).toBeNull()
    /* Still in the queue: somebody opened a chat and is sitting there. */
    expect(empty.waitingSince).not.toBeNull()
  })

  it('reaches an empty queue, which is a different screen from an empty conversation', async () => {
    useEmptyConversationQueue()
    const page = await listConversations(ALL)
    expect(page.total).toBe(0)
    expect(page.totalPages).toBe(1)
    resetConversations()
    expect((await listConversations(ALL)).total).toBeGreaterThan(0)
  })

  it('carries a customer with nowhere to send to', async () => {
    const unreachable = await getConversation('CNV-110')
    const customer = unreachable.participants.find((p) => p.kind === 'customer')
    expect(customer?.handle).toBeNull()
  })

  it('carries a first-response breach, stamped rather than compared', async () => {
    const breached = await getConversation('CNV-104')
    expect(breached.firstResponseAt).toBeNull()
    expect(breached.firstResponseBreachedAt).not.toBeNull()
    expect(breached.slaSource).toBe('legacy-reason-code')
  })

  /**
   * **This assertion used to say the opposite, and it was right at the time.**
   *
   * *"leaves the chat SLA unset rather than inventing one"* was the correct
   * claim while no ruling existed: `types/conversation.ts` asked outright *"what
   * is the first-response promise on a chat with no ticket behind it?"*, and a
   * number invented in a fixture to fill that silence is how an invented number
   * becomes a shipped one.
   *
   * **`DECISIONS.md` D22 answered it** — 45 s and 20 min for chat, 4 h and 24 h
   * for email and WhatsApp, `phone` still nothing — so the old assertion now
   * pins the absence of a decision that has been made. Inverting it is the work,
   * not collateral of it.
   *
   * What survives unchanged is the *reason* the old one existed: a number must
   * say where it came from. That is what `chat-policy` is checked for below, and
   * why a chat is asserted **not** to claim `legacy-policy` — nothing in the
   * legacy app enforces 45 seconds.
   */
  it('carries D22’s chat SLA, and says the ruling is where it came from', async () => {
    const page = await listConversations(ALL)
    const chatWithoutTicket = page.items.filter((c) => c.channel === 'chat' && c.ticketId === null)
    expect(chatWithoutTicket.length).toBeGreaterThan(0)
    for (const c of chatWithoutTicket) {
      expect(c.slaSource, c.id).toBe('chat-policy')
      /* 20 minutes to resolve, and the deadline is that far from the start —
         `slaTargetMinutes` is the denominator a progress track needs and it
         must agree with the two instants, or a bar and a countdown disagree. */
      expect(c.slaTargetMinutes, c.id).toBe(20)
      expect(c.slaStartedAt, c.id).not.toBeNull()
      expect(c.slaDueAt, c.id).not.toBeNull()
      expect(Date.parse(c.slaDueAt!) - Date.parse(c.slaStartedAt!), c.id).toBe(20 * 60_000)
      /* 45 seconds, in seconds. The number does not survive being rounded to a
         whole minute, which is why `offsetFromNow` learned about seconds. */
      expect(c.firstResponseDueAt, c.id).not.toBeNull()
      expect(Date.parse(c.firstResponseDueAt!) - Date.parse(c.slaStartedAt!), c.id).toBe(45_000)
    }
  })

  it('gives a phone conversation no promise at all, which is not a promise of zero', async () => {
    /* D22: *"call notes have no promise"*. `unset` with every clock null is the
       honest answer and is a different row from one whose clock has run out. */
    const page = await listConversations({ ...ALL, channel: 'phone' })
    expect(page.items.length).toBeGreaterThan(0)
    for (const c of page.items) {
      expect(c.slaSource, c.id).toBe('unset')
      expect(c.slaDueAt, c.id).toBeNull()
      expect(c.firstResponseDueAt, c.id).toBeNull()
      expect(c.slaBreachedAt, c.id).toBeNull()
    }
  })

  it('keeps a ticket-backed conversation on its ticket’s clock, not the chat policy', async () => {
    /* D22: *"a conversation with a ticket inherits that ticket's reason-code SLA
       and has no second clock"*. Two provenances must never appear on one row. */
    const page = await listConversations(ALL)
    const withTicket = page.items.filter((c) => c.ticketId !== null && c.channel !== 'phone')
    expect(withTicket.length).toBeGreaterThan(0)
    for (const c of withTicket) expect(c.slaSource, c.id).toBe('legacy-reason-code')
  })

  it('keeps breach a stamp, so a deadline that passed after disposal is not one', async () => {
    /**
     * The three rows the distinction lives or dies on, asserted together
     * because each is only meaningful beside the others:
     *
     *   `CNV-115` closed the instant it arrived; both deadlines fell days
     *      later, so it is **merely old** and stays unbreached forever.
     *   `CNV-111` is snoozed past its deadline — D22 pauses both clocks, and a
     *      countdown against a decision already made is a **false** breach.
     *   `CNV-102` was answered five minutes into a 45-second promise: late, and
     *      therefore `firstResponseAt > firstResponseDueAt` rather than a
     *      stamp, which is reserved for a window nobody answered in at all.
     */
    const spam = await getConversation('CNV-115')
    expect(Date.parse(spam.slaDueAt!)).toBeGreaterThan(Date.parse(spam.closedAt!))
    expect(spam.slaBreachedAt).toBeNull()

    const snoozed = await getConversation('CNV-111')
    expect(snoozed.status).toBe('snoozed')
    expect(snoozed.slaDueAt).not.toBeNull()
    expect(snoozed.slaBreachedAt).toBeNull()

    const late = await getConversation('CNV-102')
    expect(Date.parse(late.firstResponseAt!)).toBeGreaterThan(Date.parse(late.firstResponseDueAt!))
    expect(late.firstResponseBreachedAt).toBeNull()
    /* …and it *is* resolution-breached, which is the AC-964 row. */
    expect(late.slaBreachedAt).not.toBeNull()
  })

  it('carries a name long enough to break a column, in Arabic and in English', async () => {
    const page = await listConversations(ALL)
    expect(page.items.some((c) => c.entityName.length > 40)).toBe(true)
    expect(page.items.some((c) => /[؀-ۿ]/.test(c.entityName))).toBe(true)
  })

  it('carries an operator who has never been online', async () => {
    const presence = await listAgentPresence()
    expect(presence.some((p) => p.lastSeenAt === null && p.state === 'offline')).toBe(true)
    expect(presence.find((p) => p.userId === 'USR-1')?.activeCount).toBeGreaterThan(0)
  })

  it('agrees with the tickets that link to it, in both directions', async () => {
    const { listTickets } = await import('./tickets')
    const tickets = await listTickets(ALL)
    for (const ticket of tickets.items) {
      if (!ticket.conversationId) continue
      const conversation = await getConversation(ticket.conversationId)
      expect(conversation.ticketId, ticket.id).toBe(ticket.id)
      expect(conversation.channel, ticket.id).toBe(ticket.channel)
    }
  })
})

describe('the delivery invariant', () => {
  it('gives a delivery state to every outbound customer message and to nothing else', async () => {
    const page = await listConversations(ALL)
    const offenders: string[] = []
    for (const c of page.items) {
      for (const m of c.messages) if (!deliveryIsWellFormed(m)) offenders.push(`${c.id}/${m.id}`)
    }
    expect(offenders, 'an internal note with a delivery tick is the leak this field prevents').toEqual([])
  })

  it('gives a new note no delivery state at all', async () => {
    const note = await replyConversation('CNV-102', { body: 'Checking billing.', visibility: 'internal' })
    expect(note.visibility).toBe('internal')
    expect(note.delivery).toBeNull()
    expect(deliveryIsWellFormed(note)).toBe(true)
  })
})

describe('claim, release, transfer — the queue contract, unchanged', () => {
  it('claims an unassigned conversation for me', async () => {
    const claimed = await claimConversation('CNV-101')
    expect(conversationAssignee(claimed)).toEqual({ id: 'USR-1', name: 'Sarah Al-Rashid' })
    /* Claiming is not answering: the customer is still waiting. */
    expect(claimed.status).toBe('waiting')
    expect(claimed.waitingSince).not.toBeNull()
  })

  it('refuses a conversation another operator holds, and names the holder', async () => {
    await claimConversation('CNV-103').catch((e) => {
      expect(e.status).toBe(409)
      expect(e.code).toBe('claimed_by_other')
      expect(e.message).toContain('Lina Al-Otaibi')
      expect(e.retryable).toBe(false)
    })
    expect.assertions(4)
  })

  it('takes it over deliberately, and records the take-over', async () => {
    const taken = await claimConversation('CNV-103', { takeOver: true })
    expect(conversationAssignee(taken)?.id).toBe('USR-1')
    expect(taken.claim?.takeovers).toHaveLength(1)
    expect(taken.claim?.takeovers[0]?.fromUserId).toBe('USR-3')
  })

  it('releases back to the queue', async () => {
    const released = await releaseConversation('CNV-102')
    expect(released.claim?.state).toBe('released')
    expect(conversationAssignee(released)).toBeNull()
    const queue = await listConversations({ view: 'unassigned', ...ALL })
    expect(queue.items.map((c) => c.id)).toContain('CNV-102')
  })

  it('transfers to a named operator and records the hand-off', async () => {
    const moved = await transferConversation('CNV-102', 'USR-3', { note: 'Lina has the billing context.' })
    expect(conversationAssignee(moved)).toEqual({ id: 'USR-3', name: 'Lina Al-Otaibi' })
    expect(moved.claim?.takeovers.at(-1)).toMatchObject({ fromUserId: 'USR-1', toUserId: 'USR-3' })
    const note = moved.messages.at(-1)!
    expect(note.visibility).toBe('internal')
    expect(note.delivery).toBeNull()
  })

  it('refuses a transfer to somebody who is not an operator', async () => {
    await transferConversation('CNV-102', 'USR-NOPE').catch((e) => {
      expect(e.status).toBe(422)
      expect(e.details[0]?.field).toBe('toUserId')
    })
    expect.assertions(2)
  })

  it('refuses to close twice, so closedAt cannot be restamped', async () => {
    await closeConversation('CNV-102', 'resolved')
    await closeConversation('CNV-102', 'resolved').catch((e) => {
      expect(e.status).toBe(409)
      expect(e.code).toBe('conversation_closed')
    })
    expect.assertions(2)
  })

  it('does not clear a breach when it closes', async () => {
    const closed = await closeConversation('CNV-104', 'resolved')
    expect(closed.status).toBe('closed')
    expect(closed.firstResponseBreachedAt).not.toBeNull()
  })
})

describe('reply — and what a reply is not', () => {
  it('appends a queued message and takes the row out of the waiting queue', async () => {
    const sent = await replyConversation('CNV-101', { body: 'Assalamu alaikum, I am looking now.' })
    expect(sent.delivery?.state).toBe('queued')
    const after = await getConversation('CNV-101')
    expect(after.status).toBe('active')
    expect(after.waitingSince).toBeNull()
    expect(after.firstResponseAt).toBe('2026-06-25T09:14:00+03:00')
    expect(after.messageCount).toBe(3)
  })

  it('an internal note is not a reply — the customer is still waiting', async () => {
    const before = await getConversation('CNV-101')
    await replyConversation('CNV-101', { body: 'Escalating to billing.', visibility: 'internal' })
    const after = await getConversation('CNV-101')
    expect(after.status).toBe('waiting')
    expect(after.waitingSince).toBe(before.waitingSince)
    expect(after.firstResponseAt).toBeNull()
    expect(after.lastMessagePreview).toBe(before.lastMessagePreview)
  })

  it('refuses an empty body and a closed conversation', async () => {
    await expect(replyConversation('CNV-101', { body: '   ' })).rejects.toMatchObject({ status: 422 })
    await expect(replyConversation('CNV-106', { body: 'hello' })).rejects.toMatchObject({ status: 409 })
  })

  it('advances queued → sent → delivered → read over the subscription seam', async () => {
    const events: Array<{ type: string; state?: string }> = []
    subscribeToConversation('CNV-101', (event) => {
      events.push({
        type: event.type,
        state: event.type === 'message.delivery' ? event.delivery.state : undefined,
      })
    })
    await flushRealtime()

    const sent = await replyConversation('CNV-101', { body: 'On it.' })
    expect(events.map((e) => e.type)).toEqual(['message.created'])
    expect(sent.delivery?.state).toBe('queued')

    /**
     * **`read` used to be unreachable — design finding F-7.** The script stopped
     * at `delivered`, so a state that exists in the type could only ever be seen
     * on a seeded row and never produced by the code that produces states.
     *
     * It is emitted here and not everywhere: the channel must report read
     * receipts (`chat` and `whatsapp` do; email does not) **and** the customer
     * must still be in the conversation. `CNV-101`'s customer has not left, so
     * all four states run. The other branch is asserted below.
     */
    expect(pendingRealtimeCount()).toBe(3)
    drainRealtime()
    expect(events.map((e) => e.state).filter(Boolean)).toEqual(['sent', 'delivered', 'read'])
  })

  it('stops at delivered when the customer has closed the tab', async () => {
    /* `CNV-111`'s customer has a `leftAt`. Somebody who is gone cannot read what
       arrives afterwards, and a read tick for them would be the same class of
       fiction as a tick on a message that bounced. */
    const states: string[] = []
    subscribeToConversation('CNV-111', (event) => {
      if (event.type === 'message.delivery') states.push(event.delivery.state)
    })
    await flushRealtime()
    await replyConversation('CNV-111', { body: 'Following up as promised.' })
    drainRealtime()
    expect(states).toEqual(['sent', 'delivered'])
  })

  it('stops at delivered on email, which reports no read receipt at all', async () => {
    const states: string[] = []
    subscribeToConversation('CNV-109', (event) => {
      if (event.type === 'message.delivery') states.push(event.delivery.state)
    })
    await flushRealtime()
    await replyConversation('CNV-109', { body: 'The reissued invoice is attached.' })
    drainRealtime()
    expect(states).toEqual(['sent', 'delivered'])
  })

  it('fails the delivery when there is nowhere to send it', async () => {
    const states: string[] = []
    subscribeToConversation('CNV-110', (event) => {
      if (event.type === 'message.delivery') states.push(event.delivery.state)
    })
    await flushRealtime()
    await replyConversation('CNV-110', { body: 'Could you confirm the card?' })
    drainRealtime()
    expect(states).toEqual(['failed'])
  })

  it('scripts nothing for an internal note — there is nothing to deliver', async () => {
    await replyConversation('CNV-102', { body: 'note', visibility: 'internal' })
    expect(pendingRealtimeCount()).toBe(0)
  })
})

describe('the subscription surface', () => {
  it('announces a claim on the queue topic, so another console stops offering it', async () => {
    const queue: RealtimeEnvelope[] = []
    subscribeToConversationQueue((_, envelope) => queue.push(envelope))
    await flushRealtime()
    await claimConversation('CNV-101')
    expect(queue.map((e) => e.topic)).toEqual([CONVERSATION_QUEUE_TOPIC])
    expect(queue[0]?.type).toBe('conversation.updated')
  })

  it('announces a release on both topics', async () => {
    const thread: string[] = []
    const queue: string[] = []
    subscribeToConversation('CNV-102', (event) => thread.push(event.type))
    subscribeToConversationQueue((event) => queue.push(event.type))
    await flushRealtime()
    await releaseConversation('CNV-102')
    expect(thread).toContain('conversation.claim')
    expect(queue).toContain('conversation.queued')
  })

  it('publishes a typing indicator on the conversation topic', async () => {
    const seen: RealtimeEnvelope[] = []
    subscribeToConversation('CNV-102', (_, envelope) => seen.push(envelope))
    await flushRealtime()
    await sendTypingIndicator('CNV-102', true)
    expect(seen).toHaveLength(1)
    expect(seen[0]?.topic).toBe(conversationTopic('CNV-102'))
    expect(seen[0]?.type).toBe('typing')
  })

  it('publishes a presence change', async () => {
    const presence = await setMyPresence('away')
    expect(presence.state).toBe('away')
    expect((await listAgentPresence()).find((p) => p.userId === 'USR-1')?.state).toBe('away')
  })
})

describe('facets', () => {
  it('derives the channel option set from the data, not from a hand-written list', async () => {
    const facets = await getConversationFacets()
    expect(Object.keys(facets).sort()).toEqual(['channel', 'claimedBy', 'entityType', 'status'])
    expect(facets['channel']?.map((f) => f.value).sort()).toEqual(['chat', 'email', 'phone', 'whatsapp'])
  })
})

/* One more assertion the whole file rests on: `messages` is a page, and the
   only honest total is `messageCount`. */
function assertPageIsNotTheThread(conversation: Conversation, all: readonly Message[]): void {
  expect(conversation.messages.length).toBeLessThanOrEqual(all.length)
}

describe('messages: the page is not the thread', () => {
  it('holds only the tail of a long conversation', async () => {
    const conversation = await getConversation('CNV-108')
    const all = await listConversationMessages('CNV-108', { pageSize: 100 })
    assertPageIsNotTheThread(conversation, all.items)
    expect(all.items).toHaveLength(64)
  })
})
