/**
 * The captain sheet's summary — **the four blocks two-up, never a single
 * column** (D-CP-2).
 *
 * ```
 *  ┌─────────────────────┬─────────────────────┐
 *  │ Standing            │ Documents           │
 *  │ Under review        │ Expiring            │
 *  │ 1 open complaint    │ Registration        │
 *  │                     │ expires 19 Jul 2026 │
 *  │                     │ 5 documents on file │
 *  ├─────────────────────┼─────────────────────┤
 *  │ Earnings            │ Subscription slots  │
 *  │ 652.60  SAR         │ 1                   │
 *  │ payable to this     │ 1 slot open         │
 *  │ captain             │ ▮▮▮▮▭               │
 *  │ Cash debt 23.15 SAR │ 4 of 5 slots taken  │
 *  └─────────────────────┴─────────────────────┘
 * ```
 *
 * **The same four components the page's strip renders, in the same order.** The
 * difference between the two surfaces is now only how many columns the grid has
 * — two here, two or four there — which is why `DriverBlocks.tsx` exists as
 * components rather than as two pieces of markup that happen to agree today.
 *
 * ## It was a rail, and the rail did not fit
 *
 * This was `w-1/3` of a 480px drawer beside the tab column: a 160px box, 128px
 * after `SummaryBlock`'s `px-4`, holding `652.60 SAR` at `--text-kpi-lead`. The
 * rider profile measured that exact six-glyph string in Chromium wanting
 * **154px in a 126px box** and restacked rather than widened; the captain's box
 * was two pixels narrower still. Measured here at 480 before the change, the
 * sheet body overran by **63px** in English, `Expiring` wanted 140px in a 127px
 * box, and the four-tab row wanted 367px in 287. D-CP-4 is that measurement.
 *
 * A 2×2 cell is **208px** of content — 54px of clearance on the same figure —
 * and it halves the summary's height, which is what puts the tab row and the
 * first document rows above the fold at 480.
 *
 * ## Why two-up and not a stack
 *
 * The rider sheet's summary is a single column. If this one were too, the two
 * surfaces would have the same silhouette, and D-CP-2 is the largest
 * distinction available without a new colour: the captain summary is a **grid**
 * and the rider's is a **stack**, legible before a word is read. The invariant
 * is one sentence and is testable — *no captain surface ever renders the four
 * blocks in a single column* (AC-CP-06).
 *
 * **Reading order is row-major and therefore unchanged**: Standing → Documents
 * → Earnings → Slots, which is `DriverBlocks`' whole priority argument. A CSS
 * grid's row-major order follows the document, so it survives `dir="rtl"`
 * without a rule.
 *
 * **Cells are top-aligned and a short cell leaves quiet ground beneath it.**
 * The alternative was to pair the blocks by height, which would put Slots second
 * and break the priority order for a cosmetic reason. Order beats evenness.
 *
 * ## The banner is not in the summary
 *
 * A suspension is a standing **condition** — it changes what the console will
 * let an operator do — and §11.4 gives that the surface's one banner, above
 * everything, not a cell among four. The `Standing` block still states the
 * status word and its reasons, because those are facts and a banner is not a
 * place to keep facts.
 *
 * Rules applied
 *   D-CP-2     two columns at every width, on both surfaces. Never one.
 *   D-CP-4     no `compact` override. `compact` is `@media (width < 768px)` —
 *              a **viewport** query — so a 480px panel inside a 1280px viewport
 *              has never matched it. The overrides this file used to carry
 *              never fired at any width an operator uses, which is worse than
 *              having none: dead responsive code reads as live responsive code.
 *              They are deleted rather than kept.
 *   §9.1       dividers are logical. `border-s` on the even cells is
 *              inline-start and mirrors; the rule between the rows is the block
 *              axis, which does not mirror in a horizontal writing mode and
 *              must not. **A `border-l` here is a defect on arrival.**
 *   §11.3      each block owns its own skeleton, shaped like its own content.
 */

import {
  CapacityBlock,
  DocumentsBlock,
  EarningsBlock,
  StandingBlock,
  type DriverBlockProps,
} from './DriverBlocks'

/**
 * The summary takes exactly what a block takes, and nothing more. Declared as an
 * alias rather than restated, so a fifth block cannot need an argument the
 * summary has no way to pass.
 */
export type DriverRailProps = DriverBlockProps

export function DriverRail(props: DriverRailProps) {
  return (
    <div
      className={[
        'grid grid-cols-2 border-b border-border bg-muted',
        /* Cells 2 and 4 take the inline-axis rule, cells 3 and 4 the block-axis
           one, so every cell is separated from its row and column neighbour by
           exactly one hairline and the outer edges stay clean. Written as
           nth-child rather than `*+*` because a 2×2 needs two different rules
           where a single row needs one. */
        '[&>*:nth-child(even)]:border-s [&>*:nth-child(even)]:border-border',
        '[&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-border',
      ].join(' ')}
    >
      <StandingBlock {...props} />
      <DocumentsBlock {...props} />
      <EarningsBlock {...props} />
      <CapacityBlock {...props} />
    </div>
  )
}
