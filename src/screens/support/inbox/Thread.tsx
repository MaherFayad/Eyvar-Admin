/**
 * Pane B's thread (design 12 §4.2, §4.3): day dividers, sender groups, notes
 * and system lines from `groupMessages`; opens at the bottom and sticks there
 * within 48px, otherwise the `↓ N new` pill. Four states (§4.4). Key it on the
 * conversation id so a switch mounts fresh.
 */

import { useEffect, useMemo, useRef } from 'react'
import type { ConversationChannel, IsoDateTime, Message } from '@/data/types'
import { groupMessages, type Language, type ThreadItem, type Translate } from '@/lib'
import { useStickToBottom } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ErrorState'
import { MoveDownIcon } from '@/components/icons'
import { DayDivider } from './DayDivider'
import { MessageGroup } from './MessageGroup'
import { NoteBlock } from './NoteBlock'
import { SystemLine } from './SystemLine'

export type ThreadStatus = 'loading' | 'error' | 'content'

export interface ThreadProps {
  status: ThreadStatus
  messages: readonly Message[]
  /** `true` when the loaded window is smaller than the thread. */
  hasEarlier: boolean
  onLoadEarlier: () => void
  onRetry: () => void
  /** Called when the thread reaches or sits at its bottom with a pending arrival. */
  onReachBottom: () => void
  conversationChannel: ConversationChannel
  currentUserId: string
  customerName: string
  typingBy: string | null
  now: IsoDateTime
  t: Translate
  language: Language
  profileHref: string
  onSendAgain: (body: string, messageId: string) => void
}

export function Thread({
  status,
  messages,
  hasEarlier,
  onLoadEarlier,
  onRetry,
  onReachBottom,
  conversationChannel,
  currentUserId,
  customerName,
  typingBy,
  now,
  t,
  language,
  profileHref,
  onSendAgain,
}: ThreadProps) {
  const scroller = useRef<HTMLDivElement | null>(null)
  const newestId = messages[messages.length - 1]?.id ?? null
  const { pinned, pendingCount, scrollToBottom } = useStickToBottom(scroller, [newestId])

  const items = useMemo(() => groupMessages(messages), [messages])

  const newestOutboundId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i]
      if (message && message.direction === 'outbound' && message.visibility === 'customer') return message.id
    }
    return null
  }, [messages])

  /* §4.3: an arrival read at the bottom is read; the pill's press marks it. */
  useEffect(() => {
    if (pinned && newestId !== null) onReachBottom()
  }, [pinned, newestId, onReachBottom])

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        role="region"
        aria-label={t('inbox.thread.label', { name: customerName })}
        aria-busy={status === 'loading' ? true : undefined}
        tabIndex={-1}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
      >
        {status === 'loading' && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-64 self-start rounded-lg" />
            <Skeleton className="h-12 w-72 self-end rounded-lg" />
            <Skeleton className="h-12 w-56 self-start rounded-lg" />
          </div>
        )}

        {status === 'error' && (
          <ErrorState
            scope="card"
            message={t('conversations.thread.error')}
            action={{ label: t('conversations.thread.retry'), onClick: onRetry }}
          />
        )}

        {status === 'content' && messages.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">{t('conversations.thread.empty')}</p>
        )}

        {status === 'content' && messages.length > 0 && (
          <>
            {hasEarlier && (
              <div className="flex justify-center pb-3">
                <Button variant="secondary" size="xs" onClick={onLoadEarlier}>
                  {t('conversations.thread.loadEarlier')}
                </Button>
              </div>
            )}
            <ol className="flex flex-col gap-4">
              {items.map((item, index) => {
                if (item.kind === 'day') {
                  return <DayDivider key={`day-${item.date}`} date={item.date} now={now} t={t} language={language} />
                }
                const head = item.messages[0]
                if (head === undefined) return null
                if (head.authorKind === 'system') {
                  return <SystemLine key={head.id} message={head} t={t} language={language} />
                }
                if (item.visibility === 'internal') {
                  return <NoteBlock key={head.id} message={head} t={t} language={language} />
                }
                return (
                  <MessageGroup
                    key={head.id}
                    group={item}
                    currentUserId={currentUserId}
                    previousChannel={channelBefore(items, index) ?? conversationChannel}
                    conversationChannel={conversationChannel}
                    newestOutboundId={newestOutboundId}
                    t={t}
                    language={language}
                    profileHref={profileHref}
                    onSendAgain={onSendAgain}
                  />
                )
              })}
            </ol>
          </>
        )}
      </div>

      {typingBy !== null && (
        <p className="px-4 pb-1 text-xs text-muted-foreground" aria-live="polite">
          {t('conversations.typing', { name: typingBy })}
        </p>
      )}

      {/* §4.3: centred 12px above the composer, polite. No elevation — owner
          ruling: separation is the value step and the hairline, never a shadow. */}
      {!pinned && pendingCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <Button
            variant="secondary"
            size="xs"
            className="pointer-events-auto"
            aria-live="polite"
            aria-label={t('inbox.thread.new.label')}
            onClick={scrollToBottom}
          >
            <MoveDownIcon />
            {t(pendingCount === 1 ? 'inbox.thread.new#one' : 'inbox.thread.new#other', { count: pendingCount })}
          </Button>
        </div>
      )}
    </div>
  )
}

/** The channel of the last message before `index`, or `null` at the top. */
function channelBefore(items: readonly ThreadItem<Message>[], index: number): ConversationChannel | null {
  for (let i = index - 1; i >= 0; i -= 1) {
    const item = items[i]
    if (item && item.kind === 'group') {
      const tail = item.messages[item.messages.length - 1]
      if (tail) return tail.channel
    }
  }
  return null
}
