/**
 * Pane B's header (design 12 §4.1): 60px, avatar, name as a link to the 360°
 * layer, channel · status · the one running clock, then the actions. `Claim`,
 * `Take over` and `Reopen` are the only filled buttons; while held, `Send` is
 * the screen's (§8.6, R2). The rest overflow into `⋯` as §4.1's table splits
 * them. A refusal renders once beneath, pointed at by every refused control (§8.6.8).
 */

import { Link } from 'react-router-dom'
import type { Conversation, IsoDateTime } from '@/data/types'
import type { Direction, Language, Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar } from '@/components/Avatar'
import { StatusBadge } from '@/components/StatusBadge'
import { ChatIcon, EmailIcon, InfoIcon, MoreIcon, PhoneIcon, WhatsAppIcon, backIcon } from '@/components/icons'
import { SlaCell } from '@/screens/queues'
import { conversationSla, runningClock } from '../conversations/sla'
import { CHANNEL_KEY, STATUS_KEY, STATUS_TONE } from '../conversations/vocabulary'

export interface HeaderAction {
  id: string
  label: string
  onClick: () => void
  /** The reason it is refused, or `null` when live. */
  refusal: string | null
}

export interface ThreadHeaderProps {
  conversation: Conversation
  now: IsoDateTime
  t: Translate
  language: Language
  dir: Direction
  profileHref: string
  /** In §4.1's order. The first is filled when `filledFirst`. */
  visible: readonly HeaderAction[]
  filledFirst: boolean
  overflow: readonly HeaderAction[]
  /** Compact only: the back arrow and the details sheet. */
  onBack: (() => void) | null
  onDetails: (() => void) | null
}

const CHANNEL_ICON = { chat: ChatIcon, email: EmailIcon, phone: PhoneIcon, whatsapp: WhatsAppIcon } as const

export function ThreadHeader({
  conversation,
  now,
  t,
  language,
  dir,
  profileHref,
  visible,
  filledFirst,
  overflow,
  onBack,
  onDetails,
}: ThreadHeaderProps) {
  const sla = conversationSla(conversation)
  const running = runningClock(conversation, sla, now)
  const Glyph = CHANNEL_ICON[conversation.channel]
  const BackIcon = backIcon(dir)
  const reasonId = `inbox-header-reason-${conversation.id}`
  const refusals = [...visible, ...overflow].filter((action) => action.refusal !== null)
  const reason = refusals[0]?.refusal ?? null
  /* §4.1's table fixes the split; the pane is 432px, so the rest always overflows.
     Compact (§2, with the back arrow) keeps only a filled primary beside the name. */
  const compact = onBack !== null
  const shown = compact ? visible.slice(0, filledFirst ? 1 : 0) : visible
  const menu = compact ? [...visible.slice(shown.length), ...overflow] : overflow

  return (
    <header className="flex flex-col border-b border-border">
      <div className="flex h-row-media items-center gap-3 px-4">
        {onBack !== null && (
          <Button variant="ghost" size="icon" aria-label={t('inbox.header.back')} onClick={onBack}>
            <BackIcon />
          </Button>
        )}
        <Avatar name={conversation.entityName} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Link
            to={profileHref}
            className="w-fit max-w-full truncate rounded-sm text-sm font-semibold text-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            {conversation.entityName}
          </Link>
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Glyph className="size-3.5" />
              {t(CHANNEL_KEY[conversation.channel])}
            </span>
            <StatusBadge tone={STATUS_TONE[conversation.status]}>{t(STATUS_KEY[conversation.status])}</StatusBadge>
            {running.result.clock.kind !== 'no-clock' && !running.result.deadlinePassedUnbroken && (
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
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {shown.map((action, index) => (
            <Button
              key={action.id}
              variant={filledFirst && index === 0 ? 'default' : 'ghost'}
              size="default"
              disabled={action.refusal !== null}
              aria-describedby={action.refusal !== null ? reasonId : undefined}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
          {menu.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('inbox.header.more')}>
                  <MoreIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menu.map((action) => (
                  <DropdownMenuItem
                    key={action.id}
                    disabled={action.refusal !== null}
                    aria-describedby={action.refusal !== null ? reasonId : undefined}
                    onSelect={action.onClick}
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {onDetails !== null && (
            <Button variant="ghost" size="icon" aria-label={t('inbox.header.details')} onClick={onDetails}>
              <InfoIcon />
            </Button>
          )}
        </div>
      </div>
      {reason !== null && (
        <p id={reasonId} className="px-4 pb-2 text-xs text-muted-foreground">
          {reason}
        </p>
      )}
    </header>
  )
}
