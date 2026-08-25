/**
 * `LoadingSkeleton` (B-04) — design spec §11.3, **AC-35**.
 *
 * > **AC-35**: every one of the ten §5.1 patterns has a loading skeleton whose
 * > column or card structure matches its content, and **none renders a centred
 * > spinner**.
 *
 * So this file is ten shapes plus the overlay, chosen by `pattern`, and there
 * is no generic fallback block — a missing pattern is a compile error, not a
 * grey rectangle. The `SH` row is the important one and the one people get
 * wrong:
 *
 * > **`SH` shell**: workspace and sub-tab **labels render immediately** from
 * > the route table — the nav is never a skeleton. Only the **count badges**
 * > are skeletons.
 *
 * That is why `SH` is not exported as a shape here: the rail and the column
 * render their own badge skeletons inline, and there is nothing else in the
 * shell to skeletonise. Exporting an `SH` block would invite someone to
 * replace the nav with one.
 *
 * Rules applied
 *   AC-35       one variant per pattern; no centred spinner anywhere.
 *   §7.6/AC-69  `animate-pulse` is an indefinite loop and is killed by the
 *               global `prefers-reduced-motion` guard in `globals.css`.
 *   a11y        the whole block is `aria-hidden` (from `Skeleton`) and carries
 *               ONE `aria-busy` container, so a screen reader hears "loading"
 *               once rather than eight empty bars.
 *   §9.1        logical utilities only; the bars mirror with the layout.
 *   R-3 §1.3    the CARD OUTLINES carry tier 1, because they stand in for
 *               cards. Bars carry none.
 */

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** The ten §6.4 patterns plus the shell layer's overlay. */
export type SkeletonPattern =
  | 'P1'
  | 'P2'
  | 'P3'
  | 'P4'
  | 'P5'
  | 'P6'
  | 'P7'
  | 'P8'
  | 'P9'
  | 'P10'
  | 'overlay'

export interface LoadingSkeletonProps {
  pattern: SkeletonPattern
  /** The index/queue/ledger shapes render this many rows. Default 8 (§11.3). */
  rows?: number
  className?: string
  /** Announced once, by the caller's own live-region call. Labels the busy region. */
  label?: string
}

export function LoadingSkeleton({ pattern, rows = 8, className, label }: LoadingSkeletonProps) {
  return (
    <div aria-busy="true" aria-label={label} className={cn('w-full', className)}>
      {shapeFor(pattern, rows)}
    </div>
  )
}

function shapeFor(pattern: SkeletonPattern, rows: number) {
  switch (pattern) {
    /* P1 / P9 index — toolbar bar, header row, N row bars matching the real
       column widths. §11.3 is explicit that the widths must match, so the
       skeleton reads as the table it replaces rather than as noise. */
    case 'P1':
    case 'P9':
      return <IndexShape rows={rows} />

    /* P2 detail — main column of 3 card outlines + rail of 3 shorter ones. */
    case 'P2':
      return (
        <div className="grid grid-cols-1 gap-4 wide:grid-cols-detail">
          <div className="flex flex-col gap-3">
            <CardOutline lines={4} />
            <CardOutline lines={3} />
            <CardOutline lines={5} />
          </div>
          <div className="flex flex-col gap-3">
            <CardOutline lines={2} />
            <CardOutline lines={2} />
            <CardOutline lines={2} />
          </div>
        </div>
      )

    /* P3 / P4 form — description-column bar + a field column with 5
       label/field pairs. Layout B (§10.1). */
    case 'P3':
    case 'P4':
      return (
        <div className="flex flex-col gap-4">
          {[0, 1].map((section) => (
            <div key={section} className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <div className="col-span-2 rounded-xl border border-border bg-card shadow-1 p-3">
                {[0, 1, 2, 3, 4].map((field) => (
                  <div key={field} className="mb-3 flex flex-col gap-1 last:mb-0">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-control w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )

    /* P5 metric tiles — 4 tile outlines, each with a title bar, a value bar and
       a chart block. 3-up below the breakpoint, 4-up above it (§0.1). */
    case 'P5':
      return (
        <div className="grid grid-cols-3 gap-4 wide:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <div
              key={tile}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card shadow-1 p-3"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ))}
        </div>
      )

    /* P6 monitor — canvas block + 3 side-list card outlines (§7.4). */
    case 'P6':
      return (
        <div className="grid grid-cols-1 gap-4 wide:grid-cols-monitor">
          <Skeleton className="h-90 w-full rounded-xl" />
          <div className="flex flex-col gap-3">
            <CardOutline lines={3} />
            <CardOutline lines={3} />
            <CardOutline lines={3} />
          </div>
        </div>
      )

    /* P7 ledger — header row + 6 rows + an opening/closing bar. No checkbox
       column and no kebab column, because a ledger has neither (AC-48) and the
       skeleton must not promise furniture that will not arrive. */
    case 'P7':
      return (
        <div className="rounded-xl border border-border bg-card shadow-1">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-28" />
          </div>
          <RowBars rows={6} columns={[24, 20, 40, 12, 12, 12]} />
          <div className="border-t border-border px-3 py-2">
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      )

    /* P8 queue — P1's shape plus an owner-chip block and an SLA-pill block per
       row (§11.3). */
    case 'P8':
      return <IndexShape rows={rows} queue />

    /* P10 feed — rounded-square avatar + two text bars, ×6. R15: the avatar is
       a rounded SQUARE here too, never a circle. */
    case 'P10':
      return (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <Skeleton className="size-7 rounded-lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )

    /* Overlay — identity header block + 4 card outlines, shaped like the
       profile's card stack (§9.2 `overlay-loading`: never a spinner). */
    case 'overlay':
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
          <CardOutline lines={2} />
          <CardOutline lines={2} />
          <CardOutline lines={2} />
          <CardOutline lines={2} />
        </div>
      )
  }
}

/** P1 / P9, and P8 with two extra blocks per row. */
function IndexShape({ rows, queue = false }: { rows: number; queue?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-1">
      {/* toolbar, 40px */}
      <div className="flex h-10 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-12 rounded-lg" />
          <Skeleton className="h-5 w-16 rounded-lg" />
          <Skeleton className="h-5 w-20 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded-lg" />
          <Skeleton className="size-5 rounded-lg" />
        </div>
      </div>
      <RowBars
        rows={rows}
        columns={queue ? [4, 28, 20, 12, 16, 14, 12] : [4, 32, 16, 14, 12, 12, 6]}
      />
    </div>
  )
}

/** N rows of bars at the given percentage widths, plus a header row. */
function RowBars({ rows, columns }: { rows: number; columns: number[] }) {
  return (
    <>
      <div className="flex h-row items-center gap-3 border-b border-border px-3">
        {columns.map((width, i) => (
          <Skeleton key={i} className="h-2.5" style={{ width: `${width}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex h-row items-center gap-3 border-b border-border px-3 last:border-0">
          {columns.map((width, i) => (
            <Skeleton key={i} className="h-3" style={{ width: `${width}%` }} />
          ))}
        </div>
      ))}
    </>
  )
}

/** One card outline with N body lines. Carries tier-1 elevation, like a card. */
function CardOutline({ lines }: { lines: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card shadow-1 p-3">
      <Skeleton className="h-4 w-28" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-3 w-full last:w-2/3" />
      ))}
    </div>
  )
}
