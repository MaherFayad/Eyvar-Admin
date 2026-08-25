/**
 * The cell vocabulary every People view shares — design spec §9.1.
 *
 * Rules applied
 *   §6.2 D-2 / §9.1
 *              **`Cell` is the density lever, and it is the reason rows are
 *              32px rather than 36.** `table.tsx` gives a `<td>` `h-row`
 *              (32px, a MINIMUM on a table cell) plus 8px block padding, and
 *              `DataTable` wraps every cell in a `display:block` span. At the
 *              13px body size the inherited line box is 20px, so 20 + 8 + 8 =
 *              **36px** and the row silently loses D-2's ~30px target. A block
 *              child collapses the parent's strut, so a `leading-4` (16px)
 *              block gives 16 + 8 + 8 = **32px** exactly — `--ev-row-h`, on
 *              the 4px grid, with no arbitrary value and nothing overridden in
 *              a file I do not own.
 *   §9.1 / AC-43
 *              the first data cell is the record's identity and **a link** to
 *              its detail route or to its profile layer. Semibold (600) when
 *              the identity is a code (`APP-2201`), regular (400) when it is a
 *              name (`Nora Al-Harbi`).
 *   §9.1       row hover fills the row and **the identity link underlines**.
 *              The whole row is never a click target — it collides with the
 *              checkbox and the kebab.
 *   §7.2       the focus ring is `globals.css`'s `:focus-visible` default,
 *              2px `--ev-blue` at 2px offset. Nothing here removes it, and
 *              nothing here needs `outline-none`.
 *   §9.1 / R4  numeric, currency and count values are `text-end` with
 *              `tabular-nums`. In Arabic the COLUMN mirrors and the numeral
 *              run does not (**AC-73**).
 *   §8.3.1     `—` (U+2014, `ABSENT`) is reserved for not-applicable or
 *              unknown. A zero is `0`, and the two never share a rendering.
 *   §9.1       the identity **never truncates**: a long name wraps and the row
 *              grows. `DRV-0201`'s 61-character Arabic name is the fixture
 *              that proves it.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ABSENT, type Translate } from '@/lib'
import { cn } from '@/lib/utils'

/**
 * One line of a table cell at exactly 16px, so the row lands on `--ev-row-h`.
 * Everything a People column renders goes through this or through `Identity`.
 */
export function Cell({ children, className }: { children: ReactNode; className?: string }) {
  /* `whitespace-nowrap` is the OTHER half of the density lever. `table.tsx`
     deliberately removed it from `<td>` so a second identity line can grow the
     row, which is right — but it also let `DRV-0201` and `25 Jun` wrap to two
     lines the moment the table got narrow, turning every row into 48px. A data
     cell never wraps; only the identity does, and `Identity` opts out. */
  return <span className={cn('block leading-4 whitespace-nowrap', className)}>{children}</span>
}

/** A muted line — a qualifier, an id, a device. Still 16px. */
export function MutedCell({ children, className }: { children: ReactNode; className?: string }) {
  return <Cell className={cn('text-xs text-muted-foreground', className)}>{children}</Cell>
}

/**
 * A numeric / currency / count value. R4: inline-END, `tabular-nums`, header
 * and value sharing one edge — the column's `align: 'end'` does the header
 * half, this does the value half.
 *
 * **`<bdi>` is not decoration here.** `4 / 5` and `96%` are a digit run with a
 * NEUTRAL character in the middle, and inside an RTL paragraph the bidi
 * algorithm resolves that neutral against the paragraph direction: `4 / 5`
 * renders as `5 / 4` in Arabic. Caught in the `dir="rtl"` capture, not in
 * review. `Money` (V-02) already isolates for the same reason and gives the
 * reason in full; every other numeric run needs it too (**AC-73**).
 */
export function NumCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Cell className={cn('text-end tabular-nums', className)}>
      <bdi>{children}</bdi>
    </Cell>
  )
}

/**
 * A date or time. Isolated for the same reason as `NumCell`: `25 Jun` is a
 * digit run followed by a word, and it reorders to `Jun 25` in an RTL
 * paragraph. `rtl.md`: *"Dates, times — No. The CELL aligns inline-start; the
 * string does not reorder."* Dates stay inline-START (R4); only numerics move
 * to the end.
 */
export function DateCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Cell className={className}>
      <bdi>{children}</bdi>
    </Cell>
  )
}

/** `—`, and only for not-applicable or unknown (§8.3.1). Never for a zero. */
export function Absent({ numeric = false }: { numeric?: boolean }) {
  const content = (
    <span className="text-muted-foreground" aria-label={ABSENT}>
      {ABSENT}
    </span>
  )
  return numeric ? <NumCell>{content}</NumCell> : <Cell>{content}</Cell>
}

export interface IdentityProps {
  /** Where the identity goes: a detail route, or `?entity=` on this route. */
  to: string
  name: string
  /** §9.1 — semibold when the identity is a CODE or number, regular for a name. */
  code?: boolean
  t: Translate
}

/**
 * The identity cell's link. The **second line is `DataTable`'s
 * `column.secondaryLine`**, not a prop here — one mechanism, so a view cannot
 * grow a row by accident, and a column whose `secondaryLine` returns `null`
 * renders an empty block with no line box and costs nothing.
 */
export function Identity({ to, name, code = false, t }: IdentityProps) {
  return (
    <Link
      to={to}
      aria-label={t('people.a11y.openProfile', { name })}
      /* §9.1 — the link, not the row, is the click target. `max-w-56` bounds
         the measure so one 61-character name cannot take the table apart; it
         WRAPS inside that bound rather than truncating, and the row grows to
         fit (§7.1, Density). `min-w-36` is the other half: with `table-auto`
         and every other column set to `nowrap`, a wrappable identity column is
         the one the browser squeezes first, and `DRV-0201`'s Arabic name went
         to eight lines at 100px before this. 128px is the measured value that
         keeps every People view inside the card at 1280px. */
      className={cn(
        'block min-w-32 max-w-56 rounded-sm leading-4 text-foreground group-hover/row:underline',
        code ? 'font-semibold tabular-nums' : 'font-normal',
      )}
    >
      {name}
    </Link>
  )
}
