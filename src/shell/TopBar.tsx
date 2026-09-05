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
 * case, it is the ground. The rule below it is `--ev-hairline` `#e3e7ea`, the
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
 *   §4 slot 1   **EMPTY on every route (O11).** The back arrow lives beside the
 *               page title, where the eye lands; a detail route drew two, both
 *               named `Back` and both calling `navigate(-1)`. See `PageHeader`.
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

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib'
import type { ThemeChoice } from '@/hooks'
import type { Language, Translator } from '@/lib'
import type { Notification, Session } from '@/data/types'
import { AccountMenu } from './AccountMenu'
import { GlobalSearch } from './GlobalSearch'
import { NotificationBell } from './NotificationBell'
import type { ShellState } from './ShellContext'

export interface TopBarProps {
  shell: ShellState
  t: Translator
  language: Language
  onOpenEntity: (entityId: string) => void
  onOpenNotifications: () => void
  onOpenAccount: () => void
  /** §10.4 — the account menu's permanent onboarding entry (**AC-598**). */
  onOpenOnboarding: () => void
  onOpenNotification: (notification: Notification) => void
  /** The seeded operator to become. See `AccountMenu` on why it takes an id. */
  onSwitchUser: (userId: string) => void
  onSignOut: () => void
  /**
   * AC-70 — forwarded to the account menu, which is where the language control
   * lives. The bar itself has no language affordance: slot 3 is already the
   * busiest strip on the page (see the divergence note above) and a switch an
   * operator touches twice a year does not earn a permanent slot beside a
   * count chip they read every minute.
   */
  onSetLanguage: (language: Language) => void
  /** Forwarded to `AccountMenu`; the top bar itself never reads it. */
  theme: ThemeChoice
  onSetTheme: (next: ThemeChoice) => void
  /** §6.3: the operator's availability control, or `null` for an operator off the roster. */
  availability?: ReactNode
  /** Who is on the rota right now. `null` is the gap the chip exists to show. */
  onCallName: string | null
  /**
   * The compact shell's navigation control, or `null` above the breakpoint.
   *
   * A NODE rather than a boolean, because the control is a Radix dialog trigger
   * and has to be rendered inside the dialog root that `AppLayout` wraps the
   * frame in. Passing `compact` and constructing it here would put the trigger
   * outside its own context, where it renders but opens nothing.
   */
  menu?: ReactNode
  /**
   * Below `--ev-bp-compact`. Drops slots 3a and 3b — see the render.
   */
  compact?: boolean
}

export function TopBar({
  shell,
  t,
  language,
  onOpenEntity,
  onOpenNotifications,
  onOpenAccount,
  onOpenOnboarding,
  onOpenNotification,
  onSwitchUser,
  onSignOut,
  onSetLanguage,
  theme,
  onSetTheme,
  onCallName,
  availability = null,
  menu = null,
  compact = false,
}: TopBarProps) {
  const session: Session | null = shell.session

  return (
    <header className="flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      {/* Slot 1 — empty on every route (O11): V4 deleted the route trail and
          the back arrow moved to the page header, beside the title. */}
      {/* `flex-1` on both outer slots is what centres the field on the viewport
          above the breakpoint (§2.1). Below it there is no width to centre
          anything in, so the two slots shrink to their contents and the field
          takes the slack — see `GlobalSearch`, where the fixed 400px field used
          to overflow and cover the navigation control. */}
      <div className="flex min-w-0 flex-1 compact:flex-none items-center gap-2">
        {/* Slot 0 — the compact shell's navigation control. FIRST in the bar and
            first in the tab order after the skip link, because below the
            breakpoint it is the only route to the rail and the sub-tab column:
            a keyboard or screen-reader operator must not have to pass the
            search field and four chips to reach the navigation. Above the
            breakpoint this is `null` and the bar is unchanged. */}
        {menu}
      </div>

      {/* Slot 2 — §2.1 centres the field on the VIEWPORT. */}
      <GlobalSearch
        t={t}
        onOpenEntity={onOpenEntity}
        onOpenOnboarding={onOpenOnboarding}
        /* F6 — the same three the account menu below is given, so `session.*`
           in the palette and the menu are one act. */
        onSetLanguage={onSetLanguage}
        onSetTheme={onSetTheme}
        onSignOut={onSignOut}
      />

      {/* `shrink-0`: three chips, the bell and the avatar keep their width and the search field gives (§2.1). */}
      <div className="flex shrink-0 compact:flex-none items-center justify-end gap-1.5">
        {/* Slot 3a — `Mine`. Renders nothing at zero (AC-26). Routes to
            `/operations/my-work`, which is D-L1's fix. No emoji (AC-76). */}
        {!compact && (session?.claimedCount ?? 0) > 0 && (
          <Button
            variant="secondary"
            size="xs"
            asChild
            aria-label={t.plural('shell.topbar.mineA11y', { count: session?.claimedCount ?? 0 })}
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
            the gap is the state that gets the warning tone.

            **3a and 3b are dropped below the breakpoint, and only these two.**
            390px of bar cannot hold a navigation control, a search field, two
            text chips, a bell and an avatar; something goes, and the question
            is what. Both of these are LINKS TO A PAGE that says the same thing
            at more length — `Mine` to `/operations/my-work`, `On call` to
            `/admin/team` — so nothing is lost that is not one tap away through
            the drawer. The bell and the account menu stay: the bell is the only
            surface that carries unread work at all, and the account menu is the
            only route to sign-out and to the language switch (AC-70).

            `!compact &&`, not a `hidden` class. A chip that is painted away is
            still in the tab order and still announced, which on the surface an
            operator navigates a phone with is worse than absent. */}
        {!compact && availability}

        {!compact && (
        <Button variant="secondary" size="xs" asChild>
          <Link to="/admin/team">
            <span className={cn(onCallName === null && 'text-warning-foreground')}>
              {onCallName === null
                ? t('shell.topbar.onCallUnassigned')
                : t('shell.topbar.onCall', { name: onCallName })}
            </span>
          </Link>
        </Button>
        )}

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
        theme={theme}
        onSetTheme={onSetTheme}
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
