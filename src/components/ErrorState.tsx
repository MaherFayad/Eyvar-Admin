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
 *   §11.2       the three shapes above, and nothing else.
 *   R3          the `page` scope's `Try again` is the ONE primary on a screen
 *               that is showing nothing else, so it is `variant="default"`.
 *               The `card` and `row` scopes use a plain button: they sit
 *               beside a page that still has its own primary.
 *   §7.5        an error is never carried by colour: it is carried by words.
 *               There is no red anywhere in this component (R5a).
 *   R-3 §1.3    no elevation.
 */

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ErrorScope = 'page' | 'card' | 'row'

export interface ErrorStateProps {
  scope: ErrorScope
  /** `page` only. An imperative naming what could not be loaded. */
  heading?: string
  /** The sentence. `page` gets a body; `card` and `row` get this as their whole copy. */
  message: string
  /** `Try again`. Omit where a retry genuinely cannot help. */
  action?: { label: string; onClick: () => void }
  className?: string
}

export function ErrorState({ scope, heading, message, action, className }: ErrorStateProps) {
  if (scope === 'page') {
    return (
      <div
        role="alert"
        className={cn(
          'flex flex-col items-center gap-2 px-3 py-16 text-center',
          className,
        )}
      >
        {heading && <h2 className="text-base font-semibold text-foreground">{heading}</h2>}
        <p className="max-w-96 text-sm text-muted-foreground">{message}</p>
        {action && (
          <Button variant="default" onClick={action.onClick} className="mt-1">
            {action.label}
          </Button>
        )}
      </div>
    )
  }

  if (scope === 'card') {
    return (
      <div role="alert" className={cn('flex flex-col items-center gap-2 px-3 py-8 text-center', className)}>
        <p className="text-sm text-muted-foreground">{message}</p>
        {action && (
          <Button variant="ghost" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    )
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
