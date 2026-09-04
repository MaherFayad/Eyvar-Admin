/**
 * The cell vocabulary the five wave-2 work queues share —
 * `04-index-screen-redesign.md` §7.6, §7.7, §9.
 *
 * **Why this file exists rather than an import from `operations/people`.**
 * `PHASE-PLAN.md` gives a sub-tab exactly one directory, and a screen reaching
 * into another screen's directory is the first step to two screens owning one
 * file. Five sub-tabs across two workspaces land in this wave and all five
 * carry §4's shared contract, so the contract gets a directory of its own and
 * the five screens consume it. `operations/people/cells.tsx` is the same
 * vocabulary written first; collapsing the two is named in the handoff and is
 * not done here, because People is another pass's file and this pass has no
 * business editing a screen it did not build.
 *
 * Rules applied
 *   §7.6 / R20 **row height is the TABLE's, not the row's.** Every cell is one
 *              `truncate` line and cannot grow a row. Only the identity has two
 *              lines and it owns both of them.
 *   §9.1 / AC-43
 *              the first data cell is the record's identity and **a link**.
 *              §9.1 — the whole row is never a click target.
 *   §9.1 / R4  numeric, currency and count values are `text-end` with
 *              `tabular-nums`, header and value sharing one edge.
 *   §9.1 / AC-73
 *              `<bdi>` on every numeric and date run. `4 / 5` renders as
 *              `5 / 4` in an RTL paragraph without it, and `25 Jun` as
 *              `Jun 25` — the bidi algorithm resolves the neutral against the
 *              paragraph direction, so isolation is not decoration.
 *   O9         an absent value is BLANK, or a muted word when the operator acts
 *              on the absence. A zero is `0`, and the two never share a rendering.
 *   §7.2       the focus ring is `globals.css`'s `:focus-visible` default.
 *              Nothing here removes an outline, so nothing here restores one.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/** One line of a table cell. Never wraps: R20 makes the row a fixed pitch. */
export function Cell({
  children,
  className,
  title,
}: {
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <span className={cn('block truncate', className)} title={title}>
      {children}
    </span>
  )
}

/**
 * A muted qualifier — an id, a device, a reason.
 *
 * `title` because a fixed-pitch row truncates rather than growing (R20), and a
 * sentence that has been cut needs somewhere to be read in full.
 */
export function MutedCell({
  children,
  className,
  title,
}: {
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <Cell className={cn('text-xs text-muted-foreground', className)} title={title}>
      {children}
    </Cell>
  )
}

/** A numeric / currency / count value. R4 inline-end, isolated for AC-73. */
export function NumCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Cell className={cn('text-end tabular-nums', className)}>
      <bdi>{children}</bdi>
    </Cell>
  )
}

/**
 * A date or time. Isolated for the same reason as `NumCell`, and inline-START:
 * `rtl.md` — *"Dates, times — No. The CELL aligns inline-start; the string does
 * not reorder."*
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
 * acts on (`Not settled`, `No owner`). Never a zero, never a fill, never a glyph.
 */
export function Absent({ numeric = false, word }: { numeric?: boolean; word?: string }) {
  const content = word === undefined ? null : <span className="text-muted-foreground">{word}</span>
  return numeric ? <NumCell>{content}</NumCell> : <Cell>{content}</Cell>
}

export interface IdentityProps {
  /** Where the identity goes. **Opening never claims** (§4.2 Q-3, AC-200). */
  to: string
  name: string
  /** §7.7 — line 2 qualifies line 1: a route, a plan, a reason code, an id. */
  secondary?: ReactNode
  /** §9.1 / T5.3 — a CODE (`INC-014`) is mono and semibold, and carries no avatar. */
  code?: boolean
  /** The accessible name, already interpolated. One key, never concatenated (AC-75). */
  label: string
}

/**
 * The identity cell — one construction on every row of every queue (§7.7).
 *
 * **This is the control that AC-200 and AC-201 turn on.** It navigates and it
 * does nothing else: no claim, no side effect, no ownership change. Legacy
 * `inboxOpen()` claims silently on open (`:19301`–`:19310`), which leaves an
 * operator no way to *look* at a queue item — so `Claim` is a separate,
 * separately labelled control in a separate cell, and this one only ever moves
 * the operator somewhere.
 */
export function Identity({ to, name, secondary = null, code = false, label }: IdentityProps) {
  return (
    <span className="flex max-w-80 items-center gap-2">
      {/* T5.3 — an avatar stands for a PERSON. `TRP-9012` has no face, and
          `initialsOf` was rendering its first two letters as one. A code-led
          record leads with the code, in mono, and takes the 40px back. */}
      {!code && (
        <Avatar className="size-8 rounded-full">
          <AvatarFallback className="rounded-full text-xs font-medium">
            {initialsOf(name)}
          </AvatarFallback>
        </Avatar>
      )}
      <span className="flex min-w-0 flex-col justify-center">
        <Link
          to={to}
          aria-label={label}
          className={cn(
            'truncate rounded-sm text-foreground group-hover/row:underline',
            code ? 'font-mono font-semibold' : 'font-medium',
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
 * The avatar fallback's initials. Never blank, never an emoji (**AC-76**). Two
 * glyphs at most, from the first and last word, so it works on `Nora Al-Harbi`
 * and on a 44-character Arabic name without a second vocabulary.
 */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ''
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : ''
  return `${first}${second}`.toLocaleUpperCase()
}

/**
 * A subject line with its qualifier, for a queue whose identity is a sentence
 * rather than a person — a safety incident's summary, a work item's title.
 *
 * Same two-line construction as `Identity` and the same truncation contract,
 * without the avatar: there is no person to depict, and a placeholder circle
 * beside `Rider reports the captain took a longer route` is furniture.
 */
export function SubjectIdentity({
  to,
  title,
  secondary = null,
  label,
}: {
  to: string
  title: string
  secondary?: ReactNode
  label: string
}) {
  return (
    <span className="flex min-w-0 max-w-80 flex-col justify-center">
      <Link
        to={to}
        aria-label={label}
        className="truncate rounded-sm font-medium text-foreground group-hover/row:underline"
      >
        {title}
      </Link>
      {secondary !== null && secondary !== undefined && secondary !== '' && (
        /* R20 fixes the row's pitch, so a second line that does not fit is cut
           rather than wrapped. `title` is where the rest of it lives. */
        <span
          className="truncate text-xs font-normal text-muted-foreground"
          title={typeof secondary === 'string' ? secondary : undefined}
        >
          <bdi>{secondary}</bdi>
        </span>
      )}
    </span>
  )
}

/** Two short facts on one line, for a cell that carries a pair (`4 / 5`). */
export function PairCell({ children }: { children: ReactNode }) {
  return (
    <Cell className="tabular-nums">
      <bdi>{children}</bdi>
    </Cell>
  )
}
