/**
 * **The conversation pane** — `DESIGN.md` §8.6, §2.2, §3.8 ·
 * `design/11-conversation-composer.md`.
 *
 * ## It is a PAGE, not a drawer — delta D-4, decided
 *
 * The first build put the thread in a `Sheet` because this sub-tab has no
 * level-3 route (`routeTable.ts` declares `detailRoutes: []`) and `routes.tsx`
 * has a single owner. That was the wrong trade and the spec is right:
 *
 *   - `--ev-drawer-w` is **406px**. A thread, a 320px rail and a pinned composer
 *     do not fit in it, and the composer is the control the screen exists for.
 *   - §5.0's drawer row is for *"a surface consulted **against** the page behind
 *     it"*. A conversation held under a 45-second first-response promise for
 *     twenty minutes is not a consultation; it is the work.
 *   - **D19 maps this pane to the two-column-detail row explicitly**, and §6.4
 *     now carries it: `contacts` left the index-table row and is `Work queue` +
 *     `Two-column detail + a sending composer`.
 *
 * **So it is `DetailPage` — main + a 320px rail (§2.2) — at
 * `/support/contact-centre/:conversationId`.** `CONVERSATION_DETAIL` is
 * declared, `routes.tsx` dispatches on `detail.kind === 'conversation'`, and the
 * detail route's `shape` is `'detail'` — so §8 slot 1's back arrow is this
 * surface's by right rather than by exception. The `?conversation=` interim this
 * file shipped with is gone; only the call site moved, exactly as promised.
 *
 * Rules applied
 *   §8.6.1     the composer sits at the **foot** of the thread, `sticky` to the
 *              main column's bottom edge, and the thread scrolls behind it. This
 *              overrides §3.8's *"composer above the feed"* for a conversation
 *              thread and for nothing else. The mechanical reason:
 *              `listConversationMessages` pages **newest-first**, so page 1 is
 *              the bottom and earlier pages load upward — the bottom edge is the
 *              only anchor that does not move.
 *   §8.6.2     **four message shapes**, four grounds already in the token set,
 *              no new colour, every one surviving greyscale. **The note is the
 *              only message that is not a bubble.**
 *   §8.6.2     the note's not-sent-ness is in its **header**, and its delivery
 *              position stays **empty** — not an em dash, not `Not sent`,
 *              nothing. Delta **D-1**: in the delivery position that line sat
 *              two messages from `Not delivered — no email address on file`,
 *              same slot, same size, both opening on *Not*, meaning opposite
 *              things.
 *   §8.6.6     **delivery renders on exactly one message** — the newest outbound
 *              customer-visible one — **plus every `failed`**. Delta **D-2**.
 *              R10's lifetime test: a state in flight is transient, `failed` is
 *              a standing condition.
 *   §8.6.7     a failed message is marked by **shape and words, never red**: the
 *              bubble loses its fill, the line beneath goes to full-strength
 *              ink, and it renders `failureMessage` — **never `failureCode`,
 *              not even as a fallback** (delta **D-3**, D17 clause 1).
 *   §8.6.9     four states. `CNV-107` is the seeded empty and the composer is
 *              **fully enabled** in it — that is the state in which the operator
 *              writes the first message. Loading disables the composer with
 *              **no** reason line.
 *   §2.2       the rail holds status, summary and metadata only. No form field
 *              is in it.
 *   §9.1       `<bdi>` on every timestamp, count and handle. Nothing is anchored
 *              to a physical edge; `self-start` / `self-end` mirror on their own.
 *   **AC-938** `messageCount`, never `messages.length`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DATA_SOURCE,
  advanceRealtime,
  conversationAssignee,
  listConversationMessages,
  replyConversation,
  retryMessage,
  subscribeToConversation,
} from '@/data/clients'
import type {
  Conversation,
  ConversationChannel,
  ConversationParticipant,
  IsoDateTime,
  Message,
  MessageDelivery,
  MessageDeliveryState,
  MessageVisibility,
  Paginated,
} from '@/data/types'
import { TYPING_TTL_SECONDS } from '@/data/types'
import {
  formatCount,
  formatDate,
  formatFileSize,
  type Direction,
  type Language,
  type Translate,
} from '@/lib'
import { useAsync, useTick } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader, type PageAction } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { SlaCell, queueClock } from '@/screens/queues'
import { MessageComposer } from './MessageComposer'
import { ElsewhereCard } from '../shared/ElsewhereCard'
import { conversationSla } from './sla'
import { CHANNEL_KEY, STATUS_KEY, STATUS_TONE } from './vocabulary'

/** One page of a thread. `Load earlier messages` widens the window. */
const THREAD_PAGE = 20

/** §8.6.6 — one word per state, no glyph, no timestamp. */
const DELIVERY_KEY: Readonly<Record<MessageDeliveryState, string>> = {
  queued: 'conversations.delivery.queued',
  sent: 'conversations.delivery.sent',
  delivered: 'conversations.delivery.delivered',
  read: 'conversations.delivery.read',
  failed: 'conversations.delivery.failed',
}

export interface ConversationPaneProps {
  conversation: Conversation
  now: IsoDateTime
  t: Translate
  language: Language
  dir: Direction
  currentUserId: string

  /**
   * §8.6.8 — **the one refusal sentence for the whole screen**, or `null`. It
   * governs the composer, `Grab`, `Transfer`, `Create ticket` and `Close`
   * together; five copies of one sentence buries the sentence.
   */
  writeRefusal: string | null
  /** D22 — the cap's sentence when `Grab` is the refused control, or `null`. */
  grabRefusal: string | null

  onBack: () => void
  onClaim: () => void
  onTakeOver: () => void
  onTransfer: () => void
  onClose: () => void
  onSnooze: () => void
  /** X2: on a phone conversation, logs the call on the linked ticket. */
  onLogCall: () => void
  logCallRefusal: string | null
  onReopen: () => void
  /** D19 / AC-947: opens the ticket form with this conversation's party and channel locked. */
  onCreateTicket: () => void
  /** `null` when this party can be ticketed; the sentence otherwise. */
  createTicketRefusal: string | null

  profileHref: string
  ticketHref: (ticketId: string) => string
}

export function ConversationPane({
  conversation,
  now,
  t,
  language,
  dir,
  currentUserId,
  writeRefusal,
  grabRefusal,
  onBack,
  onClaim,
  onTakeOver,
  onTransfer,
  onClose,
  onSnooze,
  onLogCall,
  logCallRefusal,
  onReopen,
  onCreateTicket,
  createTicketRefusal,
  profileHref,
  ticketHref,
}: ConversationPaneProps) {
  const [typingBy, setTypingBy] = useState<{ name: string; receivedAt: number } | null>(null)
  const [windowSize, setWindowSize] = useState(THREAD_PAGE)
  const [restored, setRestored] = useState<{
    body: string
    messageId: string
    token: number
  } | null>(null)
  /**
   * **How an optimistic message is keyed before the server id arrives** — one of
   * the three decisions §11 leaves to the builder.
   *
   * A monotonic client token, `local:1`, `local:2`, minted here and never
   * derived from the body, the timestamp or the author. Body-keying collides the
   * moment an operator sends the same word twice — which is exactly what happens
   * with `ok` and `Thanks` — and a clock-derived key differs on every run, which
   * is the drift `mock/clock.ts` bans by name. On resolve the entry is replaced
   * **by token**, so a slow first send resolving after a fast second one cannot
   * overwrite the wrong bubble.
   */
  const [optimistic, setOptimistic] = useState<ReadonlyArray<{ token: string; message: Message }>>(
    [],
  )
  /** Messages the subscription delivered, and delivery states it moved. */
  const [live, setLive] = useState<ReadonlyArray<Message>>([])
  const [deliveries, setDeliveries] = useState<ReadonlyMap<string, MessageDelivery>>(
    () => new Map(),
  )

  const id = conversation.id

  /* A new conversation is a new pane. Nothing from the last one survives. */
  useEffect(() => {
    setWindowSize(THREAD_PAGE)
    setRestored(null)
    setOptimistic([])
    setLive([])
    setDeliveries(new Map())
  }, [id])

  const thread = useAsync<Paginated<Message>>(
    (signal) => listConversationMessages(id, { page: 1, pageSize: windowSize }, signal),
    /* **Deliberately NOT cached (P3-13).** `deps` is complete — the id and the
       window are the fetcher's only inputs — but a reply is *not* written back
       through `refetch`: it lives in `optimistic` and `live`, which are local
       state and reset on remount. So a warm entry from before a reply, plus an
       empty `live`, is the operator's own message disappearing for the ~320 ms
       until revalidation lands. Cacheable the day `send` ends in
       `thread.refetch()` or `invalidate('conversations.messages')`. */
    { deps: [id, windowSize] },
  )

  /**
   * **The subscription seam, which is what makes a delivery state mean
   * anything.** `replyConversation` returns a message in `queued` and the state
   * moves afterwards, over `clients/realtime.ts`. A pane that rendered the
   * returned message and stopped would show a word that never changes.
   */
  useEffect(() => {
    return subscribeToConversation(id, (event) => {
      if (event.type === 'message.created') {
        setLive((current) => appendOnce(current, event.message))
      } else if (event.type === 'message.delivery') {
        setDeliveries((current) => new Map(current).set(event.messageId, event.delivery))
      } else if (event.type === 'typing' && event.typing.actorId !== currentUserId) {
        setTypingBy(event.typing.typing ? { name: event.typing.actorName, receivedAt: Date.now() } : null)
      }
    })
  }, [id])

  /**
   * **The mock driver owns no timer** — `clients/realtime.ts` is explicit that
   * *"`advanceRealtime` is what P5-T2's 'a mock driven by `useTick`' means in a
   * layer that must not import React: the console calls it from its `useTick`
   * bucket"*. This is that call site. One shared interval, `useTick`'s, so
   * **AC-28** still holds; nothing is subscribed outside mock mode.
   */
  const tick = useTick(1, DATA_SOURCE === 'mock')
  useEffect(() => {
    if (DATA_SOURCE === 'mock') advanceRealtime(2)
  }, [tick])

  const sla = useMemo(() => conversationSla(conversation), [conversation])
  const owner = conversationAssignee(conversation)
  const heldByMe = owner !== null && owner.id === currentUserId

  /* The client serves newest-first — page 1 is the bottom of the thread, which
     is what a chat opens on. The pane reads oldest-first, so it reverses, then
     folds in whatever arrived live and whatever is still in flight. */
  const messages = useMemo(() => {
    const fetched = [...(thread.data?.items ?? [])].reverse()
    const known = new Set(fetched.map((message) => message.id))
    const arrived = live.filter((message) => !known.has(message.id))
    const merged = [...fetched, ...arrived].map((message) => {
      const moved = deliveries.get(message.id)
      return moved ? { ...message, delivery: moved } : message
    })
    return [...merged, ...optimistic.map((entry) => entry.message)]
  }, [thread.data, live, deliveries, optimistic])

  /**
   * **§8.6.6 in one line.** The newest outbound customer-visible message is the
   * only one that renders a settled delivery state; everything older renders one
   * only when it is `failed`. `11-conversation-composer.md` §11 asks
   * utilities-engineer for this as a shared selector, because the queue row and
   * any future digest need the same answer.
   */
  const newestOutboundId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i]
      if (message && message.direction === 'outbound' && message.visibility === 'customer') {
        return message.id
      }
    }
    return null
  }, [messages])

  const send = useCallback(
    async ({
      body,
      visibility,
      byEmail,
    }: {
      body: string
      visibility: MessageVisibility
      byEmail: boolean
    }): Promise<Message> => {
      const token = `local:${optimisticSequence++}`
      /* §8.6 §6 — the message appears at the foot of the thread reading
         `Sending…` before the request settles. A note is optimistic too, and it
         carries `delivery: null`, because `deliveryIsWellFormed` says a note has
         no delivery and an optimistic one must not invent the first tick the
         real one will never have. */
      setOptimistic((current) => [
        ...current,
        { token, message: pendingMessage(token, conversation, body, visibility, currentUserId) },
      ])
      try {
        /* **§8.6.5 — the switch stamps the MESSAGE's channel, not the
           conversation's.** `types/conversation.ts`: *"a chat escalated to an
           email is one conversation with two message channels, and losing that
           is losing the audit trail."* `undefined` rather than the
           conversation's own channel spelled out, so the client's default is
           what decides and one place knows it. An internal note is never
           re-channelled: it is not sent anywhere. */
        const accepted = await replyConversation(id, {
          body,
          visibility,
          channel: byEmail && visibility === 'customer' ? 'email' : undefined,
        })
        setOptimistic((current) => current.filter((entry) => entry.token !== token))
        /* **The message arrives twice and must render once.** The mutation
           returns it over the request seam *and* announces it over the
           subscription seam — that is the client's own design (*"the write side
           has two halves"*) and it is what makes a second console update. Both
           paths go through `appendOnce`, keyed on the server id; guarding only
           the subscription leaves a race in which the event lands first and the
           response then duplicates the bubble. */
        setLive((current) => appendOnce(current, accepted))
        return accepted
      } catch (error) {
        /* §8.6 §6 — *"the optimistic message is removed — never left as a
           phantom"*. The composer restores the body; this removes the bubble. */
        setOptimistic((current) => current.filter((entry) => entry.token !== token))
        throw error
      }
    },
    [conversation, currentUserId, id],
  )

  /**
   * **`Send again`, sending — and it is one transcript line, not two.**
   *
   * §8.6.7's `[ruling]` is that `Send again` **restores the body into the
   * composer and does not send**, *"one press from sending and one press from
   * correcting"*. That behaviour is unchanged. What changed is which operation
   * the **next** press calls:
   *
   *   - body **unedited** → `retryMessage`, which re-uses the message id and
   *     pushes the failed attempt onto `Message.deliveryHistory`;
   *   - body **edited** → `replyConversation`, because a different sentence is a
   *     different message and belongs on its own line.
   *
   * The ruling's product reason stands. Its *other* support — *"the seam has no
   * retry operation, and minting a second message through `replyConversation`
   * would duplicate the body in the thread under a new id"* (deviation 3,
   * **F-2**) — is closed, and honouring the ruling literally would now PRODUCE
   * that duplicate. Choosing the operation at press time is what keeps both
   * halves true. **Raised to product-designer as an interpretation to ratify,
   * not treated as settled.**
   */
  const retry = useCallback(
    async (messageId: string): Promise<Message> => {
      const accepted = await retryMessage(id, messageId)
      /* The id is unchanged, so this REPLACES an attempt rather than appending a
         line. The delivery overlay is already how this pane renders a state that
         moved after the read. */
      if (accepted.delivery !== null) {
        const moved = accepted.delivery
        setDeliveries((current) => new Map(current).set(messageId, moved))
      }
      return accepted
    },
    [id],
  )

  /* ── the header ─────────────────────────────────────────────────────── */

  /**
   * R3 / §3.9 — **one primary**, and its precedence is the order in which the
   * operator is actually blocked:
   *
   *   1. **you do not hold this** → `Grab` or `Take over`. Nothing else on the
   *      pane can be done until you do, and §3.5's own table names both as the
   *      header primary for those two rows.
   *   2. **you hold it and it has run past twenty minutes** → `Create ticket`
   *      (**AC-964**). D22: *"a chat that has run twenty minutes is not a chat;
   *      it is a ticket."* It is a conversion prompt, not an escalation.
   *   3. otherwise there is no primary, and that is a legitimate answer.
   */
  /* §11.2: the form exists (`NewTicketModal`), so the control is live wherever
     the party can be ticketed, and refused with its reason where it cannot. */
  const createTicketRefused: string | null =
    writeRefusal ??
    createTicketRefusal ??
    (conversation.ticketId !== null
      ? t('conversations.ticket.linked', { id: conversation.ticketId })
      : conversation.status === 'closed'
        ? t('conversations.composer.closed')
        : null)
  const createTicketAction: PageAction = {
    label: t('conversations.ticket.create'),
    onClick: onCreateTicket,
    disabled: createTicketRefused !== null,
    reason: createTicketRefused,
  }

  const primary: PageAction | undefined = (() => {
    if (conversation.status === 'closed') {
      /* §3.5's header primary on a closed thread. `reopenConversation` landed,
         so this is live. **Reopening does not claim** — ownership is left
         untouched, so the row comes back unclaimed and the precedence below
         offers `Grab` on the next render. Whether it SHOULD claim is an open
         question with the product owner, and the console does not pre-empt it. */
      return {
        label: t('conversations.reopen'),
        onClick: onReopen,
        disabled: writeRefusal !== null,
      }
    }
    if (!heldByMe) {
      const takeOver = owner !== null
      return {
        label: t(takeOver ? 'queue.takeOver' : 'queue.claim'),
        onClick: takeOver ? onTakeOver : onClaim,
        disabled: writeRefusal !== null || grabRefusal !== null,
      }
    }
    /* AC-964: past twenty minutes the conversion is the primary. */
    if (sla.resolutionBreached && conversation.ticketId === null) return createTicketAction
    return undefined
  })()

  const secondaries: PageAction[] = [
    {
      label: t('conversations.transfer'),
      onClick: onTransfer,
      disabled: writeRefusal !== null || conversation.status === 'closed',
    },
    {
      label: t('conversations.snooze'),
      onClick: onSnooze,
      disabled: writeRefusal !== null || conversation.status === 'closed' || conversation.status === 'snoozed',
    },
    ...(conversation.channel === 'phone'
      ? [
          {
            label: t('conversations.logCall'),
            onClick: onLogCall,
            disabled: writeRefusal !== null || logCallRefusal !== null || conversation.status === 'closed',
            reason: writeRefusal ?? logCallRefusal,
          },
        ]
      : []),
    {
      label: t('conversations.close'),
      onClick: onClose,
      disabled: writeRefusal !== null || conversation.status === 'closed',
    },
    ...(primary === createTicketAction ? [] : [createTicketAction]),
  ]

  /* §8.7: one muted line while the customer types; it expires on the TTL, read on the tick. */
  const typingLine =
    typingBy !== null && Date.now() - typingBy.receivedAt < TYPING_TTL_SECONDS * 1000 && tick >= 0
      ? typingBy
      : null

  /* ── the composer's refusal, resolved ONCE (§8.6.3, §8.6.8) ─────────── */

  const customer = conversation.participants.find((party) => party.kind === 'customer') ?? null
  const customerEmail = customer === null ? null : addressOn(customer, 'email')
  const composerRefusal: string | null =
    writeRefusal !== null
      ? writeRefusal
      : thread.status === 'error'
        ? t('conversations.composer.threadError')
        : conversation.status === 'closed'
          ? t('conversations.composer.closed')
          : !heldByMe
            ? owner !== null
              ? t('conversations.composer.heldBy', { name: owner.name })
              : t('conversations.composer.unclaimed')
            : conversation.channel === 'phone'
              ? t('conversations.composer.phone')
              : /* §8.6.5 / **F-4** — `CNV-110` is an EMAIL conversation whose
                   customer has no address on that channel. There is no other
                   channel and so no `Reply by email` to disable: the refusal
                   belongs on `Send`, which is what the fixture's own comment
                   asks for.

                   Read from the **map**, which is the source of truth; `handle`
                   is documented as its alias for the conversation's own channel
                   and `fixtures/integrity.test.ts` asserts they never disagree.
                   `addressOn` collapses the map's two absences — key missing
                   (*never learned*) and key present but `null` (*looked, there
                   is none*) — because the console refuses identically for both
                   and §8.6.5 gives exactly one sentence. The distinction stays
                   in the data for the day a second sentence is wanted. */
                customer !== null && addressOn(customer, conversation.channel) === null
                ? t('conversations.composer.noHandle')
                : null

  /* ── render ─────────────────────────────────────────────────────────── */

  return (
    <DetailPage
      header={
        <PageHeader
          title={conversation.entityName}
          meta={null}
          badges={
            <span className="flex items-center gap-2">
              <StatusBadge tone="neutral">{t(CHANNEL_KEY[conversation.channel])}</StatusBadge>
              <StatusBadge tone={STATUS_TONE[conversation.status]}>
                {t(STATUS_KEY[conversation.status])}
              </StatusBadge>
            </span>
          }
          onBack={onBack}
          primaryAction={primary}
          secondaryActions={secondaries}
          t={t}
          dir={dir}
        />
      }
      main={
        <div className="flex min-h-0 flex-col">
          {/* ── loading ─────────────────────────────────────────────────
              §8.6.9 — skeleton bubbles alternating inline-start and
              inline-end. **Never a centred spinner.** */}
          {thread.status === 'loading' && (
            <div aria-busy="true" className="flex flex-col gap-3">
              <Skeleton className="h-12 w-64 self-start" />
              <Skeleton className="h-12 w-72 self-end" />
              <Skeleton className="h-12 w-56 self-start" />
            </div>
          )}

          {/* ── error ───────────────────────────────────────────────────── */}
          {thread.status === 'error' && (
            <ErrorState
              scope="card"
              message={t('conversations.thread.error')}
              action={{ label: t('conversations.thread.retry'), onClick: thread.refetch }}
            />
          )}

          {/* ── empty · `CNV-107` ───────────────────────────────────────
              R8: **no illustration.** An illustration belongs to a whole-page,
              zero-records-ever state; this is one conversation that happens to
              be new, and its own sentence is not the queue's. */}
          {thread.status === 'empty' && messages.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t('conversations.thread.empty')}
            </p>
          )}

          {messages.length > 0 && (
            <>
              {/* The control renders on the ONE fact that can answer it: the
                  loaded window is smaller than the thread. `hasMoreBefore` is a
                  property of the LIST ROW's page, not of the pane's, so a row
                  carrying `true` while the pane already holds everything would
                  offer a control that does nothing. */}
              {windowSize < (thread.data?.total ?? 0) ? (
                <Button
                  variant="secondary"
                  size="xs"
                  className="mb-3 self-center"
                  onClick={() => setWindowSize((current) => current + THREAD_PAGE)}
                >
                  {t('conversations.thread.loadEarlier')}
                </Button>
              ) : null}

              <ol className="flex flex-col gap-3">
                {messages.map((message, index) => (
                  <MessageRow
                    key={message.id}
                    message={message}
                    previousChannel={messages[index - 1]?.channel ?? conversation.channel}
                    conversationChannel={conversation.channel}
                    showsDelivery={message.id === newestOutboundId}
                    t={t}
                    language={language}
                    profileHref={profileHref}
                    onSendAgain={(body) =>
                      setRestored({ body, messageId: message.id, token: restoreSequence++ })
                    }
                  />
                ))}
              </ol>
            </>
          )}

          {/* §8.6.1 — **the composer at the foot**, sticky to the column's
              bottom edge so the thread scrolls behind it. `bg-background` is the
              page's own ground; nothing new is introduced to make it opaque. */}
          {typingLine !== null && (
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
              {t('conversations.typing', { name: typingLine.name })}
            </p>
          )}

          <div className="sticky bottom-0 mt-3 bg-background pb-1">
            <MessageComposer
              conversationId={id}
              channel={conversation.channel}
              t={t}
              templateSurface={
                conversation.channel === 'email' ? 'email' : conversation.channel === 'phone' ? null : 'chat'
              }
              refusal={composerRefusal}
              quietlyDisabled={thread.status === 'loading'}
              noteOnly={conversation.channel === 'phone'}
              /* §8.6.5 — the switch renders only where the conversation can
                 carry a second channel, which today is `chat` alone. */
              /* §8.6.5 — the switch renders only where the conversation can
                 carry a second channel, and it is now **computed** rather than
                 permanently refused: `ConversationParticipant.handles` answers
                 *"is there an email address on file?"* directly (**F-3, closed**).
                 Where there is one the toggle is live and its footer names the
                 address; where there is not, it is disabled in place with its
                 reason — which is D17 clause 2, a refusal at rest rather than a
                 send that fails at commit. */
              emailSwitch={
                conversation.channel === 'chat'
                  ? {
                      address: customerEmail,
                      refusal:
                        customerEmail === null ? t('conversations.composer.noHandle') : null,
                    }
                  : null
              }
              restored={restored}
              onSend={send}
              onRetry={retry}
            />
          </div>
        </div>
      }
      rail={[
        <CustomerCard
          key="customer"
          conversation={conversation}
          profileHref={profileHref}
          t={t}
        />,
        <ThisConversationCard
          key="conversation"
          conversation={conversation}
          now={now}
          t={t}
          language={language}
          ticketHref={ticketHref}
        />,
        <ElsewhereCard
          key="elsewhere"
          entityType={conversation.entityType}
          entityId={conversation.entityId}
        />,
        <HistoryCard key="history" conversation={conversation} t={t} language={language} />,
      ]}
    />
  )
}

/* Module-scoped so a remount cannot restart them mid-session and collide. */
let optimisticSequence = 1
let restoreSequence = 1

/**
 * The customer's address on one channel, or `null`.
 *
 * `handles` is the source of truth and `handle` is documented as its alias for
 * the conversation's own channel, so this reads the map and falls back to the
 * alias only for a participant a caller built by hand. **Both of the map's
 * absences collapse to `null`** — a missing key (*we never learned one*) and a
 * present `null` (*we looked and there is none*) — because §8.6.5 gives one
 * refusal sentence and the console refuses identically for both.
 */
function addressOn(
  participant: ConversationParticipant,
  channel: ConversationChannel,
): string | null {
  return participant.handles[channel] ?? null
}

/** Append by server id, once. See the two call sites for why both need it. */
function appendOnce(current: readonly Message[], message: Message): readonly Message[] {
  return current.some((each) => each.id === message.id) ? current : [...current, message]
}

/**
 * The bubble shown while the request is in flight. `id` is the client token, so
 * it is greppably not a `CMSG-` id and can never be mistaken for one that came
 * back from the seam.
 */
function pendingMessage(
  token: string,
  conversation: Conversation,
  body: string,
  visibility: MessageVisibility,
  currentUserId: string,
): Message {
  return {
    id: token,
    conversationId: conversation.id,
    channel: conversation.channel,
    direction: 'outbound',
    authorId: currentUserId,
    authorName: '',
    authorKind: 'operator',
    body,
    visibility,
    /* `deliveryIsWellFormed` — a note has no delivery, and an optimistic note
       must not invent the tick the real one will never carry. */
    delivery:
      visibility === 'internal'
        ? null
        : {
            state: 'queued',
            updatedAt: conversation.createdAt,
            failureCode: null,
            failureMessage: null,
            providerMessageId: null,
          },
    sentAt: conversation.createdAt,
    attachments: [],
    /* **Empty, not a copy of `delivery`.** `deliveryHistory` is the log of
       attempts the seam has actually made; an optimistic bubble has made none,
       and seeding it with the `queued` state above would put a fabricated
       attempt in a record whose whole purpose is to say what really happened.
       The real message replaces this one by server id (`appendOnce`), and its
       history arrives with it. */
    deliveryHistory: [],
    /* The *message's* subject, not the thread's — but on an email conversation
       the two are the same until an operator changes it, and the optimistic
       bubble should read the way the delivered one will. `null` off email,
       because chat has no subject and inventing one would put a line in the
       customer's inbox that nobody wrote. `messageSubjectIsWellFormed()` in
       `types/conversation.ts` is that invariant. */
    subject: conversation.channel === 'email' ? conversation.subject : null,
  }
}

/* ──────────────────────── §8.6.2 · the four shapes ─────────────────────── */

function MessageRow({
  message,
  previousChannel,
  conversationChannel,
  showsDelivery,
  t,
  language,
  profileHref,
  onSendAgain,
}: {
  message: Message
  previousChannel: ConversationChannel
  conversationChannel: ConversationChannel
  showsDelivery: boolean
  t: Translate
  language: Language
  profileHref: string
  onSendAgain: (body: string) => void
}) {
  const failed = message.delivery?.state === 'failed'
  /* §8.6.5 — the channel is named **only where it differs from the message
     above it**. Stamping every bubble turns a two-channel thread into a
     two-column report. */
  const channelChanged = message.channel !== previousChannel && message.channel !== conversationChannel

  const stamp = (
    <span className="text-xs text-muted-foreground">
      {message.authorName === '' ? null : `${message.authorName} · `}
      <bdi>{formatDate(message.sentAt, { style: 'time', language })}</bdi>
    </span>
  )

  /* ── shape 4 · system — centred, no ground, no author ───────────────── */
  if (message.authorKind === 'system') {
    return (
      <li className="text-center text-xs text-muted-foreground">{message.body}</li>
    )
  }

  /* ── shape 3 · the internal note — the only message that is not a bubble ─ */
  if (message.visibility === 'internal') {
    return (
      <li className="rounded-lg border border-border-control bg-muted p-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="neutral">{t('conversations.thread.internal')}</StatusBadge>
          {stamp}
          {/* **D-1 / §8.6.2** — the not-sent line is in the HEADER. The delivery
              position below stays EMPTY: not an em dash, not `Not sent`,
              nothing. An absence is the correct rendering of a fact that does
              not exist, and it is what separates this line from
              `Not delivered — …`, which means the opposite. */}
          <span className="text-xs text-muted-foreground">
            {t('conversations.thread.notSent')}
          </span>
        </div>
        <p className="mt-1 text-sm whitespace-pre-wrap text-foreground">{message.body}</p>
        <Attachments message={message} t={t} language={language} />
      </li>
    )
  }

  /* ── shapes 1 and 2 · the bubbles ───────────────────────────────────── */
  const outbound = message.direction === 'outbound'

  return (
    <li className={outbound ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
      {channelChanged && (
        <span className="mb-1 text-xs text-muted-foreground">
          {t('conversations.thread.sentBy', { channel: t(CHANNEL_KEY[message.channel]) })}
        </span>
      )}
      <div
        /* §8.6.7 — **a failed message loses its fill and becomes an outline.**
           It is the only bubble in the thread that does not sit on a surface,
           which reads, correctly, as *this did not land*. No red, no badge:
           R5a enumerates four uses of red and this is not one. */
        className={
          failed
            ? 'max-w-prose rounded-lg border border-border-control p-3'
            : outbound
              ? 'max-w-prose rounded-lg border border-border-control bg-card p-3'
              : 'max-w-prose rounded-lg bg-muted p-3'
        }
      >
        <p className="text-sm whitespace-pre-wrap text-foreground">{message.body}</p>
      </div>
      <div className={outbound ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
        {stamp}
        <Attachments message={message} t={t} language={language} />
        {/* §8.6.6 — the newest outbound customer-visible message, plus every
            failure. One word, no glyph, no timestamp. */}
        {message.delivery !== null && (showsDelivery || failed) && (
          <span className={failed ? 'text-xs text-foreground' : 'text-xs text-muted-foreground'}>
            {failed
              ? /* §8.6.7 / **D-3** — `failureMessage`, and **never
                   `failureCode`, not even as a fallback**: a code is a fact
                   about the software (D17 clause 1). With no message the line
                   is `Not delivered` alone. */
                message.delivery.failureMessage === null
                ? t('conversations.delivery.failed')
                : t('conversations.delivery.failedReason', {
                    reason: message.delivery.failureMessage,
                  })
              : t(DELIVERY_KEY[message.delivery.state])}
          </span>
        )}
        {failed && (
          <span className="mt-1 flex flex-wrap items-center gap-2">
            {/* §8.6.7 — **`Send again` restores the body into the composer,
                focused, caret at the end, and does not send.** The seam has no
                retry operation (**F-2**): calling `replyConversation` again
                would mint a second `CMSG` id and duplicate the body in the
                thread. One press from sending and one press from correcting is
                what a failed send actually needs — on `no_handle` an unchanged
                retry is guaranteed to fail again. */}
            <Button variant="secondary" size="xs" onClick={() => onSendAgain(message.body)}>
              {t('conversations.thread.sendAgain')}
            </Button>
            {message.delivery?.failureCode === 'no_handle' && (
              /* On `no_handle` only. It is the actual fix; offering only
                 `Send again` loops the operator through a refusal they cannot
                 clear from this screen. */
              <Button asChild variant="ghost" size="xs">
                <Link to={profileHref}>{t('conversations.thread.addEmail')}</Link>
              </Button>
            )}
          </span>
        )}
      </div>
    </li>
  )
}

function Attachments({
  message,
  t,
  language,
}: {
  message: Message
  t: Translate
  language: Language
}) {
  if (message.attachments.length === 0) return null
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {message.attachments.map((attachment) => (
        <li key={attachment.id}>
          <bdi>
            <StatusBadge tone="neutral">
              {/* **The size carries its unit, and it did not.** This read
                  `formatCount(bytes / 1024)` into `{filename} · {size}`, a key
                  that names no unit — so `report.pdf · 240` shipped, in both
                  languages, with nothing on the screen saying 240 of what.
                  `formatFileSize` is the product's one answer (`src/lib/format/
                  fileSize.ts`) and the unit is a dictionary key, never a literal
                  here (§9.6 / AC-75). The key itself is unchanged: the unit
                  belongs to the VALUE, or every sentence that mentions a size
                  would need a KB copy and an MB copy. */}
              {t('conversations.thread.attachment', {
                filename: attachment.filename,
                size: formatFileSize(attachment.sizeBytes, t, language),
              })}
            </StatusBadge>
          </bdi>
        </li>
      ))}
    </ul>
  )
}

/* ────────────────────────────── the rail ───────────────────────────────── */

/**
 * **Card order, and the reason for it** (`11-conversation-composer.md` §2).
 * `Customer` first — it is the thing the screen is about and the only card with
 * a link out of it. `This conversation` second: the countdown, the channel, the
 * holder and the ticket, i.e. everything *"can I act on this?"* is answered
 * with. `History` last: read after a surprise, not before an action.
 */
function CustomerCard({
  conversation,
  profileHref,
  t,
}: {
  conversation: Conversation
  profileHref: string
  t: Translate
}) {
  const customer = conversation.participants.find((party) => party.kind === 'customer') ?? null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{t('conversations.rail.customer')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <Link to={profileHref} className="rounded-sm font-medium text-foreground underline underline-offset-2">
          {conversation.entityName}
        </Link>
        <span className="text-xs text-muted-foreground">
          <bdi>{conversation.entityId}</bdi>
        </span>
        {/* `rtl.md` — a handle is a Latin run inside an Arabic paragraph and
            keeps its leading `+`. Isolated, or the `@` and the TLD reorder. */}
        {customer?.handle != null && (
          <span className="text-xs text-muted-foreground">
            <bdi>{customer.handle}</bdi>
          </span>
        )}
      </CardContent>
    </Card>
  )
}

function ThisConversationCard({
  conversation,
  now,
  t,
  language,
  ticketHref,
}: {
  conversation: Conversation
  now: IsoDateTime
  t: Translate
  language: Language
  ticketHref: (ticketId: string) => string
}) {
  const sla = conversationSla(conversation)
  const owner = conversationAssignee(conversation)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{t('conversations.rail.thisConversation')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {/* §8.4.2's countdown is a property of the work item and lives HERE, not
            in the header — the header already carries the status badge, and two
            clocks in two places is how a breach gets missed in both. */}
        {sla.paused ? (
          <span className="text-xs text-muted-foreground">{t('conversations.promise.paused')}</span>
        ) : sla.firstResponse === null && sla.resolution === null ? (
          <span className="text-xs text-muted-foreground">{t('conversations.promise.none')}</span>
        ) : (
          <div className="flex flex-col gap-2">
            {sla.firstResponse && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {t('conversations.promise.firstResponse')}
                </span>
                <SlaCell
                  result={queueClock(sla.firstResponse, now, {
                    terminal: sla.terminal || conversation.firstResponseAt !== null,
                  })}
                  dueAt={sla.firstResponse.dueAt}
                  t={t}
                  language={language}
                  promiseLabel={t('conversations.promise.firstResponse')}
                />
              </div>
            )}
            {sla.resolution && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {t('conversations.promise.resolution')}
                </span>
                <SlaCell
                  result={queueClock(sla.resolution, now, { terminal: sla.terminal })}
                  dueAt={sla.resolution.dueAt}
                  t={t}
                  language={language}
                  promiseLabel={t('conversations.promise.resolution')}
                />
              </div>
            )}
          </div>
        )}

        <span className="text-xs text-muted-foreground">
          <bdi>
            {t(
              conversation.messageCount === 1
                ? 'conversations.thread.count.one'
                : 'conversations.thread.count.other',
              { count: formatCount(conversation.messageCount, language) },
            )}
          </bdi>
        </span>

        {conversation.snoozedUntil !== null && (
          <span className="text-xs text-muted-foreground">
            <bdi>
              {t('conversations.rail.snoozed', {
                time: formatDate(conversation.snoozedUntil, { style: 'time', language }),
              })}
            </bdi>
          </span>
        )}

        <span className="text-xs text-muted-foreground">
          {owner === null
            ? t('queue.owner.unclaimed')
            : t('queue.owner.heldBy', { name: owner.name })}
        </span>

        {conversation.ticketId !== null && (
          <Link
            to={ticketHref(conversation.ticketId)}
            className="w-fit rounded-sm text-sm text-foreground underline underline-offset-2"
          >
            <bdi>{t('conversations.ticket.open', { id: conversation.ticketId })}</bdi>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Claims, take-overs and transfers. The `ClaimTakeover` list is the audit trail
 * `transferConversation` writes into, so a hand-off is readable here rather than
 * only in the thread's system note.
 */
function HistoryCard({
  conversation,
  t,
  language,
}: {
  conversation: Conversation
  t: Translate
  language: Language
}) {
  const claim = conversation.claim
  const takeovers = claim?.takeovers ?? []

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{t('conversations.rail.history')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-xs text-muted-foreground">
        {takeovers.map((takeover, index) => (
          <span key={`${takeover.at}-${index}`}>
            <bdi>
              {t('conversations.rail.handover', {
                from: takeover.fromUserName,
                to: takeover.toUserName,
                date: formatDate(takeover.at, { style: 'day-month-time', language }),
              })}
            </bdi>
          </span>
        ))}
        {claim !== null && (
          <span>
            <bdi>
              {t('conversations.rail.claimed', {
                name: claim.ownerName,
                date: formatDate(claim.claimedAt, { style: 'day-month-time', language }),
              })}
            </bdi>
          </span>
        )}
        <span>
          <bdi>
            {t('conversations.rail.opened', {
              date: formatDate(conversation.createdAt, { style: 'day-month-time', language }),
            })}
          </bdi>
        </span>
      </CardContent>
    </Card>
  )
}
