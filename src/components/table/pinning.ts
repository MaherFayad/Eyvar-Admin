/**
 * The two mechanical traps of §8.3, closed in one file so no component has to
 * remember them.
 *
 *   1. **A pinned cell is positioned from `PinnedColumn` and nothing else.**
 *      `style[p.insetProperty] = p.offset`. There is no branch on `edge` to
 *      choose `left` or `right`, because that branch IS the defect: legacy
 *      `eyvar_ops_panel_v40_fixed.html:751` is `position:sticky;right:0` with no
 *      `[dir="rtl"]` counterpart anywhere in the file, so in Arabic the pinned
 *      column freezes to the edge the reader's eye leaves (**D25**, finding
 *      F-12). `insetInlineStart` / `insetInlineEnd` mirror themselves.
 *
 *   2. **`scrollLeft` is NEGATIVE in a right-to-left container** under the CSS
 *      Overflow specification — Firefox, WebKit and current Chromium — and was
 *      positive or inverted in older engines. Every test of "has this scrolled"
 *      normalises the sign. A raw `scrollLeft > 0` is silently false in Arabic
 *      forever, and nothing about the rendering looks wrong while it is.
 *
 * Rules applied
 *   §7.3/AC-110 the boundary is `border-inline-*: 1px --ev-hairline` on the
 *               innermost pinned CELL at each edge, rendered ONLY while the
 *               table overflows, and carries **no `box-shadow` of any kind**.
 *               The legacy `-4px 0 6px -4px` has an x-offset, which is exactly
 *               what §1.3's closed, `offset-x: 0` elevation set exists to
 *               prevent.
 *   §7.3/AC-111 a pinned cell is OPAQUE: it takes the row's own background,
 *               including the hover fill, or scrolling content shows through.
 *   AC-116      the horizontal scroll offset resets to the inline-start when
 *               `dir` changes. An offset carried across the flip is meaningless
 *               and lands the operator mid-table.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { PinnedColumn } from '@/hooks'
import type { Direction } from '@/lib'

/** §7.1's two implicit lanes. Not columns a screen declares — the component's. */
export const SELECT_COLUMN_ID = '__select'
export const KEBAB_COLUMN_ID = '__actions'

/**
 * The checkbox and kebab lanes are 40px — `w-10`, which is what `table.tsx`
 * already sizes them at (`[&:has([role=checkbox])]:w-10`). Written here as the
 * number `useColumnPinning` needs, because a sticky offset is arithmetic and
 * cannot read a class.
 */
export const LANE_WIDTH_PX = 40

/**
 * The actions lane — **56**, `04-index-screen-redesign.md` §7.8.
 *
 * `12 + 28 + 12 = 52 -> 56` on the grid, for a 28 x 28 kebab in a 60px row: the
 * padding-block is 16/16 and the control clears §7.7's 24px floor. It is wider
 * than the selection lane because a checkbox is 16px and a control is 28, and
 * it is a **declared** number rather than a shared one because §7.3's budget
 * counts both lanes and cannot count a constant that means two things.
 *
 * §7.8's other two shapes are not this lane: a single row action renders as a
 * labelled button (88 default) and a decision pair as three 28px controls
 * (116). Both are build item 11.
 */
export const ACTION_LANE_WIDTH_PX = 56

/**
 * The actions lane when there is exactly ONE row action — **88**, §7.8.
 *
 * **D8, from the owner: *"if only 1 action put the action not 3 dots"*.** A
 * menu that opens to a single item is two clicks and a surprise for something
 * that could have been a button, and the owner has now reported it twice. The
 * lane is `12 + label + 12`, **declared per view** (`rowActionsWidth`) because
 * a label's width is a translation question; 88 is §7.8's default and fits
 * `View` in both languages.
 *
 * It is a DECLARED number rather than a measured one on purpose: a lane that
 * sized itself to the widest rendered label would change width between the
 * loading state and the content state, and §7.3's budget could not be asserted
 * before paint.
 */
export const SINGLE_ACTION_LANE_WIDTH_PX = 88

/**
 * §7.2's contract, applied: the offset comes from the hook, already accumulated
 * and already logical. Never compute it here, and never write `left`.
 */
export function pinnedStyle(
  pinned: PinnedColumn | null,
  width?: number,
  overflowing = false,
  /**
   * §7.3 rule 2 — the identity column's declared floor, in px.
   *
   * **It does not enforce that floor here, and the comment that said it did was
   * false.** `ui/table.tsx` sets `table-fixed`, and under
   * `table-layout: fixed` **`min-width` and `max-width` on a cell are ignored**
   * — a column is exactly as wide as the first row declares it, and a column
   * declaring nothing takes the residual, zero included. The previous text
   * asserted this emission was *"what stops the residual from being zero"*; it
   * is not, and the measured result was the identity column at 0px at 1152 and
   * 38px at 1280 (P0-3, `17-reconciled-findings.md` §1).
   *
   * The floor is now enforced where it can be: `DataTable` sums the declared
   * widths plus this number and puts the total on the `<table>` as
   * `min-inline-size`, so the table stops shrinking and the scroll container
   * overflows instead of the identity column collapsing. See
   * `tableMinInlineSize` in `DataTable.tsx`.
   *
   * The declaration is still emitted, for two reasons that are not layout: it
   * is the number §7.3's budget counts and §7.2's pinned offsets are computed
   * from, and it keeps a `hasSize` style on the cell so an identity column that
   * is pinned but unsized is not silently styleless. Ignored when a `width` is
   * declared.
   */
  minWidth?: number,
): CSSProperties | undefined {
  const sized: CSSProperties =
    width === undefined
      ? minWidth === undefined
        ? {}
        : { minWidth }
      : { width, minWidth: width, maxWidth: width }
  const hasSize = width !== undefined || minWidth !== undefined
  if (!pinned) return hasSize ? sized : undefined

  return {
    ...sized,
    position: 'sticky',
    [pinned.insetProperty]: pinned.offset,
    ...boundary(pinned, overflowing),
  }
}

/**
 * §7.3 / **AC-110** — the boundary, and why it is a style rather than a class.
 *
 * `table.tsx` now draws a **vertical rule between every pair of columns** in
 * `--ev-hairline2` (`03-navattic-language.md` §3.4, fix-list item 6). So the
 * frozen edge is no longer "a line where there was none" — it is **the same
 * line, one step darker**, `--ev-hairline`, on the innermost pinned column at
 * each edge. Two weights, and the darker one means "content slides under here".
 *
 * It is written as a style because the rule it upgrades is delivered by
 * `[&_tr>*:not(:last-child)]:border-(--ev-hairline2)`, an arbitrary-variant
 * selector whose specificity beats any plain utility class. A class here would
 * lose the cascade silently and look correct in the diff — the worst kind of
 * defect. The value is still a token; nothing raw enters.
 *
 * Still **no `box-shadow` of any kind**. All three elevation tiers are
 * `offset-x: 0` so elevation never mirrors; an inline-edge shadow needs an
 * x-offset, which is exactly the legacy defect at
 * `eyvar_ops_panel_v40_fixed.html:751` (`-4px 0 6px -4px`, no `[dir="rtl"]`
 * counterpart anywhere in the file).
 *
 * Rendered **only while the table overflows**: with nothing to scroll, nothing
 * is frozen in any meaningful sense.
 */
function boundary(pinned: PinnedColumn, overflowing: boolean): CSSProperties {
  if (!pinned.isLast || !overflowing) return {}
  const side = pinned.edge === 'start' ? 'borderInlineEnd' : 'borderInlineStart'
  return {
    [`${side}Width`]: 1,
    [`${side}Style`]: 'solid',
    /* **`--ev-hairline-control`, not `--ev-hairline` — §7.9, match audit N4,
       ruling R23.** `--ev-hairline2` now holds the same value as
       `--ev-hairline`, so at `--ev-hairline` the frozen edge was ZERO steps
       darker than every ordinary column rule and the pinning signal simply did
       not exist. R23 puts the pinned boundary in the control weight with the
       things an operator can click, because "content slides under here" is an
       interaction boundary, not a structural one. Still no shadow of any kind:
       all three elevation tiers are `offset-x: 0` so nothing mirrors, and an
       inline-edge shadow needs an x-offset — the legacy defect at
       `eyvar_ops_panel_v40_fixed.html:751`. */
    [`${side}Color`]: 'var(--ev-hairline-control)',
  }
}

/**
 * Whether the scroll container actually overflows, and a callback ref for it.
 *
 * `scrollWidth > clientWidth` is a layout read, so it is measured after paint
 * and re-measured on resize. The result only ever turns a 1px border on or off
 * (§7.3), never an offset — offsets come from the declared widths, which is
 * what **AC-109** rests on.
 */
export function useTableOverflow(direction: Direction): {
  scrollRef: (node: HTMLElement | null) => void
  overflowing: boolean
  /**
   * The scroll container's inner width, or `0` before the first measurement.
   *
   * Reported alongside `overflowing` rather than measured a second time by the
   * caller: this hook already owns the `ResizeObserver` on this node, and two
   * observers on one element is two answers to the same question that can
   * disagree for a frame. `fitWidths` treats `0` as "not yet known" and leaves
   * the declared widths alone, which is the correct first frame.
   */
  containerWidth: number
} {
  const nodeRef = useRef<HTMLElement | null>(null)
  const [overflowing, setOverflowing] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)

  const measure = useCallback(() => {
    const node = nodeRef.current
    if (!node) return
    setOverflowing(node.scrollWidth - node.clientWidth > 1)
    setContainerWidth(node.clientWidth)
  }, [])

  const scrollRef = useCallback(
    (node: HTMLElement | null) => {
      nodeRef.current = node
      measure()
    },
    [measure],
  )

  useEffect(() => {
    measure()
    const node = nodeRef.current
    if (!node || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [measure])

  /* AC-116 — on a direction change the offset is meaningless, so it goes back
     to the inline-start. `0` is the inline-start in BOTH directions: an RTL
     container's range runs 0 → negative, so this is the one comparison that
     needs no `Math.abs`. Every other one does. */
  useEffect(() => {
    const node = nodeRef.current
    if (node) node.scrollLeft = 0
    measure()
  }, [direction, measure])

  return { scrollRef, overflowing, containerWidth }
}

/**
 * §8.3 — the normalised "has this scrolled" test. Exported so a test, a future
 * shadow-on-scroll affordance or a scroll-position readout cannot reintroduce
 * the raw comparison.
 */
export function scrolledInline(element: Pick<HTMLElement, 'scrollLeft'>): boolean {
  return Math.abs(element.scrollLeft) > 0
}
