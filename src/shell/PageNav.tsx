/**
 * `PageNav` (S-02) — level 2, the sub-tab column. Design spec §3, as
 * **superseded by D7 `design/03-navattic-language.md` §4.1**. V1's density,
 * V2's white pill and V3's `#eaecf1` ground are all void; V2's *argument* — the
 * pill only works once the ground is right — survives and §3.3 re-verifies it.
 *
 * **Always rendered.** The collapse is gone (`DECISIONS.md` **D5**): there is no
 * disclosure, no popover, no pin and no persisted flag. §3.2, §3.3 and design
 * spec §3.9's collapse clause are void, and with them **AC-32** and **AC-33** —
 * which is a net win, because AC-33's reload clause was the one criterion the
 * shell was failing, on the unanswered **Q1**. Removing the feature removes the
 * gap rather than hiding it.
 *
 * Rules applied
 *   §4.1/D7     224px (256 in Arabic, by token) · heading `--ev-topbar-h` (52,
 *               see below) · rows **32px** (`--ev-navrow-h`), **gap 0** — the
 *               measured pill height (32.8) and the measured pitch (32.5)
 *               COINCIDE · radius 8 · column inline padding 8, row inline
 *               padding 8 · labels never truncate · an independent scroll
 *               context (**AC-19**). D-10's relationship still holds: the nav
 *               row is SHORTER than the data row, at 32 < 40.
 *   §3.1        the `Overview` separator: Overview READS, it never ACTS, and
 *               that rule is encoded once in the chrome rather than
 *               re-explained per workspace.
 *   §3.1        WIDTH NEVER CHANGES WITH CONTENT. A workspace filtered by
 *               permission to one visible sub-tab still renders at full width
 *               with that one row selected.
 *   §3.1/AC-09  active row = `route.subTabId`. A level-3 detail highlights its
 *               PARENT sub-tab; a `?view=` changes nothing (**AC-10**).
 *   §4.1/D7     the column's ground is `--ev-bg-nav` `#f8fafb`, one step darker
 *               than a WHITE content region, **and it carries `border-e`
 *               again** — D6's second bullet is void. See `ModuleRail` for the
 *               measurement that reverses it.
 *   §4.1/D7     ACTIVE = an inset filled **GREY** pill and nothing else. No 3px
 *               leading edge, no 1px hairline, no shadow. **The pill inverts
 *               and it costs almost nothing**: grey-on-near-white measures
 *               1.172 : 1 against Shopify's white-on-grey 1.192. Weight 600 and
 *               `aria-current` are the other two carriers (§7.5).
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
 * ── NOT BUILT: the section heading (D7 fix-list item 3) ──────────────────
 *
 * D7 §4.1 specifies a new element — a 12px `--ev-text-2` sentence-case section
 * heading in its own 32px row, 24px above the group it labels and 0 below, not
 * focusable, `role="presentation"` on the wrapper with the group labelled by
 * it. **It is not built, and building it would have required inventing the one
 * thing the spec does not supply: which sub-tabs form a group, and what each
 * group is called.**
 *
 * `SubTabRoute` (`src/data/types/navigation.ts:115`) is flat — `subTabId`,
 * `workspaceId`, `path`, `order`, `titleKey`, … and no section field — and
 * `routeTable.ts` carries no grouping. There are no `nav.section.*` copy keys
 * either. Rendering headings would mean hard-coding a partition of 34 sub-tabs
 * plus five to eight English labels in this file, which is a design decision
 * and a copy decision, taken in the wrong place.
 *
 * **What it needs, from two owners:**
 *   mock-data-engineer   `SubTabRoute.sectionKey: string | null`, plus the
 *                        value on each of the 34 rows. `null` = "no heading
 *                        above me", which makes `Overview` fall out for free.
 *   product-designer     the group labels and their copy keys, sentence case,
 *                        never uppercase (§6.3 D18, and the reference agrees).
 *
 * Once both land this is ~15 lines here and nothing else moves. Until then the
 * `Overview` separator below stays, because §3.1's rule that Overview READS and
 * never ACTS still has to be carried by something.
 *
 * ── the heading is `h-topbar`, not `h-10` ────────────────────────────────
 *
 * §3.1 specified a 40px heading row while §4 specifies a top bar, and the two
 * sit side by side starting at the same y. The result was two full-width
 * horizontal rules 8px apart with the first nav row starting between them — a
 * visible step in the register right across the app at eye level. The heading
 * takes `--ev-topbar-h` (**52px under D7**, up from 48), so the wordmark band,
 * the column heading and the top bar are **one band**. D7 §4.1 confirms it
 * independently: "the sidebar brand row is the same height and the two align" —
 * `cfa43315` brand ink centre y = 18 → 24.4px from the app top, the centre of a
 * 52px row.
 *
 * **And the hairline under it is still gone.** The heading reads as part of the
 * nav; a rule under it would be the only horizontal line in either nav column
 * and it would run straight into the top bar's own `border-b` at the seam —
 * reproducing the broken step in a new place, now with two different grounds
 * meeting a line. This is unaffected by D7 restoring the two VERTICAL seams:
 * those are the nav↔content boundary the reference draws, not a rule inside the
 * nav, and the reference draws no horizontal rule in its sidebar either.
 */

import { Fragment } from 'react'
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
/**
 * **Which sub-tabs belong together, for the workspaces long enough to need
 * saying.**
 *
 * Operations is ten rows. Ten rows in one column is a list an operator reads
 * top to bottom every time, because nothing in it says that `Quick rides` and
 * `Subscription trips` are two halves of one question while `My work` is not
 * about trips at all. The three groups are the product's own shape:
 *
 *   **subscriptions** — the plans, the trips they buy, and the corporate
 *                       accounts that are subscriptions bought in bulk
 *   **rides**         — a request, the ride it becomes, the captain sent to it,
 *                       and the assurance that covers it when it fails
 *   **the desk**      — what this operator owes, and the people behind supply
 *
 * **Rules, not titles.** The owner's direction is separators only, and it is
 * the right call for a nav: a group heading in a 232px column costs a row of
 * height each and turns a list of destinations into a document with sections.
 * A hairline says *these belong together* without claiming to name the thing
 * they have in common — which is what a heading would have to do, in two
 * languages, for a grouping that is editorial rather than structural.
 *
 * **Nothing is dropped.** A row this table does not name still renders, in
 * route-table order, in a final group of its own — so a sub-tab added tomorrow
 * appears in the nav that day rather than the day somebody remembers to add it
 * here. `Overview` is not in the table because it is separated already, above
 * every group, by the rule §3.1 puts under it.
 */
const NAV_GROUPS: Readonly<Record<string, readonly (readonly string[])[]>> = {
  operations: [
    [
      'operations-subscriptions',
      'operations-subscription-requests',
      'operations-subscription-trips',
      'operations-corporate',
    ],
    [
      'operations-ride-requests',
      'operations-quick-rides',
      'operations-dispatch',
      'operations-assurance',
    ],
    ['operations-my-work', 'operations-people'],
  ],
}

/**
 * The rows, in groups, in the order the table declares — and every row exactly
 * once whether or not the table names it.
 *
 * Permission filtering happens before this (`visibleSubTabs`), so a group can
 * come back empty and an empty group renders nothing rather than a rule with
 * no rows under it.
 */
function groupRows(
  workspaceId: string | undefined,
  rows: readonly SubTabRoute[],
): SubTabRoute[][] {
  const spec = workspaceId ? NAV_GROUPS[workspaceId] : undefined
  if (!spec) return rows.length > 0 ? [[...rows]] : []

  const byId = new Map(rows.map((row) => [row.subTabId, row]))
  const groups: SubTabRoute[][] = []
  const placed = new Set<string>()

  for (const ids of spec) {
    const group: SubTabRoute[] = []
    for (const id of ids) {
      const row = byId.get(id)
      if (row) {
        group.push(row)
        placed.add(id)
      }
    }
    if (group.length > 0) groups.push(group)
  }

  const rest = rows.filter((row) => !placed.has(row.subTabId))
  if (rest.length > 0) groups.push(rest)
  return groups
}

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

  /* The remaining rows, in groups — see `NAV_GROUPS`. The roving index is
     assigned over the FLATTENED order, because that is the order ↑ and ↓ move
     through and the order the rows are painted in; a separator is not a stop. */
  const groups = groupRows(workspace?.id, rest)
  /* Flattened once, so the roving index is the index a reader's eye and the
     arrow keys both use. Taking it from `rest` instead would hand ↓ the ROUTE
     order, and on Operations the two now differ. */
  const ordered = groups.flat()

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
      /* D7 §4.1 — `bg-nav` AND `border-e`, the column -> content seam. Present
         at destination x = 142 in every sidebar frame. See `ModuleRail` for the
         full reversal of D6's second bullet. */
      className="flex h-full w-subnav shrink-0 flex-col overflow-hidden border-e border-border bg-nav text-nav-foreground"
    >
      {/* §3.1 — the heading band: `h-topbar`, the workspace's FULL name (the
          rail shows the short one), 13px/600, and NO CONTROL. The collapse is
          gone, so there is nothing that could have lived here. Inline padding
          is 8 + the row's own 8 = the label lands 16px from the column edge,
          exactly where the row labels below it do. */}
      <div className="flex h-topbar shrink-0 items-center px-4">
        {/* `text-base` (16px), not `text-sm`. The match audit solves the
            reference's nav title at ~15.5px against our 13; 16 is the declared
            `--text-base` and one step above the 14px row label beneath it. */}
        <h2 className="truncate text-base font-semibold text-foreground">
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
          {groups.map((group, groupIndex) => (
            <Fragment key={group[0]?.subTabId ?? groupIndex}>
              {/* The same hairline and the same 8px either side as the rule
                  under `Overview`, so the column has one kind of divider rather
                  than two. Between groups only — never above the first, which
                  already has Overview's. */}
              {groupIndex > 0 && <Separator className="my-2" />}
              {group.map((row) => (
                <NavRow
                  key={row.subTabId}
                  row={row}
                  active={row.subTabId === activeSubTabId}
                  badge={subTabBadge(navCounts, row.subTabId)}
                  badgeLoading={navCountsLoading}
                  t={t}
                  {...roving.itemProps(ordered.indexOf(row) + 1)}
                />
              ))}
            </Fragment>
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
        /* D7 §4.1 — 32px row at 0 gap, radius 8. Measured pitch 32.5 and
           measured pill height 32.8 coincide, which is WHY the gap is 0. Still
           one 8px step below `--ev-row-h` (40), so D-10's relationship — a nav
           row is SHORTER than a data row — survives the rise. */
        'relative flex h-navrow shrink-0 items-center gap-2 rounded-lg px-2',
        'text-sm',
        'transition-colors outline-hidden',
        'hover:bg-nav-hover hover:text-foreground',
        /* V1 — INSET, not offset. At gap 0 an offset ring overlaps the row
           above and below. This is the one place in the product that does not
           use `ring-offset-2`, and the zero gap is the reason. */
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        /* D7 §4.1 — the whole active treatment: a grey pill, a 600 label and
           `aria-current`. `bg-nav-chip` is the pill; see the token's own
           declaration in `globals.css` for why one value serves both the pill
           and the resting count plate. */
        active && 'bg-nav-chip font-semibold text-foreground',
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
