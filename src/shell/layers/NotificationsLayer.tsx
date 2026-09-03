/**
 * The notification centre layer — `?notifications=all`. Design spec §6.3,
 * spec §4.3.2.
 *
 * **Two sizes, one model.** The bell popover (`NotificationBell`) is the
 * preview — top 8 by priority. This is the former `notifications-all` page in
 * full: **four priority tiers as section headings**, six filter chips beneath
 * the header, then rows with the same anatomy as the preview.
 *
 * §5.5 calls this a drawer case by name: *"a browse-and-pick catalogue with
 * more items than a menu can hold"*. It is not a popover, and §5.0's "a list of
 * commands on an object" row belongs to the bell preview, not to this.
 *
 * Three defects fixed on the way in (`03c` §17):
 *   1. type `alert` — the most common runtime type, 16 producers — has **no
 *      click destination**. Every type gets a route in the new table, and a row
 *      whose route is still `null` renders WITHOUT its navigation affordance
 *      rather than being hidden (§11.2): the operator should know the event
 *      happened.
 *   2. `renewal`, `approval` and `complaint` have full routing support and **no
 *      runtime producer** — recorded, not silently dropped.
 *   3. **every read flag reverts on reload**, so the badge returns to 3. Read
 *      state persistence is **Q1**, and it is not answered here: the mock holds
 *      it in memory, which is the recorded gap.
 *
 * Rules applied
 *   §6.3        sorting is **priority-first, never recency alone** — that
 *               happens in the client, so the popover and the layer cannot
 *               disagree.
 *   §5.4/§6.3   end-of-list is stated **in words**. Never a blank surface.
 *   R8          an empty list is a `no-match` empty: one grey sentence, and
 *               **two of them** — `No unread notifications.` under the `Unread`
 *               chip, `No notifications.` everywhere else, because the first
 *               asserts something narrower than the truth about an empty `All`.
 *   §9.2 #13/14 loading is the feed skeleton; error is card-scoped inside the
 *               layer and the layer stays dismissible.
 *   §6.1        the layer commits nothing beyond marking read, so its footer
 *               carries that as a plain control and no primary. The bulk
 *               control **names the count** and renders DISABLED at zero
 *               (§11.2) rather than sitting enabled over nothing.
 *   §7.3        every unread row carries its own `Mark as read`, in the DOM
 *               whenever the row is unread — never on `:hover` alone — and on
 *               un-navigable rows too, which is the only way those rows can be
 *               marked read at all.
 */

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useAsync } from '@/hooks'
import { formatCount, formatDate } from '@/lib'
import { listNotifications, markAllNotificationsRead } from '@/data/clients'
import {
  NOTIFICATION_PRIORITY_RANK,
  type Notification,
  type NotificationFilter,
  type NotificationPriority,
  type Paginated,
} from '@/data/types'
import type { Language, Translate } from '@/lib'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ShellLayer } from '../ShellLayer'

/**
 * §6.3 — the six filter chips, over the four priority tiers.
 *
 * `NotificationFilter` is `'all' | 'unread' | NotificationType`, so the TYPE
 * admits ten more ids than §6.3 puts on screen. `as const` keeps the six the
 * source of truth for the key lookup: adding a seventh chip fails to compile
 * until its `shell.notifications.filter.*` key exists, which is the whole point
 * of deriving the label from the id rather than typing it out twice.
 */
const FILTERS = ['all', 'unread', 'alert', 'ticket', 'payout', 'renewal'] as const satisfies readonly NotificationFilter[]

/** §6.3 — four priority tiers as SECTION HEADINGS, in rank order. */
const TIERS: readonly NotificationPriority[] = ['critical', 'high', 'medium', 'low']

export interface NotificationsLayerProps {
  open: boolean
  onClose: () => void
  t: Translate
  language: Language
  onOpenNotification: (notification: Notification) => void
  /**
   * Marks one notification read WITHOUT navigating. Resolves when the write has
   * landed, so the layer repaints its own rows off the server's answer rather
   * than off an optimistic local edit.
   */
  onMarkRead: (notification: Notification) => Promise<void>
  /**
   * Unread across ALL notifications, not across the current filter — the same
   * number the bell badge shows, so the two surfaces cannot disagree about how
   * much `Mark all as read` has left to do.
   */
  unreadCount: number
  onChanged: () => void
}

export function NotificationsLayer({
  open,
  onClose,
  t,
  language,
  onOpenNotification,
  onMarkRead,
  unreadCount,
  onChanged,
}: NotificationsLayerProps) {
  const [filter, setFilter] = useState<NotificationFilter>('all')

  const list = useAsync<Paginated<Notification>>(
    (signal) => listNotifications({ filter, pageSize: 50 }, signal),
    /* `filter` is the only varying input — `pageSize` is a literal — so each
       filter keys separately and switching `All`/`Unread` and back paints the
       tab's own rows rather than a skeleton. `markAll` goes through `refetch`,
       which bypasses the cache and rewrites the entry. */
    { deps: [filter], cacheKey: 'notifications.list', enabled: open },
  )

  const markAll = useCallback(async () => {
    await markAllNotificationsRead()
    list.refetch()
    onChanged()
  }, [list, onChanged])

  /* The write is the shell's — one call site for both surfaces — and the
     repaint is this layer's, because the shell does not know which filter is
     open or which rows are on screen. */
  const markOne = useCallback(
    async (notification: Notification) => {
      await onMarkRead(notification)
      list.refetch()
    },
    [list, onMarkRead],
  )

  const items = list.data?.items ?? []

  return (
    <ShellLayer
      open={open}
      onClose={onClose}
      title={t('shell.notifications.title')}
      t={t}
      footer={
        <div className="flex shrink-0 items-center border-t border-border px-3 py-2">
          {/* §11.2 — DISABLED in place at zero, never hidden: a control that
              disappears teaches nothing, and the count says how much is left. */}
          <Button variant="secondary" onClick={markAll} disabled={unreadCount === 0}>
            {t('shell.notifications.markAllReadCount', { count: formatCount(unreadCount, language) })}
          </Button>
        </div>
      }
    >
      {/* §6.3 — six filter chips beneath the header. Chips are neutral (§12). */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((candidate) => (
          <Button
            key={candidate}
            variant={filter === candidate ? 'default' : 'secondary'}
            size="xs"
            onClick={() => setFilter(candidate)}
          >
            {t(`shell.notifications.filter.${candidate}`)}
          </Button>
        ))}
      </div>

      {list.status === 'loading' && <LoadingSkeleton pattern="P10" />}

      {list.status === 'error' && (
        <ErrorState
          scope="card"
          message={t('state.cardError.message', { resource: t('shell.notifications.title') })}
          action={{ label: t('state.pageError.action'), onClick: list.refetch }}
        />
      )}

      {/* R8 — a `no-match` empty, and TWO sentences rather than one. `No unread
          notifications.` is true of the `Unread` chip at zero and false of an
          empty list under `All`, where it asserts something narrower than the
          truth. */}
      {list.status === 'empty' && (
        <EmptyState
          kind="no-match"
          message={t(
            filter === 'unread' ? 'shell.notifications.noUnread' : 'shell.notifications.empty',
          )}
        />
      )}

      {list.status === 'content' && (
        <>
          {TIERS.map((tier) => {
            const tierItems = items
              .filter((n) => n.priority === tier)
              .sort(
                (a, b) =>
                  NOTIFICATION_PRIORITY_RANK[a.priority] - NOTIFICATION_PRIORITY_RANK[b.priority] ||
                  b.createdAt.localeCompare(a.createdAt),
              )
            if (tierItems.length === 0) return null
            return (
              <section key={tier} className="mb-3">
                {/* The raw `NotificationPriority` id used to render here under a
                    CSS `capitalize`, which is English-only twice over: the id is
                    English and the transform is a no-op in Arabic. */}
                <h3 className="mb-1 text-xs font-medium text-muted-foreground">
                  {t(`shell.notifications.tier.${tier}`)}
                </h3>
                <ul className="flex list-none flex-col rounded-xl border border-border bg-card shadow-1">
                  {tierItems.map((notification, index) => (
                    <li key={notification.id}>
                      {index > 0 && <Separator />}
                      <Row
                        notification={notification}
                        language={language}
                        t={t}
                        onOpen={() => onOpenNotification(notification)}
                        onMarkRead={() => void markOne(notification)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
          {/* §5.4 — end-of-list IN WORDS. */}
          <p className="py-2 text-center text-xs text-muted-foreground">
            {t('shell.notifications.endOfList')}
          </p>
        </>
      )}
    </ShellLayer>
  )
}

/**
 * One row: the notification, plus its own read control.
 *
 * §11.2 — a notification routing to a forbidden or absent destination renders
 * **without its navigation affordance** rather than being hidden. So the body
 * is a `<button>` when there is somewhere to go and a `<div>` when there is
 * not; it is never a `<div onClick>` (§7.4).
 *
 * **`Mark as read` is a SIBLING of that body, not a child of it.** A button
 * inside a button is invalid and unreachable by keyboard, and the whole reason
 * this control exists is that the un-navigable rows — the majority of `alert`
 * notifications — had no way to be marked read at all. So it renders on every
 * unread row, navigable or not.
 *
 * §7.3 — it is **not hover-only**: it is in the DOM whenever the row is unread,
 * so it is tabbable without a pointer and visible before it is focused.
 */
function Row({
  notification,
  language,
  t,
  onOpen,
  onMarkRead,
}: {
  notification: Notification
  language: Language
  t: Translate
  onOpen: () => void
  onMarkRead: () => void
}) {
  const navigable = notification.route !== null || notification.entityId !== null
  const bodyClassName = 'flex min-w-0 flex-1 flex-col gap-0.5 text-start'
  const body = (
    <>
      <span className="text-xs text-muted-foreground">
        {formatDate(notification.createdAt, { style: 'day-month-time', language })}
      </span>
      <span
        dir="auto"
        className={cn('text-sm', notification.read ? 'font-normal' : 'font-semibold')}
      >
        {notification.title}
      </span>
      {/* §7.5 — G5's weight-only marker. Font weight is not a carrier a screen
          reader has, and it is the same on both surfaces only if both say the
          word. Outside the title's `dir="auto"` span so it cannot flip the
          direction the title inferred. */}
      {!notification.read && <span className="sr-only">{t('shell.notifications.unread')}</span>}
      {notification.body && (
        <span dir="auto" className="text-sm text-muted-foreground">
          {notification.body}
        </span>
      )}
    </>
  )

  return (
    <div className="flex items-start gap-2 px-3 py-2">
      {navigable ? (
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            bodyClassName,
            'rounded-md transition-colors outline-hidden hover:bg-accent',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          {body}
        </button>
      ) : (
        <div className={bodyClassName}>{body}</div>
      )}
      {!notification.read && (
        <Button
          variant="ghost"
          size="xs"
          className="shrink-0"
          onClick={onMarkRead}
          /* The visible label is the same six characters on every row, so the
             accessible name names the row it acts on (§7.2). */
          aria-label={t('shell.notifications.markReadA11y', { title: notification.title })}
        >
          {t('shell.notifications.markRead')}
        </Button>
      )}
    </div>
  )
}
