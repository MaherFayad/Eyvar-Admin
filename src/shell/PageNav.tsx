/**
 * `PageNav` (S-02) — level 2, the sub-tab column, and its collapsed popover.
 * Design spec §3.
 *
 * **One row list, rendered in two places.** §3.2 requires the popover to show
 * *"same width (224px), same rows, same order, same badges, same active
 * treatment"* (**AC-33**), and the only way to guarantee that is for the
 * expanded column and the popover to render the *same component*. Two lists
 * that must agree are two lists that will not.
 *
 * Rules applied
 *   §3.1        224px (256 in Arabic, by token) · heading 40px, 13px/600, the
 *               workspace's FULL name, no control in that row · rows 32px
 *               (`--ev-navrow-h`), inset 4px, radius 8px, 10px inline padding ·
 *               labels never truncate · an independent scroll context
 *               (**AC-19**).
 *   §3.1        the `Overview` separator: Overview READS, it never ACTS, and
 *               that rule is encoded once in the chrome rather than
 *               re-explained per workspace.
 *   §3.1        WIDTH NEVER CHANGES WITH CONTENT. A workspace filtered by
 *               permission to one visible sub-tab still renders at full width
 *               with that one row selected.
 *   §3.1/AC-09  active row = `route.subTabId`. A level-3 detail highlights its
 *               PARENT sub-tab; a `?view=` changes nothing (**AC-10**).
 *   §3.2        collapsed: the column is NOT RENDERED and the content region
 *               gains its 224px back. The rail-anchored popover takes over,
 *               selecting a row navigates AND closes, `Escape` closes and
 *               returns focus to the disclosure (**AC-66**), and the PIN
 *               (`Keep sub-tabs open`) is the only way back to expanded.
 *   §3.2        no scrim, no focus trap — a popover does not trap; `Tab`
 *               closes and moves on (§7.3.3).
 *   §2.4        badges as in the rail: never red, never a `0`.
 *   §13.2/AC-64 the list is ONE tab stop with a roving tabindex.
 *   §7.4        every row is an `<a>`.
 *   R-3 §1.3    the column carries NO elevation. The POPOVER carries tier 2,
 *               through `PopoverContent`.
 */

import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib'
import { useRovingFocus } from '@/hooks'
import type { NavCounts, SubTabRoute, Workspace } from '@/data/types'
import type { Translate } from '@/lib'
import { badgeOverflows, subTabBadge, type NavBadge } from './navBadges'

export interface PageNavProps {
  workspace: Workspace | null
  /** Already permission-filtered and ordered (**AC-58**). */
  rows: readonly SubTabRoute[]
  navCounts: NavCounts | null
  navCountsLoading: boolean
  /** Derived from the URL (**AC-08**). */
  activeSubTabId: string | null
  t: Translate
  /** Popover mode: a row click navigates AND closes (§3.2). */
  onNavigate?: () => void
  /** The popover's pin, `Keep sub-tabs open`. Absent in the expanded column — §2.5. */
  onPin?: () => void
}

/**
 * The expanded column. Full height, its own scroll context, a sibling of the
 * rail and of the content region — not a nested menu.
 */
export function PageNav(props: PageNavProps) {
  return (
    <div className="flex h-full w-subnav shrink-0 flex-col overflow-hidden border-e border-border bg-background">
      <NavList {...props} />
    </div>
  )
}

/**
 * The popover body. §3.2: same width, same rows, same order, same badges, same
 * active treatment — because it is the same component.
 */
export function PageNavPopoverBody(props: PageNavProps) {
  return <NavList {...props} />
}

function NavList({
  workspace,
  rows,
  navCounts,
  navCountsLoading,
  activeSubTabId,
  t,
  onNavigate,
  onPin,
}: PageNavProps) {
  /* AC-64 — one tab stop, ↑ ↓ within. Not inside a Radix primitive: a popover
     does not own arrow keys, so this is one of the three sanctioned call sites
     for `useRovingFocus`. */
  const roving = useRovingFocus({ itemCount: rows.length })

  /* §3.1 — `Overview` is a different KIND of destination. It is always the
     first row (spec §3.4), and the rule is carried by the route table's own
     ordering, not by a hard-coded id. */
  const [first, ...rest] = rows

  return (
    <>
      {/* §3.1 — heading row: 40px, the workspace's FULL name, 13px/600, a
          hairline below, and NO CONTROL. The collapse control lives in the
          rail and nowhere else (§2.5), so D-L10's two-entry-points drift is
          not recreated. The pin is the popover's, and it is the way BACK. */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <h2 className="truncate text-sm font-semibold text-foreground">
          {workspace ? t(workspace.titleKey) : ''}
        </h2>
        {onPin && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onPin}
            aria-label={t('shell.nav.pinSubTabs')}
            className="ms-auto"
          >
            <PinGlyph />
          </Button>
        )}
      </div>

      {/* §3.1 / AC-19 — its own scroll context. Nine rows will not scroll in
          practice; it is a scroll context regardless, and that is what AC-19
          tests. */}
      <ScrollArea className="min-h-0 flex-1">
        <div ref={roving.containerRef} className="flex flex-col gap-0.5 p-1">
          {first && (
            <NavRow
              row={first}
              active={first.subTabId === activeSubTabId}
              badge={subTabBadge(navCounts, first.subTabId)}
              badgeLoading={navCountsLoading}
              onNavigate={onNavigate}
              t={t}
              {...roving.itemProps(0)}
            />
          )}
          {/* §3.1 — 1px hairline, 4px above and below: Overview reads, it
              never acts. Rendered only when there is something to separate. */}
          {first && rest.length > 0 && <Separator className="my-1" />}
          {rest.map((row, index) => (
            <NavRow
              key={row.subTabId}
              row={row}
              active={row.subTabId === activeSubTabId}
              badge={subTabBadge(navCounts, row.subTabId)}
              badgeLoading={navCountsLoading}
              onNavigate={onNavigate}
              t={t}
              {...roving.itemProps(index + 1)}
            />
          ))}
        </div>
      </ScrollArea>
    </>
  )
}

/* ─────────────────────────────── one row ─────────────────────────────── */

interface NavRowProps {
  row: SubTabRoute
  active: boolean
  badge: NavBadge | null
  badgeLoading: boolean
  onNavigate?: () => void
  t: Translate
  tabIndex: 0 | -1
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>
  onFocus?: () => void
  'data-roving-item'?: ''
}

function NavRow({ row, active, badge, badgeLoading, onNavigate, t, ...itemProps }: NavRowProps) {
  return (
    <Link
      to={row.path}
      aria-current={active ? 'page' : undefined}
      /* §3.2 — in the popover, selecting a row NAVIGATES AND CLOSES. In the
         expanded column `onNavigate` is undefined and this does nothing, which
         is why one component serves both. It does NOT set an active state:
         that comes from the route (**AC-08**). */
      onClick={onNavigate}
      className={cn(
        'relative flex h-navrow shrink-0 items-center gap-2 rounded-lg px-2.5',
        'border border-transparent text-sm text-foreground',
        'transition-colors outline-hidden',
        'hover:bg-accent',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active && 'border-border bg-card font-semibold',
      )}
      {...itemProps}
    >
      {/* §3.1 — the same 3px `--ev-blue` inset leading edge as the rail.
          `start-0`, not `box-shadow: inset` (R-3 ruling + §9.5). */}
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 start-0 w-marker rounded-s-lg bg-primary"
        />
      )}

      {/* §3.1 — labels are NEVER truncated. The longest, `Ledger & Payment
          Controls`, measures ~160px at 13px and 224px accommodates it plus a
          three-digit badge with slack. */}
      <span className="min-w-0 flex-1">{t(row.titleKey)}</span>

      {badgeLoading && row.hasBacklog ? (
        <span aria-hidden="true" className="h-4 w-6 animate-pulse rounded-lg bg-border" />
      ) : (
        badge && (
          <Badge size="count" tone={badge.tone}>
            {badgeOverflows(badge.count) ? t('shell.nav.countOverflow') : formatCount(badge.count)}
          </Badge>
        )
      )}
    </Link>
  )
}

/** The pin, `Keep sub-tabs open` (§3.2). A pushpin is an object — it never mirrors (§9.5). */
function PinGlyph() {
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
      <path d="M12 17v5" />
      <path d="M9 2h6l-.8 5.2 3.3 3.3v1.5H6.5v-1.5l3.3-3.3z" />
    </svg>
  )
}
