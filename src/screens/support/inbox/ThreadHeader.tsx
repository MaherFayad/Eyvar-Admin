/**
 * Pane B's header (design 12 §4.1): 60px, avatar, name as a link to the 360°
 * layer, channel · status · the one running clock, then the actions. `Claim`,
 * `Take over` and `Reopen` are the only filled buttons; while held, `Send` is
 * the screen's (§8.6, R2). A `⋯` exists only when it holds three or more (D8-b);
 * fewer render as labelled ghosts. Line 2 yields in order: the channel word goes
 * sr-only (the glyph carries it), then the status badge hides, never the clock. A refusal renders once beneath (§8.6.8).
 */

import { useLayoutEffect, useRef, useState } from 'react'
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
  /** The reason it is refused, printed once under the header, or `null` when live. */
  refusal: string | null
  /** Disabled with its reason printed elsewhere (the composer's sentence): the id to describe by. */
  disabledBy?: string
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
  /* D8-b: the `⋯` begins at three; two or fewer render as labelled ghosts. Compact
     (§2, with the back arrow) keeps only a filled primary beside the name. */
  const compact = onBack !== null
  const kept = compact ? visible.slice(0, filledFirst ? 1 : 0) : visible
  const pool = compact ? [...visible.slice(kept.length), ...overflow] : overflow
  const menu = pool.length >= 3 ? pool : []
  const shown = pool.length >= 3 ? kept : [...kept, ...pool]
  const { line2, hideChannel, hideBadge } = useLine2Clip()

  return (
    <header className="flex flex-col border-b border-border">
      <div className="flex h-row-media items-center gap-3 px-4">
        {onBack !== null && (
          <Button variant="ghost" size="icon" aria-label={t('inbox.header.back')} onClick={onBack}>
            <BackIcon />
          </Button>
        )}
        {/* §10 row 13: below compact the avatar yields its 44px to the running clock. */}
        {!compact && <Avatar name={conversation.entityName} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <Link
            to={profileHref}
            className="w-fit max-w-full truncate rounded-sm text-sm font-semibold text-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            {conversation.entityName}
          </Link>
          <div ref={line2} data-inbox-line2="" className="flex min-w-0 items-center gap-2 overflow-hidden text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1">
              <Glyph className="size-3.5 shrink-0" />
              <span data-inbox-channel="" className={hideChannel ? 'sr-only' : 'whitespace-nowrap'}>
                {t(CHANNEL_KEY[conversation.channel])}
              </span>
            </span>
            <span data-inbox-badge="" className={hideBadge ? 'hidden' : 'shrink-0'}>
              <StatusBadge tone={STATUS_TONE[conversation.status]}>{t(STATUS_KEY[conversation.status])}</StatusBadge>
            </span>
            {running.result.clock.kind !== 'no-clock' && !running.result.deadlinePassedUnbroken && (
              <span data-inbox-clock="" className="shrink-0">
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
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {shown.map((action, index) => (
            <Button
              key={action.id}
              variant={filledFirst && index === 0 ? 'default' : 'ghost'}
              size="default"
              disabled={action.refusal !== null || action.disabledBy !== undefined}
              aria-describedby={action.refusal !== null ? reasonId : action.disabledBy}
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
                    disabled={action.refusal !== null || action.disabledBy !== undefined}
                    aria-describedby={action.refusal !== null ? reasonId : action.disabledBy}
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

/** The channel glyph is `size-3.5`; its gap to the word is 4px. */
const GLYPH_PX = 14
const WORD_GAP_PX = 4
const GAP_PX = 8

/* Line 2 yields in order (V-1, R-2): the channel word goes sr-only when it
   cannot show whole, then the status badge hides, and the running clock is
   never clipped. Measured with a ResizeObserver; a zero-width line (jsdom)
   hides nothing. */
function useLine2Clip(): {
  line2: React.RefObject<HTMLDivElement | null>
  hideChannel: boolean
  hideBadge: boolean
} {
  const line2 = useRef<HTMLDivElement | null>(null)
  const badgeWidth = useRef(0)
  const wordWidth = useRef(0)
  const [hideChannel, setHideChannel] = useState(false)
  const [hideBadge, setHideBadge] = useState(false)
  useLayoutEffect(() => {
    const el = line2.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const measure = () => {
      const badge = el.querySelector<HTMLElement>('[data-inbox-badge]')
      const word = el.querySelector<HTMLElement>('[data-inbox-channel]')
      const clock = el.querySelector<HTMLElement>('[data-inbox-clock]')
      if (badge && badge.offsetWidth > 0) badgeWidth.current = badge.offsetWidth
      if (word && word.offsetWidth > 0) wordWidth.current = word.scrollWidth
      const width = el.clientWidth
      if (width === 0) return
      const base = GLYPH_PX + (clock ? GAP_PX + clock.offsetWidth : 0)
      const withBadge = base + GAP_PX + badgeWidth.current
      const whole = withBadge + WORD_GAP_PX + wordWidth.current
      setHideChannel(whole > width)
      setHideBadge(withBadge > width)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  })
  return { line2, hideChannel, hideBadge }
}
