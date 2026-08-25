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
 *   R8          zero unread is a `no-match` empty: one grey sentence.
 *   §9.2 #13/14 loading is the feed skeleton; error is card-scoped inside the
 *               layer and the layer stays dismissible.
 *   §6.1        the layer commits nothing beyond `Mark all as read`, so its
 *               footer carries that as a plain control and no primary.
 */

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useAsync } from '@/hooks'
import { formatDate } from '@/lib'
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

/** §6.3 — the six filter chips, over the four priority tiers. */
const FILTERS: readonly NotificationFilter[] = ['all', 'unread', 'alert', 'ticket', 'payout', 'renewal']

/** §6.3 — four priority tiers as SECTION HEADINGS, in rank order. */
const TIERS: readonly NotificationPriority[] = ['critical', 'high', 'medium', 'low']

export interface NotificationsLayerProps {
  open: boolean
  onClose: () => void
  t: Translate
  language: Language
  onOpenNotification: (notification: Notification) => void
  onChanged: () => void
}

export function NotificationsLayer({
  open,
  onClose,
  t,
  language,
  onOpenNotification,
  onChanged,
}: NotificationsLayerProps) {
  const [filter, setFilter] = useState<NotificationFilter>('all')

  const list = useAsync<Paginated<Notification>>(
    (signal) => listNotifications({ filter, pageSize: 50 }, signal),
    { deps: [filter], enabled: open },
  )

  const markAll = useCallback(async () => {
    await markAllNotificationsRead()
    list.refetch()
    onChanged()
  }, [list, onChanged])

  const items = list.data?.items ?? []

  return (
    <ShellLayer
      open={open}
      onClose={onClose}
      title={t('shell.notifications.title')}
      t={t}
      footer={
        <div className="flex shrink-0 items-center border-t border-border px-3 py-2">
          <Button variant="secondary" onClick={markAll}>
            {t('shell.notifications.markAllRead')}
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
            {candidate}
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

      {list.status === 'empty' && (
        <EmptyState kind="no-match" message={t('shell.notifications.noUnread')} />
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
                <h3 className="mb-1 text-xs font-medium text-muted-foreground capitalize">{tier}</h3>
                <ul className="flex list-none flex-col rounded-xl border border-border bg-card shadow-1">
                  {tierItems.map((notification, index) => (
                    <li key={notification.id}>
                      {index > 0 && <Separator />}
                      <Row
                        notification={notification}
                        language={language}
                        onOpen={() => onOpenNotification(notification)}
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
 * §11.2 — a notification routing to a forbidden or absent destination renders
 * **without its navigation affordance** rather than being hidden. So this is a
 * `<button>` when there is somewhere to go and a `<div>` when there is not; it
 * is never a `<div onClick>` (§7.4).
 */
function Row({
  notification,
  language,
  onOpen,
}: {
  notification: Notification
  language: Language
  onOpen: () => void
}) {
  const navigable = notification.route !== null || notification.entityId !== null
  const className = 'flex w-full flex-col gap-0.5 px-3 py-2 text-start'
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
