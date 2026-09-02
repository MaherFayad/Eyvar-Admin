/**
 * `ModuleRail` (S-01) — level 1, the workspace rail. Design spec §2, as amended
 * by `02-visual-refinement.md` V1 / V2 / V3 / V6.
 *
 * 80px (88px in Arabic, by token), full height, **never scrolls** — five items
 * cannot overflow. Four workspace tiles as one group, then `Admin` **pinned to
 * the bottom**: the one §2.1 nav rule the D-4 deviation preserves intact
 * (**AC-02**).
 *
 * Rules applied
 *   §4.1/D7     the rail's ground is `--ev-bg-nav` `#f6f8f9`, ONE STEP DARKER
 *               than a WHITE content region — **the tonal direction does not
 *               invert** — **and it carries a 1px `--ev-hairline` seam.** D6's
 *               second bullet is void: the reference draws a border at both
 *               sidebar edges in every frame, and at a 1.054 : 1 tonal step it
 *               has to, because five units of luminance is not a boundary.
 *               The value is DECLARED, not sampled — it is the reference's own
 *               `--color-bg-muted` / `gray-50`. See `globals.css`.
 *   §2.2 (amended, D5) **the visible label IS the accessible name.** The old
 *               short-label / full-`aria-label` split was justified by WCAG
 *               2.5.3 (Label in Name) because "Customer Support" contains
 *               "Support". That reasoning does not survive `Ops`, which
 *               "Operations" does not contain, so the short word becomes the
 *               tile's actual name — visible and accessible alike. The full
 *               name is not lost: the sub-tab column's heading carries it, and
 *               so do the top-bar pair and global search.
 *   §4.1/D7     ACTIVE = an inset filled **GREY** pill and **nothing else**.
 *               No 3px leading edge, no 1px hairline, no shadow, **and no blue
 *               glyph** — `text-primary` came off the active icon here,
 *               because `--primary` is near-black now and a near-black glyph
 *               on a grey pill says nothing the pill and the 600 label do not
 *               already say. **The pill inverts and it costs almost nothing:**
 *                 Shopify, measured (D6)      1.192 : 1
 *                 Eyvar under D6 (white)      1.182 : 1
 *                 Navattic (#e5e7eb on nav)   1.162 : 1
 *               V2's *argument* survives intact upside down — the marker and
 *               the hairline were compensation for a ground that was too
 *               light, so the ground is still the prerequisite, not a nicety.
 *               Weight 600 on the active label and `aria-current` are the
 *               other two carriers, so the state survives greyscale and low
 *               vision (§7.5).
 *   §2.3/AC-08  **the active tile is derived from `route.workspaceId`, never
 *               from a click.** No handler in this file sets an active state.
 *   §2.4/V6     **the tile's count badge is `neutral`, always.** The count
 *               still rolls up (AC-27's count clause); the TONE does not. A
 *               tile's number is a sum of heterogeneous queues and a sum of
 *               different kinds of thing has no single status to report. The
 *               rule and the measurement live in `navBadges.ts`.
 *   §2.4/AC-26  never a `0`, never a `—`, never an empty chip. `99+` above 99.
 *   §13.2/AC-64 (amended, D5) the four tiles are ONE tab stop with a roving
 *               tabindex; ↑ ↓ move between them, Home / End jump. Then Admin.
 *               **The disclosure is gone, so it is no longer in the order.**
 *   §7.2/V1     the focus ring is `ring-2 ring-inset`, **not** `ring-offset-2`.
 *               Forced by the sub-tab column's zero row gap and applied to both
 *               nav levels so the two agree; the rest of the product keeps the
 *               offset ring.
 *   §7.4        every tile is an `<a>`. Nothing here is a `<div onClick>`.
 *   §9.5        none of the five glyphs mirrors. Every utility is logical.
 *   R-3 §1.3    the rail carries NO elevation. Since D7 it carries a border
 *               again: its separation from the content region is the tonal
 *               step **plus** the seam, which is what the reference does.
 *
 * ── the vertical register ────────────────────────────────────────────────
 *
 * The rail used to be a 32px wordmark + 8px margin — a 40px band beside a 48px
 * top bar and a 40px column header: three bands, three heights, meeting at the
 * same y and agreeing about nothing. Now:
 *
 *   0  ──────────  wordmark band   **52px** = `--ev-topbar-h` (48 → 52 under
 *                                  D7), the same band as the top bar and the
 *                                  sub-tab column's heading
 *   52 ──────────  4px
 *   56 ──────────  tile 1          44px  = 4 + 20 glyph + 4 + 12 label + 4
 *   100 ─────────  4px             …so the tile PITCH is 48px, and every tile
 *   104 ─────────  tile 2          edge lands on it. **The tile keeps 44.** D7
 *                                  measures the reference's rail at 53px and
 *                                  ICON-ONLY; Eyvar's rail carries a label
 *                                  under every glyph (D-4), so neither its
 *                                  width nor its tile height transfers.
 *   …
 *   flex-1 spacer                  Admin is pinned; it does not scroll (AC-02)
 *   ── hairline ──                 inset 4px, matching the pill inset
 *   4px
 *   Admin tile     44px
 *   4px            floor, symmetric with the 4px under the wordmark band
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib'
import { useRovingFocus } from '@/hooks'
import type { NavCounts, SubTabRoute, Workspace, WorkspaceId } from '@/data/types'
import type { Translate } from '@/lib'
import { WorkspaceGlyph } from './icons'
import { badgeOverflows, workspaceBadge, type NavBadge } from './navBadges'

/**
 * §2.2 (amended, D5) — the rail's own label for each workspace, which is now
 * **also its accessible name**. One explicit map rather than a key built from
 * `workspace.id` at runtime, so every key is greppable and an id without a
 * label is a type error rather than a missing string at 3am.
 *
 * `Exec` for Management is the business owner's pick. Recorded as an open
 * naming question in `02-shell-fixes.md`: the other four name a FUNCTION and
 * `Exec` names an AUDIENCE, which is the one inconsistency in the set.
 */
const RAIL_LABEL_KEY: Record<WorkspaceId, string> = {
  management: 'nav.rail.management',
  operations: 'nav.rail.operations',
  financials: 'nav.rail.financials',
  support: 'nav.rail.support',
  admin: 'nav.rail.admin',
}

export interface ModuleRailProps {
  workspaces: readonly Workspace[]
  /** Already permission-filtered (`visibleSubTabs` over the whole table). */
  visibleRows: readonly SubTabRoute[]
  navCounts: NavCounts | null
  navCountsLoading: boolean
  /** Derived from the URL. Never set by a handler (**AC-08**). */
  activeWorkspaceId: WorkspaceId | null
  landingRoute: string
  t: Translate
}

export function ModuleRail({
  workspaces,
  visibleRows,
  navCounts,
  navCountsLoading,
  activeWorkspaceId,
  landingRoute,
  t,
}: ModuleRailProps) {
  /* §2.2 — rail order is display order, and `Admin` is pinned to the bottom
     while the other four sit as one group above it (**AC-02**). Which one is
     pinned is DATA (`workspace.pinnedToBottom`), so moving it is a fixture
     edit. */
  const group = workspaces.filter((w) => !w.pinnedToBottom)
  const pinned = workspaces.filter((w) => w.pinnedToBottom)

  /* AC-64 (amended) — the four tiles are ONE tab stop, then Admin. */
  const roving = useRovingFocus({ itemCount: group.length })

  return (
    <nav
      aria-label={t('shell.nav.workspaces')}
      /* `overflow-hidden`, never auto-scrolling: §1.1 — the rail NEVER scrolls,
         and AC-19 tests that scrolling the content leaves it untouched.
         D7 §4.1 — `bg-nav` AND `border-e`. **The seam is back**, reversing D6's
         second bullet: Navattic draws a border at destination x = 28 in every
         sidebar frame, and at a 1.047:1 tonal step it has to — five units of
         luminance is not a boundary. §2.1's no-border clause is a Shopify
         observation D7 replaces, and D-4 now names it as suspended. */
      className="flex h-full w-rail shrink-0 flex-col overflow-hidden border-e border-border bg-nav-rail text-nav-rail-foreground"
    >
      {/* The wordmark BAND — `h-topbar`, so its lower edge is the top bar's
          lower edge. One register across the full width of the app. */}
      <div className="flex h-topbar shrink-0 items-center justify-center">
        <Link
          to={landingRoute}
          aria-label="Eyvar"
          /* 32px is right for a mouse and is the one target in the rail with
             no height token behind it, so the compact query cannot reach it the
             way it reaches `--ev-navrow-h`. `min-*` under `compact:` only: a
             floor below the breakpoint, unchanged above it. Measured: it was
             the single sub-44px target left in the drawer. */
          className="flex size-8 compact:min-h-tap compact:min-w-tap items-center justify-center rounded-lg text-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <EyvarMark />
        </Link>
      </div>

      <div ref={roving.containerRef} className="flex flex-col gap-1 px-1 pt-1">
        {group.map((workspace, index) => (
          <RailTile
            key={workspace.id}
            workspace={workspace}
            active={workspace.id === activeWorkspaceId}
            badge={workspaceBadge(navCounts, visibleRows, workspace.id)}
            badgeLoading={navCountsLoading}
            t={t}
            {...roving.itemProps(index)}
          />
        ))}
      </div>

      {/* Flexible spacer — Admin is pinned, it does not scroll with the list. */}
      <div className="flex-1" />

      <div className="flex flex-col gap-1 px-1 pb-1">
        {pinned.length > 0 && <Separator />}
        {pinned.map((workspace) => (
          <RailTile
            key={workspace.id}
            workspace={workspace}
            active={workspace.id === activeWorkspaceId}
            badge={workspaceBadge(navCounts, visibleRows, workspace.id)}
            badgeLoading={navCountsLoading}
            t={t}
            tabIndex={0}
          />
        ))}
      </div>
    </nav>
  )
}

/* ────────────────────────────── one tile ────────────────────────────── */

interface RailTileProps {
  workspace: Workspace
  active: boolean
  badge: NavBadge | null
  badgeLoading: boolean
  t: Translate
  tabIndex: 0 | -1
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>
  onFocus?: () => void
  'data-roving-item'?: ''
}

function RailTile({
  workspace,
  active,
  badge,
  badgeLoading,
  t,
  ...itemProps
}: RailTileProps) {
  /* §2.2 (amended, D5) — ONE name. It is what the tile shows and what a screen
     reader announces, so WCAG 2.5.3 holds by identity rather than by
     containment. There is no `shortName` / `fullName` split left to drift.
     Note the tile carries NO `aria-label`: that is deliberate and it is the fix
     for defect D-4. An `aria-label` replaces the whole subtree in the
     accessible-name computation, so the count badge below used to be announced
     to nobody. Now the name composes — `Ops 35 items need attention`. */
  const name = t(RAIL_LABEL_KEY[workspace.id])

  return (
    <Link
      to={`${workspace.routePrefix}/overview`}
      /* AC-08 — `aria-current` and every visual affordance below come from the
         ROUTE, which is why there is no `onClick` on this element at all. */
      aria-current={active ? 'page' : undefined}
      className={cn(
        /* 44px = 4 + 20 glyph + 4 gap + 12 label + 4, every term on the grid. */
        'group/tile relative flex h-11 w-full flex-col items-center justify-center gap-1',
        'rounded-lg px-1',
        'transition-colors outline-hidden',
        'hover:bg-nav-hover hover:text-foreground',
        /* V1 — INSET, not offset. The sub-tab column's rows sit at gap 0, so an
           offset ring there would overlap its neighbour; both nav levels use
           the same ring so they cannot disagree. */
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        /* §2.3 / V2 — the whole active treatment: an inset filled white pill
           and a 600 label. Nothing else. */
        active && 'bg-nav-rail-chip text-foreground',
      )}
      {...itemProps}
    >
      {/* No `text-primary` on the active glyph. It was blue and read as a
          third carrier; `--primary` is `--ev-ink` under D7, so the class now
          paints the same near-black the active label already has. Removing it
          is fix-list item 10's audit clause — a component that reached for
          `primary` because it wanted BLUE. The active state's carriers are the
          pill, weight 600 and `aria-current` (§7.5). */}
      <WorkspaceGlyph workspaceId={workspace.id} className="size-5" />
      {/* `truncate` is a GUARD, not a mechanism. Every rail label is ≤ 7
          characters, and 7 characters at 11px measure ~40px inside a 72px
          content box, so it cannot fire — verified by measurement, not by eye.
          It stays because a workspace label is still translatable free text and
          an Arabic string is not bound by the English count.
          `leading-3` (12px), not `leading-none`: that is the term that makes
          the tile sum to 44 on the 4px grid (V1). */}
      <span
        className={cn(
          'w-full truncate text-center text-2xs leading-3',
          active ? 'font-semibold' : 'font-medium',
        )}
      >
        {name}
      </span>

      {/* §2.4 — block-start / inline-end. §9.1: while the counts load, only the
          BADGE is a skeleton — the label above already rendered, because it
          comes from the route table and not from the network. The skeleton is
          the chip's exact size and fill, so nothing moves when the number
          lands. */}
      {badgeLoading ? (
        <span
          aria-hidden="true"
          className="absolute top-1 end-1 h-4 w-6 animate-pulse rounded-lg bg-nav-rail-chip ring-2 ring-nav-rail"
        />
      ) : (
        badge && (
          <Badge
            size="count"
            /* V6 — the tile is always neutral, and on the nav's ground neutral
               is `--ev-nav-chip`: a quiet plate you can actually see, with ink
               digits. `badge.tone` is `'neutral'` unconditionally here; the
               conditional is kept honest rather than assumed, so a future
               change in `navBadges` cannot silently paint a tile amber.

               **THE REFERENCE HAS NO NAV COUNT AT ALL** — not in its rail, not
               in its column (`people-match.md` S14) — and ours were called the
               loudest colour on the page. They are §8.4 FUNCTION and D7
               explicitly does not touch §8, so they are NOT deleted. What
               changed is the plate: `--ev-nav-chip` is now the reference's own
               `gray-200` #e5e7eb at 1.162 : 1 on the nav, which sits UNDER the
               white content region rather than over it. The count is legible
               (ink digits, 14.1 : 1) and the chip is not an event. */
            tone={badge.tone === 'warning' ? 'warning' : 'nav-neutral'}
            /* The badge overlaps the glyph by design — there is no room for it
               not to. The ring cuts a clean notch out of whatever sits under
               it, which is what makes the overlap read as deliberate rather
               than as a collision. On an ACTIVE tile that ground is the white
               pill; everywhere else it is the nav. */
            className={cn('absolute top-1 end-1 ring-2', active ? 'ring-card' : 'ring-nav')}
            aria-label={t('shell.nav.backlog', { count: badge.count })}
          >
            {badgeOverflows(badge.count) ? t('shell.nav.countOverflow') : formatCount(badge.count)}
          </Badge>
        )
      )}
    </Link>
  )
}

/**
 * The Eyvar mark. **Brand — it never mirrors** (§9.5). Mark only, no wordmark
 * lettering: lettering is illegible at 24px. D-3 moved the mark into the rail,
 * which is what frees the top bar for wayfinding.
 *
 * **Exported, because the auth card needs the same glyph** (design/08 §2.2's
 * `<AuthWordmark>` — the mark at 24px beside the word). It stays declared here
 * rather than moving to a shared module: the rail is where the mark lives in
 * the product, this is its one dependency-free file, and a second copy of a
 * logo is a second logo the day one of them is edited.
 */
export function EyvarMark(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="currentColor" />
      <path
        d="M7.5 7.5l4.5 6.2 4.5-6.2M12 13.7V17"
        className="fill-none stroke-card"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
