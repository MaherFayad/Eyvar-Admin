/**
 * The open thread's data (design 12 §4, design 11 §6): one page of messages
 * newest-first from the seam, reversed to read oldest-first, folded with what
 * the subscription delivered and what is still in flight. Optimistic bubbles
 * are keyed by a client token and replaced by server id (`appendOnce`).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DATA_SOURCE,
  advanceRealtime,
  listConversationMessages,
  replyConversation,
  retryMessage,
  subscribeToConversation,
} from '@/data/clients'
import type { Conversation, Message, MessageDelivery, MessageVisibility, Paginated } from '@/data/types'
import { TYPING_TTL_SECONDS } from '@/data/types'
import { useAsync, useTick } from '@/hooks'
import type { ThreadStatus } from './Thread'

const THREAD_PAGE = 20

export interface ThreadModel {
  status: ThreadStatus
  messages: readonly Message[]
  hasEarlier: boolean
  loadEarlier: () => void
  refetch: () => void
  typingBy: string | null
  restored: { body: string; messageId: string; token: number } | null
  restore: (body: string, messageId: string) => void
  send: (input: { body: string; visibility: MessageVisibility; byEmail: boolean }) => Promise<Message>
  retry: (messageId: string) => Promise<Message>
}

export function useThread(conversation: Conversation | null, currentUserId: string): ThreadModel {
  const id = conversation?.id ?? null
  const [windowSize, setWindowSize] = useState(THREAD_PAGE)
  const [restored, setRestored] = useState<ThreadModel['restored']>(null)
  const [optimistic, setOptimistic] = useState<ReadonlyArray<{ token: string; message: Message }>>([])
  const [live, setLive] = useState<ReadonlyArray<Message>>([])
  const [deliveries, setDeliveries] = useState<ReadonlyMap<string, MessageDelivery>>(() => new Map())
  const [typingBy, setTypingBy] = useState<{ name: string; receivedAt: number } | null>(null)

  useEffect(() => {
    setWindowSize(THREAD_PAGE)
    setRestored(null)
    setOptimistic([])
    setLive([])
    setDeliveries(new Map())
    setTypingBy(null)
  }, [id])

  const thread = useAsync<Paginated<Message>>(
    (signal) => listConversationMessages(id as string, { page: 1, pageSize: windowSize }, signal),
    { deps: [id, windowSize], enabled: id !== null },
  )

  useEffect(() => {
    if (id === null) return undefined
    return subscribeToConversation(id, (event) => {
      if (event.type === 'message.created') {
        setLive((current) => appendOnce(current, event.message))
      } else if (event.type === 'message.delivery') {
        setDeliveries((current) => new Map(current).set(event.messageId, event.delivery))
      } else if (event.type === 'typing' && event.typing.actorId !== currentUserId) {
        setTypingBy(event.typing.typing ? { name: event.typing.actorName, receivedAt: Date.now() } : null)
      }
    })
  }, [id, currentUserId])

  /* The mock transport advances on the shared tick (AC-28); nothing outside mock mode. */
  const tick = useTick(1, DATA_SOURCE === 'mock')
  useEffect(() => {
    if (DATA_SOURCE === 'mock') advanceRealtime(2)
  }, [tick])

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

  const send = useCallback<ThreadModel['send']>(
    async ({ body, visibility, byEmail }) => {
      if (conversation === null) throw new Error('No conversation is open')
      const token = `local:${optimisticSequence++}`
      setOptimistic((current) => [
        ...current,
        { token, message: pendingMessage(token, conversation, body, visibility, currentUserId) },
      ])
      try {
        const accepted = await replyConversation(conversation.id, {
          body,
          visibility,
          channel: byEmail && visibility === 'customer' ? 'email' : undefined,
        })
        setOptimistic((current) => current.filter((entry) => entry.token !== token))
        setLive((current) => appendOnce(current, accepted))
        return accepted
      } catch (error) {
        setOptimistic((current) => current.filter((entry) => entry.token !== token))
        throw error
      }
    },
    [conversation, currentUserId],
  )

  const retry = useCallback<ThreadModel['retry']>(
    async (messageId) => {
      if (id === null) throw new Error('No conversation is open')
      const accepted = await retryMessage(id, messageId)
      if (accepted.delivery !== null) {
        const moved = accepted.delivery
        setDeliveries((current) => new Map(current).set(messageId, moved))
      }
      return accepted
    },
    [id],
  )

  const typing =
    typingBy !== null && Date.now() - typingBy.receivedAt < TYPING_TTL_SECONDS * 1000 && tick >= 0
      ? typingBy.name
      : null

  return {
    status: thread.status === 'loading' ? 'loading' : thread.status === 'error' ? 'error' : 'content',
    messages,
    hasEarlier: windowSize < (thread.data?.total ?? 0),
    loadEarlier: () => setWindowSize((current) => current + THREAD_PAGE),
    refetch: thread.refetch,
    typingBy: typing,
    restored,
    restore: (body, messageId) => setRestored({ body, messageId, token: restoreSequence++ }),
    send,
    retry,
  }
}

let optimisticSequence = 1
let restoreSequence = 1

function appendOnce(current: readonly Message[], message: Message): readonly Message[] {
  return current.some((each) => each.id === message.id) ? current : [...current, message]
}

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
    deliveryHistory: [],
    subject: conversation.channel === 'email' ? conversation.subject : null,
  }
}
