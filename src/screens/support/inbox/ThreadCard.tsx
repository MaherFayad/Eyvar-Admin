/**
 * Pane C's This conversation card (design 12 §6): a clock row only where a
 * clock exists (Q-CC4, never `No clock`), snoozed pauses both, the linked or
 * overdue ticket (AC-964), the holder through `OwnerChip`, and the count from
 * `messageCount` (AC-938).
 */

import { Link } from 'react-router-dom'
import { conversationAssignee } from '@/data/clients'
import type { Conversation, IsoDateTime } from '@/data/types'
import { formatCount, formatDate, type Language, type Translator } from '@/lib'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OwnerChip, SlaCell, queueClock } from '@/screens/queues'
import { conversationSla } from './sla'

export interface ThreadCardProps {
  conversation: Conversation
  now: IsoDateTime
  t: Translator
  language: Language
  currentUserId: string
  ticketHref: (ticketId: string) => string
  canWrite: boolean
  /** The sentence for a refused claim: the cap or the missing permission. */
  claimRefusal: string
  onClaim: () => void
  onRelease: () => void
  onTakeOver: () => void
}

export function ThreadCard({
  conversation,
  now,
  t,
  language,
  currentUserId,
  ticketHref,
  canWrite,
  claimRefusal,
  onClaim,
  onRelease,
  onTakeOver,
}: ThreadCardProps) {
  const sla = conversationSla(conversation)
  const owner = conversationAssignee(conversation)
  const heldByMe = owner !== null && owner.id === currentUserId

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('conversations.rail.thisConversation')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        {sla.paused ? (
          <span className="text-muted-foreground">
            {conversation.snoozedUntil === null ? (
              t('conversations.promise.paused')
            ) : (
              <bdi>
                {t('conversations.rail.snoozed', {
                  time: formatDate(conversation.snoozedUntil, { style: 'time', language }),
                })}
              </bdi>
            )}
          </span>
        ) : (
          <>
            {/* An answered promise has nothing left to count; `No clock` never renders (Q-CC4). */}
            {sla.firstResponse !== null && conversation.firstResponseAt === null && (
              <ClockRow
                label={t('conversations.promise.firstResponse')}
                result={queueClock(sla.firstResponse, now, { terminal: sla.terminal })}
                dueAt={sla.firstResponse.dueAt}
                t={t}
                language={language}
              />
            )}
            {sla.resolution !== null && (
              <ClockRow
                label={t('conversations.promise.resolution')}
                result={queueClock(sla.resolution, now, { terminal: sla.terminal })}
                dueAt={sla.resolution.dueAt}
                t={t}
                language={language}
              />
            )}
          </>
        )}

        {conversation.ticketId !== null ? (
          <Link
            to={ticketHref(conversation.ticketId)}
            className="w-fit rounded-sm text-foreground underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <bdi>{t('conversations.ticket.open', { id: conversation.ticketId })}</bdi>
          </Link>
        ) : sla.resolutionBreached && heldByMe ? (
          <span className="text-foreground">{t('conversations.ticket.overdue')}</span>
        ) : null}

        <OwnerChip
          claim={conversation.claim}
          currentUserId={currentUserId}
          now={now}
          t={t}
          canWrite={canWrite}
          disabledReason={claimRefusal}
          onClaim={onClaim}
          onRelease={onRelease}
          onTakeOver={onTakeOver}
        />

        <span className="text-muted-foreground">
          <bdi>
            {t(conversation.messageCount === 1 ? 'conversations.thread.count.one' : 'conversations.thread.count.other', {
              count: formatCount(conversation.messageCount, language),
            })}
          </bdi>
        </span>
      </CardContent>
    </Card>
  )
}

function ClockRow({
  label,
  result,
  dueAt,
  t,
  language,
}: {
  label: string
  result: ReturnType<typeof queueClock>
  dueAt: IsoDateTime | null
  t: Translator
  language: Language
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <SlaCell result={result} dueAt={dueAt} t={t} language={language} promiseLabel={label} />
    </div>
  )
}
