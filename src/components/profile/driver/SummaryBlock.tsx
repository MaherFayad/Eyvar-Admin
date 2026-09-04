/**
 * **One block shape, four instances, two surfaces.**
 *
 * ```
 *  Standing              <- the HEADING: 12px ink, medium, sentence case (D-CP-3)
 *  Under review          <- the value, at figure rank
 *  [aside]               <- a meter, a badge, or nothing
 *  1 open complaint      <- the caption, 12px muted, always present
 * ```
 *
 * The sheet stacks these down a rail; the page lays the same four across a
 * strip. That is the *only* difference between the two, and it is why this is a
 * component rather than two pieces of markup that agree today.
 *
 * The rider wave built its rail (`RiderRail.tsx`) and its strip
 * (`RiderProfilePage.SummaryStrip`) as two separate implementations of one
 * shape, and they drifted immediately: the rail's meter is `h-1.5` with
 * `bg-primary` fills and the strip's is `h-1` with `bg-foreground`, for the same
 * fact on the same record. Its own spec asked for a shared
 * `ProfileSummaryBlock` (§6.3) and the split ownership prevented it. This is
 * that component, for the captain.
 *
 * Rules applied
 *   D-CP-3     the label is an **ink heading**, `text-xs font-medium
 *              text-foreground` — not a muted caption. Two evidenced Shopify
 *              instruments do two different jobs: a metric band puts a MUTED
 *              label over its figure (`orders-list-with-metrics-row`), and a
 *              record dossier puts an INK heading over its facts
 *              (`customer-detail-no-orders-yet`: `Contact information`,
 *              `Default address`, `Marketing`). The rider profile is the first;
 *              a captain profile is the second, and the block now carries
 *              **three** ink ranks — heading, figure, caption — where the
 *              rider's carries two. On the rider the label is subordinate to the
 *              figure; here it is superordinate to the whole block, which is
 *              what turns a 2×2 grid from four floating readouts into four
 *              named sections. **A weight and a rank. No size change, no
 *              spacing change, nothing off the 4px grid.**
 *   D18/X-4    the label is **sentence case**. Uppercase plus letter-spacing is
 *              banned on a label and licensed only on the band's eyebrow —
 *              sentence case at medium weight is neither, so D-CP-3 does not
 *              reach it.
 *   §2.3/H1    three emphasis tiers, and size and colour move together: 12px
 *              muted label, `text-kpi-lead` ink value, 12px muted caption.
 *   §8.3.1     a figure and its unit sit on one BASELINE, not one box — 36px
 *              and 11px do not centre against each other.
 *   R4         `data-numeric` on the block, so a figure outside a table still
 *              gets `tabular-nums` and does not shimmer between renders.
 *   §9.1       logical utilities only. The strip's dividers are
 *              `border-inline-start`; the rail's are `border-block-start`.
 *              Never `border-l`.
 */

import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface SummaryBlockProps {
  label: string
  children: ReactNode
  className?: string
}

export function SummaryBlock({ label, children, className }: SummaryBlockProps) {
  return (
    <section data-numeric className={cn('flex min-w-0 flex-col gap-1.5 px-4 py-4', className)}>
      <h3 className="text-xs font-medium text-foreground">{label}</h3>
      {children}
    </section>
  )
}

/** The figure and its unit on one baseline. */
export function BlockFigure({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-baseline gap-1.5">{children}</div>
}

/** A word at figure rank — a status, not a number, so no `tabular-nums`. */
export function BlockWord({ children }: { children: ReactNode }) {
  return <p className="text-kpi-lead font-medium text-foreground">{children}</p>
}

export function BlockCaption({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

/**
 * §11.3 / AC-35 — shaped like the block it replaces, never a spinner.
 *
 * The bar widths match the content's: a figure over two caption lines. `Skeleton`
 * is `aria-hidden`, and the ONE `aria-busy` container is the rail or strip
 * above, so a screen reader hears "busy" once rather than twelve times.
 */
export function BlockSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

/**
 * The capacity meter — one segment per subscription slot.
 *
 * **Not a fixed five**, even though every seeded captain has five: a fixed
 * count is a defect the moment `maxSubscriptions` is four or eight, and
 * `multiSubException` exists precisely so a captain can carry a different
 * number. Past a dozen the segments are a texture rather than a count and the
 * caption underneath is faster to read, so the meter simply does not render.
 *
 * `aria-hidden` in full: the caption below **is** the value and is always
 * rendered, which satisfies §7.5 with one carrier to maintain and removes the
 * `aria-valuemax` question in the over-capacity case entirely.
 *
 * **It mirrors** (§9.5 — *"progress bars fill L→R in LTR, R→L in RTL"*). A flex
 * row of `flex-1` segments with the filled ones first in DOM order reverses
 * with the document. There is no `left`, no `translateX`, no
 * `background-position` and no width-from-the-left anywhere in it, because none
 * of those reverse.
 */
const MAX_METER_SEGMENTS = 12

export function SlotMeter({ used, total }: { used: number; total: number }) {
  if (total <= 0 || total > MAX_METER_SEGMENTS) return null
  /* Never grow a segment past the total, and never clamp the CAPTION — a
     captain carrying six subscriptions against a five-slot limit reads
     `6 of 5 slots taken`, which is the truth, over a full meter. */
  const filled = Math.min(used, total)
  return (
    <div aria-hidden="true" className="flex gap-1 py-0.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn('h-1 flex-1 rounded-sm', index < filled ? 'bg-foreground' : 'bg-border')}
        />
      ))}
    </div>
  )
}
