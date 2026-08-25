/**
 * `ModuleRail` (S-01) — level 1, the workspace rail. Design spec §2.
 *
 * 80px (96px in Arabic, by token), full height, **never scrolls** — five items
 * cannot overflow. Four workspace tiles as one group, then the sub-tab
 * disclosure, then `Admin` **pinned to the bottom**: the one §2.1 nav rule the
 * D-4 deviation preserves intact (**AC-02**).
 *
 * Rules applied
 *   §2.1        anatomy — wordmark 32px block · tile 72 × 56 inset 4px radius
 *               8px · icon 20px in the top 28px · label 12px/500 beneath ·
 *               4px between tiles · hairline above the pinned Admin tile.
 *   §2.2        icon + LABEL, not icon-only. At 1280px the sub-tab column is
 *               collapsed on first run, so the rail is the entire visible
 *               navigation, and five unlabelled glyphs — four of them abstract
 *               — are a recall test performed all day. `Customer Support`
 *               shortens to `Support` through a SEPARATE KEY, never a runtime
 *               truncation; the accessible name stays the full name.
 *   §2.3        ACTIVE = white pill + 1px hairline + label 600 + icon blue +
 *               a 3px `--ev-blue` INSET LEADING EDGE. Three carriers, so the
 *               state survives greyscale and low vision (§7.5). Disabled does
 *               not exist: a workspace the role cannot see is NOT RENDERED
 *               (**AC-57**).
 *   §2.3/AC-08  **the active tile is derived from `route.workspaceId`, never
 *               from a click.** No handler in this file sets an active state.
 *   §2.4/AC-26  count badges: warning or neutral, never red (R5a), never a
 *               `0`, `99+` above 99, and **never suppressed when the column is
 *               collapsed** (**AC-27**) — that is the one state in which the
 *               tile badge is the only backlog signal.
 *   §13.2/AC-64 the four tiles are ONE tab stop with a roving tabindex; ↑ ↓
 *               move between them, Home / End jump. Then the disclosure, then
 *               Admin. Visual order = DOM order = tab order (§7.3).
 *   §7.4        every tile is an `<a>`. Nothing here is a `<div onClick>`.
 *   §9.5        none of the five glyphs mirrors; the disclosure does, per its
 *               own definition. Every utility is logical.
 *   R-3 §1.3    the rail carries NO elevation — it is a chrome region, not a
 *               card. Its separation from the canvas is the 1px hairline
 *               (sanctioned deviation 3).
 */

import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib'
import { useRovingFocus } from '@/hooks'
import type { NavCounts, SubTabRoute, Workspace, WorkspaceId } from '@/data/types'
import type { Translate } from '@/lib'
import { WorkspaceGlyph, SubTabDisclosureGlyph } from './icons'
import { badgeOverflows, workspaceBadge, type NavBadge } from './navBadges'

export interface ModuleRailProps {
  workspaces: readonly Workspace[]
  /** Already permission-filtered (`visibleSubTabs` over the whole table). */
  visibleRows: readonly SubTabRoute[]
  navCounts: NavCounts | null
  navCountsLoading: boolean
  /** Derived from the URL. Never set by a handler (**AC-08**). */
  activeWorkspaceId: WorkspaceId | null
  landingRoute: string
  collapsed: boolean
  onToggleCollapsed: () => void
  /** The rail-anchored popover attaches here when collapsed (§3.2). */
  disclosureRef: React.Ref<HTMLButtonElement>
  t: Translate
}

export function ModuleRail({
  workspaces,
  visibleRows,
  navCounts,
  navCountsLoading,
  activeWorkspaceId,
  landingRoute,
  collapsed,
  onToggleCollapsed,
  disclosureRef,
  t,
}: ModuleRailProps) {
  /* §2.2 — rail order is display order, and `Admin` is pinned to the bottom
     while the other four sit as one group above it (**AC-02**). Which one is
     pinned is DATA (`workspace.pinnedToBottom`), so moving it is a fixture
     edit. */
  const group = workspaces.filter((w) => !w.pinnedToBottom)
  const pinned = workspaces.filter((w) => w.pinnedToBottom)

  /* AC-64 — the four tiles are ONE tab stop. The disclosure and Admin are
     their own stops, which is §13.2's order exactly. */
  const roving = useRovingFocus({ itemCount: group.length })

  return (
    <nav
      aria-label={t('shell.nav.workspaces')}
      /* `overflow-hidden`, not `overflow-auto`: §1.1 — the rail NEVER scrolls,
         and AC-19 tests that scrolling the content leaves it untouched. */
      className="flex h-full w-rail shrink-0 flex-col items-center overflow-hidden border-e border-border bg-background px-1 py-2"
    >
      <Link
        to={landingRoute}
        aria-label="Eyvar"
        className="mb-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <EyvarMark />
      </Link>

      <div ref={roving.containerRef} className="flex w-full flex-col gap-1">
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

      {/* §2.5 — ONE control, ONE fixed position, two states. It sits between
          the four tiles and Admin, which is finding F-3's placement and
          AC-64's amended order. Re-expanding is the POPOVER's pin control, not
          a second rail button, so D-L10 is not recreated. */}
      <button
        ref={disclosureRef}
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t('shell.nav.showSubTabs') : t('shell.nav.hideSubTabs')}
        className="mt-1 flex h-7 w-full shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-hidden hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <SubTabDisclosureGlyph filled={!collapsed} className="size-5" />
      </button>

      {/* Flexible spacer — Admin is pinned, it does not scroll with the list. */}
      <div className="flex-1" />

      {pinned.length > 0 && (
        <Separator className="my-2 w-full" />
      )}
      <div className="flex w-full flex-col gap-1">
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
  /* §2.2 — the VISIBLE label may be the short form; the ACCESSIBLE name is
     always the full one, and the full one contains the short one, so WCAG
     2.5.3 (Label in Name) holds. `Customer Support` is the only workspace that
     needs a short form; the key simply falls back to the full name for the
     other four, so there is no branch here. */
  const fullName = t(workspace.titleKey)
  const shortName = workspace.id === 'support' ? t('nav.workspace.support.short') : fullName

  return (
    <Link
      to={`${workspace.routePrefix}/overview`}
      aria-label={fullName}
      /* AC-08 — `aria-current` and every visual affordance below come from the
         ROUTE, which is why there is no `onClick` on this element at all. */
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group/tile relative flex h-14 w-full flex-col items-center justify-center gap-1',
        'rounded-lg border border-transparent text-muted-foreground',
        'transition-colors outline-hidden',
        'hover:bg-accent hover:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active && 'border-border bg-card text-foreground',
      )}
      {...itemProps}
    >
      {/* §2.3 — the 3px `--ev-blue` inset leading edge. An absolutely
          positioned span with `start-0`, NOT `box-shadow: inset 3px 0 0`:
          box-shadow is one property and §7.2's focus ring already owns it
          (R-3 ruling), and a physical inset would not mirror in Arabic. */}
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 start-0 w-marker rounded-s-lg bg-primary"
        />
      )}

      <WorkspaceGlyph
        workspaceId={workspace.id}
        className={cn('size-5', active && 'text-primary')}
      />
      <span className={cn('text-xs leading-none', active ? 'font-semibold' : 'font-medium')}>
        {shortName}
      </span>

      {/* §2.4 — block-start / inline-end, inset 6px. AC-27: NEVER suppressed
          when the sub-tab column is collapsed. §9.1: while the counts load,
          only the BADGE is a skeleton — the label above already rendered. */}
      {badgeLoading ? (
        <span
          aria-hidden="true"
          className="absolute top-1.5 end-1.5 h-4 w-6 animate-pulse rounded-lg bg-border"
        />
      ) : (
        badge && (
          <Badge
            size="count"
            tone={badge.tone}
            className="absolute top-1.5 end-1.5"
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
 * lettering: §2.1 gives it a 32px block with a 24px glyph, and lettering is
 * illegible at that size. D-3 moved the mark into the rail, which is what frees
 * the top bar for wayfinding.
 */
function EyvarMark() {
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
