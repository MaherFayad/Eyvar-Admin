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
import { Separator } from '@/components/ui/separator'
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

      <PopoverContent align="end" className="w-90 gap-0 p-0">
        <div className="flex h-10 items-center border-b border-border px-3">
          <h2 className="text-sm font-semibold text-foreground">{t('shell.notifications.title')}</h2>
        </div>

        <div className="min-h-24">
          {preview.status === 'loading' && (
            <div className="p-3">
              <LoadingSkeleton pattern="P10" />
            </div>
          )}

          {preview.status === 'error' && (
            <ErrorState
              scope="card"
              message={t('state.cardError.message', { resource: t('shell.notifications.title') })}
              action={{ label: t('state.pageError.action'), onClick: preview.refetch }}
            />
          )}

          {/* R8 `no-match` — one grey sentence, no illustration, no heading. */}
          {preview.status === 'empty' && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t('shell.notifications.noUnread')}
            </p>
          )}

          {preview.status === 'content' && preview.data && (
            <ScrollArea className="max-h-96">
              <ul className="flex list-none flex-col">
                {preview.data.map((notification, index) => (
                  <li key={notification.id}>
                    {index > 0 && <Separator />}
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
              <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                {t('shell.notifications.endOfList')}
              </p>
            </ScrollArea>
          )}
        </div>

        <div className="border-t border-border p-1">
          <Button
            variant="ghost"
            className="w-full"
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
    <>
      <span className="text-xs text-muted-foreground">
        {formatDate(notification.createdAt, { style: 'day-month-time', language })}
      </span>
      <span className={cn('text-sm', notification.read ? 'font-normal' : 'font-semibold')}>
        {notification.title}
      </span>
      {notification.body && <span className="text-sm text-muted-foreground">{notification.body}</span>}
    </>
  )

  const className = 'flex w-full flex-col gap-0.5 px-3 py-2 text-start'

  if (!navigable) return <div className={className}>{body}</div>

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        className,
        'transition-colors outline-hidden hover:bg-accent',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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
