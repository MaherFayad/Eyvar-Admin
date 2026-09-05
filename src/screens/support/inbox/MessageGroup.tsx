/**
 * A sender group (design 12 §4.2): one 24px avatar at the top, one name line,
 * bubbles at gap 4. The operator's own group mirrors to inline-end and its
 * name line reads `{name} (you)`.
 */

import type { ConversationChannel, Message } from '@/data/types'
import type { MessageGroup as Group } from '@/lib'
import type { Language, Translate } from '@/lib'
import { Avatar } from '@/components/Avatar'
import { cn } from '@/lib/utils'
import { Bubble } from './Bubble'

export interface MessageGroupProps {
  group: Group<Message>
  currentUserId: string
  /** The channel of the message just above this group, for §8.6.5. */
  previousChannel: ConversationChannel
  conversationChannel: ConversationChannel
  newestOutboundId: string | null
  t: Translate
  language: Language
  profileHref: string
  onSendAgain: (body: string, messageId: string) => void
}

export function MessageGroup({
  group,
  currentUserId,
  previousChannel,
  conversationChannel,
  newestOutboundId,
  t,
  language,
  profileHref,
  onSendAgain,
}: MessageGroupProps) {
  const head = group.messages[0]
  if (head === undefined) return null
  const outbound = head.direction === 'outbound'
  const self = head.authorId === currentUserId
  const name = self && head.authorName !== '' ? t('inbox.thread.you', { name: head.authorName }) : head.authorName

  return (
    <li className={cn('flex items-start gap-2', outbound && 'flex-row-reverse')}>
      <Avatar name={head.authorName} size="sm" className="mt-5" />
      <div className={cn('flex min-w-0 flex-1 flex-col gap-1', outbound ? 'items-end' : 'items-start')}>
        {name !== '' && <span className="text-xs font-semibold text-foreground">{name}</span>}
        <ol className={cn('flex w-full flex-col gap-1', outbound ? 'items-end' : 'items-start')}>
          {group.messages.map((message, index) => {
            const above = index === 0 ? previousChannel : group.messages[index - 1]?.channel ?? previousChannel
            return (
              <Bubble
                key={message.id}
                message={message}
                outbound={outbound}
                first={index === 0}
                last={index === group.messages.length - 1}
                showsDelivery={message.id === newestOutboundId}
                channelChanged={message.channel !== above && message.channel !== conversationChannel}
                t={t}
                language={language}
                profileHref={profileHref}
                onSendAgain={onSendAgain}
              />
            )
          })}
        </ol>
      </div>
    </li>
  )
}
