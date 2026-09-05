/**
 * The 360° profile's card chrome and its four states — **one implementation,
 * both presentations**.
 *
 * The drawer and the full page used to draw their own card: `ProfileLayer` a
 * `Collapsible`, `EntityPageScreen` a bare `<section>`. Two shapes for one thing
 * is how the two surfaces drift, and it is the smaller half of the same defect
 * that had both of them rendering a permanent *"Couldn't load…"* — so there is
 * now one card, used by both.
 *
 * Rules applied
 *   §6.2        **EVERY entity type gets card toggles**, not just riders and
 *               drivers (`09b` §17.4). This component takes no "is this a
 *               rider" branch, which is what makes that true.
 *   §9.2 #14    the error is **CARD-scoped**. One card failing leaves the other
 *               eight working and the layer dismissible — the whole reason the
 *               sections fetch separately.
 *   §11.2       a card that is unavailable for this entity kind is **stated in
 *               place with a reason**, never hidden and never disguised as a
 *               failure. `SectionUnavailable` is that state and it is a
 *               `no-match` empty, not an `ErrorState`.
 *   R8/AC-37    empty is ONE grey sentence, no illustration and no heading.
 *               `card={false}` on both states: they render inside a card that
 *               already exists.
 *   §11.3       loading is a skeleton shaped like the content, never a spinner.
 *   R15         8px radius, 1px border, tier 1 elevation — no stadium.
 *   §7.2/§9.1   every utility is logical, so the disclosure row mirrors under
 *               `dir="rtl"` with no second rule.
 */

import type { ReactNode } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import type { AsyncResult } from '@/hooks'
import type { Translate } from '@/lib'
import { cn } from '@/lib/utils'

/* ─────────────────────────────── the card ─────────────────────────────── */

export interface SectionCardProps {
  title: string
  defaultOpen: boolean
  /** Rendered at the inline-end of the heading row — a count, a badge. */
  aside?: ReactNode
  children: ReactNode
}

export function SectionCard({ title, defaultOpen, aside, children }: SectionCardProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="group/collapsible overflow-hidden rounded-xl border border-card-border bg-card"
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-10 w-full items-center justify-between gap-2 rounded-none px-3 text-sm font-semibold"
        >
          <span className="min-w-0 truncate text-start">{title}</span>
          <span className="flex shrink-0 items-center gap-2">
            {aside}
            {/* A disclosure caret. `▾` is a mark and does not mirror (§9.5);
                the rotation is vertical, so it is direction-neutral too. */}
            <span
              aria-hidden="true"
              className="transition-transform group-data-[state=open]/collapsible:rotate-180"
            >
              ▾
            </span>
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border p-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/* ─────────────────────────── the four states ─────────────────────────── */

export interface SectionStatesProps<T> {
  result: AsyncResult<T>
  /** The section's translated heading, for `Couldn't load {section}.` */
  section: string
  /** The empty sentence, already translated. R8 `no-match`: ONE sentence. */
  empty: string
  t: Translate
  /** Rows of the loading skeleton. Matches the content's own row count. */
  skeletonRows?: number
  children: (data: T) => ReactNode
}

/**
 * Content · empty · loading · error, in that order of intent and in one place.
 *
 * Every section passes through here, so no card can ship three of the four —
 * which is exactly what shipped before: the two surfaces had loading, empty and
 * error and no content at all.
 */
export function SectionStates<T>({
  result,
  section,
  empty,
  t,
  skeletonRows = 3,
  children,
}: SectionStatesProps<T>) {
  if (result.status === 'loading') return <SectionSkeleton rows={skeletonRows} />

  if (result.status === 'error') {
    return (
      <ErrorState
        scope="card"
        card={false}
        message={t('profile.state.error', { section })}
        action={{ label: t('profile.state.retry'), onClick: result.refetch }}
      />
    )
  }

  if (result.status === 'empty' || result.data === null) {
    return <EmptyState kind="no-match" card={false} message={empty} />
  }

  return <>{children(result.data)}</>
}

/**
 * **§11.2 — the section exists for this entity kind and its source does not.**
 *
 * Distinct from both neighbours on purpose. It is not an error: nothing failed.
 * It is not the ordinary empty either: *"Nothing recorded here yet"* invites the
 * operator to expect rows tomorrow, and for `PAY-5510`'s identity card no row is
 * coming until the payment fixtures land. So it is a `no-match` empty carrying
 * the **reason**, which is what §11.2 asks of every blocked thing.
 */
export function SectionUnavailable({ reason }: { reason: string }) {
  return <EmptyState kind="no-match" card={false} message={reason} />
}

/**
 * §11.3 / AC-35 — shaped like the content it replaces, never a spinner. A
 * profile card is a stack of label/value rows, so the skeleton is too.
 */
export function SectionSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div aria-busy="true" className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}
