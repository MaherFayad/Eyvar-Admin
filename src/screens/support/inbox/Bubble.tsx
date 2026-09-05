/**
 * One bubble (design 12 §4.2). Customer inline-start on `--ev-bubble-in`,
 * operator inline-end on `--ev-bubble-out`; no border, radius 8, the corner
 * nearest the avatar squared on a group's first bubble. A failed message is an
 * outline with words, never red (§8.6.7). Time on the last bubble always, on
 * the rest by hover or focus-within plus a visually hidden copy (§10 row 10).
 */

import { Link } from 'react-router-dom'
import type { Message } from '@/data/types'
import { formatDate, formatFileSize, type Language, type Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'
import { CHANNEL_KEY } from '../conversations/vocabulary'
import { DeliveryLine } from './DeliveryLine'

export interface BubbleProps {
  message: Message
  outbound: boolean
  first: boolean
  last: boolean
  /** §8.6.6: the newest outbound customer-visible message, or any failure. */
  showsDelivery: boolean
  /** §8.6.5: named only where the channel differs from the message above. */
  channelChanged: boolean
  t: Translate
  language: Language
  profileHref: string
  onSendAgain: (body: string, messageId: string) => void
}

export function Bubble({
  message,
  outbound,
  first,
  last,
  showsDelivery,
  channelChanged,
  t,
  language,
  profileHref,
  onSendAgain,
}: BubbleProps) {
  const failed = message.delivery?.state === 'failed'
  const time = formatDate(message.sentAt, { style: 'time', language })

  return (
    <li className={cn('group/bubble flex max-w-full flex-col gap-1', outbound ? 'items-end' : 'items-start')}>
      {channelChanged && (
        <span className="text-xs text-muted-foreground">
          {t('conversations.thread.sentBy', { channel: t(CHANNEL_KEY[message.channel]) })}
        </span>
      )}
      <div className={cn('flex max-w-full items-end gap-2', outbound && 'flex-row-reverse')}>
        <div
          className={cn(
            'max-w-2/3 rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
            failed
              ? 'border border-border-control text-foreground'
              : outbound
                ? 'bg-bubble-out text-bubble-out-ink'
                : 'bg-bubble-in text-foreground',
            first && (outbound ? 'rounded-se-sm' : 'rounded-ss-sm'),
          )}
        >
          {message.body}
        </div>
        <span
          className={cn(
            'shrink-0 text-xs text-muted-foreground tabular-nums',
            !last && 'opacity-0 group-hover/bubble:opacity-100 group-focus-within/bubble:opacity-100',
          )}
        >
          <span className="sr-only">{t('inbox.thread.sentAt', { time })}</span>
          <bdi aria-hidden="true">{time}</bdi>
        </span>
      </div>
      {message.attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {message.attachments.map((attachment) => (
            <li key={attachment.id}>
              <bdi>
                <StatusBadge tone="neutral">
                  {t('conversations.thread.attachment', {
                    filename: attachment.filename,
                    size: formatFileSize(attachment.sizeBytes, t, language),
                  })}
                </StatusBadge>
              </bdi>
            </li>
          ))}
        </ul>
      )}
      {message.delivery !== null && (showsDelivery || failed) && (
        <DeliveryLine delivery={message.delivery} t={t} />
      )}
      {failed && (
        <span className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="xs" onClick={() => onSendAgain(message.body, message.id)}>
            {t('conversations.thread.sendAgain')}
          </Button>
          {message.delivery?.failureCode === 'no_handle' && (
            <Button asChild variant="ghost" size="xs">
              <Link to={profileHref}>{t('conversations.thread.addEmail')}</Link>
            </Button>
          )}
        </span>
      )}
    </li>
  )
}
