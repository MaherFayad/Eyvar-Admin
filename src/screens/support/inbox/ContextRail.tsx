/**
 * Pane C (design 12 §6): Customer, This conversation, then Elsewhere and
 * History as collapsibles with a count in the heading. Nothing here is a
 * primary (§2.2). Collapsed at 40px it is one icon button (`inbox.rail.show`).
 */

import { useState } from 'react'
import type { Conversation } from '@/data/types'
import { formatCount, formatDate, type Direction, type Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/StatusBadge'
import { ChevronDownIcon, ChevronRightIcon, nextIcon, previousIcon } from '@/components/icons'
import { ElsewhereCard } from '../shared/ElsewhereCard'
import { CustomerCard, type CustomerCardProps } from './CustomerCard'
import { ThreadCard, type ThreadCardProps } from './ThreadCard'

export interface ContextRailProps extends Omit<CustomerCardProps, 'conversation'>, Omit<ThreadCardProps, 'conversation'> {
  /** `null` while the conversation is still loading: three skeleton lines per card. */
  conversation: Conversation | null
  dir: Direction
  /** Per-section collapse, remembered per operator (D16 class 2). */
  sections: { elsewhere: boolean; history: boolean }
  onToggleSection: (section: 'elsewhere' | 'history') => void
}

export function ContextRail(props: ContextRailProps) {
  const { conversation, t, language, sections, onToggleSection } = props

  if (conversation === null) {
    return (
      <div className="flex flex-col gap-3 p-3" aria-busy="true">
        {[0, 1].map((card) => (
          <div key={card} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  const takeovers = conversation.claim?.takeovers ?? []
  const historyCount = takeovers.length + (conversation.claim === null ? 0 : 1) + 1

  return (
    <div className="flex flex-col gap-3 p-3">
      <CustomerCard
        conversation={conversation}
        profileHref={props.profileHref}
        t={t}
        onCreateTicket={props.onCreateTicket}
        createTicketRefusal={props.createTicketRefusal}
        reasonId={props.reasonId}
      />
      <ThreadCard
        conversation={conversation}
        now={props.now}
        t={t}
        language={language}
        currentUserId={props.currentUserId}
        ticketHref={props.ticketHref}
        canWrite={props.canWrite}
        claimRefusal={props.claimRefusal}
        onClaim={props.onClaim}
        onRelease={props.onRelease}
        onTakeOver={props.onTakeOver}
      />
      {(conversation.entityType === 'rider' || conversation.entityType === 'driver') && (
        <Section
          open={!sections.elsewhere}
          onToggle={() => onToggleSection('elsewhere')}
          heading={t('inbox.rail.elsewhere')}
        >
          <ElsewhereCard entityType={conversation.entityType} entityId={conversation.entityId} />
        </Section>
      )}
      <Section
        open={!sections.history}
        onToggle={() => onToggleSection('history')}
        heading={t('conversations.rail.history')}
        count={formatCount(historyCount, language)}
      >
        <ol className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          {takeovers.map((takeover, index) => (
            <li key={`${takeover.at}-${index}`}>
              <bdi>
                {t('conversations.rail.handover', {
                  from: takeover.fromUserName,
                  to: takeover.toUserName,
                  date: formatDate(takeover.at, { style: 'day-month-time', language }),
                })}
              </bdi>
            </li>
          ))}
          {conversation.claim !== null && (
            <li>
              <bdi>
                {t('conversations.rail.claimed', {
                  name: conversation.claim.ownerName,
                  date: formatDate(conversation.claim.claimedAt, { style: 'day-month-time', language }),
                })}
              </bdi>
            </li>
          )}
          <li>
            <bdi>
              {t('conversations.rail.opened', {
                date: formatDate(conversation.createdAt, { style: 'day-month-time', language }),
              })}
            </bdi>
          </li>
        </ol>
      </Section>
    </div>
  )
}

function Section({
  open,
  onToggle,
  heading,
  count,
  children,
}: {
  open: boolean
  onToggle: () => void
  heading: string
  count?: string
  children: React.ReactNode
}) {
  const Chevron = open ? ChevronDownIcon : ChevronRightIcon
  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="default" className="w-full justify-start gap-1 px-2 text-xs font-semibold text-muted-foreground">
          <Chevron />
          <span className="min-w-0 flex-1 truncate text-start">{heading}</span>
          {count !== undefined && <StatusBadge tone="neutral">{count}</StatusBadge>}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1">{children}</CollapsibleContent>
    </Collapsible>
  )
}

/** The 40px strip: one icon-only ghost that opens the rail (§5.7 names it by tooltip). */
export function RailToggle({
  collapsed,
  onToggle,
  dir,
  t,
}: {
  collapsed: boolean
  onToggle: () => void
  dir: Direction
  t: Translate
}) {
  const [open, setOpen] = useState(false)
  const Icon = collapsed ? previousIcon(dir) : nextIcon(dir)
  const label = t(collapsed ? 'inbox.rail.show' : 'inbox.rail.hide')
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} aria-expanded={!collapsed} onClick={onToggle}>
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
