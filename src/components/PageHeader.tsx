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
 *   §8 slot 2   title 17px/600 (`text-lg`). Required, always translatable.
 *   §8/V4       the second row is `meta` — **data-derived only**. `subtitle`
 *               is gone, and so is the static route-table description it used
 *               to render. See the prop's own doc comment.
 *   §8 slot 3   inline status badges, zero or more, immediately after the title
 *               **on the same baseline**. Never on their own row, never inside
 *               the action cluster. Read inline-start → inline-end in
 *               importance order.
 *   §8 slot 4a  **secondary actions cap at TWO.** Beyond two, everything after
 *               the first two collapses into `More actions ▾`. This is the
 *               "designer's cap" §6.2 leaves open, and it is enforced here
 *               rather than trusted to each screen.
 *   §8 slot 4b  overflow is a `dropdown-menu`: verb-first imperatives, sentence
 *               case, no trailing punctuation, destructive item LAST and
 *               separated — but **not red** where a confirmation follows (§5.4).
 *   §8 slot 4c  **at most ONE primary per header** (R3). On a task-shaped page
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

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { mirrorGlyph, type Direction, type Translate } from '@/lib'

export interface PageAction {
  label: string
  onClick: () => void
  /** §8 — renders greyed IN PLACE, never removed. */
  disabled?: boolean
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
   */
  meta?: string | null
  /** Inline status badges. Rendered after the title on the same baseline. */
  badges?: ReactNode
  /** §8 slot 1. Derived from the route's shape by the caller, never a stack depth. */
  onBack?: () => void
  /** §8 slot 4a — the first two render as buttons; the rest fall into overflow. */
  secondaryActions?: PageAction[]
  /** §8 slot 4b — always in the overflow menu, after any spilled secondaries. */
  overflowActions?: PageAction[]
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
  onBack,
  secondaryActions = [],
  overflowActions = [],
  primaryAction,
  pager,
  t,
  dir,
}: PageHeaderProps) {
  const visibleSecondaries = secondaryActions.slice(0, SECONDARY_CAP)
  /* Everything past the cap SPILLS into the overflow rather than wrapping —
     §8's rule, applied here so no screen has to remember it. */
  const spilled = secondaryActions.slice(SECONDARY_CAP)
  const overflow = [...spilled, ...overflowActions]

  return (
    /* `pb-4` — 16px to the first card, up from 12 (V1). 12 was only tolerable
       because a second line sat above it; V4 deleted that line. Shopify
       measures 24; 16 is denser and on the grid. */
    <div className="flex flex-col gap-1 pb-4">
      <div className="flex items-start gap-2">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label={t('shell.topbar.back')}
            className="-ms-1.5 shrink-0"
          >
            <span aria-hidden="true" className="text-base leading-none">
              {mirrorGlyph('←', dir)}
            </span>
          </Button>
        )}

        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {/* §8 slot 3 — same baseline as the title, never a second row. */}
          {badges}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {visibleSecondaries.map((action) => (
            <Button
              key={action.label}
              variant="secondary"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </Button>
          ))}

          {overflow.length > 0 && (
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
                {overflow
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
                {overflow.some((a) => a.destructive) && <DropdownMenuSeparator />}
                {overflow
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

          {/* R3 — the one primary. */}
          {primaryAction && (
            <Button
              variant="default"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
            >
              {primaryAction.label}
            </Button>
          )}

          {/* §8 slot 5 — rightmost of all. Chevrons mirror. */}
          {pager && (
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={pager.onPrevious}
                disabled={!pager.hasPrevious}
                aria-label={t('table.previous')}
              >
                <span aria-hidden="true">{mirrorGlyph('‹', dir)}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={pager.onNext}
                disabled={!pager.hasNext}
                aria-label={t('table.next')}
              >
                <span aria-hidden="true">{mirrorGlyph('›', dir)}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
    </div>
  )
}
