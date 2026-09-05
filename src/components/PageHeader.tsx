/**
 * `PageHeader` (L-02) — design spec §8.
 *
 * ```
 * ←  Faisal Al-Otaibi  (Pending) (Docs expiring)   [Reject] [More ▾] [Approve]  ‹ ›
 *    Applied 19 Jul · Riyadh · APP-2201
 * ```
 *
 * Rules applied
 *   §8 slot 1   back arrow on detail / create / edit only, **absent on index
 *               routes**. A single `←`, never a trail (§2.6). Mirrors in Arabic
 *               at string-construction time (§9.5).
 *   §8 slot 2/D7 title **22px/600 (`text-xl`)**, up from 17. This is the one
 *               real change to the type ramp under D7 and it REDEFINES an
 *               existing Tailwind name rather than adding a token: `Visitors`
 *               (`82923d3f`) solves to 23.2 from cap height and 24.0 from
 *               x-height, `Members` (`6a08206b`) to 22.6, and the match
 *               audit's independent Inter-metric solve gives 21.95. Band
 *               22-24; 22 chosen. Its Arabic floor is 24/32.
 *               Required, always translatable.
 *   §8/V4       the second row is `meta` — **data-derived only**. `subtitle`
 *               is gone, and so is the static route-table description it used
 *               to render. See the prop's own doc comment.
 *   §8 slot 3   inline status badges, zero or more, immediately after the title
 *               **on the same baseline**. Never on their own row, never inside
 *               the action cluster. Read inline-start → inline-end in
 *               importance order.
 *   §8 slot 4a  **secondary actions cap at TWO.** Beyond two, everything after
 *               the first two collapses into `More actions ▾` — but only when
 *               the menu would hold three or more (D8-b); one or two render
 *               inline. Enforced here rather than trusted to each screen.
 *   §8 slot 4b  overflow is a `dropdown-menu`: verb-first imperatives, sentence
 *               case, no trailing punctuation, destructive item LAST and
 *               separated — but **not red** where a confirmation follows (§5.4).
 *   §8 slot 4c  **at most ONE primary per header.** R3 is KILLED by D7 — its
 *               first half tied the primary to brand blue, and the primary is
 *               near-black now — but the one-primary-per-header cap is §8's
 *               own rule and is untouched. On a task-shaped page
 *               it moves to the bottom of the rail summary card and the header
 *               carries none — EXCEPT at base width, where §7.2's rule returns
 *               it here. That is the only layout-dependent action move in the
 *               product, and `DetailPage` owns the decision.
 *   §8 slot 5   record pager `‹ ›`, rightmost of all, record-detail pages in an
 *               ordered list only. Chevrons mirror.
 *   §8          **unavailable actions render GREYED IN PLACE, never removed.**
 *               §11.2: gate at render, not at commit — the systemic legacy
 *               defect is that the operator clicks, waits, and is told no.
 *   §8          the header **scrolls with the content**. The top bar is the
 *               fixed wayfinding; two sticky bars is one too many at 13px.
 *   §8          alignment: the title's inline-start edge is the first card's
 *               inline-start edge; the last control's inline-end edge is the
 *               rail's inline-end edge.
 *   R-3 §1.3    no elevation. The page header is content, not a surface.
 */

import { useId, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { RefusalLine } from '@/components/table/rowActions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { backIcon, nextIcon, previousIcon } from '@/components/icons'
import type { Direction, Translate } from '@/lib'

export interface PageAction {
  label: string
  onClick: () => void
  /** §8 — renders greyed IN PLACE, never removed. */
  disabled?: boolean
  /**
   * §11.2's second clause: why the control is disabled, as rendered text the
   * button points `aria-describedby` at. Same field and same construction as
   * `RowAction.reason` (AC-368). Ignored when `disabled` is false.
   */
  reason?: string | null
  /** Overflow only. Last and separated; still not red (§5.4). */
  destructive?: boolean
}

export interface PageHeaderProps {
  title: string
  /**
   * §8's second row — 12px `--ev-text-2`. `null` renders nothing.
   *
   * **`meta`, not `subtitle`** (V4). It is a **metadata line, never a
   * description.** It carries only content DERIVED FROM THE DATA ON SCREEN —
   * counts, a record's identifiers, a timestamp. §7.1's own wireframe shows
   * `4 218 captains · 611 riders`. **If it cannot change when the data changes,
   * it does not belong here.** A sub-tab that needs explaining gets that in its
   * first-run empty state, where the operator is actually stuck, and nowhere
   * else.
   *
   * **`ReactNode` rather than `string`** — a monitor's scope line carries a
   * connection dot beside its sentence, and a screen that wants one should not
   * have to abandon the shared header to get it. It is still ONE line: a node
   * here is a decorated sentence, never a second row of controls.
   */
  meta?: ReactNode
  /**
   * §8 slot 4 — readings that belong to the page rather than to a card, at the
   * header's inline-end and BEFORE the actions, so a primary button is still
   * the last thing on the row wherever one exists.
   *
   * Live Dispatch puts its three velocity figures here because the board below
   * them is a full-bleed map with nowhere to hang a KPI strip. It is a slot for
   * READINGS: anything with an `onClick` belongs in `secondaryActions`, where
   * the cap and the overflow rules can see it.
   */
  aside?: ReactNode
  /**
   * §8 slot 4c, for a page-level control that is no `PageAction`: `aside` is a
   * READINGS slot and says so, and `secondaryActions` takes a label and one
   * `onClick`. Rendered LAST before any primary, so §8's order holds.
   */
  control?: ReactNode
  /** Inline status badges. Rendered after the title on the same baseline. */
  badges?: ReactNode
  /** §8 slot 1. Derived from the route's shape by the caller, never a stack depth. */
  onBack?: () => void
  /** §8 slot 4a — the first two render as buttons; the rest fall into overflow. */
  secondaryActions?: PageAction[]
  /** §8 slot 4b — always in the overflow menu, after any spilled secondaries. */
  overflowActions?: PageAction[]
  /**
   * `auto` (default) applies D8-b: a menu only at three or more. `always` keeps
   * the menu at any count, for the report builder and boards where Amplitude
   * fidelity outranks D8-b (docs/RULINGS.md).
   */
  overflow?: 'auto' | 'always'
  /** §8 slot 4c — AT MOST ONE. The type says one; R3 says one. */
  primaryAction?: PageAction
  /** §8 slot 5 — record-detail pages in an ordered list only. */
  pager?: { onPrevious: () => void; onNext: () => void; hasPrevious: boolean; hasNext: boolean }
  t: Translate
  dir: Direction
}

/** §8 slot 4a — the designer's cap. Two, then overflow. */
const SECONDARY_CAP = 2

export function PageHeader({
  title,
  meta,
  badges,
  aside,
  control,
  onBack,
  secondaryActions = [],
  overflowActions = [],
  overflow = 'auto',
  primaryAction,
  pager,
  t,
  dir,
}: PageHeaderProps) {
  /* T9.10/O10 - lucide at `size-4`, picked by `dir`. A font arrow drew at the
     text weight, so it was a hairline beside a 30px title, and its coverage
     differed in Arabic. This is the ONE back arrow on a detail route (O11). */
  const BackArrow = backIcon(dir)
  const PreviousChevron = previousIcon(dir)
  const NextChevron = nextIcon(dir)
  const reasonId = useId()
  const visibleSecondaries = secondaryActions.slice(0, SECONDARY_CAP)
  /* §8 — past the cap, actions spill into the menu rather than wrapping.
     D8-b — a menu is a disclosure for a LIST: it exists only when three or more
     would go in it; one or two render inline as labelled buttons instead. */
  const wouldSpill = [...secondaryActions.slice(SECONDARY_CAP), ...overflowActions]
  const menu = overflow === 'always' || wouldSpill.length >= 3 ? wouldSpill : []
  const inline = menu.length > 0 ? visibleSecondaries : [...visibleSecondaries, ...wouldSpill]
  /* §11.2 / plan §3 item 5 — each distinct refusal renders ONCE, under the
     group, at 12px; every refused control points aria-describedby at its line. */
  const refusals: string[] = []
  for (const action of [...inline, ...(primaryAction ? [primaryAction] : [])]) {
    const reason = refusalOf(action)
    if (reason !== null && !refusals.includes(reason)) refusals.push(reason)
  }
  const describedBy = (action: PageAction) => {
    const reason = refusalOf(action)
    return reason === null ? undefined : `${reasonId}-r${refusals.indexOf(reason)}`
  }

  return (
    /* D7 §4.2 — title → toolbar is 20px (11 destination px). `pb-5` is 20 on
       the 4px grid. It was 16, set against a 17px title; the title is 22 now
       and the old gap read as a collision. */
    <div className="flex flex-col gap-1 pb-5">
      <div className="flex items-start gap-2">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label={t('shell.topbar.back')}
            className="-ms-1.5 shrink-0"
          >
            <BackArrow aria-hidden="true" className="size-4" />
          </Button>
        )}

        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          {/* **`text-band`, which is the board band's own title size, because a
              page title is a page title.** It was 24/600 here and 30/500 on
              every board — two ranks for the same slot, and §8's whole point is
              that slot 1 does not move or change shape between routes. The
              weight comes down with the size going up: 600 at 30px is a
              display weight, and this is a name rather than a headline. */}
          <h1 className="text-band font-medium text-foreground">{title}</h1>
          {/* §8 slot 3 — same baseline as the title, never a second row. */}
          {badges}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {aside}

            {inline.map((action) => (
              <Button
                key={action.label}
                variant="secondary"
                onClick={action.onClick}
                disabled={action.disabled}
                aria-describedby={describedBy(action)}
              >
                {action.label}
              </Button>
            ))}

            {menu.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">
                    {t('shell.moreActions')}
                    {/* §10.2 — a dropdown BUTTON gets a single `⌄` caret; the
                        stacked `⌃⌄` pair is reserved for a select, and that is
                        the signal that tells the two apart. A caret is a mark:
                        it does not mirror (§9.5), so it is written literally. */}
                    <span aria-hidden="true">▾</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menu
                    .filter((a) => !a.destructive)
                    .map((action) => (
                      <DropdownMenuItem
                        key={action.label}
                        onSelect={action.onClick}
                        disabled={action.disabled}
                      >
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  {menu.some((a) => a.destructive) && <DropdownMenuSeparator />}
                  {menu
                    .filter((a) => a.destructive)
                    /* §5.4 — LAST and separated, but NOT red: the confirmation
                       that follows carries the weight. */
                    .map((action) => (
                      <DropdownMenuItem
                        key={action.label}
                        onSelect={action.onClick}
                        disabled={action.disabled}
                      >
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {control}

            {/* R3 — the one primary. */}
            {primaryAction && (
              <Button
                variant="default"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                aria-describedby={describedBy(primaryAction)}
              >
                {primaryAction.label}
              </Button>
            )}

            {/* §8 slot 5 — rightmost of all. Chevrons are picked by `dir`. */}
            {pager && (
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={pager.onPrevious}
                  disabled={!pager.hasPrevious}
                  aria-label={t('table.previous')}
                >
                  <PreviousChevron aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={pager.onNext}
                  disabled={!pager.hasNext}
                  aria-label={t('table.next')}
                >
                  <NextChevron aria-hidden="true" className="size-4" />
                </Button>
              </div>
            )}
          </div>
        {refusals.length > 0 && (
          <div className="flex max-w-sm flex-col items-end gap-0.5 text-end">
            {refusals.map((reason, index) => (
              <RefusalLine key={reason} id={`${reasonId}-r${index}`}>
                {reason}
              </RefusalLine>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* D7 §4.2 — the subtitle line is 13px `--ev-text-2`, i.e. `text-sm`,
          not `text-xs`. It was two steps below the title and is now one.
          NOTE the reference has no line here at all; V4 already narrowed this
          slot to data-derived metadata, which is why it survives. */}
      {meta !== undefined && meta !== null && meta !== false && (
        <p className="text-sm text-muted-foreground">{meta}</p>
      )}
    </div>
  )
}

/** A refusal only while the control is disabled; an enabled control has none. */
function refusalOf(action: PageAction): string | null {
  return action.disabled && action.reason ? action.reason : null
}
