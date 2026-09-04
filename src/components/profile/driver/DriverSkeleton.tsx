/**
 * §11.3 / AC-35 — the captain sheet's loading state, **shaped like the captain
 * sheet**.
 *
 * Not `LoadingSkeleton pattern="overlay"`, which is the generic card stack and
 * is what the layer shows while `resolveProfile` is still deciding what kind of
 * record this is. From the moment the ref says `driver`, the shape is known: a
 * 2×2 summary, a row of four tabs and a list of five two-line documents. So
 * that is what the skeleton is, and the eye does not have to re-find the layout
 * when the content lands.
 *
 * **Four tab stubs and four summary cells, not the rider's three and four.** A
 * skeleton that promises a different number of things than arrives is a layout
 * shift with extra steps — and the same clause is why the document stubs are
 * **two bars each**: the row is two lines by design (D-CP-7), so a one-line stub
 * would collapse to half the height the content needs and jump on arrival.
 *
 * **One column, and no `compact` override.** It carried five of them and every
 * one was dead: `compact` is `@media (width < 768px)`, a **viewport** query, and
 * this renders inside a 480px panel in a viewport that is not. They never fired
 * at any width an operator uses. Deleted rather than kept, because dead
 * responsive code reads as live responsive code to the next person (D-CP-4).
 *
 * Rules applied
 *   AC-35      no spinner anywhere, and the bar widths match the content's — a
 *              heading, a figure and a caption in each of four summary cells;
 *              a label over a badge-and-date line in each of five rows.
 *   a11y       ONE `aria-busy` container. `Skeleton` is `aria-hidden`, so a
 *              screen reader hears "busy" once rather than twenty empty bars.
 *   §7.6/AC-69 `Skeleton`'s own loop is indefinite and is killed by the global
 *              `prefers-reduced-motion` guard in `globals.css`. Nothing here
 *              opts back in, and **the utility is not named in this comment**:
 *              Tailwind v4 scans comments as plain text, so writing the class
 *              here would emit it into the stylesheet AND trip
 *              `motion.licence.test.ts`, which reads source rather than markup.
 *   §9.1       the summary's dividers are the same logical pair `DriverRail`
 *              uses — `border-s` on the even cells, the block axis between the
 *              rows — so the skeleton mirrors exactly as the content does.
 */

import { Skeleton } from '@/components/ui/skeleton'

export function DriverSkeleton() {
  return (
    <div aria-busy="true" className="-m-3 flex min-h-full flex-col">
      {/* The summary — 2×2, `bg-muted`, the same grid and the same hairlines
          `DriverRail` draws, so nothing moves when the reads land. */}
      <div
        className={[
          'grid grid-cols-2 border-b border-border bg-muted',
          '[&>*:nth-child(even)]:border-s [&>*:nth-child(even)]:border-border',
          '[&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-border',
        ].join(' ')}
      >
        {[0, 1, 2, 3].map((cell) => (
          <div key={cell} className="flex flex-col gap-2 px-4 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        {/* The tab row: four labels, two of them carrying a count. */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-14" />
        </div>
        {/* The document list: five rows, each a label over a state-and-date
            line, both starting at the inline-start (D-CP-7). */}
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
