/**
 * §11.3 / AC-35 — the ride sheet's loading state, **shaped like the ride
 * sheet**.
 *
 * Not `LoadingSkeleton pattern="overlay"`, which is the generic card stack and
 * is what the layer shows while `resolveProfile` is still deciding what kind of
 * record this is. From the moment the ref says `trip`, the shape is known: a
 * map, two party cards, a tab row and a column of stages. So that is what the
 * skeleton is, and the eye does not have to re-find the layout when the content
 * lands.
 *
 * The map's block is a plain filled panel and not a shimmer strip: a map does
 * not arrive in rows, and a set of bars where a picture will be would be a
 * skeleton describing a layout that never appears.
 *
 * Rules applied
 *   AC-35      no spinner anywhere, and the bar widths match the content's.
 *   a11y       ONE `aria-busy` container. `Skeleton` is `aria-hidden`, so a
 *              screen reader hears "busy" once rather than twenty empty bars.
 *   §7.6/AC-69 `Skeleton`'s own loop is killed by the global
 *              `prefers-reduced-motion` guard in `globals.css`, and the utility
 *              that drives it is deliberately NOT named in this comment —
 *              Tailwind v4 scans comments as plain text and would emit the
 *              class into the stylesheet. `RiderSkeleton` records the same trap.
 *   §9.1       the single column is the same `flex-col` the content uses, so
 *              the skeleton mirrors exactly as the content does — which is to
 *              say, neither does.
 */

import { Skeleton } from '@/components/ui/skeleton'

export function TripSkeleton() {
  return (
    <div aria-busy="true" className="-m-3 flex min-h-full flex-col">
      {/* The canvas. One block at the map's own height, with the two-line
          endpoint card floating where the real one sits. */}
      <div className="relative h-56 w-full border-b border-border bg-muted">
        <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1.5 rounded-lg border border-border bg-card/95 px-3 py-2">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        {/* The two party cards. */}
        {[0, 1].map((card) => (
          <div key={card} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-24 rounded-md" />
            </div>
            <Skeleton className="h-4 w-40" />
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center justify-between gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        ))}

        {/* The tab row, then the stage rail. */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-14" />
        </div>
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-start gap-2.5">
            <Skeleton className="size-2.5 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
