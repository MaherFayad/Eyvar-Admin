/**
 * §11.3 / AC-35 — the rider sheet's loading state, **shaped like the rider
 * sheet**.
 *
 * Not `LoadingSkeleton pattern="overlay"`, which is the generic card stack and
 * is what the layer shows while `resolveProfile` is still deciding what kind of
 * record this is. From the moment the ref says `rider`, the shape is known: a
 * band, a rail of four blocks, a tab row and a column of rows. So that is what
 * the skeleton is, and the eye does not have to re-find the layout when the
 * content lands.
 *
 * Rules applied
 *   AC-35      no spinner anywhere, and the bar widths match the content's — a
 *              36px numeral block over a 12px caption, four times down the rail.
 *   a11y       ONE `aria-busy` container. `Skeleton` is `aria-hidden`, so a
 *              screen reader hears "busy" once rather than twenty empty bars.
 *   §7.6/AC-69 `Skeleton`'s own loop is indefinite and is killed by the global
 *              `prefers-reduced-motion` guard in `globals.css`. Nothing here
 *              opts back in, and **the utility is not named in this comment**:
 *              Tailwind v4 scans comments as plain text, so writing the class
 *              here would emit it into the stylesheet AND trip
 *              `motion.licence.test.ts`, which reads source rather than
 *              markup. `tabs.tsx` records the same trap.
 *   §9.1       the single column is the same `flex-col` the content uses, with
 *              the rail's edge on the same block axis, so the skeleton mirrors
 *              exactly as the content does — which is to say, neither does.
 *   layout     **the rail is ABOVE the panels and full width**, because that is
 *              what `RiderProfile` renders at `--ev-drawer-w`. A skeleton in
 *              the shape the content is no longer in is worse than none: the
 *              eye has to re-find the layout at exactly the moment the
 *              skeleton exists to stop it doing that.
 */

import { Skeleton } from '@/components/ui/skeleton'

export function RiderSkeleton() {
  return (
    <div aria-busy="true" className="-m-3 flex min-h-full flex-col">
      <div className="flex flex-col divide-y divide-border border-b border-border bg-muted">
        {[0, 1, 2, 3].map((block) => (
          <div key={block} className="flex flex-col gap-2 px-4 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        {/* The tab row: three labels, two of them carrying a count. */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        {/* The open-trip card, then the earlier rows. */}
        <Skeleton className="h-24 w-full rounded-xl" />
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
