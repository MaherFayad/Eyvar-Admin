/**
 * `KeyValueGrid` / `KeyValueRow` — one labelled pair per row inside a card:
 * label at inline-start in `--ev-text-2`, value at inline-end in `--ev-ink`, a
 * rule at `--ev-hairline-soft` between rows and a hover / focus-within ground
 * (CONTACT-CENTRE-REDESIGN-PLAN §3 item 4, AC-68). A numeric value takes
 * tabular figures and end-aligns (R4). `KeyValueTable` gives an in-card
 * `<table>` with column headers the same row treatment.
 */
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The row treatment, shared with an in-card `<tr>`. */
export const KEY_VALUE_ROW = 'transition-colors hover:bg-row-hover focus-within:bg-row-hover'

/** A column-header cell: 12px/500 `--ev-text-2`, as `TableHead` weights it. */
export const KEY_VALUE_HEAD = 'py-1.5 text-xs font-medium text-muted-foreground'

/** A table cell: the outer cells carry the card's own inset so rules run edge to edge. */
export const KEY_VALUE_CELL = 'px-2 first:ps-(--card-spacing) last:pe-(--card-spacing)'

export function KeyValueGrid({ className, ...props }: ComponentProps<'dl'>) {
  return (
    <dl
      data-slot="key-value-grid"
      className={cn('-mx-(--card-spacing) flex flex-col divide-y divide-border-soft text-xs', className)}
      {...props}
    />
  )
}

export function KeyValueRow({
  label,
  numeric = false,
  className,
  valueClassName,
  children,
}: {
  label: ReactNode
  /** R4 — tabular figures on a money, count or date value. */
  numeric?: boolean
  className?: string
  valueClassName?: string
  children: ReactNode
}) {
  return (
    <div
      data-slot="key-value-row"
      className={cn(
        'flex items-baseline justify-between gap-3 px-(--card-spacing) py-1.5',
        KEY_VALUE_ROW,
        className,
      )}
    >
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={cn('min-w-0 text-end text-foreground', numeric && 'tabular-nums', valueClassName)}>
        {children}
      </dd>
    </div>
  )
}

/** An in-card table whose body rows read as `KeyValueRow`s: same rules, same hover. */
export function KeyValueTable({ className, children, ...props }: ComponentProps<'table'>) {
  return (
    <div className="-mx-(--card-spacing)">
      <table
        data-slot="key-value-table"
        className={cn('w-full table-fixed [&_tbody]:divide-y [&_tbody]:divide-border-soft', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}
