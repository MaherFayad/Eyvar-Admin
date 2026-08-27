/**
 * `TopBar` (S-03) — design spec §4, as amended by D7 §4.2. **52px, WHITE,
 * with a 1px `--ev-hairline` bottom rule, spanning the content region only.**
 *
 * The height is `--ev-topbar-h` and it moved 48 → 52 under D7: app content
 * begins at destination y = 5 in the reference (rows 0-4 are window chrome) and
 * the bar's bottom border is at y = 32.5, so (32.5 − 5) × 1.875 = 51.6, and 52
 * is on the 4px grid. The sidebar brand row takes the same token and the two
 * still align. The fill is `bg-background`, which is now `#ffffff` — under D-11
 * the content region is white edge to edge, so "white" here is not a special
 * case, it is the ground. The rule below it is `--ev-hairline` `#f0f2f4`, the
 * one hairline value on the page.
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
 *   §4 slot 2   **DELETED — `02-visual-refinement.md` V4.** The `Title ›
 *               Subtitle` route trail is gone and the slots renumber to
 *               1, 2, 3a–3d. §4 justified the trail as wayfinding and aligned
 *               it deliberately to the `<h1>` beneath, and that justification
 *               rested on a state that no longer exists: at 1280 the sub-tab
 *               column was collapsed on first run, so the trail was the only
 *               place the sub-tab's name appeared. **D5 removes the collapse,**
 *               so the column is always visible and already renders the
 *               workspace name in its header and the sub-tab name in the active
 *               pill. The trail restated the two things immediately to its own
 *               inline-start, and the page header restated it a third time.
 *               Shopify's bar carries no route echo either — measured on
 *               `products-list-default.webp`, it holds the store mark, a
 *               centred search field, a bell and an account chip, and nothing
 *               else. **The inline-start is left EMPTY on index routes. It is
 *               not filled with anything.**
 *   §4 slot 2   global search, centred on the viewport (§5).
 *   §4 slot 3a  `Mine` chip → `/operations/my-work`. **This fixes D-L1**, which
 *               routes it to Support Center. Renders nothing at zero.
 *   §4 slot 3b  `On call` chip → `/admin/team`. Reads `On call: unassigned` in
 *               **warning** tone when the rota has a gap — that gap is the
 *               entire reason the chip exists.
 *   §4 slot 3c  bell (S-06). §4 slot 3d avatar (S-07).
 *   AC-76       **no emoji.** The legacy `✋` on the Mine chip and `📟` on the
 *               on-call chip are gone; both are text now.
 *   AC-18       the bar is mounted once, above the router outlet, and is never
 *               remounted by navigation.
 *   R-3 §1.3    the top bar carries NO elevation. It is chrome. Under D7 that
 *               is doubly true — tier 1 itself now paints nothing (the
 *               reference's card shows zero falloff within one pixel of its
 *               border), so elevation is not available to lean on anywhere.
 *   D7/audit    **this bar is the busiest strip on our page and the reference's
 *               is nearly empty** — theirs carries a breadcrumb and one
 *               inline-end item, ours carries a 400px centred search, two
 *               chips, a bell and an avatar. That is §4's slot list and §5's
 *               global search, i.e. FUNCTION, and D7 explicitly does not touch
 *               §8. Recorded as a divergence, not fixed by a re-skin.
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
  /** §10.4 — the account menu's permanent onboarding entry (**AC-598**). */
  onOpenOnboarding: () => void
  onOpenNotification: (notification: Notification) => void
  onSwitchUser: () => void
  onSignOut: () => void
  /**
   * AC-70 — forwarded to the account menu, which is where the language control
   * lives. The bar itself has no language affordance: slot 3 is already the
   * busiest strip on the page (see the divergence note above) and a switch an
   * operator touches twice a year does not earn a permanent slot beside a
   * count chip they read every minute.
   */
  onSetLanguage: (language: Language) => void
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
  onOpenOnboarding,
  onOpenNotification,
  onSwitchUser,
  onSignOut,
  onSetLanguage,
  onCallName,
}: TopBarProps) {
  const navigate = useNavigate()
  const session: Session | null = shell.session

  return (
    <header className="flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      {/* Slot 1 — the back arrow, and nothing else. V4 deleted the route trail
          that used to sit beside it, so on an index route this half of the bar
          is deliberately empty. */}
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
      </div>

      {/* Slot 2 — §2.1 centres the field on the VIEWPORT. */}
      <GlobalSearch t={t} onOpenEntity={onOpenEntity} />

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
        {/* Slot 3a — `Mine`. Renders nothing at zero (AC-26). Routes to
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

        {/* Slot 3b — `On call`. A ROTA GAP is the reason this chip exists, so
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

        {/* Slot 3c */}
        <NotificationBell
          summary={shell.notifications}
          t={t}
          language={language}
          onSeeAll={onOpenNotifications}
          onOpenNotification={onOpenNotification}
        />

        {/* Slot 3d */}
        <AccountMenu
          session={session}
          t={t}
          language={language}
          onSetLanguage={onSetLanguage}
          onOpenMyProfile={onOpenAccount}
          onOpenOnboarding={onOpenOnboarding}
          /* **AC-599** — a count only while the track is incomplete AND
             undismissed. `isComplete` and `dismissedAt` are both the server's
             derivations, never recomputed here. */
          onboardingProgress={
            shell.onboarding !== null &&
            !shell.onboarding.isComplete &&
            shell.onboarding.state.dismissedAt === null &&
            shell.onboarding.totalCount > 0
              ? { done: shell.onboarding.doneCount, total: shell.onboarding.totalCount }
              : null
          }
          onSwitchUser={onSwitchUser}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  )
}

/* `TitlePair` was deleted here — V4. It rendered `<sub-tab> › <subtitle>` (or
   `<sub-tab> › <detail>`), which is the third of three places the same two
   strings appeared on every route. Nothing replaced it; the slot is empty. If
   you are about to put a breadcrumb back, read §2.6 first — it bans them
   outright, and D-3 only ever sanctioned this pair at exactly two tokens. */
