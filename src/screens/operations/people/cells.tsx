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
 *              child collapses the parent's strut, so a 16px line-height utility
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
 *   O9         an absent value is BLANK, or a muted word when the operator acts
 *              on the absence. A zero is `0`, and the two never share a rendering.
 *   §9.1       the identity **never truncates**: a long name wraps and the row
 *              grows. `DRV-0201`'s 61-character Arabic name is the fixture
 *              that proves it.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Translate } from '@/lib'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/**
 * One line of a table cell at exactly 16px, so the row lands on `--ev-row-h`.
 * Everything a People column renders goes through this or through `Identity`.
 */
export function Cell({ children, className }: { children: ReactNode; className?: string }) {
  /* **The density lever is retired, and R20 is why.** This used to force a
     16px line box so a `<td>` would land on the old 32px row. Row height is now
     the TABLE's, not the row's: `--ev-row-h-media` (60) is declared once on the
     `<tr>`, cells are `vertical-align: middle`, and no cell's line box can move
     a row any more. So the line box goes back to the type ramp's own.

     `whitespace-nowrap` stays and is now the whole job: a data cell never
     wraps, because a wrapped cell in a fixed-height row clips instead of
     growing. Only the identity has two lines, and it owns both of them. */
  return <span className={cn('block truncate', className)}>{children}</span>
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

/**
 * An absent value (O9). Blank when the value is simply not applicable; a muted
 * `word` — already translated — only when the absence is a fact the operator
 * acts on (`No owner`, `Not set`). Never a zero, never a fill, never a glyph.
 */
export function Absent({ numeric = false, word }: { numeric?: boolean; word?: string }) {
  const content = word === undefined ? null : <span className="text-muted-foreground">{word}</span>
  return numeric ? <NumCell>{content}</NumCell> : <Cell>{content}</Cell>
}

export interface IdentityProps {
  /** Where the identity goes: a detail route, or `?entity=` on this route. */
  to: string
  name: string
  /**
   * §7.7 — line 2, *"a value that **qualifies** the primary one: a phone, a
   * city, an id, an applied date"*. **R20 makes it all-or-nothing:** a table
   * either renders the two-line cell on every row or on none, because five
   * interval changes in eight rows is what made the built table look damaged.
   */
  secondary?: ReactNode
  /** §9.1 — semibold when the identity is a CODE or number, regular for a name. */
  code?: boolean
  t: Translate
}

/**
 * **The identity cell — one construction, applied to every row** (§7.7).
 *
 * ```
 * ←12→ ⬤ 32px circle ←8→ Nora Al-Harbi            --text-sm / 500 / --ev-ink, truncate
 *                        +966 5x xxx xxxx         --text-xs / 400 / --ev-text-2, truncate
 * ```
 *
 * Four things changed from the version this replaces, and each closes a named
 * finding:
 *
 *   **The avatar arrives.** 32px, `--ev-bg2` fill, hairline ring, initials in
 *   `--ev-text-2`. §14.1 lists it as *"32 px circle — R15 as amended"*, so the
 *   circle is scoped HERE by a class rather than by flipping `ui/avatar.tsx`'s
 *   R15 rounded-square default, which the top bar still depends on. Recorded
 *   as a finding: §3 makes the account avatar a circle too, so the primitive's
 *   default is the right place for it once the top bar lands.
 *
 *   **The second line is this component's, not `column.secondaryLine`'s.** One
 *   cell, one construction, one place to get the ink right — and it is what
 *   lets line 2 sit *beside* the avatar instead of under the whole cell.
 *
 *   **Line 2 is `--ev-text-2`, NOT `--ev-text-3`.** Match-audit **W1**, and
 *   §14.4 calls it *"the single line in this document most likely to be got
 *   wrong"*. The reference samples `#a7a9ab` at 2.358:1 and `--ev-text-3` is
 *   2.536:1; both fail §7.1.1, which has no large-text tier at 12px.
 *   `--ev-text-2` on white is 4.834:1. **`--ev-text-3` has zero consumers and
 *   must keep zero.**
 *
 *   **Both lines truncate; neither wraps.** R20 — the row height is the
 *   table's, not the row's, so a 61-character name can no longer grow one row
 *   past its neighbours. The measure is clamped at 320px (§7.3 rule 4);
 *   residual beyond that is trailing air inside the cell.
 */
export function Identity({ to, name, secondary = null, code = false, t }: IdentityProps) {
  return (
    /* §7.3 rule 4 — the identity column absorbs the residual, and the CONTENT
       box stops at 320. `min-w-0` on the text stack is what makes `truncate`
       work at all inside a flex row. */
    <span className="flex max-w-80 items-center gap-2">
      <Avatar className="size-8 rounded-full">
        <AvatarFallback className="rounded-full text-xs font-medium">
          {initialsOf(name)}
        </AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-col justify-center">
        <Link
          to={to}
          aria-label={t('people.a11y.openProfile', { name })}
          /* §9.1 — the LINK is the click target, never the row: a whole-row
             target collides with the checkbox and the action cell. */
          className={cn(
            'truncate rounded-sm text-foreground group-hover/row:underline',
            code ? 'font-semibold tabular-nums' : 'font-medium',
          )}
        >
          {name}
        </Link>
        {secondary !== null && secondary !== undefined && secondary !== '' && (
          <span className="truncate text-xs font-normal text-muted-foreground">
            <bdi>{secondary}</bdi>
          </span>
        )}
      </span>
    </span>
  )
}

/**
 * The avatar fallback's initials. Never blank (`avatar.tsx`, §7.5) and never an
 * emoji (**AC-76**). Two glyphs at most, taken from the first two words, so it
 * works on `Nora Al-Harbi` and on an Arabic name without a second vocabulary.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ''
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : ''
  return `${first}${second}`.toLocaleUpperCase()
}
