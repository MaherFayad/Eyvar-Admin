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

import { useId, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { formatCount, formatDate } from '@/lib'
import { useAsync } from '@/hooks'
import { previewNotifications } from '@/data/clients'
import type { Notification, NotificationSummary } from '@/data/types'
import type { Language, Translate, Translator } from '@/lib'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

export interface NotificationBellProps {
  summary: NotificationSummary | null
  t: Translator
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
  const countId = useId()
  /* D-11 — set only by `See all`, which hands off to the shell layer. See the
     note on `onCloseAutoFocus` below. */
  const handedOff = useRef(false)

  /* Fetched only while the popover is open — AC-28's spirit: a surface that is
     not on screen performs no work. */
  const preview = useAsync<Notification[]>((signal) => previewNotifications(signal), {
    deps: [open],
    /* `previewNotifications` takes no argument, so the request never varies and
       `[open]` — which is `true` on every run that fires — is a complete key.
       Re-opening the popover within the TTL paints the last preview and
       revalidates behind it. */
    cacheKey: 'notifications.preview',
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
          /* **The count was inaudible twice over.** It hung on the `Badge` as an
             `aria-label`, and a `Badge` is a `<span>` with no role, where
             `aria-label` is not supported and is dropped; and even had it been
             honoured, this button's own `aria-label` replaces its whole subtree
             in the name computation. A reader heard `Notifications, button`
             at 0 unread and at 12.

             It rides the DESCRIPTION rather than the name, deliberately: the
             name is the control's identity and must not change under the
             operator (nor under the twelve tests that address this button by
             it). A description is the right place for a standing quantity, it
             is announced after the name, and it changes freely. */
          aria-describedby={unread > 0 ? countId : undefined}
        >
          <BellGlyph />
          {/* AC-26 — nothing at zero. Not a `0`, not an empty chip. */}
          {unread > 0 && (
            <>
              <Badge
                size="count"
                tone={hasCritical ? 'warning' : 'neutral'}
                className="absolute -top-0.5 -end-0.5"
              >
                {formatCount(unread, language)}
              </Badge>
              {/* `formatCount`, not the raw JS number the `aria-label` passed:
                 Arabic gets Arabic-Indic digits here exactly as the badge and
                 the popover heading already do. */}
              <span id={countId} className="sr-only">
                {t('shell.notifications.unreadCount', {
                  count: formatCount(unread, language),
                })}
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>

      {/**
        * **D-11 — the layer wins.** Radix restores focus to the trigger on close,
        * which is right for a popover that acts in place and wrong for one that
        * opens a layer: measured in the production build, focus reaches the sheet
        * title, then `body`, then comes back to this bell at ~150ms **while the
        * drawer is still open**.
        *
        * Conditional, never blanket — Escape and every in-place action must still
        * return the operator to the bell. Only `See all` sets the ref.
        */}
      <PopoverContent
        align="end"
        className="w-96 compact:w-88 max-h-[85vh] flex flex-col gap-0 p-0 bg-popover text-popover-foreground shadow-2xl border border-border rounded-xl overflow-hidden z-50"
        onCloseAutoFocus={(event) => {
          if (!handedOff.current) return
          handedOff.current = false
          event.preventDefault()
        }}
      >
        <div className="shrink-0 flex h-11 items-center justify-between border-b border-border px-4 bg-popover">
          <h2 className="text-sm font-bold text-foreground">{t('shell.notifications.title')}</h2>
          {unread > 0 && (
            /* This read `{unread} new` — a hardcoded English template with a raw
               JS numeral. Both halves are fixed: the word comes from a key and
               the numeral from `formatCount`, so Arabic gets Arabic-Indic
               digits like every other count in the shell. */
            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {t.plural('shell.notifications.newCount', { count: unread })}
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

          {/* R8 `no-match` — one grey sentence, no illustration, no heading.
              The sentence is `No notifications.`, not `No unread
              notifications.`: this preview is the top eight by priority, read
              and unread alike, so the narrower claim was simply not what an
              empty preview means. */}
          {preview.status === 'empty' && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground bg-popover">
              {t('shell.notifications.empty')}
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
                      t={t}
                      onOpen={() => {
                        /* D-11, and this is the path the first fix MISSED. Opening a
                           notification hands off to the shell layer exactly as `See
                           all` does; without this the bell takes focus back at
                           ~150ms with the drawer already open — measured at t=1600ms
                           in the a11y audit. `See all` is the *secondary* route to
                           that layer; this is the one an operator actually uses. */
                        handedOff.current = true
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
              handedOff.current = true
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
  t,
  onOpen,
}: {
  notification: Notification
  language: Language
  t: Translate
  onOpen: () => void
}) {
  const navigable = notification.route !== null || notification.entityId !== null

  const body = (
    <div className="flex flex-col gap-1 w-full text-start">
      <div className="flex items-center justify-between gap-2">
        {/* H2/H3 — a timestamp is META: `--text-xs` at 400. `--text-2xs` is
            a badge label and a count numeral and nothing else, and the weight
            was decoration on the quietest thing in the row. */}
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDate(notification.createdAt, { style: 'day-month-time', language })}
        </span>
        {!notification.read && (
          /* The unread dot was filled from Tailwind's own blue ramp at stop
             500 — a palette class, not a token, and the kind that passes a
             casual review because it looks like one. (Spelled out rather than
             quoted: a class name in a comment is a candidate Tailwind emits.)
             `--ev-brand` is the wrong swap — it is #0c6944, a GREEN, and would
             have changed what the dot means. The informational blue is
             `--ev-blue-dk` #1b51c4, reached through `bg-info-foreground`:
             6.952 : 1 on the popover's white and 6.539 : 1 on the unread row's
             own ground #f5f8ff, both past the 3 : 1 a meaningful graphic owes
             §7.5.

             **Now fixed:** the dot used to be colour and shape with no word and
             no accessible name — §7.5's never-colour-alone rule — and the fix
             was held up on a translation key. The key exists
             (`shell.notifications.unread`), so the word ships beside the dot,
             visually hidden. The dot itself is decoration once the word is
             there, so it is `aria-hidden`. */
          <>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-info-foreground shrink-0" />
            <span className="sr-only">{t('shell.notifications.unread')}</span>
          </>
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

  /* **Unread is a ground on this surface too.** The bell marked unread with a
     dot and the drawer marked the same state with a weight step; the two
     surfaces now carry the same three marks — tint, dot, hidden word — so an
     operator learns the marker once. `bg-info` at full strength is #eaf0fe,
     where this row's `text-muted-foreground` timestamp (`--ev-text-2`
     #6b7280) reads **4.234 : 1** and fails the 4.5 floor; composited at 50%
     over the popover's white the ground is **#f5f8ff** and the same ink reads
     **4.548 : 1 ✓**. Written as a branch rather than appended to the base
     string because two background utilities in one class list are resolved by
     stylesheet order, not by the order they were typed. */
  const className = cn(
    'flex w-full flex-col gap-1 px-4 py-3 text-start transition-colors',
    notification.read ? 'bg-popover' : 'bg-info/50',
  )

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
