/**
 * `TopBar` (S-03) — design spec §4. Light, 48px, spanning **the content region
 * only**.
 *
 * **Why it does not span the viewport.** §2.1 describes a full-width dark bar
 * whose left slot holds the wordmark inside the nav column's width. D-3 already
 * moved Eyvar's wordmark into the rail, which is what made that slot
 * meaningful; with the wordmark gone the left slot would be empty and the
 * rail's own mark would sit *below* a bar that claims it. Spanning the content
 * region instead lines the `Title › Subtitle` pair up with the page header
 * title beneath it, which is §2.2's own alignment rule. Named as suspended in
 * the new D-4 — **do not "fix" it**.
 *
 * Rules applied
 *   §4 slot 1   back arrow: 28 × 28 icon button, present when `route.shape` is
 *               `detail` or `bleed`, **absent on sub-tab index routes**.
 *               Derived from the route's SHAPE, never from a stack depth —
 *               this retires `navStack.length` (`:7005`, D-L5). It **mirrors**
 *               in Arabic, at string-construction time via `mirrorGlyph`,
 *               never with CSS (§9.5).
 *   §4 slot 2   `Title › Subtitle`, **exactly two tokens, never three**. A null
 *               subtitle renders NOTHING — no orphan separator, no trailing
 *               space. The `›` mirrors to `‹`. Not focusable. Aligned to the
 *               content region's inline-start edge.
 *   §4 slot 3   global search, centred on the viewport (§5).
 *   §4 slot 4a  `Mine` chip → `/operations/my-work`. **This fixes D-L1**, which
 *               routes it to Support Center. Renders nothing at zero.
 *   §4 slot 4b  `On call` chip → `/admin/team`. Reads `On call: unassigned` in
 *               **warning** tone when the rota has a gap — that gap is the
 *               entire reason the chip exists.
 *   §4 slot 4c  bell (S-06). §4 slot 4d avatar (S-07).
 *   AC-76       **no emoji.** The legacy `✋` on the Mine chip and `📟` on the
 *               on-call chip are gone; both are text now.
 *   AC-18       the bar is mounted once, above the router outlet, and is never
 *               remounted by navigation.
 *   R-3 §1.3    the top bar carries NO elevation. It is chrome.
 */

import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCount, mirrorGlyph } from '@/lib'
import type { Direction, Language, Translate } from '@/lib'
import type { Notification, Session } from '@/data/types'
import { AccountMenu } from './AccountMenu'
import { GlobalSearch } from './GlobalSearch'
import { NotificationBell } from './NotificationBell'
import type { ShellState } from './ShellContext'
import type { RouteState } from './routeState'

export interface TopBarProps {
  route: RouteState
  shell: ShellState
  t: Translate
  dir: Direction
  language: Language
  onOpenEntity: (entityId: string) => void
  onOpenNotifications: () => void
  onOpenAccount: () => void
  onOpenNotification: (notification: Notification) => void
  onSwitchUser: () => void
  onSignOut: () => void
  /** Who is on the rota right now. `null` is the gap the chip exists to show. */
  onCallName: string | null
}

export function TopBar({
  route,
  shell,
  t,
  dir,
  language,
  onOpenEntity,
  onOpenNotifications,
  onOpenAccount,
  onOpenNotification,
  onSwitchUser,
  onSignOut,
  onCallName,
}: TopBarProps) {
  const navigate = useNavigate()
  const session: Session | null = shell.session

  return (
    <header className="flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      {/* Slots 1 + 2 — the wayfinding pair, aligned to the content region's
          inline-start edge so it lines up with the page header title. */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {route.showsBackArrow && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('shell.topbar.back')}
            onClick={() => navigate(-1)}
          >
            {/* §9.5 — mirrored at STRING-CONSTRUCTION time, never with CSS. */}
            <span aria-hidden="true" className="text-base leading-none">
              {mirrorGlyph('←', dir)}
            </span>
          </Button>
        )}
        <TitlePair route={route} t={t} dir={dir} />
      </div>

      {/* Slot 3 — §2.1 centres the field on the VIEWPORT. */}
      <GlobalSearch t={t} onOpenEntity={onOpenEntity} />

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
        {/* Slot 4a — `Mine`. Renders nothing at zero (AC-26). Routes to
            `/operations/my-work`, which is D-L1's fix. No emoji (AC-76). */}
        {(session?.claimedCount ?? 0) > 0 && (
          <Button
            variant="secondary"
            size="xs"
            asChild
            aria-label={t('shell.topbar.mineA11y', { count: session?.claimedCount ?? 0 })}
          >
            <Link to="/operations/my-work">
              {t('shell.topbar.mine')}
              <Badge size="count" tone="neutral">
                {formatCount(session?.claimedCount ?? 0, language)}
              </Badge>
            </Link>
          </Button>
        )}

        {/* Slot 4b — `On call`. A ROTA GAP is the reason this chip exists, so
            the gap is the state that gets the warning tone. */}
        <Button variant="secondary" size="xs" asChild>
          <Link to="/admin/team">
            <span className={cn(onCallName === null && 'text-warning-foreground')}>
              {onCallName === null
                ? t('shell.topbar.onCallUnassigned')
                : t('shell.topbar.onCall', { name: onCallName })}
            </span>
          </Link>
        </Button>

        {/* Slot 4c */}
        <NotificationBell
          summary={shell.notifications}
          t={t}
          language={language}
          onSeeAll={onOpenNotifications}
          onOpenNotification={onOpenNotification}
        />

        {/* Slot 4d */}
        <AccountMenu
          session={session}
          t={t}
          onOpenMyProfile={onOpenAccount}
          onSwitchUser={onSwitchUser}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  )
}

/**
 * §4 slot 2. **Exactly two tokens, never three.** The subtitle comes from the
 * route table's `subtitleKey`, and `null` renders NOTHING — legacy has 41
 * titles and only 31 subtitles, so the orphan-separator case is the common one,
 * not the edge case.
 *
 * Not focusable, and not a breadcrumb: §2.6 bans breadcrumbs outright, and D-3
 * sanctions this pair at exactly two tokens. A level-3 detail keeps the single
 * back arrow to its inline-start rather than growing a third token.
 */
function TitlePair({ route, t, dir }: { route: RouteState; t: Translate; dir: Direction }) {
  if (!route.subTab) return null

  /* On a level-3 detail the pair is `<sub-tab> › <detail>`; on a sub-tab index
     it is `<sub-tab> › <subtitle>`. Two tokens either way. */
  const title = t(route.subTab.titleKey)
  const secondKey = route.detail ? route.detail.titleKey : route.subTab.subtitleKey
  const second = secondKey ? t(secondKey) : null

  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <span className="truncate text-sm font-semibold text-foreground">{title}</span>
      {second && (
        <>
          {/* §9.5 — `›` mirrors to `‹`, at string-construction time. */}
          <span aria-hidden="true" className="shrink-0 text-sm text-muted-foreground">
            {mirrorGlyph('›', dir)}
          </span>
          <span className="truncate text-sm text-muted-foreground">{second}</span>
        </>
      )}
    </div>
  )
}
