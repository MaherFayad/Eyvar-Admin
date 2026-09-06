/**
 * One list row (design 12 §3.1, §3.2): a 60px `<a>` to the conversation.
 * A first-response breach is carried by the SLA pill's words and by the row's
 * place at the top of the queue — there is no red edge. Unread dot plus
 * weight 600, channel glyph on the avatar, one pill at most, preview tinted by
 * author, the holder as a 20px mark. The checkbox is a sibling, never
 * hover-only (§7.3).
 */

import { Link } from 'react-router-dom'
import type { IsoDateTime } from '@/data/types'
import { formatDate, type Language, type Translate } from '@/lib'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar } from '@/components/Avatar'
import { SlaCell } from '@/screens/queues'
import { cn } from '@/lib/utils'
import { conversationAssignee } from '@/data/clients'
import { runningClock } from './sla'
import type { InboxRow } from './order'

export interface ConversationListItemProps {
  row: InboxRow
  href: string
  selected: boolean
  /** Roving tabindex: exactly one row is in the tab order. */
  tabbable: boolean
  checked: boolean
  /** While any row is checked the checkbox stays in place of the avatar. */
  checking: boolean
  onCheckedChange: (checked: boolean) => void
  currentUserId: string
  now: IsoDateTime
  t: Translate
  language: Language
}

export function ConversationListItem({
  row,
  href,
  selected,
  tabbable,
  checked,
  checking,
  onCheckedChange,
  currentUserId,
  now,
  t,
  language,
}: ConversationListItemProps) {
  const { conversation, sla } = row
  const unread = conversation.unreadCount > 0 && !selected
  const owner = conversationAssignee(conversation)
  const running = runningClock(conversation, sla, now)
  const showsPill =
    conversation.status !== 'snoozed' &&
    running.result.clock.kind !== 'no-clock' &&
    !running.result.deadlinePassedUnbroken
  const ours = conversation.lastMessageAuthorKind !== null && conversation.lastMessageAuthorKind !== 'customer'

  return (
    <li className={cn('group/row relative', (selected || checked) && 'bg-muted', 'hover:bg-muted')}>
      {selected && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-0 w-marker bg-foreground" />
      )}
      <Link
        to={href}
        data-inbox-row=""
        data-id={conversation.id}
        tabIndex={tabbable ? 0 : -1}
        aria-current={selected ? 'page' : undefined}
        className="flex h-row-media items-center gap-2 ps-3 pe-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none"
      >
        <span
          aria-hidden="true"
          className={cn('size-2 shrink-0 rounded-full', unread ? 'bg-primary' : 'bg-transparent')}
        />
        <span
          className={cn(
            'shrink-0 transition-opacity',
            checking
              ? 'opacity-0'
              : 'group-hover/row:opacity-0 group-focus-within/row:opacity-0',
          )}
        >
          <Avatar name={conversation.entityName} channel={conversation.channel} />
        </span>
        {/* gap-0.5: the name and the preview sat on one another at gap 0. The
            row's own height is the token, so the pitch is unchanged (§3.1). */}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className={cn('min-w-0 flex-1 truncate text-sm text-foreground', unread ? 'font-semibold' : 'font-medium')}>
              {conversation.entityName}
            </span>
            {unread && <span className="sr-only">{t('conversations.a11y.unread', { count: conversation.unreadCount })}</span>}
            <span className="shrink-0">
              {conversation.status === 'snoozed' && conversation.snoozedUntil !== null ? (
                <span className="text-2xs text-muted-foreground">
                  <bdi>
                    {t('conversations.rail.snoozed', {
                      time: formatDate(conversation.snoozedUntil, { style: 'time', language }),
                    })}
                  </bdi>
                </span>
              ) : showsPill ? (
                <SlaCell
                  result={running.result}
                  dueAt={running.input?.dueAt ?? null}
                  t={t}
                  language={language}
                  promiseLabel={t(
                    running.promise === 'first-response'
                      ? 'conversations.promise.firstResponse'
                      : 'conversations.promise.resolution',
                  )}
                />
              ) : conversation.lastMessageAt !== null ? (
                <span className="text-2xs text-muted-foreground tabular-nums">
                  <span className="sr-only">
                    {t('inbox.row.age', {
                      age: formatDate(conversation.lastMessageAt, { style: 'relative', now, t, language }),
                    })}
                  </span>
                  <bdi aria-hidden="true">
                    {formatDate(conversation.lastMessageAt, { style: 'relative', now, t, language })}
                  </bdi>
                </span>
              ) : null}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className={cn('min-w-0 flex-1 truncate text-xs', ours ? 'text-muted-foreground' : 'text-foreground')}>
              {conversation.lastMessagePreview ?? t('conversations.preview.none')}
            </span>
            {owner !== null && (
              <Avatar
                name={owner.name}
                size="xs"
                label={owner.id === currentUserId ? t('inbox.row.yours') : t('queue.owner.heldBy', { name: owner.name })}
              />
            )}
          </span>
        </span>
      </Link>
      {/* §7.3: shown on hover, on focus and while any row is checked; a sibling of the link. */}
      <span
        className={cn(
          'absolute top-1/2 start-8 -translate-y-1/2 transition-opacity',
          checking
            ? 'opacity-100'
            : 'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100',
        )}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={(next) => onCheckedChange(next === true)}
          aria-label={t('inbox.row.select', { name: conversation.entityName })}
          tabIndex={-1}
          className="size-4"
        />
      </span>
    </li>
  )
}
