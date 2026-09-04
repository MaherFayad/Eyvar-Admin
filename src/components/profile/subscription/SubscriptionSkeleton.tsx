/**
 * §11.3 / AC-35 — the subscription sheet's loading state, **shaped like the
 * subscription sheet**.
 *
 * Not `LoadingSkeleton pattern="overlay"`, which is the generic card stack and
 * is what the layer shows while `resolveProfile` is still deciding what kind of
 * record this is. From the moment the ref says `subscription`, the shape is known: a
 * map band, four rail blocks, a tab row and a grid of pairs. So that is what
 * the skeleton is, and the eye does not have to re-find the layout when the
 * content lands.
 *
 * **The map's placeholder is a flat ground, not a bordered box.** The map is a
 * ground that bleeds to both edges, and a skeleton that drew a card there would
 * be promising a card — the eye would then have to re-place the whole top of
 * the sheet at exactly the moment the skeleton exists to stop it doing that.
 *
 * Rules applied
 *   AC-35      no spinner anywhere, and the bar widths match the content's — a
 *              20px numeral over a 12px caption in each rail block.
 *   a11y       ONE `aria-busy` container. `Skeleton` is `aria-hidden`, so a
 *              screen reader hears "busy" once rather than twenty empty bars.
 *   §7.6/AC-69 `Skeleton`'s own loop is indefinite and is killed by the global
 *              reduced-motion guard in `globals.css`. Nothing here opts back
 *              in, and **the utility is not named in this comment**: Tailwind
 *              v4 scans comments as plain text, so writing the class here would
 *              emit it into the stylesheet AND trip `motion.licence.test.ts`,
 *              which reads source rather than markup.
 *   §9.1       the single column is the same `flex-col` the content uses, with
 *              the rail's edge on the same block axis — so the skeleton mirrors
 *              exactly as the content does, which is to say neither does.
 */

import { Skeleton } from '@/components/ui/skeleton'

export function SubscriptionSkeleton() {
  return (
    <div aria-busy="true" className="-m-3 flex min-h-full flex-col">
      {/* The map band, with the two floating figures roughed in at the corners
          they land in and the endpoint card along the bottom. */}
      <div className="flex h-64 flex-col justify-between border-b border-border bg-muted p-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-14 w-28 rounded-lg" />
          <Skeleton className="h-14 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>

      {/* Three rail blocks: label, value, caption. */}
      <div className="flex flex-col divide-y divide-border border-b border-border bg-muted">
        {[0, 1, 2, 3].map((block) => (
          <div key={block} className="flex flex-col gap-2 px-4 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
        {/* The tab row: two labels, one carrying a count. */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        {/* Two groups of paired facts, which is what the Details tab opens on. */}
        {[0, 1].map((group) => (
          <div key={group} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((pair) => (
                <div key={pair} className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
