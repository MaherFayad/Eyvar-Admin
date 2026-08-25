/**
 * `ErrorState` (B-03) — design spec §11.2, **AC-24**, **AC-39**, **AC-41**.
 *
 * **Three scopes, and the scope decides how much of the screen stops working.**
 *
 *   `page`  heading + body + primary, centred in the content region, **shell
 *           intact**. The rail, the sub-tab list and the top bar keep working
 *           and the operator can navigate away without a reload — spec §9.2
 *           calls this *"the single most important shell behaviour"*
 *           (**AC-24**).
 *   `card`  one grey sentence inside the card, **with the toolbar still
 *           rendered**, so the operator can change the query that failed.
 *   `row`   replaces that row's ACTION CELL only. Every other row stays
 *           interactive, and no page-level banner appears (**AC-41**).
 *
 * **Copy is imperative and names the fix.** No `please`, no `invalid`, no
 * `failed`, no blame (**AC-39**, `copy.md` rule 4). The strings come from the
 * caller, already resolved through a key with its placeholders filled
 * (**AC-74**, **AC-75**) — this component never assembles one.
 *
 * Rules applied
 *   §11.2/V8    the three shapes above, and nothing else. **All of them render
 *               inside a card** (`card` defaults to `true`), except `row`,
 *               which replaces a table cell and has no `card` prop at all.
 *   §11.2/V8    **`action` is REQUIRED in the `card` scope.** A failed card
 *               with no retry is a dead end and every caller was omitting one.
 *   V9          **no icon.** The icon that wants to be here is a warning
 *               triangle wanting to be red or amber. R5a enumerates red to four
 *               uses and a page error is not among them; R17 gives exactly one
 *               warning tone and a failure is not a warning. A grey triangle is
 *               decoration. R8 licenses an illustration only on a whole-page
 *               zero-records-ever empty, and its miniature is barred by the same
 *               logic. What the state gets instead is what helps: a card, a
 *               heading, a body naming the next move, and a retry.
 *   R3          the `page` scope's `Try again` is the ONE primary on a screen
 *               that is showing nothing else, so it is `variant="default"`.
 *               The `card` and `row` scopes use a plain button: they sit
 *               beside a page that still has its own primary.
 *   §7.5        an error is never carried by colour: it is carried by words.
 *               There is no red anywhere in this component (R5a).
 *   R-3 §1.3    no elevation.
 */

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type ErrorScope = 'page' | 'card' | 'row'

interface ErrorAction {
  label: string
  onClick: () => void
}

interface PageErrorProps {
  scope: 'page'
  /** An imperative naming what could not be loaded. Phrase, no period (R6). */
  heading?: string
  message: string
  /** `Try again`. Omit only where a retry genuinely cannot help. */
  action?: ErrorAction
  /** §4 — carded by default. Opt out only inside a card that already exists. */
  card?: boolean
  className?: string
}

interface CardErrorProps {
  scope: 'card'
  message: string
  /**
   * **REQUIRED** in this scope — `02-visual-refinement.md` V8 / §4.5. A failed
   * card with no retry is a dead end, and every caller was omitting it. The
   * type is the enforcement; a review is not.
   */
  action: ErrorAction
  card?: boolean
  className?: string
}

interface RowErrorProps {
  scope: 'row'
  message: string
  action?: ErrorAction
  /** No `card` here, deliberately — see `StateCard` below. */
  className?: string
}

export type ErrorStateProps = PageErrorProps | CardErrorProps | RowErrorProps

/**
 * **A state sits inside a card** — `02-visual-refinement.md` §4, item 10.
 *
 * These used to render straight onto `--ev-bg` with nothing under them, and a
 * centred grey paragraph on a grey canvas with no ground reads as broken chrome
 * rather than as a designed state.
 *
 * **Prop, not wrapper** (the choice §7.1 of that spec left to me): the ruling is
 * *"the default must be carded"*, and a wrapper cannot have a default — every
 * call site would have to remember, and the two that forget are the two nobody
 * looks at. `card` is opt-OUT, for a state rendered inside a card that already
 * exists.
 *
 * `scope="row"` has no `card` prop at all. It replaces one table cell; a card
 * there is a structural mistake, not a styling one, so the type forbids it.
 *
 * The recipe is NOT re-typed here — it is `Card`, with its own padding-block
 * zeroed so the state owns its vertical rhythm.
 */
function StateCard({ children }: { children: ReactNode }) {
  return <Card className="w-full py-0">{children}</Card>
}

export function ErrorState(props: ErrorStateProps) {
  const { scope, message, action, className } = props

  if (scope === 'page') {
    const body = (
      /* §4.4 — padding-block 48, heading 15/600, body 13 at a 384px measure,
         `Try again` as `variant="default"`: the one primary on a screen showing
         nothing else (R3). NO ICON (V9), no illustration (R8), no red and no
         amber (R5a, §7.5) — an error is carried by words. */
      <div
        role="alert"
        className={cn(
          'flex flex-col items-center gap-2 px-3 py-12 text-center',
          className,
        )}
      >
        {props.heading && (
          <h2 className="text-base font-semibold text-foreground">{props.heading}</h2>
        )}
        <p className="max-w-96 text-sm text-muted-foreground">{message}</p>
        {action && (
          <Button variant="default" onClick={action.onClick} className="mt-2">
            {action.label}
          </Button>
        )}
      </div>
    )
    return (props.card ?? true) ? <StateCard>{body}</StateCard> : body
  }

  if (scope === 'card') {
    const body = (
      <div role="alert" className={cn('flex flex-col items-center gap-2 px-3 py-8 text-center', className)}>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button variant="ghost" onClick={action.onClick}>
          {action.label}
        </Button>
      </div>
    )
    return (props.card ?? true) ? <StateCard>{body}</StateCard> : body
  }

  /* `row` — this replaces the row's ACTION CELL. It is deliberately inline and
     deliberately small: the row is still there, still readable, and the other
     rows are still interactive (**AC-41**). */
  return (
    <span role="alert" className={cn('inline-flex items-center gap-1.5 text-xs', className)}>
      <span className="text-muted-foreground">{message}</span>
      {action && (
        <Button variant="ghost" size="xs" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </span>
  )
}
