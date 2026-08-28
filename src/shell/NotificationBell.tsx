/**
 * `NotificationPanel` (S-06), the **preview** half — design spec §6.3, §4 slot 4c.
 *
 * Two sizes, one model. This is the 360px bell popover: the top 8 **by
 * priority, never recency alone** (`:2175`–`:2187` — that design is right and
 * must survive the move). `See all` opens the shell layer at
 * `?notifications=all`, which is the same rows with four tiers and six filter
 * chips.
 *
 * Rules applied
 *   §4 slot 4c  28 × 28 icon button, accessible name `Notifications`. The count
 *               badge renders **only when unread > 0** (**AC-26**,
 *               `notif-unread-zero`: no badge, not a `0`). Tone is **neutral**,
 *               or **warning** when at least one unread notification is in the
 *               critical tier. **Never red** — R5a enumerates the four
 *               permitted uses of red and a bell badge is not among them.
 *   §5.4/§6.3   end-of-list is stated **in words**: `No more notifications`.
 *               Never a blank popover.
 *   R8          zero unread is a `no-match` empty — ONE grey sentence, no
 *               illustration, no heading.
 *   §11.2       a notification routing to a FORBIDDEN destination renders
 *               **without its navigation affordance** rather than being
 *               hidden: the operator should know the event happened. A `null`
 *               `route` is the same case and is common — `alert` is the
 *               most-produced runtime type and has no destination at all.
 *   §7.3.3      a popover does not trap focus; `Tab` closes and moves on.
 *   §7.4        a row with a destination is a `<button>`; a row without one is
 *               a `<div>` that was never interactive to begin with, so no
 *               non-focusable click handler is created either way.
 *   R-3 §1.3    tier 2, through `PopoverContent`.
 */

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { formatCount, formatDate } from '@/lib'
import { useAsync } from '@/hooks'
import { previewNotifications } from '@/data/clients'
import type { Notification, NotificationSummary } from '@/data/types'
import type { Language, Translate } from '@/lib'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

export interface NotificationBellProps {
  summary: NotificationSummary | null
  t: Translate
  language: Language
  onSeeAll: () => void
  onOpenNotification: (notification: Notification) => void
}

export function NotificationBell({
  summary,
  t,
  language,
  onSeeAll,
  onOpenNotification,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false)

  /* Fetched only while the popover is open — AC-28's spirit: a surface that is
     not on screen performs no work. */
  const preview = useAsync<Notification[]>((signal) => previewNotifications(signal), {
    deps: [open],
    enabled: open,
  })

  const unread = summary?.unread ?? 0
  /* §4 slot 4c — warning when at least one UNREAD notification is critical.
     Read off the preview when it is loaded; neutral otherwise, because a tone
     nobody can explain is worse than a tone that under-reports. */
  const hasCritical = (preview.data ?? []).some((n) => !n.read && n.priority === 'critical')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t('shell.topbar.notifications')}
        >
          <BellGlyph />
          {/* AC-26 — nothing at zero. Not a `0`, not an empty chip. */}
          {unread > 0 && (
            <Badge
              size="count"
              tone={hasCritical ? 'warning' : 'neutral'}
              className="absolute -top-0.5 -end-0.5"
              aria-label={t('shell.notifications.unreadCount', { count: unread })}
            >
              {formatCount(unread, language)}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-88 sm:w-96 max-h-[85vh] flex flex-col gap-0 p-0 bg-popover text-popover-foreground shadow-2xl border border-border rounded-xl overflow-hidden z-50"
      >
        <div className="shrink-0 flex h-11 items-center justify-between border-b border-border px-4 bg-popover">
          <h2 className="text-sm font-bold text-foreground">{t('shell.notifications.title')}</h2>
          {unread > 0 && (
            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {unread} new
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden bg-popover">
          {preview.status === 'loading' && (
            <div className="p-4 bg-popover">
              <LoadingSkeleton pattern="P10" />
            </div>
          )}

          {preview.status === 'error' && (
            <div className="p-4 bg-popover">
              <ErrorState
                scope="card"
                message={t('state.cardError.message', { resource: t('shell.notifications.title') })}
                action={{ label: t('state.pageError.action'), onClick: preview.refetch }}
              />
            </div>
          )}

          {/* R8 `no-match` — one grey sentence, no illustration, no heading. */}
          {preview.status === 'empty' && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground bg-popover">
              {t('shell.notifications.noUnread')}
            </p>
          )}

          {preview.status === 'content' && preview.data && (
            <ScrollArea className="h-full max-h-[420px] overflow-y-auto bg-popover">
              <ul className="flex list-none flex-col bg-popover divide-y divide-border/60">
                {preview.data.map((notification) => (
                  <li key={notification.id} className="bg-popover">
                    <NotificationRow
                      notification={notification}
                      language={language}
                      onOpen={() => {
                        setOpen(false)
                        onOpenNotification(notification)
                      }}
                    />
                  </li>
                ))}
              </ul>
              {/* §5.4 — end-of-list IN WORDS. Never a blank edge. */}
              <div className="p-3 text-center border-t border-border/40 bg-muted/20">
                <span className="text-xs text-muted-foreground font-medium">
                  {t('shell.notifications.endOfList')}
                </span>
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="shrink-0 border-t border-border p-2 bg-popover">
          <Button
            variant="ghost"
            size="default"
            className="w-full text-xs font-semibold text-foreground hover:bg-accent"
            onClick={() => {
              setOpen(false)
              onSeeAll()
            }}
          >
            {t('shell.notifications.seeAll')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * One row. §6.3's anatomy: a 12px muted context line, a 13px/600 title, a
 * 13px/400 body.
 *
 * §11.2 — a notification with no reachable destination renders WITHOUT the
 * navigation affordance rather than being hidden. So the element is a
 * `<button>` when there is somewhere to go and a plain `<div>` when there is
 * not; it is never a `<div onClick>`.
 */
function NotificationRow({
  notification,
  language,
  onOpen,
}: {
  notification: Notification
  language: Language
  onOpen: () => void
}) {
  const navigable = notification.route !== null || notification.entityId !== null

  const body = (
    <div className="flex flex-col gap-1 w-full text-start">
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xs font-medium text-muted-foreground tabular-nums">
          {formatDate(notification.createdAt, { style: 'day-month-time', language })}
        </span>
        {!notification.read && (
          <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
        )}
      </div>
      <span
        dir="auto"
        className={cn(
          'text-xs leading-snug break-words',
          notification.read ? 'font-normal text-muted-foreground' : 'font-semibold text-foreground',
        )}
      >
        {notification.title}
      </span>
      {notification.body && (
        <span dir="auto" className="text-xs text-muted-foreground leading-relaxed break-words">
          {notification.body}
        </span>
      )}
    </div>
  )

  const className = 'flex w-full flex-col gap-1 px-4 py-3 text-start transition-colors bg-popover'

  if (!navigable) return <div className={className}>{body}</div>

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        className,
        'hover:bg-accent/70 active:bg-accent cursor-pointer',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background outline-none',
      )}
    >
      {body}
    </button>
  )
}

/** A bell. An object — it never mirrors (§9.5, §14). */
function BellGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5z" />
      <path d="M10.3 19.5a2 2 0 0 0 3.4 0" />
    </svg>
  )
}
