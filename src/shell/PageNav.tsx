/**
 * `PageNav` (S-02) — level 2, the sub-tab column. Design spec §3, as amended by
 * `02-visual-refinement.md` V1 / V2 / V3.
 *
 * **Always rendered.** The collapse is gone (`DECISIONS.md` **D5**): there is no
 * disclosure, no popover, no pin and no persisted flag. §3.2, §3.3 and design
 * spec §3.9's collapse clause are void, and with them **AC-32** and **AC-33** —
 * which is a net win, because AC-33's reload clause was the one criterion the
 * shell was failing, on the unanswered **Q1**. Removing the feature removes the
 * gap rather than hiding it.
 *
 * Rules applied
 *   §3.1/V1     224px (256 in Arabic, by token) · heading `--ev-topbar-h` (48,
 *               see below) · rows 28px (`--ev-navrow-h`), **gap 0**, column
 *               inline padding 8, row inline padding 8, list padding-block-start
 *               8, group separator 8 · labels never truncate · an independent
 *               scroll context (**AC-19**).
 *   §3.1        the `Overview` separator: Overview READS, it never ACTS, and
 *               that rule is encoded once in the chrome rather than
 *               re-explained per workspace.
 *   §3.1        WIDTH NEVER CHANGES WITH CONTENT. A workspace filtered by
 *               permission to one visible sub-tab still renders at full width
 *               with that one row selected.
 *   §3.1/AC-09  active row = `route.subTabId`. A level-3 detail highlights its
 *               PARENT sub-tab; a `?view=` changes nothing (**AC-10**).
 *   §2.1/D6/V3  the column's ground is `--ev-bg-nav`, one step darker than the
 *               canvas, and there is **no `border-e`** — §2.1 forbids a border
 *               between nav and content once the tonal step exists.
 *   §2.3/V2     ACTIVE = an inset filled WHITE pill and nothing else. No 3px
 *               blue leading edge, no 1px hairline, no shadow. On the darker
 *               ground the pill alone reads at 1.182 : 1, against the
 *               reference's own 1.192 : 1; weight 600 is the second carrier.
 *   §2.4/V6     the row keeps its tone, and `warning` there now means
 *               **breached**, rarely — never merely "this queue is non-empty".
 *               `neutral` uses `--ev-nav-chip`, a plate you can see, which is
 *               what removes the incentive to reach for colour at all.
 *   §7.2/V1     the focus ring is `ring-2 ring-inset`. **Forced by the zero row
 *               gap**: an offset ring would overlap the neighbouring row.
 *   §13.2/AC-64 the list is ONE tab stop with a roving tabindex.
 *   §7.4        every row is an `<a>`.
 *   R-3 §1.3    the column carries NO elevation and no border.
 *
 * ── the heading is `h-topbar`, not `h-10` ────────────────────────────────
 *
 * §3.1 specified a 40px heading row while §4 specifies a 48px top bar, and the
 * two sit side by side starting at the same y. The result was two full-width
 * horizontal rules 8px apart with the first nav row starting between them — a
 * visible step in the register right across the app at eye level. The heading is
 * now 48px, so the wordmark band, the column heading and the top bar are **one
 * band**.
 *
 * **And the hairline under it is gone.** With the tonal step, the heading already
 * reads as part of the nav; a rule under it would be the only horizontal line in
 * either nav column and it would run straight into the top bar's own `border-b`
 * at the seam — reproducing the broken step in a new place, now with two
 * different grounds meeting a line. The band is carried by the ground, which is
 * what §2.1 asks for.
 */

import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
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
}

/**
 * The column. Full height, its own scroll context, a sibling of the rail and of
 * the content region — not a nested menu, and never collapsed.
 */
export function PageNav({
  workspace,
  rows,
  navCounts,
  navCountsLoading,
  activeSubTabId,
  t,
}: PageNavProps) {
  /* AC-64 — one tab stop, ↑ ↓ within. */
  const roving = useRovingFocus({ itemCount: rows.length })

  /* §3.1 — `Overview` is a different KIND of destination. It is always the
     first row (spec §3.4), and the rule is carried by the route table's own
     ordering, not by a hard-coded id. */
  const [first, ...rest] = rows

  return (
    /* A `<nav>` with its OWN accessible name. Two navigation landmarks in one
       document must be distinguishable, or a screen-reader user hears
       "navigation" twice and cannot tell the workspace rail from the sub-tab
       column (§7.4). The name carries the workspace, through one key with a
       placeholder (**AC-75**). */
    <nav
      aria-label={
        workspace
          ? t('shell.nav.subTabsFor', { workspace: t(workspace.titleKey) })
          : undefined
      }
      className="flex h-full w-subnav shrink-0 flex-col overflow-hidden bg-nav text-nav-foreground"
    >
      {/* §3.1 — the heading band: `h-topbar`, the workspace's FULL name (the
          rail shows the short one), 13px/600, and NO CONTROL. The collapse is
          gone, so there is nothing that could have lived here. Inline padding
          is 8 + the row's own 8 = the label lands 16px from the column edge,
          exactly where the row labels below it do. */}
      <div className="flex h-topbar shrink-0 items-center px-4">
        <h2 className="truncate text-sm font-semibold text-foreground">
          {workspace ? t(workspace.titleKey) : ''}
        </h2>
      </div>

      {/* §3.1 / AC-19 — its own scroll context. Nine rows will not scroll in
          practice; it is a scroll context regardless, and that is what AC-19
          tests. */}
      <ScrollArea className="min-h-0 flex-1">
        {/* V1 — inline padding 8 (at 4 the pill touched both edges and stopped
            reading as a pill), padding-block-start 8, and **gap 0**: the
            measured Shopify pitch is the row height exactly. */}
        <div ref={roving.containerRef} className="flex flex-col px-2 pt-2 pb-1">
          {first && (
            <NavRow
              row={first}
              active={first.subTabId === activeSubTabId}
              badge={subTabBadge(navCounts, first.subTabId)}
              badgeLoading={navCountsLoading}
              t={t}
              {...roving.itemProps(0)}
            />
          )}
          {/* §3.1 — 1px hairline: Overview reads, it never acts. 8px above and
              below (V1 — measured Shopify 8, and back on the 4px grid).
              Rendered only when there is something to separate. */}
          {first && rest.length > 0 && <Separator className="my-2" />}
          {rest.map((row, index) => (
            <NavRow
              key={row.subTabId}
              row={row}
              active={row.subTabId === activeSubTabId}
              badge={subTabBadge(navCounts, row.subTabId)}
              badgeLoading={navCountsLoading}
              t={t}
              {...roving.itemProps(index + 1)}
            />
          ))}
        </div>
      </ScrollArea>
    </nav>
  )
}

/* ─────────────────────────────── one row ─────────────────────────────── */

interface NavRowProps {
  row: SubTabRoute
  active: boolean
  badge: NavBadge | null
  badgeLoading: boolean
  t: Translate
  tabIndex: 0 | -1
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>
  onFocus?: () => void
  'data-roving-item'?: ''
}

function NavRow({ row, active, badge, badgeLoading, t, ...itemProps }: NavRowProps) {
  return (
    <Link
      to={row.path}
      /* AC-08 — the highlight comes from the ROUTE. There is no `onClick`. */
      aria-current={active ? 'page' : undefined}
      className={cn(
        /* 28px row at 0 gap: pitch 28, which is the measured Shopify figure and
           one 4px step below `--ev-row-h` — restoring §2.3 ↔ §3.1's
           relationship that a nav row is SHORTER than a data row. */
        'relative flex h-navrow shrink-0 items-center gap-2 rounded-lg px-2',
        'text-sm',
        'transition-colors outline-hidden',
        'hover:bg-nav-hover hover:text-foreground',
        /* V1 — INSET, not offset. At gap 0 an offset ring overlaps the row
           above and below. This is the one place in the product that does not
           use `ring-offset-2`, and the zero gap is the reason. */
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        /* §2.3 / V2 — the whole active treatment. */
        active && 'bg-card font-semibold text-foreground',
      )}
      {...itemProps}
    >
      {/* §3.1 — labels are NEVER truncated. The longest, `Ledger & Payment
          Controls`, measures ~160px at 13px and 224px accommodates it plus a
          three-digit badge with slack. */}
      <span className="min-w-0 flex-1">{t(row.titleKey)}</span>

      {badgeLoading && row.hasBacklog ? (
        <span aria-hidden="true" className="h-4 w-6 animate-pulse rounded-lg bg-nav-chip" />
      ) : (
        badge && (
          /* V6 — `warning` on a ROW is the one licensed tone in the nav and it
             means BREACHED, rarely. Everything else is the quiet chip. */
          <Badge size="count" tone={badge.tone === 'warning' ? 'warning' : 'nav-neutral'}>
            {badgeOverflows(badge.count) ? t('shell.nav.countOverflow') : formatCount(badge.count)}
          </Badge>
        )
      )}
    </Link>
  )
}
