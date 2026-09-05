/**
 * Pane C's Customer card (design 12 §6): avatar, name to the 360° layer, id
 * and every channel handle in `<bdi>` (§9.4), then the two links out. Plan
 * and city render only when a resolved summary carries them (R5-1: never an
 * em dash); the seam has none today, so neither row exists yet.
 */

import { Link } from 'react-router-dom'
import type { Conversation, ConversationChannel } from '@/data/types'
import type { Translator } from '@/lib'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/Avatar'
import { CHANNEL_KEY } from './vocabulary'

export interface CustomerCardProps {
  conversation: Conversation
  profileHref: string
  t: Translator
  onCreateTicket: () => void
  createTicketRefusal: string | null
  /** The header's one reason line, so a refused control here can point at it. */
  reasonId: string
}

export function CustomerCard({ conversation, profileHref, t, onCreateTicket, createTicketRefusal, reasonId }: CustomerCardProps) {
  const customer = conversation.participants.find((party) => party.kind === 'customer') ?? null
  const handles = customer === null ? [] : (Object.entries(customer.handles) as [ConversationChannel, string | null][])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('conversations.rail.customer')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Avatar name={conversation.entityName} />
          <div className="flex min-w-0 flex-col">
            <Link
              to={profileHref}
              className="truncate rounded-sm text-sm font-medium text-foreground underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              {conversation.entityName}
            </Link>
            <span className="text-xs text-muted-foreground">
              <bdi>{conversation.entityId}</bdi>
            </span>
          </div>
        </div>
        {handles.length > 0 && (
          <dl className="flex flex-col gap-1 text-xs">
            {handles.map(([channel, handle]) =>
              handle === null ? null : (
                <div key={channel} className="flex items-center gap-2">
                  <dt className="text-muted-foreground">{t(CHANNEL_KEY[channel])}</dt>
                  <dd className="min-w-0 truncate text-foreground">
                    <bdi>{handle}</bdi>
                  </dd>
                </div>
              ),
            )}
          </dl>
        )}
        <div className="flex flex-wrap gap-1">
          <Button asChild variant="ghost" size="xs">
            <Link to={profileHref}>{t('inbox.customer.open')}</Link>
          </Button>
          <Button
            variant="ghost"
            size="xs"
            disabled={createTicketRefusal !== null}
            aria-describedby={createTicketRefusal !== null ? reasonId : undefined}
            onClick={onCreateTicket}
          >
            {t('conversations.ticket.create')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
